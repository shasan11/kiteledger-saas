import React from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout/index.jsx';
import { Head } from '@inertiajs/react';
import { Card, Tag, Typography } from 'antd';
import { PrinterOutlined } from '@ant-design/icons';
import SimpleSettingsCrud from '../SimpleSettingsCrud';

const { Text } = Typography;

const DOCUMENT_TYPE_OPTIONS = [
  { label: 'General', value: 'general' },

  // Sales
  { label: 'Quotation', value: 'quotation' },
  { label: 'Proforma Invoice', value: 'proforma_invoice' },
  { label: 'Sales Order', value: 'sales_order' },
  { label: 'Invoice', value: 'invoice' },
  { label: 'Sales Return', value: 'sales_return' },
  { label: 'Credit Note / Sales Return', value: 'credit_note' },
  { label: 'Customer Payment', value: 'customer_payment' },

  // Purchase
  { label: 'Purchase Order', value: 'purchase_order' },
  { label: 'Purchase Bill', value: 'purchase_bill' },
  { label: 'Debit Note', value: 'debit_note' },
  { label: 'Supplier Payment', value: 'supplier_payment' },

  // Other
  { label: 'Expense', value: 'expense' },
  { label: 'Journal Voucher', value: 'journal_voucher' },
  { label: 'Cash Transfer', value: 'cash_transfer' },
  { label: 'Cheque Register', value: 'cheque_register' },
  { label: 'Loan Account', value: 'loan_account' },
  { label: 'Loan Top Up', value: 'loan_topup' },
  { label: 'Loan Charge', value: 'loan_charge' },
  { label: 'Warehouse Transfer', value: 'warehouse_transfer' },
  { label: 'Inventory Adjustment', value: 'inventory_adjustment' },
  { label: 'Product', value: 'product' },
  { label: 'Contact', value: 'contact' },
  { label: 'Lead', value: 'lead' },
  { label: 'Deal', value: 'deal' },
  { label: 'Employee', value: 'employee' },
  { label: 'Attendance', value: 'attendance' },
  { label: 'Leave Application', value: 'leave_application' },
  { label: 'Payslip', value: 'payslip' },
  { label: 'Project', value: 'project' },
  { label: 'Task', value: 'task' },
];

const TEMPLATE_KEY_OPTIONS = [
  { label: 'General Default', value: 'general.default' },

  { label: 'Quotation Default', value: 'quotation.default' },
  { label: 'Proforma Invoice Default', value: 'proforma_invoice.default' },
  { label: 'Sales Order Default', value: 'sales_order.default' },
  { label: 'Invoice Default', value: 'invoice.default' },
  { label: 'Sales Return Default', value: 'sales_return.default' },
  { label: 'Credit Note Default', value: 'credit_note.default' },
  { label: 'Customer Payment Default', value: 'customer_payment.default' },

  { label: 'Purchase Order Default', value: 'purchase_order.default' },
  { label: 'Purchase Bill Default', value: 'purchase_bill.default' },
  { label: 'Debit Note Default', value: 'debit_note.default' },
  { label: 'Supplier Payment Default', value: 'supplier_payment.default' },

  { label: 'Expense Default', value: 'expense.default' },
  { label: 'Journal Voucher Default', value: 'journal_voucher.default' },
  { label: 'Cash Transfer Default', value: 'cash_transfer.default' },
  { label: 'Cheque Register Default', value: 'cheque_register.default' },
  { label: 'Loan Account Default', value: 'loan_account.default' },
  { label: 'Loan Top Up Default', value: 'loan_topup.default' },
  { label: 'Loan Charge Default', value: 'loan_charge.default' },
  { label: 'Warehouse Transfer Default', value: 'warehouse_transfer.default' },
  { label: 'Inventory Adjustment Default', value: 'inventory_adjustment.default' },
  { label: 'Product Default', value: 'product.default' },
  { label: 'Contact Default', value: 'contact.default' },
  { label: 'Lead Default', value: 'lead.default' },
  { label: 'Deal Default', value: 'deal.default' },
  { label: 'Employee Default', value: 'employee.default' },
  { label: 'Attendance Default', value: 'attendance.default' },
  { label: 'Leave Application Default', value: 'leave_application.default' },
  { label: 'Payslip Default', value: 'payslip.default' },
  { label: 'Project Default', value: 'project.default' },
  { label: 'Task Default', value: 'task.default' },
];

