import AccountingRecordShow from '@/Pages/App/Accounting/Shared/AccountingRecordShow';

export default function ChartOfAccountsShow({ id }) {
  return (
    <AccountingRecordShow
      id={id}
      title="Chart Of Account"
      endpoint="/api/chart-of-accounts/"
      backRoute="accounting.chart-of-accounts.index"
      backLabel="Back to chart of accounts"
      titleField="name"
      subtitleField="code"
    />
  );
}
