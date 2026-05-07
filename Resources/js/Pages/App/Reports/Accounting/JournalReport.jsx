import ReportPage from '../Shared/ReportPage';
import { REPORT_CONFIG } from '../reportRegistry';

export default function JournalReport() {
  const config = REPORT_CONFIG['accounting/journal-report'];

  return <ReportPage {...config} />;
}
