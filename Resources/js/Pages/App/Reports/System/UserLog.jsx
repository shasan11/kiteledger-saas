import ReportPage from '../Shared/ReportPage';
import { REPORT_CONFIG } from '../reportRegistry';

export default function UserLog() {
  const config = REPORT_CONFIG['system/user-log'];

  return <ReportPage {...config} />;
}
