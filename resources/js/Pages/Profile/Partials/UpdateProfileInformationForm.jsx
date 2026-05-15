import { Link, useForm } from '@inertiajs/react';
import {
    Alert,
    Avatar,
    Button,
    Col,
    Form,
    Input,
    Row,
    Space,
    Typography,
    Upload,
    message,
} from 'antd';
import {
    DeleteOutlined,
    MailOutlined,
    SaveOutlined,
    UploadOutlined,
    UserOutlined,
} from '@ant-design/icons';
import { useMemo, useState } from 'react';

const { Text } = Typography;

const fieldStatus = (errors, name) =>
    errors?.[name] ? { validateStatus: 'error', help: errors[name] } : {};

const initialsFor = (user) =>
    (user?.display_name || user?.name || user?.email || 'User')
        .split(' ')
        .map((part) => part?.[0])
        .filter(Boolean)
        .slice(0, 2)
        .join('')
        .toUpperCase();

export default function UpdateProfileInformation({
    user,
    employeeProfile,
    mustVerifyEmail,
    status,
}) {
    const [previewUrl, setPreviewUrl] = useState(user?.image_url || null);
    const [removeImage, setRemoveImage] = useState(false);

    const { data, setData, post, errors, processing, reset } = useForm({
        _method: 'patch',
        name: user?.name || '',
        email: user?.email || '',
        phone: user?.phone || '',
        street: user?.street || '',
        city: user?.city || '',
        state: user?.state || '',
        zip_code: user?.zip_code || '',
        country: user?.country || '',
        image: null,
        remove_image: false,
    });

    const address = useMemo(
        () =>
            [data.street, data.city, data.state, data.zip_code, data.country]
                .filter(Boolean)
                .join(', '),
        [data.street, data.city, data.state, data.zip_code, data.country],
    );

    const handleImage = (file) => {
        const allowed = ['image/jpeg', 'image/png', 'image/webp'];

        if (!allowed.includes(file.type)) {
            message.error('Upload a JPG, PNG, or WebP image.');
            return Upload.LIST_IGNORE;
        }

        if (file.size / 1024 / 1024 > 2) {
            message.error('Profile photo must be 2 MB or smaller.');
            return Upload.LIST_IGNORE;
        }

        setData('image', file);
        setData('remove_image', false);
        setRemoveImage(false);
        setPreviewUrl(URL.createObjectURL(file));

        return false;
    };

    const removeAvatar = () => {
        setData('image', null);
        setData('remove_image', true);
        setRemoveImage(true);
        setPreviewUrl(null);
    };

    const submit = () => {
        post(route('profile.update'), {
            forceFormData: true,
            preserveScroll: true,
            onSuccess: () => {
                message.success('Profile updated.');
                reset('image');
            },
            onError: () => message.error('Please review the highlighted fields.'),
        });
    };

    return (
        <Form layout="vertical" onFinish={submit} disabled={processing}>
            <div className="profile-form__avatar-row">
                <Avatar
                    size={82}
                    src={previewUrl}
                    icon={!previewUrl ? <UserOutlined /> : null}
                    className="profile-page__avatar"
                >
                    {!previewUrl ? initialsFor(user) : null}
                </Avatar>

                <div className="profile-form__avatar-copy">
                    <Space wrap>
                        <Upload
                            accept="image/jpeg,image/png,image/webp"
                            showUploadList={false}
                            beforeUpload={handleImage}
                        >
                            <Button icon={<UploadOutlined />}>
                                {previewUrl ? 'Change photo' : 'Upload photo'}
                            </Button>
                        </Upload>

                        {(previewUrl || user?.image_url) && !removeImage && (
                            <Button danger icon={<DeleteOutlined />} onClick={removeAvatar}>
                                Remove
                            </Button>
                        )}
                    </Space>
                    <Text type="secondary">
                        JPG, PNG, or WebP. Maximum file size is 2 MB.
                    </Text>
                    {errors.image && <Text type="danger">{errors.image}</Text>}
                </div>
            </div>

            {mustVerifyEmail && user?.email_verified_at === null && (
                <Alert
                    showIcon
                    type="warning"
                    style={{ marginBottom: 18 }}
                    message="Email verification pending"
                    description={
                        <Space direction="vertical" size={4}>
                            <span>Your email address is not verified yet.</span>
                            <Link href={route('verification.send')} method="post" as="button">
                                Resend verification email
                            </Link>
                            {status === 'verification-link-sent' && (
                                <Text type="success">
                                    A new verification link has been sent.
                                </Text>
                            )}
                        </Space>
                    }
                />
            )}

            <Row gutter={16}>
                <Col xs={24} md={12}>
                    <Form.Item
                        label="Full name"
                        required
                        {...fieldStatus(errors, 'name')}
                    >
                        <Input
                            prefix={<UserOutlined />}
                            value={data.name}
                            onChange={(event) => setData('name', event.target.value)}
                            autoComplete="name"
                            placeholder="Your full name"
                        />
                    </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                    <Form.Item
                        label="Email"
                        required
                        {...fieldStatus(errors, 'email')}
                    >
                        <Input
                            prefix={<MailOutlined />}
                            type="email"
                            value={data.email}
                            onChange={(event) => setData('email', event.target.value)}
                            autoComplete="username"
                            placeholder="name@company.com"
                        />
                    </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                    <Form.Item label="Phone" {...fieldStatus(errors, 'phone')}>
                        <Input
                            value={data.phone}
                            onChange={(event) => setData('phone', event.target.value)}
                            autoComplete="tel"
                            placeholder="Phone number"
                        />
                    </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                    <Form.Item label="Designation">
                        <Input
                            value={employeeProfile?.designation?.name || user?.role?.name || ''}
                            readOnly
                            placeholder="No designation assigned"
                        />
                    </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                    <Form.Item label="Department">
                        <Input
                            value={employeeProfile?.department?.name || user?.department?.name || ''}
                            readOnly
                            placeholder="No department assigned"
                        />
                    </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                    <Form.Item label="Branch">
                        <Input
                            value={employeeProfile?.branch?.name || user?.branch?.name || ''}
                            readOnly
                            placeholder="No branch assigned"
                        />
                    </Form.Item>
                </Col>
                <Col xs={24}>
                    <Form.Item label="Street address" {...fieldStatus(errors, 'street')}>
                        <Input
                            value={data.street}
                            onChange={(event) => setData('street', event.target.value)}
                            placeholder="Street address"
                        />
                    </Form.Item>
                </Col>
                <Col xs={24} sm={12} lg={6}>
                    <Form.Item label="City" {...fieldStatus(errors, 'city')}>
                        <Input value={data.city} onChange={(event) => setData('city', event.target.value)} />
                    </Form.Item>
                </Col>
                <Col xs={24} sm={12} lg={6}>
                    <Form.Item label="State" {...fieldStatus(errors, 'state')}>
                        <Input value={data.state} onChange={(event) => setData('state', event.target.value)} />
                    </Form.Item>
                </Col>
                <Col xs={24} sm={12} lg={6}>
                    <Form.Item label="Postal code" {...fieldStatus(errors, 'zip_code')}>
                        <Input value={data.zip_code} onChange={(event) => setData('zip_code', event.target.value)} />
                    </Form.Item>
                </Col>
                <Col xs={24} sm={12} lg={6}>
                    <Form.Item label="Country" {...fieldStatus(errors, 'country')}>
                        <Input value={data.country} onChange={(event) => setData('country', event.target.value)} />
                    </Form.Item>
                </Col>
            </Row>

            {!address && (
                <Alert
                    type="info"
                    showIcon
                    style={{ marginBottom: 18 }}
                    message="No address saved yet."
                />
            )}

            <Button
                type="primary"
                htmlType="submit"
                icon={<SaveOutlined />}
                loading={processing}
            >
                Save profile
            </Button>
        </Form>
    );
}
