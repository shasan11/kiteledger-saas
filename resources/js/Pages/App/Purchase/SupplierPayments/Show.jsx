import PaymentOutRecordShow from '@/Pages/App/PaymentOut/Shared/PaymentOutRecordShow';

export default function SupplierPaymentShow({ id }) {
    return (
        <PaymentOutRecordShow
            id={id}
            title="Supplier Payment"
            endpoint="/api/supplier-payments/"
            backRoute="payment-out.supplier-payments.index"
            backLabel="Back to Supplier Payments"
            documentType="supplier_payment"
            editRoute="payment-out.supplier-payments.edit"
        />
    );
}
