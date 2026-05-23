import { useEffect, useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout/index.jsx';
import { Head } from '@inertiajs/react';
import { Spin, Alert } from 'antd';
import { getJson } from '@/Components/Transactions/txnApi.js';
import PaymentInAdd from './Add.jsx';

export default function PaymentInEdit({ id, ...props }) {
  const [record, setRecord] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try { const res = await getJson(`/api/customer-payments/${id}/`); if (!cancelled) setRecord(res?.data || null); }
      catch (e) { if (!cancelled) setError(e?.response?.data?.message || 'Failed to load payment'); }
      finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [id]);
  if (loading) return <AuthenticatedLayout user={props.auth?.user}><Head title="Edit Customer Payment" /><div style={{ padding: 48, textAlign: 'center' }}><Spin size="large" /></div></AuthenticatedLayout>;
  if (error) return <AuthenticatedLayout user={props.auth?.user}><Head title="Edit Customer Payment" /><div style={{ padding: 24 }}><Alert type="error" showIcon message={error} /></div></AuthenticatedLayout>;
  return <PaymentInAdd initialRecord={record} isEdit recordId={id} auth={props.auth} />;
}
