import ReportPage from '../Shared/ReportPage';
import { REPORT_CONFIG } from '../reportRegistry';

export default function NetTradingAssets() {
  const config = REPORT_CONFIG['analytics/net-trading-assets'];

  return <ReportPage {...config} />;
}
