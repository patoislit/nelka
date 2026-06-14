/**
 * Nelka — Cloud Function (businessAlerts)
 *
 * Nahrádza pôvodný hodinový GitHub Actions workflow. Beží každú hodinu cez
 * Cloud Scheduler, prečíta Firestore (sklad, faktúry, denník), vypočíta
 * upozornenia (nízky stav, faktúry po/pred splatnosťou, DPH termín) a pošle
 * Web Push notifikácie na všetky prihlásené zariadenia — aj keď je appka zatvorená.
 *
 * Vlastný codebase "nelka" (firebase.json) + cielený deploy podľa mena funkcie,
 * aby sa nedotkol kalendárikových funkcií (codebase "default").
 *
 * Súkromný VAPID kľúč: Firebase secret VAPID_PRIVATE_KEY (nie je v gite).
 */
const { onSchedule } = require('firebase-functions/v2/scheduler');
const { defineSecret } = require('firebase-functions/params');
const admin = require('firebase-admin');
const webpush = require('web-push');

admin.initializeApp();

const REGION = 'europe-west1';
const TZ = 'Europe/Bratislava';
const SHARED_ID = 'nelka-shared';
const RESEND_AFTER_HOURS = 20; // rovnaké upozornenie max raz za ~deň

const VAPID_PUBLIC_KEY = 'BDMHxhszk0BhHw9Hge_AAQgEAPLCDqn7m0vBavnfIpViM5824wPE-J1_y5eM5tppWsWOFTszAZoxMHkDLawdTag';
const VAPID_PRIVATE_KEY = defineSecret('VAPID_PRIVATE_KEY');

function todayBratislava() {
  return new Intl.DateTimeFormat('sv-SE', { timeZone: TZ }).format(new Date());
}

function daysBetween(fromISO, toISO) {
  return Math.round((new Date(toISO) - new Date(fromISO)) / 86400000);
}

/** Najbližší štvrťročný termín DPH: 25. v mesiaci po konci kvartálu. */
function nextDphDeadline() {
  const now = new Date();
  const y = now.getFullYear();
  const candidates = [
    new Date(y, 0, 25), new Date(y, 3, 25), new Date(y, 6, 25), new Date(y, 9, 25),
    new Date(y + 1, 0, 25),
  ];
  return candidates.find((d) => d > now);
}

async function loadCollection(name) {
  const snap = await admin.firestore().collection(name).where('userId', '==', SHARED_ID).get();
  return snap.docs.map((d) => ({ _docId: d.id, ...d.data() }));
}

