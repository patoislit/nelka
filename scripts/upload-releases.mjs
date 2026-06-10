/**
 * Nahrá release súbory do Firebase Storage
 * Spusti: node scripts/upload-releases.mjs
 */
import { readFileSync, existsSync } from 'fs';
import { createReadStream, statSync } from 'fs';
import https from 'https';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

// Načítaj service account
const SA_PATH = path.join(root, 'service-account.json');
if (!existsSync(SA_PATH)) {
  console.error('\nChyba: service-account.json neexistuje!');
  console.error('Postup:');
  console.error('1. Otvor https://console.firebase.google.com/project/nelka-87b28/settings/serviceaccounts/adminsdk');
  console.error('2. Klikni "Generate new private key"');
  console.error('3. Ulož súbor ako service-account.json do koreňa projektu');
  process.exit(1);
}

const sa = JSON.parse(readFileSync(SA_PATH, 'utf8'));
const BUCKET = 'nelka-87b28.appspot.com';

// Získaj access token cez JWT
import { createSign } from 'crypto';

function getAccessToken() {
  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({
    iss: sa.client_email,
    scope: 'https://www.googleapis.com/auth/devstorage.read_write',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  })).toString('base64url');

  const sign = createSign('RSA-SHA256');
  sign.update(`${header}.${payload}`);
  const signature = sign.sign(sa.private_key, 'base64url');
  const jwt = `${header}.${payload}.${signature}`;

  return new Promise((resolve, reject) => {
    const body = `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`;
    const req = https.request({
      hostname: 'oauth2.googleapis.com',
      path: '/token',
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': body.length },
    }, (res) => {
      let data = '';
      res.on('data', d => data += d);
      res.on('end', () => {
        const json = JSON.parse(data);
        if (json.access_token) resolve(json.access_token);
        else reject(new Error(data));
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

async function uploadFile(token, localPath, storageName) {
  const fileSize = statSync(localPath).size;
  const mb = (fileSize / 1024 / 1024).toFixed(1);
  console.log(`\nNahráva: ${storageName} (${mb} MB)...`);

  const objectName = encodeURIComponent(`releases/${storageName}`);
  const contentType = storageName.endsWith('.exe')
    ? 'application/octet-stream'
    : 'application/x-apple-diskimage';

  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'storage.googleapis.com',
      path: `/upload/storage/v1/b/${BUCKET}/o?uploadType=media&name=releases%2F${encodeURIComponent(storageName)}`,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': contentType,
        'Content-Length': fileSize,
      },
    }, (res) => {
      let data = '';
      res.on('data', d => data += d);
      res.on('end', () => {
        if (res.statusCode === 200) {
          const json = JSON.parse(data);
          // Urob súbor verejne dostupný
          makePublic(token, json.name).then(() => {
            const url = `https://storage.googleapis.com/${BUCKET}/releases/${storageName}`;
            console.log(`OK: ${url}`);
            resolve(url);
          });
        } else {
          reject(new Error(`Upload zlyhal (${res.statusCode}): ${data}`));
        }
      });
    });
    req.on('error', reject);
    createReadStream(localPath).pipe(req);
  });
}

async function makePublic(token, name) {
  return new Promise((resolve) => {
    const body = JSON.stringify({ role: 'READER', entity: 'allUsers' });
    const req = https.request({
      hostname: 'storage.googleapis.com',
      path: `/storage/v1/b/${BUCKET}/o/${encodeURIComponent(name)}/acl`,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Content-Length': body.length,
      },
    }, (res) => { res.resume(); res.on('end', resolve); });
    req.on('error', resolve);
    req.write(body);
    req.end();
  });
}

// Hlavná logika
const files = [
  { local: path.join(root, 'release', 'Nelka-Windows.exe'), name: 'Nelka-Windows.exe' },
  { local: path.join(root, 'release', 'Nelka-Mac.dmg'),     name: 'Nelka-Mac.dmg' },
];

const existing = files.filter(f => existsSync(f.local));
if (existing.length === 0) {
  console.error('Žiadne release súbory nenájdené v release/ priečinku.');
  process.exit(1);
}

console.log('Získavam access token...');
const token = await getAccessToken();
console.log('Token OK');

const urls = {};
for (const file of existing) {
  urls[file.name] = await uploadFile(token, file.local, file.name);
}

console.log('\n====================================');
console.log('Vlož tieto URL do download.html:');
console.log('====================================');
if (urls['Nelka-Windows.exe']) console.log(`WINDOWS_URL = '${urls['Nelka-Windows.exe']}'`);
if (urls['Nelka-Mac.dmg'])     console.log(`MAC_URL     = '${urls['Nelka-Mac.dmg']}'`);
