import { useForm } from '@inertiajs/react';
import { Alert, Button, Form, Input, Modal, Typography, message } from 'antd';
import { DeleteOutlined, ExclamationCircleOutlined, LockOutlined } from '@ant-design/icons';
import { useState } from 'react';

const { Paragraph, Text } = Typography;

export default function DeleteUserForm() {
    const [open, setOpen] = useState(false);

    const {
        data,
        setData,
        delete: destroy,
        processing,
        reset,
        errors,
        clearErrors,
    } = useForm({
        password: '',
    });

    const closeModal = () => {
        setOpen(false);
        clearErrors();
        reset();
    };

    const deleteUser = () => {
        destroy(route('profile.destroy'), {
            preserveScroll: true,
            onSuccess: closeModal,
            onError: () => message.error('Password confirmation failed.'),
            onFinish: () => reset('password'),
        });
    };

    return (
        <>
            <Alert
                showIcon
                type="warning"
                message="Delete account"
                description="This permanently deletes your user account. This action cannot be undone."
            />

            <div className="profile-danger__body">
                <Paragraph>
                    Before deleting your account, make sure any business-critical
                    ownership, approvals, or employee records have been reassigned by an administrator.
                </Paragraph>
                <Button danger icon={<DeleteOutlined />} onClick={() => setOpen(true)}>
                    Delete account
                </Button>
            </div>

            <Modal
                open={open}
                title="Confirm account deletion"
                onCancel={closeModal}
                okText="Delete account"
                okButtonProps={{ danger: true, loading: processing, icon: <DeleteOutlined /> }}
                onOk={deleteUser}
                destroyOnHidden
            >
                <Alert
                    showIcon
                    type="error"
                    icon={<ExclamationCircleOutlined />}
                    message="This is permanent"
                    description="Enter your password to confirm that you want to permanently delete your account."
                    style={{ marginBottom: 18 }}
                />

                <Form layout="vertical">
                    <Form.Item
                        label="Password"
                        required
                        validateStatus={errors.password ? 'error' : undefined}
                        help={errors.password}
                    >
                        <Input.Password
                            prefix={<LockOutlined />}
                            value={data.password}
                            onChange={(event) => setData('password', event.target.value)}
                            autoComplete="current-password"
                            placeholder="Confirm with your current password"
                        />
                    </Form.Item>
                </Form>

                <Text type="secondary">
                    The delete button stays behind this confirmation step to prevent accidental removal.
                </Text>
            </Modal>
        </>
    );
}
