import ReportPage from '../Shared/ReportPage';
import { REPORT_CONFIG } from '../reportRegistry';

export default function DepartmentWiseCost() {
  const config = REPORT_CONFIG['hr/department-wise-cost'];

  return <ReportPage {...config} />;
}
