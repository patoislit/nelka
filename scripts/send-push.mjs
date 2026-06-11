/**
 * Push notification sender — runs hourly via GitHub Actions (.github/workflows/push-notifications.yml).
 * Reads Firestore data (warehouse, invoices, journal entries), computes alerts
 * (low stock, overdue/due-soon invoices, DPH deadline) and sends Web Push
 * notifications to all subscribed devices. Works even when the app is closed.
 *
 * Required env: VAPID_PRIVATE_KEY (GitHub Actions secret)
 */
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, query, where, doc, setDoc, deleteDoc } from 'firebase/firestore';
import webpush from 'web-push';

const VAPID_PUBLIC_KEY = 'BDzx2SrNCSUYQMvZWEY4a5YCjTh2PqpFsL0zND42N9x05bWq9xb71JnjPFRHjjRly5ukPQaJBnTmnlsm4E-duvg';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;
const SHARED_ID = 'nelka-shared';
const RESEND_AFTER_HOURS = 20; // same alert max once per ~day

if (!VAPID_PRIVATE_KEY) {
  console.error('Missing VAPID_PRIVATE_KEY env variable.');
  process.exit(1);
}

webpush.setVapidDetails('mailto:patnko.furiel@gmail.com', VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

const app = initializeApp({
  apiKey: 'AIzaSyBTJpr785xyYjqHjrsNpqN0g9zSl8ahxAQ',
  authDomain: 'nelka-87b28.firebaseapp.com',
  projectId: 'nelka-87b28',
});
const db = getFirestore(app);

function todayBratislava() {
  // YYYY-MM-DD in Europe/Bratislava
  return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Bratislava' }).format(new Date());
}

function daysBetween(fromISO, toISO) {
  return Math.round((new Date(toISO) - new Date(fromISO)) / 86400000);
}

/** Next quarterly DPH deadline: 25th of the month after quarter end */
function nextDphDeadline() {
  const now = new Date();
  const year = now.getFullYear();
  const candidates = [
    new Date(year, 0, 25), new Date(year, 3, 25), new Date(year, 6, 25), new Date(year, 9, 25),
    new Date(year + 1, 0, 25),
  ];
  return candidates.find((d) => d > now);
}

async function loadCollection(name) {
  const snap = await getDocs(query(collection(db, name), where('userId', '==', SHARED_ID)));
  return snap.docs.map((d) => ({ _docId: d.id, ...d.data() }));
}

function buildAlerts({ companies, items, invoices, journalEntries }) {
  const alerts = [];
  const today = todayBratislava();
  const companyName = (id) => companies.find((c) => c.id === id)?.name || '';
  const suffix = (cid) => (companies.length > 1 && companyName(cid) ? ` (${companyName(cid)})` : '');

  // 1. Low stock
  for (const item of items) {
    if (typeof item.quantity === 'number' && typeof item.lowStockThreshold === 'number' && item.quantity <= item.lowStockThreshold) {
      alerts.push({
        key: `lowstock:${item._docId}`,
        sk: { title: '⚠️ Nízky stav skladu', body: `${item.name}: zostáva ${item.quantity} ${item.unit}${suffix(item.companyId)}` },
        en: { title: '⚠️ Low stock', body: `${item.name}: ${item.quantity} ${item.unit} remaining${suffix(item.companyId)}` },
      });
    }
  }

  // 2. Invoices — overdue and due soon
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

  // 3. DPH deadline within 7 days (companies with double-entry records)
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

async function main() {
  const [subs, companies, items, invoices, journalEntries, logSnap] = await Promise.all([
    loadCollection('push_subscriptions'),
    loadCollection('companies'),
    loadCollection('warehouse_items'),
    loadCollection('invoices'),
    loadCollection('journal_entries'),
    getDocs(collection(db, 'push_log')),
  ]);

  console.log(`Subscriptions: ${subs.length}, items: ${items.length}, invoices: ${invoices.length}, entries: ${journalEntries.length}`);
  if (subs.length === 0) { console.log('No subscribed devices — nothing to do.'); return; }

  const log = new Map(logSnap.docs.map((d) => [d.id, d.data().sentAt]));
  const cutoff = Date.now() - RESEND_AFTER_HOURS * 3600000;
  const logId = (key) => key.replace(/[^a-zA-Z0-9_-]/g, '_');

  const alerts = buildAlerts({ companies, items, invoices, journalEntries }).filter((a) => {
    const sentAt = log.get(logId(a.key));
    return !sentAt || new Date(sentAt).getTime() < cutoff;
  });

  console.log(`Alerts to send: ${alerts.length}`);
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
          // subscription expired/revoked — remove it
          await deleteDoc(doc(db, 'push_subscriptions', sub._docId)).catch(() => {});
          removed++;
          break;
        }
        console.error(`send failed (${err.statusCode}):`, err.body || err.message);
      }
    }
  }

  // Mark alerts as sent
  const now = new Date().toISOString();
  await Promise.all(alerts.map((a) => setDoc(doc(db, 'push_log', logId(a.key)), { key: a.key, sentAt: now })));

  console.log(`Done. Sent: ${sent}, expired subscriptions removed: ${removed}`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => { console.error(e); process.exit(1); });
