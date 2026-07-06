import{i as e}from"./chunk-62oNxeRG.js";import{i as t}from"./axios-CFfZBleg.js";import{r as n,t as r}from"./jsx-runtime-gigNY91P.js";import{t as i}from"./table-tecCJUwL.js";import{i as a,r as o}from"./ColorPresets-CufFXh26.js";import{t as s}from"./DownOutlined-Csq4krS_.js";import{t as c}from"./auto-complete-9l8eXxoh.js";import{t as l}from"./tooltip-clCwpzP8.js";import{t as u}from"./PlusOutlined-HIrDAG4O.js";import{t as d}from"./button-Dz1Av4BD.js";import{t as f}from"./dayjs.min-CJ7289I6.js";import{t as p}from"./card-Vt669Ygr.js";import{n as m,t as h}from"./row-BjiB-KD9.js";import{t as g}from"./input-number-Ck-lg2Je.js";import{t as _}from"./space-DwTT9ayb.js";import{t as v}from"./descriptions-D8hh9HqE.js";import{t as y}from"./form-BlARKSGY.js";import{t as b}from"./input-BDCOVLHk.js";import{t as x}from"./typography-COSGzUQY.js";import{t as S}from"./tag-CxQ8hfzV.js";import{t as ee}from"./DeleteOutlined-D5JqvZYn.js";import{s as C}from"./txnApi-BcR6dypM.js";import{t as w}from"./esm-Blcgz-QP.js";var T=e(n(),1),E=r(),D=``,O=()=>{let e=typeof window<`u`?localStorage.getItem(`accessToken`):null;return{Accept:`application/json`,...e?{Authorization:`Bearer ${e}`}:{}}},k=(e,t={})=>{let n=/^https?:\/\//i.test(e)?e:`${D}${e}`,r=Object.entries(t).filter(([,e])=>e!=null&&e!==``).map(([e,t])=>`${encodeURIComponent(e)}=${encodeURIComponent(t)}`).join(`&`);return r?n.includes(`?`)?`${n}&${r}`:`${n}?${r}`:n},A=e=>{let t=Number(e);return Number.isFinite(t)?t.toLocaleString(`en-NP`,{minimumFractionDigits:2,maximumFractionDigits:2}):``},j=e=>{if(!e)return``;let t=new Date(e);return Number.isNaN(t.getTime())?String(e):t.toLocaleDateString(`en-GB`,{day:`2-digit`,month:`short`,year:`numeric`})};function M({value:e,onChange:n,sources:r=[],onPick:i,placeholder:a=`Search reference…`,disabled:o=!1,style:s,allowFreeText:l=!0}){let[u,d]=(0,T.useState)([]),[f,p]=(0,T.useState)(!1),m=(0,T.useRef)(null),h=(0,T.useRef)(0),g=(0,T.useRef)({}),_=async(e=``)=>{let n=++h.current;p(!0);try{let i=await Promise.all((r||[]).map(async n=>{try{let r=k(n.url,{[n.searchParam||`search`]:e,page:1,page_size:n.pageSize||10,active:!0,...n.extraParams||{}}),i=(await t.get(r,{headers:O()}))?.data;return{src:n,rows:Array.isArray(i?.results)?i.results:Array.isArray(i?.data)?i.data:Array.isArray(i)?i:[]}}catch{return{src:n,rows:[]}}}));if(n!==h.current)return;let a=[],o={};i.forEach(({src:e,rows:t})=>{t.forEach(t=>{let n=t[e.numberField]||t.number||t.code||`#${t.id}`,r=e.contactField&&(t[e.contactField]?.name||t[`${e.contactField}_name`])||``,i=e.dateField?j(t[e.dateField]||``):``,s=e.totalField?t[e.totalField]:null,c=[`${e.label}: ${n}`];r&&c.push(r),i&&c.push(i),s!=null&&c.push(A(s));let l=c.join(` • `),u=`${e.key||e.label}:${t.id}`;o[u]={record:t,source:e},a.push({value:u,label:l,raw:t,source:e})})}),g.current=o,d(a)}finally{n===h.current&&p(!1)}};return(0,E.jsx)(c,{value:e||``,options:u,onSearch:e=>{m.current&&clearTimeout(m.current),m.current=setTimeout(()=>_(e||``),300)},onChange:e=>{l&&typeof n==`function`&&n(e)},onSelect:e=>{let t=g.current[e];if(!t)return;let{record:r,source:a}=t,o=r[a.numberField]||r.number||r.code||``;typeof n==`function`&&n(o),typeof i==`function`&&i(r,a)},onFocus:()=>{u.length||_(``)},placeholder:a,disabled:o,style:s,notFoundContent:f?`Searching…`:`No matches`,filterOption:!1,children:(0,E.jsx)(b,{allowClear:!0})})}var N=e(f(),1),P=e=>{let t=Number(e);return Number.isFinite(t)?t:0},F=e=>Number(P(e).toFixed(2)),I=e=>e==null||e===``?null:typeof e==`object`?e.id??e.value??null:e,L=e=>e==null?``:String(e),R=e=>e==null||e===``?null:e,z=e=>{if(!e)return null;if(N.default.isDayjs(e))return e.isValid()?e.format(`YYYY-MM-DD`):null;let t=(0,N.default)(e,[`YYYY-MM-DD`,`DD-MM-YYYY`],!0);if(t.isValid())return t.format(`YYYY-MM-DD`);let n=(0,N.default)(e);return n.isValid()?n.format(`YYYY-MM-DD`):null},B=e=>{if(!e)return null;if(N.default.isDayjs(e))return e;let t=(0,N.default)(e,[`YYYY-MM-DD`,`DD-MM-YYYY`]);return t.isValid()?t:null},V=e=>!e||typeof e!=`object`?0:P(e.rate_percent??e.ratePercent??e.rate??0),H=e=>!e||typeof e!=`object`?null:e.tax_jurisdiction_id??e.taxJurisdiction?.id??e.tax_jurisdiction?.id??null,U=e=>!e||typeof e!=`object`?!1:e.inclusive===!0||e.inclusive===1||e.inclusive===`1`,W=e=>!e||typeof e!=`object`?null:e.name||e.code||null,G=(e={})=>{let t=F(P(e.qty)*P(e.unit_price??e.rate)),n=F(t*Math.min(Math.max(P(e.discount_percent),0),100)/100),r=Math.max(t-n,0),i=typeof e.tax_rate_id==`object`?e.tax_rate_id:e.taxRate||e.tax_rate||null,a=V(i),o=0,s=r;a>0&&(U(i)?(o=F(r-r/(1+a/100)),s=r):(o=F(r*a/100),s=r+o));let c=U(i)&&a>0?F(r-o):r;return{gross:F(t),discount_amount:n,tax_jurisdiction_id:H(i),tax_amount:o,taxable_amount:F(c),tax_breakup:a>0?JSON.stringify({tax_rate_id:I(i),tax_name:W(i),rate_percent:F(a),inclusive:U(i),taxable_amount:c,tax_amount:o}):null,line_total:F(s)}},K=(e=[])=>{let t=0,n=0,r=0,i=0,a=0,o=0;return(e||[]).forEach(e=>{if(!e)return;let s=G(e);t+=s.gross,n+=s.discount_amount,a+=s.tax_amount,s.tax_amount>0?r+=s.taxable_amount:i+=s.taxable_amount,o+=s.line_total}),{subtotal:F(t),sub_total:F(t),discount_total:F(n),taxable_total:F(r),non_taxable_total:F(i),tax_total:F(a),vat_total:F(a),total:F(o),grand_total:F(o)}},te=(e={})=>{let t=G(e);return{...e.id?{id:e.id}:{},product_id:I(e.product_id??e.product),product_name:L(e.product_name??e.custom_product_name??``),description:R(e.description),qty:P(e.qty)||0,unit_price:P(e.unit_price),discount_percent:P(e.discount_percent),discount_amount:t.discount_amount,tax_rate_id:I(e.tax_rate_id??e.taxRate??e.tax_rate),tax_jurisdiction_id:t.tax_jurisdiction_id||I(e.tax_jurisdiction_id??e.taxJurisdiction),tax_amount:t.tax_amount,tax_breakup:t.tax_breakup,line_total:t.line_total}},q=e=>P(e).toLocaleString(`en-NP`,{minimumFractionDigits:2,maximumFractionDigits:2}),ne={NPR:`रू`,USD:`$`,EUR:`€`,GBP:`£`,INR:`₹`,AUD:`A$`,CAD:`C$`,JPY:`¥`,CNY:`¥`},re=e=>!e||typeof e!=`object`?``:e.symbol||e.currency_symbol||ne[e.code]||e.code||``,J=(e,t=``)=>{let n=q(e);return t?`${t} ${n}`:n};function ie({value:e,detailValue:t,onChange:n,disabled:r=!1,placeholder:i=`No tax`,variant:a=`borderless`,style:o}){return(0,E.jsx)(C,{value:(e&&typeof e==`object`?e.id:e)??null,detailValue:t||(typeof e==`object`?e:null),fkUrl:`/api/tax-rates/`,labelKey:`name`,labelFn:e=>[e?.name,e?.rate_percent?`${Number(e.rate_percent)}%`:null].filter(Boolean).join(` - `),placeholder:i,variant:a,allowClear:!0,disabled:r,style:o,onChange:(e,t)=>n?.(t,H(t))})}function ae({items:e=[],onChange:n,onDeleteExistingId:r,productSearchUrl:o,priceField:c=`selling_price`,currencySymbol:f=``,showDiscount:p=!0,showTax:m=!0,minRow:h=1,quickAddProduct:_=!0,quickAddProductDefaults:v,transactionType:y}){let x=c===`purchase_price`,S=y||(x?`purchase`:`sales`),w={expand:36,product:300,qty:80,rate:130,discount:80,tax:140,taxAmount:110,amount:130,remove:40},D=w.expand+w.product+w.qty+w.rate+(p?w.discount:0)+(m?w.tax:0)+w.taxAmount+w.amount+w.remove,O=v||{allow_sale:!x,allow_purchase:x},[k,A]=(0,T.useState)([]),[j,M]=(0,T.useState)(null);(0,T.useEffect)(()=>{t.get(`/api/tax-settings`).then(({data:e})=>M(e?.data||null)).catch(()=>M(null))},[]);let N=(0,T.useMemo)(()=>j?.enable_tax?S===`purchase`?j.default_purchase_tax_rate||j.default_sales_tax_rate||null:j.default_sales_tax_rate||j.default_purchase_tax_rate||null:null,[S,j]),F=S===`purchase`?j?.allow_purchase_tax_override!==!1:j?.allow_sales_tax_override!==!1,I=e=>e._key||e.id,L=(t,r)=>{let i=e.map((e,n)=>n===t?{...e,...r}:e).map(e=>{let t=G(e);return{...e,tax_amount:t.tax_amount,line_total:t.line_total,discount_amount:t.discount_amount}});n?.(i)},R=()=>({_key:Math.random().toString(36).slice(2),product_id:null,product_detail:null,product_name:``,description:``,qty:1,unit_price:0,discount_percent:0,discount_amount:0,tax_rate_id:N,tax_jurisdiction_id:H(N),tax_amount:0,line_total:0}),z=()=>{n?.([...e,R()])},B=t=>{let i=e[t];i?.id&&typeof r==`function`&&r(i.id);let a=I(i),o=e.filter((e,n)=>n!==t);o.length<h&&o.push(R()),A(e=>e.filter(e=>e!==a)),n?.(o)},V=(t,n,r)=>{if(!r){L(t,{product_id:n,product_detail:null});return}let i=P(r?.[c]??r?.selling_price??r?.sale_price??r?.purchase_price??r?.price??e[t]?.unit_price),a=(r?.default_tax_rate??null)||e[t]?.tax_rate_id||N;L(t,{product_id:n,product_detail:r,product_name:r?.name||r?.label||``,description:e[t]?.description||r?.description||``,unit_price:i,tax_rate_id:a,tax_jurisdiction_id:a?H(a):e[t]?.tax_jurisdiction_id||null})};(0,T.useEffect)(()=>{!N||!e.length||e.some(e=>!e.tax_rate_id)&&n?.(e.map(e=>{if(e.tax_rate_id)return e;let t=G({...e,tax_rate_id:N});return{...e,tax_rate_id:N,tax_jurisdiction_id:H(N),tax_amount:t.tax_amount,line_total:t.line_total,discount_amount:t.discount_amount}}))},[N]);let U={background:`transparent`},W={fontVariantNumeric:`tabular-nums`},K=[{title:`Product / Service`,dataIndex:`product_id`,width:w.product,fixed:`left`,className:`txn-product-column txn-fixed-cell`,render:(e,t,n)=>(0,E.jsx)(l,{title:t.product_detail?.label||t.product_detail?.name||t.product_name||``,children:(0,E.jsx)(`div`,{className:`txn-product-select`,children:(0,E.jsx)(C,{value:e,detailValue:t.product_detail,fkUrl:o||`/api/products/search?transaction=sale`,labelKey:`label`,placeholder:`Select product`,variant:`borderless`,style:{width:`100%`,...U},onChange:(e,t)=>V(n,e,t),quickAddProduct:_,quickAddProductDefaults:O})})})},{title:`Qty`,dataIndex:`qty`,width:w.qty,align:`right`,className:`txn-qty-column txn-fixed-cell`,render:(e,t,n)=>(0,E.jsx)(g,{variant:`borderless`,value:e,min:0,style:{width:`100%`,...W},onChange:e=>L(n,{qty:e??0})})},{title:`Rate`,dataIndex:`unit_price`,width:w.rate,align:`right`,className:`txn-rate-column txn-fixed-cell`,render:(e,t,n)=>(0,E.jsx)(g,{variant:`borderless`,value:e,min:0,prefix:f?(0,E.jsx)(`span`,{style:{color:`#64748b`,fontSize:12},children:f}):null,style:{width:`100%`,...W},onChange:e=>L(n,{unit_price:e??0})})},...p?[{title:`Disc%`,dataIndex:`discount_percent`,width:w.discount,align:`right`,className:`txn-discount-column txn-fixed-cell`,render:(e,t,n)=>(0,E.jsx)(g,{variant:`borderless`,value:e,min:0,max:100,style:{width:`100%`,...W},onChange:e=>L(n,{discount_percent:e??0})})}]:[],...m?[{title:`Tax`,dataIndex:`tax_rate_id`,width:w.tax,className:`txn-tax-column txn-fixed-cell`,render:(e,t,n)=>(0,E.jsx)(`div`,{className:`txn-tax-select`,children:(0,E.jsx)(ie,{value:(e&&typeof e==`object`?e.id:e)??null,detailValue:typeof e==`object`?e:null,disabled:!F,style:{width:`100%`,...U},onChange:(e,t)=>L(n,{tax_rate_id:e,tax_jurisdiction_id:t})})})}]:[],{title:`Tax Amt`,dataIndex:`tax_amount`,width:w.taxAmount,align:`right`,className:`txn-tax-amount-column txn-fixed-cell`,render:(e,t)=>(0,E.jsx)(`span`,{className:`txn-ellipsis-text`,style:W,children:J(t.tax_amount,f)})},{title:`Amount`,dataIndex:`line_total`,width:w.amount,align:`right`,className:`txn-amount-column txn-fixed-cell`,render:(e,t)=>(0,E.jsx)(`span`,{className:`txn-ellipsis-text`,style:{...W,fontWeight:600},children:J(t.line_total,f)})},{title:``,key:`remove`,width:w.remove,className:`txn-remove-column txn-fixed-cell`,render:(t,n,r)=>(0,E.jsx)(d,{type:`text`,danger:!0,size:`small`,icon:(0,E.jsx)(ee,{}),onClick:()=>B(r),disabled:e.length<=h})}];return(0,E.jsxs)(`div`,{className:`txn-line-items`,children:[(0,E.jsx)(`style`,{children:`
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
      `}),(0,E.jsx)(i,{rowKey:I,size:`small`,bordered:!1,pagination:!1,columns:K,dataSource:e,tableLayout:`fixed`,scroll:{x:D},expandable:{expandedRowKeys:k,onExpandedRowsChange:A,expandRowByClick:!1,showExpandColumn:!0,expandIconColumnIndex:0,columnWidth:w.expand,rowExpandable:()=>!0,expandIcon:({expanded:e,onExpand:t,record:n})=>(0,E.jsx)(d,{type:`text`,size:`small`,className:`txn-expand-btn`,icon:e?(0,E.jsx)(s,{}):(0,E.jsx)(a,{}),onClick:e=>{e.stopPropagation(),t(n,e)}}),expandedRowRender:t=>{let n=e.findIndex(e=>I(e)===I(t));return n<0?null:(0,E.jsx)(`div`,{className:`txn-description-box`,children:(0,E.jsx)(b.TextArea,{value:t.description||``,rows:2,placeholder:`Add line description`,onChange:e=>L(n,{description:e.target.value})})})}},footer:()=>(0,E.jsx)(d,{icon:(0,E.jsx)(u,{}),type:`dashed`,size:`small`,onClick:z,children:`Add Row`})})]})}var Y=({label:e,value:t,symbol:n,strong:r=!1})=>(0,E.jsxs)(h,{justify:`space-between`,style:{padding:`4px 0`,fontWeight:r?600:400,fontSize:r?15:13},children:[(0,E.jsx)(m,{style:{color:r?`#111827`:`#4b5563`},children:e}),(0,E.jsx)(m,{style:{fontVariantNumeric:`tabular-nums`},children:J(t,n)})]});function oe({items:e=[],currencySymbol:t=``,extra:n=null}){let r=K(e),i=new Map;return e.forEach(e=>{let t=typeof e.tax_rate_id==`object`?e.tax_rate_id:e.taxRate||e.tax_rate||null,n=G(e),r=I(t)||`no_tax`,a=t?`${W(t)||`Tax`} ${V(t)}%`:`No tax`,o=i.get(r)||{label:a,amount:0};o.amount+=n.tax_amount,i.set(r,o)}),(0,E.jsx)(h,{justify:`end`,children:(0,E.jsx)(m,{xs:24,sm:16,md:10,lg:8,children:(0,E.jsxs)(p,{size:`small`,styles:{body:{padding:12,background:`#f8fafc`}},style:{border:`1px solid #e2e8f0`},children:[(0,E.jsx)(Y,{label:`Subtotal`,value:r.subtotal,symbol:t}),r.discount_total>0&&(0,E.jsx)(Y,{label:`Discount`,value:r.discount_total,symbol:t}),(0,E.jsx)(Y,{label:`Taxable Amount`,value:r.taxable_total,symbol:t}),(0,E.jsx)(Y,{label:`Tax Amount`,value:r.tax_total,symbol:t}),[...i.values()].filter(e=>e.amount>0).length>1&&(0,E.jsx)(_,{wrap:!0,size:[4,4],style:{marginTop:4},children:[...i.values()].filter(e=>e.amount>0).map(e=>(0,E.jsxs)(S,{style:{marginInlineEnd:0},children:[e.label,`: `,J(e.amount,t)]},e.label))}),n,(0,E.jsx)(`div`,{style:{borderTop:`1px solid #cbd5e1`,margin:`8px 0`}}),(0,E.jsx)(Y,{label:`Grand Total`,value:r.grand_total,symbol:t,strong:!0})]})})})}function se({items:e=[],currencySymbol:t=``,extra:n=null}){return(0,E.jsx)(oe,{items:e,currencySymbol:t||``,extra:n})}function ce({defaultActiveKey:e,descriptionName:t=`description`,remarksName:n=`remarks`,rows:r=3,ghost:i=!1,style:a,className:s}){return(0,E.jsx)(o,{ghost:i,defaultActiveKey:e,className:s,style:a,items:[{key:`description`,label:`Description`,children:(0,E.jsx)(y.Item,{name:t,noStyle:!0,children:(0,E.jsx)(b.TextArea,{rows:r,placeholder:`Description (optional)`,maxLength:2e3,showCount:!0})})},{key:`remarks`,label:`Remarks`,children:(0,E.jsx)(y.Item,{name:n,noStyle:!0,children:(0,E.jsx)(b.TextArea,{rows:r,placeholder:`Internal remarks (optional)`,maxLength:2e3,showCount:!0})})}]})}function le({value:e=``,onChange:t,placeholder:n=`Write here...`}){let r=(0,T.useMemo)(()=>({readonly:!1,height:180,minHeight:140,toolbarAdaptive:!1,toolbarSticky:!1,askBeforePasteHTML:!1,askBeforePasteFromWord:!1,buttons:[`bold`,`italic`,`underline`,`ul`,`ol`,`link`,`table`,`hr`,`eraser`],placeholder:n}),[n]);return(0,E.jsx)(`div`,{className:`kite-rich-text-editor`,children:(0,E.jsx)(w,{value:e||``,config:r,onBlur:e=>t?.(e||``)})})}var X=`#DRAFT`,Z=e=>{if(!e||typeof e!=`object`)return!1;if(e.approved===!0||e.approved===1||e.approved===`1`||e.is_approved===!0||e.is_approved===1||e.is_approved===`1`||e.approved_at)return!0;let t=(e.status||``).toString().toLowerCase();return!!(t&&t!==`draft`&&t!==`pending`&&t!==`unapproved`)},ue=(e,t)=>{if(!e||typeof e!=`object`||!Z(e))return X;let n=e[t];return n==null||n===``?X:n};function de(e,t){let n=t?.branch,r=n?.name||t?.branch_name,i=n?.code||t?.branch_code;return!r&&!i?(0,E.jsx)(`span`,{style:{color:`#999`},children:`-`}):(0,E.jsxs)(`span`,{style:{whiteSpace:`nowrap`},children:[r||`-`,i?(0,E.jsx)(S,{style:{marginLeft:6},color:`geekblue`,children:i}):null]})}function fe(e={}){return{title:`Branch`,dataIndex:`branch`,key:`branch`,width:160,render:de,...e}}var{Text:Q}=x,$=e=>{if(!e)return`-`;let t=(0,N.default)(e);return t.isValid()?t.format(`DD-MM-YYYY HH:mm`):`-`},pe=e=>e&&(e.name||e.username||e.email)||null;function me({record:e,column:t={xs:1,sm:2,md:3},size:n=`small`,bordered:r=!0,className:i,style:a}){if(!e)return null;let o=e.branch,s=o?o.code?`${o.name||``} (${o.code})`:o.name:null,c=pe(e.userAdd||e.creator||e.created_by_user),l=pe(e.approvedBy||e.approver||e.approved_by_user);return(0,E.jsxs)(v,{size:n,bordered:r,column:t,className:i,style:a,children:[(0,E.jsx)(v.Item,{label:`Branch`,children:s||(0,E.jsx)(Q,{type:`secondary`,children:`-`})}),(0,E.jsx)(v.Item,{label:`Created By`,children:c||(0,E.jsx)(Q,{type:`secondary`,children:`-`})}),(0,E.jsx)(v.Item,{label:`Created At`,children:$(e.created_at)}),(0,E.jsx)(v.Item,{label:`Approved By`,children:l||(0,E.jsx)(Q,{type:`secondary`,children:`-`})}),(0,E.jsx)(v.Item,{label:`Approved At`,children:e.approved_at?$(e.approved_at):e.approved?(0,E.jsx)(S,{color:`green`,children:`Approved`}):(0,E.jsx)(Q,{type:`secondary`,children:`-`})})]})}export{B as _,le as a,ae as c,re as d,z as f,R as g,te as h,Z as i,I as l,J as m,fe as n,ce as o,q as p,ue as r,se as s,me as t,K as u,P as v,M as y};