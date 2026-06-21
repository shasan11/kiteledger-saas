import{i as e}from"./chunk-62oNxeRG.js";import{i as t}from"./axios-CFfZBleg.js";import{r as n,t as r}from"./jsx-runtime-gigNY91P.js";import{t as i}from"./grid-B-U-xHEr.js";import{t as a}from"./table-C0OVvqWD.js";import{t as o}from"./alert-CWS2pmeX.js";import{t as s}from"./skeleton-cooCG3hX.js";import{t as c}from"./empty-CUdvJnZZ.js";import{t as ee}from"./SearchOutlined-CtkD-uP8.js";import{t as l}from"./badge-C4sUcAPn.js";import{t as u}from"./PlusOutlined-ROE8O2J8.js";import{t as d}from"./button-B5dvIdG1.js";import{t as f}from"./dayjs.min-BjRok8LT.js";import{t as te}from"./tabs-Dynodvw3.js";import{t as p}from"./card-FobL5y2W.js";import{n as m,t as h}from"./row-hwYmTzeb.js";import{t as g}from"./space-Bu5OROsg.js";import{t as _}from"./form-DSdkaKNq.js";import{t as ne}from"./SwapOutlined-CSAtoT3v.js";import{t as v}from"./input-DA-GO2ec.js";import{t as y}from"./typography-ofUTwIJF.js";import{t as re}from"./message-Crs4rgLq.js";import{t as ie}from"./modal-Cko4-fB7.js";import{t as ae}from"./progress-DV8fyWvo.js";import{t as b}from"./tag-BtLgFRxP.js";import{t as oe}from"./EditOutlined-L2h70V4O.js";import{i as x,t as S}from"./index.esm-BVo_jOMH.js";import{c as se}from"./app-McIutTQI.js";import{t as C}from"./AuthenticatedLayout-kax9E3xH.js";import{n as ce,t as le}from"./ArrowUpOutlined-CiR0CNyu.js";import{t as ue}from"./ArrowLeftOutlined-DMsHqzbn.js";import{t as de}from"./ArrowRightOutlined-CslxGbkS.js";import{t as fe}from"./ExclamationCircleOutlined-jYlvYpb_.js";import{t as pe}from"./InboxOutlined-DMsNr2vZ.js";import{t as me}from"./ToolOutlined-CL0cySda.js";import{t as he}from"./WarningOutlined-kjUmTiDg.js";import{t as w}from"./relativeTime-DeDwdlHK.js";var T=e(n(),1),E=e(f(),1),D=e(w(),1),O=r();E.default.extend(D.default);var{Title:ge,Text:k}=y,{useBreakpoint:_e}=i,A=``,j=e=>`${A}${e}`,M=()=>{let e=typeof window<`u`?localStorage.getItem(`accessToken`):null;return e?{Authorization:`Bearer ${e}`}:{}},N=(e,n={})=>t.get(j(e),{headers:M(),params:n}),P=e=>e?.results||e||[],F=(e,t=2)=>Number(e??0).toLocaleString(void 0,{minimumFractionDigits:t,maximumFractionDigits:t}),I=e=>{let t=Number(e??0);return Number.isInteger(t)?t.toLocaleString():F(t,4).replace(/\.?0+$/,``)},L=e=>e&&(0,E.default)(e).isValid()?(0,E.default)(e).format(`DD MMM YYYY`):`-`,ve=e=>e&&(0,E.default)(e).isValid()?(0,E.default)(e).fromNow():`-`,ye=e=>{let t=Number(e?.qty_on_hand??0),n=Number(e?.reorder_level??e?.product?.reorder_level??0);return t<0?{label:`Negative`,color:`red`}:t===0?{label:`Out`,color:`volcano`}:n>0&&t<=n?{label:`Low`,color:`gold`}:{label:`In Stock`,color:`green`}},R=e=>{let[t,n]={draft:[`default`,`Draft`],approved:[`success`,`Approved`],posted:[`success`,`Posted`],completed:[`success`,`Completed`],void:[`error`,`Void`],cancelled:[`error`,`Cancelled`]}[e]||[`default`,e||`Draft`];return(0,O.jsx)(b,{color:t,children:n})};function z({label:e,value:t,hint:n,tone:r,onClick:i}){let{token:a}=se.useToken();return(0,O.jsx)(p,{size:`small`,hoverable:!!i,onClick:i,className:`warehouse-stat-card`,style:{borderColor:a.colorBorderSecondary,cursor:i?`pointer`:`default`},bodyStyle:{padding:12},children:(0,O.jsxs)(`div`,{style:{display:`flex`,flexDirection:`column`,gap:3},children:[(0,O.jsx)(k,{type:`secondary`,style:{fontSize:11},children:e}),(0,O.jsx)(`div`,{style:{fontSize:20,fontWeight:700,lineHeight:1.15,color:r||a.colorText},children:t}),n&&(0,O.jsx)(k,{type:`secondary`,style:{fontSize:11},children:n})]})})}function B({label:e,children:t}){return(0,O.jsxs)(`div`,{className:`warehouse-detail-line`,children:[(0,O.jsx)(k,{type:`secondary`,className:`warehouse-detail-label`,children:e}),(0,O.jsx)(`div`,{className:`warehouse-detail-value`,children:t})]})}function V({id:e,...n}){let{token:r}=se.useToken(),i=!_e().md,[f,y]=(0,T.useState)(null),[w,E]=(0,T.useState)([]),[D,A]=(0,T.useState)([]),[V,be]=(0,T.useState)([]),[H,xe]=(0,T.useState)([]),[Se,Ce]=(0,T.useState)(!0),[U,we]=(0,T.useState)(!0),[W,Te]=(0,T.useState)(!0),[Ee,De]=(0,T.useState)(null),[G,Oe]=(0,T.useState)(``),[K,q]=(0,T.useState)(`all`),[ke,J]=(0,T.useState)(`stock`),[Ae,Y]=(0,T.useState)(!1),[X]=_.useForm(),[je,Z]=(0,T.useState)(!1);(0,T.useEffect)(()=>{let t=!1;return(async()=>{try{let n=await N(`/api/warehouses/${e}/`);t||y(n.data)}catch(e){t||De(e?.response?.data?.message||`Failed to load warehouse`)}finally{t||Ce(!1)}})(),(async()=>{try{let n=await N(`/api/warehouse-items/`,{warehouse_id:e,include_zero_stock:1,include_inactive:1,page_size:500,ordering:`-total_value`});t||E(P(n.data))}finally{t||we(!1)}})(),(async()=>{try{let[n,r,i,a]=await Promise.allSettled([N(`/api/warehouse-transfers/`,{from_warehouse_id:e,page_size:20,ordering:`-created_at`}),N(`/api/warehouse-transfers/`,{to_warehouse_id:e,page_size:20,ordering:`-created_at`}),N(`/api/adjustments/`,{warehouse_id:e,page_size:15,ordering:`-created_at`}),N(`/api/production-journals/`,{warehouse_id:e,page_size:10,ordering:`-created_at`})]);if(t)return;let o=n.status===`fulfilled`?P(n.value.data).map(e=>({...e,_direction:`out`,_other:e.toWarehouse})):[];A([...r.status===`fulfilled`?P(r.value.data).map(e=>({...e,_direction:`in`,_other:e.fromWarehouse})):[],...o].sort((e,t)=>new Date(t.created_at)-new Date(e.created_at)).slice(0,25)),be(i.status===`fulfilled`?P(i.value.data):[]),xe(a.status===`fulfilled`?P(a.value.data):[])}finally{t||Te(!1)}})(),()=>{t=!0}},[e]);let Q=(0,T.useMemo)(()=>{let e=w.reduce((e,t)=>e+Number(t.total_value??0),0),t=w.filter(e=>Number(e.qty_on_hand)>0),n=w.filter(e=>{let t=Number(e.qty_on_hand??0),n=Number(e.reorder_level??e.product?.reorder_level??0);return t>0&&n>0&&t<=n}),r=w.filter(e=>Number(e.qty_on_hand)===0),i=w.filter(e=>Number(e.qty_on_hand)<0),a={};w.forEach(e=>{let t=e.product?.productCategory?.name||e.product?.category_name||`Uncategorised`;a[t]=(a[t]||0)+Number(e.total_value??0)});let o=Object.entries(a).sort((e,t)=>t[1]-e[1]).slice(0,6).map(([t,n])=>({name:t,value:n,percent:e>0?Math.round(n/e*100):0}));return{total:e,skus:w.length,inStock:t.length,lowStock:n.length,outOfStock:r.length,negative:i.length,categories:o}},[w]),$=(0,T.useMemo)(()=>{let e=[...w];if(G.trim()){let t=G.toLowerCase();e=e.filter(e=>{let n=e.product?.name?.toLowerCase()||``,r=e.product?.sku?.toLowerCase()||``,i=e.product?.code?.toLowerCase()||``;return n.includes(t)||r.includes(t)||i.includes(t)})}return K===`in`&&(e=e.filter(e=>Number(e.qty_on_hand)>0)),K===`low`&&(e=e.filter(e=>{let t=Number(e.qty_on_hand??0),n=Number(e.reorder_level??e.product?.reorder_level??0);return t>0&&n>0&&t<=n})),K===`out`&&(e=e.filter(e=>Number(e.qty_on_hand)===0)),K===`negative`&&(e=e.filter(e=>Number(e.qty_on_hand)<0)),e},[w,G,K]),Me=()=>{X.setFieldsValue({name:f?.name,code:f?.code,address:f?.address}),Y(!0)},Ne=async()=>{let n=await X.validateFields().catch(()=>null);if(n){Z(!0);try{y((await t.patch(j(`/api/warehouses/${e}/`),n,{headers:{...M(),"Content-Type":`application/json`}})).data),Y(!1),re.success(`Warehouse updated`)}catch(e){re.error(e?.response?.data?.message||`Update failed`)}finally{Z(!1)}}},Pe=[{title:`Product`,key:`product`,width:240,fixed:i?void 0:`left`,render:(e,t)=>(0,O.jsxs)(`div`,{style:{minWidth:0},children:[(0,O.jsx)(k,{strong:!0,style:{display:`block`,lineHeight:1.25},children:t.product?.name||`-`}),(0,O.jsxs)(g,{size:4,wrap:!0,children:[t.product?.sku&&(0,O.jsxs)(k,{type:`secondary`,style:{fontSize:11},children:[`SKU: `,t.product.sku]}),t.product?.code&&(0,O.jsx)(b,{style:{marginInlineEnd:0},children:t.product.code})]})]})},{title:`Category`,key:`category`,width:140,responsive:[`lg`],render:(e,t)=>(0,O.jsx)(k,{type:`secondary`,style:{fontSize:12},children:t.product?.productCategory?.name||`—`})},{title:`Unit`,key:`unit`,width:80,align:`center`,responsive:[`md`],render:(e,t)=>t.product?.productUnit?.name||t.unit_code||`—`},{title:`Qty`,dataIndex:`qty_on_hand`,width:110,align:`right`,sorter:(e,t)=>Number(e.qty_on_hand)-Number(t.qty_on_hand),render:e=>{let t=Number(e??0);return(0,O.jsx)(k,{strong:!0,style:{color:t<0?r.colorError:t===0?r.colorTextTertiary:r.colorText},children:I(e)})}},{title:`Reorder`,dataIndex:`reorder_level`,width:110,align:`right`,responsive:[`lg`],render:(e,t)=>{let n=Number(e??t.product?.reorder_level??0);return n>0?I(n):(0,O.jsx)(k,{type:`secondary`,children:`—`})}},{title:`Avg Cost`,dataIndex:`avg_cost`,width:110,align:`right`,responsive:[`xl`],sorter:(e,t)=>Number(e.avg_cost)-Number(t.avg_cost),render:e=>F(e)},{title:`Value`,dataIndex:`total_value`,width:130,align:`right`,sorter:(e,t)=>Number(e.total_value)-Number(t.total_value),defaultSortOrder:`descend`,render:e=>(0,O.jsx)(k,{strong:!0,children:F(e)})},{title:`Status`,key:`status`,width:100,align:`center`,render:(e,t)=>{let n=ye(t);return(0,O.jsx)(b,{color:n.color,children:n.label})}}],Fe=[{title:`Transfer`,dataIndex:`transfer_no`,width:130,render:(e,t)=>(0,O.jsx)(d,{type:`link`,size:`small`,className:`warehouse-link-btn`,onClick:()=>x.visit(route(`inventory.warehouse-transfers.show`,t.id)),children:e||`#draft`})},{title:`Date`,dataIndex:`transfer_date`,width:110,render:L},{title:`Direction`,key:`direction`,width:110,align:`center`,render:(e,t)=>t._direction===`in`?(0,O.jsx)(b,{color:`green`,icon:(0,O.jsx)(ce,{}),children:`IN`}):(0,O.jsx)(b,{color:`blue`,icon:(0,O.jsx)(le,{}),children:`OUT`})},{title:`Other Warehouse`,key:`other`,ellipsis:!0,render:(e,t)=>t._other?.name||t._other?.label||`—`},{title:`Value`,dataIndex:`total`,width:120,align:`right`,responsive:[`md`],render:e=>e?F(e):`—`},{title:`Status`,dataIndex:`status`,width:110,render:R},{title:``,key:`action`,width:48,align:`right`,render:(e,t)=>(0,O.jsx)(d,{type:`text`,size:`small`,icon:(0,O.jsx)(de,{}),onClick:()=>x.visit(route(`inventory.warehouse-transfers.show`,t.id))})}],Ie=[{title:`Adjustment`,dataIndex:`adjustment_no`,width:140,render:(e,t)=>(0,O.jsx)(d,{type:`link`,size:`small`,className:`warehouse-link-btn`,onClick:()=>x.visit(route(`inventory.adjustments.show`,t.id)),children:e||`#draft`})},{title:`Date`,dataIndex:`adjustment_date`,width:110,render:L},{title:`Reason`,dataIndex:`reason`,ellipsis:!0,render:e=>e||`—`},{title:`Items`,key:`items`,width:80,align:`center`,responsive:[`md`],render:(e,t)=>(0,O.jsx)(l,{count:(t.items||t.inventoryAdjustmentLines||[]).length,color:r.colorPrimary})},{title:`Status`,dataIndex:`status`,width:110,render:R},{title:``,key:`action`,width:48,align:`right`,render:(e,t)=>(0,O.jsx)(d,{type:`text`,size:`small`,icon:(0,O.jsx)(de,{}),onClick:()=>x.visit(route(`inventory.adjustments.show`,t.id))})}],Le=[{title:`Journal`,dataIndex:`code`,width:140,render:(e,t)=>(0,O.jsx)(d,{type:`link`,size:`small`,className:`warehouse-link-btn`,onClick:()=>x.visit(route(`inventory.production-journals.show`,t.id)),children:e||`#draft`})},{title:`Date`,dataIndex:`date`,width:110,render:L},{title:`Finished Product`,key:`product`,ellipsis:!0,render:(e,t)=>t.finishedProduct?.name||t.finished_product_id||`—`},{title:`Output`,dataIndex:`output_quantity`,width:110,align:`right`,render:(e,t)=>`${I(e)} ${t.output_unit_code||``}`.trim()},{title:`Cost`,dataIndex:`finished_goods_cost`,width:120,align:`right`,responsive:[`md`],render:F},{title:`Status`,dataIndex:`status`,width:110,render:R}];if(Se)return(0,O.jsxs)(C,{user:n.auth?.user,children:[(0,O.jsx)(S,{title:`Warehouse`}),(0,O.jsx)(`div`,{style:{padding:i?16:24},children:(0,O.jsx)(s,{active:!0,paragraph:{rows:10}})})]});if(Ee)return(0,O.jsxs)(C,{user:n.auth?.user,children:[(0,O.jsx)(S,{title:`Warehouse`}),(0,O.jsx)(`div`,{style:{padding:i?16:24},children:(0,O.jsx)(o,{type:`error`,showIcon:!0,message:Ee})})]});let Re=[{key:`all`,label:`All`,count:Q.skus},{key:`in`,label:`In Stock`,count:Q.inStock},{key:`low`,label:`Low`,count:Q.lowStock},{key:`out`,label:`Out`,count:Q.outOfStock},{key:`negative`,label:`Negative`,count:Q.negative}];return(0,O.jsxs)(C,{user:n.auth?.user,children:[(0,O.jsx)(S,{title:`Warehouse — ${f?.name||``}`}),(0,O.jsxs)(`div`,{className:`warehouse-shell`,style:{background:r.colorBgLayout,color:r.colorText},children:[(0,O.jsxs)(`div`,{className:`warehouse-header`,style:{background:r.colorBgContainer,borderColor:r.colorBorderSecondary},children:[(0,O.jsxs)(`div`,{className:`warehouse-title-area`,children:[(0,O.jsx)(d,{size:`small`,icon:(0,O.jsx)(ue,{}),onClick:()=>x.visit(route(`warehouse.index`)),children:`Back`}),(0,O.jsxs)(`div`,{className:`warehouse-title-block`,children:[(0,O.jsxs)(`div`,{className:`warehouse-title-row`,children:[(0,O.jsx)(pe,{style:{color:r.colorTextSecondary}}),(0,O.jsx)(ge,{level:5,style:{margin:0},children:f?.name||`Warehouse`}),f?.code&&(0,O.jsx)(b,{children:f.code}),(0,O.jsx)(b,{color:f?.active?`success`:`error`,children:f?.active?`Active`:`Inactive`}),f?.is_system_generated&&(0,O.jsx)(b,{color:`purple`,children:`System`})]}),(0,O.jsxs)(k,{type:`secondary`,className:`warehouse-subtitle`,children:[f?.branch?.name||f?.branch?.label||`No branch`,f?.address?` · ${f.address}`:``]})]})]}),(0,O.jsxs)(g,{wrap:!0,className:`warehouse-actions`,children:[(0,O.jsx)(d,{size:`small`,icon:(0,O.jsx)(oe,{}),onClick:Me,children:`Edit`}),(0,O.jsx)(d,{size:`small`,icon:(0,O.jsx)(ne,{}),onClick:()=>x.visit(route(`inventory.warehouse-transfers.add`)),children:`Transfer`}),(0,O.jsx)(d,{size:`small`,icon:(0,O.jsx)(me,{}),type:`primary`,onClick:()=>x.visit(route(`inventory.adjustments.add`)),children:`Adjustment`})]})]}),(0,O.jsxs)(`main`,{className:`warehouse-content`,children:[(Q.lowStock>0||Q.negative>0)&&!U&&(0,O.jsxs)(`div`,{className:`warehouse-alerts`,children:[Q.negative>0&&(0,O.jsx)(o,{type:`error`,showIcon:!0,icon:(0,O.jsx)(fe,{}),message:`${Q.negative} negative stock item${Q.negative>1?`s`:``}`,action:(0,O.jsx)(d,{size:`small`,danger:!0,onClick:()=>{J(`stock`),q(`negative`)},children:`View`})}),Q.lowStock>0&&(0,O.jsx)(o,{type:`warning`,showIcon:!0,icon:(0,O.jsx)(he,{}),message:`${Q.lowStock} low stock item${Q.lowStock>1?`s`:``}`,action:(0,O.jsx)(d,{size:`small`,onClick:()=>{J(`stock`),q(`low`)},children:`View`})})]}),(0,O.jsxs)(h,{gutter:[10,10],className:`warehouse-stats-row`,children:[(0,O.jsx)(m,{xs:12,sm:8,lg:4,children:(0,O.jsx)(z,{label:`Stock Value`,value:F(Q.total),hint:`${Q.skus} SKUs`,tone:r.colorPrimary,onClick:()=>J(`stock`)})}),(0,O.jsx)(m,{xs:12,sm:8,lg:4,children:(0,O.jsx)(z,{label:`In Stock`,value:Q.inStock,hint:`available`,tone:r.colorSuccess,onClick:()=>{J(`stock`),q(`in`)}})}),(0,O.jsx)(m,{xs:12,sm:8,lg:4,children:(0,O.jsx)(z,{label:`Low Stock`,value:Q.lowStock,hint:`below reorder`,tone:r.colorWarning,onClick:()=>{J(`stock`),q(`low`)}})}),(0,O.jsx)(m,{xs:12,sm:8,lg:4,children:(0,O.jsx)(z,{label:`Out`,value:Q.outOfStock,hint:`zero balance`,tone:r.colorError,onClick:()=>{J(`stock`),q(`out`)}})}),(0,O.jsx)(m,{xs:12,sm:8,lg:4,children:(0,O.jsx)(z,{label:`Negative`,value:Q.negative,hint:Q.negative?`check now`:`clear`,tone:r.colorError,onClick:()=>{J(`stock`),q(`negative`)}})}),(0,O.jsx)(m,{xs:12,sm:8,lg:4,children:(0,O.jsx)(z,{label:`Transfers`,value:D.length,hint:`recent`,tone:r.colorText,onClick:()=>J(`transfers`)})})]}),(0,O.jsxs)(h,{gutter:[12,12],className:`warehouse-overview-row`,children:[(0,O.jsx)(m,{xs:24,lg:8,children:(0,O.jsx)(p,{size:`small`,className:`warehouse-card`,title:`Details`,bodyStyle:{padding:12},children:(0,O.jsxs)(`div`,{className:`warehouse-details`,children:[(0,O.jsx)(B,{label:`Code`,children:f?.code?(0,O.jsx)(b,{children:f.code}):`—`}),(0,O.jsx)(B,{label:`Branch`,children:f?.branch?.name||f?.branch?.label||`—`}),(0,O.jsx)(B,{label:`Address`,children:f?.address||(0,O.jsx)(k,{type:`secondary`,children:`Not set`})}),(0,O.jsx)(B,{label:`Type`,children:(0,O.jsx)(b,{color:f?.is_system_generated?`purple`:`default`,children:f?.is_system_generated?`System`:`Manual`})}),(0,O.jsx)(B,{label:`Created`,children:L(f?.created_at)}),(0,O.jsx)(B,{label:`Updated`,children:ve(f?.updated_at)})]})})}),(0,O.jsx)(m,{xs:24,lg:16,children:(0,O.jsx)(p,{size:`small`,className:`warehouse-card`,title:`Stock Value by Category`,extra:(0,O.jsx)(k,{type:`secondary`,style:{fontSize:12},children:F(Q.total)}),bodyStyle:{padding:12},children:U?(0,O.jsx)(s,{active:!0,paragraph:{rows:5}}):Q.categories.length===0?(0,O.jsx)(c,{description:`No stock data`,image:c.PRESENTED_IMAGE_SIMPLE,style:{padding:24}}):(0,O.jsx)(`div`,{className:`warehouse-category-list`,children:Q.categories.map(e=>(0,O.jsxs)(`div`,{className:`warehouse-category-item`,children:[(0,O.jsxs)(`div`,{className:`warehouse-category-top`,children:[(0,O.jsx)(k,{ellipsis:!0,style:{maxWidth:i?160:420},children:e.name}),(0,O.jsxs)(g,{size:10,children:[(0,O.jsxs)(k,{type:`secondary`,style:{fontSize:12},children:[e.percent,`%`]}),(0,O.jsx)(k,{strong:!0,style:{fontSize:12},children:F(e.value)})]})]}),(0,O.jsx)(ae,{percent:e.percent,showInfo:!1,size:[void 0,5],strokeColor:r.colorPrimary,trailColor:r.colorFillQuaternary})]},e.name))})})})]}),(0,O.jsx)(p,{size:`small`,className:`warehouse-main-card`,bodyStyle:{padding:0},children:(0,O.jsx)(te,{activeKey:ke,onChange:J,size:`small`,className:`warehouse-tabs`,items:[{key:`stock`,label:(0,O.jsxs)(g,{size:6,children:[(0,O.jsx)(`span`,{children:`Stock`}),(0,O.jsx)(l,{count:Q.skus,overflowCount:999})]}),children:(0,O.jsxs)(`div`,{className:`warehouse-tab-body`,children:[(0,O.jsxs)(`div`,{className:`warehouse-toolbar`,children:[(0,O.jsx)(v,{allowClear:!0,prefix:(0,O.jsx)(ee,{style:{color:r.colorTextTertiary}}),placeholder:`Search product, SKU, code...`,value:G,onChange:e=>Oe(e.target.value),className:`warehouse-search`}),(0,O.jsx)(`div`,{className:`warehouse-filters`,children:Re.map(e=>(0,O.jsxs)(d,{size:`small`,type:K===e.key?`primary`:`default`,onClick:()=>q(e.key),children:[e.label,(0,O.jsx)(`span`,{style:{marginLeft:5},children:e.count})]},e.key))})]}),U?(0,O.jsx)(s,{active:!0,paragraph:{rows:8}}):$.length===0?(0,O.jsx)(c,{description:`No matching products`,image:c.PRESENTED_IMAGE_SIMPLE,style:{padding:36}}):(0,O.jsx)(a,{rowKey:`id`,size:`small`,columns:Pe,dataSource:$,pagination:{pageSize:25,size:`small`,showTotal:e=>`${e} items`},scroll:{x:900},rowClassName:e=>{let t=Number(e.qty_on_hand);return t<0?`warehouse-row-negative`:t===0?`warehouse-row-zero`:``},summary:()=>(0,O.jsx)(a.Summary,{fixed:!0,children:(0,O.jsxs)(a.Summary.Row,{children:[(0,O.jsxs)(a.Summary.Cell,{index:0,colSpan:6,children:[(0,O.jsx)(k,{strong:!0,children:`Total`}),(0,O.jsxs)(k,{type:`secondary`,style:{marginLeft:6},children:[$.length,` SKUs`]})]}),(0,O.jsx)(a.Summary.Cell,{index:6,align:`right`,children:(0,O.jsx)(k,{strong:!0,children:F($.reduce((e,t)=>e+Number(t.total_value??0),0))})}),(0,O.jsx)(a.Summary.Cell,{index:7})]})})})]})},{key:`transfers`,label:(0,O.jsxs)(g,{size:6,children:[(0,O.jsx)(`span`,{children:`Transfers`}),(0,O.jsx)(l,{count:D.length,overflowCount:99})]}),children:(0,O.jsxs)(`div`,{className:`warehouse-tab-body`,children:[(0,O.jsxs)(`div`,{className:`warehouse-section-head`,children:[(0,O.jsx)(k,{type:`secondary`,children:`Recent transfers involving this warehouse`}),(0,O.jsx)(d,{size:`small`,icon:(0,O.jsx)(u,{}),onClick:()=>x.visit(route(`inventory.warehouse-transfers.add`)),children:`New`})]}),W?(0,O.jsx)(s,{active:!0,paragraph:{rows:6}}):D.length===0?(0,O.jsx)(c,{description:`No transfers yet`,image:c.PRESENTED_IMAGE_SIMPLE,style:{padding:36}}):(0,O.jsx)(a,{rowKey:`id`,size:`small`,columns:Fe,dataSource:D,pagination:{pageSize:15,size:`small`},scroll:{x:720}})]})},{key:`adjustments`,label:(0,O.jsxs)(g,{size:6,children:[(0,O.jsx)(`span`,{children:`Adjustments`}),(0,O.jsx)(l,{count:V.length,overflowCount:99})]}),children:(0,O.jsxs)(`div`,{className:`warehouse-tab-body`,children:[(0,O.jsxs)(`div`,{className:`warehouse-section-head`,children:[(0,O.jsx)(k,{type:`secondary`,children:`Recent inventory adjustments`}),(0,O.jsx)(d,{size:`small`,icon:(0,O.jsx)(u,{}),onClick:()=>x.visit(route(`inventory.adjustments.add`)),children:`New`})]}),W?(0,O.jsx)(s,{active:!0,paragraph:{rows:6}}):V.length===0?(0,O.jsx)(c,{description:`No adjustments yet`,image:c.PRESENTED_IMAGE_SIMPLE,style:{padding:36}}):(0,O.jsx)(a,{rowKey:`id`,size:`small`,columns:Ie,dataSource:V,pagination:{pageSize:15,size:`small`},scroll:{x:680}})]})},{key:`production`,label:(0,O.jsxs)(g,{size:6,children:[(0,O.jsx)(`span`,{children:`Production`}),(0,O.jsx)(l,{count:H.length,overflowCount:99})]}),children:(0,O.jsxs)(`div`,{className:`warehouse-tab-body`,children:[(0,O.jsxs)(`div`,{className:`warehouse-section-head`,children:[(0,O.jsx)(k,{type:`secondary`,children:`Recent production journals`}),(0,O.jsx)(d,{size:`small`,icon:(0,O.jsx)(u,{}),onClick:()=>x.visit(route(`inventory.production-journals.add`)),children:`New`})]}),W?(0,O.jsx)(s,{active:!0,paragraph:{rows:6}}):H.length===0?(0,O.jsx)(c,{description:`No production journals yet`,image:c.PRESENTED_IMAGE_SIMPLE,style:{padding:36}}):(0,O.jsx)(a,{rowKey:`id`,size:`small`,columns:Le,dataSource:H,pagination:{pageSize:10,size:`small`},scroll:{x:700}})]})}]})})]})]}),(0,O.jsx)(ie,{title:`Edit Warehouse`,open:Ae,onCancel:()=>Y(!1),destroyOnClose:!0,width:520,footer:[(0,O.jsx)(d,{onClick:()=>Y(!1),children:`Cancel`},`cancel`),(0,O.jsx)(d,{type:`primary`,loading:je,onClick:Ne,children:`Save`},`save`)],children:(0,O.jsxs)(_,{form:X,layout:`vertical`,requiredMark:!1,style:{marginTop:12},children:[(0,O.jsx)(_.Item,{label:`Warehouse Name`,name:`name`,rules:[{required:!0,message:`Name is required`}],children:(0,O.jsx)(v,{})}),(0,O.jsx)(_.Item,{label:`Code`,name:`code`,children:(0,O.jsx)(v,{placeholder:`MAIN-WH`})}),(0,O.jsx)(_.Item,{label:`Address`,name:`address`,children:(0,O.jsx)(v.TextArea,{rows:3,placeholder:`Warehouse address`})})]})}),(0,O.jsx)(`style`,{children:`
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
      `})]})}export{V as default};