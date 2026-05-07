import ReportPage from '../Shared/ReportPage';
import { REPORT_CONFIG } from '../reportRegistry';

export default function Annex13() {
  const config = REPORT_CONFIG['tax/annex-13'];

  return <ReportPage {...config} />;
}
