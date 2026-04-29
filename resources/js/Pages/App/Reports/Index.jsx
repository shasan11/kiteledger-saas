import React, { useMemo, useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout/index.jsx';
import { Head, Link } from '@inertiajs/react';
import { Card, Col, Input, Row, Space, Typography } from 'antd';

import {
    MdOutlineAccountBalanceWallet,
    MdOutlineReceiptLong,
    MdOutlineInventory2,
    MdOutlineAnalytics,
} from 'react-icons/md';

import {
    FaHandHoldingUsd,
    FaMoneyBillWave,
    FaShoppingCart,
    FaFileInvoiceDollar,
} from 'react-icons/fa';

import {
    TbReportMoney,
    TbSettingsCog,
} from 'react-icons/tb';

const { Text, Title } = Typography;

const slugify = (text) =>
    String(text || '')
        .toLowerCase()
        .replace(/&/g, 'and')
        .replace(/[()]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');

const REPORT_GROUPS = [
    {
        title: 'Accounting',
        icon: MdOutlineAccountBalanceWallet,
        iconBg: '#dbeafe',
        iconColor: '#1677ff',
        reports: [
            'Transaction list',
            'Journal report',
            'General Ledger Summary',
            'Detail General Ledger',
            'GL Master Report',
            'Trial Balance',
            'Income Statement',
            'Balance Sheet',
            'Cash Flow Summary',
        ],
    },
    {
        title: 'Receivable',
        icon: FaHandHoldingUsd,
        iconBg: '#dcfce7',
        iconColor: '#16a34a',
        reports: [
            'Customer Receivable Summary',
            'Customer Ageing Summary',
            'Invoice Age',
            'Customer Statement',
        ],
    },
    {
        title: 'Payable',
        icon: FaMoneyBillWave,
        iconBg: '#ffedd5',
        iconColor: '#f97316',
        reports: [
            'Supplier Payable Summary',
            'Supplier Ageing Summary',
            'Purchase Bill Age',
            'Supplier Statement',
        ],
    },
    {
        title: 'Sales Report',
        icon: TbReportMoney,
        iconBg: '#dcfce7',
        iconColor: '#16a34a',
        reports: [
            'Sales By Customer',
            'Sales By Item',
            'Sales By Customer (Monthly)',
            'Sales By Item (Monthly)',
            'Sales Master Report',
            'Sales Summary Report',
        ],
    },
    {
        title: 'Purchase Report',
        icon: FaShoppingCart,
        iconBg: '#ffedd5',
        iconColor: '#f97316',
        reports: [
            'Purchase By Supplier',
            'Purchase By Item',
            'Purchase By Supplier (Monthly)',
            'Purchase By Item (Monthly)',
            'Purchase Master Report',
        ],
    },
    {
        title: 'Tax Report',
        icon: MdOutlineReceiptLong,
        iconBg: '#dcfce7',
        iconColor: '#22c55e',
        reports: [
            'Sales Register',
            'Sales Return Register',
            'Purchase Register',
            'Purchase Return Register',
            'VAT Summary Report',
            'TDS Report',
            'Annex 13 Report',
            'Annex 5 Materialised View Report',
        ],
    },
    {
        title: 'Inventory Report',
        icon: MdOutlineInventory2,
        iconBg: '#cffafe',
        iconColor: '#06b6d4',
        reports: [
            'Inventory Position',
            'Inventory Ageing',
            'Inventory Movement',
            'Inventory Ledger',
            'Product Profitability Report',
            'Inventory Master Report',
            'Production Summary Report',
            'Production Variance Report',
            'Production Planning Report',
        ],
    },
    {
        title: 'System Report',
        icon: TbSettingsCog,
        iconBg: '#ede9fe',
        iconColor: '#8b5cf6',
        reports: [
            'Activity Log',
            'User Log',
        ],
    },
    {
        title: 'Analytics Report',
        icon: MdOutlineAnalytics,
        iconBg: '#ede9fe',
        iconColor: '#8b5cf6',
        reports: [
            'Net Trading Assets',
            'Exceptional Report',
            'Ratio Analysis Report',
        ],
    },
];

export default function Index() {
    const [search, setSearch] = useState('');

    const filteredGroups = useMemo(() => {
        const q = search.trim().toLowerCase();

        if (!q) return REPORT_GROUPS;

        return REPORT_GROUPS
            .map((group) => ({
                ...group,
                reports: group.reports.filter((report) =>
                    `${group.title} ${report}`.toLowerCase().includes(q),
                ),
            }))
            .filter((group) => group.reports.length > 0);
    }, [search]);

    const reportHref = (groupTitle, reportTitle) => {
        return `/reports/${slugify(groupTitle)}/${slugify(reportTitle)}`;
    };

    return (
        <AuthenticatedLayout
            header={
                <h2 className="text-xl font-semibold leading-tight text-gray-800">
                    Reports
                </h2>
            }
        >
            <Head title="Reports" />

            <div
                style={{
                    padding: 20,
                    background: '#f8fafc',
                    minHeight: 'calc(100vh - 80px)',
                }}
            >
                <div
                    style={{
                        marginBottom: 22,
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: 16,
                    }}
                >
                    <div>
                        <Title level={3} style={{ margin: 0 }}>
                            Reports
                        </Title>
                        <Text type="secondary">
                            Accounting, receivable, payable, sales, purchase, tax, inventory and system reports
                        </Text>
                    </div>

                    <Input.Search
                        allowClear
                        placeholder="Search reports..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        style={{ width: 340 }}
                    />
                </div>

                <Row gutter={[22, 22]}>
                    {filteredGroups.map((group) => {
                        const Icon = group.icon;

                        return (
                            <Col xs={24} md={12} xl={8} key={group.title}>
                                <Card
                                    bordered={false}
                                    style={{
                                        minHeight: 280,
                                        borderRadius: 10,
                                        boxShadow: '0 8px 24px rgba(15, 23, 42, 0.06)',
                                    }}
                                    bodyStyle={{
                                        padding: 24,
                                    }}
                                >
                                    <Space align="center" size={14} style={{ marginBottom: 20 }}>
                                        <div
                                            style={{
                                                width: 38,
                                                height: 38,
                                                borderRadius: '50%',
                                                background: group.iconBg,
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                color: group.iconColor,
                                                fontSize: 20,
                                            }}
                                        >
                                            <Icon />
                                        </div>

                                        <Title
                                            level={4}
                                            style={{
                                                margin: 0,
                                                color: '#0039a6',
                                                fontWeight: 600,
                                            }}
                                        >
                                            {group.title}
                                        </Title>
                                    </Space>

                                    <div
                                        style={{
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: 13,
                                        }}
                                    >
                                        {group.reports.map((report) => (
                                            <Link
                                                key={report}
                                                href={reportHref(group.title, report)}
                                                style={{
                                                    color: '#0f172a',
                                                    fontSize: 14,
                                                    fontWeight: 500,
                                                    textDecoration: 'none',
                                                    lineHeight: 1.35,
                                                }}
                                                onMouseEnter={(e) => {
                                                    e.currentTarget.style.color = '#0039a6';
                                                    e.currentTarget.style.paddingLeft = '6px';
                                                }}
                                                onMouseLeave={(e) => {
                                                    e.currentTarget.style.color = '#0f172a';
                                                    e.currentTarget.style.paddingLeft = '0px';
                                                }}
                                            >
                                                {report}
                                            </Link>
                                        ))}
                                    </div>
                                </Card>
                            </Col>
                        );
                    })}
                </Row>
            </div>
        </AuthenticatedLayout>
    );
}