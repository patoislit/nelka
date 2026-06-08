import type { JournalEntry } from '../store/transactionStore';
import type { AppNotification } from '../store/notificationStore';

type AddNotification = (n: Omit<AppNotification, 'id' | 'createdAt' | 'read'>) => void;

/** Returns the next DPH deadline (25th of month after quarter end for quarterly filers) */
function getNextDphDeadline(quarterly = true): Date {
  const now = new Date();
  let deadlineYear = now.getFullYear();

  if (quarterly) {
    // Quarter ends: Mar(2), Jun(5), Sep(8), Dec(11)
    // Deadline: 25th of Apr, Jul, Oct, Jan
    const deadlineMonths = [3, 6, 9, 0]; // months after quarter end
    let found = false;
    for (let i = 0; i < deadlineMonths.length; i++) {
      const dl = new Date(deadlineYear, deadlineMonths[i], 25);
      if (deadlineMonths[i] === 0) {
        dl.setFullYear(deadlineYear + 1);
      }
      if (dl > now) {
        if (deadlineMonths[i] === 0) deadlineYear += 1;
        found = true;
        return dl;
      }
    }
    if (!found) {
      return new Date(deadlineYear + 1, 3, 25);
    }
  } else {
    // Monthly: 25th of next month
    const dl = new Date(now.getFullYear(), now.getMonth() + 1, 25);
    return dl;
  }
  return new Date(now.getFullYear(), now.getMonth() + 1, 25);
}

export function checkDphAndNotify(
  companyId: string,
  entries: JournalEntry[],
  addNotification: AddNotification
): void {
  // Calculate DPH (343) balance
  let dphDebit = 0;
  let dphCredit = 0;
  let hasRevenue = false;
  let revenueWithoutDph = false;

  for (const entry of entries) {
    let entryHasRevenue = false;
    let entryHasDph = false;

    for (const line of entry.lines) {
      if (line.accountCode === '343') {
        dphDebit += line.debitCents;
        dphCredit += line.creditCents;
        entryHasDph = true;
      }
      if (line.accountCode.startsWith('6') && line.creditCents > 0) {
        hasRevenue = true;
        entryHasRevenue = true;
      }
    }

    if (entryHasRevenue && !entryHasDph) {
      revenueWithoutDph = true;
    }
  }

  const dphBalance = dphCredit - dphDebit; // positive = liability (DPH to pay)
  const deadline = getNextDphDeadline(true);
  const now = new Date();
  const daysUntilDeadline = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  const deadlineStr = deadline.toLocaleDateString('sk-SK');
  const amountStr = (Math.abs(dphBalance) / 100).toLocaleString('sk-SK', { minimumFractionDigits: 2 });

  // Check: deadline within 7 days
  if (daysUntilDeadline <= 7 && daysUntilDeadline > 0) {
    addNotification({
      type: 'warning',
      title: 'DPH termín sa blíži',
      body: `Termín podania DPH je ${deadlineStr}. Zostatok účtu 343: ${amountStr} €`,
      titleEn: 'VAT deadline approaching',
      bodyEn: `VAT filing deadline is ${deadlineStr}. Account 343 balance: ${amountStr} €`,
      companyId,
    });
  }

  // Check: non-zero DPH balance
  if (dphBalance !== 0 && hasRevenue) {
    addNotification({
      type: 'info',
      title: 'DPH zostatok',
      body: `Na účte 343 je zostatok ${amountStr} €. Skontrolujte podanie DPH.`,
      titleEn: 'VAT balance',
      bodyEn: `Account 343 has a balance of ${amountStr} €. Please check your VAT return.`,
      companyId,
    });
  }

  // Check: revenue without VAT entries
  if (revenueWithoutDph && hasRevenue) {
    addNotification({
      type: 'warning',
      title: 'Možná chyba: výnos bez DPH',
      body: 'Niektoré záznamy na výnosových účtoch (6xx) nemajú zodpovedajúci zápis DPH (343). Skontrolujte účtovanie.',
      titleEn: 'Possible error: revenue without VAT',
      bodyEn: 'Some entries on revenue accounts (6xx) do not have a corresponding VAT (343) entry. Please review.',
      companyId,
    });
  }
}
