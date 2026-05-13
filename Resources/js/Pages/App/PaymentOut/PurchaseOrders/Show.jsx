import { usePage } from '@inertiajs/react';
import PaymentOutRecordShow from '@/Pages/App/PaymentOut/Shared/PaymentOutRecordShow';

const BACKEND_BASE = import.meta.env.VITE_APP_BACKEND_URL || '';
const api = (path) => `${BACKEND_BASE}${path}`;

export default function PurchaseOrderShow(props) {
    const { id } = props;
    return (
        <PaymentOutRecordShow
            id={id}
            title="Purchase Order"
            endpoint={api('/api/purchase-orders')}
            backRoute="payment-out.purchase-orders.index"
            backLabel="Purchase Orders"
            documentType="purchase_order"
            editRoute="payment-out.purchase-orders.edit"
        />
    );
}