function buildAlerts({ companies, items, invoices, journalEntries }) {
  const alerts = [];
  const today = todayBratislava();
  const companyName = (id) => companies.find((c) => c.id === id)?.name || '';
  const suffix = (cid) => (companies.length > 1 && companyName(cid) ? ` (${companyName(cid)})` : '');

  // 1. Nízky stav skladu
  for (const item of items) {
    if (typeof item.quantity === 'number' && typeof item.lowStockThreshold === 'number' && item.quantity <= item.lowStockThreshold) {
      alerts.push({
        key: `lowstock:${item._docId}`,
        sk: { title: '⚠️ Nízky stav skladu', body: `${item.name}: zostáva ${item.quantity} ${item.unit}${suffix(item.companyId)}` },
        en: { title: '⚠️ Low stock', body: `${item.name}: ${item.quantity} ${item.unit} remaining${suffix(item.companyId)}` },
      });
    }
  }

  // 2. Faktúry — po splatnosti a blížiace sa
  for (const inv of invoices) {
    if (!inv.dueDate || inv.status === 'paid' || inv.status === 'cancelled' || inv.status === 'draft') continue;
    const days = daysBetween(today, inv.dueDate);
    const total = (inv.items || []).reduce((s, it) => s + it.quantity * it.unitPriceCents * (1 + (it.vatRate || 0) / 100), 0);
    const amount = (total / 100).toLocaleString('sk-SK', { minimumFractionDigits: 2 }) + ' €';
    if (days < 0) {
      alerts.push({
        key: `overdue:${inv._docId}`,
        sk: { title: '🔴 Faktúra po splatnosti', body: `Faktúra ${inv.number} (${inv.customerName}, ${amount}) je ${-days} dní po splatnosti${suffix(inv.companyId)}` },
        en: { title: '🔴 Invoice overdue', body: `Invoice ${inv.number} (${inv.customerName}, ${amount}) is ${-days} days overdue${suffix(inv.companyId)}` },
      });
    } else if (days <= 5) {
      alerts.push({
        key: `duesoon:${inv._docId}`,
        sk: { title: '🟡 Faktúra sa blíži k splatnosti', body: `Faktúra ${inv.number} (${inv.customerName}, ${amount}) je splatná ${days === 0 ? 'dnes' : `o ${days} dní`}${suffix(inv.companyId)}` },
        en: { title: '🟡 Invoice due soon', body: `Invoice ${inv.number} (${inv.customerName}, ${amount}) is due ${days === 0 ? 'today' : `in ${days} days`}${suffix(inv.companyId)}` },
      });
    }
  }

  // 3. DPH termín do 7 dní (firmy s podvojnými zápismi)
  const deadline = nextDphDeadline();
  const daysToDeadline = Math.ceil((deadline - new Date()) / 86400000);
  if (daysToDeadline <= 7 && daysToDeadline > 0) {
    const companiesWithEntries = new Set(journalEntries.map((e) => e.companyId));
    for (const cid of companiesWithEntries) {
      let dphDebit = 0, dphCredit = 0;
      for (const entry of journalEntries.filter((e) => e.companyId === cid)) {
        for (const line of entry.lines || []) {
          if (line.accountCode === '343') { dphDebit += line.debitCents || 0; dphCredit += line.creditCents || 0; }
        }
      }
      const balance = ((dphCredit - dphDebit) / 100).toLocaleString('sk-SK', { minimumFractionDigits: 2 }) + ' €';
      const dl = deadline.toLocaleDateString('sk-SK');
      alerts.push({
        key: `dph:${cid}:${deadline.toISOString().slice(0, 10)}`,
        sk: { title: '📅 DPH termín sa blíži', body: `Termín podania DPH je ${dl} (o ${daysToDeadline} dní). Zostatok účtu 343: ${balance}${suffix(cid)}` },
        en: { title: '📅 VAT deadline approaching', body: `VAT filing deadline is ${dl} (in ${daysToDeadline} days). Account 343 balance: ${balance}${suffix(cid)}` },
      });
    }
  }

  return alerts;
}

exports.businessAlerts = onSchedule(
  { schedule: '0 * * * *', region: REGION, timeZone: TZ, secrets: [VAPID_PRIVATE_KEY] },
  async () => {
    webpush.setVapidDetails('mailto:patnko.furiel@gmail.com', VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY.value());

    const db = admin.firestore();
    const [subs, companies, items, invoices, journalEntries, logSnap] = await Promise.all([
      loadCollection('push_subscriptions'),
      loadCollection('companies'),
      loadCollection('warehouse_items'),
      loadCollection('invoices'),
      loadCollection('journal_entries'),
      db.collection('push_log').get(),
    ]);

    console.log(`subs:${subs.length} items:${items.length} invoices:${invoices.length} entries:${journalEntries.length}`);
    if (subs.length === 0) { console.log('Žiadne prihlásené zariadenia.'); return; }

    const log = new Map(logSnap.docs.map((d) => [d.id, d.data().sentAt]));
    const cutoff = Date.now() - RESEND_AFTER_HOURS * 3600000;
    const logId = (key) => key.replace(/[^a-zA-Z0-9_-]/g, '_');

    const alerts = buildAlerts({ companies, items, invoices, journalEntries }).filter((a) => {
      const sentAt = log.get(logId(a.key));
      return !sentAt || new Date(sentAt).getTime() < cutoff;
    });

    console.log(`Upozornení na odoslanie: ${alerts.length}`);
    if (alerts.length === 0) return;

    let sent = 0, removed = 0;
    for (const sub of subs) {
      const subscription = { endpoint: sub.endpoint, keys: sub.keys };
      const lang = sub.lang === 'en' ? 'en' : 'sk';
      for (const alert of alerts) {
        try {
          await webpush.sendNotification(subscription, JSON.stringify({ ...alert[lang], tag: alert.key }));
          sent++;
        } catch (err) {
          if (err.statusCode === 404 || err.statusCode === 410) {
            await db.collection('push_subscriptions').doc(sub._docId).delete().catch(() => {});
            removed++;
            break;
          }
          console.error(`send failed (${err.statusCode}):`, err.body || err.message);
        }
      }
    }

    const now = new Date().toISOString();
    await Promise.all(alerts.map((a) => db.collection('push_log').doc(logId(a.key)).set({ key: a.key, sentAt: now })));
    console.log(`Hotovo. Odoslané: ${sent}, expirované odstránené: ${removed}`);
  }
);
