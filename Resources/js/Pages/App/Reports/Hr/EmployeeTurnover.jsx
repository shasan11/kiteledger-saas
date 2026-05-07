import ReportPage from '../Shared/ReportPage';
import { REPORT_CONFIG } from '../reportRegistry';

export default function EmployeeTurnover() {
  const config = REPORT_CONFIG['hr/employee-turnover'];

  return <ReportPage {...config} />;
}
