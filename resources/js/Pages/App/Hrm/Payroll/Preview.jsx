import { useEffect, useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout/index.jsx';
import { Head } from '@inertiajs/react';
import axios from 'axios';
import { Alert, Button, Card, Col, Form, InputNumber, List, Row, Select, Space, Steps, Table, Typography, message } from 'antd';

const { Title, Text } = Typography;
const money = (value) => Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function PayrollPreview() {
  const [form] = Form.useForm();
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [periods, setPeriods] = useState([]);
  const [branches, setBranches] = useState([]);
  const blockers = [
    ...(preview?.settings_checklist?.errors || []),
    ...(preview?.accounting_readiness?.process?.errors || []),
    ...(preview?.skipped_employees || []).flatMap((employee) => (employee.reasons || []).map((reason) => `${employee.employee_name}: ${reason}`)),
  ];
  const ready = preview?.eligible_employee_count > 0 && blockers.length === 0;

  useEffect(() => {
    axios.get('/api/hrm/payroll-periods', { params: { page_size: 100 } }).then(({ data }) => setPeriods(data.results || []));
    axios.get('/api/branches', { params: { page_size: 100 } }).then(({ data }) => setBranches(data.results || data.data || []));
  }, []);

  const calculate = async () => {
    const values = await form.validateFields();
    setLoading(true);
    try {
      const { data } = await axios.post('/api/hrm/payrolls/preview', { ...values, employee_scope: 'branch' });
      setPreview(data);
    } catch (error) {
      message.error(error.response?.data?.message || 'Preview failed');
    } finally {
      setLoading(false);
    }
  };

  const generate = async () => {
    if (!ready) {
      message.warning('Check payroll and resolve every blocker before generating.');
      return;
    }
    const values = await form.validateFields();
    setLoading(true);
    try {
      const { data } = await axios.post('/api/hrm/payrolls/generate', { ...values, employee_scope: 'branch', strict: true });
      message.success('Payroll generated');
      window.location.href = `/hrm/payroll/${data.id}`;
    } catch (error) {
      message.error(error.response?.data?.message || 'Generate failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthenticatedLayout>
      <Head title="Preview Payroll" />
      <div style={{ padding: 24 }}>
        <Space direction="vertical" size={16} style={{ display: 'flex' }}>
          <Card>
            <Title level={3} style={{ margin: 0 }}>Preview Payroll</Title>
            <Text type="secondary">Choose → check → generate. Nothing is skipped silently.</Text>
          </Card>
          <Card>
            <Steps current={ready ? 2 : preview ? 1 : 0} items={[{ title: 'Choose' }, { title: 'Check' }, { title: 'Generate' }]} style={{ marginBottom: 24 }} />
            <Form form={form} layout="inline" onValuesChange={() => setPreview(null)}>
              <Form.Item name="payroll_period_id" label="Period" rules={[{ required: true }]}>
                <Select showSearch style={{ width: 260 }} placeholder="Select period" options={periods.map((period) => ({ value: period.id, label: period.name }))} />
              </Form.Item>
              <Form.Item name="branch_id" label="Branch">
                <Select showSearch allowClear style={{ width: 220 }} placeholder="Branch" options={branches.map((branch) => ({ value: branch.id, label: branch.name || branch.code }))} />
              </Form.Item>
              <Form.Item name="exchange_rate" label="Exchange Rate" initialValue={1}>
                <InputNumber min={0.000001} style={{ width: 140 }} />
              </Form.Item>
              <Button type="primary" loading={loading} onClick={calculate}>Check Payroll</Button>
              <Button loading={loading} disabled={!ready} onClick={generate}>Generate Payslips</Button>
            </Form>
          </Card>
          {preview && (blockers.length
            ? <Alert showIcon type="error" message="Fix these items before generating" description={<List size="small" dataSource={blockers} renderItem={(item) => <List.Item>{item}</List.Item>} />} />
            : <Alert showIcon type="success" message="Payroll is ready" description={`${preview.eligible_employee_count} employees · Net payable ${money(preview.totals?.net_payable)}`} />)}
          {preview && <Row gutter={12}>
            <Col span={8}><Card size="small"><Text type="secondary">Gross</Text><Title level={4}>{money(preview.totals?.gross_earnings)}</Title></Card></Col>
            <Col span={8}><Card size="small"><Text type="secondary">Deductions</Text><Title level={4}>{money(preview.totals?.total_deductions)}</Title></Card></Col>
            <Col span={8}><Card size="small"><Text type="secondary">Net pay</Text><Title level={4}>{money(preview.totals?.net_payable)}</Title></Card></Col>
          </Row>}
          <Card title="Employee Payroll Preview">
            <Table
              rowKey="employee_id"
              size="small"
              dataSource={preview?.eligible_employees || []}
              expandable={{ expandedRowRender: (row) => <pre style={{ whiteSpace: 'pre-wrap' }}>{JSON.stringify(row.calculation_snapshot, null, 2)}</pre> }}
              columns={[
                { title: 'Employee', dataIndex: 'employee_name' },
                { title: 'Salary', dataIndex: 'salary', align: 'right', render: money },
                { title: 'Payable Days', dataIndex: 'payable_days' },
                { title: 'Gross', dataIndex: 'gross_earnings', align: 'right', render: money },
                { title: 'Deductions', dataIndex: 'total_deductions', align: 'right', render: money },
                { title: 'Net Payable', dataIndex: 'net_payable', align: 'right', render: money },
              ]}
            />
          </Card>
        </Space>
      </div>
    </AuthenticatedLayout>
  );
}
