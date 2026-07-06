import{i as e}from"./chunk-62oNxeRG.js";import{i as t}from"./axios-CFfZBleg.js";import{r as n,t as r}from"./jsx-runtime-gigNY91P.js";import{t as i}from"./table-tecCJUwL.js";import{t as a}from"./alert-BaHPwePE.js";import{t as o}from"./select-BmOvnPIw.js";import{t as s}from"./skeleton-AlTJQnhB.js";import{t as c}from"./empty-BZQ-tvZU.js";import{t as l}from"./CheckOutlined-DT1yYmBg.js";import{t as u}from"./avatar-DawarwsK.js";import{t as d}from"./tooltip-clCwpzP8.js";import{t as f}from"./PlusOutlined-HIrDAG4O.js";import{t as p}from"./button-Dz1Av4BD.js";import{t as m}from"./tabs-BYU3tg5F.js";import{t as h}from"./card-Vt669Ygr.js";import{t as g}from"./checkbox-nDG4J0EN.js";import{n as _,t as v}from"./row-BjiB-KD9.js";import{t as y}from"./space-DwTT9ayb.js";import{t as ee}from"./CalendarOutlined-Kz1imFgW.js";import{t as b}from"./ClockCircleOutlined-C5swacTD.js";import{t as te}from"./drawer-DtcwWALr.js";import{t as x}from"./form-BlARKSGY.js";import{t as S}from"./SwapOutlined-DR9O-LYB.js";import{t as C}from"./input-BDCOVLHk.js";import{t as w}from"./typography-COSGzUQY.js";import{t as T}from"./message-G__c7vuu.js";import{t as E}from"./modal-KzNZ3gXi.js";import{t as ne}from"./progress-DRQJKM32.js";import{t as D}from"./tag-CxQ8hfzV.js";import{t as re}from"./timeline-s2hizfRZ.js";import{t as O}from"./ReusableCrud-XYjGrQK4.js";import{t as k}from"./EditOutlined-MYYWDS3l.js";import{i as A,t as ie}from"./index.esm-s6VguL6m.js";import{c as j}from"./app-dkDC2mxk.js";import{a as ae,d as oe,t as se}from"./AuthenticatedLayout-BOz0K_Ko.js";import{t as ce}from"./AppstoreOutlined-Dzpv_O_l.js";import{t as le}from"./ArrowLeftOutlined-C821IAvM.js";import{t as ue}from"./BankOutlined-CElAlwXB.js";import{t as de}from"./CloseCircleOutlined-C9BhWXuX.js";import{t as fe}from"./DollarCircleOutlined-DLIi_3AM.js";import{n as pe,t as me}from"./RiseOutlined-Dpx4_Afw.js";import{t as he}from"./FundOutlined-wjsbggTk.js";import{t as M}from"./MailOutlined-r6a2x-6s.js";import{t as ge}from"./NumberOutlined-B7Qpw2rY.js";import{t as N}from"./PhoneOutlined-0rPTuCm2.js";import{t as _e}from"./ScheduleOutlined-M9Lu37FO.js";import{t as ve}from"./UnorderedListOutlined-pwvch3Wk.js";import{t as ye}from"./UserSwitchOutlined-C3LkhBDH.js";import{t as be}from"./WalletOutlined-DIhyGJLs.js";import{Cn as xe,z as Se}from"./CategoricalChart-sok1BzJ7.js";import{t as Ce}from"./Legend-DUL4ITI5.js";import{n as we,t as Te}from"./BarChart-TVYMbC7w.js";import{n as Ee,r as De,s as Oe}from"./CartesianChart-lRmTBYGO.js";import{i as P,r as F,t as I}from"./crmCrudConfigs-C2qWanJO.js";var L=e(n(),1),R=r(),ke=``,Ae=e=>`${ke}${e}`,je=()=>{let e=localStorage.getItem(`accessToken`);return{Accept:`application/json`,"Content-Type":`application/json`,...e?{Authorization:`Bearer ${e}`}:{}}};function Me({buttonProps:e={},children:n=`Send Email`,defaultValues:r={},disabled:i=!1,endpoint:a=`/api/hrm/emails/`,modalTitle:o=`Send Email`,onSuccess:s}){let[c,l]=(0,L.useState)(!1),[u,d]=(0,L.useState)(!1),[f]=x.useForm(),m=(0,L.useMemo)(()=>({sender_email:r.sender_email||``,receiver_email:r.receiver_email||r.to||``,subject:r.subject||``,body:r.body||``,email_status:r.email_status||`PENDING`,active:r.active??!0}),[r]);(0,L.useEffect)(()=>{c&&f.setFieldsValue(m)},[f,m,c]);let h=async()=>{d(!0);try{let e=await f.validateFields();await t.post(Ae(a),e,{headers:je()}),T.success(`Email queued successfully.`),l(!1),f.resetFields(),s?.(e)}catch(e){e?.errorFields||T.error(e?.response?.data?.message||`Failed to send email.`)}finally{d(!1)}};return(0,R.jsxs)(R.Fragment,{children:[(0,R.jsx)(p,{type:`link`,icon:(0,R.jsx)(M,{}),disabled:i,onClick:()=>l(!0),...e,children:n}),(0,R.jsx)(E,{title:o,open:c,okText:`Send`,confirmLoading:u,onOk:h,onCancel:()=>l(!1),destroyOnClose:!0,children:(0,R.jsxs)(x,{form:f,layout:`vertical`,initialValues:m,children:[(0,R.jsx)(x.Item,{name:`sender_email`,label:`From Email`,rules:[{required:!0,message:`From email is required.`},{type:`email`,message:`Enter a valid from email.`}],children:(0,R.jsx)(C,{placeholder:`sender@example.com`})}),(0,R.jsx)(x.Item,{name:`receiver_email`,label:`To Email`,rules:[{required:!0,message:`Recipient email is required.`},{type:`email`,message:`Enter a valid recipient email.`}],children:(0,R.jsx)(C,{placeholder:`recipient@example.com`})}),(0,R.jsx)(x.Item,{name:`subject`,label:`Subject`,rules:[{required:!0,message:`Subject is required.`}],children:(0,R.jsx)(C,{placeholder:`Email subject`})}),(0,R.jsx)(x.Item,{name:`body`,label:`Body`,children:(0,R.jsx)(C.TextArea,{rows:6,placeholder:`Write your message here...`})})]})})]})}var{Paragraph:Ne,Text:z,Title:Pe}=w,B=``,V=e=>`${B}${e}`,H=()=>{let e=localStorage.getItem(`accessToken`);return{Accept:`application/json`,"Content-Type":`application/json`,...e?{Authorization:`Bearer ${e}`}:{}}},U=(e,t,n)=>{try{if(typeof route==`function`)return t?route(e,t):route(e)}catch{return n}return n},Fe=e=>e?.data??e,W=e=>{let t=Fe(e);return Array.isArray(t?.data)?t.data:Array.isArray(t?.results)?t.results:Array.isArray(t)?t:[]},G=e=>{if(!e)return`-`;try{return new Date(e).toLocaleString(`en-GB`,{day:`2-digit`,month:`short`,year:`numeric`,hour:`2-digit`,minute:`2-digit`})}catch{return e}},Ie=e=>{if(!e)return`-`;try{return new Date(e).toLocaleDateString(`en-GB`,{day:`2-digit`,month:`short`,year:`numeric`})}catch{return e}},K=e=>e==null||e===``?`-`:Number(e||0).toLocaleString(void 0,{minimumFractionDigits:2,maximumFractionDigits:2}),q=e=>e?String(e).replace(/_/g,` `).replace(/\b\w/g,e=>e.toUpperCase()):`-`,J=e=>e?.name||e?.display_name||e?.company_name||e?.title||e?.subject||e?.email||`-`,Le=(e=``)=>{let t=String(e).trim().split(/\s+/).filter(Boolean);return t.length?t.length===1?t[0].slice(0,2).toUpperCase():`${t[0][0]}${t[1][0]}`.toUpperCase():`?`},Re={active:`success`,inactive:`error`,new:`blue`,contacted:`cyan`,qualified:`green`,unqualified:`volcano`,converted:`purple`,lost:`red`,pending:`orange`,in_progress:`blue`,completed:`green`,cancelled:`red`,low:`default`,medium:`blue`,high:`orange`,urgent:`red`,customer:`green`,supplier:`purple`,lead:`gold`,open:`blue`,won:`green`};function Y({value:e}){return e==null||e===``?(0,R.jsx)(z,{type:`secondary`,children:`-`}):(0,R.jsx)(`span`,{children:e})}function X({value:e}){return e==null||e===``?(0,R.jsx)(z,{type:`secondary`,children:`-`}):(0,R.jsx)(D,{color:Re[e]||`default`,className:`crm-show__tag`,children:q(e)})}function ze({rows:e=[]}){let t=e.filter(Boolean);return t.length?(0,R.jsx)(`div`,{className:`crm-show__rail-table-wrap`,children:t.map(e=>(0,R.jsxs)(`div`,{className:`crm-show__rail-row`,children:[(0,R.jsx)(z,{type:`secondary`,children:e.label}),(0,R.jsx)(`div`,{children:e.value??`-`})]},e.label))}):null}function Z({title:e,extra:t,children:n,headless:r=!1,className:i=``}){return(0,R.jsxs)(h,{size:`small`,extra:r?null:t,className:`crm-show__card ${r?`crm-show__card--headless`:``} ${i}`.trim(),children:[r&&(e||t)?(0,R.jsxs)(`div`,{className:`crm-show__section-head`,children:[e?(0,R.jsx)(z,{strong:!0,className:`crm-show__section-title`,children:e}):(0,R.jsx)(`span`,{}),t?(0,R.jsx)(`div`,{className:`crm-show__section-extra`,children:t}):null]}):null,n]})}function Q({title:e,extra:t,children:n,compact:r=!1}){return(0,R.jsxs)(`section`,{className:`crm-show__overview-panel ${r?`is-compact`:``}`.trim(),children:[e||t?(0,R.jsxs)(`div`,{className:`crm-show__overview-panel-head`,children:[e?(0,R.jsx)(z,{strong:!0,children:e}):(0,R.jsx)(`span`,{}),t?(0,R.jsx)(`div`,{className:`crm-show__overview-panel-extra`,children:t}):null]}):null,(0,R.jsx)(`div`,{className:`crm-show__overview-panel-body`,children:n})]})}function Be({label:e,value:t}){return(0,R.jsxs)(`div`,{className:`crm-show__overview-field`,children:[(0,R.jsx)(z,{type:`secondary`,children:e}),(0,R.jsx)(`div`,{children:t??(0,R.jsx)(z,{type:`secondary`,children:`-`})})]})}function Ve({rows:e=[]}){let t=e.filter(Boolean);return t.length?(0,R.jsx)(`div`,{className:`crm-show__overview-fields`,children:t.map(e=>(0,R.jsx)(Be,{label:e.label,value:e.value},e.label))}):null}function $({title:e,endpoint:n,params:r,columns:a,rowUrl:o,emptyText:s=`No records found`}){let[l,u]=(0,L.useState)([]),[d,f]=(0,L.useState)(!1);return(0,L.useEffect)(()=>{let e=!0;return(async()=>{f(!0);try{let i=await t.get(V(n),{headers:H(),params:{...r,page_size:10}});e&&u(W(i.data))}catch{e&&u([])}finally{e&&f(!1)}})(),()=>{e=!1}},[n,JSON.stringify(r)]),(0,R.jsx)(Z,{title:e,children:(0,R.jsx)(i,{rowKey:(e,t)=>e?.id||t,size:`small`,loading:d,dataSource:l,columns:a,pagination:{pageSize:10,hideOnSinglePage:!0},scroll:{x:900},rowClassName:(e,t)=>t%2==0?`crm-show__table-row`:`crm-show__table-row is-alt`,locale:{emptyText:(0,R.jsx)(c,{image:c.PRESENTED_IMAGE_SIMPLE,description:s})},onRow:e=>({onClick:()=>{let t=o?.(e);t&&A.visit(t)},style:{cursor:o?`pointer`:`default`}})})})}function He({activityCrud:e,baseFilters:n,rowUrl:r}){let{token:i}=j.useToken(),[a,o]=(0,L.useState)(0),[s,c]=(0,L.useState)({}),[l,u]=(0,L.useState)({total:0,completed:0});(0,L.useEffect)(()=>{t.get(V(`/api/crm-activities/`),{params:{...n,page_size:500,status:``}}).then(e=>{let t=Array.isArray(e.data?.data)?e.data.data:Array.isArray(e.data?.results)?e.data.results:[],n=t.length,r=t.filter(e=>e.status===`completed`).length;u({total:n,completed:r})}).catch(()=>{})},[JSON.stringify(n),a]);let d=async(e,n)=>{if(n?.stopPropagation?.(),!s[e.id]){c(t=>({...t,[e.id]:!0}));try{await t.patch(V(`/api/crm-activities/${e.id}/toggle-complete`)),o(e=>e+1)}catch(e){T.error(e?.response?.data?.message||`Failed to update`)}finally{c(t=>({...t,[e.id]:!1}))}}},f=e=>e.status!==`completed`&&e.due_at&&new Date(e.due_at)<new Date,p=[{title:``,key:`done`,width:40,render:(e,t)=>(0,R.jsx)(g,{checked:t.status===`completed`,loading:s[t.id],onChange:e=>d(t,e),onClick:e=>e.stopPropagation()})},{title:`Subject`,dataIndex:`subject`,key:`subject`,sorter:!0,render:(e,t)=>(0,R.jsxs)(y,{direction:`vertical`,size:0,children:[(0,R.jsx)(z,{strong:!0,delete:t.status===`completed`,type:t.status===`completed`?`secondary`:void 0,children:e||`-`}),(0,R.jsxs)(y,{size:4,wrap:!0,children:[(0,R.jsx)(D,{className:`crm-show__tag`,children:q(t?.activity_type)}),f(t)&&(0,R.jsx)(D,{color:`error`,style:{fontSize:10},children:`Overdue`})]})]})},{title:`Priority`,dataIndex:`priority`,key:`priority`,width:100,render:e=>(0,R.jsx)(X,{value:e||`medium`})},{title:`Due`,dataIndex:`due_at`,key:`due_at`,width:160,render:(e,t)=>(0,R.jsx)(z,{type:f(t)?`danger`:void 0,children:G(e)})},{title:`Assigned`,key:`assigned_to`,width:130,render:(e,t)=>t?.assigned_to?.name||t?.assignedTo?.name||`-`}],m=[{key:`all`,label:`All`,params:{}},{key:`pending`,label:`Pending`,params:{status:`pending`}},{key:`in_progress`,label:`In Progress`,params:{status:`in_progress`}},{key:`completed`,label:`Completed`,params:{status:`completed`}},{key:`overdue`,label:`Overdue`,params:{status:`pending`,due_to:new Date().toISOString().split(`T`)[0]}}],h=l.total>0?Math.round(l.completed/l.total*100):0;return(0,R.jsxs)(Z,{title:`Activities`,children:[l.total>0&&(0,R.jsx)(`div`,{style:{marginBottom:12},children:(0,R.jsxs)(y,{size:8,align:`center`,style:{width:`100%`},children:[(0,R.jsxs)(z,{type:`secondary`,style:{fontSize:12},children:[l.completed,`/`,l.total,` completed`]}),(0,R.jsx)(ne,{percent:h,size:`small`,style:{flex:1,minWidth:120},strokeColor:i.colorSuccess})]})}),(0,R.jsx)(O,{title:`Activities`,apiUrl:e.apiUrl,columns:p,fields:e.fields,validationSchema:e.validationSchema,crudInitialValues:e.crudInitialValues,transformPayload:e.transformPayload,baseFilters:n,form_ui:`modal`,modalWidth:900,searchParam:`search`,pageParam:`page`,pageSizeParam:`page_size`,sortMode:`ordering`,orderingParam:`ordering`,enableServerPagination:!0,showSearch:!0,canAdd:!0,canEdit:!0,canDelete:!0,hasActions:!0,hasActionColumns:!0,anchorFilters:m,defaultAnchorKey:`all`,onRowClick:r?e=>A.visit(typeof r==`function`?r(e):r):void 0},a)]})}var Ue=[{title:`Lead`,dataIndex:`name`,key:`name`,render:(e,t)=>(0,R.jsxs)(y,{direction:`vertical`,size:0,children:[(0,R.jsx)(z,{strong:!0,children:e||`-`}),(0,R.jsx)(z,{type:`secondary`,children:t?.company_name||t?.email||`No company`})]})},{title:`Status`,dataIndex:`status`,key:`status`,width:130,render:e=>(0,R.jsx)(X,{value:e||`new`})},{title:`Value`,dataIndex:`expected_value`,key:`expected_value`,width:130,align:`right`,render:K}],We=[{title:`Deal`,dataIndex:`title`,key:`title`,render:(e,t)=>e||t?.name||`-`},{title:`Stage`,dataIndex:`stage`,key:`stage`,width:130,render:e=>(0,R.jsx)(X,{value:e})},{title:`Value`,dataIndex:`amount`,key:`amount`,width:130,align:`right`,render:(e,t)=>K(e??t?.expected_value)}],Ge=(e,t,n,r=`status`)=>[{title:`Document`,dataIndex:e,key:e,render:(e,t)=>(0,R.jsx)(z,{strong:!0,children:e||t?.reference||`-`})},{title:`Date`,dataIndex:t,key:t,width:140,render:Ie},{title:`Amount`,dataIndex:n,key:n,width:130,align:`right`,render:K},{title:`Status`,dataIndex:r,key:r,width:120,render:e=>(0,R.jsx)(X,{value:e})}];new Set(Object.keys({Quotation:[`payment-in.quotations.show`,`/payment-in/quotations`],SalesOrder:[`payment-in.sales-orders.show`,`/payment-in/sales-orders`],Invoice:[`payment-in.invoices.show`,`/payment-in/invoices`],Bill:[`payment-in.bills.show`,`/payment-in/bills`],Payment:[`payment-in.payments.show`,`/payment-in/payments`],CustomerPayment:[`payment-in.payments.show`,`/payment-in/payments`],CreditNote:[`payment-in.credit-notes.show`,`/payment-in/credit-notes`],PurchaseOrder:[`payment-out.purchase-orders.show`,`/payment-out/purchase-orders`],PurchaseBill:[`payment-out.purchase-bills.show`,`/payment-out/purchase-bills`],Expense:[`payment-out.expenses.show`,`/payment-out/expenses`],DebitNote:[`payment-out.debit-notes.show`,`/payment-out/debit-notes`],SupplierPayment:[`payment-out.supplier-payments.show`,`/payment-out/supplier-payments`]}));function Ke({lead:e,leadId:t,dealCrud:n,dealCrudColumns:r}){let[i,a]=(0,L.useState)(`kanban`),[o,s]=(0,L.useState)(!1),[c,l]=(0,L.useState)(0),{token:u}=j.useToken();return(0,R.jsxs)(R.Fragment,{children:[(0,R.jsx)(Z,{title:`Deals`,extra:(0,R.jsxs)(y,{size:6,children:[(0,R.jsx)(p,{size:`small`,type:`primary`,icon:(0,R.jsx)(f,{}),onClick:()=>s(!0),children:`Add Deal`}),(0,R.jsxs)(y.Compact,{size:`small`,children:[(0,R.jsx)(p,{icon:(0,R.jsx)(ve,{}),type:i===`list`?`primary`:`default`,onClick:()=>a(`list`),children:`List`}),(0,R.jsx)(p,{icon:(0,R.jsx)(ce,{}),type:i===`kanban`?`primary`:`default`,onClick:()=>a(`kanban`),children:`Kanban`})]})]}),children:i===`list`?(0,R.jsx)(O,{title:`Deals`,apiUrl:n.apiUrl,columns:r,fields:n.fields,validationSchema:n.validationSchema,crudInitialValues:n.crudInitialValues,transformPayload:n.transformPayload,baseFilters:{lead_id:t},form_ui:`drawer`,drawerWidth:1100,searchParam:`search`,pageParam:`page`,pageSizeParam:`page_size`,sortMode:`ordering`,orderingParam:`ordering`,enableServerPagination:!0,showSearch:!0,canAdd:!0,canEdit:!0,canDelete:!0,hasActions:!0,hasActionColumns:!0}):(0,R.jsx)(qe,{leadId:t,tokenColors:u},`lead-deals-kanban-${c}`)}),o?(0,R.jsx)(`div`,{style:{display:`none`},children:(0,R.jsx)(O,{title:`Deals`,apiUrl:n.apiUrl,columns:r,fields:n.fields,validationSchema:n.validationSchema,crudInitialValues:{...n.crudInitialValues,lead_id:t,contact_id:e?.contact_id||null,deal_pipeline_id:e?.deal_pipeline_id||null,assigned_to_id:e?.assigned_to_id||null,title:e?.name||e?.company_name||``,amount:e?.expected_value||null,source:e?.lead_source||``},transformPayload:n.transformPayload,baseFilters:{lead_id:t},form_ui:`modal`,modalWidth:860,enableServerPagination:!1,showSearch:!1,canAdd:!0,canEdit:!1,canDelete:!1,hasActions:!1,hasActionColumns:!1,openOnMount:!0,openMode:`add`,submitLabelOverride:`Create Deal`,onFormClose:()=>s(!1),onAddSuccess:()=>{s(!1),a(`kanban`),l(e=>e+1)}},`lead-deal-add-${c}`)}):null]})}function qe({leadId:e,tokenColors:n}){let[r,i]=(0,L.useState)([]),[a,o]=(0,L.useState)({}),[c,l]=(0,L.useState)(!0),[u,d]=(0,L.useState)(null),[f,m]=T.useMessage(),g=F({locked:{lead_id:e}}),_=(0,L.useMemo)(()=>async()=>{l(!0);try{let[n,r]=await Promise.all([t.get(V(`/api/deal-stages/`),{headers:H(),params:{page_size:100,ordering:`sort_order`}}),t.get(V(`/api/deals/`),{headers:H(),params:{lead_id:e,page_size:200}})]),a=W(n.data).filter(e=>!e.is_lost_stage),s=W(r.data);i(a);let c=a.reduce((e,t)=>(e[t.id]=[],e),{__unassigned:[]});s.forEach(e=>{c[e.deal_stage_id&&c[e.deal_stage_id]?e.deal_stage_id:`__unassigned`].push(e)}),o(c)}catch(e){i([]),o({}),f.error(e?.response?.data?.message||`Failed to load deals`)}finally{l(!1)}},[e]);(0,L.useEffect)(()=>(_(),()=>{}),[_]);let v=async(e,n)=>{if(n===`__unassigned`)return;let r=a,i=Object.values(a).flat().find(t=>t.id===e);if(!(!i||i.deal_stage_id===n)){o(t=>{let r=Object.fromEntries(Object.entries(t).map(([t,n])=>[t,n.filter(t=>t.id!==e)]));return r[n]=[...r[n]||[],{...i,deal_stage_id:n}],r});try{await t.post(V(`/api/deals/${e}/move-stage`),{deal_stage_id:n},{headers:H()}),f.success(`Deal moved`),_()}catch(e){o(r),f.error(e?.response?.data?.message||`Could not move deal`)}}};return c?(0,R.jsx)(s,{active:!0,paragraph:{rows:6}}):(0,R.jsxs)(R.Fragment,{children:[(0,R.jsxs)(`div`,{className:`crm-show__kanban`,children:[m,[...r,{id:`__unassigned`,name:`Unassigned`,color:n.colorTextSecondary}].map(e=>{let t=a[e.id]||[],r=t.reduce((e,t)=>e+Number(t.amount||0),0);return(0,R.jsxs)(`div`,{className:`crm-show__kanban-column`,onDragOver:e=>e.preventDefault(),onDrop:t=>{t.preventDefault();let n=t.dataTransfer.getData(`dealId`);n&&v(n,e.id)},children:[(0,R.jsxs)(`div`,{className:`crm-show__kanban-head`,children:[(0,R.jsxs)(y,{size:8,children:[(0,R.jsx)(`span`,{className:`crm-show__kanban-dot`,style:{background:e.color||n.colorPrimary}}),(0,R.jsx)(z,{strong:!0,children:e.name})]}),(0,R.jsx)(D,{className:`crm-show__tag`,children:t.length})]}),(0,R.jsxs)(`div`,{className:`crm-show__kanban-total`,children:[`Total: `,(0,R.jsx)(`strong`,{children:K(r)})]}),(0,R.jsx)(y,{direction:`vertical`,size:8,style:{width:`100%`},children:t.length?t.map(e=>(0,R.jsxs)(h,{size:`small`,hoverable:!0,className:`crm-show__kanban-card`,onClick:()=>A.visit(U(`crm.deals.show`,e.id,`/crm/deals/${e.id}`)),draggable:!0,onDragStart:t=>t.dataTransfer.setData(`dealId`,e.id),children:[(0,R.jsxs)(`div`,{style:{display:`flex`,gap:8,alignItems:`flex-start`},children:[(0,R.jsxs)(`div`,{style:{flex:1,minWidth:0},children:[(0,R.jsx)(z,{strong:!0,className:`crm-show__kanban-title`,children:e.title||e.deal_no||`-`}),(0,R.jsx)(z,{type:`secondary`,className:`crm-show__kanban-money`,children:K(e.amount)})]}),(0,R.jsx)(p,{size:`small`,icon:(0,R.jsx)(k,{}),onClick:t=>{t.stopPropagation(),d(e.id)}})]}),(0,R.jsx)(`div`,{style:{marginTop:6},children:(0,R.jsx)(X,{value:e.status||`open`})})]},e.id)):(0,R.jsx)(`div`,{className:`crm-show__kanban-empty`,children:(0,R.jsx)(z,{type:`secondary`,children:`No deals`})})})]},e.id)})]}),u?(0,R.jsx)(`div`,{style:{display:`none`},children:(0,R.jsx)(O,{title:`Deals`,apiUrl:g.apiUrl,columns:[{title:`Title`,dataIndex:`title`,key:`title`}],fields:g.fields,validationSchema:g.validationSchema,crudInitialValues:g.crudInitialValues,transformPayload:g.transformPayload,form_ui:`modal`,modalWidth:900,enableServerPagination:!1,showSearch:!1,canAdd:!1,canEdit:!0,canDelete:!1,hasActions:!1,hasActionColumns:!1,openOnMount:!0,openMode:`edit`,openEditId:u,onFormClose:()=>d(null),onEditSuccess:()=>{d(null),_()}})}):null]})}function Je({leadId:e}){let[n,r]=(0,L.useState)([]),[i,a]=(0,L.useState)(!0);return(0,L.useEffect)(()=>{let n=!0;return(async()=>{a(!0);try{let i=await t.get(V(`/api/crm-activities/`),{headers:H(),params:{lead_id:e,page_size:200}});if(!n)return;let a=W(i.data),o=[];a.forEach(e=>{(e.crm_activity_comments||e.crmActivityComments||[]).forEach(t=>o.push({...t,activity_subject:e.subject,activity_id:e.id}))}),o.sort((e,t)=>new Date(t.created_at||0)-new Date(e.created_at||0)),r(o)}catch{n&&r([])}finally{n&&a(!1)}})(),()=>{n=!1}},[e]),(0,R.jsx)(Z,{title:`Comments`,children:i?(0,R.jsx)(s,{active:!0,paragraph:{rows:4}}):n.length?(0,R.jsx)(re,{className:`crm-show__timeline`,items:n.map(e=>({children:(0,R.jsxs)(y,{direction:`vertical`,size:2,children:[(0,R.jsx)(z,{children:e?.comment}),(0,R.jsxs)(z,{type:`secondary`,style:{fontSize:12},children:[e?.user?.name||`User`,` on "`,e.activity_subject||`Activity`,`" |`,` `,G(e?.created_at)]})]})}))}):(0,R.jsx)(c,{image:c.PRESENTED_IMAGE_SIMPLE,description:`No comments yet. Add comments to activities to see them here.`})})}function Ye({auth:e,id:n,endpoint:r,children:i,mapRecord:o,flush:l=!1}){let{token:u}=j.useToken(),[d,f]=T.useMessage(),[p,m]=(0,L.useState)(null),[h,g]=(0,L.useState)(!0),[_,v]=(0,L.useState)(``),y=(0,L.useCallback)(async()=>{g(!0),v(``);try{m(Fe((await t.get(V(`${r}${n}/`),{headers:H()})).data))}catch(e){let t=e?.response?.data?.message||`Failed to load record.`;v(t),d.error(t)}finally{g(!1)}},[r,n,d]);(0,L.useEffect)(()=>{y()},[y]);let ee=o(p)?.title||`CRM Record`,b={"--crm-bg":u.colorBgLayout,"--crm-surface":u.colorBgContainer,"--crm-elevated":u.colorBgElevated,"--crm-soft":u.colorFillAlter,"--crm-muted":u.colorFillQuaternary,"--crm-border":u.colorBorderSecondary,"--crm-border-strong":u.colorBorder,"--crm-text":u.colorText,"--crm-text-secondary":u.colorTextSecondary,"--crm-text-tertiary":u.colorTextTertiary,"--crm-primary":u.colorPrimary,"--crm-primary-bg":u.colorPrimaryBg,"--crm-primary-border":u.colorPrimaryBorder,"--crm-success":u.colorSuccess,"--crm-success-bg":u.colorSuccessBg,"--crm-warning":u.colorWarning,"--crm-warning-bg":u.colorWarningBg,"--crm-error":u.colorError,"--crm-radius":`${u.borderRadiusLG}px`,"--crm-radius-sm":`${u.borderRadius}px`,"--crm-padding":`${u.padding}px`,"--crm-padding-lg":`${u.paddingLG}px`,"--crm-padding-sm":`${u.paddingSM}px`,"--crm-padding-xs":`${u.paddingXS}px`,"--crm-font-sm":`${u.fontSizeSM}px`,"--crm-font":`${u.fontSize}px`,"--crm-font-lg":`${u.fontSizeLG}px`,"--crm-shadow":u.boxShadowTertiary};return(0,R.jsxs)(se,{user:e?.user,children:[f,(0,R.jsx)(ie,{title:ee}),(0,R.jsx)(`style`,{children:`
        .crm-show {
          min-height: calc(100vh - 64px);
          background: var(--crm-bg);
          color: var(--crm-text);
          
        }

        .crm-show--flush {
          padding: 0;
        }

        .crm-show__shell {
          max-width: 1600px;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          gap: var(--crm-padding);
        }

        .crm-show--flush .crm-show__shell {
          max-width: none;
          margin: 0;
          gap: 0;
        }

        .crm-show--flush .crm-show__body {
          padding: 0;
        }

        .crm-show__bar-card.ant-card,
        .crm-show__rail-card.ant-card,
        .crm-show__card.ant-card,
        .crm-show__metric-card.ant-card {
          border-color: var(--crm-border);
          border-radius: var(--crm-radius);
          box-shadow: var(--crm-shadow);
          overflow: hidden;
        }

        .crm-show__bar-card .ant-card-body {
          padding: var(--crm-padding-sm) var(--crm-padding);
        }

        .crm-show__bar {
          min-height: 48px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: var(--crm-padding);
        }

        .crm-show__crumb {
          display: flex;
          align-items: center;
          gap: var(--crm-padding-sm);
          min-width: 0;
        }

        .crm-show__crumb-title {
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .crm-show__crumb-title h4 {
          margin: 0 !important;
          line-height: 1.2 !important;
        }

        .crm-show__body {
          display: grid;
          grid-template-columns: 310px minmax(0, 1fr);
          gap: var(--crm-padding);
          align-items: start;
        }

        .crm-show__rail {
          position: sticky;
          top: var(--crm-padding);
          min-width: 0;
        }

        .crm-show__rail-card .ant-card-body {
          padding: var(--crm-padding);
          display: flex;
          flex-direction: column;
          gap: var(--crm-padding-sm);
        }

        .crm-show__entity {
          display: flex;
          align-items: flex-start;
          gap: var(--crm-padding-sm);
          padding-bottom: var(--crm-padding-sm);
          border-bottom: 1px solid var(--crm-border);
        }

        .crm-show__entity-title {
          margin: 0 !important;
          font-size: 18px !important;
          line-height: 1.25 !important;
          color: var(--crm-text);
          word-break: break-word;
        }

        .crm-show__entity-subtitle {
          display: block;
          font-size: var(--crm-font-sm);
          margin-top: 3px;
        }

        .crm-show__tags {
          display: flex;
          flex-wrap: wrap;
          gap: 5px;
          margin-top: 8px;
        }

        .crm-show__tag {
          margin-inline-end: 0 !important;
          font-size: 11px;
          line-height: 18px;
          padding-inline: 7px;
          border-radius: 999px;
        }

        .crm-show__metric-card .ant-card-body {
          padding: var(--crm-padding-sm);
        }

        .crm-show__metric {
          display: flex;
          align-items: flex-start;
          gap: 10px;
        }

        .crm-show__metric-icon {
          width: 36px;
          height: 36px;
          border-radius: 999px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          color: var(--crm-primary);
          background: var(--crm-primary-bg);
          flex: none;
          font-size: 17px;
        }

        .crm-show__metric-content {
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .crm-show__metric-content strong {
          font-size: 20px;
          line-height: 1.2;
          color: var(--crm-text);
          word-break: break-word;
        }

        .crm-show__rail-table-wrap {
          border: 1px solid var(--crm-border);
          border-radius: var(--crm-radius-sm);
          overflow: hidden;
          background: var(--crm-surface);
        }

        .crm-show__rail-row {
          display: grid;
          grid-template-columns: 96px minmax(0, 1fr);
          border-bottom: 1px solid var(--crm-border);
        }

        .crm-show__rail-row:last-child {
          border-bottom: 0;
        }

        .crm-show__rail-row > span,
        .crm-show__rail-row > div {
          padding: 8px 10px;
          font-size: var(--crm-font-sm);
          line-height: 1.35;
          word-break: break-word;
        }

        .crm-show__rail-row > span {
          background: var(--crm-muted);
          border-right: 1px solid var(--crm-border);
          font-weight: 600;
        }

        .crm-show__tabs {
          display: flex;
          flex-direction: column;
          gap: 6px;
          padding-top: 2px;
        }

        .crm-show__tab {
          width: 100%;
          min-height: 38px;
          border: 1px solid transparent;
          border-radius: var(--crm-radius-sm);
          background: transparent;
          color: var(--crm-text-secondary);
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          padding: 0 11px;
          cursor: pointer;
          font-size: var(--crm-font-sm);
          font-weight: 700;
          text-align: left;
          transition: 0.16s ease;
        }

        .crm-show__tab:hover {
          background: var(--crm-muted);
          color: var(--crm-text);
        }

        .crm-show__tab--active {
          background: var(--crm-primary-bg);
          color: var(--crm-primary);
          border-color: var(--crm-primary-border);
        }

        .crm-show__tab-count {
          min-width: 22px;
          height: 20px;
          padding: 0 7px;
          border-radius: 999px;
          background: var(--crm-surface);
          border: 1px solid var(--crm-border);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: 11px;
        }

        .crm-show__main {
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: var(--crm-padding);
          overflow: hidden;
        }

        .crm-show__card.ant-card {
          background: var(--crm-surface);
        }

        .crm-show__card .ant-card-head {
          min-height: 46px;
          padding: 0 var(--crm-padding);
          border-bottom: 1px solid var(--crm-border);
          background: var(--crm-elevated);
        }

        .crm-show__card .ant-card-head-title {
          font-size: var(--crm-font);
          font-weight: 800;
          color: var(--crm-text);
        }

        .crm-show__card .ant-card-body {
          padding: var(--crm-padding);
          min-width: 0;
        }

        .crm-show__info-table {
          width: 100%;
          border-collapse: separate;
          border-spacing: 0;
          table-layout: fixed;
          font-size: var(--crm-font-sm);
          border: 1px solid var(--crm-border);
          border-radius: var(--crm-radius-sm);
          overflow: hidden;
        }

        .crm-show__info-table th {
          width: 15%;
          padding: 9px 11px;
          background: var(--crm-muted);
          border-right: 1px solid var(--crm-border);
          border-bottom: 1px solid var(--crm-border);
          color: var(--crm-text-secondary);
          font-weight: 700;
          text-align: left;
          vertical-align: top;
          white-space: nowrap;
        }

        .crm-show__info-table td {
          width: 35%;
          padding: 9px 11px;
          background: var(--crm-surface);
          border-right: 1px solid var(--crm-border);
          border-bottom: 1px solid var(--crm-border);
          color: var(--crm-text);
          vertical-align: top;
          word-break: break-word;
        }

        .crm-show__info-table tr:last-child th,
        .crm-show__info-table tr:last-child td {
          border-bottom: 0;
        }

        .crm-show__info-table th:last-child,
        .crm-show__info-table td:last-child {
          border-right: 0;
        }

        .crm-show .ant-table {
          font-size: var(--crm-font-sm);
        }

        .crm-show .ant-table-wrapper .ant-table-container {
          border-radius: var(--crm-radius-sm);
          overflow: hidden;
        }

        .crm-show .ant-table-thead > tr > th {
          padding: 9px 11px !important;
          background: var(--crm-muted) !important;
          font-weight: 800;
          color: var(--crm-text-secondary) !important;
          border-color: var(--crm-border) !important;
          white-space: nowrap;
        }

        .crm-show .ant-table-tbody > tr > td {
          padding: 8px 11px !important;
          vertical-align: middle;
          border-color: var(--crm-border) !important;
        }

        .crm-show__table-row.is-alt > td {
          background: var(--crm-muted);
        }

        .crm-show__link-text {
          color: var(--crm-primary);
        }

        .crm-show__stat-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: var(--crm-padding-sm);
        }

        .crm-show__stat-card {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 14px 16px;
          border: 1px solid var(--crm-border);
          border-radius: var(--crm-radius);
          background: var(--crm-surface);
          box-shadow: var(--crm-shadow);
        }

        .crm-show__stat-icon {
          width: 40px;
          height: 40px;
          border-radius: 10px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: 18px;
          flex: none;
        }

        .crm-show__stat-body {
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .crm-show__contact-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: var(--crm-padding-sm);
        }

        .crm-show__contact-item {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 11px 12px;
          border: 1px solid var(--crm-border);
          border-radius: var(--crm-radius-sm);
          background: var(--crm-muted);
          min-width: 0;
        }

        .crm-show__contact-icon {
          width: 34px;
          height: 34px;
          border-radius: 999px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          color: var(--crm-primary);
          background: var(--crm-primary-bg);
          flex: none;
        }

        .crm-show__contact-content {
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .crm-show__contact-content span:last-child {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .crm-show__contact-overview {
          display: grid;
          grid-template-columns: minmax(0, 1.25fr) minmax(320px, .75fr);
          gap: var(--crm-padding);
          align-items: start;
        }

        .crm-show__contact-section {
          display: flex;
          flex-direction: column;
          gap: var(--crm-padding-sm);
        }

        .crm-show__contact-note {
          padding: var(--crm-padding-sm) var(--crm-padding);
          border: 1px solid var(--crm-border);
          border-radius: var(--crm-radius-sm);
          background: var(--crm-muted);
        }

        .crm-show__account-panel {
          display: flex;
          flex-direction: column;
          gap: var(--crm-padding-sm);
        }

        .crm-show__account-panel .crm-show__stat-grid {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }

        .crm-show__kanban {
          display: flex;
          gap: var(--crm-padding-sm);
          overflow-x: auto;
          padding-bottom: 6px;
        }

        .crm-show__kanban-column {
          min-width: 260px;
          max-width: 290px;
          flex: 0 0 270px;
          background: var(--crm-muted);
          border: 1px solid var(--crm-border);
          border-radius: var(--crm-radius);
          padding: var(--crm-padding-sm);
        }

        .crm-show__kanban-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          margin-bottom: 6px;
        }

        .crm-show__kanban-dot {
          width: 9px;
          height: 9px;
          border-radius: 999px;
          display: inline-block;
        }

        .crm-show__kanban-total {
          font-size: 12px;
          color: var(--crm-text-secondary);
          margin-bottom: 10px;
        }

        .crm-show__kanban-card.ant-card {
          border-color: var(--crm-border);
          border-radius: var(--crm-radius-sm);
        }

        .crm-show__kanban-card .ant-card-body {
          padding: 10px;
        }

        .crm-show__kanban-title {
          display: block;
          margin-bottom: 2px;
        }

        .crm-show__kanban-money {
          font-size: 12px;
        }

        .crm-show__kanban-empty {
          min-height: 74px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px dashed var(--crm-border);
          border-radius: var(--crm-radius-sm);
          background: var(--crm-surface);
        }

        .crm-show__timeline {
          padding-top: 6px;
        }

        .crm-show__comment-form {
          padding: 12px;
          border: 1px solid var(--crm-border);
          border-radius: var(--crm-radius-sm);
          background: var(--crm-muted);
          margin-bottom: var(--crm-padding);
        }

        .crm-show__comment-form .ant-form-item {
          margin-bottom: 10px;
        }

        .crm-show__comments-list {
          min-width: 0;
        }

        .crm-show__state {
          padding: var(--crm-padding-lg);
          background: var(--crm-surface);
          border: 1px solid var(--crm-border);
          border-radius: var(--crm-radius);
          box-shadow: var(--crm-shadow);
        }


        .crm-show__tabs-card {
          border: 1px solid var(--crm-border);
          border-radius: var(--crm-radius);
          background: var(--crm-surface);
          box-shadow: var(--crm-shadow);
          overflow: hidden;
          min-width: 0;
        }

        .crm-show__main-tabs > .ant-tabs-nav {
          margin: 0;
          padding: 0 var(--crm-padding);
          background: var(--crm-elevated);
          border-bottom: 1px solid var(--crm-border);
        }

        .crm-show__main-tabs > .ant-tabs-content-holder {
          padding: var(--crm-padding);
        }

        .crm-show__main-tabs .ant-tabs-tab {
          font-weight: 700;
        }

        .crm-show__tab-content {
          min-width: 0;
        }

        .crm-show__tab-stack {
          display: flex;
          flex-direction: column;
          gap: var(--crm-padding);
          min-width: 0;
        }

        .crm-show__card--headless .ant-card-head {
          display: none;
        }

        .crm-show__card--headless .ant-card-body {
          padding: var(--crm-padding);
        }

        .crm-show__section-head,
        .crm-show__overview-panel-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: var(--crm-padding-sm);
          margin-bottom: var(--crm-padding-sm);
          min-width: 0;
        }

        .crm-show__section-extra,
        .crm-show__overview-panel-extra {
          display: flex;
          justify-content: flex-end;
          min-width: 0;
        }

        .crm-show__section-title {
          font-size: var(--crm-font);
        }

        .crm-show__overview-grid {
          display: grid;
        
          align-items: start;
          min-width: 0;
        }

        .crm-show__overview-grid--single {
          grid-template-columns: 1fr;
        }

        .crm-show__overview-side {
          display: flex;
          flex-direction: row;
          gap: var(--crm-padding);
          min-width: 0;
        }

        .crm-show__overview-panel {
          border: 1px solid var(--crm-border);
          border-radius: var(--crm-radius);
          background: var(--crm-surface);
          box-shadow: var(--crm-shadow);
          padding: var(--crm-padding);
          min-width: 0;
        }

        .crm-show__overview-panel.is-compact {
          padding: var(--crm-padding-sm);
        }

        .crm-show__overview-panel-body {
          display: flex;
          flex-direction: column;
          gap: var(--crm-padding-sm);
          min-width: 0;
        }

        .crm-show__overview-fields {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: var(--crm-padding-sm);
        }

        .crm-show__overview-fields--three {
          grid-template-columns: repeat(3, minmax(0, 1fr));
        }

        .crm-show__overview-field {
          min-width: 0;
          padding: 10px 12px;
          border: 1px solid var(--crm-border);
          border-radius: var(--crm-radius-sm);
          background: var(--crm-muted);
        }

        .crm-show__overview-field > span {
          display: block;
          font-size: var(--crm-font-sm);
          margin-bottom: 4px;
        }

        .crm-show__overview-field > div {
          color: var(--crm-text);
          font-weight: 600;
          line-height: 1.35;
          word-break: break-word;
        }

        .crm-show__overview-note {
          padding: 10px 12px;
          border: 1px solid var(--crm-border);
          border-radius: var(--crm-radius-sm);
          background: var(--crm-muted);
        }

        .crm-show__overview-note > span {
          display: block;
          font-size: var(--crm-font-sm);
          margin-bottom: 4px;
        }

        .crm-show__overview-note .ant-typography {
          margin: 0;
          color: var(--crm-text);
        }

        .crm-show__overview-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          justify-content: flex-end;
        }

        .crm-show__communication-list {
          display: grid;
          gap: var(--crm-padding-sm);
        }

        .crm-show__communication-item {
          display: flex;
          align-items: center;
          gap: 10px;
          min-width: 0;
          padding: 10px 12px;
          border: 1px solid var(--crm-border);
          border-radius: var(--crm-radius-sm);
          background: var(--crm-muted);
        }

        .crm-show__communication-icon {
          width: 32px;
          height: 32px;
          border-radius: 999px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          color: var(--crm-primary);
          background: var(--crm-primary-bg);
          flex: none;
        }

        .crm-show__communication-content {
          display: flex;
          flex-direction: column;
          gap: 2px;
          min-width: 0;
        }

        .crm-show__communication-content span:last-child {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .crm-show__account-panel .crm-show__stat-grid,
        .crm-show__overview-panel .crm-show__stat-grid {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }

        .crm-show__overview-panel .crm-show__stat-card {
          box-shadow: none;
          padding: 11px 12px;
        }

        .crm-show__overview-panel .crm-show__stat-body .ant-typography:last-child {
          font-size: 16px !important;
        }

        @media (max-width: 1180px) {
          .crm-show__body {
            grid-template-columns: 1fr;
          }

          .crm-show__rail {
            position: static;
          }

          .crm-show__rail-card .ant-card-body {
            display: grid;
            grid-template-columns: auto minmax(0, 1fr);
            align-items: start;
          }

          .crm-show__entity,
          .crm-show__metric-card,
          .crm-show__rail-table-wrap,
          .crm-show__tabs {
            grid-column: 1 / -1;
          }

          .crm-show__tabs {
            flex-direction: row;
            overflow-x: auto;
          }

          .crm-show__tab {
            width: auto;
            min-width: 128px;
            white-space: nowrap;
            flex: none;
          }
        }

        @media (max-width: 768px) {
          .crm-show {
            padding: var(--crm-padding-sm);
          }

          .crm-show__bar {
            align-items: stretch;
            flex-direction: column;
          }

          .crm-show__crumb {
            align-items: flex-start;
          }

          .crm-show__stat-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .crm-show__contact-grid {
            grid-template-columns: 1fr;
          }

          .crm-show__contact-overview {
            grid-template-columns: 1fr;
          }

          .crm-show__info-table {
            min-width: 760px;
          }

          .crm-show__card .ant-card-body {
            overflow-x: auto;
          }

          .crm-show__rail-row {
            grid-template-columns: 1fr;
          }

          .crm-show__rail-row > span {
            border-right: 0;
            border-bottom: 1px solid var(--crm-border);
          }
        }


        @media (max-width: 1180px) {
          .crm-show__overview-grid {
            grid-template-columns: 1fr;
          }

          .crm-show__contact-grid {
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }
        }

        @media (max-width: 920px) {
          .crm-show__contact-grid,
          .crm-show__overview-fields,
          .crm-show__overview-fields--three {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 768px) {
          .crm-show__main-tabs > .ant-tabs-nav {
            padding: 0 var(--crm-padding-sm);
            overflow-x: auto;
          }

          .crm-show__main-tabs > .ant-tabs-content-holder {
            padding: var(--crm-padding-sm);
          }

          .crm-show__overview-grid,
          .crm-show__contact-overview {
            grid-template-columns: 1fr;
          }

          .crm-show__overview-panel {
            padding: var(--crm-padding-sm);
          }

          .crm-show__overview-panel-head,
          .crm-show__section-head {
            align-items: flex-start;
            flex-direction: column;
          }

          .crm-show__overview-actions,
          .crm-show__section-extra,
          .crm-show__overview-panel-extra {
            justify-content: flex-start;
            width: 100%;
          }

          .crm-show__overview-actions .ant-btn {
            flex: 1 1 auto;
          }

          .crm-show__stat-grid,
          .crm-show__account-panel .crm-show__stat-grid,
          .crm-show__overview-panel .crm-show__stat-grid {
            grid-template-columns: 1fr;
          }
        }
      `}),(0,R.jsx)(`div`,{className:`crm-show${l?` crm-show--flush`:``}`,style:b,children:(0,R.jsxs)(`div`,{className:`crm-show__shell`,children:[_?(0,R.jsx)(`div`,{className:`crm-show__state`,children:(0,R.jsx)(a,{type:`error`,message:_,showIcon:!0})}):null,h?(0,R.jsx)(`div`,{className:`crm-show__state`,children:(0,R.jsx)(s,{active:!0,paragraph:{rows:8}})}):null,!h&&!p&&!_?(0,R.jsx)(`div`,{className:`crm-show__state`,children:(0,R.jsx)(c,{description:`Record not found`})}):null,!h&&p?i(p,{setRecord:m,reload:y,messageApi:d}):null]})})]})}function Xe({activity:e,comments:n=[],onActivityUpdated:r}){let[i]=x.useForm(),[a,o]=(0,L.useState)(!1);return(0,R.jsxs)(Z,{title:`Comments`,children:[(0,R.jsxs)(x,{form:i,layout:`vertical`,className:`crm-show__comment-form`,children:[(0,R.jsx)(x.Item,{name:`comment`,rules:[{required:!0,message:`Write a comment first`},{max:5e3,message:`Comment must be 5000 characters or fewer`}],children:(0,R.jsx)(C.TextArea,{rows:3,placeholder:`Add a comment`,disabled:a,autoSize:{minRows:3,maxRows:7}})}),(0,R.jsx)(p,{type:`primary`,onClick:async()=>{let n=await i.validateFields(),a=String(n.comment||``).trim();if(a){o(!0);try{let n=await t.post(V(`/api/crm-activities/${e.id}/comments`),{comment:a},{headers:H()});i.resetFields(),r?.(Fe(n.data)),T.success(`Comment added`)}catch(e){T.error(e?.response?.data?.message||e?.response?.data?.comment?.[0]||`Failed to add comment`)}finally{o(!1)}}},loading:a,children:`Add Comment`})]}),(0,R.jsx)(`div`,{className:`crm-show__comments-list`,children:n.length?(0,R.jsx)(re,{className:`crm-show__timeline`,items:n.map(e=>{let t=e?.user?.display_name||e?.user?.name||e?.user?.email||`User`;return{children:(0,R.jsxs)(y,{direction:`vertical`,size:2,children:[(0,R.jsx)(z,{children:e?.comment}),(0,R.jsxs)(z,{type:`secondary`,style:{fontSize:12},children:[t,` | `,G(e?.created_at)]})]})}})}):(0,R.jsx)(c,{image:c.PRESENTED_IMAGE_SIMPLE,description:`No comments yet`})})]})}function Ze({record:e,title:t,subtitle:n,icon:r,avatarSrc:i=null,tags:a,backLabel:o,backUrl:s,amountLabel:c,amount:l,amountIcon:d,railRows:f,tabs:g,activeKey:_,onTabChange:v,tabPosition:ee=`top`,headerActions:b=null}){let{token:te}=j.useToken(),[x,S]=(0,L.useState)(g?.[0]?.key||`overview`),C=_||x,w=v||S;return(0,R.jsxs)(R.Fragment,{children:[(0,R.jsx)(h,{className:`crm-show__bar-card`,children:(0,R.jsxs)(`div`,{className:`crm-show__bar`,children:[(0,R.jsxs)(`div`,{className:`crm-show__crumb`,children:[(0,R.jsx)(p,{type:`text`,icon:(0,R.jsx)(le,{}),onClick:()=>A.visit(s),children:o}),(0,R.jsxs)(`div`,{className:`crm-show__crumb-title`,children:[(0,R.jsx)(Pe,{level:4,children:t}),(0,R.jsx)(z,{type:`secondary`,ellipsis:!0,style:{maxWidth:720},children:n||`CRM record`})]})]}),(0,R.jsxs)(y,{wrap:!0,children:[a,b]})]})}),(0,R.jsxs)(`div`,{className:`crm-show__body`,children:[(0,R.jsx)(`aside`,{className:`crm-show__rail`,children:(0,R.jsxs)(h,{className:`crm-show__rail-card`,children:[(0,R.jsxs)(`div`,{className:`crm-show__entity`,children:[(0,R.jsx)(u,{size:48,src:i||void 0,icon:i?void 0:r,style:{background:i?void 0:te.colorPrimaryBg,color:te.colorPrimary,fontWeight:800,flex:`none`},children:i||r?null:Le(t)}),(0,R.jsxs)(`div`,{style:{minWidth:0},children:[(0,R.jsx)(Pe,{level:4,className:`crm-show__entity-title`,children:t}),(0,R.jsx)(z,{type:`secondary`,className:`crm-show__entity-subtitle`,children:n||`CRM record`}),(0,R.jsx)(`div`,{className:`crm-show__tags`,children:a})]})]}),c?(0,R.jsx)(h,{className:`crm-show__metric-card`,children:(0,R.jsxs)(`div`,{className:`crm-show__metric`,children:[(0,R.jsx)(`div`,{className:`crm-show__metric-icon`,children:d||(0,R.jsx)(fe,{})}),(0,R.jsxs)(`div`,{className:`crm-show__metric-content`,children:[(0,R.jsx)(z,{type:`secondary`,children:c}),(0,R.jsx)(`strong`,{children:l})]})]})}):null,(0,R.jsx)(ze,{rows:f})]})}),(0,R.jsx)(`main`,{className:`crm-show__main`,children:(0,R.jsx)(`div`,{className:`crm-show__tabs-card`,children:(0,R.jsx)(m,{activeKey:C,onChange:w,tabPosition:ee,className:`crm-show__main-tabs`,items:g.map(e=>({key:e.key,label:e.count===void 0?e.label:`${e.label} (${e.count})`,children:(0,R.jsx)(`div`,{className:`crm-show__tab-content`,children:e.children})}))})})})]})]})}function Qe({contact:e}){return(0,R.jsxs)(`div`,{className:`crm-show__contact-grid`,children:[(0,R.jsxs)(`div`,{className:`crm-show__contact-item`,children:[(0,R.jsx)(`div`,{className:`crm-show__contact-icon`,children:(0,R.jsx)(N,{})}),(0,R.jsxs)(`div`,{className:`crm-show__contact-content`,children:[(0,R.jsx)(z,{type:`secondary`,children:`Phone`}),(0,R.jsx)(z,{strong:!0,children:(0,R.jsx)(Y,{value:e?.phone})})]})]}),(0,R.jsxs)(`div`,{className:`crm-show__contact-item`,children:[(0,R.jsx)(`div`,{className:`crm-show__contact-icon`,children:(0,R.jsx)(M,{})}),(0,R.jsxs)(`div`,{className:`crm-show__contact-content`,children:[(0,R.jsx)(z,{type:`secondary`,children:`Email`}),(0,R.jsx)(z,{strong:!0,children:(0,R.jsx)(Y,{value:e?.email})})]})]}),(0,R.jsxs)(`div`,{className:`crm-show__contact-item`,children:[(0,R.jsx)(`div`,{className:`crm-show__contact-icon`,children:(0,R.jsx)(ge,{})}),(0,R.jsxs)(`div`,{className:`crm-show__contact-content`,children:[(0,R.jsx)(z,{type:`secondary`,children:`Code`}),(0,R.jsx)(z,{strong:!0,children:(0,R.jsx)(Y,{value:e?.code})})]})]})]})}function $e({lead:e}){return(0,R.jsxs)(`div`,{className:`crm-show__contact-grid`,children:[(0,R.jsxs)(`div`,{className:`crm-show__contact-item`,children:[(0,R.jsx)(`div`,{className:`crm-show__contact-icon`,children:(0,R.jsx)(M,{})}),(0,R.jsxs)(`div`,{className:`crm-show__contact-content`,children:[(0,R.jsx)(z,{type:`secondary`,children:`Email`}),(0,R.jsx)(z,{strong:!0,children:(0,R.jsx)(Y,{value:e?.email})})]})]}),(0,R.jsxs)(`div`,{className:`crm-show__contact-item`,children:[(0,R.jsx)(`div`,{className:`crm-show__contact-icon`,children:(0,R.jsx)(N,{})}),(0,R.jsxs)(`div`,{className:`crm-show__contact-content`,children:[(0,R.jsx)(z,{type:`secondary`,children:`Phone`}),(0,R.jsx)(z,{strong:!0,children:(0,R.jsx)(Y,{value:e?.phone||e?.mobile})})]})]}),(0,R.jsxs)(`div`,{className:`crm-show__contact-item`,children:[(0,R.jsx)(`div`,{className:`crm-show__contact-icon`,children:(0,R.jsx)(oe,{})}),(0,R.jsxs)(`div`,{className:`crm-show__contact-content`,children:[(0,R.jsx)(z,{type:`secondary`,children:`Website`}),(0,R.jsx)(z,{strong:!0,children:(0,R.jsx)(Y,{value:e?.website})})]})]})]})}function et({summary:e}){if(!e)return null;let{token:t}=j.useToken(),n=e.balance??0,r=e.dr_amount??0,i=e.cr_amount??0;return(0,R.jsx)(`div`,{className:`crm-show__stat-grid`,children:[{label:`Account Balance`,value:n,icon:(0,R.jsx)(be,{}),color:t.colorPrimary,bg:t.colorPrimaryBg},{label:`Total Debit`,value:r,icon:(0,R.jsx)(me,{}),color:t.colorSuccess,bg:t.colorSuccessBg},{label:`Total Credit`,value:i,icon:(0,R.jsx)(pe,{}),color:t.colorError,bg:t.colorErrorBg},{label:`Net Movement`,value:n,icon:(0,R.jsx)(S,{}),color:t.colorWarning,bg:t.colorWarningBg}].map(e=>(0,R.jsxs)(`div`,{className:`crm-show__stat-card`,children:[(0,R.jsx)(`div`,{className:`crm-show__stat-icon`,style:{color:e.color,background:e.bg},children:e.icon}),(0,R.jsxs)(`div`,{className:`crm-show__stat-body`,children:[(0,R.jsx)(z,{type:`secondary`,style:{fontSize:12},children:e.label}),(0,R.jsx)(z,{strong:!0,style:{fontSize:18,lineHeight:1.2},children:K(e.value)})]})]},e.label))})}function tt({data:e=[]}){let{token:t}=j.useToken();return e.length?(0,R.jsx)(Z,{title:`Account Activity (12 Months)`,children:(0,R.jsx)(xe,{width:`100%`,height:280,children:(0,R.jsxs)(Te,{data:e.map(e=>({...e,label:e.month?new Date(e.month+`-01`).toLocaleDateString(`en-GB`,{month:`short`,year:`2-digit`}):e.month})),margin:{top:4,right:4,left:-10,bottom:0},children:[(0,R.jsx)(Oe,{strokeDasharray:`3 3`,stroke:t.colorBorderSecondary}),(0,R.jsx)(De,{dataKey:`label`,tick:{fontSize:11,fill:t.colorTextSecondary}}),(0,R.jsx)(Ee,{tick:{fontSize:11,fill:t.colorTextSecondary}}),(0,R.jsx)(Se,{contentStyle:{background:t.colorBgElevated,border:`1px solid ${t.colorBorderSecondary}`,borderRadius:t.borderRadius,fontSize:12},formatter:e=>K(e)}),(0,R.jsx)(Ce,{wrapperStyle:{fontSize:12}}),(0,R.jsx)(we,{dataKey:`debit`,name:`Debit`,fill:t.colorSuccess,radius:[3,3,0,0]}),(0,R.jsx)(we,{dataKey:`credit`,name:`Credit`,fill:t.colorError,radius:[3,3,0,0]})]})})}):(0,R.jsx)(Z,{title:`Account Activity (12 Months)`,children:(0,R.jsx)(c,{image:c.PRESENTED_IMAGE_SIMPLE,description:`No account activity yet`})})}function nt({contactId:e}){let[n,r]=(0,L.useState)([]),[a,o]=(0,L.useState)(!1);return(0,L.useEffect)(()=>{let n=!0;return o(!0),t.get(V(`/api/contacts/${e}/transactions`),{headers:H()}).then(e=>{n&&r(e.data?.data||[])}).catch(()=>{n&&r([])}).finally(()=>{n&&o(!1)}),()=>{n=!1}},[e]),(0,R.jsx)(Z,{title:`Transactions`,children:(0,R.jsx)(i,{size:`small`,loading:a,dataSource:n,rowKey:(e,t)=>`${e.type}-${e.id||t}`,columns:[{title:`Document`,dataIndex:`number`,key:`number`,render:(e,t)=>(0,R.jsxs)(y,{direction:`vertical`,size:0,children:[(0,R.jsx)(z,{strong:!0,children:e||`-`}),(0,R.jsx)(D,{className:`crm-show__tag`,style:{width:`fit-content`},children:q(t.type)})]})},{title:`Date`,dataIndex:`date`,key:`date`,width:140,render:Ie},{title:`Amount`,dataIndex:`amount`,key:`amount`,width:130,align:`right`,render:K},{title:`Balance`,dataIndex:`balance`,key:`balance`,width:130,align:`right`,render:e=>e?K(e):`-`},{title:`Status`,dataIndex:`status`,key:`status`,width:120,render:e=>(0,R.jsx)(X,{value:e})}],pagination:{pageSize:15,hideOnSinglePage:!0},scroll:{x:700},locale:{emptyText:(0,R.jsx)(c,{image:c.PRESENTED_IMAGE_SIMPLE,description:`No transactions`})},onRow:e=>({onClick:()=>{e.action_url&&A.visit(e.action_url)},style:{cursor:e.action_url?`pointer`:`default`}})})})}var rt=[{title:`Ticket`,dataIndex:`ticket_no`,key:`ticket_no`,render:(e,t)=>(0,R.jsxs)(y,{direction:`vertical`,size:0,children:[(0,R.jsx)(z,{strong:!0,children:e||`-`}),(0,R.jsx)(z,{type:`secondary`,style:{fontSize:12},children:t.subject})]})},{title:`Status`,dataIndex:`status`,key:`status`,width:130,render:e=>(0,R.jsx)(X,{value:e})},{title:`Priority`,dataIndex:`priority`,key:`priority`,width:100,render:e=>(0,R.jsx)(X,{value:e})},{title:`Assigned`,key:`assigned`,width:140,render:(e,t)=>t.assigned_to?.name||`-`},{title:`Updated`,dataIndex:`updated_at`,key:`updated_at`,width:160,render:G}];function it({contactId:e,phone:n,disabled:r}){let[i,a]=(0,L.useState)(!1),[o,s]=(0,L.useState)(!1),[c]=x.useForm();return(0,R.jsxs)(R.Fragment,{children:[(0,R.jsx)(p,{type:`link`,icon:(0,R.jsx)(N,{}),disabled:r,onClick:()=>a(!0),size:`small`,children:`SMS`}),(0,R.jsx)(E,{title:`Send SMS`,open:i,okText:`Send`,confirmLoading:o,onOk:async()=>{s(!0);try{let n=await c.validateFields();await t.post(V(`/api/contacts/${e}/send-sms`),n),T.success(`SMS sent successfully.`),a(!1),c.resetFields()}catch(e){e?.errorFields||T.error(e?.response?.data?.message||`Failed to send SMS.`)}finally{s(!1)}},onCancel:()=>a(!1),destroyOnClose:!0,children:(0,R.jsxs)(x,{form:c,layout:`vertical`,initialValues:{phone:n||``,message:``},children:[(0,R.jsx)(x.Item,{name:`phone`,label:`Phone`,rules:[{required:!0,message:`Phone is required.`}],children:(0,R.jsx)(C,{placeholder:`+92...`,readOnly:!0})}),(0,R.jsx)(x.Item,{name:`message`,label:`Message`,rules:[{required:!0,message:`Message is required.`}],children:(0,R.jsx)(C.TextArea,{rows:4,placeholder:`Type your message...`,maxLength:480,showCount:!0})})]})})]})}function at({contact:e,open:n,onClose:r,onSaved:i}){let[a]=x.useForm(),[o,s]=(0,L.useState)(!1),[c,l]=T.useMessage();return(0,L.useEffect)(()=>{n&&e&&a.setFieldsValue({name:e.name,contact_type:e.contact_type,phone:e.phone,email:e.email,pan:e.pan,tax_registration_no:e.tax_registration_no,credit_limit:e.credit_limit,address:e.address,accept_purchase:e.accept_purchase})},[n,e,a]),(0,R.jsxs)(R.Fragment,{children:[l,(0,R.jsx)(te,{title:`Edit Contact`,open:n,onClose:r,width:480,destroyOnClose:!0,footer:(0,R.jsxs)(y,{style:{float:`right`},children:[(0,R.jsx)(p,{onClick:r,children:`Cancel`}),(0,R.jsx)(p,{type:`primary`,loading:o,onClick:()=>a.submit(),children:`Save`})]}),children:(0,R.jsxs)(x,{form:a,layout:`vertical`,onFinish:async n=>{s(!0);try{await t.patch(V(`/api/contacts/${e.id}`),n,{headers:H()}),c.success(`Contact updated`),i?.(),r()}catch(e){c.error(e?.response?.data?.message||`Failed to update contact`)}finally{s(!1)}},children:[(0,R.jsx)(x.Item,{name:`name`,label:`Name`,rules:[{required:!0}],children:(0,R.jsx)(C,{})}),(0,R.jsxs)(v,{gutter:12,children:[(0,R.jsx)(_,{span:12,children:(0,R.jsx)(x.Item,{name:`contact_type`,label:`Type`,rules:[{required:!0}],children:(0,R.jsx)(C,{readOnly:!0,disabled:!0})})}),(0,R.jsx)(_,{span:12,children:(0,R.jsx)(x.Item,{name:`phone`,label:`Phone`,children:(0,R.jsx)(C,{})})})]}),(0,R.jsx)(x.Item,{name:`email`,label:`Email`,children:(0,R.jsx)(C,{})}),(0,R.jsxs)(v,{gutter:12,children:[(0,R.jsx)(_,{span:12,children:(0,R.jsx)(x.Item,{name:`pan`,label:`PAN / Tax ID`,children:(0,R.jsx)(C,{})})}),(0,R.jsx)(_,{span:12,children:(0,R.jsx)(x.Item,{name:`tax_registration_no`,label:`Tax Reg No`,children:(0,R.jsx)(C,{})})})]}),(0,R.jsx)(x.Item,{name:`credit_limit`,label:`Credit Limit`,children:(0,R.jsx)(C,{type:`number`,min:0})}),(0,R.jsx)(x.Item,{name:`address`,label:`Address`,children:(0,R.jsx)(C.TextArea,{rows:2})})]})})]})}function ot({auth:e,id:t}){let[n,r]=(0,L.useState)(!1),[i,a]=(0,L.useState)(!1),[o,s]=(0,L.useState)(0);return(0,R.jsx)(Ye,{auth:e,id:t,endpoint:`/api/contacts/`,mapRecord:e=>({title:J(e)}),flush:!0,children:(l,{reload:u})=>{let d=J(l),m=l?.account_summary,h=l?.account_chart||[],g=m?`${m.name||``}${m.code?` (${m.code})`:``}`.trim():l?.account?.name||l?.account?.code,_=[{key:`overview`,label:`Overview`,children:(0,R.jsxs)(`div`,{className:`crm-show__overview-grid`,children:[(0,R.jsxs)(Q,{title:`Contact Information`,extra:(0,R.jsx)(Me,{endpoint:`/api/contacts/${t}/send-email`,defaultValues:{sender_email:e?.user?.email||``,receiver_email:l?.email||``,subject:l?.name?`Message for ${l.name}`:``},disabled:!l?.email}),children:[(0,R.jsx)(Qe,{contact:l}),l?.address?(0,R.jsxs)(`div`,{className:`crm-show__overview-note`,children:[(0,R.jsx)(z,{type:`secondary`,children:`Address`}),(0,R.jsx)(Ne,{children:l.address})]}):null,(0,R.jsx)(Ve,{rows:[{label:`Code`,value:l?.code},{label:`Type`,value:(0,R.jsx)(X,{value:l?.contact_type})},{label:`Group`,value:l?.contact_group?.name||l?.contactGroup?.name},{label:`PAN`,value:l?.pan},{label:`Tax Reg No`,value:l?.tax_registration_no},{label:`Credit Term`,value:l?.credit_term?.name||l?.creditTerm?.name},{label:`Credit Limit`,value:K(l?.credit_limit)},{label:`Accept Purchase`,value:l?.accept_purchase?`Yes`:`No`}]})]}),(0,R.jsx)(Q,{title:`Account Snapshot`,compact:!0,children:m?(0,R.jsxs)(R.Fragment,{children:[(0,R.jsx)(Ve,{rows:[{label:`Account`,value:g},{label:`Nature`,value:m.nature},{label:`Balance`,value:(0,R.jsx)(z,{strong:!0,children:K(m.balance)})}]}),(0,R.jsx)(et,{summary:m})]}):(0,R.jsx)(c,{image:c.PRESENTED_IMAGE_SIMPLE,description:`No linked account`})}),h.length?(0,R.jsx)(tt,{data:h}):null]})},{key:`transactions`,label:`Transactions`,children:(0,R.jsx)(nt,{contactId:t})},{key:`activities`,label:`Activities`,children:(0,R.jsx)(He,{activityCrud:I({locked:{contact_id:t}}),baseFilters:{contact_id:t},rowUrl:e=>U(`crm.activities.show`,e.id,`/crm/activities/${e.id}`)})},{key:`deals`,label:`Deals`,children:(0,R.jsx)($,{title:`Deals`,endpoint:`/api/deals/`,params:{contact_id:t},columns:We,rowUrl:e=>U(`crm.deals.show`,e.id,`/crm/deals/${e.id}`)})},{key:`leads`,label:`Leads`,children:(0,R.jsx)($,{title:`Leads`,endpoint:`/api/leads/`,params:{contact_id:t},columns:Ue,rowUrl:e=>U(`crm.leads.show`,e.id,`/crm/leads/${e.id}`)})},{key:`support_tickets`,label:`Support Tickets`,children:(0,R.jsxs)(`div`,{children:[(0,R.jsx)(`div`,{style:{display:`flex`,justifyContent:`flex-end`,marginBottom:8},children:(0,R.jsx)(p,{size:`small`,type:`primary`,icon:(0,R.jsx)(f,{}),onClick:()=>a(!0),children:`New Ticket`})}),(0,R.jsx)($,{title:`Support Tickets`,endpoint:`/api/support-tickets/`,params:{contact_id:t},columns:rt,rowUrl:e=>U(`crm.tickets.show`,e.id,`/crm/tickets/${e.id}`)},`tickets-${o}`)]})}];return(0,R.jsxs)(R.Fragment,{children:[(0,R.jsx)(Ze,{record:l,title:d,subtitle:[l?.code,l?.email,l?.phone].filter(Boolean).join(` | `),icon:(0,R.jsx)(ae,{}),tags:(0,R.jsxs)(R.Fragment,{children:[(0,R.jsx)(X,{value:l?.contact_type}),(0,R.jsx)(X,{value:l?.active===!1?`inactive`:`active`})]}),backLabel:`Contacts`,backUrl:U(`crm.contacts.index`,null,`/crm/contacts`),avatarSrc:l?.image_url||l?.image||null,amountLabel:`Account Balance`,amount:K(m?.balance??0),amountIcon:(0,R.jsx)(ue,{}),railRows:[{label:`Type`,value:(0,R.jsx)(X,{value:l?.contact_type})},{label:`Account`,value:g||`-`},{label:`Balance`,value:(0,R.jsx)(z,{strong:!0,children:K(m?.balance??0)})},{label:`Group`,value:l?.contact_group?.name||l?.contactGroup?.name},{label:`Phone`,value:l?.phone},{label:`Email`,value:l?.email},{label:`Created`,value:G(l?.created_at)}],tabs:_,headerActions:(0,R.jsxs)(y,{size:4,children:[(0,R.jsx)(it,{contactId:t,phone:l?.phone,disabled:!l?.phone}),(0,R.jsx)(p,{size:`small`,icon:(0,R.jsx)(k,{}),onClick:()=>r(!0),children:`Edit`})]})}),(0,R.jsx)(at,{contact:l,open:n,onClose:()=>r(!1),onSaved:u}),(0,R.jsx)(st,{open:i,onClose:()=>a(!1),contactId:t,contactName:l?.name,onCreated:()=>{a(!1),s(e=>e+1)}})]})}})}function st({open:e,onClose:n,contactId:r,contactName:i,onCreated:a}){let[s]=x.useForm(),[c,l]=(0,L.useState)(!1);return(0,L.useEffect)(()=>{e&&s.resetFields()},[e,s]),(0,R.jsx)(E,{open:e,title:i?`New Ticket for ${i}`:`New Ticket`,onCancel:n,onOk:async()=>{try{let e=await s.validateFields();l(!0),await t.post(V(`/api/support-tickets/`),{...e,contact_id:r,source:e.source||`manual`,status:e.status||`open`,priority:e.priority||`medium`},{headers:H()}),T.success(`Ticket created`),a?.()}catch(e){if(e?.errorFields)return;T.error(e?.response?.data?.message||`Failed to create ticket`)}finally{l(!1)}},okText:`Create Ticket`,confirmLoading:c,destroyOnClose:!0,children:(0,R.jsxs)(x,{form:s,layout:`vertical`,initialValues:{priority:`medium`,status:`open`,source:`manual`},children:[(0,R.jsx)(x.Item,{name:`subject`,label:`Subject`,rules:[{required:!0,message:`Subject is required`}],children:(0,R.jsx)(C,{placeholder:`Brief summary`,maxLength:255})}),(0,R.jsx)(x.Item,{name:`description`,label:`Description`,children:(0,R.jsx)(C.TextArea,{rows:4,placeholder:`Describe the issue`})}),(0,R.jsxs)(v,{gutter:12,children:[(0,R.jsx)(_,{span:12,children:(0,R.jsx)(x.Item,{name:`priority`,label:`Priority`,children:(0,R.jsx)(o,{options:[{value:`low`,label:`Low`},{value:`medium`,label:`Medium`},{value:`high`,label:`High`},{value:`urgent`,label:`Urgent`}]})})}),(0,R.jsx)(_,{span:12,children:(0,R.jsx)(x.Item,{name:`category`,label:`Category`,children:(0,R.jsx)(C,{placeholder:`e.g. billing, technical`,maxLength:60})})})]})]})})}function ct({auth:e,id:n}){let[r,i]=(0,L.useState)(!1),[a,o]=(0,L.useState)(!1),[s,c]=(0,L.useState)(``),[u,m]=(0,L.useState)(!1),[h,g]=(0,L.useState)(!1),[_,v]=(0,L.useState)(0),[b,S]=(0,L.useState)(`details`),[w,ne]=T.useMessage(),re=async(e,r=null)=>{try{let i={status:e};r&&(i.lost_reason=r),await t.patch(`${B}/api/leads/${n}`,i,{headers:H()}),w.success(`Lead marked ${e}`),v(e=>e+1)}catch{w.error(`Failed to update status`)}},ie=async()=>{if(!s.trim()){w.warning(`Lost reason required`);return}try{await t.post(`${B}/api/crm/leads/${n}/mark-lost`,{lost_reason:s},{headers:H()}),w.success(`Lead marked lost`),o(!1),c(``),v(e=>e+1)}catch{w.error(`Failed to mark lost`)}},j=async e=>{if(!e){w.error(`Create a deal before marking this lead as converted.`);return}try{await t.post(`${B}/api/crm/leads/${n}/convert`,{converted_deal_id:e},{headers:H()}),w.success(`Lead converted to deal`),i(!1),v(e=>e+1)}catch(e){w.error(e?.response?.data?.message||`Conversion failed`)}};return(0,R.jsxs)(R.Fragment,{children:[ne,(0,R.jsx)(Ye,{auth:e,id:n,endpoint:`/api/leads/`,mapRecord:e=>({title:J(e)}),children:e=>{let t=J(e),r=(0,R.jsxs)(`div`,{className:`crm-show__overview-grid`,children:[(0,R.jsxs)(Q,{title:`Lead Overview`,extra:(0,R.jsx)(`div`,{className:`crm-show__overview-actions`,children:(0,R.jsxs)(y,{wrap:!0,size:6,children:[e?.phone&&(0,R.jsx)(d,{title:`Call ${e.phone}`,children:(0,R.jsx)(p,{size:`small`,icon:(0,R.jsx)(N,{}),onClick:()=>window.location.href=`tel:${e.phone}`})}),e?.email&&(0,R.jsx)(d,{title:`Email ${e.email}`,children:(0,R.jsx)(p,{size:`small`,icon:(0,R.jsx)(M,{}),onClick:()=>window.location.href=`mailto:${e.email}`})}),(0,R.jsx)(p,{size:`small`,icon:(0,R.jsx)(f,{}),onClick:()=>m(!0),children:`Activity`}),(0,R.jsx)(p,{size:`small`,icon:(0,R.jsx)(k,{}),onClick:()=>g(!0),children:`Edit Lead`}),(0,R.jsx)(p,{size:`small`,icon:(0,R.jsx)(l,{}),onClick:()=>re(`contacted`),children:`Contacted`}),(0,R.jsx)(p,{size:`small`,icon:(0,R.jsx)(l,{}),onClick:()=>re(`qualified`),children:`Qualify`}),e?.status!==`converted`&&(0,R.jsx)(p,{size:`small`,type:`primary`,icon:(0,R.jsx)(he,{}),onClick:()=>i(!0),children:`Convert to Deal`}),e?.status!==`lost`&&(0,R.jsx)(p,{size:`small`,danger:!0,icon:(0,R.jsx)(de,{}),onClick:()=>o(!0),children:`Mark Lost`})]})}),children:[(0,R.jsx)($e,{lead:e}),(0,R.jsx)(Ve,{rows:[{label:`Lead No`,value:e?.lead_no},{label:`Name`,value:e?.name},{label:`Company`,value:e?.company_name},{label:`Status`,value:(0,R.jsx)(X,{value:e?.status||`new`})},{label:`Priority`,value:(0,R.jsx)(X,{value:e?.priority||`medium`})},{label:`Source`,value:e?.lead_source},{label:`Pipeline`,value:e?.deal_pipeline?.name||e?.dealPipeline?.name},{label:`Expected Value`,value:K(e?.expected_value)},{label:`Assigned To`,value:e?.assigned_to?.name||e?.assignedTo?.name},{label:`Contact`,value:e?.contact?.name},{label:`Next Follow Up`,value:G(e?.next_follow_up_at||e?.next_follow_up_date)},{label:`Last Contacted`,value:G(e?.last_contacted_at)},e?.status===`converted`&&e?.converted_deal?{label:`Converted Deal`,value:(0,R.jsx)(p,{type:`link`,size:`small`,style:{padding:0},onClick:()=>A.visit(`/crm/deals/${e.converted_deal.id}`),children:e.converted_deal.title})}:null,e?.lost_reason?{label:`Lost Reason`,value:e.lost_reason}:null].filter(Boolean)})]}),(0,R.jsxs)(`div`,{className:`crm-show__overview-side`,children:[(0,R.jsx)(Q,{title:`Communication`,compact:!0,children:(0,R.jsxs)(`div`,{className:`crm-show__communication-list`,children:[(0,R.jsxs)(`div`,{className:`crm-show__communication-item`,children:[(0,R.jsx)(`div`,{className:`crm-show__communication-icon`,children:(0,R.jsx)(M,{})}),(0,R.jsxs)(`div`,{className:`crm-show__communication-content`,children:[(0,R.jsx)(z,{type:`secondary`,children:`Email`}),(0,R.jsx)(z,{strong:!0,children:(0,R.jsx)(Y,{value:e?.email})})]})]}),(0,R.jsxs)(`div`,{className:`crm-show__communication-item`,children:[(0,R.jsx)(`div`,{className:`crm-show__communication-icon`,children:(0,R.jsx)(N,{})}),(0,R.jsxs)(`div`,{className:`crm-show__communication-content`,children:[(0,R.jsx)(z,{type:`secondary`,children:`Phone`}),(0,R.jsx)(z,{strong:!0,children:(0,R.jsx)(Y,{value:e?.phone||e?.mobile})})]})]}),(0,R.jsxs)(`div`,{className:`crm-show__communication-item`,children:[(0,R.jsx)(`div`,{className:`crm-show__communication-icon`,children:(0,R.jsx)(ee,{})}),(0,R.jsxs)(`div`,{className:`crm-show__communication-content`,children:[(0,R.jsx)(z,{type:`secondary`,children:`Website`}),(0,R.jsx)(z,{strong:!0,children:(0,R.jsx)(Y,{value:e?.website})})]})]})]})}),(0,R.jsx)(Q,{title:`Notes`,compact:!0,children:(0,R.jsx)(`div`,{className:`crm-show__overview-note`,children:(0,R.jsx)(Ne,{children:(0,R.jsx)(Y,{value:e?.notes})})})})]})]}),a=I({locked:{lead_id:n}}),s=F({locked:{lead_id:n}}),c=[{key:`timeline`,label:`Timeline`,children:(0,R.jsx)(Z,{title:`Timeline`,children:(0,R.jsx)($,{title:`Timeline`,endpoint:`/api/crm-activities/`,params:{lead_id:n},columns:[{title:`Subject`,dataIndex:`subject`,key:`subject`,sorter:!0,render:e=>(0,R.jsx)(z,{strong:!0,children:e||`-`})},{title:`Type`,dataIndex:`activity_type`,key:`activity_type`,width:110,render:e=>e?(0,R.jsx)(D,{className:`crm-show__tag`,children:q(e)}):`-`},{title:`Status`,dataIndex:`status`,key:`status`,width:120,render:e=>(0,R.jsx)(X,{value:e||`pending`})},{title:`Priority`,dataIndex:`priority`,key:`priority`,width:100,render:e=>(0,R.jsx)(X,{value:e||`medium`})},{title:`Due`,dataIndex:`due_at`,key:`due_at`,width:160,render:G}],rowUrl:e=>U(`crm.activities.show`,e.id,`/crm/activities/${e.id}`)})})},{key:`activities`,label:`Activities`,children:(0,R.jsx)(He,{activityCrud:a,baseFilters:{lead_id:n},rowUrl:e=>U(`crm.activities.show`,e.id,`/crm/activities/${e.id}`)})},{key:`deals`,label:`Deals`,children:(0,R.jsx)(Ke,{lead:e,leadId:n,dealCrud:s,dealCrudColumns:[{title:`Title`,dataIndex:`title`,key:`title`,sorter:!0,render:e=>(0,R.jsx)(z,{strong:!0,children:e||`-`})},{title:`Status`,dataIndex:`status`,key:`status`,width:110,render:e=>(0,R.jsx)(X,{value:e||`open`})},{title:`Stage`,key:`stage`,width:140,render:(e,t)=>t?.deal_stage?.name||`-`},{title:`Pipeline`,key:`pipeline`,width:140,render:(e,t)=>t?.deal_pipeline?.name||`-`},{title:`Amount`,dataIndex:`amount`,key:`amount`,width:130,align:`right`,render:K},{title:`Expected Close`,dataIndex:`expected_close_date`,key:`expected_close_date`,width:140,render:e=>e||`-`}]})},{key:`support_tickets`,label:`Support Tickets`,children:(0,R.jsx)($,{title:`Support Tickets`,endpoint:`/api/support-tickets/`,params:{lead_id:n},columns:rt,rowUrl:e=>U(`crm.tickets.show`,e.id,`/crm/tickets/${e.id}`)})},{key:`purchase_bills`,label:`Costs`,children:(0,R.jsx)($,{title:`Purchase Bills / Costs`,endpoint:`/api/purchase-bills/`,params:{lead_id:n},columns:Ge(`bill_no`,`bill_date`,`grand_total`)})},{key:`details`,label:`Details`,children:(0,R.jsxs)(R.Fragment,{children:[r,(0,R.jsx)(Je,{leadId:n})]})}];return(0,R.jsx)(Ze,{record:e,title:t,subtitle:[e?.lead_no,e?.company_name,e?.email].filter(Boolean).join(` | `),icon:(0,R.jsx)(ye,{}),tags:(0,R.jsxs)(R.Fragment,{children:[(0,R.jsx)(X,{value:e?.status||`new`}),(0,R.jsx)(X,{value:e?.priority||`medium`}),(0,R.jsx)(X,{value:e?.active===!1?`inactive`:`active`})]}),headerActions:(0,R.jsx)(p,{size:`small`,icon:(0,R.jsx)(k,{}),onClick:()=>g(!0),children:`Edit Lead`}),backLabel:`Leads`,backUrl:U(`crm.leads.index`,null,`/crm/leads`),amountLabel:`Expected Value`,amount:K(e?.expected_value),amountIcon:(0,R.jsx)(fe,{}),railRows:[{label:`Status`,value:(0,R.jsx)(X,{value:e?.status||`new`})},{label:`Priority`,value:(0,R.jsx)(X,{value:e?.priority||`medium`})},{label:`Pipeline`,value:e?.deal_pipeline?.name||e?.dealPipeline?.name},{label:`Phone`,value:e?.phone||e?.mobile},{label:`Email`,value:e?.email},{label:`Follow-up`,value:G(e?.next_follow_up_at||e?.next_follow_up_date)},{label:`Created`,value:G(e?.created_at)}],tabs:c,activeKey:b,onTabChange:S})}},_),h&&(0,R.jsx)(`div`,{style:{display:`none`},children:(0,R.jsx)(O,{title:`Leads`,apiUrl:`${B}/api/leads/`,columns:[{title:`Lead`,dataIndex:`name`,key:`name`}],fields:P().fields,validationSchema:P().validationSchema,crudInitialValues:P().crudInitialValues,transformPayload:P().transformPayload,form_ui:`modal`,modalWidth:900,enableServerPagination:!1,showSearch:!1,canAdd:!1,canEdit:!0,canDelete:!1,hasActions:!1,hasActionColumns:!1,openOnMount:!0,openMode:`edit`,openEditId:n,onFormClose:()=>g(!1),onEditSuccess:()=>{g(!1),v(e=>e+1)}})}),u&&(0,R.jsx)(`div`,{style:{display:`none`},children:(0,R.jsx)(O,{title:`Activities`,apiUrl:`${B}/api/crm-activities/`,columns:[{title:`Subject`,dataIndex:`subject`,key:`subject`}],fields:I({locked:{lead_id:n}}).fields,validationSchema:I({locked:{lead_id:n}}).validationSchema,crudInitialValues:I({locked:{lead_id:n}}).crudInitialValues,transformPayload:I({locked:{lead_id:n}}).transformPayload,baseFilters:{lead_id:n},form_ui:`modal`,modalWidth:860,enableServerPagination:!1,showSearch:!1,canAdd:!0,canEdit:!1,canDelete:!1,hasActions:!1,hasActionColumns:!1,openOnMount:!0,openMode:`add`,submitLabelOverride:`Add Activity`,onFormClose:()=>m(!1),onAddSuccess:()=>{m(!1),S(`activities`),v(e=>e+1)}})}),r&&(0,R.jsxs)(te,{title:`Convert Lead to Deal`,open:r,onClose:()=>i(!1),width:700,children:[(0,R.jsx)(O,{title:`Create Deal from Lead`,apiUrl:`${B}/api/deals/`,columns:[{title:`Title`,dataIndex:`title`,key:`title`},{title:`Stage`,key:`stage`,render:(e,t)=>t.deal_stage?.name||`-`}],fields:F({locked:{lead_id:n}}).fields,validationSchema:F().validationSchema,crudInitialValues:{...F().crudInitialValues,lead_id:n},transformPayload:F({locked:{lead_id:n}}).transformPayload,baseFilters:{lead_id:n},form_ui:`drawer`,drawerWidth:700,enableServerPagination:!1,showSearch:!1,canAdd:!0,canEdit:!1,canDelete:!1,hasActions:!1,hasActionColumns:!1,onAddSuccess:e=>j((e?.data||e)?.id)}),(0,R.jsx)(`div`,{style:{marginTop:16,padding:12,background:`#f5f5f5`,borderRadius:8},children:(0,R.jsx)(z,{type:`secondary`,children:`Create the deal here. The lead will be marked Converted and linked to the new deal automatically.`})})]}),(0,R.jsx)(E,{title:`Mark Lead Lost`,open:a,onOk:ie,onCancel:()=>{o(!1),c(``)},okText:`Mark Lost`,okButtonProps:{danger:!0},children:(0,R.jsx)(x,{layout:`vertical`,children:(0,R.jsx)(x.Item,{label:`Lost Reason`,required:!0,children:(0,R.jsx)(C.TextArea,{rows:3,value:s,onChange:e=>c(e.target.value),placeholder:`Why is this lead lost?`})})})})]})}function lt({auth:e,id:t}){return(0,R.jsx)(Ye,{auth:e,id:t,endpoint:`/api/crm-activities/`,mapRecord:e=>({title:e?.subject||`Activity`}),children:(e,{setRecord:t})=>{let n=[...e?.crm_activity_comments||e?.crmActivityComments||[]].sort((e,t)=>{let n=e?.created_at?new Date(e.created_at).getTime():0,r=t?.created_at?new Date(t.created_at).getTime():0;if(n!==r)return n-r;let i=String(e?.user?.name||e?.user?.email||``).toLowerCase(),a=String(t?.user?.name||t?.user?.email||``).toLowerCase();return i===a?String(e?.id||``).localeCompare(String(t?.id||``)):i<a?-1:1}),r=(0,R.jsx)(`div`,{className:`crm-show__overview-grid crm-show__overview-grid--single`,children:(0,R.jsxs)(Q,{title:`Activity Overview`,children:[(0,R.jsx)(Ve,{rows:[{label:`Type`,value:(0,R.jsx)(X,{value:e?.activity_type})},{label:`Status`,value:(0,R.jsx)(X,{value:e?.status||`pending`})},{label:`Priority`,value:(0,R.jsx)(X,{value:e?.priority||`medium`})},{label:`Assigned To`,value:e?.assigned_to?.name||e?.assignedTo?.name},{label:`Lead`,value:e?.lead?.name},{label:`Contact`,value:e?.contact?.name},{label:`Deal`,value:e?.deal?.title||e?.deal?.name},{label:`Due At`,value:G(e?.due_at)},{label:`Reminder At`,value:G(e?.reminder_at)},{label:`Next Follow Up`,value:G(e?.next_follow_up_at)},{label:`Outcome`,value:e?.outcome}]}),(0,R.jsxs)(`div`,{className:`crm-show__overview-note`,children:[(0,R.jsx)(z,{type:`secondary`,children:`Description`}),(0,R.jsx)(Ne,{children:(0,R.jsx)(Y,{value:e?.description})})]})]})}),i=(0,R.jsx)(Xe,{activity:e,comments:n,onActivityUpdated:t}),a=(0,R.jsxs)(v,{gutter:[14,14],children:[e?.lead?.id?(0,R.jsx)(_,{xs:24,lg:12,children:(0,R.jsxs)(Z,{title:`Linked Lead`,extra:(0,R.jsx)(p,{size:`small`,type:`link`,onClick:()=>A.visit(U(`crm.leads.show`,e.lead.id,`/crm/leads/${e.lead.id}`)),children:`Open`}),children:[(0,R.jsx)(z,{strong:!0,children:e.lead.name}),(0,R.jsx)(`br`,{}),(0,R.jsx)(z,{type:`secondary`,children:e.lead.company_name||e.lead.email||`-`})]})}):null,e?.contact?.id?(0,R.jsx)(_,{xs:24,lg:12,children:(0,R.jsxs)(Z,{title:`Linked Contact`,extra:(0,R.jsx)(p,{size:`small`,type:`link`,onClick:()=>A.visit(U(`crm.contacts.show`,e.contact.id,`/crm/contacts/${e.contact.id}`)),children:`Open`}),children:[(0,R.jsx)(z,{strong:!0,children:e.contact.name}),(0,R.jsx)(`br`,{}),(0,R.jsx)(z,{type:`secondary`,children:e.contact.email||e.contact.phone||`-`})]})}):null,!e?.lead?.id&&!e?.contact?.id?(0,R.jsx)(_,{span:24,children:(0,R.jsx)(Z,{title:`Linked Records`,children:(0,R.jsx)(c,{image:c.PRESENTED_IMAGE_SIMPLE,description:`No linked records`})})}):null]}),o=[{key:`overview`,label:`Overview`,children:r},{key:`comments`,label:`Comments`,count:n.length,children:i},{key:`linked`,label:`Linked Records`,children:a}];return(0,R.jsx)(Ze,{record:e,title:e?.subject||`Activity`,subtitle:[q(e?.activity_type),e?.outcome].filter(Boolean).join(` | `)||`CRM activity`,icon:(0,R.jsx)(_e,{}),tags:(0,R.jsxs)(R.Fragment,{children:[(0,R.jsx)(X,{value:e?.status||`pending`}),(0,R.jsx)(X,{value:e?.priority||`medium`}),(0,R.jsx)(X,{value:e?.active===!1?`inactive`:`active`})]}),backLabel:`Activities`,backUrl:U(`crm.activities.index`,null,`/crm/activities`),amountLabel:`Due Date`,amount:G(e?.due_at),amountIcon:(0,R.jsx)(b,{}),railRows:[{label:`Type`,value:(0,R.jsx)(X,{value:e?.activity_type})},{label:`Status`,value:(0,R.jsx)(X,{value:e?.status||`pending`})},{label:`Priority`,value:(0,R.jsx)(X,{value:e?.priority||`medium`})},{label:`Created`,value:G(e?.created_at)},{label:`Updated`,value:G(e?.updated_at)}],tabs:o})}})}export{lt as ActivityShow,ot as ContactShow,ct as LeadShow};