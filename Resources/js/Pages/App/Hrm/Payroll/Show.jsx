import { useEffect, useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout/index.jsx';
import { Head, usePage } from '@inertiajs/react';
import axios from 'axios';
import { Button, Card, Descriptions, Dropdown, Space, Table, Tag, Typography, message } from 'antd';
import { DownloadOutlined, MoreOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;
const money = (value) => Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function PayrollShow() {
  const { props } = usePage();
  const id = props.id;
  const [payroll, setPayroll] = useState(null);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await axios.get(`/api/hrm/payrolls/${id}`);
      setPayroll(data);
    } catch (error) {
      message.error(error.response?.data?.message || 'Unable to load payroll');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [id]);

  const action = async (key) => {
    try {
      if (['reopen', 'void', 'reverse'].includes(key)) {
        const reason = window.prompt(`Reason for ${key}`);
        if (!reason) return;
        await axios.post(`/api/hrm/payrolls/${id}/${key}`, { reason });
      } else {
        await axios.post(`/api/hrm/payrolls/${id}/${key}`, key === 'mark-paid' ? { source_account_id: payroll.source_account_id } : {});
      }
      message.success('Payroll updated');
      load();
    } catch (error) {
      message.error(error.response?.data?.message || 'Action failed');
    }
  };

  const items = [
    { key: 'approve', label: 'Approve', disabled: payroll?.status !== 'generated' },
    { key: 'process', label: 'Process', disabled: payroll?.status !== 'approved' },
    { key: 'mark-paid', label: 'Mark Paid', disabled: !['approved', 'processed'].includes(payroll?.status) },
    { key: 'lock', label: 'Lock', disabled: payroll?.status !== 'paid' },
    { key: 'reopen', label: 'Reopen', disabled: !['generated', 'approved', 'processed'].includes(payroll?.status) },
    { key: 'reverse', label: 'Reverse', disabled: !['processed', 'paid', 'locked'].includes(payroll?.status) },
    { key: 'void', label: 'Void', danger: true, disabled: ['paid', 'locked', 'voided'].includes(payroll?.status) },
  ];

  return (
    <AuthenticatedLayout>
      <Head title="Payroll" />
      <div style={{ padding: 24 }}>
        <Space direction="vertical" size={16} style={{ display: 'flex' }}>
          <Card>
            <Space style={{ width: '100%', justifyContent: 'space-between' }} align="start">
              <div>
                <Title level={3} style={{ margin: 0 }}>{payroll?.payroll_number || 'Payroll'}</Title>
                <Text type="secondary">Review payslips, accounting status, and lifecycle actions.</Text>
              </div>
              <Dropdown menu={{ items, onClick: ({ key }) => action(key) }}>
                <Button icon={<MoreOutlined />}>Actions</Button>
              </Dropdown>
            </Space>
          </Card>

          <Card loading={loading}>
            {payroll && (
              <Descriptions bordered size="small" column={4}>
                <Descriptions.Item label="Status"><Tag>{payroll.status}</Tag></Descriptions.Item>
                <Descriptions.Item label="Employees">{payroll.total_employees}</Descriptions.Item>
                <Descriptions.Item label="Gross">{money(payroll.total_gross)}</Descriptions.Item>
                <Descriptions.Item label="Net Payable">{money(payroll.total_net_payable)}</Descriptions.Item>
                <Descriptions.Item label="Period">{payroll.payroll_period?.name}</Descriptions.Item>
                <Descriptions.Item label="Branch">{payroll.branch?.name || '-'}</Descriptions.Item>
                <Descriptions.Item label="Accrual JV">{payroll.journal_voucher?.voucher_no || '-'}</Descriptions.Item>
                <Descriptions.Item label="Payment JV">{payroll.payment_journal_voucher?.voucher_no || '-'}</Descriptions.Item>
              </Descriptions>
            )}
          </Card>

          <Card title="Payslips">
            <Table
              rowKey="id"
              size="small"
              dataSource={payroll?.payslips || []}
              columns={[
                { title: 'Employee', render: (_, row) => row.employee?.display_name || row.employee?.name || '-' },
                { title: 'Salary', dataIndex: 'salary', align: 'right', render: money },
                { title: 'Payable Days', dataIndex: 'payable_days' },
                { title: 'Gross', dataIndex: 'gross_earnings', align: 'right', render: money },
                { title: 'Deductions', dataIndex: 'total_deductions', align: 'right', render: money },
                { title: 'Net Payable', dataIndex: 'net_payable', align: 'right', render: money },
                { title: 'Status', dataIndex: 'status', render: (value) => <Tag>{value}</Tag> },
                { title: '', render: (_, row) => <Button icon={<DownloadOutlined />} onClick={() => window.open(`/api/hrm/payslips/${row.id}/pdf`, '_blank')} /> },
              ]}
            />
          </Card>
        </Space>
      </div>
    </AuthenticatedLayout>
  );
}
