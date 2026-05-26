import { useEffect, useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout/index.jsx';
import { Head } from '@inertiajs/react';
import { Spin, Alert } from 'antd';
import axios from 'axios';
import JournalVoucherAdd from './Add.jsx';

const BACKEND_BASE = import.meta.env.VITE_APP_BACKEND_URL || '';
const api = (path) => `${BACKEND_BASE}${path}`;
const authHeaders = () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    return token ? { Authorization: `Bearer ${token}` } : {};
};

export default function JournalVoucherEdit({ id, ...props }) {
    const [record, setRecord] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const res = await axios.get(api(`/api/journal-vouchers/${id}/`), { headers: authHeaders() });
                if (cancelled) return;
                setRecord(res?.data || null);
            } catch (e) {
                if (cancelled) return;
                setError(e?.response?.data?.message || 'Failed to load voucher');
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [id]);

    if (loading) {
        return (
            <AuthenticatedLayout user={props.auth?.user}>
                <Head title="Edit Journal Voucher" />
                <div style={{ padding: 48, textAlign: 'center' }}>
                    <Spin size="large" />
                </div>
            </AuthenticatedLayout>
        );
    }

    if (error) {
        return (
            <AuthenticatedLayout user={props.auth?.user}>
                <Head title="Edit Journal Voucher" />
                <div style={{ padding: 24 }}>
                    <Alert type="error" message={error} showIcon />
                </div>
            </AuthenticatedLayout>
        );
    }

    return (
        <JournalVoucherAdd
            initialRecord={record}
            isEdit
            recordId={id}
            auth={props.auth}
        />
    );
}
