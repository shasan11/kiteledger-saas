import AccountingRecordShow from '@/Pages/App/Accounting/Shared/AccountingRecordShow';

export default function CustomerPaymentShow({ id }) {
    return (
        <AccountingRecordShow
            id={id}
            title="Customer Payment"
            endpoint="/api/customer-payments/"
            backRoute="sales.customer-payments.index"
            backLabel="Back to Customer Payments"
            titleField="payment_no"
            subtitleField="reference"
        />
    );
}
