import { formatDate } from '@/Components/Central/formatters';
import { router } from '@inertiajs/react';
import { Alert, Checkbox, Form, Input, Modal, Select, Typography, message } from 'antd';

export default function DeleteCustomerModal({ open, onClose, tenant, verifiedBackups = [] }) {
    const [form] = Form.useForm();
    const backupWaived = Form.useWatch('backup_waived', form);
    const backupOptions = verifiedBackups.map((backup) => ({
        value: backup.id,
        label: `${backup.id.slice(0, 8)} - verified ${formatDate(backup.verified_at, true)}`,
    }));

    const submit = (values) => {
        if (! tenant) {
            return;
        }

        router.post(route('central.tenants.deletion.request', tenant.id), {
            current_password: values.current_password,
            confirmation: values.confirmation,
            reason: values.reason,
            backup_manifest_id: values.backup_manifest_id || null,
            backup_waived: Boolean(values.backup_waived),
        }, {
            preserveScroll: true,
            onSuccess: () => {
                message.success('Deletion request created.');
                form.resetFields();
                onClose();
            },
            onError: (errors) => {
                message.error(Object.values(errors)[0] || 'Could not create the deletion request.');
            },
        });
    };

    return (
        <Modal
            open={open}
            title="Delete customer"
            okText="Request deletion"
            okButtonProps={{ danger: true }}
            onCancel={onClose}
            onOk={() => form.submit()}
            destroyOnHidden
        >
            <Alert
                type="error"
                showIcon
                message="Customer deletion is destructive."
                description="The customer is first moved into deletion pending status. The database is removed only after the configured approval and waiting-period flow."
                style={{ marginBottom: 16 }}
            />
            {tenant && <Typography.Paragraph type="secondary">Type <strong>{tenant.company_name}</strong> exactly to confirm.</Typography.Paragraph>}
            <Form form={form} layout="vertical" onFinish={submit} initialValues={{ backup_waived: false }}>
                <Form.Item name="reason" label="Reason" rules={[{ required: true, message: 'Enter a deletion reason.' }]}>
                    <Input.TextArea rows={3} />
                </Form.Item>
                <Form.Item
                    name="backup_manifest_id"
                    label="Verified backup"
                    dependencies={['backup_waived']}
                    rules={[({ getFieldValue }) => ({
                        validator(_, value) {
                            if (getFieldValue('backup_waived') || value) {
                                return Promise.resolve();
                            }

                            return Promise.reject(new Error('Select a verified backup or waive the backup requirement.'));
                        },
                    })]}
                >
                    <Select
                        allowClear
                        disabled={backupWaived}
                        placeholder={backupOptions.length ? 'Select a verified backup' : 'No verified backups available'}
                        options={backupOptions}
                    />
                </Form.Item>
                <Form.Item name="backup_waived" valuePropName="checked">
                    <Checkbox>Waive verified backup requirement</Checkbox>
                </Form.Item>
                <Form.Item name="confirmation" label="Customer name" rules={[{ required: true, message: 'Type the exact customer name.' }]}>
                    <Input autoComplete="off" />
                </Form.Item>
                <Form.Item name="current_password" label="Current administrator password" rules={[{ required: true }]}>
                    <Input.Password autoComplete="current-password" />
                </Form.Item>
            </Form>
        </Modal>
    );
}
