import ReportPage from '../Shared/ReportPage';
import { REPORT_CONFIG } from '../reportRegistry';

export default function EmployeeMaster() {
  const config = REPORT_CONFIG['hr/employee-master'];

  return <ReportPage {...config} />;
}
