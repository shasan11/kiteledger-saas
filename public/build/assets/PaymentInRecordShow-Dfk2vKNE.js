import{i as e}from"./rolldown-runtime-aKtaBQYM.js";import{t}from"./axios-BQPRRFHk.js";import{i as n,n as r,t as i}from"./index.esm-CtIVDvdE.js";import{r as a,t as o}from"./jsx-runtime-RbF_zoRI.js";import{g as s}from"./useSize-Ua8SufHv.js";import{t as c}from"./table-sosYro0l.js";import{t as l}from"./alert-BMEt18v7.js";import{n as u,t as d}from"./typography-BlWmaYWr.js";import{t as f}from"./skeleton-DlRG_YHH.js";import{t as p}from"./empty-41qDbwiS.js";import{t as m}from"./tooltip-DRvKpi-S.js";import{t as h}from"./badge-BxdJm1vY.js";import{t as g}from"./button-ZrI-T1CS.js";import{t as _}from"./dayjs.min-BRtZKQ04.js";import{t as v}from"./card-C0Xr1RgP.js";import{t as y}from"./space-BXAcXX1Q.js";import{t as b}from"./CalendarOutlined-DUSBWepV.js";import{t as x}from"./descriptions-ccrgriAr.js";import{t as ee}from"./drawer-CW-x5V59.js";import{t as te}from"./FileTextOutlined-B6ownMO3.js";import{t as S}from"./input-7h35vTt9.js";import{t as C}from"./message-BtrxVWbG.js";import{t as ne}from"./popconfirm-DVR9e95k.js";import{t as re}from"./ReloadOutlined-CMtviqc6.js";import{t as w}from"./tag-5JFZRmzJ.js";import{t as ie}from"./EditOutlined-DDNyn6SO.js";import{l as ae}from"./app-JQ4Gltw7.js";import{t as oe}from"./AuthenticatedLayout-Du7aKfRk.js";import{t as se}from"./ArrowLeftOutlined-CzB-XQhI.js";import{t as T}from"./ArrowRightOutlined-BoA64VOv.js";import{t as E}from"./CheckCircleOutlined-B_TrR1yt.js";import{t as D}from"./DollarCircleOutlined-LKHj83hf.js";import{t as ce}from"./ExclamationCircleOutlined-mfLkUCcO.js";import{t as le}from"./ExportOutlined-Cc6hbHUF.js";import{t as ue}from"./LinkOutlined-jVRA2Njw.js";import{t as O}from"./PrinterOutlined-B7FgpLcl.js";import{t as de}from"./StopOutlined-nZ2Jb1g9.js";import{t as fe}from"./UserOutlined-LfvzV8NT.js";import{t as k}from"./WarningOutlined-KVDD8iB3.js";import{t as pe}from"./PrintableComponent-BCAjDjK6.js";import{t as A}from"./Transactions-1xT9bF5q.js";import{t as j}from"./BusinessRuleApprovalModal-CKzUH4bR.js";import{t as M}from"./esm-BNU_vSVB.js";var me={icon:{tag:`svg`,attrs:{viewBox:`64 64 896 896`,focusable:`false`},children:[{tag:`path`,attrs:{d:`M832.6 191.4c-84.6-84.6-221.5-84.6-306 0l-96.9 96.9 51 51 96.9-96.9c53.8-53.8 144.6-59.5 204 0 59.5 59.5 53.8 150.2 0 204l-96.9 96.9 51.1 51.1 96.9-96.9c84.4-84.6 84.4-221.5-.1-306.1zM446.5 781.6c-53.8 53.8-144.6 59.5-204 0-59.5-59.5-53.8-150.2 0-204l96.9-96.9-51.1-51.1-96.9 96.9c-84.6 84.6-84.6 221.5 0 306s221.5 84.6 306 0l96.9-96.9-51-51-96.8 97zM260.3 209.4a8.03 8.03 0 00-11.3 0L209.4 249a8.03 8.03 0 000 11.3l554.4 554.4c3.1 3.1 8.2 3.1 11.3 0l39.6-39.6c3.1-3.1 3.1-8.2 0-11.3L260.3 209.4z`}}]},name:`disconnect`,theme:`outlined`},N=e(a());function P(){return P=Object.assign?Object.assign.bind():function(e){for(var t=1;t<arguments.length;t++){var n=arguments[t];for(var r in n)Object.prototype.hasOwnProperty.call(n,r)&&(e[r]=n[r])}return e},P.apply(this,arguments)}var he=N.forwardRef((e,t)=>N.createElement(s,P({},e,{ref:t,icon:me}))),ge=e(_(),1),F=o(),{Text:I,Title:_e}=d,{useToken:ve}=ae,L=``,R=e=>`${L}${e}`,ye={stripe:`Stripe`,paypal:`PayPal`,razorpay:`Razorpay`},z={stripe:`#635BFF`,paypal:`#003087`,razorpay:`#3395FF`},be=new Set([`posted`,`approved`,`issued`,`confirmed`,`sent`,`accepted`,`fulfilled`,`paid`,`part_paid`,`received`]),xe=new Set([`quotation`,`proforma_invoice`,`sales_order`,`invoice`,`customer_payment`,`credit_note`]),B=e=>{let t=String(e||``).toLowerCase();return{payment:`customer_payment`,payment_in:`customer_payment`,customer_receipt:`customer_payment`,receipt:`customer_payment`,sales_return:`credit_note`,credit_note_sales_return:`credit_note`}[t]||t},V=(e=``)=>String(e).replace(/_/g,` `).replace(/\b\w/g,e=>e.toUpperCase()),H=(...e)=>e.find(e=>e!=null&&e!==``),U=e=>Array.isArray(e)?e:[],W=e=>{if(!e)return`-`;let t=(0,ge.default)(e);return t.isValid()?t.format(`DD MMM YYYY`):e},G=e=>e?typeof e==`string`||typeof e==`number`?String(e):e.display_name||e.company_name||e.person_name||e.name||e.label||e.account_name||e.bank_name||e.title||e.invoice_no||e.bill_no||e.quotation_no||e.sales_order_no||e.proforma_no||e.sales_return_no||e.purchase_order_no||e.payment_no||e.expense_no||e.debit_note_no||e.code||`-`:`-`,K=e=>{let t=Number(e);return Number.isFinite(t)?t:0},q=(e,t)=>{let n=t?.symbol||t?.code||t?.name||``,r=K(e).toLocaleString(`en-NP`,{minimumFractionDigits:2,maximumFractionDigits:2});return n?`${n} ${r}`:r},Se=e=>K(e).toLocaleString(`en-NP`,{minimumFractionDigits:2,maximumFractionDigits:2}),Ce=e=>e==null||e===``?`-`:`${K(e).toLocaleString(`en-NP`,{minimumFractionDigits:0,maximumFractionDigits:2})}%`,we=e=>typeof e==`string`&&e.trim()&&e.trim().length<=160,Te=e=>[{label:`Branch`,value:G(e?.branch)},{label:`Approved By`,value:G(e?.approvedBy||e?.approved_by)},{label:`Approved At`,value:W(e?.approved_at)}],J=e=>{let t=String(e||`draft`).toLowerCase();return(0,F.jsx)(w,{color:t===`draft`?`default`:t===`cancelled`||t===`void`||t===`rejected`?`error`:be.has(t)?`success`:`processing`,style:{marginInlineEnd:0},children:V(t)})},Y=e=>{let t=e?.approved;return t===!0?(0,F.jsx)(w,{color:`success`,style:{marginInlineEnd:0},children:`Approved`}):t===!1?(0,F.jsx)(w,{color:`warning`,style:{marginInlineEnd:0},children:`Draft`}):be.has(String(e?.status||``).toLowerCase())?(0,F.jsx)(w,{color:`success`,style:{marginInlineEnd:0},children:`Approved`}):(0,F.jsx)(w,{style:{marginInlineEnd:0},children:`Draft`})},Ee={quotation:{numberLabel:`Quotation No`,numberKeys:[`quotation_no`,`code`],dateLabel:`Quotation Date`,dateKeys:[`quotation_date`,`date`],dueLabel:`Expiry Date`,dueKeys:[`expiry_date`],linesKeys:[`quotationLines`,`quotation_lines`,`items`]},proforma_invoice:{numberLabel:`Proforma No`,numberKeys:[`proforma_no`,`code`],dateLabel:`Proforma Date`,dateKeys:[`proforma_date`,`date`],dueLabel:`Expiry Date`,dueKeys:[`expiry_date`,`due_date`],linesKeys:[`proformaInvoiceLines`,`proforma_invoice_lines`,`items`]},sales_order:{numberLabel:`Sales Order No`,numberKeys:[`sales_order_no`,`code`],dateLabel:`Sales Order Date`,dateKeys:[`sales_order_date`,`date`],dueLabel:`Due Date`,dueKeys:[`due_date`],linesKeys:[`salesOrderLines`,`sales_order_lines`,`items`]},invoice:{numberLabel:`Invoice No`,numberKeys:[`invoice_no`,`code`],dateLabel:`Invoice Date`,dateKeys:[`invoice_date`,`date`],dueLabel:`Due Date`,dueKeys:[`due_date`],linesKeys:[`invoiceLines`,`invoice_lines`,`items`]},customer_payment:{numberLabel:`Payment No`,numberKeys:[`payment_no`,`code`],dateLabel:`Payment Date`,dateKeys:[`payment_date`,`date`],dueLabel:`Reference`,dueKeys:[`reference`],linesKeys:[`customerPaymentLines`,`customer_payment_lines`,`items`]},credit_note:{numberLabel:`Credit Note No`,numberKeys:[`sales_return_no`,`note_number`,`code`],dateLabel:`Credit Note Date`,dateKeys:[`sales_return_date`,`date`],dueLabel:`Reference`,dueKeys:[`reference`,`reference_no`],linesKeys:[`salesReturnLines`,`sales_return_lines`,`items`]}},X=e=>Ee[B(e)]||Ee.invoice,Z=(e,t)=>{let n=X(t).linesKeys;for(let t of n)if(Array.isArray(e?.[t]))return e[t];return[]},De=e=>H(e?.customerPaymentLines,e?.customer_payment_lines,[])||[],Q=(e,t,n)=>H(...X(t).numberKeys.map(t=>e?.[t]))||n,Oe=(e,t)=>H(...X(t).dateKeys.map(t=>e?.[t])),ke=(e,t)=>H(...X(t).dueKeys.map(t=>e?.[t])),Ae=e=>{let t=e?.taxRate||e?.tax_rate;if(t){let e=G(t);if(e!==`-`)return e;if(t?.rate_percent!==void 0&&t?.rate_percent!==null)return Ce(t.rate_percent)}return e?.tax_code?V(e.tax_code):`-`},$=e=>G(e?.product)===`-`?H(e?.product_name,e?.custom_product_name,e?.description)||`-`:G(e?.product),je=(e,t)=>({quotation:`Quotation`,sales_order:`Sales Order`,invoice:`Invoice`,customer_payment:`Payment Receipt`,credit_note:`Credit Note`})[B(e)]||t||`Document`,Me=(e,t,n)=>{let r=Q(e,t,n);return`${String(r||n||`document`).replace(/[^\w.-]+/g,`_`)}.pdf`},Ne=e=>String(e??``).replaceAll(`&`,`&amp;`).replaceAll(`<`,`&lt;`).replaceAll(`>`,`&gt;`).replaceAll(`"`,`&quot;`).replaceAll(`'`,`&#039;`),Pe=(e,t,n=``)=>t?String(t).split(`.`).reduce((e,t)=>e==null?n:e[t],e)??n:n,Fe=e=>H(e?.contact?.email,e?.customer?.email,e?.party?.email,``),Ie=e=>H(e?.contact?.phone,e?.contact?.mobile,e?.customer?.phone,e?.party?.phone,``),Le=e=>H(e?.contact?.address,e?.contact?.billing_address,e?.customer?.address,e?.party?.address,``),Re=(e=null)=>H(e?.address,[e?.address_line_1,e?.address_line_2,e?.city,e?.state,e?.postal_code,e?.country].filter(Boolean).join(`, `),``),ze=(e,t)=>{let n=H(e?.qty,e?.quantity,0),r=H(e?.unit_price,e?.rate,e?.price,0),i=H(e?.discount_amount,0),a=H(e?.discount_percent,``),o=H(e?.tax_amount,0),s=H(e?.line_total,e?.total,e?.amount,0);return{...e,product_name:$(e),item_name:$(e),description:e?.description||`-`,qty:Se(n),quantity:Se(n),unit_price:q(r,t),rate:q(r,t),price:q(r,t),discount_percent:a==null||a===``?`-`:Ce(a),discount_amount:q(i,t),tax:Ae(e),tax_amount:q(o,t),line_total:q(s,t),amount:q(H(e?.amount,s),t),raw_qty:K(n),raw_unit_price:K(r),raw_discount_amount:K(i),raw_tax_amount:K(o),raw_line_total:K(s)}},Be=(e,t,n,r=null)=>{let i=B(t),a=e?.currency,o=Z(e,i),s=je(i,n),c=H(e?.subtotal,e?.sub_total,o.reduce((e,t)=>e+K(H(t?.amount,t?.subtotal,t?.line_total)),0)),l=H(e?.discount_total,e?.total_discount,o.reduce((e,t)=>e+K(t?.discount_amount),0)),u=H(e?.tax_total,e?.total_tax,o.reduce((e,t)=>e+K(t?.tax_amount),0)),d=H(e?.grand_total,e?.total,e?.amount,0),f=H(e?.paid_total,e?.paid_amount,0),p=H(e?.balance_due,Math.max(K(d)-K(f),0)),m=!!e?.void,h=!e?.void&&e?.approved!==!0;return{record:e,company:{name:H(r?.company_name,e?.company?.name,e?.branch?.name,`KiteLedger`),legal_name:H(r?.legal_name,r?.company_name,e?.company?.legal_name,e?.company?.name,``),address:H(Re(r),e?.company?.address,e?.branch?.address,``),phone:H(r?.phone,e?.company?.phone,e?.branch?.phone,``),email:H(r?.email,e?.company?.email,e?.branch?.email,``),website:H(r?.website,e?.company?.website,``),pan_or_vat:H(r?.tax_number,r?.vat_number,e?.company?.tax_id,``),registration_number:H(r?.registration_number,e?.company?.registration_number,``),footer:H(r?.footer,``),tax_id:H(r?.tax_number,r?.vat_number,e?.company?.pan_no,``),logo:H(r?.logo_url,r?.dark_logo_url,r?.logo,r?.dark_logo,``),watermark:r?.watermark_url||``,initials:String(H(r?.company_name,e?.company?.name,e?.branch?.name,`KL`)).split(/\s+/).map(e=>e.charAt(0)).join(``).slice(0,3).toUpperCase()},branch:{name:H(e?.branch?.name,``),address:H(e?.branch?.address,``),phone:H(e?.branch?.phone,``)},document:{type:i,title:s,number:Q(e,i,n),date:W(Oe(e,i)),due_date:W(ke(e,i)),reference:H(e?.reference,e?.reference_no,`-`),status:V(e?.status||`draft`),notes:e?.notes||``,terms:H(e?.terms_and_conditions,e?.terms,e?.payment_terms,``),void:m,voided:m,is_draft:h,approved:!!e?.approved,voided_reason:e?.voided_reason||``,approved_at:W(e?.approved_at),voided_at:W(e?.voided_at),show_watermark:!!(r?.show_watermark??!0)},party:{name:G(e?.contact),phone:Ie(e),email:Fe(e),address:Le(e),pan_no:H(e?.contact?.pan_no,e?.contact?.vat_no,``),vat_no:H(e?.contact?.vat_no,e?.contact?.pan_no,``),tax_id:H(e?.contact?.tax_id,e?.contact?.pan_no,e?.contact?.vat_no,``)},customer:{name:G(e?.contact),phone:Ie(e),email:Fe(e),address:Le(e)},account:{name:G(e?.account)},currency:{code:a?.code||``,symbol:a?.symbol||``,name:a?.name||``},exchange_rate:e?.exchange_rate?Number(e.exchange_rate).toFixed(2):``,subtotal:q(c,a),discount:q(l,a),tax:q(u,a),total:q(d,a),amount_paid:q(f,a),balance_due:q(p,a),notes:e?.notes||``,terms:H(e?.terms_and_conditions,e?.terms,e?.payment_terms,``),totals:{subtotal:q(c,a),discount:q(l,a),tax:q(u,a),grand_total:q(d,a),total:q(d,a),paid:q(f,a),balance:q(p,a),amount_in_words:H(e?.amount_in_words,e?.total_in_words,``)},payment:{amount:q(d,a),allocated_amount:q(o.reduce((e,t)=>e+K(t?.allocated_amount),0),a),method:H(e?.payment_method,e?.method,`-`),account:G(e?.account),reference_number:H(e?.reference_no,e?.reference,``),source_account:G(e?.account),destination_account:G(e?.contact)},prepared_by:H(e?.userAdd?.name,e?.created_by?.name,``),approved_by:H(e?.approvedBy?.name,e?.approved_by?.name,``),printed_at:new Date().toLocaleString(),settings:{show_watermark:!!(r?.show_watermark??!0)},lines:o.map(e=>ze(e,a)),items:o.map(e=>ze(e,a))}},Ve=e=>({_source:`quotation`,_source_id:e?.id,_source_no:e?.quotation_no,contact_id:e?.contact?.id??e?.contact_id??null,contact_id_detail:e?.contact??null,currency_id:e?.currency?.id??e?.currency_id??null,currency_id_detail:e?.currency??null,exchange_rate:e?.exchange_rate??1,credit_term_id:e?.creditTerm?.id??e?.credit_term?.id??e?.credit_term_id??null,credit_term_id_detail:e?.creditTerm??e?.credit_term??null,notes:e?.notes??``,reference:e?.quotation_no??``,items:U(Z(e,`quotation`)).map(e=>({product_id:e?.product?.id??e?.product_id??null,product_id_detail:e?.product??null,product_name:$(e),description:e?.description??``,qty:K(H(e?.qty,e?.quantity,1)),unit_price:K(H(e?.unit_price,e?.rate,0)),discount_percent:K(e?.discount_percent??0),discount_amount:K(e?.discount_amount??0),tax_rate_id:e?.taxRate?.id??e?.tax_rate?.id??e?.tax_rate_id??null,tax_rate_id_detail:e?.taxRate??e?.tax_rate??null,tax_amount:K(e?.tax_amount??0),line_total:K(H(e?.line_total,e?.amount,0))}))}),He=e=>({_source:`sales_order`,_source_id:e?.id,_source_no:e?.sales_order_no,contact_id:e?.contact?.id??e?.contact_id??null,contact_id_detail:e?.contact??null,currency_id:e?.currency?.id??e?.currency_id??null,currency_id_detail:e?.currency??null,exchange_rate:e?.exchange_rate??1,credit_term_id:e?.creditTerm?.id??e?.credit_term?.id??e?.credit_term_id??null,credit_term_id_detail:e?.creditTerm??e?.credit_term??null,notes:e?.notes??``,reference:e?.sales_order_no??``,items:U(Z(e,`sales_order`)).map(e=>({product_id:e?.product?.id??e?.product_id??null,product_id_detail:e?.product??null,product_name:$(e),description:e?.description??``,qty:K(H(e?.qty,e?.quantity,1)),unit_price:K(H(e?.unit_price,e?.rate,0)),discount_percent:K(e?.discount_percent??0),discount_amount:K(e?.discount_amount??0),tax_rate_id:e?.taxRate?.id??e?.tax_rate?.id??e?.tax_rate_id??null,tax_rate_id_detail:e?.taxRate??e?.tax_rate??null,tax_amount:K(e?.tax_amount??0),line_total:K(H(e?.line_total,e?.amount,0))}))}),Ue=e=>{let t=K(H(e?.grand_total,e?.total,0)),n=K(H(e?.balance_due,t));return{_source:`invoice`,_source_id:e?.id,_source_no:e?.invoice_no,contact_id:e?.contact?.id??e?.contact_id??null,contact_id_detail:e?.contact??null,currency_id:e?.currency?.id??e?.currency_id??null,currency_id_detail:e?.currency??null,exchange_rate:e?.exchange_rate??1,amount:n,items:[{invoice_id:e?.id,invoice_id_detail:{id:e?.id,invoice_no:e?.invoice_no},invoice_no:e?.invoice_no??``,invoice_total:t,outstanding_amount:n,allocated_amount:n}]}},We=(e,t)=>{let n=(e,n,r=``)=>Pe(e,n,void 0)??Pe(t,n,r),r=(e,i=t)=>String(e||``).replace(/{{([#^])([\w.]+)}}([\s\S]*?){{\/\2}}/g,(e,a,o,s)=>{let c=n(i,o,null),l=Array.isArray(c)?c.length>0:!!c;return a===`^`?l?``:r(s,i):Array.isArray(c)?c.map((e,n)=>r(s,{...t,...e||{},"@index":n+1})).join(``):l?r(s,typeof c==`object`?{...t,...c}:i):``}).replace(/{{{\s*([^}]+)\s*}}}/g,(e,t)=>n(i,t.trim(),``)).replace(/{{\s*([^}]+)\s*}}/g,(e,t)=>{let r=t.trim();return Ne(n(i,r,``))});return r(e)},Ge=`<div class="print-document">
    <div class="print-header">
        <div>
            <h1>{{document.title}}</h1>
            <p class="muted">{{document.number}}</p>
        </div>

        <div class="print-meta">
            <p><strong>Date:</strong> {{document.date}}</p>
            <p><strong>Due / Ref:</strong> {{document.due_date}}</p>
            <p><strong>Status:</strong> {{document.status}}</p>
        </div>
    </div>

    <div class="party-box">
        <h3>Customer Details</h3>
        <p><strong>Name:</strong> {{party.name}}</p>
        <p><strong>Phone:</strong> {{party.phone}}</p>
        <p><strong>Email:</strong> {{party.email}}</p>
        <p><strong>Address:</strong> {{party.address}}</p>
    </div>

    <table class="print-table">
        <thead>
            <tr>
                <th>#</th>
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
        <div><span>Subtotal</span><strong>{{totals.subtotal}}</strong></div>
        <div><span>Discount</span><strong>{{totals.discount}}</strong></div>
        <div><span>Tax</span><strong>{{totals.tax}}</strong></div>
        <div class="grand-total"><span>Grand Total</span><strong>{{totals.grand_total}}</strong></div>
    </div>

    <div class="notes">
        <strong>Notes:</strong>
        <p>{{document.notes}}</p>
    </div>

    {{#document.terms}}
    <div class="notes">
        <strong>Terms & Conditions:</strong>
        <div>{{{document.terms}}}</div>
    </div>
    {{/document.terms}}
</div>`,Ke=`.print-document {
    font-family: Arial, sans-serif;
    color: #111827;
    font-size: 12px;
    line-height: 1.45;
    padding: 24px;
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
}

.print-header p {
    margin: 4px 0;
}

.muted {
    color: #6b7280;
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
    .print-document {
        padding: 18px;
    }
}`;function qe({paymentUrl:e,faviconUrl:t}){return e?(0,F.jsxs)(`div`,{style:{marginTop:28,paddingTop:18,borderTop:`1px dashed #d1d5db`,display:`flex`,alignItems:`flex-start`,gap:18},children:[(0,F.jsx)(`div`,{style:{flexShrink:0},children:(0,F.jsx)(M,{value:e,size:96,level:`M`,...t?{imageSettings:{src:t,height:28,width:28,excavate:!0}}:{}})}),(0,F.jsxs)(`div`,{style:{paddingTop:4},children:[(0,F.jsx)(`p`,{style:{margin:`0 0 4px`,fontWeight:700,fontSize:13,color:`#111827`},children:`Pay Online`}),(0,F.jsx)(`p`,{style:{margin:`0 0 6px`,fontSize:11,color:`#6b7280`,lineHeight:1.4},children:`Scan the QR code with your phone to pay this invoice securely online.`}),(0,F.jsx)(`p`,{style:{margin:0,fontSize:10,color:`#9ca3af`,wordBreak:`break-all`},children:e})]})]}):null}function Je({record:e,documentType:t,title:n,template:r,templateError:i,companyInfo:a,paymentLinkData:o}){let s=B(t),c=(0,N.useMemo)(()=>Be(e,s,n,a),[e,s,n,a]),l=r||{name:`Fallback Template`,template_key:`${s}.fallback`,template_html:Ge,template_css:Ke},u=(0,N.useMemo)(()=>We(l.template_html,c),[l.template_html,c]),d=Me(e,s,n),f=o?.public_url||null,p=!!(o?.link?.active&&!o?.link?.is_expired&&f),m=a?.favicon_url||a?.favicon||null;return(0,F.jsxs)(pe,{title:c.document.title,subTitle:c.document.number,fileName:d,pageSize:`A4`,pageOrientation:`portrait`,showPageFrame:!0,previewBackground:`#f3f4f6`,printStyles:l.template_css||``,defaultEmailValues:{to:c.party.email,subject:`${c.document.title} ${c.document.number}`,body:`Dear ${c.party.name||`Customer`},\n\nPlease find attached ${c.document.title} ${c.document.number}.\n\nThank you.`},emailExtraPayload:{document_type:s,document_number:c.document.number,record_id:e?.id},contentStyle:{width:`210mm`,minHeight:`297mm`},children:[(0,F.jsx)(`style`,{children:l.template_css||``}),(0,F.jsx)(`div`,{dangerouslySetInnerHTML:{__html:u}}),p&&s===`invoice`&&(0,F.jsx)(qe,{paymentUrl:f,faviconUrl:m})]})}function Ye({rows:e=[],compact:t=!1}){let n=e.filter(Boolean);return n.length?(0,F.jsx)(`div`,{className:t?`payment-record-show__info is-compact`:`payment-record-show__info`,children:n.map(e=>(0,F.jsxs)(`div`,{className:`payment-record-show__info-row`,children:[(0,F.jsx)(`div`,{className:`payment-record-show__info-label`,children:e.label}),(0,F.jsx)(`div`,{className:`payment-record-show__info-value`,children:e.value})]},e.label))}):(0,F.jsx)(p,{image:p.PRESENTED_IMAGE_SIMPLE,description:`No details available`})}function Xe({title:e,documentNumber:t,total:n,rows:r,party:i}){return(0,F.jsx)(`aside`,{className:`payment-record-show__rail`,children:(0,F.jsxs)(v,{className:`payment-record-show__rail-card`,children:[(0,F.jsx)(`div`,{className:`payment-record-show__doc-icon`,children:(0,F.jsx)(te,{})}),(0,F.jsxs)(`div`,{className:`payment-record-show__rail-heading`,children:[(0,F.jsx)(I,{type:`secondary`,children:e}),(0,F.jsx)(_e,{level:4,children:t})]}),(0,F.jsxs)(`div`,{className:`payment-record-show__rail-party`,children:[(0,F.jsx)(fe,{}),(0,F.jsx)(I,{ellipsis:!0,children:i||`-`})]}),(0,F.jsxs)(`div`,{className:`payment-record-show__amount-box`,children:[(0,F.jsx)(I,{type:`secondary`,children:`Document Total`}),(0,F.jsx)(`strong`,{children:n})]}),(0,F.jsx)(Ye,{rows:r,compact:!0})]})})}function Ze({items:e=[]}){return(0,F.jsx)(`div`,{className:`payment-record-show__summary`,children:e.filter(Boolean).map(e=>(0,F.jsxs)(v,{className:`payment-record-show__summary-card ${e.tone||``}`,children:[(0,F.jsx)(`div`,{className:`payment-record-show__summary-icon`,children:e.icon||(0,F.jsx)(D,{})}),(0,F.jsxs)(`div`,{className:`payment-record-show__summary-content`,children:[(0,F.jsx)(I,{type:`secondary`,children:e.label}),(0,F.jsx)(`strong`,{children:e.value})]})]},e.label))})}function Qe({title:e,backRoute:t,backLabel:n,documentNumber:i,record:a,loading:o,onPrint:s,editRoute:c,recordId:l,documentType:u,onConvertToSalesOrder:d,onConvertToInvoice:f,onCollectPayment:p,onSharePaymentLink:h}){let _=B(u),b=a?.approved===!0,x=a?.void===!0;return(0,F.jsx)(v,{className:`payment-record-show__header-card border-none`,children:(0,F.jsxs)(`div`,{className:`payment-record-show__header`,children:[(0,F.jsxs)(`div`,{className:`payment-record-show__header-left`,children:[(0,F.jsx)(r,{href:route(t),children:(0,F.jsx)(g,{type:`text`,icon:(0,F.jsx)(se,{}),children:n})}),(0,F.jsxs)(`div`,{className:`payment-record-show__title-wrap`,children:[(0,F.jsx)(_e,{level:4,children:e}),!o&&a?(0,F.jsxs)(y,{size:8,wrap:!0,children:[(0,F.jsx)(I,{type:`secondary`,children:i}),J(a?.status),Y(a)]}):(0,F.jsx)(I,{type:`secondary`,children:`Loading document details`})]})]}),(0,F.jsxs)(y,{wrap:!0,children:[_===`quotation`&&b&&(0,F.jsx)(m,{title:`Create a Sales Order from this Quotation`,children:(0,F.jsx)(g,{type:`primary`,ghost:!0,icon:(0,F.jsx)(T,{}),disabled:o||!a,onClick:d,children:`Convert to Sales Order`})}),_===`sales_order`&&b&&(0,F.jsx)(m,{title:`Create an Invoice from this Sales Order`,children:(0,F.jsx)(g,{type:`primary`,ghost:!0,icon:(0,F.jsx)(T,{}),disabled:o||!a,onClick:f,children:`Convert to Invoice`})}),_===`invoice`&&b&&!x&&(0,F.jsx)(m,{title:`Collect payment for this Invoice`,children:(0,F.jsx)(g,{type:`primary`,icon:(0,F.jsx)(D,{}),disabled:o||!a,onClick:p,children:`Collect Payment`})}),_===`invoice`&&b&&!x&&(0,F.jsx)(m,{title:`Generate or share a payment link so your customer can pay online`,children:(0,F.jsx)(g,{icon:(0,F.jsx)(ue,{}),disabled:o||!a,onClick:h,children:`Share Payment Link`})}),c&&l&&!x&&(0,F.jsx)(r,{href:route(c,l),children:(0,F.jsx)(g,{icon:(0,F.jsx)(ie,{}),disabled:o||!a,children:`Edit`})}),(0,F.jsx)(g,{icon:(0,F.jsx)(O,{}),onClick:s,disabled:o||!a,children:`Print Preview`})]})]})})}function $e(e,t){let n=B(t),r=X(n);return[{label:r.numberLabel,value:Q(e,n,r.numberLabel)},{label:r.dateLabel,value:W(Oe(e,n))},{label:`Customer`,value:G(e?.contact)},e?.warehouse?{label:`Warehouse`,value:G(e.warehouse)}:null,{label:`Currency`,value:H(e?.currency?.code,e?.currency?.symbol,G(e?.currency))||`-`},{label:`Status`,value:J(e?.status)},{label:`Approval`,value:Y(e)},...Te(e),we(e?.notes)?{label:`Notes`,value:e.notes}:null]}function et(e,t){let n=B(t),r=X(n);return[{label:r.numberLabel,value:Q(e,n,r.numberLabel)},{label:r.dateLabel,value:W(Oe(e,n))},{label:`Customer`,value:G(e?.contact)},{label:r.dueLabel,value:r.dueLabel===`Reference`?ke(e,n)||`-`:W(ke(e,n))},r.dueLabel===`Reference`?null:{label:`Reference`,value:H(e?.reference,e?.reference_no)||`-`},e?.warehouse?{label:`Warehouse`,value:G(e.warehouse)}:null,e?.creditTerm||e?.credit_term?{label:`Credit Term`,value:G(e?.creditTerm||e?.credit_term)}:null,{label:`Currency`,value:H(e?.currency?.code,e?.currency?.symbol,G(e?.currency))||`-`},{label:`Status`,value:J(e?.status)},{label:`Approval Status`,value:Y(e)},...Te(e),n===`customer_payment`?{label:`Payment Account`,value:G(e?.account)}:null,n===`customer_payment`?{label:`Payment Method`,value:H(e?.payment_method,e?.method)||`-`}:null,n===`customer_payment`?{label:`Bank Charges Account`,value:G(e?.bankChargesAccount||e?.bank_charges_account)}:null,n===`customer_payment`?{label:`TDS Account`,value:G(e?.tdsChargesAccount||e?.tds_charges_account)}:null,we(e?.notes)?{label:`Notes`,value:e.notes}:null].filter(Boolean)}function tt(e,t){let n=B(t),r=e?.currency,i=K(H(e?.grand_total,e?.total,e?.amount)),a=K(H(e?.paid_total,e?.paid_amount)),o=K(H(e?.balance_due,Math.max(i-a,0)));if(n===`invoice`)return[{label:`Total Amount`,value:q(i,r),icon:(0,F.jsx)(D,{}),tone:`is-primary`},{label:`Paid Total`,value:q(a,r),icon:(0,F.jsx)(E,{}),tone:`is-success`},{label:`Balance Due`,value:q(o,r),icon:(0,F.jsx)(b,{}),tone:o>0?`is-warning`:`is-success`}];if(n===`customer_payment`){let t=Z(e,n).reduce((e,t)=>e+K(t?.allocated_amount),0),a=K(e?.bank_charges),o=K(e?.tds_charges);return[{label:`Payment Amount`,value:q(i,r),icon:(0,F.jsx)(D,{}),tone:`is-primary`},{label:`Allocated Amount`,value:q(t,r),icon:(0,F.jsx)(E,{}),tone:`is-success`},{label:`Unallocated Amount`,value:q(Math.max(i-t,0),r),icon:(0,F.jsx)(b,{}),tone:Math.max(i-t,0)>0?`is-warning`:`is-success`},a?{label:`Bank Charges`,value:q(a,r),tone:`is-muted`}:null,o?{label:`TDS Charges`,value:q(o,r),tone:`is-muted`}:null]}return[{label:`Total Amount`,value:q(i,r),icon:(0,F.jsx)(D,{}),tone:`is-primary`}]}function nt(e,t,n,r,i){return(0,F.jsx)(v,{title:e,className:`payment-record-show__card`,children:(0,F.jsx)(c,{size:`small`,rowKey:(t,n)=>t?.id||`${e}-${n}`,columns:t,dataSource:n,pagination:!1,scroll:{x:980},rowClassName:(e,t)=>t%2==0?`payment-record-show__table-row`:`payment-record-show__table-row is-alt`,locale:{emptyText:(0,F.jsx)(p,{image:p.PRESENTED_IMAGE_SIMPLE,description:r})},summary:i})},e)}function rt({title:e,html:t}){return t?(0,F.jsx)(v,{title:e,className:`payment-record-show__card`,children:(0,F.jsx)(`div`,{className:`payment-record-show__rich-text`,dangerouslySetInnerHTML:{__html:t}})}):null}function it(e,t){let n=B(t),r=e?.currency,i=Z(e,n),a=[],o=[{title:`Product / Item`,key:`product`,width:220,render:(e,t)=>(0,F.jsx)(I,{strong:!0,children:$(t)})},{title:`Description`,dataIndex:`description`,key:`description`,width:260,render:e=>e||`-`},{title:`Qty`,key:`qty`,width:90,align:`right`,render:(e,t)=>Se(H(t?.qty,t?.quantity))},{title:`Unit Price`,key:`unit_price`,width:130,align:`right`,render:(e,t)=>q(t?.unit_price,r)},{title:`Discount %`,key:`discount_percent`,width:110,align:`right`,render:(e,t)=>Ce(t?.discount_percent)},{title:`Tax`,key:`tax`,width:140,render:(e,t)=>Ae(t)},{title:`Tax Amount`,key:`tax_amount`,width:130,align:`right`,render:(e,t)=>q(t?.tax_amount,r)},{title:`Line Total`,key:`line_total`,width:140,align:`right`,render:(e,t)=>(0,F.jsx)(I,{strong:!0,children:q(H(t?.line_total,t?.amount),r)})}];if([`quotation`,`sales_order`,`invoice`,`credit_note`].includes(n)){let t={quotation:`Quotation Lines`,sales_order:`Sales Order Lines`,invoice:`Invoice Lines`,credit_note:`Credit Note Lines`},s=o.map(e=>n===`credit_note`&&e.key===`discount_percent`?null:e).filter(Boolean);if(a.push(nt(t[n],s,i,`No line items`,()=>(0,F.jsxs)(c.Summary.Row,{children:[(0,F.jsx)(c.Summary.Cell,{index:0,colSpan:s.length-1,children:`Total`}),(0,F.jsx)(c.Summary.Cell,{index:s.length-1,align:`right`,children:q(i.reduce((e,t)=>e+K(H(t?.line_total,t?.amount)),0),r)})]}))),n===`quotation`){let t=(0,F.jsx)(rt,{title:`Terms & Conditions`,html:H(e?.terms_and_conditions,e?.terms,e?.payment_terms,``)},`terms-and-conditions`);t&&a.push(t)}}if(n===`invoice`){let t=U(De(e));a.push(nt(`Payment Allocations`,[{title:`Payment No`,key:`payment_no`,render:(e,t)=>G(t?.customerPayment||t?.customer_payment)},{title:`Payment Date`,key:`payment_date`,render:(e,t)=>W(H(t?.customerPayment?.payment_date,t?.customer_payment?.payment_date))},{title:`Allocated Amount`,key:`allocated_amount`,align:`right`,render:(e,t)=>q(t?.allocated_amount,r)},{title:`Payment Amount`,key:`payment_amount`,align:`right`,render:(e,t)=>q(H(t?.customerPayment?.amount,t?.customer_payment?.amount),r)},{title:`Status`,key:`status`,render:(e,t)=>J(H(t?.customerPayment?.status,t?.customer_payment?.status))}],t,`No payment allocations`))}return n===`customer_payment`&&a.push(nt(`Payment Allocation Lines`,[{title:`Invoice No`,key:`invoice`,render:(e,t)=>G(t?.invoice)},{title:`Invoice Date`,key:`invoice_date`,render:(e,t)=>W(t?.invoice?.invoice_date)},{title:`Allocated Amount`,key:`allocated_amount`,align:`right`,render:(e,t)=>q(t?.allocated_amount,r)},{title:`Invoice Total`,key:`invoice_total`,align:`right`,render:(e,t)=>q(t?.invoice?.total,r)},{title:`Balance Due`,key:`balance_due`,align:`right`,render:(e,t)=>q(t?.invoice?.balance_due,r)}],i,`No invoice allocations`,()=>(0,F.jsxs)(c.Summary.Row,{children:[(0,F.jsx)(c.Summary.Cell,{index:0,colSpan:2,children:`Total Allocated`}),(0,F.jsx)(c.Summary.Cell,{index:2,align:`right`,children:q(i.reduce((e,t)=>e+K(t?.allocated_amount),0),r)}),(0,F.jsx)(c.Summary.Cell,{index:3,colSpan:2})]}))),a}function at({open:e,onClose:n,invoiceId:r,invoiceNo:i,currency:a}){let{token:o}=ae.useToken(),[s,_]=(0,N.useState)(null),[b,te]=(0,N.useState)([]),[ie,oe]=(0,N.useState)(!1),[se,T]=(0,N.useState)(!1),[D,ce]=(0,N.useState)(!1),O=(0,N.useCallback)(async()=>{if(!(!e||!r)){oe(!0);try{let[e,n]=await Promise.allSettled([t.get(R(`/api/invoices/${r}/payment-link`)),t.get(R(`/api/online-payments/`),{params:{invoice_id:r,page_size:20}})]);e.status===`fulfilled`&&_(e.value.data),n.status===`fulfilled`&&te(n.value.data?.results||n.value.data||[])}catch{}finally{oe(!1)}}},[e,r]);(0,N.useEffect)(()=>{O()},[O]);let fe=async()=>{T(!0);try{let e=await t.post(R(`/api/invoices/${r}/payment-link`));_(e.data),C.success(`Payment link generated`)}catch(e){C.error(e?.response?.data?.message||`Failed to generate link`)}finally{T(!1)}},pe=async()=>{ce(!0);try{await t.delete(R(`/api/invoices/${r}/payment-link`)),_(e=>({...e,link:{...e?.link,active:!1},public_url:null})),C.success(`Payment link disabled`)}catch(e){C.error(e?.response?.data?.message||`Failed to disable link`)}finally{ce(!1)}},A=s?.public_url,j=s?.link,M=!!(j?.active&&!j?.is_expired&&A),me=!!(j&&j.is_expired),P=j?M?(0,F.jsx)(w,{color:`success`,icon:(0,F.jsx)(E,{}),children:`Active`}):me?(0,F.jsx)(w,{color:`warning`,icon:(0,F.jsx)(k,{}),children:`Expired`}):(0,F.jsx)(w,{icon:(0,F.jsx)(de,{}),children:`Disabled`}):(0,F.jsx)(w,{children:`No link yet`}),ge={succeeded:`success`,failed:`error`,refunded:`warning`,pending:`processing`};return(0,F.jsx)(ee,{title:(0,F.jsxs)(y,{children:[(0,F.jsx)(ue,{}),`Share Payment Link`]}),open:e,onClose:n,width:520,destroyOnClose:!1,styles:{body:{padding:20,background:o.colorBgLayout}},children:ie?(0,F.jsx)(f,{active:!0,paragraph:{rows:10}}):(0,F.jsxs)(`div`,{style:{display:`flex`,flexDirection:`column`,gap:16},children:[(0,F.jsxs)(v,{size:`small`,style:{borderRadius:o.borderRadiusLG},children:[(0,F.jsxs)(`div`,{style:{display:`flex`,justifyContent:`space-between`,alignItems:`center`,marginBottom:12},children:[(0,F.jsx)(d.Text,{strong:!0,children:`Payment Link`}),P]}),M?(0,F.jsxs)(F.Fragment,{children:[(0,F.jsx)(d.Text,{type:`secondary`,style:{fontSize:12,display:`block`,marginBottom:8},children:`Share this link with your customer so they can pay online.`}),(0,F.jsxs)(y.Compact,{style:{width:`100%`},children:[(0,F.jsx)(S,{value:A,readOnly:!0,style:{fontSize:12}}),(0,F.jsx)(g,{icon:(0,F.jsx)(u,{}),onClick:()=>{navigator.clipboard?.writeText(A),C.success(`Link copied to clipboard`)},children:`Copy`}),(0,F.jsx)(m,{title:`Open in new tab`,children:(0,F.jsx)(g,{icon:(0,F.jsx)(le,{}),onClick:()=>window.open(A,`_blank`)})})]})]}):(0,F.jsx)(l,{type:`info`,showIcon:!0,message:j?me?`This payment link has expired. Regenerate to create a fresh one.`:`This payment link is disabled. Regenerate to reactivate it.`:`No payment link exists yet. Generate one to let customers pay online.`})]}),M&&(0,F.jsx)(v,{size:`small`,style:{borderRadius:o.borderRadiusLG,textAlign:`center`},title:(0,F.jsxs)(y,{children:[(0,F.jsx)(`span`,{children:`QR Code`}),(0,F.jsx)(d.Text,{type:`secondary`,style:{fontSize:12,fontWeight:400},children:`- customer scans to pay`})]}),children:(0,F.jsxs)(`div`,{style:{padding:`12px 0`},children:[(0,F.jsx)(`img`,{src:`https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(A)}&size=200x200&margin=10&bgcolor=ffffff`,alt:`Payment QR Code`,width:200,height:200,style:{border:`6px solid #fff`,borderRadius:8,boxShadow:`0 2px 12px rgba(0,0,0,0.10)`}}),(0,F.jsx)(`div`,{style:{marginTop:10},children:(0,F.jsxs)(d.Text,{type:`secondary`,style:{fontSize:12},children:[`Invoice #`,i]})})]})}),j&&(0,F.jsx)(v,{size:`small`,title:`Link Details`,style:{borderRadius:o.borderRadiusLG},children:(0,F.jsxs)(x,{size:`small`,column:1,bordered:!0,children:[(0,F.jsx)(x.Item,{label:`Status`,children:P}),j.expires_at&&(0,F.jsx)(x.Item,{label:`Expires`,children:W(j.expires_at)}),j.last_accessed_at&&(0,F.jsx)(x.Item,{label:`Last Accessed`,children:W(j.last_accessed_at)})]})}),(0,F.jsx)(v,{size:`small`,title:`Actions`,style:{borderRadius:o.borderRadiusLG},children:(0,F.jsxs)(y,{wrap:!0,children:[(0,F.jsx)(g,{type:!j||!M?`primary`:`default`,icon:(0,F.jsx)(re,{}),loading:se,onClick:fe,children:j?`Regenerate Link`:`Generate Link`}),j&&M&&(0,F.jsx)(ne,{title:`Disable payment link?`,description:`Customers will no longer be able to pay via this link.`,onConfirm:pe,okText:`Disable`,okButtonProps:{danger:!0},cancelText:`Cancel`,children:(0,F.jsx)(g,{danger:!0,icon:(0,F.jsx)(he,{}),loading:D,children:`Disable Link`})}),(0,F.jsx)(m,{title:`Refresh status`,children:(0,F.jsx)(g,{icon:(0,F.jsx)(re,{}),onClick:O})})]})}),(0,F.jsx)(v,{size:`small`,title:(0,F.jsxs)(y,{children:[`Online Payments`,(0,F.jsx)(h,{count:b.length,color:`#1677ff`,overflowCount:99})]}),style:{borderRadius:o.borderRadiusLG},children:b.length===0?(0,F.jsx)(p,{description:`No online payments received yet`,image:p.PRESENTED_IMAGE_SIMPLE,style:{padding:`20px 0`}}):(0,F.jsx)(c,{size:`small`,rowKey:`id`,dataSource:b,pagination:{pageSize:10,size:`small`,hideOnSinglePage:!0},columns:[{title:`Date`,dataIndex:`paid_at`,width:100,render:(e,t)=>W(e||t.created_at)},{title:`Method`,dataIndex:`provider`,width:100,render:e=>(0,F.jsx)(w,{color:z[e]?void 0:`blue`,style:z[e]?{background:z[e]+`18`,borderColor:z[e],color:z[e]}:{},children:ye[e]||e})},{title:`Amount`,dataIndex:`amount`,align:`right`,render:(e,t)=>`${t.currency?.symbol||a?.symbol||``}${Number(e??0).toLocaleString(void 0,{minimumFractionDigits:2,maximumFractionDigits:2})}`},{title:`Status`,dataIndex:`status`,width:100,render:e=>(0,F.jsx)(w,{color:ge[e]||`default`,children:String(e||``).replace(/_/g,` `).replace(/\b\w/g,e=>e.toUpperCase())})}]})})]})})}function ot({id:e,title:r,endpoint:a,backRoute:o,backLabel:s,documentType:c,editRoute:u}){let{token:d}=ve(),m=B(c),[h,_]=(0,N.useState)(null),[y,b]=(0,N.useState)(!0),[x,te]=(0,N.useState)(``),[S,ne]=(0,N.useState)(!1),[re,w]=(0,N.useState)(null),[ie,ae]=(0,N.useState)(!1),[se,T]=(0,N.useState)(``),[D,le]=(0,N.useState)(null),[ue,O]=(0,N.useState)(null),[fe,k]=(0,N.useState)(!1),[pe,M]=(0,N.useState)(!1),[me,P]=(0,N.useState)(!1),he=async()=>{if(h){M(!0);try{let e=a.replace(/\/+$/,``);(await t.post(R(`${e}/${h.id}/approve`))).data?.business_rules?.has_warnings?C.warning(`Transaction approved with warnings.`):C.success(`Transaction approved.`);let n=await t.get(R(`${e}/${h.id}`));_(n.data?.data??n.data),k(!1)}catch(e){C.error(e?.response?.data?.message||`Approval failed.`)}finally{M(!1)}}},ge=()=>{if(h){try{sessionStorage.setItem(`kiteledger_so_prefill`,JSON.stringify(Ve(h)))}catch{}typeof route==`function`?n.visit(route(`payment-in.sales-orders.add`)):n.visit(`/payment-in/sales-orders/add`)}},I=()=>{if(h){try{sessionStorage.setItem(`kiteledger_invoice_prefill`,JSON.stringify(He(h)))}catch{}typeof route==`function`?n.visit(route(`payment-in.invoices.add`)):n.visit(`/payment-in/invoices/add`)}},_e=()=>{if(h){try{sessionStorage.setItem(`kiteledger_payment_prefill`,JSON.stringify(Ue(h)))}catch{}typeof route==`function`?n.visit(route(`payment-in.payments.add`)):n.visit(`/payment-in/payments/add`)}};(0,N.useEffect)(()=>{let n=!0,i=a.replace(/\/+$/,``);return(async()=>{b(!0),te(``);try{let r=await t.get(R(`${i}/${e}`));if(!n)return;_(r.data?.data??r.data)}catch(e){if(!n)return;_(null),te(e?.response?.data?.message||`Failed to load ${r}.`)}finally{n&&b(!1)}})(),()=>{n=!1}},[a,e,r]),(0,N.useEffect)(()=>{if(!S||!h||!m)return;let e=!0;return(async()=>{ae(!0),T(``),w(null),O(null);try{let n=[t.get(R(`/api/printing-templates/resolve?document_type=${encodeURIComponent(m)}`)),t.get(R(`/api/app-settings/current`)).catch(()=>({data:null}))];m===`invoice`&&h?.id&&n.push(t.get(R(`/api/invoices/${h.id}/payment-link`)).catch(()=>({data:null})));let[r,i,a]=await Promise.all(n);if(!e)return;w(r.data?.data??r.data??null),le(i.data?.data??i.data??null),a&&O(a.data??null)}catch(t){if(!e)return;w(null),T(t?.response?.data?.message||`No active print template found. Fallback template is being used.`)}finally{e&&ae(!1)}})(),()=>{e=!1}},[S,h,m]);let L=(0,N.useMemo)(()=>Q(h,m,r),[h,m,r]),ye=(0,N.useMemo)(()=>q(H(h?.grand_total,h?.total,h?.amount),h?.currency),[h]),z=(0,N.useMemo)(()=>$e(h,m),[h,m]),be=(0,N.useMemo)(()=>et(h,m),[h,m]),V=(0,N.useMemo)(()=>tt(h,m),[h,m]),U=(0,N.useMemo)(()=>it(h,m),[h,m]),W=(0,N.useMemo)(()=>G(h?.contact),[h]),K={"--payment-record-show-bg":d.colorBgLayout,"--payment-record-show-surface":d.colorBgContainer,"--payment-record-show-surface-elevated":d.colorBgElevated,"--payment-record-show-surface-soft":d.colorFillAlter,"--payment-record-show-surface-muted":d.colorFillQuaternary,"--payment-record-show-border":d.colorBorderSecondary,"--payment-record-show-border-strong":d.colorBorder,"--payment-record-show-text":d.colorText,"--payment-record-show-text-secondary":d.colorTextSecondary,"--payment-record-show-text-tertiary":d.colorTextTertiary,"--payment-record-show-primary":d.colorPrimary,"--payment-record-show-primary-bg":d.colorPrimaryBg,"--payment-record-show-success":d.colorSuccess,"--payment-record-show-success-bg":d.colorSuccessBg,"--payment-record-show-warning":d.colorWarning,"--payment-record-show-warning-bg":d.colorWarningBg,"--payment-record-show-radius":`${d.borderRadiusLG}px`,"--payment-record-show-radius-sm":`${d.borderRadius}px`,"--payment-record-show-padding":`${d.padding}px`,"--payment-record-show-padding-lg":`${d.paddingLG}px`,"--payment-record-show-padding-sm":`${d.paddingSM}px`,"--payment-record-show-padding-xs":`${d.paddingXS}px`,"--payment-record-show-font-size-sm":`${d.fontSizeSM}px`,"--payment-record-show-font-size":`${d.fontSize}px`,"--payment-record-show-font-size-lg":`${d.fontSizeLG}px`,"--payment-record-show-box-shadow":d.boxShadowTertiary};return(0,F.jsxs)(oe,{header:(0,F.jsx)(Qe,{title:r,backRoute:o,backLabel:s,documentNumber:L,record:h,loading:y,onPrint:()=>ne(!0),editRoute:u,recordId:e,documentType:m,onConvertToSalesOrder:ge,onConvertToInvoice:I,onCollectPayment:_e,onSharePaymentLink:()=>P(!0)}),children:[(0,F.jsx)(i,{title:L||r}),(0,F.jsx)(`style`,{children:`
                .payment-record-show {
                    min-height: calc(100vh - 64px);
                    background: var(--payment-record-show-bg);
                    color: var(--payment-record-show-text);
                    padding: var(--payment-record-show-padding);
                }

                .payment-record-show__shell {
                    display: flex;
                    flex-direction: column;
                    gap: var(--payment-record-show-padding);
                    max-width: 1600px;
                    margin: 0 auto;
                }

                .payment-record-show__header-card.ant-card,
                .payment-record-show__rail-card.ant-card,
                .payment-record-show__card.ant-card,
                .payment-record-show__summary-card.ant-card {
                    border-color: var(--payment-record-show-border);
                    border-radius: var(--payment-record-show-radius);
                    box-shadow: var(--payment-record-show-box-shadow);
                    overflow: hidden;
                }

                .payment-record-show__header-card .ant-card-body {
                    padding: var(--payment-record-show-padding-sm) var(--payment-record-show-padding);
                }

                .payment-record-show__header {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: var(--payment-record-show-padding);
                }

                .payment-record-show__header-left {
                    min-width: 0;
                    display: flex;
                    align-items: center;
                    gap: var(--payment-record-show-padding-sm);
                }

                .payment-record-show__title-wrap {
                    min-width: 0;
                    display: flex;
                    flex-direction: column;
                    gap: 4px;
                }

                .payment-record-show__title-wrap h4 {
                    margin: 0 !important;
                    line-height: 1.2 !important;
                }

                .payment-record-show__body {
                    display: grid;
                    grid-template-columns: 300px minmax(0, 1fr);
                    gap: var(--payment-record-show-padding);
                    align-items: start;
                }

                .payment-record-show__rail {
                    position: sticky;
                    top: var(--payment-record-show-padding);
                    min-width: 0;
                }

                .payment-record-show__rail-card .ant-card-body {
                    padding: var(--payment-record-show-padding);
                    display: flex;
                    flex-direction: column;
                    gap: var(--payment-record-show-padding-sm);
                }

                .payment-record-show__doc-icon {
                    width: 44px;
                    height: 44px;
                    border-radius: 999px;
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    background: var(--payment-record-show-primary-bg);
                    color: var(--payment-record-show-primary);
                    font-size: 20px;
                }

                .payment-record-show__rail-heading {
                    display: flex;
                    flex-direction: column;
                    gap: 2px;
                    padding-bottom: var(--payment-record-show-padding-sm);
                    border-bottom: 1px solid var(--payment-record-show-border);
                }

                .payment-record-show__rail-heading h4 {
                    margin: 0 !important;
                    font-size: 18px !important;
                    line-height: 1.25 !important;
                    word-break: break-word;
                }

                .payment-record-show__rail-party {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    min-width: 0;
                    padding: 10px 12px;
                    border: 1px solid var(--payment-record-show-border);
                    border-radius: var(--payment-record-show-radius-sm);
                    background: var(--payment-record-show-surface-muted);
                }

                .payment-record-show__amount-box {
                    padding: var(--payment-record-show-padding-sm);
                    border-radius: var(--payment-record-show-radius-sm);
                    background: var(--payment-record-show-primary-bg);
                    border: 1px solid color-mix(in srgb, var(--payment-record-show-primary) 20%, transparent);
                    display: flex;
                    flex-direction: column;
                    gap: 2px;
                }

                .payment-record-show__amount-box strong {
                    font-size: 22px;
                    line-height: 1.15;
                    color: var(--payment-record-show-primary);
                }

                .payment-record-show__main {
                    min-width: 0;
                    display: flex;
                    flex-direction: column;
                    gap: var(--payment-record-show-padding);
                }

                .payment-record-show__summary {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
                    gap: var(--payment-record-show-padding-sm);
                }

                .payment-record-show__summary-card .ant-card-body {
                    min-height: 96px;
                    padding: var(--payment-record-show-padding);
                    display: flex;
                    align-items: flex-start;
                    gap: var(--payment-record-show-padding-sm);
                }

                .payment-record-show__summary-card {
                    position: relative;
                }

                .payment-record-show__summary-card::before {
                    content: '';
                    position: absolute;
                    inset-inline: 0;
                    top: 0;
                    height: 3px;
                    background: var(--payment-record-show-primary);
                }

                .payment-record-show__summary-card.is-success::before {
                    background: var(--payment-record-show-success);
                }

                .payment-record-show__summary-card.is-warning::before {
                    background: var(--payment-record-show-warning);
                }

                .payment-record-show__summary-card.is-muted::before {
                    background: var(--payment-record-show-border-strong);
                }

                .payment-record-show__summary-icon {
                    width: 36px;
                    height: 36px;
                    border-radius: 999px;
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    color: var(--payment-record-show-primary);
                    background: var(--payment-record-show-primary-bg);
                    flex: 0 0 auto;
                    font-size: 17px;
                }

                .payment-record-show__summary-card.is-success .payment-record-show__summary-icon {
                    color: var(--payment-record-show-success);
                    background: var(--payment-record-show-success-bg);
                }

                .payment-record-show__summary-card.is-warning .payment-record-show__summary-icon {
                    color: var(--payment-record-show-warning);
                    background: var(--payment-record-show-warning-bg);
                }

                .payment-record-show__summary-card.is-muted .payment-record-show__summary-icon {
                    color: var(--payment-record-show-text-secondary);
                    background: var(--payment-record-show-surface-soft);
                }

                .payment-record-show__summary-content {
                    min-width: 0;
                    display: flex;
                    flex-direction: column;
                    gap: 4px;
                }

                .payment-record-show__summary-content strong {
                    font-size: 20px;
                    line-height: 1.2;
                    color: var(--payment-record-show-text);
                }

                .payment-record-show__card .ant-card-head {
                    min-height: 44px;
                    padding: 0 var(--payment-record-show-padding);
                    border-bottom: 1px solid var(--payment-record-show-border);
                    background: var(--payment-record-show-surface-elevated);
                }

                .payment-record-show__card .ant-card-head-title {
                    font-size: var(--payment-record-show-font-size);
                    font-weight: 700;
                }

                .payment-record-show__card .ant-card-body {
                    padding: var(--payment-record-show-padding);
                    min-width: 0;
                }

                .payment-record-show__info {
                    display: grid;
                    grid-template-columns: repeat(2, minmax(0, 1fr));
                    border: 1px solid var(--payment-record-show-border);
                    border-radius: var(--payment-record-show-radius-sm);
                    overflow: hidden;
                    background: var(--payment-record-show-surface);
                }

                .payment-record-show__info.is-compact {
                    grid-template-columns: 1fr;
                }

                .payment-record-show__info-row {
                    min-width: 0;
                    display: grid;
                    grid-template-columns: 140px minmax(0, 1fr);
                    border-bottom: 1px solid var(--payment-record-show-border);
                }

                .payment-record-show__info:not(.is-compact) .payment-record-show__info-row:nth-last-child(-n + 2) {
                    border-bottom: 0;
                }

                .payment-record-show__info.is-compact .payment-record-show__info-row:last-child {
                    border-bottom: 0;
                }

                .payment-record-show__info-row:nth-child(odd) {
                    border-right: 1px solid var(--payment-record-show-border);
                }

                .payment-record-show__info.is-compact .payment-record-show__info-row {
                    grid-template-columns: 112px minmax(0, 1fr);
                    border-right: 0;
                }

                .payment-record-show__info-label,
                .payment-record-show__info-value {
                    min-width: 0;
                    padding: 9px 11px;
                    font-size: var(--payment-record-show-font-size-sm);
                    line-height: 1.35;
                    word-break: break-word;
                }

                .payment-record-show__info-label {
                    color: var(--payment-record-show-text-secondary);
                    background: var(--payment-record-show-surface-muted);
                    font-weight: 600;
                    border-right: 1px solid var(--payment-record-show-border);
                }

                .payment-record-show__info-value {
                    color: var(--payment-record-show-text);
                    background: var(--payment-record-show-surface);
                }

                .payment-record-show .ant-table {
                    font-size: var(--payment-record-show-font-size-sm);
                }

                .payment-record-show .ant-table-wrapper .ant-table-container {
                    border-radius: var(--payment-record-show-radius-sm);
                    overflow: hidden;
                }

                .payment-record-show .ant-table-wrapper .ant-table-thead > tr > th {
                    padding: 9px 11px !important;
                    background: var(--payment-record-show-surface-muted) !important;
                    border-color: var(--payment-record-show-border) !important;
                    color: var(--payment-record-show-text-secondary) !important;
                    font-weight: 700;
                    white-space: nowrap;
                }

                .payment-record-show .ant-table-wrapper .ant-table-tbody > tr > td,
                .payment-record-show .ant-table-wrapper .ant-table-summary > tr > td {
                    padding: 9px 11px !important;
                    border-color: var(--payment-record-show-border) !important;
                }

                .payment-record-show__table-row.is-alt > td {
                    background: var(--payment-record-show-surface-muted);
                }

                .payment-record-show .ant-table-wrapper .ant-table-summary > tr > td {
                    background: var(--payment-record-show-surface-soft);
                    font-weight: 700;
                }

                .payment-record-show__rich-text {
                    font-size: var(--payment-record-show-font-size-sm);
                    line-height: 1.55;
                    color: var(--payment-record-show-text);
                }

                .payment-record-show__rich-text p {
                    margin: 0 0 8px;
                }

                .payment-record-show__rich-text ul,
                .payment-record-show__rich-text ol {
                    margin: 0 0 8px 18px;
                    padding: 0;
                }

                .payment-record-show__state {
                    padding: var(--payment-record-show-padding-lg);
                    background: var(--payment-record-show-surface);
                    border: 1px solid var(--payment-record-show-border);
                    border-radius: var(--payment-record-show-radius);
                    box-shadow: var(--payment-record-show-box-shadow);
                }

                @media (max-width: 1100px) {
                    .payment-record-show__body {
                        grid-template-columns: 1fr;
                    }

                    .payment-record-show__rail {
                        position: static;
                    }

                    .payment-record-show__rail-card .ant-card-body {
                        display: grid;
                        grid-template-columns: auto minmax(0, 1fr);
                        align-items: start;
                    }

                    .payment-record-show__rail-heading,
                    .payment-record-show__rail-party,
                    .payment-record-show__amount-box,
                    .payment-record-show__info {
                        grid-column: 1 / -1;
                    }
                }

                @media (max-width: 768px) {
                    .payment-record-show {
                        padding: var(--payment-record-show-padding-sm);
                    }

                    .payment-record-show__header {
                        align-items: stretch;
                        flex-direction: column;
                    }

                    .payment-record-show__header-left {
                        align-items: flex-start;
                    }

                    .payment-record-show__summary {
                        grid-template-columns: 1fr;
                    }

                    .payment-record-show__info {
                        grid-template-columns: 1fr;
                    }

                    .payment-record-show__info-row,
                    .payment-record-show__info.is-compact .payment-record-show__info-row {
                        grid-template-columns: 1fr;
                    }

                    .payment-record-show__info-row:nth-child(odd) {
                        border-right: 0;
                    }

                    .payment-record-show__info-label {
                        border-right: 0;
                        border-bottom: 1px solid var(--payment-record-show-border);
                    }

                    .payment-record-show__info:not(.is-compact) .payment-record-show__info-row:nth-last-child(-n + 2) {
                        border-bottom: 1px solid var(--payment-record-show-border);
                    }

                    .payment-record-show__info:not(.is-compact) .payment-record-show__info-row:last-child {
                        border-bottom: 0;
                    }
                }
            `}),(0,F.jsx)(`div`,{className:`payment-record-show`,style:K,children:(0,F.jsx)(`div`,{className:`payment-record-show__shell`,children:y?(0,F.jsx)(`div`,{className:`payment-record-show__state`,children:(0,F.jsx)(f,{active:!0,paragraph:{rows:10}})}):x?(0,F.jsx)(`div`,{className:`payment-record-show__state`,children:(0,F.jsx)(l,{type:`warning`,showIcon:!0,message:x,description:`The document layout is ready, but this record could not be loaded from the current API response.`})}):h?(0,F.jsxs)(`div`,{className:`payment-record-show__body`,children:[(0,F.jsx)(Xe,{title:r,documentNumber:L,total:ye,rows:z,party:W}),(0,F.jsxs)(`main`,{className:`payment-record-show__main`,children:[h?.void&&(0,F.jsx)(l,{type:`error`,showIcon:!0,icon:(0,F.jsx)(de,{}),message:`This transaction has been voided`,description:h?.voided_reason?`Reason: ${h.voided_reason}`:`This transaction is voided and cannot be edited or approved.`,style:{marginBottom:0}}),!h?.void&&h?.approved!==!0&&(0,F.jsx)(l,{type:`warning`,showIcon:!0,icon:(0,F.jsx)(ce,{}),message:`This transaction is still in draft and has not been approved.`,description:`Approve it to assign the final document number and finalize it.`,action:(0,F.jsx)(g,{size:`small`,type:`primary`,icon:(0,F.jsx)(E,{}),onClick:()=>k(!0),children:`Approve`}),style:{marginBottom:0}}),(0,F.jsx)(Ze,{items:V}),(0,F.jsx)(v,{title:`${r} Details`,className:`payment-record-show__card`,children:(0,F.jsx)(Ye,{rows:be})}),(0,F.jsx)(v,{title:`Record Info`,className:`payment-record-show__card`,size:`small`,children:(0,F.jsx)(A,{record:h})}),U]})]}):(0,F.jsx)(`div`,{className:`payment-record-show__state`,children:(0,F.jsx)(p,{description:`${r} not found`})})})}),(0,F.jsx)(j,{open:fe,module:m,transactionId:h?.id,onApprove:he,confirmLoading:pe,onCancel:()=>k(!1)}),m===`invoice`&&(0,F.jsx)(at,{open:me,onClose:()=>P(!1),invoiceId:e,invoiceNo:L,currency:h?.currency}),(0,F.jsx)(ee,{title:`Print Preview`,open:S,onClose:()=>ne(!1),width:900,destroyOnClose:!1,styles:{body:{background:d.colorBgLayout,padding:16}},children:xe.has(m)?ie?(0,F.jsx)(f,{active:!0,paragraph:{rows:12}}):h?(0,F.jsx)(Je,{record:h,documentType:m,title:r,template:re,templateError:se,companyInfo:D,paymentLinkData:ue}):(0,F.jsx)(p,{description:`No record found for printing`}):(0,F.jsx)(l,{type:`warning`,showIcon:!0,message:`Unsupported document type`,description:`Printing is configured for Quotation, Proforma Invoice, Sales Order, Invoice, Payment, and Credit Note. Current type: ${c}`})})]})}export{Y as approvalTag,J as cleanStatusTag,ot as default,W as formatDate,q as formatMoney,G as getRelationName};