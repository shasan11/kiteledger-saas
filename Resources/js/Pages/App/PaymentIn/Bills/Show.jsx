import PaymentInRecordShow from '@/Pages/App/PaymentIn/Shared/PaymentInRecordShow';

export default function BillShow({ id }) {
    return (
        <PaymentInRecordShow
            id={id}
            title="Bill"
            endpoint="/api/invoices/"
            backRoute="payment-in.bills.index"
            backLabel="Back to Bills"
            documentType="invoice"
            editRoute="payment-in.bills.edit"
        />
    );
}
