import type { JournalEntry } from '../store/transactionStore';
import type { Account } from '../store/chartOfAccountsStore';

/**
 * Checks a journal entry for common double-entry errors.
 * Returns an array of warning strings in SK (empty if no issues).
 */
export function checkJournalEntry(entry: JournalEntry, accounts: Account[]): string[] {
  const warnings: string[] = [];
  const lines = entry.lines;

  for (const line of lines) {
    const code = line.accountCode;

    // a) Revenue (6xx) credited without VAT (343) in the same entry
    if (code.startsWith('6') && line.creditCents > 0) {
      const hasDph = lines.some((l) => l.accountCode === '343');
      if (!hasDph) {
        warnings.push(`Účet ${code} (výnos) bol zapísaný na strane D bez zodpovedajúceho DPH záznamu (343).`);
      }
    }

    // b) Expense (5xx) debited to another expense (5xx) – both sides are expenses
    if (code.startsWith('5') && line.debitCents > 0) {
      const otherExpenseCredit = lines.some(
        (l) => l.id !== line.id && l.accountCode.startsWith('5') && l.creditCents > 0
      );
      if (otherExpenseCredit) {
        warnings.push(`Nákladový účet ${code} je zaúčtovaný oproti inému nákladovému účtu. Skontrolujte správnosť zápisu.`);
      }
    }

    // c) Asset debited without bank/cash credit when amount > 500000 cents (5000€)
    const acc = accounts.find((a) => a.code === code);
    if (acc?.type === 'asset' && line.debitCents > 500000) {
      const hasBankOrCash = lines.some(
        (l) => (l.accountCode === '221' || l.accountCode === '211') && l.creditCents > 0
      );
      if (!hasBankOrCash) {
        warnings.push(`Majetkový účet ${code} bol zaťažený sumou nad 5000 € bez zodpovedajúceho záznamu na bankovom (221) alebo pokladničnom (211) účte.`);
      }
    }

    // d) Salary (521) debited without employees (331) or bank (221) on credit
    if (code === '521' && line.debitCents > 0) {
      const hasEmployeesOrBank = lines.some(
        (l) => (l.accountCode === '331' || l.accountCode === '221') && l.creditCents > 0
      );
      if (!hasEmployeesOrBank) {
        warnings.push('Mzdové náklady (521) sú zaúčtované bez záväzku voči zamestnancom (331) alebo úhrady cez banku (221).');
      }
    }
  }

  return warnings;
}
