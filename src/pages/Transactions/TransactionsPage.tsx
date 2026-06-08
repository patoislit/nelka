import { useCompanyStore } from '../../store/companyStore';
import { useAuthStore } from '../../store/authStore';
import { SimpleTransactions } from './SimpleTransactions';
import { DoubleTransactions } from './DoubleTransactions';
import { useNavigate } from 'react-router-dom';
import { Building2 } from 'lucide-react';

export function TransactionsPage() {
  const { getActiveCompany } = useCompanyStore();
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const company = getActiveCompany();

  if (!company) {
    return (
      <div className="flex flex-col items-center justify-center min-h-96 text-center p-6">
        <div className="w-14 h-14 rounded-2xl bg-orange-50 dark:bg-orange-950/30 flex items-center justify-center mb-4">
          <Building2 size={24} className="text-orange-400" />
        </div>
        <p className="font-semibold text-gray-900 dark:text-white mb-1">Nie je vybraná firma</p>
        <p className="text-sm text-gray-400 mb-4">Vyberte firmu, aby ste mohli pridávať transakcie.</p>
        <button
          onClick={() => navigate('/companies')}
          className="px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold transition-colors"
        >
          Vybrať firmu
        </button>
      </div>
    );
  }

  if (company.type === 'double') {
    return <DoubleTransactions companyId={company.id} userId={user?.id ?? ''} />;
  }

  return <SimpleTransactions companyId={company.id} />;
}
