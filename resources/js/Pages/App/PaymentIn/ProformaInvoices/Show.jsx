import PaymentInRecordShow from '@/Pages/App/PaymentIn/Shared/PaymentInRecordShow';

export default function ProformaInvoiceShow({ id }) {
    return (
        <PaymentInRecordShow
            id={id}
            title="Proforma Invoice"
            endpoint="/api/proforma-invoices/"
            backRoute="payment-in.proforma-invoices.index"
            backLabel="Back to Proforma Invoices"
            documentType="proforma_invoice"
        />
    );
}
