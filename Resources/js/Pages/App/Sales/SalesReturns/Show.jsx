import AccountingRecordShow from '@/Pages/App/Accounting/Shared/AccountingRecordShow';

export default function SalesReturnShow({ id }) {
    return (
        <AccountingRecordShow
            id={id}
            title="Sales Return"
            endpoint="/api/sales-returns/"
            backRoute="sales.sales-returns.index"
            backLabel="Back to Sales Returns"
            titleField="return_no"
            subtitleField="reference"
        />
    );
}
