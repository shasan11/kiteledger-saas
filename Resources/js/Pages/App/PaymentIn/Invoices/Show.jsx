import PaymentInRecordShow from '@/Pages/App/PaymentIn/Shared/PaymentInRecordShow';

export default function InvoiceShow({ id }) {
    return (
        <PaymentInRecordShow
            id={id}
            title="Invoice"
            endpoint="/api/invoices/"
            backRoute="payment-in.invoices.index"
            backLabel="Back to Invoices"
            documentType="invoice"
        />
    );
}