const DEFAULT_TEMPLATE_HTML = `
<div class="print-document">
  <div class="print-header">
    <div>
      <h1>{{document.title}}</h1>
      <p>{{document.number}}</p>
    </div>

    <div class="print-meta">
      <p><strong>Date:</strong> {{document.date}}</p>
      <p><strong>Status:</strong> {{document.status}}</p>
      <p><strong>Reference:</strong> {{document.reference}}</p>
    </div>
  </div>

  <div class="party-box">
    <h3>Party Details</h3>
    <p><strong>Name:</strong> {{party.name}}</p>
    <p><strong>Phone:</strong> {{party.phone}}</p>
    <p><strong>Email:</strong> {{party.email}}</p>
    <p><strong>Address:</strong> {{party.address}}</p>
  </div>

  <table class="print-table">
    <thead>
      <tr>
        <th style="width: 40px;">#</th>
        <th>Item</th>
        <th>Description</th>
        <th class="right">Qty</th>
        <th class="right">Rate</th>
        <th class="right">Tax</th>
        <th class="right">Total</th>
      </tr>
    </thead>

    <tbody>
      {{#lines}}
      <tr>
        <td>{{@index}}</td>
        <td>{{product_name}}</td>
        <td>{{description}}</td>
        <td class="right">{{qty}}</td>
        <td class="right">{{unit_price}}</td>
        <td class="right">{{tax_amount}}</td>
        <td class="right">{{line_total}}</td>
      </tr>
      {{/lines}}
    </tbody>
  </table>

  <div class="summary-box">
    <div>
      <span>Subtotal</span>
      <strong>{{totals.subtotal}}</strong>
    </div>
    <div>
      <span>Discount</span>
      <strong>{{totals.discount}}</strong>
    </div>
    <div>
      <span>Tax</span>
      <strong>{{totals.tax}}</strong>
    </div>
    <div class="grand-total">
      <span>Grand Total</span>
      <strong>{{totals.grand_total}}</strong>
    </div>
  </div>

  <div class="notes">
    <strong>Notes:</strong>
    <p>{{document.notes}}</p>
  </div>
</div>
`.trim();

const DEFAULT_TEMPLATE_CSS = `
.print-document {
  font-family: Arial, sans-serif;
  color: #111827;
  font-size: 12px;
  line-height: 1.45;
}

.print-header {
  display: flex;
  justify-content: space-between;
  gap: 24px;
  border-bottom: 2px solid #111827;
  padding-bottom: 14px;
  margin-bottom: 18px;
}

.print-header h1 {
  margin: 0;
  font-size: 26px;
  font-weight: 800;
  letter-spacing: 0.5px;
}

.print-header p {
  margin: 4px 0;
}

.print-meta {
  text-align: right;
}

.party-box {
  border: 1px solid #d1d5db;
  padding: 12px;
  margin-bottom: 18px;
  border-radius: 6px;
}

.party-box h3 {
  margin: 0 0 8px;
  font-size: 14px;
}

.party-box p {
  margin: 3px 0;
}

.print-table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 12px;
}

.print-table th,
.print-table td {
  border: 1px solid #d1d5db;
  padding: 8px;
  vertical-align: top;
}

.print-table th {
  background: #f3f4f6;
  font-weight: 700;
  text-align: left;
}

.right {
  text-align: right;
}

.summary-box {
  width: 280px;
  margin-left: auto;
  margin-top: 18px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  overflow: hidden;
}

.summary-box div {
  display: flex;
  justify-content: space-between;
  padding: 8px 10px;
  border-bottom: 1px solid #e5e7eb;
}

.summary-box div:last-child {
  border-bottom: 0;
}

.summary-box .grand-total {
  background: #f3f4f6;
  font-size: 14px;
}

.notes {
  margin-top: 24px;
  border-top: 1px solid #e5e7eb;
  padding-top: 12px;
}

.notes p {
  margin: 4px 0 0;
}

@media print {
  body {
    background: white;
  }

  .print-document {
    page-break-inside: avoid;
  }
}
`.trim();

export default function PrintingTemplates(props) {
  const columns = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
       
    },
     
  ];

  const fields = [
    {
      name: 'name',
      label: 'Name',
      readOnly:true,
      rules: [{ required: true, message: 'Name is required' }],
    },
     
    {
      name: 'template_html',
      label: 'Template HTML',
      type: 'richtext',
      rules: [{ required: true, message: 'Template HTML is required' }],
    },
  
  ];

  const initialValues = {
    name: '',
    document_type: 'general',
    template_key: 'general.default',
    is_default: false,
    active: true,
    is_system_generated: false,
    template_html: DEFAULT_TEMPLATE_HTML,
    template_css: DEFAULT_TEMPLATE_CSS,
  };

  return (
    <>
      <Head title="Printing Templates" />

      <div style={{ padding: 18 }}>
        <Card
          title={
            <>
              <PrinterOutlined /> Printing Templates
            </>
          }
          style={{ borderRadius: 8 }}
        >
          <SimpleSettingsCrud
            endpoint="/api/printing-templates"
            columns={columns}
            fields={fields}
            initialValues={initialValues}
            formMode="drawer"
            drawerWidth={1100}
          />
        </Card>
      </div>
    </>
  );
}
