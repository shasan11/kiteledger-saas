import { useEffect, useState } from 'react';
import { Head, Link } from '@inertiajs/react';
import axios from 'axios';
import {
  Avatar,
  Button,
  Card,
  Col,
  Descriptions,
  Empty,
  Form,
  Input,
  InputNumber,
  Modal,
  Row,
  Select,
  Skeleton,
  Space,
  Table,
  Tag,
  Typography,
  message,
} from 'antd';
import {
  ArrowLeftOutlined,
  EditOutlined,
  MailOutlined,
  MessageOutlined,
  PhoneOutlined,
} from '@ant-design/icons';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';

const { Title, Text } = Typography;
const BACKEND = import.meta.env.VITE_APP_BACKEND_URL || '';
const api = (path) => `${BACKEND}${path}`;

const initials = (name = '') =>
  String(name || '?')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('') || '?';

const clean = (value) => (value === '' || value === undefined ? null : value);

const typeColor = {
  customer: 'green',
  supplier: 'orange',
  lead: 'blue',
};

export default function ContactShow({ auth, id }) {
  const [contact, setContact] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [emailOpen, setEmailOpen] = useState(false);
  const [smsOpen, setSmsOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();
  const [emailForm] = Form.useForm();
  const [smsForm] = Form.useForm();

  const loadContact = async () => {
    setLoading(true);
    try {
      const response = await axios.get(api(`/api/contacts/${id}/`));
      setContact(response.data?.data ?? response.data);
    } catch (error) {
      message.error(error?.response?.data?.message || 'Failed to load contact');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadContact();
  }, [id]);

  const openEdit = () => {
    form.setFieldsValue({
      name: contact?.name || '',
      code: contact?.code || '',
      contact_type: contact?.contact_type || 'customer',
      phone: contact?.phone || '',
      email: contact?.email || '',
      pan: contact?.pan || '',
      tax_registration_no: contact?.tax_registration_no || '',
      tax_registration_type: contact?.tax_registration_type || null,
      credit_limit: contact?.credit_limit ?? null,
      address: contact?.address || '',
      accept_purchase: Boolean(contact?.accept_purchase),
      active: contact?.active !== false,
    });
    setEditOpen(true);
  };

  const saveEdit = async () => {
    try {
      const values = await form.validateFields();
      const payload = {
        name: clean(values.name?.trim()),
        code: clean(values.code?.trim()),
        contact_type: values.contact_type || 'customer',
        phone: clean(values.phone?.trim()),
        email: clean(values.email?.trim()),
        pan: clean(values.pan?.trim()),
        tax_registration_no: clean(values.tax_registration_no?.trim()),
        tax_registration_type: values.tax_registration_type || null,
        credit_limit: values.credit_limit != null ? Number(values.credit_limit) : null,
        address: clean(values.address?.trim()),
        accept_purchase: Boolean(values.accept_purchase),
        active: values.active !== false,
      };

      setSaving(true);
      await axios.put(api(`/api/contacts/${id}/`), payload);
      message.success('Contact updated');
      setEditOpen(false);
      await loadContact();
    } catch (error) {
      if (error?.errorFields) {
        message.error('Please fill the required fields.');
      } else {
        message.error(error?.response?.data?.message || 'Failed to update contact');
      }
    } finally {
      setSaving(false);
    }
  };

  const fakeSend = async (kind) => {
    if (kind === 'email') await emailForm.validateFields();
    if (kind === 'sms') await smsForm.validateFields();
    message.success(`${kind === 'email' ? 'Email' : 'SMS'} queued locally`);
    setEmailOpen(false);
    setSmsOpen(false);
  };

  const transactionColumns = [
    { title: 'Date', dataIndex: 'date', key: 'date' },
    { title: 'Type', dataIndex: 'type', key: 'type' },
    { title: 'Reference', dataIndex: 'reference', key: 'reference' },
    { title: 'Amount', dataIndex: 'amount', key: 'amount', align: 'right' },
  ];

  return (
    <AuthenticatedLayout user={auth?.user}>
      <Head title={contact?.name || 'Contact'} />
      <div style={{ padding: 18 }}>
        <Space direction="vertical" size={16} style={{ width: '100%' }}>
          <Button icon={<ArrowLeftOutlined />}>
            <Link href={route('crm.contacts.index')}>Back to contacts</Link>
          </Button>

          {loading ? (
            <Skeleton active paragraph={{ rows: 8 }} />
          ) : (
            <>
              <Card>
                <Row gutter={[18, 18]} align="middle">
                  <Col>
                    <Avatar size={76} style={{ background: '#1677ff', fontSize: 24, fontWeight: 700 }}>
                      {initials(contact?.name)}
                    </Avatar>
                  </Col>
                  <Col flex="auto">
                    <Title level={3} style={{ margin: 0 }}>{contact?.name || 'Contact'}</Title>
                    <Space wrap style={{ marginTop: 8 }}>
                      {contact?.contact_type ? <Tag color={typeColor[contact.contact_type] || 'default'}>{contact.contact_type.toUpperCase()}</Tag> : null}
                      {contact?.email ? <Tag icon={<MailOutlined />} color="blue">{contact.email}</Tag> : null}
                      {contact?.phone ? <Tag icon={<PhoneOutlined />} color="purple">{contact.phone}</Tag> : null}
                      <Tag color={contact?.active !== false ? 'green' : 'red'}>{contact?.active !== false ? 'Active' : 'Inactive'}</Tag>
                    </Space>
                  </Col>
                  <Col>
                    <Space wrap>
                      <Button icon={<MailOutlined />} onClick={() => setEmailOpen(true)}>Email</Button>
                      <Button icon={<MessageOutlined />} onClick={() => setSmsOpen(true)}>SMS</Button>
                      <Button type="primary" icon={<EditOutlined />} onClick={openEdit}>Edit</Button>
                    </Space>
                  </Col>
                </Row>
              </Card>

              <Row gutter={[16, 16]}>
                <Col xs={24} lg={14}>
                  <Card title="Contact Info">
                    <Descriptions bordered column={2} size="small">
                      <Descriptions.Item label="Code">{contact?.code || '-'}</Descriptions.Item>
                      <Descriptions.Item label="Group">{contact?.contactGroup?.name || contact?.contact_group?.name || '-'}</Descriptions.Item>
                      <Descriptions.Item label="PAN">{contact?.pan || '-'}</Descriptions.Item>
                      <Descriptions.Item label="Tax Reg. No">{contact?.tax_registration_no || '-'}</Descriptions.Item>
                      <Descriptions.Item label="Tax Reg. Type">{contact?.tax_registration_type || '-'}</Descriptions.Item>
                      <Descriptions.Item label="Credit Limit">{contact?.credit_limit ?? '-'}</Descriptions.Item>
                      <Descriptions.Item label="Accept Purchase">{contact?.accept_purchase ? 'Yes' : 'No'}</Descriptions.Item>
                      <Descriptions.Item label="Address" span={2}>{contact?.address || '-'}</Descriptions.Item>
                    </Descriptions>
                  </Card>
                </Col>
                <Col xs={24} lg={10}>
                  <Card title="Recent Transactions">
                    <Table columns={transactionColumns} dataSource={[]} pagination={false} locale={{ emptyText: <Empty description="You can wire these values later" /> }} />
                  </Card>
                </Col>
              </Row>
            </>
          )}
        </Space>
      </div>

      <Modal title="Edit Contact" open={editOpen} onCancel={() => setEditOpen(false)} onOk={saveEdit} confirmLoading={saving} width={820}>
        <Form form={form} layout="vertical">
          <Row gutter={16}>
            <Col span={12}><Form.Item name="name" label="Name" rules={[{ required: true }]}><Input /></Form.Item></Col>
            <Col span={6}><Form.Item name="code" label="Code"><Input /></Form.Item></Col>
            <Col span={6}><Form.Item name="contact_type" label="Type" rules={[{ required: true }]}><Select options={[{ value: 'customer', label: 'Customer' }, { value: 'supplier', label: 'Supplier' }, { value: 'lead', label: 'Lead' }]} /></Form.Item></Col>
            <Col span={8}><Form.Item name="phone" label="Phone"><Input /></Form.Item></Col>
            <Col span={8}><Form.Item name="email" label="Email" rules={[{ type: 'email' }]}><Input /></Form.Item></Col>
            <Col span={8}><Form.Item name="pan" label="PAN"><Input /></Form.Item></Col>
            <Col span={8}><Form.Item name="tax_registration_no" label="Tax Reg. No"><Input /></Form.Item></Col>
            <Col span={8}><Form.Item name="tax_registration_type" label="Tax Reg. Type"><Select allowClear options={[{ value: 'pan', label: 'PAN' }, { value: 'vat', label: 'VAT' }, { value: 'none', label: 'None' }]} /></Form.Item></Col>
            <Col span={8}><Form.Item name="credit_limit" label="Credit Limit"><InputNumber min={0} style={{ width: '100%' }} /></Form.Item></Col>
            <Col span={12}><Form.Item name="accept_purchase" label="Accept Purchase"><Select options={[{ value: false, label: 'No' }, { value: true, label: 'Yes' }]} /></Form.Item></Col>
            <Col span={12}><Form.Item name="active" label="Active"><Select options={[{ value: true, label: 'Yes' }, { value: false, label: 'No' }]} /></Form.Item></Col>
            <Col span={24}><Form.Item name="address" label="Address"><Input.TextArea rows={3} /></Form.Item></Col>
          </Row>
        </Form>
      </Modal>

      <Modal title="Send Email" open={emailOpen} onCancel={() => setEmailOpen(false)} onOk={() => fakeSend('email')}>
        <Form form={emailForm} layout="vertical" initialValues={{ to: contact?.email || '' }}>
          <Form.Item name="to" label="To" rules={[{ required: true }, { type: 'email' }]}><Input /></Form.Item>
          <Form.Item name="subject" label="Subject" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="message" label="Message" rules={[{ required: true }]}><Input.TextArea rows={5} /></Form.Item>
        </Form>
      </Modal>

      <Modal title="Send SMS" open={smsOpen} onCancel={() => setSmsOpen(false)} onOk={() => fakeSend('sms')}>
        <Form form={smsForm} layout="vertical" initialValues={{ to: contact?.phone || '' }}>
          <Form.Item name="to" label="Phone" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="message" label="Message" rules={[{ required: true }]}><Input.TextArea rows={4} maxLength={320} showCount /></Form.Item>
        </Form>
      </Modal>
    </AuthenticatedLayout>
  );
}
