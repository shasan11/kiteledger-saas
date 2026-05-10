import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { Button, Form, Input, Modal, message } from 'antd';
import { MailOutlined } from '@ant-design/icons';

const BACKEND = import.meta.env.VITE_APP_BACKEND_URL || '';
const api = (path) => `${BACKEND}${path}`;

const authHeaders = () => {
  const token = localStorage.getItem('accessToken');

  return {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

export default function SendEmail({
  buttonProps = {},
  children = 'Send Email',
  defaultValues = {},
  disabled = false,
  endpoint = '/api/hrm/emails/',
  modalTitle = 'Send Email',
  onSuccess,
}) {
  const [open, setOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [form] = Form.useForm();

  const initialValues = useMemo(
    () => ({
      sender_email: defaultValues.sender_email || '',
      receiver_email: defaultValues.receiver_email || defaultValues.to || '',
      subject: defaultValues.subject || '',
      body: defaultValues.body || '',
      email_status: defaultValues.email_status || 'PENDING',
      active: defaultValues.active ?? true,
    }),
    [defaultValues]
  );

  useEffect(() => {
    if (open) {
      form.setFieldsValue(initialValues);
    }
  }, [form, initialValues, open]);

  const handleSubmit = async () => {
    setSending(true);

    try {
      const values = await form.validateFields();

      await axios.post(api(endpoint), values, {
        headers: authHeaders(),
      });

      message.success('Email queued successfully.');
      setOpen(false);
      form.resetFields();
      onSuccess?.(values);
    } catch (error) {
      if (!error?.errorFields) {
        message.error(error?.response?.data?.message || 'Failed to send email.');
      }
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <Button
        type="link"
        icon={<MailOutlined />}
        disabled={disabled}
        onClick={() => setOpen(true)}
        {...buttonProps}
      >
        {children}
      </Button>

      <Modal
        title={modalTitle}
        open={open}
        okText="Send"
        confirmLoading={sending}
        onOk={handleSubmit}
        onCancel={() => setOpen(false)}
        destroyOnClose
      >
        <Form form={form} layout="vertical" initialValues={initialValues}>
          <Form.Item
            name="sender_email"
            label="From Email"
            rules={[
              { required: true, message: 'From email is required.' },
              { type: 'email', message: 'Enter a valid from email.' },
            ]}
          >
            <Input placeholder="sender@example.com" />
          </Form.Item>

          <Form.Item
            name="receiver_email"
            label="To Email"
            rules={[
              { required: true, message: 'Recipient email is required.' },
              { type: 'email', message: 'Enter a valid recipient email.' },
            ]}
          >
            <Input placeholder="recipient@example.com" />
          </Form.Item>

          <Form.Item
            name="subject"
            label="Subject"
            rules={[{ required: true, message: 'Subject is required.' }]}
          >
            <Input placeholder="Email subject" />
          </Form.Item>

          <Form.Item name="body" label="Body">
            <Input.TextArea rows={6} placeholder="Write your message here..." />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
