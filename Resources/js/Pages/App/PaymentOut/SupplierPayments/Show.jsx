import PaymentOutRecordShow from '@/Pages/App/PaymentOut/Shared/PaymentOutRecordShow';

const BACKEND_BASE = import.meta.env.VITE_APP_BACKEND_URL || '';
const api = (path) => `${BACKEND_BASE}${path}`;

export default function SupplierPaymentShow(props) {
    const { id } = props;
    return (
        <PaymentOutRecordShow
            id={id}
            title="Supplier Payment"
            endpoint={api('/api/supplier-payments')}
            backRoute="payment-out.supplier-payments.index"
            backLabel="Supplier Payments"
            documentType="supplier_payment"
            editRoute="payment-out.supplier-payments.edit"
        />
    );
}
