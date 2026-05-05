import { useEffect, useMemo, useState } from 'react';
import { Head, Link } from '@inertiajs/react';
import { Alert, Button, Card, Col, Descriptions, Empty, Row, Skeleton, Space, Tag, Typography } from 'antd';
import { ArrowLeftOutlined, MailOutlined, PhoneOutlined } from '@ant-design/icons';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';

const { Title, Text } = Typography;
const BACKEND = import.meta.env.VITE_APP_BACKEND_URL || '';
const api = (p) => `${BACKEND}${p}`;

const humanize = (k = '') => k.replace(/_/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase());
const isNil = (v) => v === null || v === undefined || v === '';

function pretty(v) {
  if (isNil(v)) return '-';
  if (typeof v === 'boolean') return <Tag color={v ? 'green' : 'red'}>{v ? 'Yes' : 'No'}</Tag>;
  if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}(T.*)?$/.test(v)) return new Date(v).toLocaleString();
  return String(v);
}

export default function ContactShow({ auth, id }) {
  const [record, setRecord] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const res = await fetch(api(`/api/contacts/${id}`));
        if (!res.ok) throw new Error(`Failed to load contact #${id}`);
        const data = await res.json();
        if (mounted) setRecord(data?.data ?? data);
      } catch (e) {
        if (mounted) setError(e.message || 'Failed to load contact');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [id]);

  const sections = useMemo(() => {
    if (!record) return [];
    return Object.entries(record).filter(([k]) => !['id', 'name', 'full_name'].includes(k));
  }, [record]);

  return (
    <AuthenticatedLayout user={auth?.user} header={<h2 className="text-xl font-semibold">Contact Details</h2>}>
      <Head title={`Contact #${id}`} />
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <Button icon={<ArrowLeftOutlined />}><Link href={route('contacts.index')}>Back to contacts</Link></Button>

        {loading && <Skeleton active paragraph={{ rows: 8 }} />}
        {error && <Alert type="error" message={error} showIcon />}

        {!loading && !error && !record && <Empty description="Contact not found" />}

        {!loading && !error && record && (
          <>
            <Card>
              <Title level={3} style={{ margin: 0 }}>{record.full_name || record.name || `Contact #${id}`}</Title>
              <Space wrap style={{ marginTop: 10 }}>
                {record.email && <Tag icon={<MailOutlined />} color="blue">{record.email}</Tag>}
                {record.phone && <Tag icon={<PhoneOutlined />} color="purple">{record.phone}</Tag>}
                {record.contact_type && <Tag color="gold">{record.contact_type}</Tag>}
              </Space>
            </Card>

            <Row gutter={[16, 16]}>
              <Col xs={24}>
                <Card title="Complete Information">
                  <Descriptions column={2} bordered size="middle">
                    {sections.map(([key, value]) => (
                      <Descriptions.Item key={key} label={humanize(key)} span={typeof value === 'object' ? 2 : 1}>
                        {typeof value === 'object' && value !== null
                          ? <Text code style={{ whiteSpace: 'pre-wrap' }}>{JSON.stringify(value, null, 2)}</Text>
                          : pretty(value)}
                      </Descriptions.Item>
                    ))}
                  </Descriptions>
                </Card>
              </Col>
            </Row>
          </>
        )}
      </Space>
    </AuthenticatedLayout>
  );
}
