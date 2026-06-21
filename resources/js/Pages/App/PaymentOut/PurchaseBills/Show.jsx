import PaymentOutRecordShow from '@/Pages/App/PaymentOut/Shared/PaymentOutRecordShow';

const BACKEND_BASE = import.meta.env.VITE_APP_BACKEND_URL || '';
const api = (path) => `${BACKEND_BASE}${path}`;

export default function PurchaseBillShow(props) {
    const { id } = props;
    return (
        <PaymentOutRecordShow
            id={id}
            title="Purchase Bill"
            endpoint={api('/api/purchase-bills')}
            backRoute="payment-out.purchase-bills.index"
            backLabel="Purchase Bills"
            documentType="purchase_bill"
            editRoute="payment-out.purchase-bills.edit"
        />
    );
}
