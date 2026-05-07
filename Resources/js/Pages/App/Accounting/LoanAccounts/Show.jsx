import AccountingRecordShow from '@/Pages/App/Accounting/Shared/AccountingRecordShow';

export default function LoanAccountShow({ id }) {
  return (
    <AccountingRecordShow
      id={id}
      title="Loan Account"
      endpoint="/api/loan-accounts/"
      backRoute="accounting.loan-accounts.index"
      backLabel="Back to loan accounts"
      titleField="name"
      subtitleField="loan_number"
    />
  );
}
