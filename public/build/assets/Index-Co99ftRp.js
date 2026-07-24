import{i as e}from"./rolldown-runtime-aKtaBQYM.js";import{i as t,t as n}from"./index.esm-CtIVDvdE.js";import{r,t as i}from"./jsx-runtime-RbF_zoRI.js";import{t as a}from"./typography-BTjN9rxU.js";import{t as o}from"./dayjs.min-BRtZKQ04.js";import{n as s,t as c}from"./row-3lWxq59F.js";import{t as l}from"./tag-Dh3NArqV.js";import{t as u}from"./ReusableCrud-hdcDvsu0.js";import{t as d}from"./AuthenticatedLayout-pySdsG0n.js";import{t as f}from"./ShoppingOutlined-BNuAmqdF.js";import{i as p,n as m,o as h,r as g,t as _}from"./index.esm-CBn_TnkU.js";var v=e(r(),1),y=e(o(),1),b=i(),{Text:x}=a,S=``,C=e=>`${S}${e}`,w=e=>{let t=Number(e);return Number.isFinite(t)?t:0},T=e=>e==null||e===``?null:typeof e==`object`?e.id??e.value??null:e,E=e=>w(e).toLocaleString(`en-NP`,{minimumFractionDigits:2,maximumFractionDigits:2}),D=e=>{if(!e)return null;if(y.default.isDayjs(e))return e.isValid()?e.format(`YYYY-MM-DD`):null;let t=(0,y.default)(e,[`YYYY-MM-DD`,`DD-MM-YYYY`],!0);if(t.isValid())return t.format(`YYYY-MM-DD`);let n=(0,y.default)(e);return n.isValid()?n.format(`YYYY-MM-DD`):null},O=e=>{let t=D(e);return t?(0,y.default)(t).format(`DD-MM-YYYY`):`-`},k={draft:`default`,confirmed:`blue`,cancelled:`red`},A={id:void 0,product_id:null,custom_product_name:``,description:``,qty:1,unit_price:0,discount_percent:0,tax_rate_id:null,tax_amount:0,line_total:0},j=(e={})=>{let t=w(e.qty)*w(e.unit_price),n=t*w(e.discount_percent)/100;return Math.max(t-n,0)+w(e.tax_amount)},M=(e=[])=>{let t=0,n=0,r=0,i=0,a=0;return e.forEach(e=>{let o=w(e.qty)*w(e.unit_price),s=o*w(e.discount_percent)/100,c=Math.max(o-s,0),l=w(e.tax_amount);t+=o,n+=s,a+=l,T(e.tax_rate_id)||l>0?r+=c:i+=c}),{subTotal:t,discount:n,nonTaxableTotal:i,taxableTotal:r,vat:a,grandTotal:t-n+a}},N=(e={})=>{let t={...e.id?{id:e.id}:{},product_id:T(e.product_id??e.product),custom_product_name:e.custom_product_name||``,description:e.description||``,qty:w(e.qty),unit_price:w(e.unit_price),discount_percent:w(e.discount_percent),tax_rate_id:T(e.tax_rate_id??e.taxRate??e.tax_rate),tax_amount:w(e.tax_amount)};return t.line_total=Number(j(t).toFixed(2)),t},P=({values:e={}})=>{let t=M(e.items||[]);return(0,b.jsxs)(c,{gutter:[16,16],style:{marginTop:8},children:[(0,b.jsx)(s,{xs:24,lg:12,children:(0,b.jsx)(`div`,{})}),(0,b.jsx)(s,{xs:24,lg:12,children:(0,b.jsxs)(`div`,{className:`po-total-card`,children:[(0,b.jsxs)(`div`,{className:`po-total-row`,children:[(0,b.jsx)(`span`,{children:`Sub Total`}),(0,b.jsx)(`strong`,{children:E(t.subTotal)})]}),(0,b.jsxs)(`div`,{className:`po-total-row`,children:[(0,b.jsx)(`span`,{children:`Discount`}),(0,b.jsx)(`strong`,{children:t.discount>0?E(t.discount):`-`})]}),(0,b.jsxs)(`div`,{className:`po-total-row`,children:[(0,b.jsx)(`span`,{children:`Non-Taxable Total`}),(0,b.jsx)(`strong`,{children:t.nonTaxableTotal>0?E(t.nonTaxableTotal):`-`})]}),(0,b.jsxs)(`div`,{className:`po-total-row`,children:[(0,b.jsx)(`span`,{children:`Taxable Total`}),(0,b.jsx)(`strong`,{children:t.taxableTotal>0?E(t.taxableTotal):`-`})]}),(0,b.jsxs)(`div`,{className:`po-total-row`,children:[(0,b.jsx)(`span`,{children:`VAT`}),(0,b.jsx)(`strong`,{children:t.vat>0?E(t.vat):`-`})]}),(0,b.jsxs)(`div`,{className:`po-total-row po-total-grand`,children:[(0,b.jsx)(`span`,{children:`Grand Total`}),(0,b.jsx)(`strong`,{children:E(t.grandTotal)})]})]})})]})},F=e=>{if(e){if(typeof route==`function`){t.visit(route(`payment-out.purchase-orders.show`,e));return}t.visit(`/payment-out/purchase-orders/${e}`)}};function I({auth:e}){let t=(0,v.useMemo)(()=>[{title:`Order No`,dataIndex:`purchase_order_no`,key:`purchase_order_no`,sorter:!0,width:150,render:e=>(0,b.jsx)(x,{strong:!0,children:e||`DRAFT`})},{title:`Supplier`,dataIndex:[`contact`,`name`],key:`contact_name`,render:(e,t)=>e||t?.contact_name||t?.contact_id_detail?.label||`-`},{title:`Date`,dataIndex:`purchase_order_date`,key:`purchase_order_date`,sorter:!0,width:130,render:O},{title:`Status`,dataIndex:`status`,key:`status`,width:130,render:e=>(0,b.jsx)(l,{color:k[e]||`default`,style:{textTransform:`capitalize`},children:e||`draft`})},{title:`Exchange Rate`,dataIndex:`exchange_rate`,key:`exchange_rate`,width:140,render:e=>E(e)},{title:`Total`,dataIndex:`total`,key:`total`,sorter:!0,align:`right`,width:150,render:e=>(0,b.jsx)(x,{strong:!0,children:E(e)})}],[]),r=(0,v.useMemo)(()=>[{name:`contact_id`,label:`Supplier Name`,type:`fkSelect`,required:!0,col:16,placeholder:`Select Supplier`,fkUrl:C(`/api/contacts/`),fkSearchParam:`search`,fkPageSize:20,fkValueKey:`id`,fkLabelKey:`name`,fkExtraParams:{contact_type:`supplier`,accept_purchase:!0}},{name:`reference_no`,label:`Reference No`,type:`text`,col:8,placeholder:`Reference Number`},{name:`purchase_order_no`,label:`Order Number`,type:`text`,col:8,placeholder:`DRAFT`,disabled:!0},{name:`purchase_order_date`,label:`Date`,type:`datePicker`,required:!0,col:8,format:`DD-MM-YYYY`},{name:`credit_term_id`,label:`Credit Terms`,type:`fkSelect`,col:8,placeholder:`Credit Terms`,fkUrl:C(`/api/credit-terms/`),fkSearchParam:`search`,fkPageSize:20,fkValueKey:`id`,fkLabelKey:`name`},{name:`currency_id`,label:`Currency`,type:`fkSelect`,col:8,placeholder:`Currency`,fkUrl:C(`/api/currencies/`),fkSearchParam:`search`,fkPageSize:20,fkValueKey:`id`,fkLabelKey:`name`,fkLabel:e=>e?.name||e?.code||``},{name:`exchange_rate`,label:`Exchange Rate`,type:`number`,required:!0,col:8,min:0},{name:`status`,label:`Status`,type:`select`,col:8,hidden:!0,options:[{value:`draft`,label:`Draft`},{value:`confirmed`,label:`Confirmed`},{value:`cancelled`,label:`Cancelled`}]},{name:`approved`,label:`Approved`,type:`switch`,col:6,hidden:!0},{name:`items`,label:``,type:`objectArray`,col:24,addButtonLabel:`Add Code or Product`,defaultItem:{...A},headerBg:`#4b5563`,headerColor:`#ffffff`,columns:[{key:`product_id`,name:`product_id`,label:`Product / service`,type:`fkSelect`,width:`minmax(340px, 3fr)`,placeholder:`Add Code or Product`,fkUrl:C(`/api/products/search`),fkSearchParam:`search`,fkPageSize:20,fkValueKey:`id`,fkLabelKey:`label`},{key:`custom_product_name`,name:`custom_product_name`,label:`Name`,type:`text`,width:`180px`,placeholder:`Custom name`},{key:`description`,name:`description`,label:`Description`,type:`text`,width:`220px`,placeholder:`Description`},{key:`qty`,name:`qty`,label:`Qty`,type:`number`,width:`90px`,min:0},{key:`unit_price`,name:`unit_price`,label:`Rate`,type:`number`,width:`120px`,min:0},{key:`discount_percent`,name:`discount_percent`,label:`Discount`,type:`number`,width:`110px`,min:0,max:100},{key:`tax_rate_id`,name:`tax_rate_id`,label:`Tax`,type:`fkSelect`,width:`140px`,placeholder:`No VAT`,fkUrl:C(`/api/tax-rates/`),fkSearchParam:`search`,fkPageSize:20,fkValueKey:`id`,fkLabelKey:`name`},{key:`tax_amount`,name:`tax_amount`,label:`Tax Amt`,type:`number`,width:`110px`,min:0},{key:`line_total`,name:`line_total`,label:`Amount`,type:`number`,width:`130px`,min:0,disabled:!0,formula:e=>Number(j(e).toFixed(2))}]},{name:`notes`,label:`Notes`,type:`textarea`,col:12,rows:5,placeholder:`Notes`,help:`This will appear on print`},{name:`_purchase_totals`,label:``,type:`custom`,col:24,render:({values:e})=>(0,b.jsx)(P,{values:e})}],[]),i=(0,v.useMemo)(()=>m().shape({contact_id:h().test(`supplier-required`,`Supplier is required`,e=>!!T(e)).required(`Supplier is required`),purchase_order_date:h().required(`Date is required`),exchange_rate:g().typeError(`Exchange rate is required`).moreThan(0,`Exchange rate must be greater than 0`).required(`Exchange rate is required`),items:_().of(m().shape({product_id:h().nullable(),custom_product_name:p().nullable(),qty:g().typeError(`Qty must be a number`).moreThan(0,`Qty must be greater than 0`).required(`Qty is required`),unit_price:g().typeError(`Rate must be a number`).min(0,`Rate cannot be negative`).required(`Rate is required`),discount_percent:g().typeError(`Discount must be a number`).min(0).max(100).nullable(),tax_amount:g().typeError(`Tax amount must be a number`).min(0).nullable()}).test(`product-or-custom-name`,`Product / service is required`,e=>!!T(e?.product_id)||!!String(e?.custom_product_name||``).trim())).min(1,`At least one product / service is required`).required(`At least one product / service is required`)}),[]),a=(0,v.useMemo)(()=>({purchase_order_no:`DRAFT`,reference_no:``,purchase_order_date:(0,y.default)(),status:`draft`,approved:!1,contact_id:null,currency_id:null,credit_term_id:null,exchange_rate:1,notes:``,items:[{...A}],deleted_item_ids:[]}),[]);return(0,b.jsxs)(d,{auth:e,children:[(0,b.jsx)(n,{title:`Purchase Orders`}),(0,b.jsx)(`style`,{children:`
          .purchase-order-crud .ant-drawer-content {
            background: #f8fafc;
          }

          .purchase-order-crud .ant-drawer-header {
            min-height: 38px;
            padding: 0 14px;
            border-bottom: 1px solid #d9dee7;
            background: #ffffff;
          }

          .purchase-order-crud .ant-drawer-title {
            font-size: 14px;
            font-weight: 700;
            color: #1f2937;
          }

          .purchase-order-crud .ant-drawer-body {
            padding: 12px 14px 24px;
            background: #ffffff;
          }

          .purchase-order-crud .ant-form-item {
            margin-bottom: 12px;
          }

          .purchase-order-crud .ant-form-item-label {
            padding-bottom: 3px;
          }

          .purchase-order-crud .ant-form-item-label > label {
            height: auto;
            font-size: 12px;
            font-weight: 600;
            color: #1f2937;
          }

          .purchase-order-crud .ant-input,
          .purchase-order-crud .ant-input-number,
          .purchase-order-crud .ant-picker,
          .purchase-order-crud .ant-select-selector {
            min-height: 31px;
            border-radius: 0 !important;
            border-color: #cbd5e1 !important;
            box-shadow: none !important;
          }

          .purchase-order-crud .ant-input-number {
            width: 100%;
          }

          .purchase-order-crud textarea.ant-input {
            min-height: 76px;
          }

          .purchase-order-crud .ant-input[disabled],
          .purchase-order-crud .ant-input-number-disabled,
          .purchase-order-crud .ant-select-disabled .ant-select-selector {
            color: #111827;
            background: #eef2f7 !important;
          }

          .purchase-order-crud .ant-btn-primary {
            min-width: 88px;
            height: 31px;
            border-radius: 0;
            background: #16a34a;
            border-color: #16a34a;
            font-weight: 700;
          }

          .purchase-order-crud .ant-btn-primary:hover {
            background: #15803d !important;
            border-color: #15803d !important;
          }

          .purchase-order-crud .ant-table-thead > tr > th {
            background: #4b5563 !important;
            color: #ffffff !important;
            font-size: 12px;
            font-weight: 700;
          }

          .purchase-order-crud .ant-table-tbody > tr > td {
            padding: 7px 10px;
          }

          .po-total-card {
            border: 1px solid #d8dee8;
            background: #eef2f8;
          }

          .po-total-row {
            display: flex;
            justify-content: space-between;
            gap: 16px;
            padding: 9px 12px;
            font-size: 13px;
            color: #111827;
          }

          .po-total-row strong {
            font-weight: 600;
          }

          .po-total-grand {
            margin-top: 8px;
            padding-top: 14px;
            padding-bottom: 14px;
            border-top: 1px solid #d8dee8;
            font-size: 15px;
            font-weight: 700;
          }

          .po-total-grand strong {
            font-size: 18px;
          }
        `}),(0,b.jsx)(u,{className:`purchase-order-crud`,drawerClassName:`purchase-order-crud`,title:`Purchase Orders`,addTitle:`Add New Purchase Order`,editTitle:`Edit Purchase Order`,icon:(0,b.jsx)(f,{}),apiUrl:C(`/api/purchase-orders/`),bulkActions:{approve:!0,void:!0,export:!0},columns:t,fields:r,validationSchema:i,crudInitialValues:a,transformPayload:(e={})=>{let t=(Array.isArray(e.items)?e.items:[]).map(N).filter(e=>!!T(e.product_id)||!!String(e.custom_product_name||``).trim());return{purchase_order_no:e.purchase_order_no&&e.purchase_order_no!==`DRAFT`?e.purchase_order_no:null,reference_no:e.reference_no?.trim()||null,purchase_order_date:D(e.purchase_order_date),status:e.status||`draft`,approved:!!e.approved,contact_id:T(e.contact_id??e.contact),currency_id:T(e.currency_id??e.currency),credit_term_id:T(e.credit_term_id??e.creditTerm??e.credit_term),exchange_rate:w(e.exchange_rate)||1,notes:e.notes?.trim()||null,items:t,deleted_item_ids:Array.isArray(e.deleted_item_ids)?e.deleted_item_ids.filter(Boolean):[]}},form_ui:`drawer`,ui_type:`add form`,drawerWidth:`100vw`,searchParam:`search`,pageParam:`page`,pageSizeParam:`page_size`,sortMode:`ordering`,orderingParam:`ordering`,enableServerPagination:!0,showSearch:!0,canAdd:!0,canEdit:!0,canDelete:!0,showViewColumn:!0,hasActions:!0,hasActionColumns:!0,viewPathBuilder:e=>typeof route==`function`?route(`payment-out.purchase-orders.show`,e.id):`/payment-out/purchase-orders/${e.id}`,onAddSuccess:e=>{e?.id&&F(e.id)},onEditSuccess:e=>{e?.id&&F(e.id)},activeTableRowFunction:e=>({onClick:t=>{t.target.closest(`button,a,input,textarea,.ant-checkbox-wrapper,.ant-dropdown-trigger,.ant-select,.ant-picker,.ant-btn`)||F(e.id)},style:{cursor:`pointer`}}),anchorFilters:[{key:`approved`,label:`Approved`,params:{approved:!0}},{key:`draft`,label:`Draft`,params:{approved:!1}},{key:`all`,label:`All`,params:{}}],defaultAnchorKey:`approved`,anchorSyncWithHash:!0})]})}export{I as default};