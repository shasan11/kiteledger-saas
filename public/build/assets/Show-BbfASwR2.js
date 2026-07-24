import{i as e}from"./rolldown-runtime-aKtaBQYM.js";import{t}from"./axios-BQPRRFHk.js";import{i as n,t as r}from"./index.esm-CtIVDvdE.js";import{r as i,t as a}from"./jsx-runtime-RbF_zoRI.js";import{t as o}from"./table-DK2wnZMe.js";import{t as s}from"./alert-CXVdfG0X.js";import{t as c}from"./typography-BTjN9rxU.js";import{t as l}from"./skeleton-DWMEFrf7.js";import{t as u}from"./empty-BOJtdRz7.js";import{t as ee}from"./SearchOutlined-obcpVUK3.js";import{t as d}from"./badge-Xji85D9W.js";import{t as f}from"./PlusOutlined-pba_3Pld.js";import{t as p}from"./button-DdnyfjyJ.js";import{t as m}from"./dayjs.min-BRtZKQ04.js";import{t as te}from"./tabs-D6mM-bRn.js";import{t as h}from"./card-DkP92y8s.js";import{t as g}from"./grid-DO-50pkA.js";import{n as _,t as v}from"./row-3lWxq59F.js";import{t as y}from"./space-_4B_xOOu.js";import{t as b}from"./form-B52HFnKB.js";import{t as ne}from"./SwapOutlined-DRZNChnF.js";import{t as x}from"./input-D-fdS88J.js";import{t as S}from"./message-Lq1UzMpA.js";import{t as re}from"./modal-B6mMaOFG.js";import{t as ie}from"./progress-Bdfv2Abt.js";import{t as C}from"./tag-Dh3NArqV.js";import{t as ae}from"./EditOutlined-DDNyn6SO.js";import{c as w}from"./app-D4CZYYgw.js";import{t as T}from"./AuthenticatedLayout-OEHjUhv1.js";import{n as oe,t as se}from"./ArrowUpOutlined-kfndN92u.js";import{t as ce}from"./ArrowLeftOutlined-CzB-XQhI.js";import{t as E}from"./ArrowRightOutlined-BoA64VOv.js";import{t as le}from"./ExclamationCircleOutlined-mfLkUCcO.js";import{t as ue}from"./InboxOutlined-DfHqOW0l.js";import{t as de}from"./ToolOutlined-BqLxBvBo.js";import{t as fe}from"./WarningOutlined-KVDD8iB3.js";import{t as D}from"./relativeTime-DgsGn7JW.js";var O=e(i(),1),k=e(m(),1),A=e(D(),1),j=a();k.default.extend(A.default);var{Title:pe,Text:M}=c,{useBreakpoint:me}=g,he=``,ge=e=>`${he}${e}`,N=()=>{let e=typeof window<`u`?localStorage.getItem(`accessToken`):null;return e?{Authorization:`Bearer ${e}`}:{}},P=(e,n={})=>t.get(ge(e),{headers:N(),params:n}),F=e=>e?.results||e||[],I=(e,t=2)=>Number(e??0).toLocaleString(void 0,{minimumFractionDigits:t,maximumFractionDigits:t}),L=e=>{let t=Number(e??0);return Number.isInteger(t)?t.toLocaleString():I(t,4).replace(/\.?0+$/,``)},R=e=>e&&(0,k.default)(e).isValid()?(0,k.default)(e).format(`DD MMM YYYY`):`-`,_e=e=>e&&(0,k.default)(e).isValid()?(0,k.default)(e).fromNow():`-`,ve=e=>{let t=Number(e?.qty_on_hand??0),n=Number(e?.reorder_level??e?.product?.reorder_level??0);return t<0?{label:`Negative`,color:`red`}:t===0?{label:`Out`,color:`volcano`}:n>0&&t<=n?{label:`Low`,color:`gold`}:{label:`In Stock`,color:`green`}},z=e=>{let[t,n]={draft:[`default`,`Draft`],approved:[`success`,`Approved`],posted:[`success`,`Posted`],completed:[`success`,`Completed`],void:[`error`,`Void`],cancelled:[`error`,`Cancelled`]}[e]||[`default`,e||`Draft`];return(0,j.jsx)(C,{color:t,children:n})};function B({label:e,value:t,hint:n,tone:r,onClick:i}){let{token:a}=w.useToken();return(0,j.jsx)(h,{size:`small`,hoverable:!!i,onClick:i,className:`warehouse-stat-card`,style:{borderColor:a.colorBorderSecondary,cursor:i?`pointer`:`default`},bodyStyle:{padding:12},children:(0,j.jsxs)(`div`,{style:{display:`flex`,flexDirection:`column`,gap:3},children:[(0,j.jsx)(M,{type:`secondary`,style:{fontSize:11},children:e}),(0,j.jsx)(`div`,{style:{fontSize:20,fontWeight:700,lineHeight:1.15,color:r||a.colorText},children:t}),n&&(0,j.jsx)(M,{type:`secondary`,style:{fontSize:11},children:n})]})})}function V({label:e,children:t}){return(0,j.jsxs)(`div`,{className:`warehouse-detail-line`,children:[(0,j.jsx)(M,{type:`secondary`,className:`warehouse-detail-label`,children:e}),(0,j.jsx)(`div`,{className:`warehouse-detail-value`,children:t})]})}function H({id:e,...i}){let{token:a}=w.useToken(),c=!me().md,[m,g]=(0,O.useState)(null),[D,k]=(0,O.useState)([]),[A,he]=(0,O.useState)([]),[H,ye]=(0,O.useState)([]),[U,be]=(0,O.useState)([]),[xe,Se]=(0,O.useState)(!0),[W,Ce]=(0,O.useState)(!0),[G,we]=(0,O.useState)(!0),[Te,Ee]=(0,O.useState)(null),[K,De]=(0,O.useState)(``),[q,J]=(0,O.useState)(`all`),[Oe,Y]=(0,O.useState)(`stock`),[ke,X]=(0,O.useState)(!1),[Z]=b.useForm(),[Ae,je]=(0,O.useState)(!1);(0,O.useEffect)(()=>{let t=!1;return(async()=>{try{let n=await P(`/api/warehouses/${e}/`);t||g(n.data)}catch(e){t||Ee(e?.response?.data?.message||`Failed to load warehouse`)}finally{t||Se(!1)}})(),(async()=>{try{let n=await P(`/api/warehouse-items/`,{warehouse_id:e,include_zero_stock:1,include_inactive:1,page_size:500,ordering:`-total_value`});t||k(F(n.data))}finally{t||Ce(!1)}})(),(async()=>{try{let[n,r,i,a]=await Promise.allSettled([P(`/api/warehouse-transfers/`,{from_warehouse_id:e,page_size:20,ordering:`-created_at`}),P(`/api/warehouse-transfers/`,{to_warehouse_id:e,page_size:20,ordering:`-created_at`}),P(`/api/adjustments/`,{warehouse_id:e,page_size:15,ordering:`-created_at`}),P(`/api/production-journals/`,{warehouse_id:e,page_size:10,ordering:`-created_at`})]);if(t)return;let o=n.status===`fulfilled`?F(n.value.data).map(e=>({...e,_direction:`out`,_other:e.toWarehouse})):[],s=r.status===`fulfilled`?F(r.value.data).map(e=>({...e,_direction:`in`,_other:e.fromWarehouse})):[];he([...s,...o].sort((e,t)=>new Date(t.created_at)-new Date(e.created_at)).slice(0,25)),ye(i.status===`fulfilled`?F(i.value.data):[]),be(a.status===`fulfilled`?F(a.value.data):[])}finally{t||we(!1)}})(),()=>{t=!0}},[e]);let Q=(0,O.useMemo)(()=>{let e=D.reduce((e,t)=>e+Number(t.total_value??0),0),t=D.filter(e=>Number(e.qty_on_hand)>0),n=D.filter(e=>{let t=Number(e.qty_on_hand??0),n=Number(e.reorder_level??e.product?.reorder_level??0);return t>0&&n>0&&t<=n}),r=D.filter(e=>Number(e.qty_on_hand)===0),i=D.filter(e=>Number(e.qty_on_hand)<0),a={};D.forEach(e=>{let t=e.product?.productCategory?.name||e.product?.category_name||`Uncategorised`;a[t]=(a[t]||0)+Number(e.total_value??0)});let o=Object.entries(a).sort((e,t)=>t[1]-e[1]).slice(0,6).map(([t,n])=>({name:t,value:n,percent:e>0?Math.round(n/e*100):0}));return{total:e,skus:D.length,inStock:t.length,lowStock:n.length,outOfStock:r.length,negative:i.length,categories:o}},[D]),$=(0,O.useMemo)(()=>{let e=[...D];if(K.trim()){let t=K.toLowerCase();e=e.filter(e=>{let n=e.product?.name?.toLowerCase()||``,r=e.product?.sku?.toLowerCase()||``,i=e.product?.code?.toLowerCase()||``;return n.includes(t)||r.includes(t)||i.includes(t)})}return q===`in`&&(e=e.filter(e=>Number(e.qty_on_hand)>0)),q===`low`&&(e=e.filter(e=>{let t=Number(e.qty_on_hand??0),n=Number(e.reorder_level??e.product?.reorder_level??0);return t>0&&n>0&&t<=n})),q===`out`&&(e=e.filter(e=>Number(e.qty_on_hand)===0)),q===`negative`&&(e=e.filter(e=>Number(e.qty_on_hand)<0)),e},[D,K,q]),Me=()=>{Z.setFieldsValue({name:m?.name,code:m?.code,address:m?.address}),X(!0)},Ne=async()=>{let n=await Z.validateFields().catch(()=>null);if(n){je(!0);try{let r=await t.patch(ge(`/api/warehouses/${e}/`),n,{headers:{...N(),"Content-Type":`application/json`}});g(r.data),X(!1),S.success(`Warehouse updated`)}catch(e){S.error(e?.response?.data?.message||`Update failed`)}finally{je(!1)}}},Pe=[{title:`Product`,key:`product`,width:240,fixed:c?void 0:`left`,render:(e,t)=>(0,j.jsxs)(`div`,{style:{minWidth:0},children:[(0,j.jsx)(M,{strong:!0,style:{display:`block`,lineHeight:1.25},children:t.product?.name||`-`}),(0,j.jsxs)(y,{size:4,wrap:!0,children:[t.product?.sku&&(0,j.jsxs)(M,{type:`secondary`,style:{fontSize:11},children:[`SKU: `,t.product.sku]}),t.product?.code&&(0,j.jsx)(C,{style:{marginInlineEnd:0},children:t.product.code})]})]})},{title:`Category`,key:`category`,width:140,responsive:[`lg`],render:(e,t)=>(0,j.jsx)(M,{type:`secondary`,style:{fontSize:12},children:t.product?.productCategory?.name||`—`})},{title:`Unit`,key:`unit`,width:80,align:`center`,responsive:[`md`],render:(e,t)=>t.product?.productUnit?.name||t.unit_code||`—`},{title:`Qty`,dataIndex:`qty_on_hand`,width:110,align:`right`,sorter:(e,t)=>Number(e.qty_on_hand)-Number(t.qty_on_hand),render:e=>{let t=Number(e??0);return(0,j.jsx)(M,{strong:!0,style:{color:t<0?a.colorError:t===0?a.colorTextTertiary:a.colorText},children:L(e)})}},{title:`Reorder`,dataIndex:`reorder_level`,width:110,align:`right`,responsive:[`lg`],render:(e,t)=>{let n=Number(e??t.product?.reorder_level??0);return n>0?L(n):(0,j.jsx)(M,{type:`secondary`,children:`—`})}},{title:`Avg Cost`,dataIndex:`avg_cost`,width:110,align:`right`,responsive:[`xl`],sorter:(e,t)=>Number(e.avg_cost)-Number(t.avg_cost),render:e=>I(e)},{title:`Value`,dataIndex:`total_value`,width:130,align:`right`,sorter:(e,t)=>Number(e.total_value)-Number(t.total_value),defaultSortOrder:`descend`,render:e=>(0,j.jsx)(M,{strong:!0,children:I(e)})},{title:`Status`,key:`status`,width:100,align:`center`,render:(e,t)=>{let n=ve(t);return(0,j.jsx)(C,{color:n.color,children:n.label})}}],Fe=[{title:`Transfer`,dataIndex:`transfer_no`,width:130,render:(e,t)=>(0,j.jsx)(p,{type:`link`,size:`small`,className:`warehouse-link-btn`,onClick:()=>n.visit(route(`inventory.warehouse-transfers.show`,t.id)),children:e||`#draft`})},{title:`Date`,dataIndex:`transfer_date`,width:110,render:R},{title:`Direction`,key:`direction`,width:110,align:`center`,render:(e,t)=>t._direction===`in`?(0,j.jsx)(C,{color:`green`,icon:(0,j.jsx)(oe,{}),children:`IN`}):(0,j.jsx)(C,{color:`blue`,icon:(0,j.jsx)(se,{}),children:`OUT`})},{title:`Other Warehouse`,key:`other`,ellipsis:!0,render:(e,t)=>t._other?.name||t._other?.label||`—`},{title:`Value`,dataIndex:`total`,width:120,align:`right`,responsive:[`md`],render:e=>e?I(e):`—`},{title:`Status`,dataIndex:`status`,width:110,render:z},{title:``,key:`action`,width:48,align:`right`,render:(e,t)=>(0,j.jsx)(p,{type:`text`,size:`small`,icon:(0,j.jsx)(E,{}),onClick:()=>n.visit(route(`inventory.warehouse-transfers.show`,t.id))})}],Ie=[{title:`Adjustment`,dataIndex:`adjustment_no`,width:140,render:(e,t)=>(0,j.jsx)(p,{type:`link`,size:`small`,className:`warehouse-link-btn`,onClick:()=>n.visit(route(`inventory.adjustments.show`,t.id)),children:e||`#draft`})},{title:`Date`,dataIndex:`adjustment_date`,width:110,render:R},{title:`Reason`,dataIndex:`reason`,ellipsis:!0,render:e=>e||`—`},{title:`Items`,key:`items`,width:80,align:`center`,responsive:[`md`],render:(e,t)=>(0,j.jsx)(d,{count:(t.items||t.inventoryAdjustmentLines||[]).length,color:a.colorPrimary})},{title:`Status`,dataIndex:`status`,width:110,render:z},{title:``,key:`action`,width:48,align:`right`,render:(e,t)=>(0,j.jsx)(p,{type:`text`,size:`small`,icon:(0,j.jsx)(E,{}),onClick:()=>n.visit(route(`inventory.adjustments.show`,t.id))})}],Le=[{title:`Journal`,dataIndex:`code`,width:140,render:(e,t)=>(0,j.jsx)(p,{type:`link`,size:`small`,className:`warehouse-link-btn`,onClick:()=>n.visit(route(`inventory.production-journals.show`,t.id)),children:e||`#draft`})},{title:`Date`,dataIndex:`date`,width:110,render:R},{title:`Finished Product`,key:`product`,ellipsis:!0,render:(e,t)=>t.finishedProduct?.name||t.finished_product_id||`—`},{title:`Output`,dataIndex:`output_quantity`,width:110,align:`right`,render:(e,t)=>`${L(e)} ${t.output_unit_code||``}`.trim()},{title:`Cost`,dataIndex:`finished_goods_cost`,width:120,align:`right`,responsive:[`md`],render:I},{title:`Status`,dataIndex:`status`,width:110,render:z}];if(xe)return(0,j.jsxs)(T,{user:i.auth?.user,children:[(0,j.jsx)(r,{title:`Warehouse`}),(0,j.jsx)(`div`,{style:{padding:c?16:24},children:(0,j.jsx)(l,{active:!0,paragraph:{rows:10}})})]});if(Te)return(0,j.jsxs)(T,{user:i.auth?.user,children:[(0,j.jsx)(r,{title:`Warehouse`}),(0,j.jsx)(`div`,{style:{padding:c?16:24},children:(0,j.jsx)(s,{type:`error`,showIcon:!0,message:Te})})]});let Re=[{key:`all`,label:`All`,count:Q.skus},{key:`in`,label:`In Stock`,count:Q.inStock},{key:`low`,label:`Low`,count:Q.lowStock},{key:`out`,label:`Out`,count:Q.outOfStock},{key:`negative`,label:`Negative`,count:Q.negative}];return(0,j.jsxs)(T,{user:i.auth?.user,children:[(0,j.jsx)(r,{title:`Warehouse — ${m?.name||``}`}),(0,j.jsxs)(`div`,{className:`warehouse-shell`,style:{background:a.colorBgLayout,color:a.colorText},children:[(0,j.jsxs)(`div`,{className:`warehouse-header`,style:{background:a.colorBgContainer,borderColor:a.colorBorderSecondary},children:[(0,j.jsxs)(`div`,{className:`warehouse-title-area`,children:[(0,j.jsx)(p,{size:`small`,icon:(0,j.jsx)(ce,{}),onClick:()=>n.visit(route(`warehouse.index`)),children:`Back`}),(0,j.jsxs)(`div`,{className:`warehouse-title-block`,children:[(0,j.jsxs)(`div`,{className:`warehouse-title-row`,children:[(0,j.jsx)(ue,{style:{color:a.colorTextSecondary}}),(0,j.jsx)(pe,{level:5,style:{margin:0},children:m?.name||`Warehouse`}),m?.code&&(0,j.jsx)(C,{children:m.code}),(0,j.jsx)(C,{color:m?.active?`success`:`error`,children:m?.active?`Active`:`Inactive`}),m?.is_system_generated&&(0,j.jsx)(C,{color:`purple`,children:`System`})]}),(0,j.jsxs)(M,{type:`secondary`,className:`warehouse-subtitle`,children:[m?.branch?.name||m?.branch?.label||`No branch`,m?.address?` · ${m.address}`:``]})]})]}),(0,j.jsxs)(y,{wrap:!0,className:`warehouse-actions`,children:[(0,j.jsx)(p,{size:`small`,icon:(0,j.jsx)(ae,{}),onClick:Me,children:`Edit`}),(0,j.jsx)(p,{size:`small`,icon:(0,j.jsx)(ne,{}),onClick:()=>n.visit(route(`inventory.warehouse-transfers.add`)),children:`Transfer`}),(0,j.jsx)(p,{size:`small`,icon:(0,j.jsx)(de,{}),type:`primary`,onClick:()=>n.visit(route(`inventory.adjustments.add`)),children:`Adjustment`})]})]}),(0,j.jsxs)(`main`,{className:`warehouse-content`,children:[(Q.lowStock>0||Q.negative>0)&&!W&&(0,j.jsxs)(`div`,{className:`warehouse-alerts`,children:[Q.negative>0&&(0,j.jsx)(s,{type:`error`,showIcon:!0,icon:(0,j.jsx)(le,{}),message:`${Q.negative} negative stock item${Q.negative>1?`s`:``}`,action:(0,j.jsx)(p,{size:`small`,danger:!0,onClick:()=>{Y(`stock`),J(`negative`)},children:`View`})}),Q.lowStock>0&&(0,j.jsx)(s,{type:`warning`,showIcon:!0,icon:(0,j.jsx)(fe,{}),message:`${Q.lowStock} low stock item${Q.lowStock>1?`s`:``}`,action:(0,j.jsx)(p,{size:`small`,onClick:()=>{Y(`stock`),J(`low`)},children:`View`})})]}),(0,j.jsxs)(v,{gutter:[10,10],className:`warehouse-stats-row`,children:[(0,j.jsx)(_,{xs:12,sm:8,lg:4,children:(0,j.jsx)(B,{label:`Stock Value`,value:I(Q.total),hint:`${Q.skus} SKUs`,tone:a.colorPrimary,onClick:()=>Y(`stock`)})}),(0,j.jsx)(_,{xs:12,sm:8,lg:4,children:(0,j.jsx)(B,{label:`In Stock`,value:Q.inStock,hint:`available`,tone:a.colorSuccess,onClick:()=>{Y(`stock`),J(`in`)}})}),(0,j.jsx)(_,{xs:12,sm:8,lg:4,children:(0,j.jsx)(B,{label:`Low Stock`,value:Q.lowStock,hint:`below reorder`,tone:a.colorWarning,onClick:()=>{Y(`stock`),J(`low`)}})}),(0,j.jsx)(_,{xs:12,sm:8,lg:4,children:(0,j.jsx)(B,{label:`Out`,value:Q.outOfStock,hint:`zero balance`,tone:a.colorError,onClick:()=>{Y(`stock`),J(`out`)}})}),(0,j.jsx)(_,{xs:12,sm:8,lg:4,children:(0,j.jsx)(B,{label:`Negative`,value:Q.negative,hint:Q.negative?`check now`:`clear`,tone:a.colorError,onClick:()=>{Y(`stock`),J(`negative`)}})}),(0,j.jsx)(_,{xs:12,sm:8,lg:4,children:(0,j.jsx)(B,{label:`Transfers`,value:A.length,hint:`recent`,tone:a.colorText,onClick:()=>Y(`transfers`)})})]}),(0,j.jsxs)(v,{gutter:[12,12],className:`warehouse-overview-row`,children:[(0,j.jsx)(_,{xs:24,lg:8,children:(0,j.jsx)(h,{size:`small`,className:`warehouse-card`,title:`Details`,bodyStyle:{padding:12},children:(0,j.jsxs)(`div`,{className:`warehouse-details`,children:[(0,j.jsx)(V,{label:`Code`,children:m?.code?(0,j.jsx)(C,{children:m.code}):`—`}),(0,j.jsx)(V,{label:`Branch`,children:m?.branch?.name||m?.branch?.label||`—`}),(0,j.jsx)(V,{label:`Address`,children:m?.address||(0,j.jsx)(M,{type:`secondary`,children:`Not set`})}),(0,j.jsx)(V,{label:`Type`,children:(0,j.jsx)(C,{color:m?.is_system_generated?`purple`:`default`,children:m?.is_system_generated?`System`:`Manual`})}),(0,j.jsx)(V,{label:`Created`,children:R(m?.created_at)}),(0,j.jsx)(V,{label:`Updated`,children:_e(m?.updated_at)})]})})}),(0,j.jsx)(_,{xs:24,lg:16,children:(0,j.jsx)(h,{size:`small`,className:`warehouse-card`,title:`Stock Value by Category`,extra:(0,j.jsx)(M,{type:`secondary`,style:{fontSize:12},children:I(Q.total)}),bodyStyle:{padding:12},children:W?(0,j.jsx)(l,{active:!0,paragraph:{rows:5}}):Q.categories.length===0?(0,j.jsx)(u,{description:`No stock data`,image:u.PRESENTED_IMAGE_SIMPLE,style:{padding:24}}):(0,j.jsx)(`div`,{className:`warehouse-category-list`,children:Q.categories.map(e=>(0,j.jsxs)(`div`,{className:`warehouse-category-item`,children:[(0,j.jsxs)(`div`,{className:`warehouse-category-top`,children:[(0,j.jsx)(M,{ellipsis:!0,style:{maxWidth:c?160:420},children:e.name}),(0,j.jsxs)(y,{size:10,children:[(0,j.jsxs)(M,{type:`secondary`,style:{fontSize:12},children:[e.percent,`%`]}),(0,j.jsx)(M,{strong:!0,style:{fontSize:12},children:I(e.value)})]})]}),(0,j.jsx)(ie,{percent:e.percent,showInfo:!1,size:[void 0,5],strokeColor:a.colorPrimary,trailColor:a.colorFillQuaternary})]},e.name))})})})]}),(0,j.jsx)(h,{size:`small`,className:`warehouse-main-card`,bodyStyle:{padding:0},children:(0,j.jsx)(te,{activeKey:Oe,onChange:Y,size:`small`,className:`warehouse-tabs`,items:[{key:`stock`,label:(0,j.jsxs)(y,{size:6,children:[(0,j.jsx)(`span`,{children:`Stock`}),(0,j.jsx)(d,{count:Q.skus,overflowCount:999})]}),children:(0,j.jsxs)(`div`,{className:`warehouse-tab-body`,children:[(0,j.jsxs)(`div`,{className:`warehouse-toolbar`,children:[(0,j.jsx)(x,{allowClear:!0,prefix:(0,j.jsx)(ee,{style:{color:a.colorTextTertiary}}),placeholder:`Search product, SKU, code...`,value:K,onChange:e=>De(e.target.value),className:`warehouse-search`}),(0,j.jsx)(`div`,{className:`warehouse-filters`,children:Re.map(e=>(0,j.jsxs)(p,{size:`small`,type:q===e.key?`primary`:`default`,onClick:()=>J(e.key),children:[e.label,(0,j.jsx)(`span`,{style:{marginLeft:5},children:e.count})]},e.key))})]}),W?(0,j.jsx)(l,{active:!0,paragraph:{rows:8}}):$.length===0?(0,j.jsx)(u,{description:`No matching products`,image:u.PRESENTED_IMAGE_SIMPLE,style:{padding:36}}):(0,j.jsx)(o,{rowKey:`id`,size:`small`,columns:Pe,dataSource:$,pagination:{pageSize:25,size:`small`,showTotal:e=>`${e} items`},scroll:{x:900},rowClassName:e=>{let t=Number(e.qty_on_hand);return t<0?`warehouse-row-negative`:t===0?`warehouse-row-zero`:``},summary:()=>(0,j.jsx)(o.Summary,{fixed:!0,children:(0,j.jsxs)(o.Summary.Row,{children:[(0,j.jsxs)(o.Summary.Cell,{index:0,colSpan:6,children:[(0,j.jsx)(M,{strong:!0,children:`Total`}),(0,j.jsxs)(M,{type:`secondary`,style:{marginLeft:6},children:[$.length,` SKUs`]})]}),(0,j.jsx)(o.Summary.Cell,{index:6,align:`right`,children:(0,j.jsx)(M,{strong:!0,children:I($.reduce((e,t)=>e+Number(t.total_value??0),0))})}),(0,j.jsx)(o.Summary.Cell,{index:7})]})})})]})},{key:`transfers`,label:(0,j.jsxs)(y,{size:6,children:[(0,j.jsx)(`span`,{children:`Transfers`}),(0,j.jsx)(d,{count:A.length,overflowCount:99})]}),children:(0,j.jsxs)(`div`,{className:`warehouse-tab-body`,children:[(0,j.jsxs)(`div`,{className:`warehouse-section-head`,children:[(0,j.jsx)(M,{type:`secondary`,children:`Recent transfers involving this warehouse`}),(0,j.jsx)(p,{size:`small`,icon:(0,j.jsx)(f,{}),onClick:()=>n.visit(route(`inventory.warehouse-transfers.add`)),children:`New`})]}),G?(0,j.jsx)(l,{active:!0,paragraph:{rows:6}}):A.length===0?(0,j.jsx)(u,{description:`No transfers yet`,image:u.PRESENTED_IMAGE_SIMPLE,style:{padding:36}}):(0,j.jsx)(o,{rowKey:`id`,size:`small`,columns:Fe,dataSource:A,pagination:{pageSize:15,size:`small`},scroll:{x:720}})]})},{key:`adjustments`,label:(0,j.jsxs)(y,{size:6,children:[(0,j.jsx)(`span`,{children:`Adjustments`}),(0,j.jsx)(d,{count:H.length,overflowCount:99})]}),children:(0,j.jsxs)(`div`,{className:`warehouse-tab-body`,children:[(0,j.jsxs)(`div`,{className:`warehouse-section-head`,children:[(0,j.jsx)(M,{type:`secondary`,children:`Recent inventory adjustments`}),(0,j.jsx)(p,{size:`small`,icon:(0,j.jsx)(f,{}),onClick:()=>n.visit(route(`inventory.adjustments.add`)),children:`New`})]}),G?(0,j.jsx)(l,{active:!0,paragraph:{rows:6}}):H.length===0?(0,j.jsx)(u,{description:`No adjustments yet`,image:u.PRESENTED_IMAGE_SIMPLE,style:{padding:36}}):(0,j.jsx)(o,{rowKey:`id`,size:`small`,columns:Ie,dataSource:H,pagination:{pageSize:15,size:`small`},scroll:{x:680}})]})},{key:`production`,label:(0,j.jsxs)(y,{size:6,children:[(0,j.jsx)(`span`,{children:`Production`}),(0,j.jsx)(d,{count:U.length,overflowCount:99})]}),children:(0,j.jsxs)(`div`,{className:`warehouse-tab-body`,children:[(0,j.jsxs)(`div`,{className:`warehouse-section-head`,children:[(0,j.jsx)(M,{type:`secondary`,children:`Recent production journals`}),(0,j.jsx)(p,{size:`small`,icon:(0,j.jsx)(f,{}),onClick:()=>n.visit(route(`inventory.production-journals.add`)),children:`New`})]}),G?(0,j.jsx)(l,{active:!0,paragraph:{rows:6}}):U.length===0?(0,j.jsx)(u,{description:`No production journals yet`,image:u.PRESENTED_IMAGE_SIMPLE,style:{padding:36}}):(0,j.jsx)(o,{rowKey:`id`,size:`small`,columns:Le,dataSource:U,pagination:{pageSize:10,size:`small`},scroll:{x:700}})]})}]})})]})]}),(0,j.jsx)(re,{title:`Edit Warehouse`,open:ke,onCancel:()=>X(!1),destroyOnClose:!0,width:520,footer:[(0,j.jsx)(p,{onClick:()=>X(!1),children:`Cancel`},`cancel`),(0,j.jsx)(p,{type:`primary`,loading:Ae,onClick:Ne,children:`Save`},`save`)],children:(0,j.jsxs)(b,{form:Z,layout:`vertical`,requiredMark:!1,style:{marginTop:12},children:[(0,j.jsx)(b.Item,{label:`Warehouse Name`,name:`name`,rules:[{required:!0,message:`Name is required`}],children:(0,j.jsx)(x,{})}),(0,j.jsx)(b.Item,{label:`Code`,name:`code`,children:(0,j.jsx)(x,{placeholder:`MAIN-WH`})}),(0,j.jsx)(b.Item,{label:`Address`,name:`address`,children:(0,j.jsx)(x.TextArea,{rows:3,placeholder:`Warehouse address`})})]})}),(0,j.jsx)(`style`,{children:`
        .warehouse-shell {
          min-height: 100vh;
        }

        .warehouse-header {
          position: sticky;
          top: 0;
          z-index: 20;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 10px 18px;
          border-bottom: 1px solid;
        }

        .warehouse-title-area {
          display: flex;
          align-items: center;
          gap: 10px;
          min-width: 0;
        }

        .warehouse-title-block {
          min-width: 0;
        }

        .warehouse-title-row {
          display: flex;
          align-items: center;
          gap: 7px;
          min-width: 0;
          flex-wrap: wrap;
        }

        .warehouse-subtitle {
          display: block;
          max-width: 780px;
          font-size: 12px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .warehouse-actions {
          justify-content: flex-end;
        }

        .warehouse-content {
          max-width: 1440px;
          margin: 0 auto;
          padding: 16px 18px 36px;
        }

        .warehouse-alerts {
          display: grid;
          gap: 8px;
          margin-bottom: 12px;
        }

        .warehouse-stats-row,
        .warehouse-overview-row {
          margin-bottom: 12px;
        }

        .warehouse-stat-card,
        .warehouse-card,
        .warehouse-main-card {
          border-radius: 10px;
        }

        .warehouse-stat-card .ant-card-body {
          min-height: 78px;
        }

        .warehouse-details {
          display: grid;
          gap: 8px;
        }

        .warehouse-detail-line {
          display: grid;
          grid-template-columns: 92px minmax(0, 1fr);
          gap: 10px;
          align-items: start;
          font-size: 13px;
        }

        .warehouse-detail-label {
          font-size: 12px;
        }

        .warehouse-detail-value {
          min-width: 0;
          font-size: 13px;
        }

        .warehouse-category-list {
          display: grid;
          gap: 10px;
        }

        .warehouse-category-item {
          display: grid;
          gap: 4px;
        }

        .warehouse-category-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }

        .warehouse-tabs > .ant-tabs-nav {
          margin: 0;
          padding: 0 12px;
        }

        .warehouse-tab-body {
          padding: 12px;
        }

        .warehouse-toolbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          margin-bottom: 12px;
        }

        .warehouse-search {
          width: 300px;
          max-width: 100%;
        }

        .warehouse-filters {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 6px;
          flex-wrap: wrap;
        }

        .warehouse-section-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          margin-bottom: 12px;
        }

        .warehouse-link-btn {
          padding: 0;
          height: auto;
        }

        .warehouse-row-negative td {
          background: #fff1f0 !important;
        }

        .warehouse-row-zero td {
          background: #fafafa !important;
          color: rgba(0, 0, 0, 0.45);
        }

        .warehouse-main-card .ant-table-small .ant-table-thead > tr > th {
          font-size: 12px;
          font-weight: 600;
        }

        .warehouse-main-card .ant-table-small .ant-table-tbody > tr > td {
          font-size: 12px;
        }

        @media (max-width: 991px) {
          .warehouse-header {
            align-items: flex-start;
            flex-direction: column;
          }

          .warehouse-title-area {
            width: 100%;
          }

          .warehouse-actions {
            width: 100%;
            justify-content: flex-start;
          }

          .warehouse-toolbar {
            align-items: stretch;
            flex-direction: column;
          }

          .warehouse-search {
            width: 100%;
          }

          .warehouse-filters {
            justify-content: flex-start;
          }
        }

        @media (max-width: 575px) {
          .warehouse-header {
            padding: 10px 12px;
          }

          .warehouse-content {
            padding: 12px 10px 28px;
          }

          .warehouse-title-area {
            align-items: flex-start;
          }

          .warehouse-title-row {
            gap: 5px;
          }

          .warehouse-title-row .ant-typography {
            max-width: 220px;
            overflow: hidden;
            white-space: nowrap;
            text-overflow: ellipsis;
          }

          .warehouse-subtitle {
            max-width: 260px;
          }

          .warehouse-actions .ant-btn {
            flex: 1;
          }

          .warehouse-actions {
            display: grid;
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }

          .warehouse-stat-card .ant-card-body {
            min-height: 72px;
          }

          .warehouse-detail-line {
            grid-template-columns: 78px minmax(0, 1fr);
          }

          .warehouse-filters {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .warehouse-filters .ant-btn {
            width: 100%;
          }

          .warehouse-section-head {
            align-items: flex-start;
            flex-direction: column;
          }

          .warehouse-section-head .ant-btn {
            width: 100%;
          }

          .warehouse-tabs > .ant-tabs-nav {
            padding: 0 8px;
          }

          .warehouse-tab-body {
            padding: 10px 8px;
          }
        }
      `})]})}export{H as default};