import{i as e}from"./chunk-62oNxeRG.js";import{i as t}from"./axios-CFfZBleg.js";import{r as n,t as r}from"./jsx-runtime-gigNY91P.js";import{t as i}from"./table-7HIFvDMr.js";import{t as a}from"./select-DERalnSy.js";import{t as o}from"./avatar-b0g70QSA.js";import{t as s}from"./button-BmYu5N-C.js";import{t as c}from"./dayjs.min-CATwxWQA.js";import{t as l}from"./date-picker-D_uc1Hii.js";import{t as u}from"./card-DTJPOkHd.js";import{n as d,t as f}from"./row-BBL_6KDH.js";import{t as p}from"./space-z60N_4CI.js";import{t as m}from"./ClockCircleOutlined-C5swacTD.js";import{t as h}from"./drawer-DtcwWALr.js";import{t as ee}from"./FileTextOutlined-miD4Dy7i.js";import{t as g}from"./input-Bo3_yDN1.js";import{t as _}from"./typography-C64NIvH1.js";import{t as te}from"./ReloadOutlined-DOxyFpkG.js";import{t as v}from"./statistic-CnUcTCHO.js";import{t as y}from"./tag-6_jbeUxL.js";import{t as ne}from"./index.esm-DhG8u0u_.js";import{u as b}from"./app-CFwJBgsW.js";import{t as x}from"./AuthenticatedLayout-QCsF94_K.js";import{t as S}from"./CheckCircleOutlined-Ot2sCrio.js";import{t as C}from"./FieldTimeOutlined-C9kYgmKU.js";import{t as re}from"./SaveOutlined-COdndX95.js";import{t as w}from"./StopOutlined-DFBs-x7k.js";import{t as T}from"./TeamOutlined-BxNNW9V1.js";import{t as E}from"./PrintableComponent-Cyz8tm-3.js";var D=e(n(),1),O=e(c(),1),k=r(),{Text:A,Title:j}=_,M=``,N=e=>`${M}${e}`,ie=[{value:`PRESENT`,label:`Present`},{value:`LATE`,label:`Late`},{value:`HALF_DAY`,label:`Half Day`},{value:`ABSENT`,label:`Absent`},{value:`ON_LEAVE`,label:`On Leave`},{value:`HOLIDAY`,label:`Holiday`}],P=[`ABSENT`,`HOLIDAY`,`ON_LEAVE`],F=e=>{let t=e?.response?.data;if(typeof t?.message==`string`&&t.message)return t.message;if(typeof t?.detail==`string`&&t.detail)return t.detail;if(t?.errors&&typeof t.errors==`object`){let e=Object.values(t.errors)[0];if(Array.isArray(e)&&e.length)return e[0];if(typeof e==`string`)return e}return e?.message||`Request failed.`};function I({auth:e}){let{message:n}=b.useApp(),[r,c]=(0,D.useState)((0,O.default)()),[_,M]=(0,D.useState)([]),[I,ae]=(0,D.useState)({}),[L,R]=(0,D.useState)({}),[z,B]=(0,D.useState)(!1),[V,H]=(0,D.useState)(!1),[U,W]=(0,D.useState)([]),[G,K]=(0,D.useState)(!1),q=(0,D.useCallback)(async()=>{B(!0);try{let e=r.format(`YYYY-MM-DD`),[n,i]=await Promise.all([t.get(N(`/api/hrm/users/`),{params:{page_size:500}}),t.get(N(`/api/hrm/attendances/`),{params:{in_time_from:e,in_time_to:e,page_size:500}})]);M(n.data?.results||[]);let a=i.data?.results||i.data?.data||[],o={};a.forEach(e=>{o[e.user_id]=e}),ae(o);let s={};a.forEach(e=>{let t=e.in_time_status||``,n=P.includes(t);s[e.user_id]={in_time:!n&&e.in_time?(0,O.default)(e.in_time).format(`HH:mm`):``,out_time:!n&&e.out_time?(0,O.default)(e.out_time).format(`HH:mm`):``,status:t,attendance_id:e.id,dirty:!1}}),R(s)}finally{B(!1)}},[r]);(0,D.useEffect)(()=>{q()},[q]);let J=(e,t,n)=>{R(r=>({...r,[e]:{...r[e]||{},[t]:n,dirty:!0}}))},Y=e=>{let t=U.length>0?U:_.map(e=>e.id),n=P.includes(e);R(r=>{let i={...r};return t.forEach(t=>{let a=r[t]||{};i[t]={...a,status:e,in_time:n?``:a.in_time||`09:00`,out_time:n?``:a.out_time||`18:00`,attendance_id:I[t]?.id,dirty:!0}}),i})},oe=async()=>{if(r.isAfter((0,O.default)(),`day`)){n.warning(`Future attendance cannot be saved.`);return}let e=r.format(`YYYY-MM-DD`),i=Object.entries(L).filter(([,e])=>e.dirty&&e.status);if(!i.length){n.info(`No changes to save.`);return}H(!0);let a=await Promise.all(i.map(async([n,r])=>{try{let i=P.includes(r.status),a={user_id:Number(n),in_time:i?`${e}T00:00:00`:r.in_time?`${e}T${r.in_time}:00`:null,out_time:i?null:r.out_time?`${e}T${r.out_time}:00`:null,in_time_status:r.status||null,out_time_status:r.status||null,active:!0};return r.attendance_id?await t.patch(N(`/api/hrm/attendances/${r.attendance_id}/`),a):await t.post(N(`/api/hrm/attendances/`),a),{ok:!0}}catch(e){return{ok:!1,error:F(e)}}})),o=a.filter(e=>e.ok).length,s=a.length-o,c=a.find(e=>!e.ok)?.error;H(!1),s>0?n.warning(`${o} saved, ${s} failed. ${c||``}`.trim()):n.success(`${o} attendance record${o===1?``:`s`} saved.`),await q()},X=(0,D.useMemo)(()=>{let e={PRESENT:0,LATE:0,ABSENT:0,ON_LEAVE:0};Object.values(L).forEach(t=>{t.status&&e[t.status]!==void 0&&e[t.status]++});let t=Object.values(L).filter(e=>e.status).length;return{...e,unmarked:_.length-t}},[L,_]),Z=(0,D.useMemo)(()=>Object.values(L).filter(e=>e.dirty&&e.status).length,[L]),se=(0,D.useMemo)(()=>_.map(e=>{let t=L[e.id]||{},n=[e.first_name,e.last_name].filter(Boolean).join(` `)||e.username||e.email||`-`,i=t.in_time||(I[e.id]?.in_time?(0,O.default)(I[e.id].in_time).format(`HH:mm`):``),a=t.out_time||(I[e.id]?.out_time?(0,O.default)(I[e.id].out_time).format(`HH:mm`):``),o=i?(0,O.default)(`${r.format(`YYYY-MM-DD`)} ${i}`):null,s=a?(0,O.default)(`${r.format(`YYYY-MM-DD`)} ${a}`):null,c=o?.isValid()&&s?.isValid()&&s.isAfter(o)?(s.diff(o,`minute`)/60).toFixed(2):`-`;return{id:e.id,employee:n,code:e.employee_id||e.username||`-`,status:t.status||`UNMARKED`,in_time:i||`-`,out_time:a||`-`,hours:c}}),[I,r,L,_]),ce=[{title:`Employee`,key:`employee`,width:220,render:(e,t)=>{let n=[t.first_name,t.last_name].filter(Boolean).join(` `)||t.username||t.email;return(0,k.jsxs)(p,{size:10,children:[(0,k.jsx)(o,{size:32,style:{background:`#1677ff`,fontSize:12,fontWeight:700},children:[t.first_name?.[0],t.last_name?.[0]].filter(Boolean).join(``).toUpperCase()||`U`}),(0,k.jsxs)(`div`,{children:[(0,k.jsx)(A,{strong:!0,style:{display:`block`,lineHeight:1.3},children:n}),(0,k.jsx)(A,{type:`secondary`,style:{fontSize:12},children:t.employee_id||t.username})]})]})}},{title:`Status`,key:`status`,width:155,render:(e,t)=>(0,k.jsx)(a,{value:L[t.id]?.status||null,onChange:e=>J(t.id,`status`,e),options:ie,placeholder:`—`,style:{width:`100%`},allowClear:!0,size:`small`})},{title:`In Time`,key:`in_time`,width:120,render:(e,t)=>(0,k.jsx)(g,{type:`time`,size:`small`,value:L[t.id]?.in_time||``,onChange:e=>J(t.id,`in_time`,e.target.value),disabled:P.includes(L[t.id]?.status)})},{title:`Out Time`,key:`out_time`,width:120,render:(e,t)=>(0,k.jsx)(g,{type:`time`,size:`small`,value:L[t.id]?.out_time||``,onChange:e=>J(t.id,`out_time`,e.target.value),disabled:P.includes(L[t.id]?.status)})},{title:`Record`,key:`record`,width:90,align:`center`,render:(e,t)=>L[t.id]?.dirty?(0,k.jsx)(y,{color:`orange`,children:`Unsaved`}):I[t.id]?(0,k.jsx)(y,{color:`green`,children:`Saved`}):(0,k.jsx)(y,{children:`—`})}],Q=[{label:`Total`,value:_.length,color:`#1677ff`,icon:(0,k.jsx)(T,{})},{label:`Present`,value:X.PRESENT,color:`#52c41a`,icon:(0,k.jsx)(S,{})},{label:`Late`,value:X.LATE,color:`#faad14`,icon:(0,k.jsx)(m,{})},{label:`Absent`,value:X.ABSENT,color:`#ff4d4f`,icon:(0,k.jsx)(w,{})},{label:`On Leave`,value:X.ON_LEAVE,color:`#1890ff`,icon:(0,k.jsx)(T,{})},{label:`Unmarked`,value:X.unmarked,color:`#8c8c8c`,icon:(0,k.jsx)(C,{})}],$=`Daily Attendance Report - ${r.format(`DD MMM YYYY`)}`,le=`daily-attendance-${r.format(`YYYY-MM-DD`)}.pdf`;return(0,k.jsxs)(x,{auth:e,children:[(0,k.jsx)(ne,{title:`Attendance`}),(0,k.jsx)(`div`,{style:{padding:16,minHeight:`calc(100vh - 64px)`},children:(0,k.jsxs)(p,{direction:`vertical`,size:12,style:{display:`flex`},children:[(0,k.jsx)(u,{bordered:!1,style:{borderRadius:12},styles:{body:{padding:`12px 16px`}},children:(0,k.jsxs)(f,{gutter:[12,8],align:`middle`,wrap:!0,children:[(0,k.jsx)(d,{children:(0,k.jsx)(j,{level:4,style:{margin:0},children:`Day Register`})}),(0,k.jsx)(d,{children:(0,k.jsx)(l,{value:r,onChange:e=>{if(e){if(e.isAfter((0,O.default)(),`day`)){n.warning(`Future attendance is not allowed.`);return}c(e)}},disabledDate:e=>e&&e.isAfter((0,O.default)(),`day`),allowClear:!1,style:{width:160}})}),(0,k.jsx)(d,{flex:`auto`}),(0,k.jsx)(d,{children:(0,k.jsxs)(p,{wrap:!0,size:6,children:[(0,k.jsx)(s,{size:`small`,icon:(0,k.jsx)(S,{}),onClick:()=>Y(`PRESENT`),children:U.length>0?`Mark ${U.length} Present`:`All Present`}),(0,k.jsx)(s,{size:`small`,icon:(0,k.jsx)(m,{}),onClick:()=>Y(`LATE`),children:U.length>0?`Mark ${U.length} Late`:`All Late`}),(0,k.jsx)(s,{size:`small`,danger:!0,icon:(0,k.jsx)(w,{}),onClick:()=>Y(`ABSENT`),children:U.length>0?`Mark ${U.length} Absent`:`All Absent`}),(0,k.jsx)(s,{size:`small`,icon:(0,k.jsx)(te,{}),onClick:q,loading:z,children:`Refresh`}),(0,k.jsx)(s,{size:`small`,icon:(0,k.jsx)(ee,{}),onClick:()=>K(!0),children:`Daily Report`}),(0,k.jsxs)(s,{type:`primary`,icon:(0,k.jsx)(re,{}),onClick:oe,loading:V,disabled:!Z,children:[`Save`,Z>0?` (${Z})`:``]})]})})]})}),(0,k.jsx)(f,{gutter:[10,10],children:Q.map(({label:e,value:t,color:n,icon:r})=>(0,k.jsx)(d,{xs:12,sm:8,md:4,children:(0,k.jsx)(u,{bordered:!1,style:{borderRadius:10},styles:{body:{padding:`10px 14px`}},children:(0,k.jsxs)(p,{size:10,align:`center`,children:[(0,k.jsx)(`span`,{style:{color:n,fontSize:18},children:r}),(0,k.jsx)(v,{title:e,value:t,valueStyle:{fontSize:18,fontWeight:700}})]})})},e))}),(0,k.jsx)(u,{bordered:!1,style:{borderRadius:12},styles:{body:{padding:0}},children:(0,k.jsx)(i,{rowKey:`id`,loading:z,dataSource:_,columns:ce,size:`small`,rowSelection:{selectedRowKeys:U,onChange:W},pagination:{pageSize:50,showSizeChanger:!0,showTotal:e=>`${e} employees`},scroll:{x:620},locale:{emptyText:`No employees found.`}})}),(0,k.jsx)(h,{title:$,open:G,onClose:()=>K(!1),width:960,children:(0,k.jsx)(E,{title:$,subTitle:`Generated ${(0,O.default)().format(`DD MMM YYYY, HH:mm`)}`,fileName:le,printButtonText:`Print`,downloadButtonText:`Download`,emailButtonText:`Email`,defaultEmailValues:{subject:$,body:`Please find attached the attendance report for ${r.format(`DD MMM YYYY`)}.`},contentStyle:{padding:24},children:(0,k.jsxs)(`div`,{className:`attendance-report-print`,children:[(0,k.jsx)(`style`,{children:`
                  .attendance-report-print {
                    color: #1f2937;
                    font-family: Arial, sans-serif;
                    font-size: 12px;
                  }
                  .attendance-report-print__header {
                    display: flex;
                    justify-content: space-between;
                    gap: 16px;
                    border-bottom: 1px solid #d9d9d9;
                    padding-bottom: 12px;
                    margin-bottom: 14px;
                  }
                  .attendance-report-print__header h2 {
                    margin: 0 0 4px;
                    font-size: 20px;
                    line-height: 1.25;
                  }
                  .attendance-report-print__header p {
                    margin: 0;
                    color: #6b7280;
                  }
                  .attendance-report-print__stats {
                    display: grid;
                    grid-template-columns: repeat(6, 1fr);
                    gap: 8px;
                    margin-bottom: 14px;
                  }
                  .attendance-report-print__stat {
                    border: 1px solid #e5e7eb;
                    padding: 8px;
                    border-radius: 6px;
                  }
                  .attendance-report-print__stat span {
                    display: block;
                    color: #6b7280;
                    font-size: 11px;
                  }
                  .attendance-report-print__stat strong {
                    display: block;
                    font-size: 18px;
                    line-height: 1.2;
                  }
                  .attendance-report-print table {
                    width: 100%;
                    border-collapse: collapse;
                  }
                  .attendance-report-print th,
                  .attendance-report-print td {
                    border: 1px solid #e5e7eb;
                    padding: 7px 8px;
                    text-align: left;
                    vertical-align: top;
                  }
                  .attendance-report-print th {
                    background: #f3f4f6;
                    font-weight: 700;
                  }
                  .attendance-report-print td:last-child,
                  .attendance-report-print th:last-child {
                    text-align: right;
                  }
                  @media print {
                    .attendance-report-print__stats {
                      grid-template-columns: repeat(6, 1fr);
                    }
                  }
                `}),(0,k.jsxs)(`div`,{className:`attendance-report-print__header`,children:[(0,k.jsxs)(`div`,{children:[(0,k.jsx)(`h2`,{children:`Daily Attendance Report`}),(0,k.jsx)(`p`,{children:r.format(`DD MMM YYYY`)})]}),(0,k.jsxs)(`p`,{children:[`Generated `,(0,O.default)().format(`DD MMM YYYY, HH:mm`)]})]}),(0,k.jsx)(`div`,{className:`attendance-report-print__stats`,children:Q.map(({label:e,value:t})=>(0,k.jsxs)(`div`,{className:`attendance-report-print__stat`,children:[(0,k.jsx)(`span`,{children:e}),(0,k.jsx)(`strong`,{children:t})]},e))}),(0,k.jsxs)(`table`,{children:[(0,k.jsx)(`thead`,{children:(0,k.jsxs)(`tr`,{children:[(0,k.jsx)(`th`,{children:`Employee`}),(0,k.jsx)(`th`,{children:`Code`}),(0,k.jsx)(`th`,{children:`Status`}),(0,k.jsx)(`th`,{children:`In`}),(0,k.jsx)(`th`,{children:`Out`}),(0,k.jsx)(`th`,{children:`Hours`})]})}),(0,k.jsx)(`tbody`,{children:se.map(e=>(0,k.jsxs)(`tr`,{children:[(0,k.jsx)(`td`,{children:e.employee}),(0,k.jsx)(`td`,{children:e.code}),(0,k.jsx)(`td`,{children:e.status.replace(`_`,` `)}),(0,k.jsx)(`td`,{children:e.in_time}),(0,k.jsx)(`td`,{children:e.out_time}),(0,k.jsx)(`td`,{children:e.hours})]},e.id))})]})]})})})]})})]})}export{I as default};