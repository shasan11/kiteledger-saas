import AccountingRecordShow from '@/Pages/App/Accounting/Shared/AccountingRecordShow';

export default function JournalVoucherShow({ id }) {
  return (
    <AccountingRecordShow
      id={id}
      title="Journal Voucher"
      endpoint="/api/journal-vouchers/"
      backRoute="accounting.journal-vouchers.index"
      backLabel="Back to journal vouchers"
      titleField="voucher_no"
      subtitleField="reference"
      editRoute="accounting.journal-vouchers.edit"
    />
  );
}
