import AccountingRecordShow from '@/Pages/App/Accounting/Shared/AccountingRecordShow';

export default function PurchaseBillShow({ id }) {
    return (
        <AccountingRecordShow
            id={id}
            title="Purchase Bill"
            endpoint="/api/purchase-bills/"
            backRoute="payment-out.purchase-bills.index"
            backLabel="Back to Purchase Bills"
            titleField="bill_no"
            subtitleField="reference"
        />
    );
}
