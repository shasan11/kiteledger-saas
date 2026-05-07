import { router, usePage } from '@inertiajs/react';
import {
    ApartmentOutlined,
    AuditOutlined,
    BookOutlined,
    CalculatorOutlined,
    ContactsOutlined,
    CreditCardOutlined,
    FileTextOutlined,
    HomeOutlined,
    InboxOutlined,
    ProfileOutlined,
    ProjectOutlined,
    SettingOutlined,
    SwapOutlined,
    TeamOutlined,
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
                key: 'crm',
                icon: <ContactsOutlined />,
                label: 'CRM',
                children: [
                    {
                        key: 'contact-groups',
                        label: 'Contact Group',
                        onClick: () => visit('crm.contact-groups.index', '/crm/contact-groups'),
                    },
                    {
                        key: 'contacts',
                        label: 'Contacts',
                        onClick: () => visit('crm.contacts.index', '/crm/contacts'),
                    },
                    {
                        key: 'leads',
                        label: 'Leads',
                        onClick: () => visit('crm.leads.index', '/crm/leads'),
                    },
                    {
                        key: 'activities',
                        label: 'Activities',
                        onClick: () => visit('crm.activities.index', '/crm/activities'),
                    },
                ],
            },
            {
                key: 'sales',
                icon: <FileTextOutlined />,
                label: 'Receivables',
                children: [
                    { key: 'sales-quotations', label: 'Quotations', onClick: () => visit('sales.quotations.index', '/sales/quotations') },
                    { key: 'sales-sales-orders', label: 'Sales Orders', onClick: () => visit('sales.sales-orders.index', '/sales/sales-orders') },
                    { key: 'sales-proforma-invoices', label: 'Proforma Invoices', onClick: () => visit('sales.proforma-invoices.index', '/sales/proforma-invoices') },
                    { key: 'sales-invoices', label: 'Invoices', onClick: () => visit('sales.invoices.index', '/sales/invoices') },
                    { key: 'sales-customer-payments', label: 'Customer Payments', onClick: () => visit('sales.customer-payments.index', '/sales/customer-payments') },
                    { key: 'sales-sales-returns', label: 'Sales Returns', onClick: () => visit('sales.sales-returns.index', '/sales/sales-returns') },
                ],
            },
            {
                key: 'payment-in',
                icon: <CreditCardOutlined />,
                label: 'Payment In',
                children: [
                    { key: 'pi-quotations', label: 'Quotations', onClick: () => visit('payment-in.quotations.index', '/payment-in/quotations') },
                    { key: 'pi-bills', label: 'Bills', onClick: () => visit('payment-in.bills.index', '/payment-in/bills') },
                    { key: 'pi-proforma-invoices', label: 'Proforma Invoices', onClick: () => visit('payment-in.proforma-invoices.index', '/payment-in/proforma-invoices') },
                    { key: 'pi-sales-orders', label: 'Sales Order', onClick: () => visit('payment-in.sales-orders.index', '/payment-in/sales-orders') },
                    { key: 'pi-invoices', label: 'Invoices', onClick: () => visit('payment-in.invoices.index', '/payment-in/invoices') },
                    { key: 'pi-payment', label: 'Payment', onClick: () => visit('payment-in.payments.index', '/payment-in/payments') },
                    { key: 'pi-credit-notes', label: 'Credit Notes', onClick: () => visit('payment-in.credit-notes.index', '/payment-in/credit-notes') },
                    { key: 'pi-customers', label: 'Customer', onClick: () => visit('payment-in.customers.index', '/payment-in/customers') },
                ],
            },
            {
                key: 'payment-out',
                icon: <WalletOutlined />,
                label: 'Payables',
                children: [
                    { key: 'po-purchase-order', label: 'Purchase Order', onClick: () => visit('payment-out.purchase-orders.index', '/payment-out/purchase-orders') },
                    { key: 'po-purchase-bills', label: 'Bills', onClick: () => visit('payment-out.purchase-bills.index', '/payment-out/purchase-bills') },
                    { key: 'po-expenses', label: 'Expenses', onClick: () => visit('payment-out.expenses.index', '/payment-out/expenses') },
                    { key: 'po-debit-note', label: 'Debit Note', onClick: () => visit('payment-out.debit-notes.index', '/payment-out/debit-notes') },
                    { key: 'po-payment-out', label: 'Supplier Payments', onClick: () => visit('payment-out.payments.index', '/payment-out/payments') },
                ],
            },
            {
                key: 'accounting',
                icon: <CalculatorOutlined />,
                label: 'Accounting',
                children: [
                    { key: 'chart-of-accounts', label: 'Chart of Accounts', onClick: () => visit('accounting.chart-of-accounts.index', '/accounting/chart-of-accounts') },
                    { key: 'bank-accounts', label: 'Bank Accounts', onClick: () => visit('accounting.bank-accounts.index', '/accounting/bank-accounts') },
                    { key: 'cash-transfer', label: 'Cash Transfer', onClick: () => visit('accounting.cash-transfers.index', '/accounting/cash-transfers') },
                    { key: 'cheque-register', label: 'Cheque Register', onClick: () => visit('accounting.cheque-registers.index', '/accounting/cheque-registers') },
                    { key: 'journal-voucher', label: 'Journal Voucher', onClick: () => visit('accounting.journal-vouchers.index', '/accounting/journal-vouchers') },
                    { key: 'loan-accounts', label: 'Loan Accounts', onClick: () => visit('accounting.loan-accounts.index', '/accounting/loan-accounts') },
                ],
            },
            {
                key: 'tax',
                icon: <ApartmentOutlined />,
                label: 'Tax',
                children: [
                    { key: 'tax-classes', label: 'Tax Classes', onClick: () => visit('tax.tax-classes.index', '/tax/tax-classes') },
                    { key: 'tax-rates', label: 'Tax Rates', onClick: () => visit('tax.tax-rates.index', '/tax/tax-rates') },
                ],
            },
            {
                key: 'inventory',
                icon: <InboxOutlined />,
                label: 'Inventory',
                children: [
                    { key: 'inventory-product-categories', label: 'Product Category', onClick: () => visit('inventory.product-categories.index', '/inventory/product-categories') },
                    { key: 'inventory-products', label: 'Products', onClick: () => visit('inventory.products.index', '/inventory/products') },
                    { key: 'inventory-variant-attributes', label: 'Variant Attributes', onClick: () => visit('inventory.variant-attributes.index', '/inventory/variant-attributes') },
                    { key: 'inventory-unit-of-measurement', label: 'Unit of Measurement', onClick: () => visit('inventory.unit-of-measurements.index', '/inventory/unit-of-measurements') },
                    { key: 'warehouse', label: 'Warehouses', onClick: () => visit('warehouse.index', '/warehouse') },
                    { key: 'inventory-warehouse-transfer', label: 'Warehouse Transfer', onClick: () => visit('inventory.warehouse-transfers.index', '/inventory/warehouse-transfers') },
                    { key: 'inventory-adjustment', label: 'Inventory Adjustment', onClick: () => visit('inventory.adjustments.index', '/inventory/adjustments') },
                    { key: 'inventory-bill-of-materials', label: 'Bill of Materials', onClick: () => visit('inventory.bill-of-materials.index', '/inventory/bill-of-materials') },
                    { key: 'inventory-production-order', label: 'Production Order', onClick: () => visit('inventory.production-orders.index', '/inventory/production-orders') },
                    { key: 'inventory-production-journal', label: 'Production Journal', onClick: () => visit('inventory.production-journals.index', '/inventory/production-journals') },
                ],
            },
            {
                key: 'hrm',
                icon: <TeamOutlined />,
                label: 'HRM',
                children: [
                    { key: 'hrm-users',      label: 'Employees',           onClick: () => visit('hrm.users.index', '/hrm/users') },
                    { key: 'hrm-attendance', label: 'Attendance',          onClick: () => visit('hrm.attendance.index', '/hrm/attendance') },
                    { key: 'hrm-leaves',     label: 'Leave Applications',  onClick: () => visit('hrm.leave-applications.index', '/hrm/leave-applications') },
                    { key: 'hrm-payslips',   label: 'Payslips',            onClick: () => visit('hrm.payslips.index', '/hrm/payslips') },
                    { key: 'hrm-emp-docs',   label: 'Employee Documents',  onClick: () => visit('hrm.employee-documents.index', '/hrm/employee-documents') },
                    { key: 'hrm-onboarding', label: 'Onboarding',          onClick: () => visit('hrm.onboarding.index', '/hrm/onboarding') },
                    { key: 'hrm-departments',  label: 'Departments',         onClick: () => visit('hrm.departments.index', '/hrm/departments') },
                    { key: 'hrm-designations', label: 'Designations',        onClick: () => visit('hrm.designations.index', '/hrm/designations') },
                    { key: 'hrm-emp-statuses', label: 'Employment Statuses', onClick: () => visit('hrm.employment-statuses.index', '/hrm/employment-statuses') },
                    { key: 'hrm-leave-policies', label: 'Leave Policies',  onClick: () => visit('hrm.leave-policies.index', '/hrm/leave-policies') },
                    { key: 'hrm-shifts',       label: 'Shifts',             onClick: () => visit('hrm.shifts.index', '/hrm/shifts') },
                    { key: 'hrm-weekly-holidays', label: 'Weekly Holidays', onClick: () => visit('hrm.weekly-holidays.index', '/hrm/weekly-holidays') },
                    { key: 'hrm-public-holidays', label: 'Public Holidays', onClick: () => visit('hrm.public-holidays.index', '/hrm/public-holidays') },
                    { key: 'hrm-salary-hist',   label: 'Salary Histories',      onClick: () => visit('hrm.salary-histories.index', '/hrm/salary-histories') },
                    { key: 'hrm-desig-hist',    label: 'Designation Histories', onClick: () => visit('hrm.designation-histories.index', '/hrm/designation-histories') },
                    { key: 'hrm-award-hist',    label: 'Award Histories',       onClick: () => visit('hrm.award-histories.index', '/hrm/award-histories') },
                    { key: 'hrm-education',     label: 'Education',             onClick: () => visit('hrm.educations.index', '/hrm/educations') },
                    { key: 'hrm-awards',        label: 'Awards',                onClick: () => visit('hrm.awards.index', '/hrm/awards') },
                    { key: 'hrm-roles',         label: 'Roles',                 onClick: () => visit('hrm.roles.index', '/hrm/roles') },
                    { key: 'hrm-permissions',   label: 'Permissions',           onClick: () => visit('hrm.permissions.index', '/hrm/permissions') },
                ],
            },
            {
                key: 'project',
                icon: <ProjectOutlined />,
                label: 'Project',
                children: [
                    { key: 'hrm-projects-list', label: 'Projects', onClick: () => visit('hrm.projects.index', '/hrm/projects') },
                    { key: 'hrm-milestones', label: 'Milestones', onClick: () => visit('hrm.milestones.index', '/hrm/milestones') },
                    { key: 'hrm-tasks', label: 'Tasks', onClick: () => visit('hrm.tasks.index', '/hrm/tasks') },
                    { key: 'hrm-task-statuses', label: 'Task Statuses', onClick: () => visit('hrm.task-statuses.index', '/hrm/task-statuses') },
                ],
            },
            {
                key: 'reports',
                icon: <AuditOutlined />,
                label: 'Reports',
                onClick: () => visit('reports.index', '/reports'),
            },
            {
                key: 'settings',
                icon: <SettingOutlined />,
                label: 'Settings',
                children: [
                    { key: 'settings-dashboard', label: 'Application Settings', onClick: () => visit('settings.index', '/settings') },
                    { key: 'settings-users-permissions', label: 'Users and Permissions', onClick: () => visit('settings.roles.index', '/settings/roles') },
                    { key: 'settings-master-data', label: 'Master Data', onClick: () => visit('settings.master-data.index', '/settings/master-data') },
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

        if (isActive('/sales/quotations')) return ['sales-quotations'];
        if (isActive('/sales/sales-orders')) return ['sales-sales-orders'];
        if (isActive('/sales/proforma-invoices')) return ['sales-proforma-invoices'];
        if (isActive('/sales/invoices')) return ['sales-invoices'];
        if (isActive('/sales/customer-payments')) return ['sales-customer-payments'];
        if (isActive('/sales/sales-returns')) return ['sales-sales-returns'];

        if (isActive('/payment-in/quotations')) return ['pi-quotations'];
        if (isActive('/payment-in/bills')) return ['pi-bills'];
        if (isActive('/payment-in/proforma-invoices')) return ['pi-proforma-invoices'];
        if (isActive('/payment-in/sales-orders')) return ['pi-sales-orders'];
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
        if (isActive('/accounting/cheque-registers')) return ['cheque-register'];
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

        if (isActive('/human-resource/employees')) return ['human-resource-employees'];
        if (isActive('/human-resource/departments')) return ['human-resource-departments'];
        if (isActive('/human-resource/designations')) return ['human-resource-designations'];
        if (isActive('/human-resource/attendance')) return ['human-resource-attendance'];
        if (isActive('/human-resource/leaves')) return ['human-resource-leaves'];
        if (isActive('/human-resource/payroll')) return ['human-resource-payroll'];

        // HRM full module
        if (isActive('/hrm/users/'))                  return ['hrm-users']; // show pages
        if (isActive('/hrm/users'))                   return ['hrm-users'];
        if (isActive('/hrm/attendance'))              return ['hrm-attendance'];
        if (isActive('/hrm/leave-applications'))      return ['hrm-leaves'];
        if (isActive('/hrm/payslips'))                return ['hrm-payslips'];
        if (isActive('/hrm/employee-documents'))      return ['hrm-emp-docs'];
        if (isActive('/hrm/onboarding'))              return ['hrm-onboarding'];
        if (isActive('/hrm/departments'))             return ['hrm-departments'];
        if (isActive('/hrm/designations'))            return ['hrm-designations'];
        if (isActive('/hrm/employment-statuses'))     return ['hrm-emp-statuses'];
        if (isActive('/hrm/leave-policies'))          return ['hrm-leave-policies'];
        if (isActive('/hrm/weekly-holidays'))         return ['hrm-weekly-holidays'];
        if (isActive('/hrm/shifts'))                  return ['hrm-shifts'];
        if (isActive('/hrm/public-holidays'))         return ['hrm-public-holidays'];
        if (isActive('/hrm/awards'))                  return ['hrm-awards'];
        if (isActive('/hrm/priorities'))              return ['hrm-priorities'];
        if (isActive('/hrm/salary-histories'))        return ['hrm-salary-hist'];
        if (isActive('/hrm/designation-histories'))   return ['hrm-desig-hist'];
        if (isActive('/hrm/award-histories'))         return ['hrm-award-hist'];
        if (isActive('/hrm/educations'))              return ['hrm-education'];
        if (isActive('/hrm/roles'))                   return ['hrm-roles'];
        if (isActive('/hrm/permissions'))             return ['hrm-permissions'];
        if (isActive('/hrm/role-permissions'))        return ['hrm-role-perms'];
        if (isActive('/hrm/projects'))                return ['hrm-projects-list'];
        if (isActive('/hrm/milestones'))              return ['hrm-milestones'];
        if (isActive('/hrm/tasks'))                   return ['hrm-tasks'];
        if (isActive('/hrm/task-statuses'))           return ['hrm-task-statuses'];
        if (isActive('/hrm/assigned-tasks'))          return ['hrm-assigned-tasks'];
        if (isActive('/hrm/project-teams'))           return ['hrm-project-teams'];
        if (isActive('/hrm/project-team-members'))    return ['hrm-team-members'];
        if (isActive('/hrm/email-configs'))           return ['hrm-email-configs'];
        if (isActive('/hrm/emails'))                  return ['hrm-emails'];

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

        if (page.url === '/settings') return ['settings-dashboard'];
        if (isActive('/settings/company-profile')) return ['settings-company-profile'];
        if (isActive('/settings/localization')) return ['settings-localization'];
        if (isActive('/settings/branches')) return ['settings-branches'];
        if (isActive('/settings/users')) return ['settings-users-permissions'];
        if (isActive('/settings/roles')) return ['settings-users-permissions'];
        if (isActive('/settings/permissions')) return ['settings-users-permissions'];
        if (isActive('/settings/fiscal-years')) return ['settings-fiscal-years'];
        if (isActive('/settings/currencies')) return ['settings-currencies'];
        if (isActive('/settings/taxes')) return ['settings-taxes'];
        if (isActive('/settings/accounting-configuration')) return ['settings-accounting-config'];
        if (isActive('/settings/document-numberings')) return ['settings-document-numberings'];
        if (isActive('/settings/approval-workflows')) return ['settings-approval-workflows'];
        if (isActive('/settings/sales-configuration')) return ['settings-sales-config'];
        if (isActive('/settings/purchase-configuration')) return ['settings-purchase-config'];
        if (isActive('/settings/hrm-configuration')) return ['settings-hrm-config'];
        if (isActive('/settings/inventory-configuration')) return ['settings-inventory-config'];
        if (isActive('/settings/email-configuration')) return ['settings-email-config'];
        if (isActive('/settings/email-templates')) return ['settings-email-templates'];
        if (isActive('/settings/application-settings')) return ['settings-application-settings'];
        if (isActive('/settings/general-settings')) return ['settings-general-settings'];
        if (isActive('/settings/alert-types')) return ['settings-alert-types'];
        if (isActive('/settings/reporting-tags')) return ['settings-reporting-tags'];
        if (isActive('/settings/printing-templates')) return ['settings-printing-templates'];
        if (isActive('/settings/custom-templates')) return ['settings-custom-templates'];
        if (isActive('/settings/master-data')) return ['settings-master-data'];

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

            <Layout style={{ marginTop: 0 }}>
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
