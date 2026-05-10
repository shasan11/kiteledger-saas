import PaymentInRecordShow from '@/Pages/App/PaymentIn/Shared/PaymentInRecordShow';

export default function DebitNoteShow({ id }) {
    return (
        <PaymentInRecordShow
            id={id}
            title="Debit Note"
            endpoint="/api/debit-notes/"
            backRoute="payment-out.debit-notes.index"
            backLabel="Back to Debit Notes"
            documentType="debit_note"
            editRoute="payment-out.debit-notes.edit"
        />
    );
}
