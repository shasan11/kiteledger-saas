import { useForm } from '@inertiajs/react';
import { Button, Form, Input, Progress, Space, Typography, message } from 'antd';
import { LockOutlined, SaveOutlined } from '@ant-design/icons';
import { useMemo } from 'react';

const { Text } = Typography;

const fieldStatus = (errors, name) =>
    errors?.[name] ? { validateStatus: 'error', help: errors[name] } : {};

const passwordScore = (value = '') => {
    let score = 0;
    if (value.length >= 8) score += 25;
    if (/[A-Z]/.test(value)) score += 25;
    if (/[0-9]/.test(value)) score += 25;
    if (/[^A-Za-z0-9]/.test(value)) score += 25;
    return score;
};

export default function UpdatePasswordForm() {
    const {
        data,
        setData,
        errors,
        put,
        reset,
        processing,
    } = useForm({
        current_password: '',
        password: '',
        password_confirmation: '',
    });

    const strength = useMemo(() => passwordScore(data.password), [data.password]);
    const strengthStatus = strength < 50 ? 'exception' : strength < 75 ? 'normal' : 'success';

    const updatePassword = () => {
        put(route('password.update'), {
            preserveScroll: true,
            onSuccess: () => {
                reset();
                message.success('Password updated.');
            },
            onError: () => message.error('Unable to update password.'),
        });
    };

    return (
        <Form layout="vertical" onFinish={updatePassword} disabled={processing}>
            <Form.Item
                label="Current password"
                required
                {...fieldStatus(errors, 'current_password')}
            >
                <Input.Password
                    prefix={<LockOutlined />}
                    value={data.current_password}
                    onChange={(event) => setData('current_password', event.target.value)}
                    autoComplete="current-password"
                />
            </Form.Item>

            <Form.Item label="New password" required {...fieldStatus(errors, 'password')}>
                <Input.Password
                    prefix={<LockOutlined />}
                    value={data.password}
                    onChange={(event) => setData('password', event.target.value)}
                    autoComplete="new-password"
                />
            </Form.Item>

            <div className="profile-security__strength">
                <Progress
                    percent={strength}
                    size="small"
                    status={strengthStatus}
                    showInfo={false}
                />
                <Text type="secondary">
                    Use at least 8 characters with uppercase letters, numbers, and a symbol.
                </Text>
            </div>

            <Form.Item
                label="Confirm password"
                required
                {...fieldStatus(errors, 'password_confirmation')}
            >
                <Input.Password
                    prefix={<LockOutlined />}
                    value={data.password_confirmation}
                    onChange={(event) => setData('password_confirmation', event.target.value)}
                    autoComplete="new-password"
                />
            </Form.Item>

            <Space>
                <Button
                    type="primary"
                    htmlType="submit"
                    icon={<SaveOutlined />}
                    loading={processing}
                >
                    Update password
                </Button>
            </Space>
        </Form>
    );
}
