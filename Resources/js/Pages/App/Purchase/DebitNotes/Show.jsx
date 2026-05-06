import AccountingRecordShow from '@/Pages/App/Accounting/Shared/AccountingRecordShow';

export default function DebitNoteShow({ id }) {
    return (
        <AccountingRecordShow
            id={id}
            title="Debit Note"
            endpoint="/api/debit-notes/"
            backRoute="payment-out.debit-notes.index"
            backLabel="Back to Debit Notes"
            titleField="debit_note_no"
            subtitleField="reference"
        />
    );
}
