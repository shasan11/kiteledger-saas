import PaymentInRecordShow from '@/Pages/App/PaymentIn/Shared/PaymentInRecordShow';

export default function QuotationShow({ id }) {
    return (
        <PaymentInRecordShow
            id={id}
            title="Quotation"
            endpoint="/api/quotations/"
            backRoute="payment-in.quotations.index"
            backLabel="Back to Quotations"
            documentType="quotation"
        />
    );
}
