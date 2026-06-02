import { useEffect, useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout/index.jsx';
import { Head, usePage } from '@inertiajs/react';
import axios from 'axios';
import { Button, Card, Collapse, Descriptions, Space, Table, Tag, Typography, message } from 'antd';
import { DownloadOutlined, PrinterOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;
const money = (value) => Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function PayslipShow() {
  const { props } = usePage();
  const [payslip, setPayslip] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    axios.get(`/api/hrm/payslips/${props.id}`)
      .then(({ data }) => setPayslip(data))
      .catch((error) => message.error(error.response?.data?.message || 'Unable to load payslip'))
      .finally(() => setLoading(false));
  }, [props.id]);

  const lines = payslip?.lines || [];

  return (
    <AuthenticatedLayout>
      <Head title="Payslip" />
      <div style={{ padding: 24 }}>
        <Space direction="vertical" size={16} style={{ display: 'flex' }}>
          <Card>
            <Space style={{ width: '100%', justifyContent: 'space-between' }} align="start">
              <div>
                <Title level={3} style={{ margin: 0 }}>{payslip?.payslip_number || 'Payslip'}</Title>
                <Text type="secondary">Employee earnings, deductions, attendance, and net payable.</Text>
              </div>
              <Space>
                <Button icon={<PrinterOutlined />} onClick={() => window.print()}>Print</Button>
                <Button type="primary" icon={<DownloadOutlined />} onClick={() => window.open(`/api/hrm/payslips/${props.id}/pdf`, '_blank')}>Download PDF</Button>
              </Space>
            </Space>
          </Card>
          <Card loading={loading}>
            {payslip && (
              <Descriptions bordered size="small" column={3}>
                <Descriptions.Item label="Employee">{payslip.employee?.display_name || payslip.user?.display_name || '-'}</Descriptions.Item>
                <Descriptions.Item label="Status"><Tag>{payslip.status}</Tag></Descriptions.Item>
                <Descriptions.Item label="Payment">{payslip.payment_status}</Descriptions.Item>
                <Descriptions.Item label="Salary">{money(payslip.salary)}</Descriptions.Item>
                <Descriptions.Item label="Payable Days">{payslip.payable_days}</Descriptions.Item>
                <Descriptions.Item label="Net Payable">{money(payslip.net_payable || payslip.total_payable)}</Descriptions.Item>
              </Descriptions>
            )}
          </Card>
          <Card title="Earnings and Deductions">
            <Table
              rowKey="id"
              size="small"
              pagination={false}
              dataSource={lines}
              columns={[
                { title: 'Type', dataIndex: 'type', render: (value) => <Tag>{value}</Tag> },
                { title: 'Name', dataIndex: 'name' },
                { title: 'Calculation', dataIndex: 'calculation_type' },
                { title: 'Amount', dataIndex: 'amount', align: 'right', render: money },
              ]}
            />
          </Card>
          <Collapse items={[{ key: 'snapshot', label: 'Advanced Calculation Snapshot', children: <pre>{JSON.stringify(payslip?.calculation_snapshot || {}, null, 2)}</pre> }]} />
        </Space>
      </div>
    </AuthenticatedLayout>
  );
}
