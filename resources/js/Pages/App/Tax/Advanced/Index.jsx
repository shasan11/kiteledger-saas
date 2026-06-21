import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout/index.jsx';
import { Head, router } from '@inertiajs/react';
import {
    Alert,
    Button,
    Card,
    Col,
    Row,
    Space,
    Tag,
    Typography,
} from 'antd';
import {
    ApartmentOutlined,
    ArrowRightOutlined,
    BankOutlined,
    ExceptionOutlined,
    GlobalOutlined,
    GroupOutlined,
    PercentageOutlined,
    SafetyCertificateOutlined,
    TagsOutlined,
} from '@ant-design/icons';

const { Title, Text } = Typography;

const ADVANCED_PAGES = [
    {
        key: 'tax-classes',
        title: 'Tax Groups',
        description: 'Organise rates into groups (VAT, GST, Withholding).',
        icon: <GroupOutlined style={{ fontSize: 22 }} />,
        path: '/tax/tax-classes',
        badge: 'Tax Class',
    },
    {
        key: 'tax-rates',
        title: 'Tax Rates',
        description: 'Define exact rates and their calculation methods.',
        icon: <PercentageOutlined style={{ fontSize: 22 }} />,
        path: '/tax/tax-rates',
        badge: 'Tax Rate',
    },
    {
        key: 'tax-rules',
        title: 'When to Apply Tax',
        description: 'Rules that decide which rate to use and when.',
        icon: <ApartmentOutlined style={{ fontSize: 22 }} />,
        path: '/tax/tax-rules',
        badge: 'Tax Rule',
    },
    {
        key: 'tax-registrations',
        title: 'Tax Registrations',
        description: 'Store your VAT/GST/PAN registration numbers.',
        icon: <SafetyCertificateOutlined style={{ fontSize: 22 }} />,
        path: '/tax/tax-registrations',
        badge: 'Registration',
    },
    {
        key: 'tax-exemptions',
        title: 'Tax Free Reasons',
        description: 'Define why certain contacts or products are exempt.',
        icon: <ExceptionOutlined style={{ fontSize: 22 }} />,
        path: '/tax/tax-exemptions',
        badge: 'Exemption',
    },
    {
        key: 'tax-jurisdictions',
        title: 'Where Tax Applies',
        description: 'Country and region jurisdictions for your tax rules.',
        icon: <GlobalOutlined style={{ fontSize: 22 }} />,
        path: '/tax/tax-jurisdictions',
        badge: 'Jurisdiction',
    },
    {
        key: 'product-tax-categories',
        title: 'Product Tax Types',
        description: 'Map product categories to specific tax behaviour.',
        icon: <TagsOutlined style={{ fontSize: 22 }} />,
        path: '/tax/product-tax-categories',
        badge: 'Category',
    },
    {
        key: 'tax-systems',
        title: 'Tax Systems',
        description: 'Manage country tax systems (VAT, GST, Sales Tax, Withholding, etc.).',
        icon: <BankOutlined style={{ fontSize: 22 }} />,
        path: '/tax/tax-systems',
        badge: 'Tax System',
    },
];

export default function TaxAdvanced({ auth }) {
    return (
        <AuthenticatedLayout auth={auth}>
            <Head title="Advanced Tax Setup" />

            <div style={{ padding: '24px 24px 48px' }}>
                {/* Header */}
                <div style={{ marginBottom: 24 }}>
                    <Title level={4} style={{ margin: 0 }}>Advanced Tax Setup</Title>
                    <Text type="secondary">
                        Full control over tax classes, rates, rules, registrations, and exemptions.
                        Most businesses do not need to change these settings.
                    </Text>
                </div>

                <Alert
                    type="warning"
                    showIcon
                    style={{ marginBottom: 28 }}
                    message="Advanced area — proceed carefully"
                    description="Changes here affect how tax is calculated across all invoices and bills. If you are unsure, use Tax Settings instead."
                    action={
                        <Button size="small" onClick={() => router.visit('/tax/settings')}>
                            Back to Simple Settings
                        </Button>
                    }
                />

                <Row gutter={[16, 16]}>
                    {ADVANCED_PAGES.map((page) => (
                        <Col key={page.key} xs={24} sm={12} lg={8}>
                            <Card
                                hoverable
                                style={{ height: '100%' }}
                                onClick={() => router.visit(page.path)}
                            >
                                <Space align="start" size={14} style={{ width: '100%' }}>
                                    <div
                                        style={{
                                            width: 44,
                                            height: 44,
                                            borderRadius: 8,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            flexShrink: 0,
                                            background: 'var(--ant-color-fill-secondary)',
                                            color: 'var(--ant-color-primary)',
                                        }}
                                    >
                                        {page.icon}
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                                            <Text strong>{page.title}</Text>
                                            <Tag style={{ marginInlineEnd: 0 }}>{page.badge}</Tag>
                                        </div>
                                        <Text type="secondary" style={{ fontSize: 12 }}>{page.description}</Text>
                                    </div>
                                </Space>
                                <div style={{ textAlign: 'right', marginTop: 12 }}>
                                    <Button
                                        type="link"
                                        size="small"
                                        icon={<ArrowRightOutlined />}
                                        iconPosition="end"
                                        style={{ padding: 0 }}
                                    >
                                        Open
                                    </Button>
                                </div>
                            </Card>
                        </Col>
                    ))}
                </Row>
            </div>
        </AuthenticatedLayout>
    );
}
