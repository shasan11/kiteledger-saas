import AccountingRecordShow from '@/Pages/App/Accounting/Shared/AccountingRecordShow';

export default function CashTransferShow({ id }) {
  return (
    <AccountingRecordShow
      id={id}
      title="Cash Transfer"
      endpoint="/api/cash-transfers/"
      backRoute="accounting.cash-transfers.index"
      backLabel="Back to cash transfers"
      titleField="transfer_no"
      subtitleField="reference"
      editRoute="accounting.cash-transfers.edit"
    />
  );
}
