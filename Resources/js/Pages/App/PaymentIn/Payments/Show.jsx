import PaymentInRecordShow from '@/Pages/App/PaymentIn/Shared/PaymentInRecordShow';

export default function PaymentShow({ id }) {
    return (
        <PaymentInRecordShow
            id={id}
            title="Payment"
            endpoint="/api/customer-payments/"
            backRoute="payment-in.payments.index"
            backLabel="Back to Payments"
            documentType="customer_payment"
        />
    );
}
