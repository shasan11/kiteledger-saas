import ReportPage from '../Shared/ReportPage';
import { REPORT_CONFIG } from '../reportRegistry';

export default function TransactionList() {
  const config = REPORT_CONFIG['accounting/transaction-list'];

  return <ReportPage {...config} />;
}
