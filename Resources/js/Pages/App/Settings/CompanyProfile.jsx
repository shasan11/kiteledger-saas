import { useEffect, useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout/index.jsx';
import { Head } from '@inertiajs/react';
import { Button, Card, Col, Form, Input, Row, Select, Space, Switch, message } from 'antd';
import axios from 'axios';
import { api, cleanPayload, fetchList } from './settingsApi';

export default function CompanyProfile({ auth }) {
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);
  const [currencies, setCurrencies] = useState([]);
  const [fiscalYears, setFiscalYears] = useState([]);

  useEffect(() => {
    Promise.all([
      axios.get(api('/api/app-settings/current')),
      fetchList('/api/currencies/', { page_size: 100 }),
      fetchList('/api/fiscal-years', { page_size: 100 }),
    ]).then(([settings, currencyRows, fiscalRows]) => {
      form.setFieldsValue(settings.data || {});
      setCurrencies(currencyRows.map((item) => ({ value: item.id, label: `${item.code} - ${item.name}` })));
      setFiscalYears(fiscalRows.map((item) => ({ value: item.id, label: item.name })));
    });
  }, [form]);

  const save = async () => {
    setSaving(true);
    try {
      await axios.put(api('/api/app-settings/current'), cleanPayload(await form.validateFields()));
      message.success('Company settings saved');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AuthenticatedLayout auth={auth}>
      <Head title="Company Profile" />
      <div style={{ padding: 18 }}>
        <Card title="Company Profile" extra={<Button type="primary" loading={saving} onClick={save}>Save</Button>} style={{ borderRadius: 8 }}>
          <Form form={form} layout="vertical">
            <Row gutter={12}>
              <Col xs={24} md={8}><Form.Item name="company_name" label="Company Name" rules={[{ required: true }]}><Input /></Form.Item></Col>
              <Col xs={24} md={8}><Form.Item name="legal_name" label="Legal Name"><Input /></Form.Item></Col>
              <Col xs={24} md={8}><Form.Item name="tag_line" label="Tag Line"><Input /></Form.Item></Col>
              <Col xs={24} md={8}><Form.Item name="registration_number" label="Registration Number"><Input /></Form.Item></Col>
              <Col xs={24} md={8}><Form.Item name="tax_number" label="PAN / Tax Number"><Input /></Form.Item></Col>
              <Col xs={24} md={8}><Form.Item name="vat_number" label="VAT Number"><Input /></Form.Item></Col>
              <Col xs={24} md={8}><Form.Item name="phone" label="Phone"><Input /></Form.Item></Col>
              <Col xs={24} md={8}><Form.Item name="email" label="Email" rules={[{ type: 'email' }]}><Input /></Form.Item></Col>
              <Col xs={24} md={8}><Form.Item name="website" label="Website"><Input /></Form.Item></Col>
              <Col xs={24} md={12}><Form.Item name="address_line_1" label="Address Line 1"><Input /></Form.Item></Col>
              <Col xs={24} md={12}><Form.Item name="address_line_2" label="Address Line 2"><Input /></Form.Item></Col>
              <Col xs={24} md={6}><Form.Item name="city" label="City"><Input /></Form.Item></Col>
              <Col xs={24} md={6}><Form.Item name="state" label="State"><Input /></Form.Item></Col>
              <Col xs={24} md={6}><Form.Item name="postal_code" label="Postal Code"><Input /></Form.Item></Col>
              <Col xs={24} md={6}><Form.Item name="country" label="Country"><Input /></Form.Item></Col>
              <Col xs={24} md={8}><Form.Item name="default_currency_id" label="Default Currency"><Select allowClear options={currencies} /></Form.Item></Col>
              <Col xs={24} md={8}><Form.Item name="fiscal_year_id" label="Fiscal Year"><Select allowClear options={fiscalYears} /></Form.Item></Col>
              <Col xs={24} md={8}><Form.Item name="timezone" label="Timezone"><Select showSearch options={[{ value: 'Asia/Katmandu' }, { value: 'UTC' }, { value: 'Asia/Kolkata' }]} /></Form.Item></Col>
              <Col xs={24} md={6}><Form.Item name="date_format" label="Date Format"><Select options={[{ value: 'DD-MM-YYYY' }, { value: 'YYYY-MM-DD' }, { value: 'MM/DD/YYYY' }]} /></Form.Item></Col>
              <Col xs={24} md={6}><Form.Item name="time_format" label="Time Format"><Select options={[{ value: 'HH:mm' }, { value: 'hh:mm A' }]} /></Form.Item></Col>
              <Col xs={24} md={6}><Form.Item name="week_start_day" label="Week Start"><Select options={['Sunday', 'Monday', 'Saturday'].map((value) => ({ value }))} /></Form.Item></Col>
              <Col xs={24} md={6}><Form.Item name="use_nepali_calendar" label="Nepali Calendar" valuePropName="checked"><Switch /></Form.Item></Col>
              <Col span={24}><Form.Item name="footer" label="Document Footer"><Input.TextArea rows={3} /></Form.Item></Col>
            </Row>
            <Space>
              <Button type="primary" loading={saving} onClick={save}>Save</Button>
            </Space>
          </Form>
        </Card>
      </div>
    </AuthenticatedLayout>
  );
}
