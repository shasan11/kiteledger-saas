import AccountingRecordShow from '@/Pages/App/Accounting/Shared/AccountingRecordShow';

export default function InvoiceShow({ id }) {
    return (
        <AccountingRecordShow
            id={id}
            title="Invoice"
            endpoint="/api/invoices/"
            backRoute="sales.invoices.index"
            backLabel="Back to Invoices"
            titleField="invoice_no"
            subtitleField="reference"
        />
    );
}
