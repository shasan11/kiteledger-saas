import ReportPage from '../Shared/ReportPage';
import { REPORT_CONFIG } from '../reportRegistry';

export default function PayrollSummary() {
  const config = REPORT_CONFIG['hr/payroll-summary'];

  return <ReportPage {...config} />;
}
