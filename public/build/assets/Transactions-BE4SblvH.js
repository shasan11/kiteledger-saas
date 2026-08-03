import{i as e}from"./rolldown-runtime-aKtaBQYM.js";import{t}from"./axios-BQPRRFHk.js";import{r as n,t as r}from"./jsx-runtime-RbF_zoRI.js";import{t as i}from"./table-Dr8iJ0aG.js";import{i as a,r as o}from"./ColorPresets-D_vPkgC3.js";import{t as s}from"./typography-BlWmaYWr.js";import{t as c}from"./DownOutlined-Bjjb3wIG.js";import{t as l}from"./auto-complete-y2D0V4TK.js";import{t as u}from"./tooltip-DRvKpi-S.js";import{t as d}from"./button-B6mwfiyB.js";import{t as f}from"./dayjs.min-BRtZKQ04.js";import{t as p}from"./PlusOutlined-oShiVD3P.js";import{t as m}from"./card-C0Xr1RgP.js";import{n as h,t as g}from"./row-DiFu7gfS.js";import{t as _}from"./input-number-BeN5afQA.js";import{t as v}from"./space-BXAcXX1Q.js";import{t as y}from"./descriptions-ccrgriAr.js";import{t as b}from"./form-2ArTh_iR.js";import{t as x}from"./input-Cwev0fuk.js";import{t as S}from"./tag-KfHE2k4Q.js";import{t as C}from"./DeleteOutlined-CjnT_w1K.js";import{r as w}from"./TransactionFormShell-BwbFWoDu.js";import{t as T}from"./esm-BVVJhAIV.js";var E=e(n(),1),D=r(),O=``,k=()=>{let e=typeof window<`u`?localStorage.getItem(`accessToken`):null;return{Accept:`application/json`,...e?{Authorization:`Bearer ${e}`}:{}}},A=(e,t={})=>{let n=/^https?:\/\//i.test(e)?e:`${O}${e}`,r=Object.entries(t).filter(([,e])=>e!=null&&e!==``).map(([e,t])=>`${encodeURIComponent(e)}=${encodeURIComponent(t)}`).join(`&`);return r?n.includes(`?`)?`${n}&${r}`:`${n}?${r}`:n},j=e=>{let t=Number(e);return Number.isFinite(t)?t.toLocaleString(`en-NP`,{minimumFractionDigits:2,maximumFractionDigits:2}):``},M=e=>{if(!e)return``;let t=new Date(e);return Number.isNaN(t.getTime())?String(e):t.toLocaleDateString(`en-GB`,{day:`2-digit`,month:`short`,year:`numeric`})};function N({value:e,onChange:n,sources:r=[],onPick:i,placeholder:a=`Search reference…`,disabled:o=!1,style:s,allowFreeText:c=!0}){let[u,d]=(0,E.useState)([]),[f,p]=(0,E.useState)(!1),m=(0,E.useRef)(null),h=(0,E.useRef)(0),g=(0,E.useRef)({}),_=async(e=``)=>{let n=++h.current;p(!0);try{let i=await Promise.all((r||[]).map(async n=>{try{let r=A(n.url,{[n.searchParam||`search`]:e,page:1,page_size:n.pageSize||10,active:!0,...n.extraParams||{}}),i=(await t.get(r,{headers:k()}))?.data;return{src:n,rows:Array.isArray(i?.results)?i.results:Array.isArray(i?.data)?i.data:Array.isArray(i)?i:[]}}catch{return{src:n,rows:[]}}}));if(n!==h.current)return;let a=[],o={};i.forEach(({src:e,rows:t})=>{t.forEach(t=>{let n=t[e.numberField]||t.number||t.code||`#${t.id}`,r=e.contactField&&(t[e.contactField]?.name||t[`${e.contactField}_name`])||``,i=e.dateField?M(t[e.dateField]||``):``,s=e.totalField?t[e.totalField]:null,c=[`${e.label}: ${n}`];r&&c.push(r),i&&c.push(i),s!=null&&c.push(j(s));let l=c.join(` • `),u=`${e.key||e.label}:${t.id}`;o[u]={record:t,source:e},a.push({value:u,label:l,raw:t,source:e})})}),g.current=o,d(a)}finally{n===h.current&&p(!1)}};return(0,D.jsx)(l,{value:e||``,options:u,onSearch:e=>{m.current&&clearTimeout(m.current),m.current=setTimeout(()=>_(e||``),300)},onChange:e=>{c&&typeof n==`function`&&n(e)},onSelect:e=>{let t=g.current[e];if(!t)return;let{record:r,source:a}=t,o=r[a.numberField]||r.number||r.code||``;typeof n==`function`&&n(o),typeof i==`function`&&i(r,a)},onFocus:()=>{u.length||_(``)},placeholder:a,disabled:o,style:s,notFoundContent:f?`Searching…`:`No matches`,filterOption:!1,children:(0,D.jsx)(x,{allowClear:!0})})}var P=e(f(),1),F=e=>{let t=Number(e);return Number.isFinite(t)?t:0},I=e=>Number(F(e).toFixed(2)),L=e=>e==null||e===``?null:typeof e==`object`?e.id??e.value??null:e,R=e=>e==null?``:String(e),z=e=>e==null||e===``?null:e,B=e=>{if(!e)return null;if(P.default.isDayjs(e))return e.isValid()?e.format(`YYYY-MM-DD`):null;let t=(0,P.default)(e,[`YYYY-MM-DD`,`DD-MM-YYYY`],!0);if(t.isValid())return t.format(`YYYY-MM-DD`);let n=(0,P.default)(e);return n.isValid()?n.format(`YYYY-MM-DD`):null},V=e=>{if(!e)return null;if(P.default.isDayjs(e))return e;let t=(0,P.default)(e,[`YYYY-MM-DD`,`DD-MM-YYYY`]);return t.isValid()?t:null},H=e=>!e||typeof e!=`object`?0:F(e.rate_percent??e.ratePercent??e.rate??0),U=e=>!e||typeof e!=`object`?null:e.tax_jurisdiction_id??e.taxJurisdiction?.id??e.tax_jurisdiction?.id??null,W=e=>!e||typeof e!=`object`?!1:e.inclusive===!0||e.inclusive===1||e.inclusive===`1`,G=e=>!e||typeof e!=`object`?null:e.name||e.code||null,K=(e={})=>{let t=I(F(e.qty)*F(e.unit_price??e.rate)),n=I(t*Math.min(Math.max(F(e.discount_percent),0),100)/100),r=Math.max(t-n,0),i=typeof e.tax_rate_id==`object`?e.tax_rate_id:e.taxRate||e.tax_rate||null,a=H(i),o=0,s=r;a>0&&(W(i)?(o=I(r-r/(1+a/100)),s=r):(o=I(r*a/100),s=r+o));let c=W(i)&&a>0?I(r-o):r;return{gross:I(t),discount_amount:n,tax_jurisdiction_id:U(i),tax_amount:o,taxable_amount:I(c),tax_breakup:a>0?JSON.stringify({tax_rate_id:L(i),tax_name:G(i),rate_percent:I(a),inclusive:W(i),taxable_amount:c,tax_amount:o}):null,line_total:I(s)}},q=(e=[])=>{let t=0,n=0,r=0,i=0,a=0,o=0;return(e||[]).forEach(e=>{if(!e)return;let s=K(e);t+=s.gross,n+=s.discount_amount,a+=s.tax_amount,s.tax_amount>0?r+=s.taxable_amount:i+=s.taxable_amount,o+=s.line_total}),{subtotal:I(t),sub_total:I(t),discount_total:I(n),taxable_total:I(r),non_taxable_total:I(i),tax_total:I(a),vat_total:I(a),total:I(o),grand_total:I(o)}},ee=(e={})=>{let t=K(e);return{...e.id?{id:e.id}:{},product_id:L(e.product_id??e.product),product_name:R(e.product_name??e.custom_product_name??``),description:z(e.description),qty:F(e.qty)||0,unit_price:F(e.unit_price),discount_percent:F(e.discount_percent),discount_amount:t.discount_amount,tax_rate_id:L(e.tax_rate_id??e.taxRate??e.tax_rate),tax_jurisdiction_id:t.tax_jurisdiction_id||L(e.tax_jurisdiction_id??e.taxJurisdiction),tax_amount:t.tax_amount,tax_breakup:t.tax_breakup,line_total:t.line_total}},J=e=>F(e).toLocaleString(`en-NP`,{minimumFractionDigits:2,maximumFractionDigits:2}),te={NPR:`रू`,USD:`$`,EUR:`€`,GBP:`£`,INR:`₹`,AUD:`A$`,CAD:`C$`,JPY:`¥`,CNY:`¥`},ne=e=>!e||typeof e!=`object`?``:e.symbol||e.currency_symbol||te[e.code]||e.code||``,Y=(e,t=``)=>{let n=J(e);return t?`${t} ${n}`:n};function re({value:e,detailValue:t,onChange:n,disabled:r=!1,placeholder:i=`No tax`,variant:a=`borderless`,style:o}){return(0,D.jsx)(w,{value:(e&&typeof e==`object`?e.id:e)??null,detailValue:t||(typeof e==`object`?e:null),fkUrl:`/api/tax-rates/`,labelKey:`name`,labelFn:e=>[e?.name,e?.rate_percent?`${Number(e.rate_percent)}%`:null].filter(Boolean).join(` - `),placeholder:i,variant:a,allowClear:!0,disabled:r,style:o,onChange:(e,t)=>n?.(t,U(t))})}function ie({items:e=[],onChange:n,onDeleteExistingId:r,productSearchUrl:o,priceField:s=`selling_price`,currencySymbol:l=``,showDiscount:f=!0,showTax:m=!0,minRow:h=1,quickAddProduct:g=!0,quickAddProductDefaults:v,transactionType:y}){let b=s===`purchase_price`,S=y||(b?`purchase`:`sales`),T={expand:36,product:300,qty:80,rate:130,discount:80,tax:140,taxAmount:110,amount:130,remove:40},O=T.expand+T.product+T.qty+T.rate+(f?T.discount:0)+(m?T.tax:0)+T.taxAmount+T.amount+T.remove,k=v||{allow_sale:!b,allow_purchase:b},[A,j]=(0,E.useState)([]),[M,N]=(0,E.useState)(null);(0,E.useEffect)(()=>{t.get(`/api/tax-settings`).then(({data:e})=>N(e?.data||null)).catch(()=>N(null))},[]);let P=(0,E.useMemo)(()=>M?.enable_tax?S===`purchase`?M.default_purchase_tax_rate||M.default_sales_tax_rate||null:M.default_sales_tax_rate||M.default_purchase_tax_rate||null:null,[S,M]),I=S===`purchase`?M?.allow_purchase_tax_override!==!1:M?.allow_sales_tax_override!==!1,L=e=>e._key||e.id,R=(t,r)=>{let i=e.map((e,n)=>n===t?{...e,...r}:e).map(e=>{let t=K(e);return{...e,tax_amount:t.tax_amount,line_total:t.line_total,discount_amount:t.discount_amount}});n?.(i)},z=()=>({_key:Math.random().toString(36).slice(2),product_id:null,product_detail:null,product_name:``,description:``,qty:1,unit_price:0,discount_percent:0,discount_amount:0,tax_rate_id:P,tax_jurisdiction_id:U(P),tax_amount:0,line_total:0}),B=()=>{n?.([...e,z()])},V=t=>{let i=e[t];i?.id&&typeof r==`function`&&r(i.id);let a=L(i),o=e.filter((e,n)=>n!==t);o.length<h&&o.push(z()),j(e=>e.filter(e=>e!==a)),n?.(o)},H=(t,n,r)=>{if(!r){R(t,{product_id:n,product_detail:null});return}let i=F(r?.[s]??r?.selling_price??r?.sale_price??r?.purchase_price??r?.price??e[t]?.unit_price),a=(r?.default_tax_rate??null)||e[t]?.tax_rate_id||P;R(t,{product_id:n,product_detail:r,product_name:r?.name||r?.label||``,description:e[t]?.description||r?.description||``,unit_price:i,tax_rate_id:a,tax_jurisdiction_id:a?U(a):e[t]?.tax_jurisdiction_id||null})};(0,E.useEffect)(()=>{!P||!e.length||e.some(e=>!e.tax_rate_id)&&n?.(e.map(e=>{if(e.tax_rate_id)return e;let t=K({...e,tax_rate_id:P});return{...e,tax_rate_id:P,tax_jurisdiction_id:U(P),tax_amount:t.tax_amount,line_total:t.line_total,discount_amount:t.discount_amount}}))},[P]);let W={background:`transparent`},G={fontVariantNumeric:`tabular-nums`},q=[{title:`Product / Service`,dataIndex:`product_id`,width:T.product,fixed:`left`,className:`txn-product-column txn-fixed-cell`,render:(e,t,n)=>(0,D.jsx)(u,{title:t.product_detail?.label||t.product_detail?.name||t.product_name||``,children:(0,D.jsx)(`div`,{className:`txn-product-select`,children:(0,D.jsx)(w,{value:e,detailValue:t.product_detail,fkUrl:o||`/api/products/search?transaction=sale`,labelKey:`label`,placeholder:`Select product`,variant:`borderless`,style:{width:`100%`,...W},onChange:(e,t)=>H(n,e,t),quickAddProduct:g,quickAddProductDefaults:k})})})},{title:`Qty`,dataIndex:`qty`,width:T.qty,align:`right`,className:`txn-qty-column txn-fixed-cell`,render:(e,t,n)=>(0,D.jsx)(_,{variant:`borderless`,value:e,min:0,style:{width:`100%`,...G},onChange:e=>R(n,{qty:e??0})})},{title:`Rate`,dataIndex:`unit_price`,width:T.rate,align:`right`,className:`txn-rate-column txn-fixed-cell`,render:(e,t,n)=>(0,D.jsx)(_,{variant:`borderless`,value:e,min:0,prefix:l?(0,D.jsx)(`span`,{style:{color:`#64748b`,fontSize:12},children:l}):null,style:{width:`100%`,...G},onChange:e=>R(n,{unit_price:e??0})})},...f?[{title:`Disc%`,dataIndex:`discount_percent`,width:T.discount,align:`right`,className:`txn-discount-column txn-fixed-cell`,render:(e,t,n)=>(0,D.jsx)(_,{variant:`borderless`,value:e,min:0,max:100,style:{width:`100%`,...G},onChange:e=>R(n,{discount_percent:e??0})})}]:[],...m?[{title:`Tax`,dataIndex:`tax_rate_id`,width:T.tax,className:`txn-tax-column txn-fixed-cell`,render:(e,t,n)=>(0,D.jsx)(`div`,{className:`txn-tax-select`,children:(0,D.jsx)(re,{value:(e&&typeof e==`object`?e.id:e)??null,detailValue:typeof e==`object`?e:null,disabled:!I,style:{width:`100%`,...W},onChange:(e,t)=>R(n,{tax_rate_id:e,tax_jurisdiction_id:t})})})}]:[],{title:`Tax Amt`,dataIndex:`tax_amount`,width:T.taxAmount,align:`right`,className:`txn-tax-amount-column txn-fixed-cell`,render:(e,t)=>(0,D.jsx)(`span`,{className:`txn-ellipsis-text`,style:G,children:Y(t.tax_amount,l)})},{title:`Amount`,dataIndex:`line_total`,width:T.amount,align:`right`,className:`txn-amount-column txn-fixed-cell`,render:(e,t)=>(0,D.jsx)(`span`,{className:`txn-ellipsis-text`,style:{...G,fontWeight:600},children:Y(t.line_total,l)})},{title:``,key:`remove`,width:T.remove,className:`txn-remove-column txn-fixed-cell`,render:(t,n,r)=>(0,D.jsx)(d,{type:`text`,danger:!0,size:`small`,icon:(0,D.jsx)(C,{}),onClick:()=>V(r),disabled:e.length<=h})}];return(0,D.jsxs)(`div`,{className:`txn-line-items`,children:[(0,D.jsx)(`style`,{children:`
        .txn-line-items {
          width: 100%;
          max-width: 100%;
        }

        .txn-line-items .ant-table-wrapper,
        .txn-line-items .ant-spin-nested-loading,
        .txn-line-items .ant-spin-container {
          width: 100%;
          max-width: 100%;
        }

        .txn-line-items .ant-table {
          border: 0;
          table-layout: fixed !important;
        }

        .txn-line-items .ant-table-container table {
          table-layout: fixed !important;
        }

        .txn-line-items .ant-table-thead > tr > th {
          background: #f1f5f9 !important;
          color: #334155;
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.3px;
          padding: 8px 10px;
          border-bottom: 1px solid #e2e8f0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .txn-line-items .ant-table-tbody > tr > td {
          padding: 4px 8px;
          border-bottom: 1px solid #f1f5f9;
          vertical-align: middle;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .txn-line-items .ant-table-tbody > tr:hover > td {
          background: #fafafa !important;
        }

        .txn-line-items .txn-fixed-cell {
          overflow: hidden !important;
          text-overflow: ellipsis !important;
          white-space: nowrap !important;
        }

        .txn-line-items .txn-product-column {
          width: 300px !important;
          min-width: 300px !important;
          max-width: 300px !important;
        }

        .txn-line-items .txn-qty-column {
          width: 80px !important;
          min-width: 80px !important;
          max-width: 80px !important;
        }

        .txn-line-items .txn-rate-column {
          width: 130px !important;
          min-width: 130px !important;
          max-width: 130px !important;
        }

        .txn-line-items .txn-discount-column {
          width: 80px !important;
          min-width: 80px !important;
          max-width: 80px !important;
        }

        .txn-line-items .txn-tax-column {
          width: 140px !important;
          min-width: 140px !important;
          max-width: 140px !important;
        }

        .txn-line-items .txn-tax-amount-column {
          width: 110px !important;
          min-width: 110px !important;
          max-width: 110px !important;
        }

        .txn-line-items .txn-amount-column {
          width: 130px !important;
          min-width: 130px !important;
          max-width: 130px !important;
        }

        .txn-line-items .txn-remove-column {
          width: 40px !important;
          min-width: 40px !important;
          max-width: 40px !important;
          text-align: center;
        }

        .txn-line-items .txn-ellipsis-text {
          display: block;
          width: 100%;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .txn-line-items .ant-input,
        .txn-line-items .ant-input-number-input,
        .txn-line-items .ant-select-selector {
          padding-left: 0 !important;
          padding-right: 0 !important;
        }

        .txn-line-items .ant-input-number,
        .txn-line-items .ant-select {
          width: 100% !important;
          max-width: 100% !important;
          border: 0 !important;
          box-shadow: none !important;
          overflow: hidden;
        }

        .txn-line-items .ant-input-number {
          min-width: 0 !important;
        }

        .txn-line-items .ant-input-number-input-wrap,
        .txn-line-items .ant-input-number-input {
          width: 100% !important;
          max-width: 100% !important;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .txn-line-items .ant-select-selector {
          width: 100% !important;
          max-width: 100% !important;
          overflow: hidden !important;
        }

        .txn-line-items .ant-select-selection-search {
          max-width: 100% !important;
          overflow: hidden !important;
        }

        .txn-line-items .ant-select-selection-search-input {
          max-width: 100% !important;
        }

        .txn-line-items .ant-select-selection-item,
        .txn-line-items .ant-select-selection-placeholder {
          max-width: 100% !important;
          overflow: hidden !important;
          text-overflow: ellipsis !important;
          white-space: nowrap !important;
        }

        .txn-line-items .txn-product-select,
        .txn-line-items .txn-tax-select {
          width: 100%;
          max-width: 100%;
          min-width: 0;
          overflow: hidden;
        }

        .txn-line-items .txn-expand-btn {
          width: 24px;
          height: 24px;
          padding: 0;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          color: #64748b;
        }

        .txn-line-items .txn-expand-btn:hover {
          color: #0f172a !important;
          background: #f1f5f9 !important;
        }

        .txn-line-items .txn-description-box {
          padding: 8px 12px;
          background: #f8fafc;
          border-left: 3px solid #cbd5e1;
          white-space: normal;
        }

        .txn-line-items .txn-description-box .ant-input {
          background: #ffffff;
          padding: 8px 10px !important;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          font-size: 13px;
          white-space: normal;
        }

        .txn-line-items .ant-table-expanded-row > td {
          background: #f8fafc !important;
          padding: 0 8px 8px 48px !important;
          white-space: normal !important;
        }

        .txn-line-items .ant-table-row-expand-icon-cell {
          width: 36px !important;
          min-width: 36px !important;
          max-width: 36px !important;
          padding-left: 8px !important;
          padding-right: 4px !important;
        }
      `}),(0,D.jsx)(i,{rowKey:L,size:`small`,bordered:!1,pagination:!1,columns:q,dataSource:e,tableLayout:`fixed`,scroll:{x:O},expandable:{expandedRowKeys:A,onExpandedRowsChange:j,expandRowByClick:!1,showExpandColumn:!0,expandIconColumnIndex:0,columnWidth:T.expand,rowExpandable:()=>!0,expandIcon:({expanded:e,onExpand:t,record:n})=>(0,D.jsx)(d,{type:`text`,size:`small`,className:`txn-expand-btn`,icon:e?(0,D.jsx)(c,{}):(0,D.jsx)(a,{}),onClick:e=>{e.stopPropagation(),t(n,e)}}),expandedRowRender:t=>{let n=e.findIndex(e=>L(e)===L(t));return n<0?null:(0,D.jsx)(`div`,{className:`txn-description-box`,children:(0,D.jsx)(x.TextArea,{value:t.description||``,rows:2,placeholder:`Add line description`,onChange:e=>R(n,{description:e.target.value})})})}},footer:()=>(0,D.jsx)(d,{icon:(0,D.jsx)(p,{}),type:`dashed`,size:`small`,onClick:B,children:`Add Row`})})]})}var X=({label:e,value:t,symbol:n,strong:r=!1})=>(0,D.jsxs)(g,{justify:`space-between`,style:{padding:`4px 0`,fontWeight:r?600:400,fontSize:r?15:13},children:[(0,D.jsx)(h,{style:{color:r?`#111827`:`#4b5563`},children:e}),(0,D.jsx)(h,{style:{fontVariantNumeric:`tabular-nums`},children:Y(t,n)})]});function ae({items:e=[],currencySymbol:t=``,extra:n=null}){let r=q(e),i=new Map;return e.forEach(e=>{let t=typeof e.tax_rate_id==`object`?e.tax_rate_id:e.taxRate||e.tax_rate||null,n=K(e),r=L(t)||`no_tax`,a=t?`${G(t)||`Tax`} ${H(t)}%`:`No tax`,o=i.get(r)||{label:a,amount:0};o.amount+=n.tax_amount,i.set(r,o)}),(0,D.jsx)(g,{justify:`end`,children:(0,D.jsx)(h,{xs:24,sm:16,md:10,lg:8,children:(0,D.jsxs)(m,{size:`small`,styles:{body:{padding:12,background:`#f8fafc`}},style:{border:`1px solid #e2e8f0`},children:[(0,D.jsx)(X,{label:`Subtotal`,value:r.subtotal,symbol:t}),r.discount_total>0&&(0,D.jsx)(X,{label:`Discount`,value:r.discount_total,symbol:t}),(0,D.jsx)(X,{label:`Taxable Amount`,value:r.taxable_total,symbol:t}),(0,D.jsx)(X,{label:`Tax Amount`,value:r.tax_total,symbol:t}),[...i.values()].filter(e=>e.amount>0).length>1&&(0,D.jsx)(v,{wrap:!0,size:[4,4],style:{marginTop:4},children:[...i.values()].filter(e=>e.amount>0).map(e=>(0,D.jsxs)(S,{style:{marginInlineEnd:0},children:[e.label,`: `,Y(e.amount,t)]},e.label))}),n,(0,D.jsx)(`div`,{style:{borderTop:`1px solid #cbd5e1`,margin:`8px 0`}}),(0,D.jsx)(X,{label:`Grand Total`,value:r.grand_total,symbol:t,strong:!0})]})})})}function oe({items:e=[],currencySymbol:t=``,extra:n=null}){return(0,D.jsx)(ae,{items:e,currencySymbol:t||``,extra:n})}function se({defaultActiveKey:e,descriptionName:t=`description`,remarksName:n=`remarks`,rows:r=3,ghost:i=!1,style:a,className:s}){return(0,D.jsx)(o,{ghost:i,defaultActiveKey:e,className:s,style:a,items:[{key:`description`,label:`Description`,children:(0,D.jsx)(b.Item,{name:t,noStyle:!0,children:(0,D.jsx)(x.TextArea,{rows:r,placeholder:`Description (optional)`,maxLength:2e3,showCount:!0})})},{key:`remarks`,label:`Remarks`,children:(0,D.jsx)(b.Item,{name:n,noStyle:!0,children:(0,D.jsx)(x.TextArea,{rows:r,placeholder:`Internal remarks (optional)`,maxLength:2e3,showCount:!0})})}]})}function ce({value:e=``,onChange:t,placeholder:n=`Write here...`}){let r=(0,E.useMemo)(()=>({readonly:!1,height:180,minHeight:140,toolbarAdaptive:!1,toolbarSticky:!1,askBeforePasteHTML:!1,askBeforePasteFromWord:!1,buttons:[`bold`,`italic`,`underline`,`ul`,`ol`,`link`,`table`,`hr`,`eraser`],placeholder:n}),[n]);return(0,D.jsx)(`div`,{className:`kite-rich-text-editor`,children:(0,D.jsx)(T,{value:e||``,config:r,onBlur:e=>t?.(e||``)})})}function le(e,t){let n=t?.branch,r=n?.name||t?.branch_name,i=n?.code||t?.branch_code;return!r&&!i?(0,D.jsx)(`span`,{style:{color:`#999`},children:`-`}):(0,D.jsxs)(`span`,{style:{whiteSpace:`nowrap`},children:[r||`-`,i?(0,D.jsx)(S,{style:{marginLeft:6},color:`geekblue`,children:i}):null]})}function ue(e={}){return{title:`Branch`,dataIndex:`branch`,key:`branch`,width:160,render:le,...e}}var{Text:Z}=s,Q=e=>{if(!e)return`-`;let t=(0,P.default)(e);return t.isValid()?t.format(`DD-MM-YYYY HH:mm`):`-`},$=e=>e&&(e.name||e.username||e.email)||null;function de({record:e,column:t={xs:1,sm:2,md:3},size:n=`small`,bordered:r=!0,className:i,style:a}){if(!e)return null;let o=e.branch,s=o?o.code?`${o.name||``} (${o.code})`:o.name:null,c=$(e.userAdd||e.creator||e.created_by_user),l=$(e.approvedBy||e.approver||e.approved_by_user);return(0,D.jsxs)(y,{size:n,bordered:r,column:t,className:i,style:a,children:[(0,D.jsx)(y.Item,{label:`Branch`,children:s||(0,D.jsx)(Z,{type:`secondary`,children:`-`})}),(0,D.jsx)(y.Item,{label:`Created By`,children:c||(0,D.jsx)(Z,{type:`secondary`,children:`-`})}),(0,D.jsx)(y.Item,{label:`Created At`,children:Q(e.created_at)}),(0,D.jsx)(y.Item,{label:`Approved By`,children:l||(0,D.jsx)(Z,{type:`secondary`,children:`-`})}),(0,D.jsx)(y.Item,{label:`Approved At`,children:e.approved_at?Q(e.approved_at):e.approved?(0,D.jsx)(S,{color:`green`,children:`Approved`}):(0,D.jsx)(Z,{type:`secondary`,children:`-`})})]})}export{N as _,oe as a,q as c,J as d,Y as f,F as g,V as h,se as i,ne as l,z as m,ue as n,ie as o,ee as p,ce as r,L as s,de as t,B as u};