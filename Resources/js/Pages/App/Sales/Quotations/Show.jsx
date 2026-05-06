import AccountingRecordShow from '@/Pages/App/Accounting/Shared/AccountingRecordShow';

export default function QuotationShow({ id }) {
    return (
        <AccountingRecordShow
            id={id}
            title="Quotation"
            endpoint="/api/quotations/"
            backRoute="sales.quotations.index"
            backLabel="Back to Quotations"
            titleField="quotation_no"
            subtitleField="reference"
        />
    );
}
