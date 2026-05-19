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
} from '@ant-design/icons';
import { Grid, Layout, theme } from 'antd';
import { useEffect, useMemo, useState } from 'react';

import AppNavbar from './partials/AppNavbar';
import AppSidebar from './partials/AppSidebar';

const { Content } = Layout;
const { useBreakpoint } = Grid;

export default function AuthenticatedLayout({ header, children }) {
    const page = usePage();
    const user = page.props.auth.user;
    const permissions = page.props.auth?.permissions || [];
    const branchContext = page.props.branchContext || {};
    const can = (permission) => permissions.includes(permission);
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

    const menuItems = useMemo(
        () => [
            {
                key: 'home',
                icon: <HomeOutlined />,
                label: 'Home',
                onClick: () => visit('dashboard', '/dashboard'),
            },
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
                          children: [
                              can('pos.terminal.view') && {
                                  key: 'pos-screen',
                                  label: 'Terminal Selection',
                                  onClick: () => visit('pos.index', '/pos'),
                              },
                              can('pos.sale.view') && {
                                  key: 'pos-sales',
                                  label: 'Sales',
                                  onClick: () =>
                                      visit('pos.sales.index', '/pos/sales'),
                              },
                              can('pos.shift.view') && {
                                  key: 'pos-shifts',
                                  label: 'Shifts',
                                  onClick: () =>
                                      visit('pos.shifts.index', '/pos/shifts'),
                              },
                              can('pos.terminal.view') && {
                                  key: 'pos-terminals',
                                  label: 'Terminals',
                                  onClick: () =>
                                      visit(
                                          'pos.terminals.index',
                                          '/pos/terminals',
                                      ),
                              },
                              can('pos.cash_movement.view') && {
                                  key: 'pos-cash-movements',
                                  label: 'Cash Movements',
                                  onClick: () =>
                                      visit(
                                          'pos.cash-movements.index',
                                          '/pos/cash-movements',
                                      ),
                              },
                              can('pos.return.view') && {
                                  key: 'pos-returns',
                                  label: 'Returns',
                                  onClick: () =>
                                      visit(
                                          'pos.returns.index',
                                          '/pos/returns',
                                      ),
                              },
                          ].filter(Boolean),
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
                        key: 'pi-bills',
                        label: 'Bills',
                        onClick: () =>
                            visit('payment-in.bills.index', '/payment-in/bills'),
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
                key: 'tax',
                icon: <ApartmentOutlined />,
                label: 'Tax',
                children: [
                    {
                        key: 'tax-dashboard',
                        label: 'Dashboard',
                        onClick: () => visit('tax.dashboard', '/tax/dashboard'),
                    },
                    {
                        key: 'tax-settings',
                        label: 'Tax Settings',
                        onClick: () => visit('tax.settings', '/tax/settings'),
                    },
                    {
                        key: 'tax-reports',
                        label: 'Tax Reports',
                        onClick: () => visit('reports.index', '/reports'),
                    },
                    ...(permissions.includes('tax.advanced.manage') || true
                        ? [
                              {
                                  key: 'tax-advanced',
                                  label: 'Advanced Setup',
                                  children: [
                                      {
                                          key: 'tax-advanced-hub',
                                          label: 'Advanced Overview',
                                          onClick: () =>
                                              visit('tax.advanced', '/tax/advanced'),
                                      },
                                      {
                                          key: 'tax-classes',
                                          label: 'Tax Groups',
                                          onClick: () =>
                                              visit(
                                                  'tax.tax-classes.index',
                                                  '/tax/tax-classes',
                                              ),
                                      },
                                      {
                                          key: 'tax-rates',
                                          label: 'Tax Rates',
                                          onClick: () =>
                                              visit(
                                                  'tax.tax-rates.index',
                                                  '/tax/tax-rates',
                                              ),
                                      },
                                      {
                                          key: 'tax-rules',
                                          label: 'When to Apply Tax',
                                          onClick: () =>
                                              visit(
                                                  'tax.tax-rules.index',
                                                  '/tax/tax-rules',
                                              ),
                                      },
                                      {
                                          key: 'tax-registrations',
                                          label: 'Tax Registrations',
                                          onClick: () =>
                                              visit(
                                                  'tax.tax-registrations.index',
                                                  '/tax/tax-registrations',
                                              ),
                                      },
                                      {
                                          key: 'tax-exemptions',
                                          label: 'Tax Free Reasons',
                                          onClick: () =>
                                              visit(
                                                  'tax.tax-exemptions.index',
                                                  '/tax/tax-exemptions',
                                              ),
                                      },
                                      {
                                          key: 'tax-jurisdictions',
                                          label: 'Where Tax Applies',
                                          onClick: () =>
                                              visit(
                                                  'tax.tax-jurisdictions.index',
                                                  '/tax/tax-jurisdictions',
                                              ),
                                      },
                                      {
                                          key: 'product-tax-categories',
                                          label: 'Product Tax Types',
                                          onClick: () =>
                                              visit(
                                                  'tax.product-tax-categories.index',
                                                  '/tax/product-tax-categories',
                                              ),
                                      },
                                  ],
                              },
                          ]
                        : []),
                ],
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
                label: 'Products and Services',
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
                        key: 'hrm-payslips',
                        label: 'Payslips',
                        onClick: () => visit('hrm.payslips.index', '/hrm/payslips'),
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
        ],
        [page.url, permissions],
    );

    const selectedKeys = useMemo(() => {
        if (isActive('/dashboard')) return ['home'];

        if (isActive('/pos/returns')) return ['pos-returns'];
        if (isActive('/pos/cash-movements')) return ['pos-cash-movements'];
        if (isActive('/pos/terminals')) return ['pos-terminals'];
        if (isActive('/pos/shifts')) return ['pos-shifts'];
        if (isActive('/pos/sales')) return ['pos-sales'];
        if (isActive('/pos')) return ['pos-screen'];

        if (page.url === '/crm') return ['leads'];
        if (isActive('/crm/contacts')) return ['contacts'];
        if (isActive('/crm/leads')) return ['leads'];
        if (isActive('/crm/deals')) return ['deals'];
        if (isActive('/crm/activity-inbox')) return ['activity-inbox'];
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

        if (isActive('/tax/dashboard')) return ['tax-dashboard'];
        if (isActive('/tax/settings')) return ['tax-settings'];
        if (isActive('/tax/advanced')) return ['tax-advanced-hub'];
        if (isActive('/tax/tax-classes')) return ['tax-classes'];
        if (isActive('/tax/tax-rates')) return ['tax-rates'];
        if (isActive('/tax/tax-rules')) return ['tax-rules'];
        if (isActive('/tax/tax-registrations')) return ['tax-registrations'];
        if (isActive('/tax/tax-exemptions')) return ['tax-exemptions'];
        if (isActive('/tax/tax-jurisdictions')) return ['tax-jurisdictions'];
        if (isActive('/tax/product-tax-categories')) return ['product-tax-categories'];

        if (isActive('/warehouse')) return ['warehouse'];
        if (isActive('/inventory/warehouse-items')) return ['inventory-warehouse-items'];
        if (isActive('/inventory/warehouse-transfers')) return ['inventory-warehouse-transfer'];
        if (isActive('/inventory/adjustments')) return ['inventory-adjustment'];

        if (isActive('/inventory/product-categories')) return ['inventory-product-categories'];
        if (isActive('/inventory/services')) return ['inventory-services'];
        if (isActive('/inventory/variant-products')) return ['inventory-variant-products'];
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
        if (isActive('/hrm/payslips')) return ['hrm-payslips'];
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
            return [{ value: 'all', label: 'All Branches' }, ...items];
        }

        return items;
    }, [branchContext]);

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
        <Layout style={{ minHeight: '100vh', background: colorBgLayout }}>
            <AppNavbar
                user={user}
                branch={branch}
                setBranch={setBranch}
                branchContext={branchContext}
                branchOptions={branchOptions}
                quickAddItems={quickAddItems}
                profileItems={profileItems}
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
        </Layout>
    );
}
