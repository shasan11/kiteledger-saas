import ReportPage from '../Shared/ReportPage';
import { REPORT_CONFIG } from '../reportRegistry';

export default function CustomerStatement() {
  const config = REPORT_CONFIG['receivable/customer-statement'];

  return <ReportPage {...config} />;
}
