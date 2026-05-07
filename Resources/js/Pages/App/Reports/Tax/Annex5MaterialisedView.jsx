import ReportPage from '../Shared/ReportPage';
import { REPORT_CONFIG } from '../reportRegistry';

export default function Annex5MaterialisedView() {
  const config = REPORT_CONFIG['tax/annex-5-materialised-view'];

  return <ReportPage {...config} />;
}
