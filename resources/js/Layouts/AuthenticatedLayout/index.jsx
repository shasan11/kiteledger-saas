import { router, usePage } from '@inertiajs/react';
import {
    ApartmentOutlined,
    AuditOutlined,
    BankOutlined,
    BarChartOutlined,
    BookOutlined,
    CalculatorOutlined,
    ContactsOutlined,
    CreditCardOutlined,
    DashboardOutlined,
    DeploymentUnitOutlined,
    FileExcelOutlined,
    FileTextOutlined,
    HomeOutlined,
    InboxOutlined,
    ProfileOutlined,
    ProductOutlined,
    SafetyCertificateOutlined,
    SettingOutlined,
    ShopOutlined,
    ShoppingCartOutlined,
    SwapOutlined,
    TeamOutlined,
    ToolOutlined,
    UserOutlined,
    WalletOutlined,
} from '@ant-design/icons';
import { Layout, theme } from 'antd';
import { useMemo, useState } from 'react';

import AppNavbar from './partials/AppNavbar';
import AppSidebar from './partials/AppSidebar';

const { Content } = Layout;

export default function AuthenticatedLayout({ header, children }) {
    const page = usePage();
    const user = page.props.auth.user;

    const [collapsed, setCollapsed] = useState(false);
    const [branch, setBranch] = useState('main');

    const {
        token: { colorBgContainer, borderRadiusLG, colorBorderSecondary },
    } = theme.useToken();

    const hasRoute = (name) => {
        try {
            return typeof route === 'function' && route().has(name);
        } catch {
            return false;
        }
    };

    const getUrl = (routeName, fallback = '#') => {
        if (routeName && hasRoute(routeName)) {
            return route(routeName);
        }

        return fallback;
    };

    const visit = (routeName, fallback) => {
        const url = getUrl(routeName, fallback);

        if (url !== '#') {
            router.visit(url);
        }
    };

    const isActive = (path) => {
        if (!path || path === '#') return false;

        return page.url === path || page.url.startsWith(`${path}/`);
    };

    const menuItems = useMemo(
        () => [
            {
                key: 'home',
                icon: <HomeOutlined />,
                label: 'Home',
                onClick: () => visit('dashboard', '/dashboard'),
            },
            {
                key: 'pos',
                icon: <ShoppingCartOutlined />,
                label: 'POS',
                onClick: () => visit('pos.index', '/pos'),
            },
            {
                key: 'crm',
                icon: <ContactsOutlined />,
                label: 'CRM',
                children: [
                    {
                        key: 'contact-groups',
                        label: 'Contact Group',
                        onClick: () =>
                            visit(
                                'crm.contact-groups.index',
                                '/crm/contact-groups',
                            ),
                    },
                    {
                        key: 'contacts',
                        label: 'Contacts',
                        onClick: () =>
                            visit('crm.contacts.index', '/crm/contacts'),
                    },
                    {
                        key: 'deals',
                        label: 'Deals',
                        onClick: () =>
                            visit('crm.deals.index', '/crm/deals'),
                    },
                    {
                        key: 'projects',
                        label: 'Projects',
                        onClick: () =>
                            visit('crm.projects.index', '/crm/projects'),
                    },
                    {
                        key: 'activities',
                        label: 'Activities',
                        onClick: () =>
                            visit('crm.activities.index', '/crm/activities'),
                    },
                ],
            },
            {
                key: 'workflow',
                icon: <ApartmentOutlined />,
                label: 'Workflow',
                onClick: () => visit('workflow.index', '/workflow'),
            },
            {
                key: 'payment-in',
                icon: <CreditCardOutlined />,
                label: 'Payment In',
                children: [
                    {
                        key: 'pi-bills',
                        label: 'Bills',
                        onClick: () =>
                            visit(
                                'payment-in.bills.index',
                                '/payment-in/bills',
                            ),
                    },
                    {
                        key: 'pi-invoices',
                        label: 'Invoices',
                        onClick: () =>
                            visit(
                                'payment-in.invoices.index',
                                '/payment-in/invoices',
                            ),
                    },
                    {
                        key: 'pi-payment',
                        label: 'Payment',
                        onClick: () =>
                            visit(
                                'payment-in.payments.index',
                                '/payment-in/payments',
                            ),
                    },
                    {
                        key: 'pi-credit-notes',
                        label: 'Credit Notes',
                        onClick: () =>
                            visit(
                                'payment-in.credit-notes.index',
                                '/payment-in/credit-notes',
                            ),
                    },
                    {
                        key: 'pi-customers',
                        label: 'Customer',
                        onClick: () =>
                            visit(
                                'payment-in.customers.index',
                                '/payment-in/customers',
                            ),
                    },
                ],
            },
            {
                key: 'payment-out',
                icon: <WalletOutlined />,
                label: 'Payment Out',
                children: [
                    {
                        key: 'po-purchase-bills',
                        label: 'Purchase Bills',
                        onClick: () =>
                            visit(
                                'payment-out.purchase-bills.index',
                                '/payment-out/purchase-bills',
                            ),
                    },
                    {
                        key: 'po-payment-out',
                        label: 'Payment Out',
                        onClick: () =>
                            visit(
                                'payment-out.payments.index',
                                '/payment-out/payments',
                            ),
                    },
                    {
                        key: 'po-purchase-order',
                        label: 'Purchase Order',
                        onClick: () =>
                            visit(
                                'payment-out.purchase-orders.index',
                                '/payment-out/purchase-orders',
                            ),
                    },
                    {
                        key: 'po-expenses',
                        label: 'Expenses',
                        onClick: () =>
                            visit(
                                'payment-out.expenses.index',
                                '/payment-out/expenses',
                            ),
                    },
                    {
                        key: 'po-debit-note',
                        label: 'Debit Note',
                        onClick: () =>
                            visit(
                                'payment-out.debit-notes.index',
                                '/payment-out/debit-notes',
                            ),
                    },
                ],
            },
            {
                key: 'accounting',
                icon: <CalculatorOutlined />,
                label: 'Accounting',
                children: [
                    {
                        key: 'chart-of-accounts',
                        label: 'Chart of Accounts',
                        onClick: () =>
                            visit(
                                'accounting.chart-of-accounts.index',
                                '/accounting/chart-of-accounts',
                            ),
                    },
                    {
                        key: 'bank-accounts',
                        label: 'Bank Accounts',
                        onClick: () =>
                            visit(
                                'accounting.bank-accounts.index',
                                '/accounting/bank-accounts',
                            ),
                    },
                    {
                        key: 'cash-transfer',
                        label: 'Cash Transfer',
                        onClick: () =>
                            visit(
                                'accounting.cash-transfers.index',
                                '/accounting/cash-transfers',
                            ),
                    },
                    {
                        key: 'journal-voucher',
                        label: 'Journal Voucher',
                        onClick: () =>
                            visit(
                                'accounting.journal-vouchers.index',
                                '/accounting/journal-vouchers',
                            ),
                    },
                    {
                        key: 'quick-bill',
                        label: 'Quick Bill',
                        onClick: () =>
                            visit(
                                'accounting.quick-bills.index',
                                '/accounting/quick-bills',
                            ),
                    },
                    {
                        key: 'quick-receipt',
                        label: 'Quick Receipt',
                        onClick: () =>
                            visit(
                                'accounting.quick-receipts.index',
                                '/accounting/quick-receipts',
                            ),
                    },
                    {
                        key: 'fixed-asset',
                        label: 'Fixed Asset',
                        onClick: () =>
                            visit(
                                'accounting.fixed-assets.index',
                                '/accounting/fixed-assets',
                            ),
                    },
                    {
                        key: 'loan-accounts',
                        label: 'Loan Accounts',
                        onClick: () =>
                            visit(
                                'accounting.loan-accounts.index',
                                '/accounting/loan-accounts',
                            ),
                    },
                ],
            },
            {
                key: 'inventory',
                icon: <InboxOutlined />,
                label: 'Inventory',
                children: [
                    {
                        key: 'inventory-product-categories',
                        label: 'Product Category',
                        onClick: () =>
                            visit(
                                'inventory.product-categories.index',
                                '/inventory/product-categories',
                            ),
                    },
                    {
                        key: 'inventory-products',
                        label: 'Products',
                        onClick: () =>
                            visit(
                                'inventory.products.index',
                                '/inventory/products',
                            ),
                    },
                    {
                        key: 'inventory-variant-attributes',
                        label: 'Variant Attributes',
                        onClick: () =>
                            visit(
                                'inventory.variant-attributes.index',
                                '/inventory/variant-attributes',
                            ),
                    },
                    {
                        key: 'inventory-unit-of-measurement',
                        label: 'Unit of Measurement',
                        onClick: () =>
                            visit(
                                'inventory.unit-of-measurements.index',
                                '/inventory/unit-of-measurements',
                            ),
                    },
                    {
                        key: 'inventory-warehouse-transfer',
                        label: 'Warehouse Transfer',
                        onClick: () =>
                            visit(
                                'inventory.warehouse-transfers.index',
                                '/inventory/warehouse-transfers',
                            ),
                    },
                    {
                        key: 'inventory-adjustment',
                        label: 'Inventory Adjustment',
                        onClick: () =>
                            visit(
                                'inventory.adjustments.index',
                                '/inventory/adjustments',
                            ),
                    },
                    {
                        key: 'inventory-bill-of-materials',
                        label: 'Bill of Materials',
                        onClick: () =>
                            visit(
                                'inventory.bill-of-materials.index',
                                '/inventory/bill-of-materials',
                            ),
                    },
                    {
                        key: 'inventory-production-order',
                        label: 'Production Order',
                        onClick: () =>
                            visit(
                                'inventory.production-orders.index',
                                '/inventory/production-orders',
                            ),
                    },
                    {
                        key: 'inventory-production-journal',
                        label: 'Production Journal',
                        onClick: () =>
                            visit(
                                'inventory.production-journals.index',
                                '/inventory/production-journals',
                            ),
                    },
                ],
            },
            {
                key: 'warehouse',
                icon: <BankOutlined />,
                label: 'Warehouse',
                onClick: () => visit('warehouse.index', '/warehouse'),
            },
            {
                key: 'hrm',
                icon: <TeamOutlined />,
                label: 'HRM',
                children: [
                    {
                        key: 'hrm-employees',
                        label: 'Employees',
                        onClick: () =>
                            visit('hrm.employees.index', '/hrm/employees'),
                    },
                    {
                        key: 'hrm-departments',
                        label: 'Departments',
                        onClick: () =>
                            visit('hrm.departments.index', '/hrm/departments'),
                    },
                    {
                        key: 'hrm-designations',
                        label: 'Designations',
                        onClick: () =>
                            visit(
                                'hrm.designations.index',
                                '/hrm/designations',
                            ),
                    },
                    {
                        key: 'hrm-attendance',
                        label: 'Attendance',
                        onClick: () =>
                            visit('hrm.attendance.index', '/hrm/attendance'),
                    },
                    {
                        key: 'hrm-leaves',
                        label: 'Leaves',
                        onClick: () =>
                            visit('hrm.leaves.index', '/hrm/leaves'),
                    },
                    {
                        key: 'hrm-payroll',
                        label: 'Payroll',
                        onClick: () =>
                            visit('hrm.payroll.index', '/hrm/payroll'),
                    },
                ],
            },
            {
                key: 'reports',
                icon: <BarChartOutlined />,
                label: 'Reports',
                onClick: () => visit('reports.index', '/reports'),
            },
            {
                key: 'online-store',
                icon: <ShopOutlined />,
                label: 'Online Store',
                children: [
                    {
                        key: 'online-store-dashboard',
                        label: 'Store Dashboard',
                        onClick: () =>
                            visit(
                                'online-store.index',
                                '/online-store',
                            ),
                    },
                    {
                        key: 'online-store-products',
                        label: 'Store Products',
                        onClick: () =>
                            visit(
                                'online-store.products.index',
                                '/online-store/products',
                            ),
                    },
                    {
                        key: 'online-store-orders',
                        label: 'Store Orders',
                        onClick: () =>
                            visit(
                                'online-store.orders.index',
                                '/online-store/orders',
                            ),
                    },
                    {
                        key: 'online-store-customers',
                        label: 'Store Customers',
                        onClick: () =>
                            visit(
                                'online-store.customers.index',
                                '/online-store/customers',
                            ),
                    },
                    {
                        key: 'online-store-coupons',
                        label: 'Coupons',
                        onClick: () =>
                            visit(
                                'online-store.coupons.index',
                                '/online-store/coupons',
                            ),
                    },
                ],
            },
            {
                key: 'configurations',
                icon: <SettingOutlined />,
                label: 'Configurations',
                children: [
                    {
                        key: 'config-application',
                        icon: <ToolOutlined />,
                        label: 'Application',
                        onClick: () =>
                            visit(
                                'configurations.application.index',
                                '/configurations/application',
                            ),
                    },
                    {
                        key: 'config-users-permission',
                        icon: <SafetyCertificateOutlined />,
                        label: 'Users and Permission',
                        onClick: () =>
                            visit(
                                'configurations.users-permission.index',
                                '/configurations/users-permission',
                            ),
                    },
                    {
                        key: 'config-import-export',
                        icon: <FileExcelOutlined />,
                        label: 'Import/Export',
                        onClick: () =>
                            visit(
                                'configurations.import-export.index',
                                '/configurations/import-export',
                            ),
                    },
                    {
                        key: 'config-organization',
                        icon: <DeploymentUnitOutlined />,
                        label: 'Organization',
                        onClick: () =>
                            visit(
                                'configurations.organization.index',
                                '/configurations/organization',
                            ),
                    },
                    {
                        key: 'config-subscription',
                        icon: <CreditCardOutlined />,
                        label: 'Subscription',
                        onClick: () =>
                            visit(
                                'configurations.subscription.index',
                                '/configurations/subscription',
                            ),
                    },
                ],
            },
        ],
        [page.url],
    );

    const selectedKeys = useMemo(() => {
        if (isActive('/dashboard')) return ['home'];
        if (isActive('/pos')) return ['pos'];

        if (isActive('/crm/contact-groups')) return ['contact-groups'];
        if (isActive('/crm/contacts')) return ['contacts'];
        if (isActive('/crm/deals')) return ['deals'];
        if (isActive('/crm/campaigns')) return ['campaigns'];
        if (isActive('/crm/activities')) return ['activities'];

        if (isActive('/workflow')) return ['workflow'];

        if (isActive('/payment-in/bills')) return ['pi-bills'];
        if (isActive('/payment-in/invoices')) return ['pi-invoices'];
        if (isActive('/payment-in/payments')) return ['pi-payment'];
        if (isActive('/payment-in/credit-notes')) return ['pi-credit-notes'];
        if (isActive('/payment-in/customers')) return ['pi-customers'];

        if (isActive('/payment-out/purchase-bills')) return ['po-purchase-bills'];
        if (isActive('/payment-out/payments')) return ['po-payment-out'];
        if (isActive('/payment-out/purchase-orders')) return ['po-purchase-order'];
        if (isActive('/payment-out/expenses')) return ['po-expenses'];
        if (isActive('/payment-out/debit-notes')) return ['po-debit-note'];

        if (isActive('/accounting/chart-of-accounts')) return ['chart-of-accounts'];
        if (isActive('/accounting/bank-accounts')) return ['bank-accounts'];
        if (isActive('/accounting/cash-transfers')) return ['cash-transfer'];
        if (isActive('/accounting/journal-vouchers')) return ['journal-voucher'];
        if (isActive('/accounting/quick-bills')) return ['quick-bill'];
        if (isActive('/accounting/quick-receipts')) return ['quick-receipt'];
        if (isActive('/accounting/fixed-assets')) return ['fixed-asset'];
        if (isActive('/accounting/loan-accounts')) return ['loan-accounts'];

        if (isActive('/inventory/product-categories')) return ['inventory-product-categories'];
        if (isActive('/inventory/products')) return ['inventory-products'];
        if (isActive('/inventory/variant-attributes')) return ['inventory-variant-attributes'];
        if (isActive('/inventory/unit-of-measurements')) return ['inventory-unit-of-measurement'];
        if (isActive('/inventory/warehouse-transfers')) return ['inventory-warehouse-transfer'];
        if (isActive('/inventory/adjustments')) return ['inventory-adjustment'];
        if (isActive('/inventory/bill-of-materials')) return ['inventory-bill-of-materials'];
        if (isActive('/inventory/production-orders')) return ['inventory-production-order'];
        if (isActive('/inventory/production-journals')) return ['inventory-production-journal'];

        if (isActive('/warehouse')) return ['warehouse'];

        if (isActive('/hrm/employees')) return ['hrm-employees'];
        if (isActive('/hrm/departments')) return ['hrm-departments'];
        if (isActive('/hrm/designations')) return ['hrm-designations'];
        if (isActive('/hrm/attendance')) return ['hrm-attendance'];
        if (isActive('/hrm/leaves')) return ['hrm-leaves'];
        if (isActive('/hrm/payroll')) return ['hrm-payroll'];

        if (isActive('/reports')) return ['reports'];

        if (isActive('/online-store/products')) return ['online-store-products'];
        if (isActive('/online-store/orders')) return ['online-store-orders'];
        if (isActive('/online-store/customers')) return ['online-store-customers'];
        if (isActive('/online-store/coupons')) return ['online-store-coupons'];
        if (isActive('/online-store')) return ['online-store-dashboard'];

        if (isActive('/configurations/application')) return ['config-application'];
        if (isActive('/configurations/users-permission')) return ['config-users-permission'];
        if (isActive('/configurations/import-export')) return ['config-import-export'];
        if (isActive('/configurations/organization')) return ['config-organization'];
        if (isActive('/configurations/subscription')) return ['config-subscription'];

        return ['home'];
    }, [page.url]);

    const branchOptions = [
        {
            value: 'main',
            label: 'Main Branch',
        },
        {
            value: 'branch-1',
            label: 'Branch 1',
        },
        {
            value: 'branch-2',
            label: 'Branch 2',
        },
    ];

    const quickAddItems = [
        {
            key: 'invoice',
            icon: <FileTextOutlined />,
            label: 'New Invoice',
            onClick: () =>
                visit(
                    'payment-in.invoices.create',
                    '/payment-in/invoices/create',
                ),
        },
        {
            key: 'bill',
            icon: <BookOutlined />,
            label: 'New Purchase Bill',
            onClick: () =>
                visit(
                    'payment-out.purchase-bills.create',
                    '/payment-out/purchase-bills/create',
                ),
        },
        {
            key: 'receipt',
            icon: <AuditOutlined />,
            label: 'Quick Receipt',
            onClick: () =>
                visit(
                    'accounting.quick-receipts.create',
                    '/accounting/quick-receipts/create',
                ),
        },
        {
            key: 'transfer',
            icon: <SwapOutlined />,
            label: 'Cash Transfer',
            onClick: () =>
                visit(
                    'accounting.cash-transfers.create',
                    '/accounting/cash-transfers/create',
                ),
        },
        {
            key: 'contact',
            icon: <UserOutlined />,
            label: 'New Contact',
            onClick: () => visit('crm.contacts.create', '/crm/contacts/create'),
        },
    ];

    const profileItems = [
        {
            key: 'profile',
            icon: <ProfileOutlined />,
            label: 'Profile',
            onClick: () => visit('profile.edit', '/profile'),
        },
        {
            type: 'divider',
        },
        {
            key: 'logout',
            icon: <ProfileOutlined />,
            label: 'Log Out',
            danger: true,
            onClick: () => router.post(route('logout')),
        },
    ];

    return (
        <Layout style={{ minHeight: '100vh', background: '#f5f7fb' }}>
            <AppNavbar
                user={user}
                branch={branch}
                setBranch={setBranch}
                branchOptions={branchOptions}
                quickAddItems={quickAddItems}
                profileItems={profileItems}
                getUrl={getUrl}
                colorBgContainer={colorBgContainer}
                colorBorderSecondary={colorBorderSecondary}
            />

            <Layout>
                <AppSidebar
                    collapsed={collapsed}
                    setCollapsed={setCollapsed}
                    selectedKeys={selectedKeys}
                    menuItems={menuItems}
                    colorBgContainer={colorBgContainer}
                    colorBorderSecondary={colorBorderSecondary}
                />

                <Layout
                    style={{
                        
                        background: '#f5f7fb',
                    }}
                >
                    {header && (
                        <div
                            style={{
                                marginBottom: 14,
                                padding: '9px 18px',
                                background: colorBgContainer,
                               
                                border: `1px solid ${colorBorderSecondary}`,
                            }}
                        >
                            {header}
                        </div>
                    )}

                    <Content
                        style={{
                            minHeight: 'calc(100vh - 100px)',
                             
                            
                             
                        }}
                    >
                        {children}
                    </Content>
                </Layout>
            </Layout>
        </Layout>
    );
}