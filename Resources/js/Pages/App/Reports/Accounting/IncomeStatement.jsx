import ReportPage from '../Shared/ReportPage';
import { REPORT_CONFIG } from '../reportRegistry';

export default function IncomeStatement() {
  const config = REPORT_CONFIG['accounting/income-statement'];

  return <ReportPage {...config} />;
}
