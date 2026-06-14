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
    ShopOutlined,
    SwapOutlined,
    TeamOutlined,
    UserOutlined,
    WalletOutlined,
    PlusOutlined,
} from '@ant-design/icons';
import { Button, Dropdown, Grid, Layout, theme } from 'antd';
import { useEffect, useMemo, useState } from 'react';

import AppNavbar from './partials/AppNavbar';
import AppSidebar from './partials/AppSidebar';
import { AppContextProvider } from '@/Contexts/AppContext';
import { useTrans } from '@/lib/i18n';

const { Content } = Layout;
const { useBreakpoint } = Grid;

export default function AuthenticatedLayout({ header, children }) {
    const t = useTrans();
    const page = usePage();
    const user = page.props.auth.user;
    const permissions = page.props.auth?.permissions || [];
    const canBypass = !!page.props?.auth?.canBypassPermissions;
    const branchContext = page.props.branchContext || {};
    const can = (permission) => canBypass || permissions.includes(permission);
    const screens = useBreakpoint();
    const isMobile = !screens.md;

    const [collapsed, setCollapsed] = useState(false);
    const [branch, setBranch] = useState(branchContext.selectedBranchId || null);

    useEffect(() => {
        if (branchContext.selectedBranchId) {
            setBranch((current) => current || branchContext.selectedBranchId);
        }
    }, [branchContext.selectedBranchId]);

    const {
        token: { colorBgContainer, colorBgLayout, colorBorderSecondary },
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

    const translateMenuItems = (items) =>
        items.map((item) => ({
            ...item,
            label: typeof item.label === 'string' ? t(item.label) : item.label,
            children: Array.isArray(item.children)
                ? translateMenuItems(item.children)
                : item.children,
        }));

    const menuItems = useMemo(
        () => translateMenuItems([
            {
                key: 'home',
                icon: <HomeOutlined />,
                label: 'Home',
                onClick: () => visit('dashboard', '/dashboard'),
            },
            ...(can('document_upload.view')
                ? [
                      {
                          key: 'ai-document-upload',
                          icon: <InboxOutlined />,
                          label: 'Documents',
                          onClick: () => visit('documents.upload.index', '/documents/upload'),
                      },
                  ]
                : []),
            ...([
                'pos.sale.create',
                'pos.sale.view',
                'pos.shift.view',
                'pos.terminal.view',
                'pos.cash_movement.view',
                'pos.return.view',
            ].some((permission) => can(permission))
                ? [
                      {
                          key: 'pos',
                          icon: <ShopOutlined />,
                          label: 'POS',
                          onClick: () => visit('pos.index', '/pos'),
                      },
                  ]
                : []),
            {
                key: 'crm',
                icon: <ContactsOutlined />,
                label: 'CRM',
                children: [
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
                        key: 'deals',
                        label: 'Deals',
                        onClick: () => visit('crm.deals.index', '/crm/deals'),
                    },
                    {
                        key: 'activity-inbox',
                        label: 'Activity Inbox',
                        onClick: () =>
                            visit(
                                'crm.activity-inbox.index',
                                '/crm/activity-inbox',
                            ),
                    },
                    {
                        key: 'activities',
                        label: 'Activities',
                        onClick: () =>
                            visit('crm.activities.index', '/crm/activities'),
                    },
                    {
                        key: 'campaigns',
                        label: 'Campaigns',
                        children: [
                            {
                                key: 'campaigns-all',
                                label: 'All Campaigns',
                                onClick: () =>
                                    visit('crm.campaigns.index', '/crm/campaigns'),
                            },
                            {
                                key: 'campaigns-email',
                                label: 'Email Messages',
                                onClick: () =>
                                    visit('crm.campaigns.index', '/crm/campaigns?tab=email'),
                            },
                            {
                                key: 'campaigns-sms',
                                label: 'SMS Messages',
                                onClick: () =>
                                    visit('crm.campaigns.index', '/crm/campaigns?tab=sms'),
                            },
                            {
                                key: 'campaigns-logs',
                                label: 'Send Logs',
                                onClick: () =>
                                    visit('crm.campaigns.index', '/crm/campaigns?tab=logs'),
                            },
                            {
                                key: 'campaigns-templates',
                                label: 'Templates',
                                onClick: () =>
                                    visit('crm.campaigns.index', '/crm/campaigns?tab=templates'),
                            },
                        ],
                    },
                    {
                        key: 'crm-tickets',
                        label: 'Tickets',
                        onClick: () => visit('crm.tickets.index', '/crm/tickets'),
                    },
                ],
            },
            {
                key: 'payment-in',
                icon: <CreditCardOutlined />,
                label: 'Payment In',
                children: [
                    {
                        key: 'pi-quotations',
                        label: 'Quotations',
                        onClick: () =>
                            visit(
                                'payment-in.quotations.index',
                                '/payment-in/quotations',
                            ),
                    },
                    {
                        key: 'pi-sales-orders',
                        label: 'Sales Order',
                        onClick: () =>
                            visit(
                                'payment-in.sales-orders.index',
                                '/payment-in/sales-orders',
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
                ],
            },
            {
                key: 'payment-out',
                icon: <WalletOutlined />,
                label: 'Payables',
                children: [
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
                        key: 'po-purchase-bills',
                        label: 'Purchase Bills',
                        onClick: () =>
                            visit(
                                'payment-out.purchase-bills.index',
                                '/payment-out/purchase-bills',
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
                    {
                        key: 'po-payment-out',
                        label: 'Supplier Payments',
                        onClick: () =>
                            visit(
                                'payment-out.payments.index',
                                '/payment-out/payments',
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
                        key: 'cheque-register',
                        label: 'Cheque Register',
                        onClick: () =>
                            visit(
                                'accounting.cheque-registers.index',
                                '/accounting/cheque-registers',
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
                key: 'tax-settings',
                icon: <ApartmentOutlined />,
                label: 'Tax Settings',
                onClick: () => visit('tax.settings', '/tax/settings'),
            },
            {
                key: 'inventory',
                icon: <InboxOutlined />,
                label: 'Inventory',
                children: [
                    {
                        key: 'warehouse',
                        label: 'Warehouses',
                        onClick: () => visit('warehouse.index', '/warehouse'),
                    },
                    {
                        key: 'inventory-warehouse-items',
                        label: 'Warehouse Stock',
                        onClick: () =>
                            visit(
                                'inventory.warehouse-items.index',
                                '/inventory/warehouse-items',
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
                ],
            },
            {
                key: 'products-services',
                icon: <ShopOutlined />,
                label: 'Products',
                children: [
                    {
                        key: 'inventory-product-categories',
                        label: 'Product Categories',
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
                        key: 'inventory-services',
                        label: 'Services',
                        onClick: () =>
                            visit(
                                'inventory.services.index',
                                '/inventory/services',
                            ),
                    },
                    {
                        key: 'inventory-variant-products',
                        label: 'Variant Products',
                        onClick: () =>
                            visit(
                                'inventory.variant-products.index',
                                '/inventory/variant-products',
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
                ],
            },
            {
                key: 'manufacturing',
                icon: <ApartmentOutlined />,
                label: 'Manufacturing',
                children: [
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
                key: 'hrm',
                icon: <TeamOutlined />,
                label: 'HRM',
                children: [
                    {
                        key: 'hrm-users',
                        label: 'Employees',
                        onClick: () => visit('hrm.users.index', '/hrm/users'),
                    },
                    {
                        key: 'hrm-attendance',
                        label: 'Attendance',
                        onClick: () =>
                            visit('hrm.attendance.index', '/hrm/attendance'),
                    },
                    {
                        key: 'hrm-leaves',
                        label: 'Leave Applications',
                        onClick: () =>
                            visit(
                                'hrm.leave-applications.index',
                                '/hrm/leave-applications',
                            ),
                    },
                    {
                        key: 'hrm-payroll',
                        label: 'Payroll',
                        onClick: () => visit('hrm.payroll.index', '/hrm/payroll'),
                    },
                    {
                        key: 'hrm-emp-docs',
                        label: 'Employee Documents',
                        onClick: () =>
                            visit(
                                'hrm.employee-documents.index',
                                '/hrm/employee-documents',
                            ),
                    },
                    {
                        key: 'hrm-onboarding',
                        label: 'Onboarding',
                        onClick: () =>
                            visit('hrm.onboarding.index', '/hrm/onboarding'),
                    },
                    {
                        key: 'hrm-histories',
                        label: 'Histories',
                        children: [
                            {
                                key: 'hrm-salary-hist',
                                label: 'Salary History',
                                onClick: () =>
                                    visit(
                                        'hrm.salary-histories.index',
                                        '/hrm/salary-histories',
                                    ),
                            },
                            {
                                key: 'hrm-desig-hist',
                                label: 'Designation History',
                                onClick: () =>
                                    visit(
                                        'hrm.designation-histories.index',
                                        '/hrm/designation-histories',
                                    ),
                            },
                            {
                                key: 'hrm-award-hist',
                                label: 'Award History',
                                onClick: () =>
                                    visit(
                                        'hrm.award-histories.index',
                                        '/hrm/award-histories',
                                    ),
                            },
                        ],
                    },
                ],
            },
            {
                key: 'project',
                icon: <ProjectOutlined />,
                label: 'Project',
                onClick: () => visit('hrm.projects.index', '/hrm/projects'),
            },
            ...([
                'reports.view',
                'reports.financial.view',
                'reports.sales.view',
                'reports.purchase.view',
                'reports.inventory.view',
                'reports.tax.view',
                'reports.hrm.view',
                'reports.system.view',
                'reports.analytics.view',
            ].some((permission) => permissions.includes(permission))
                ? [
                      {
                          key: 'reports',
                          icon: <AuditOutlined />,
                          label: 'Reports',
                          onClick: () => visit('reports.index', '/reports'),
                      },
                  ]
                : []),
            {
                key: 'settings',
                icon: <SettingOutlined />,
                label: 'Settings',
                onClick: () => visit('settings.index', '/settings'),
            },
        ]),
        [page.url, permissions, t],
    );

    const selectedKeys = useMemo(() => {
        if (isActive('/dashboard')) return ['home'];

        if (isActive('/documents/upload')) return ['ai-document-upload'];

        if (isActive('/pos')) return ['pos'];

        if (page.url === '/crm') return ['leads'];
        if (isActive('/crm/contacts')) return ['contacts'];
        if (isActive('/crm/leads')) return ['leads'];
        if (isActive('/crm/deals')) return ['deals'];
        if (isActive('/crm/activity-inbox')) return ['activity-inbox'];
        if (isActive('/crm/activities')) return ['activities'];
        if (isActive('/crm/campaigns')) return ['campaigns-all'];
        if (isActive('/crm/tickets') || isActive('/support/tickets')) return ['crm-tickets'];

        if (isActive('/workflow')) return ['workflow'];

        if (isActive('/sales/quotations')) return ['sales-quotations'];
        if (isActive('/sales/sales-orders')) return ['sales-sales-orders'];
        if (isActive('/sales/proforma-invoices')) return ['sales-proforma-invoices'];
        if (isActive('/sales/invoices')) return ['sales-invoices'];
        if (isActive('/sales/customer-payments')) return ['sales-customer-payments'];
        if (isActive('/sales/sales-returns')) return ['sales-sales-returns'];

        if (isActive('/payment-in/quotations')) return ['pi-quotations'];
        if (isActive('/payment-in/proforma-invoices')) return ['pi-proforma-invoices'];
        if (isActive('/payment-in/sales-orders')) return ['pi-sales-orders'];
        if (isActive('/payment-in/invoices')) return ['pi-invoices'];
        if (isActive('/payment-in/payments')) return ['pi-payment'];
        if (isActive('/payment-in/credit-notes')) return ['pi-credit-notes'];
        if (isActive('/payment-in/customers')) return ['pi-customers'];

        if (isActive('/payment-out/purchase-bills')) return ['po-purchase-bills'];
        if (isActive('/payment-out/payments')) return ['po-payment-out'];
        if (isActive('/payment-out/supplier-payments')) return ['po-payment-out'];
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

        if (isActive('/tax/settings')) return ['tax-settings'];

        if (isActive('/warehouse')) return ['warehouse'];
        if (isActive('/inventory/warehouse-items')) return ['inventory-warehouse-items'];
        if (isActive('/inventory/warehouse-transfers')) return ['inventory-warehouse-transfer'];
        if (isActive('/inventory/adjustments')) return ['inventory-adjustment'];

        if (isActive('/inventory/product-categories')) return ['inventory-product-categories'];
        if (isActive('/inventory/services')) return ['inventory-products'];
        if (isActive('/inventory/variant-products')) return ['inventory-products'];
        if (isActive('/inventory/products')) return ['inventory-products'];
        if (isActive('/inventory/variant-attributes')) return ['inventory-variant-attributes'];
        if (isActive('/inventory/unit-of-measurements')) return ['inventory-unit-of-measurement'];

        if (isActive('/inventory/bill-of-materials')) return ['inventory-bill-of-materials'];
        if (isActive('/inventory/production-orders')) return ['inventory-production-order'];
        if (isActive('/inventory/production-journals')) return ['inventory-production-journal'];

        if (isActive('/human-resource/employees')) return ['human-resource-employees'];
        if (isActive('/human-resource/departments')) return ['human-resource-departments'];
        if (isActive('/human-resource/designations')) return ['human-resource-designations'];
        if (isActive('/human-resource/attendance')) return ['human-resource-attendance'];
        if (isActive('/human-resource/leaves')) return ['human-resource-leaves'];
        if (isActive('/human-resource/payroll')) return ['human-resource-payroll'];

        if (isActive('/hrm/users/')) return ['hrm-users'];
        if (isActive('/hrm/users')) return ['hrm-users'];
        if (isActive('/hrm/attendance')) return ['hrm-attendance'];
        if (isActive('/hrm/leave-applications')) return ['hrm-leaves'];
        if (isActive('/hrm/payroll')) return ['hrm-payroll'];
        if (isActive('/hrm/employee-documents')) return ['hrm-emp-docs'];
        if (isActive('/hrm/onboarding')) return ['hrm-onboarding'];
        if (isActive('/hrm/departments')) return ['settings-hrm-setup'];
        if (isActive('/hrm/designations')) return ['settings-hrm-setup'];
        if (isActive('/hrm/employment-statuses')) return ['settings-hrm-setup'];
        if (isActive('/hrm/leave-policies')) return ['settings-hrm-setup'];
        if (isActive('/hrm/leave-types')) return ['settings-hrm-setup'];
        if (isActive('/hrm/weekly-holidays')) return ['settings-hrm-setup'];
        if (isActive('/hrm/shifts')) return ['settings-hrm-setup'];
        if (isActive('/hrm/public-holidays')) return ['settings-hrm-setup'];
        if (isActive('/hrm/awards')) return ['settings-hrm-setup'];
        if (isActive('/hrm/priorities')) return ['settings-hrm-setup'];
        if (isActive('/hrm/salary-histories')) return ['hrm-salary-hist'];
        if (isActive('/hrm/designation-histories')) return ['hrm-desig-hist'];
        if (isActive('/hrm/award-histories')) return ['hrm-award-hist'];
        if (isActive('/hrm/educations')) return ['settings-hrm-setup'];
        if (isActive('/hrm/roles')) return ['hrm-roles'];
        if (isActive('/hrm/permissions')) return ['hrm-permissions'];
        if (isActive('/hrm/role-permissions')) return ['hrm-role-perms'];
        if (isActive('/hrm/projects')) return ['hrm-projects-list'];
        if (isActive('/hrm/milestones')) return ['hrm-milestones'];
        if (isActive('/hrm/tasks')) return ['hrm-tasks'];
        if (isActive('/hrm/task-statuses')) return ['hrm-task-statuses'];
        if (isActive('/hrm/assigned-tasks')) return ['hrm-assigned-tasks'];
        if (isActive('/hrm/project-teams')) return ['hrm-project-teams'];
        if (isActive('/hrm/project-team-members')) return ['hrm-team-members'];
        if (isActive('/hrm/email-configs')) return ['hrm-email-configs'];
        if (isActive('/hrm/emails')) return ['hrm-emails'];

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

        if (page.url === '/settings?tab=hrm-setup') return ['settings-hrm-setup'];
        if (page.url === '/settings?tab=hrm-configuration') return ['settings-hrm-defaults'];
        if (page.url.startsWith('/settings')) return ['settings-dashboard'];
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
        if (isActive('/settings/sms-configuration')) return ['settings-sms-config'];
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

    const branchOptions = useMemo(() => {
        const items = Array.isArray(branchContext.branches)
            ? branchContext.branches.map((item) => ({
                  value: item.id,
                  label: item.name,
              }))
            : [];

        if (branchContext.canViewAllBranches) {
            return [{ value: 'all', label: t('All Branches') }, ...items];
        }

        return items;
    }, [branchContext, t]);

    const quickAction = (key, label, icon, routeName, fallback, permission = null) => {
        if (permission && !can(permission)) return null;

        return {
            key,
            icon,
            label: t(label),
            onClick: () => visit(routeName, fallback),
        };
    };

    const quickGroup = (key, label, children) => {
        const visibleChildren = children.filter(Boolean);

        if (!visibleChildren.length) return null;

        return { key, type: 'group', label: t(label), children: visibleChildren };
    };

    const quickAddItems = [
        quickGroup('quick-sales', 'Sales', [
            quickAction('invoice', 'Invoice', <FileTextOutlined />, 'payment-in.invoices.add', '/payment-in/invoices/add', 'sales.invoice.create'),
            quickAction('quotation', 'Quotation', <FileTextOutlined />, 'payment-in.quotations.add', '/payment-in/quotations/add', 'sales.quotation.create'),
            quickAction('sales-order', 'Sales Order', <ProfileOutlined />, 'payment-in.sales-orders.add', '/payment-in/sales-orders/add', 'sales.sales_order.create'),
            quickAction('payment-in', 'Payment In', <CreditCardOutlined />, 'payment-in.payments.add', '/payment-in/payments/add', 'sales.customer_payment.create'),
            quickAction('credit-note', 'Credit Note', <AuditOutlined />, 'payment-in.credit-notes.add', '/payment-in/credit-notes/add', 'sales.credit_note.create'),
        ]),
        quickGroup('quick-purchase', 'Purchase', [
            quickAction('purchase-bill', 'Purchase Bill', <BookOutlined />, 'payment-out.purchase-bills.add', '/payment-out/purchase-bills/add', 'purchase.purchase_bill.create'),
            quickAction('purchase-order', 'Purchase Order', <InboxOutlined />, 'payment-out.purchase-orders.add', '/payment-out/purchase-orders/add', 'purchase.purchase_order.create'),
            quickAction('supplier-payment', 'Supplier Payment', <WalletOutlined />, 'payment-out.supplier-payments.add', '/payment-out/supplier-payments/add', 'purchase.supplier_payment.create'),
            quickAction('expense', 'Expense', <AuditOutlined />, 'payment-out.expenses.add', '/payment-out/expenses/add', 'purchase.expense.create'),
            quickAction('debit-note', 'Debit Note', <SwapOutlined />, 'payment-out.debit-notes.add', '/payment-out/debit-notes/add', 'purchase.debit_note.create'),
        ]),
        quickGroup('quick-accounting', 'Accounting', [
            quickAction('journal-voucher', 'Journal Voucher', <CalculatorOutlined />, 'accounting.journal-vouchers.add', '/accounting/journal-vouchers/add', 'accounting.journal_voucher.create'),
            quickAction('cash-transfer', 'Cash Transfer', <SwapOutlined />, 'accounting.cash-transfers.add', '/accounting/cash-transfers/add', 'accounting.cash_transfer.create'),
            quickAction('chart-account', 'Chart Account', <BookOutlined />, null, '/accounting/chart-of-accounts?create=1', 'accounting.chart_of_account.create'),
        ]),
        quickGroup('quick-records', 'Records', [
            quickAction('contact', 'Contact', <UserOutlined />, null, '/crm/contacts?create=1', 'crm.contacts.create'),
            quickAction('lead', 'Lead', <ContactsOutlined />, null, '/crm/leads?create=1', 'crm.lead.create'),
            quickAction('deal', 'Deal', <ProjectOutlined />, null, '/crm/deals?create=1', 'crm.deal.create'),
            quickAction('product', 'Product', <ShopOutlined />, null, '/inventory/products?create=1', 'inventory.product.create'),
            quickAction('service', 'Service', <ProfileOutlined />, null, '/inventory/services?create=1', 'inventory.product.create'),
            quickAction('warehouse', 'Warehouse', <InboxOutlined />, null, '/warehouse?create=1', 'inventory.warehouse.create'),
        ]),
    ].filter(Boolean);

    const profileItems = [
        {
            key: 'profile',
            icon: <ProfileOutlined />,
            label: t('Profile'),
            onClick: () => visit('profile.edit', '/profile'),
        },
        {
            type: 'divider',
        },
        {
            key: 'logout',
            icon: <ProfileOutlined />,
            label: t('Log Out'),
            danger: true,
            onClick: () => router.post(route('logout')),
        },
    ];

    return (
        <AppContextProvider initialContext={branchContext}>
        <Layout style={{ minHeight: '100vh', background: colorBgLayout }}>
            <AppNavbar
                branchContext={branchContext}
                quickAddItems={quickAddItems}
                getUrl={getUrl}
                onSidebarToggle={() => setCollapsed((current) => !current)}
                colorBgContainer={colorBgContainer}
                colorBorderSecondary={colorBorderSecondary}
            />

            <Layout style={{ marginTop: 0, background: colorBgLayout }}>
                <AppSidebar
                    collapsed={collapsed}
                    setCollapsed={setCollapsed}
                    selectedKeys={selectedKeys}
                    menuItems={menuItems}
                    user={user}
                    profileItems={profileItems}
                    colorBgContainer={colorBgContainer}
                    colorBorderSecondary={colorBorderSecondary}
                />

                <Layout
                    style={{
                        background: colorBgLayout,
                        minWidth: 0,
                        width: isMobile ? '100%' : undefined,
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
                            minWidth: 0,
                        }}
                    >
                        {children}
                    </Content>
                </Layout>
            </Layout>

            {quickAddItems.length > 0 && (
                <Dropdown
                    menu={{ items: quickAddItems }}
                    placement="topRight"
                    trigger={['click']}
                    overlayClassName="app-floating-quick-add-menu"
                >
                    <Button
                        type="primary"
                        shape="circle"
                        size="large"
                        icon={<PlusOutlined />}
                        title={t('Quick Add')}
                        aria-label={t('Quick Add')}
                        className="app-floating-quick-add"
                    />
                </Dropdown>
            )}

            <style>
                {`
                    .app-floating-quick-add {
                        position: fixed !important;
                        right: ${isMobile ? '18px' : '28px'};
                        bottom: ${isMobile ? '18px' : '28px'};
                        width: ${isMobile ? '52px' : '56px'} !important;
                        height: ${isMobile ? '52px' : '56px'} !important;
                        z-index: 150;
                        box-shadow: 0 16px 38px rgba(15, 23, 42, 0.24) !important;
                        display: inline-flex !important;
                        align-items: center;
                        justify-content: center;
                    }

                    .app-floating-quick-add .anticon {
                        font-size: 20px;
                    }
                `}
            </style>
        </Layout>
        </AppContextProvider>
    );
}
