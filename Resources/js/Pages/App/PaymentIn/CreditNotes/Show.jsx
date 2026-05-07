import PaymentInRecordShow from '@/Pages/App/PaymentIn/Shared/PaymentInRecordShow';

export default function CreditNoteShow({ id }) {
    return (
        <PaymentInRecordShow
            id={id}
            title="Credit Note"
            endpoint="/api/credit-notes/"
            backRoute="payment-in.credit-notes.index"
            backLabel="Back to Credit Notes"
            documentType="credit_note"
        />
    );
}
