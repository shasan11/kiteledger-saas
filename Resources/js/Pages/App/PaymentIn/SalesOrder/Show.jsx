import PaymentInRecordShow from '@/Pages/App/PaymentIn/Shared/PaymentInRecordShow';

export default function SalesOrderShow({ id }) {
    return (
        <PaymentInRecordShow
            id={id}
            title="Sales Order"
            endpoint="/api/sales-orders/"
            backRoute="payment-in.sales-orders.index"
            backLabel="Back to Sales Orders"
            documentType="sales_order"
        />
    );
}
