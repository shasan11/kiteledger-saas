import { Alert, Descriptions, Form, Input, InputNumber, Modal, Space, theme, Typography } from 'antd';
import { ExclamationCircleOutlined } from '@ant-design/icons';
import { money } from '@/Pages/App/Pos/Shared/posHelpers';

const { Text } = Typography;

export default function CloseShiftModal({ open, shift, loading, onCancel, onSubmit }) {
    const { token } = theme.useToken();
    const [form] = Form.useForm();
    const expectedCash = Number(shift?.expected_cash || 0);

    return (
        <Modal
            title="Close Shift"
            open={open}
            onCancel={() => {
                form.resetFields();
                onCancel?.();
            }}
            onOk={() => form.submit()}
            okText="Close Shift"
            okButtonProps={{ danger: true }}
            confirmLoading={loading}
            destroyOnClose
            width={620}
        >
            <Space direction="vertical" size={token.margin} style={{ width: '100%' }}>
                <Alert
                    showIcon
                    icon={<ExclamationCircleOutlined />}
                    type="warning"
                    message="Confirm the counted drawer cash before ending this shift."
                />

                <Descriptions
                    size="small"
                    column={1}
                    bordered
                    items={[
                        { key: 'expected', label: 'Expected Cash', children: <Text strong>Rs. {money(expectedCash)}</Text> },
                        { key: 'cash_sales', label: 'Cash Sales', children: `Rs. ${money(shift?.total_cash_sales ?? shift?.cash_sales)}` },
                        { key: 'card_sales', label: 'Card Sales', children: `Rs. ${money(shift?.total_card_sales ?? shift?.card_sales)}` },
                        { key: 'online_sales', label: 'Online Sales', children: `Rs. ${money(shift?.total_online_sales ?? shift?.online_sales)}` },
                        { key: 'movements', label: 'Cash Movements / Expenses', children: `Rs. ${money(shift?.total_expenses)}` },
                        { key: 'refunds', label: 'Refunds', children: `Rs. ${money(shift?.total_refunds)}` },
                        { key: 'total', label: 'Total Sales', children: `Rs. ${money(shift?.total_sales)}` },
                    ]}
                />

                <Form
                    form={form}
                    layout="vertical"
                    initialValues={{ counted_cash: expectedCash, closing_notes: '' }}
                    onFinish={(values) => onSubmit?.(values, form)}
                >
                    <Form.Item
                        name="counted_cash"
                        label="Counted Cash"
                        rules={[
                            { required: true, message: 'Counted cash is required.' },
                            { type: 'number', min: 0, message: 'Counted cash cannot be negative.' },
                        ]}
                    >
                        <InputNumber style={{ width: '100%' }} min={0} prefix="Rs." placeholder="0.00" />
                    </Form.Item>

                    <Form.Item shouldUpdate noStyle>
                        {({ getFieldValue }) => {
                            const difference = Number((Number(getFieldValue('counted_cash') || 0) - expectedCash).toFixed(2));

                            return (
                                <Alert
                                    type={Math.abs(difference) < 0.01 ? 'success' : 'warning'}
                                    showIcon
                                    message={`Cash difference: Rs. ${money(difference)}`}
                                    style={{ marginBottom: token.marginSM }}
                                />
                            );
                        }}
                    </Form.Item>

                    <Form.Item name="closing_notes" label="Closing Note">
                        <Input.TextArea rows={3} placeholder="Required when cash difference is not zero" />
                    </Form.Item>
                </Form>
            </Space>
        </Modal>
    );
}
