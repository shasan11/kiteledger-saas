import ReportPage from '../Shared/ReportPage';
import { REPORT_CONFIG } from '../reportRegistry';

export default function InvoiceAge() {
  const config = REPORT_CONFIG['receivable/invoice-age'];

  return <ReportPage {...config} />;
}
