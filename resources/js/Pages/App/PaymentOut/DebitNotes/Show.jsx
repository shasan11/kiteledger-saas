import PaymentOutRecordShow from '@/Pages/App/PaymentOut/Shared/PaymentOutRecordShow';

const BACKEND_BASE = import.meta.env.VITE_APP_BACKEND_URL || '';
const api = (path) => `${BACKEND_BASE}${path}`;

export default function DebitNoteShow(props) {
    const { id } = props;
    return (
        <PaymentOutRecordShow
            id={id}
            title="Debit Note"
            endpoint={api('/api/debit-notes')}
            backRoute="payment-out.debit-notes.index"
            backLabel="Debit Notes"
            documentType="debit_note"
            editRoute="payment-out.debit-notes.edit"
        />
    );
}
