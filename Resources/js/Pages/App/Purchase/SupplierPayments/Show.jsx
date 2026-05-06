import AccountingRecordShow from '@/Pages/App/Accounting/Shared/AccountingRecordShow';

export default function SupplierPaymentShow({ id }) {
    return (
        <AccountingRecordShow
            id={id}
            title="Supplier Payment"
            endpoint="/api/supplier-payments/"
            backRoute="payment-out.payments.index"
            backLabel="Back to Supplier Payments"
            titleField="payment_no"
            subtitleField="reference"
        />
    );
}
