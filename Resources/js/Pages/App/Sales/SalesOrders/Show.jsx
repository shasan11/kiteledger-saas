import AccountingRecordShow from '@/Pages/App/Accounting/Shared/AccountingRecordShow';

export default function SalesOrderShow({ id }) {
    return (
        <AccountingRecordShow
            id={id}
            title="Sales Order"
            endpoint="/api/sales-orders/"
            backRoute="sales.sales-orders.index"
            backLabel="Back to Sales Orders"
            titleField="sales_order_no"
            subtitleField="reference"
        />
    );
}
