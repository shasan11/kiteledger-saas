import PaymentInRecordShow from '@/Pages/App/PaymentIn/Shared/PaymentInRecordShow';

export default function SupplierPaymentShow({ id }) {
    return (
        <PaymentInRecordShow
            id={id}
            title="Supplier Payment"
            endpoint="/api/supplier-payments/"
            backRoute="payment-out.supplier-payments.index"
            backLabel="Back to Supplier Payments"
            documentType="supplier_payment"
        />
    );
}
