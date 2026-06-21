import React from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout/index.jsx';
import { Head, router } from '@inertiajs/react';
import { Card, Button, Space, Divider, theme } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';

export default function TransactionFormShell({
    auth,
    title,
    headTitle,
    onBack,
    onCancel,
    onSubmit,
    submitting = false,
    submitLabel = 'Save',
    cancelLabel = 'Cancel',
    actions = null,
    children,
    footerExtra = null,
}) {
    const { token } = theme.useToken();
    const handleBack = onBack || (() => router.visit(window.history.length > 1 ? document.referrer || '/' : '/'));

    return (
        <AuthenticatedLayout user={auth?.user}>
            <Head title={headTitle || title} />
            <div style={{ padding: token.padding, background: token.colorBgLayout, minHeight: 'calc(100vh - 64px)' }}>
                <Card
                    bordered={false}
                    styles={{
                        body: { padding: token.padding },
                        header: { borderColor: token.colorBorderSecondary, background: token.colorBgContainer },
                    }}
                    title={
                        <Space>
                            <Button type="text" icon={<ArrowLeftOutlined />} onClick={handleBack} />
                            <span style={{ fontSize: 18, fontWeight: 600 }}>{title}</span>
                        </Space>
                    }
                    extra={
                        <Space>
                            {actions}
                            {onCancel && (
                                <Button onClick={onCancel} disabled={submitting}>
                                    {cancelLabel}
                                </Button>
                            )}
                            {onSubmit && (
                                <Button type="primary" loading={submitting} onClick={onSubmit}>
                                    {submitLabel}
                                </Button>
                            )}
                        </Space>
                    }
                >
                    {children}
                    {footerExtra && (
                        <>
                            <Divider style={{ margin: '16px 0' }} />
                            {footerExtra}
                        </>
                    )}
                </Card>
            </div>
        </AuthenticatedLayout>
    );
}

export function FormSection({ title, children, style }) {
    const { token } = theme.useToken();

    return (
        <div style={{ marginBottom: 16, ...style }}>
            {title && (
                <div style={{ fontSize: token.fontSizeSM, fontWeight: 600, color: token.colorTextSecondary, marginBottom: token.marginXS, textTransform: 'uppercase', letterSpacing: 0.4 }}>
                    {title}
                </div>
            )}
            {children}
        </div>
    );
}
