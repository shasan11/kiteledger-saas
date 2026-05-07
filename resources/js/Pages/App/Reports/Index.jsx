import { useMemo, useState } from 'react';
import { Head, Link, usePage } from '@inertiajs/react';
import { Card, Col, Input, List, Row, Space, Tag, Typography } from 'antd';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout/index.jsx';
import { REPORT_CATEGORIES, hasReportPermission } from './reportRegistry';

const { Search } = Input;
const { Title, Text } = Typography;

export default function ReportsIndex() {
  const [search, setSearch] = useState('');
  const permissions = usePage().props.auth?.permissions || [];

  const visibleCategories = useMemo(() => {
    const query = search.trim().toLowerCase();
    return REPORT_CATEGORIES
      .filter((category) => hasReportPermission(permissions, category.permission))
      .map((category) => ({
        ...category,
        reports: category.reports.filter(([, title]) => !query || `${category.title} ${title}`.toLowerCase().includes(query)),
      }))
      .filter((category) => category.reports.length > 0);
  }, [permissions, search]);

  return (
    <AuthenticatedLayout header={<h2 className="text-xl font-semibold leading-tight text-gray-800">Reports</h2>}>
      <Head title="Reports" />
      <div style={{ padding: 20, background: '#f5f7fb', minHeight: 'calc(100vh - 96px)' }}>
        <Card bordered={false} style={{ marginBottom: 16 }}>
          <Space direction="vertical" style={{ width: '100%' }}>
            <Title level={3} style={{ margin: 0 }}>Reports</Title>
            <Text type="secondary">Production-ready ERP reporting across finance, operations, tax, inventory, HR, system usage, and management analytics.</Text>
            <Search allowClear placeholder="Search reports" value={search} onChange={(event) => setSearch(event.target.value)} style={{ maxWidth: 360 }} />
          </Space>
        </Card>

        <Row gutter={[16, 16]}>
          {visibleCategories.map((category) => (
            <Col xs={24} md={12} xl={8} key={category.key}>
              <Card bordered={false} title={<Space><span>{category.title}</span><Tag>{category.reports.length}</Tag></Space>}>
                <List
                  size="small"
                  dataSource={category.reports}
                  renderItem={([reportKey, title]) => (
                    <List.Item>
                      <Link href={`/reports/${category.key}/${reportKey}`} style={{ color: '#111827', fontWeight: 500 }}>
                        {title}
                      </Link>
                    </List.Item>
                  )}
                />
              </Card>
            </Col>
          ))}
        </Row>
      </div>
    </AuthenticatedLayout>
  );
}
