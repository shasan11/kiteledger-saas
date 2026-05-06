import AccountingRecordShow from '@/Pages/App/Accounting/Shared/AccountingRecordShow';

export default function ProformaInvoiceShow({ id }) {
    return (
        <AccountingRecordShow
            id={id}
            title="Proforma Invoice"
            endpoint="/api/proforma-invoices/"
            backRoute="sales.proforma-invoices.index"
            backLabel="Back to Proforma Invoices"
            titleField="proforma_invoice_no"
            subtitleField="reference"
        />
    );
}
