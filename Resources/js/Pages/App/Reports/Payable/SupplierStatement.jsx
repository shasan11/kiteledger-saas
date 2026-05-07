import ReportPage from '../Shared/ReportPage';
import { REPORT_CONFIG } from '../reportRegistry';

export default function SupplierStatement() {
  const config = REPORT_CONFIG['payable/supplier-statement'];

  return <ReportPage {...config} />;
}
