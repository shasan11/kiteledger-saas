import AccountingRecordShow from '@/Pages/App/Accounting/Shared/AccountingRecordShow';

export default function BankAccountShow({ id }) {
  return (
    <AccountingRecordShow
      id={id}
      title="Bank Account"
      endpoint="/api/bank-accounts/"
      backRoute="accounting.bank-accounts.index"
      backLabel="Back to bank accounts"
      titleField="display_name"
      subtitleField="code"
    />
  );
}
