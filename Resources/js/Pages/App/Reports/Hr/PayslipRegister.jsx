import ReportPage from '../Shared/ReportPage';
import { REPORT_CONFIG } from '../reportRegistry';

export default function PayslipRegister() {
  const config = REPORT_CONFIG['hr/payslip-register'];

  return <ReportPage {...config} />;
}
