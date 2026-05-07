import PaymentInRecordShow from '@/Pages/App/PaymentIn/Shared/PaymentInRecordShow';

export default function PurchaseBillShow({ id }) {
    return (
        <PaymentInRecordShow
            id={id}
            title="Purchase Bill"
            endpoint="/api/purchase-bills/"
            backRoute="payment-out.purchase-bills.index"
            backLabel="Back to Purchase Bills"
            documentType="purchase_bill"
        />
    );
}
