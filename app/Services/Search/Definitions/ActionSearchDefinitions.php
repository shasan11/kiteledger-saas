<?php

namespace App\Services\Search\Definitions;

class ActionSearchDefinitions
{
    public static function items(): array
    {
        return [
            ['module_key' => 'sales', 'module' => 'Sales / Payment In', 'title' => 'Create Invoice', 'url' => '/payment-in/invoices/add', 'keywords' => ['add invoice', 'new invoice'], 'permission' => 'sales.invoice.create', 'icon' => 'plus'],
            ['module_key' => 'sales', 'module' => 'Sales / Payment In', 'title' => 'Create Quotation', 'url' => '/payment-in/quotations/add', 'keywords' => ['new quote'], 'permission' => 'sales.quotation.create', 'icon' => 'plus'],
            ['module_key' => 'sales', 'module' => 'Sales / Payment In', 'title' => 'Create Sales Order', 'url' => '/payment-in/sales-orders/add', 'keywords' => ['new sales order'], 'permission' => 'sales.sales_order.create', 'icon' => 'plus'],
            ['module_key' => 'sales', 'module' => 'Sales / Payment In', 'title' => 'Create Payment In', 'url' => '/payment-in/payments/add', 'keywords' => ['receipt', 'customer payment'], 'permission' => 'sales.customer_payment.create', 'icon' => 'plus'],
            ['module_key' => 'sales', 'module' => 'Sales / Payment In', 'title' => 'Create Credit Note', 'url' => '/payment-in/credit-notes/add', 'keywords' => ['sales return'], 'permission' => 'sales.credit_note.create', 'icon' => 'plus'],
            ['module_key' => 'purchase', 'module' => 'Purchase / Payment Out', 'title' => 'Create Purchase Order', 'url' => '/payment-out/purchase-orders/add', 'keywords' => ['new po'], 'permission' => 'purchase.purchase_order.create', 'icon' => 'plus'],
            ['module_key' => 'purchase', 'module' => 'Purchase / Payment Out', 'title' => 'Create Purchase Bill', 'url' => '/payment-out/purchase-bills/add', 'keywords' => ['supplier bill'], 'permission' => 'purchase.purchase_bill.create', 'icon' => 'plus'],
            ['module_key' => 'purchase', 'module' => 'Purchase / Payment Out', 'title' => 'Create Supplier Payment', 'url' => '/payment-out/supplier-payments/add', 'keywords' => ['payment out'], 'permission' => 'purchase.supplier_payment.create', 'icon' => 'plus'],
            ['module_key' => 'purchase', 'module' => 'Purchase / Payment Out', 'title' => 'Create Expense', 'url' => '/payment-out/expenses/add', 'keywords' => ['new expense'], 'permission' => 'purchase.expense.create', 'icon' => 'plus'],
            ['module_key' => 'purchase', 'module' => 'Purchase / Payment Out', 'title' => 'Create Debit Note', 'url' => '/payment-out/debit-notes/add', 'keywords' => ['purchase return'], 'permission' => 'purchase.debit_note.create', 'icon' => 'plus'],
            ['module_key' => 'inventory', 'module' => 'Inventory / Warehouse', 'title' => 'Create Product', 'url' => '/inventory/products?create=1', 'keywords' => ['add product', 'new item'], 'permission' => 'inventory.product.create', 'icon' => 'plus'],
            ['module_key' => 'inventory', 'module' => 'Inventory / Warehouse', 'title' => 'Create Service', 'url' => '/inventory/services?create=1', 'keywords' => ['add service'], 'permission' => 'inventory.product.create', 'icon' => 'plus'],
            ['module_key' => 'inventory', 'module' => 'Inventory / Warehouse', 'title' => 'Create Inventory Adjustment', 'url' => '/inventory/adjustments/add', 'keywords' => ['stock adjustment'], 'permission' => 'inventory.adjustment.create', 'icon' => 'plus'],
            ['module_key' => 'inventory', 'module' => 'Inventory / Warehouse', 'title' => 'Create Warehouse Transfer', 'url' => '/inventory/warehouse-transfers/add', 'keywords' => ['stock transfer'], 'permission' => 'inventory.warehouse_transfer.create', 'icon' => 'plus'],
            ['module_key' => 'accounting', 'module' => 'Accounting', 'title' => 'Create Journal Voucher', 'url' => '/accounting/journal-vouchers/add', 'keywords' => ['journal entry'], 'permission' => 'accounting.journal_voucher.create', 'icon' => 'plus'],
            ['module_key' => 'accounting', 'module' => 'Accounting', 'title' => 'Create Cash Transfer', 'url' => '/accounting/cash-transfers/add', 'keywords' => ['cash transfer'], 'permission' => 'accounting.cash_transfer.create', 'icon' => 'plus'],
            ['module_key' => 'crm', 'module' => 'CRM', 'title' => 'Create Contact', 'url' => '/crm/contacts?create=1', 'keywords' => ['new customer', 'new supplier'], 'permission' => 'crm.contacts.create', 'icon' => 'plus'],
            ['module_key' => 'crm', 'module' => 'CRM', 'title' => 'Create Lead', 'url' => '/crm/leads?create=1', 'keywords' => ['new lead'], 'permission' => 'crm.lead.create', 'icon' => 'plus'],
            ['module_key' => 'crm', 'module' => 'CRM', 'title' => 'Create Deal', 'url' => '/crm/deals?create=1', 'keywords' => ['new deal'], 'permission' => 'crm.deal.create', 'icon' => 'plus'],
            ['module_key' => 'pos', 'module' => 'POS', 'title' => 'Open POS Screen', 'url' => '/pos/screen', 'keywords' => ['sell', 'checkout'], 'permission' => 'pos.sale.create', 'icon' => 'shop'],
            ['module_key' => 'settings', 'module' => 'Settings', 'title' => 'Create User', 'url' => '/settings?tab=users&create=1', 'keywords' => ['new user'], 'permission' => 'hrm.users.create', 'icon' => 'plus'],
            ['module_key' => 'settings', 'module' => 'Settings', 'title' => 'Create Role', 'url' => '/settings?tab=roles&create=1', 'keywords' => ['new role'], 'permission' => 'hrm.roles.create', 'icon' => 'plus'],
            ['module_key' => 'settings', 'module' => 'Settings', 'title' => 'Create Fiscal Year', 'url' => '/settings?tab=fiscal-years&create=1', 'keywords' => ['new financial year'], 'permission' => 'settings.fiscal-years.create', 'icon' => 'plus'],
            ['module_key' => 'tax', 'module' => 'Tax', 'title' => 'Create Tax Rate', 'url' => '/tax/tax-rates?create=1', 'keywords' => ['vat rate'], 'permission' => 'tax.tax-rates.create', 'icon' => 'plus'],
            ['module_key' => 'warehouse', 'module' => 'Inventory / Warehouse', 'title' => 'Create Warehouse', 'url' => '/warehouse?create=1', 'keywords' => ['new warehouse'], 'permission' => 'inventory.warehouse.create', 'icon' => 'plus'],
        ];
    }
}
