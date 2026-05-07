import ReportPage from '../Shared/ReportPage';
import { REPORT_CONFIG } from '../reportRegistry';

export default function ProductProfitability() {
  const config = REPORT_CONFIG['inventory/product-profitability'];

  return <ReportPage {...config} />;
}
