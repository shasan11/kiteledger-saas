import { Alert, Descriptions, Form, Input, InputNumber, Modal, Space, theme, Typography } from 'antd';
import { money } from '@/Pages/App/Pos/Shared/posHelpers';

const { Text } = Typography;

export default function OpenShiftModal({ open, terminal, loading, onCancel, onSubmit }) {
    const { token } = theme.useToken();
    const [form] = Form.useForm();

    return (
        <Modal
            title="Open Shift"
            open={open}
            onCancel={() => {
                form.resetFields();
                onCancel?.();
            }}
            onOk={() => form.submit()}
            confirmLoading={loading}
            okText="Open Shift"
            destroyOnClose
        >
            <Space direction="vertical" size={token.margin} style={{ width: '100%' }}>
                <Alert
                    showIcon
                    type="info"
                    message="Count the drawer before starting sales."
                />

                <Descriptions
                    size="small"
                    column={1}
                    bordered
                    items={[
                        {
                            key: 'terminal',
                            label: 'Terminal',
                            children: terminal ? `${terminal.name} (${terminal.code || '-'})` : '-',
                        },
                        {
                            key: 'branch',
                            label: 'Branch',
                            children: terminal?.branch?.name || '-',
                        },
                        {
                            key: 'warehouse',
                            label: 'Warehouse',
                            children: terminal?.warehouse?.name || '-',
                        },
                        {
                            key: 'today',
                            label: "Today's Sales",
                            children: `Rs. ${money(terminal?.today_sales)}`,
                        },
                    ]}
                />

                <Form
                    form={form}
                    layout="vertical"
                    initialValues={{ opening_cash: 0, notes: '' }}
                    onFinish={(values) => onSubmit?.(values, form)}
                >
                    <Form.Item label="Terminal Name">
                        <Input readOnly value={terminal?.name || ''} />
                    </Form.Item>

                    <Form.Item
                        name="opening_cash"
                        label="Opening Cash"
                        rules={[
                            { required: true, message: 'Opening cash is required.' },
                            { type: 'number', min: 0, message: 'Opening cash cannot be negative.' },
                        ]}
                    >
                        <InputNumber style={{ width: '100%' }} min={0} prefix="Rs." placeholder="0.00" />
                    </Form.Item>

                    <Form.Item name="notes" label="Opening Note">
                        <Input.TextArea rows={3} placeholder="Optional note" />
                    </Form.Item>

                    <Text type="secondary">This shift will be opened under your cashier account.</Text>
                </Form>
            </Space>
        </Modal>
    );
}
