import{i as e}from"./rolldown-runtime-aKtaBQYM.js";import{t}from"./axios-BQPRRFHk.js";import{t as n}from"./index.esm-CtIVDvdE.js";import{r,t as i}from"./jsx-runtime-RbF_zoRI.js";import{t as a}from"./table-DK2wnZMe.js";import{t as o}from"./typography-BTjN9rxU.js";import{t as s}from"./select-BHNpiCXT.js";import{t as c}from"./avatar-EA2dx6l6.js";import{t as l}from"./button-DdnyfjyJ.js";import{t as u}from"./dayjs.min-BRtZKQ04.js";import{t as d}from"./date-picker-BRFiNHRV.js";import{t as f}from"./card-DkP92y8s.js";import{n as p,t as m}from"./row-3lWxq59F.js";import{t as h}from"./space-_4B_xOOu.js";import{t as g}from"./ClockCircleOutlined-B5RN5CVK.js";import{t as _}from"./drawer-qIW_CdGU.js";import{t as v}from"./FileTextOutlined-B6ownMO3.js";import{t as y}from"./input-D-fdS88J.js";import{t as ee}from"./ReloadOutlined-CMtviqc6.js";import{t as b}from"./statistic-Ce-4Es7I.js";import{t as x}from"./tag-Dh3NArqV.js";import{u as S}from"./app-BwFUQDpF.js";import{t as te}from"./AuthenticatedLayout-CN4xNjh_.js";import{t as C}from"./CheckCircleOutlined-B_TrR1yt.js";import{t as w}from"./FieldTimeOutlined-C0cSmXiW.js";import{t as ne}from"./SaveOutlined-Dd9ggDs_.js";import{t as T}from"./StopOutlined-nZ2Jb1g9.js";import{t as E}from"./TeamOutlined-C7snhPGm.js";import{t as re}from"./PrintableComponent-CvOTM9YS.js";var D=e(r(),1),O=e(u(),1),k=i(),{Text:A,Title:ie}=o,j=``,M=e=>`${j}${e}`,N=[{value:`PRESENT`,label:`Present`},{value:`LATE`,label:`Late`},{value:`HALF_DAY`,label:`Half Day`},{value:`ABSENT`,label:`Absent`},{value:`ON_LEAVE`,label:`On Leave`},{value:`HOLIDAY`,label:`Holiday`}],P=[`ABSENT`,`HOLIDAY`,`ON_LEAVE`],F=e=>{let t=e?.response?.data;if(typeof t?.message==`string`&&t.message)return t.message;if(typeof t?.detail==`string`&&t.detail)return t.detail;if(t?.errors&&typeof t.errors==`object`){let e=Object.values(t.errors)[0];if(Array.isArray(e)&&e.length)return e[0];if(typeof e==`string`)return e}return e?.message||`Request failed.`};function I({auth:e}){let{message:r}=S.useApp(),[i,o]=(0,D.useState)((0,O.default)()),[u,j]=(0,D.useState)([]),[I,ae]=(0,D.useState)({}),[L,R]=(0,D.useState)({}),[z,B]=(0,D.useState)(!1),[V,H]=(0,D.useState)(!1),[U,W]=(0,D.useState)([]),[G,K]=(0,D.useState)(!1),q=(0,D.useCallback)(async()=>{B(!0);try{let e=i.format(`YYYY-MM-DD`),[n,r]=await Promise.all([t.get(M(`/api/hrm/users/`),{params:{page_size:500}}),t.get(M(`/api/hrm/attendances/`),{params:{in_time_from:e,in_time_to:e,page_size:500}})]);j(n.data?.results||[]);let a=r.data?.results||r.data?.data||[],o={};a.forEach(e=>{o[e.user_id]=e}),ae(o);let s={};a.forEach(e=>{let t=e.in_time_status||``,n=P.includes(t);s[e.user_id]={in_time:!n&&e.in_time?(0,O.default)(e.in_time).format(`HH:mm`):``,out_time:!n&&e.out_time?(0,O.default)(e.out_time).format(`HH:mm`):``,status:t,attendance_id:e.id,dirty:!1}}),R(s)}finally{B(!1)}},[i]);(0,D.useEffect)(()=>{q()},[q]);let J=(e,t,n)=>{R(r=>({...r,[e]:{...r[e]||{},[t]:n,dirty:!0}}))},Y=e=>{let t=U.length>0?U:u.map(e=>e.id),n=P.includes(e);R(r=>{let i={...r};return t.forEach(t=>{let a=r[t]||{};i[t]={...a,status:e,in_time:n?``:a.in_time||`09:00`,out_time:n?``:a.out_time||`18:00`,attendance_id:I[t]?.id,dirty:!0}}),i})},oe=async()=>{if(i.isAfter((0,O.default)(),`day`)){r.warning(`Future attendance cannot be saved.`);return}let e=i.format(`YYYY-MM-DD`),n=Object.entries(L).filter(([,e])=>e.dirty&&e.status);if(!n.length){r.info(`No changes to save.`);return}H(!0);let a=await Promise.all(n.map(async([n,r])=>{try{let i=P.includes(r.status),a={user_id:Number(n),in_time:i?`${e}T00:00:00`:r.in_time?`${e}T${r.in_time}:00`:null,out_time:i?null:r.out_time?`${e}T${r.out_time}:00`:null,in_time_status:r.status||null,out_time_status:r.status||null,active:!0};return r.attendance_id?await t.patch(M(`/api/hrm/attendances/${r.attendance_id}/`),a):await t.post(M(`/api/hrm/attendances/`),a),{ok:!0}}catch(e){return{ok:!1,error:F(e)}}})),o=a.filter(e=>e.ok).length,s=a.length-o,c=a.find(e=>!e.ok)?.error;H(!1),s>0?r.warning(`${o} saved, ${s} failed. ${c||``}`.trim()):r.success(`${o} attendance record${o===1?``:`s`} saved.`),await q()},X=(0,D.useMemo)(()=>{let e={PRESENT:0,LATE:0,ABSENT:0,ON_LEAVE:0};Object.values(L).forEach(t=>{t.status&&e[t.status]!==void 0&&e[t.status]++});let t=Object.values(L).filter(e=>e.status).length;return{...e,unmarked:u.length-t}},[L,u]),Z=(0,D.useMemo)(()=>Object.values(L).filter(e=>e.dirty&&e.status).length,[L]),se=(0,D.useMemo)(()=>u.map(e=>{let t=L[e.id]||{},n=[e.first_name,e.last_name].filter(Boolean).join(` `)||e.username||e.email||`-`,r=t.in_time||(I[e.id]?.in_time?(0,O.default)(I[e.id].in_time).format(`HH:mm`):``),a=t.out_time||(I[e.id]?.out_time?(0,O.default)(I[e.id].out_time).format(`HH:mm`):``),o=r?(0,O.default)(`${i.format(`YYYY-MM-DD`)} ${r}`):null,s=a?(0,O.default)(`${i.format(`YYYY-MM-DD`)} ${a}`):null,c=o?.isValid()&&s?.isValid()&&s.isAfter(o)?(s.diff(o,`minute`)/60).toFixed(2):`-`;return{id:e.id,employee:n,code:e.employee_id||e.username||`-`,status:t.status||`UNMARKED`,in_time:r||`-`,out_time:a||`-`,hours:c}}),[I,i,L,u]),ce=[{title:`Employee`,key:`employee`,width:220,render:(e,t)=>{let n=[t.first_name,t.last_name].filter(Boolean).join(` `)||t.username||t.email;return(0,k.jsxs)(h,{size:10,children:[(0,k.jsx)(c,{size:32,style:{background:`#1677ff`,fontSize:12,fontWeight:700},children:[t.first_name?.[0],t.last_name?.[0]].filter(Boolean).join(``).toUpperCase()||`U`}),(0,k.jsxs)(`div`,{children:[(0,k.jsx)(A,{strong:!0,style:{display:`block`,lineHeight:1.3},children:n}),(0,k.jsx)(A,{type:`secondary`,style:{fontSize:12},children:t.employee_id||t.username})]})]})}},{title:`Status`,key:`status`,width:155,render:(e,t)=>(0,k.jsx)(s,{value:L[t.id]?.status||null,onChange:e=>J(t.id,`status`,e),options:N,placeholder:`—`,style:{width:`100%`},allowClear:!0,size:`small`})},{title:`In Time`,key:`in_time`,width:120,render:(e,t)=>(0,k.jsx)(y,{type:`time`,size:`small`,value:L[t.id]?.in_time||``,onChange:e=>J(t.id,`in_time`,e.target.value),disabled:P.includes(L[t.id]?.status)})},{title:`Out Time`,key:`out_time`,width:120,render:(e,t)=>(0,k.jsx)(y,{type:`time`,size:`small`,value:L[t.id]?.out_time||``,onChange:e=>J(t.id,`out_time`,e.target.value),disabled:P.includes(L[t.id]?.status)})},{title:`Record`,key:`record`,width:90,align:`center`,render:(e,t)=>L[t.id]?.dirty?(0,k.jsx)(x,{color:`orange`,children:`Unsaved`}):I[t.id]?(0,k.jsx)(x,{color:`green`,children:`Saved`}):(0,k.jsx)(x,{children:`—`})}],Q=[{label:`Total`,value:u.length,color:`#1677ff`,icon:(0,k.jsx)(E,{})},{label:`Present`,value:X.PRESENT,color:`#52c41a`,icon:(0,k.jsx)(C,{})},{label:`Late`,value:X.LATE,color:`#faad14`,icon:(0,k.jsx)(g,{})},{label:`Absent`,value:X.ABSENT,color:`#ff4d4f`,icon:(0,k.jsx)(T,{})},{label:`On Leave`,value:X.ON_LEAVE,color:`#1890ff`,icon:(0,k.jsx)(E,{})},{label:`Unmarked`,value:X.unmarked,color:`#8c8c8c`,icon:(0,k.jsx)(w,{})}],$=`Daily Attendance Report - ${i.format(`DD MMM YYYY`)}`,le=`daily-attendance-${i.format(`YYYY-MM-DD`)}.pdf`;return(0,k.jsxs)(te,{auth:e,children:[(0,k.jsx)(n,{title:`Attendance`}),(0,k.jsx)(`div`,{style:{padding:16,minHeight:`calc(100vh - 64px)`},children:(0,k.jsxs)(h,{direction:`vertical`,size:12,style:{display:`flex`},children:[(0,k.jsx)(f,{bordered:!1,style:{borderRadius:12},styles:{body:{padding:`12px 16px`}},children:(0,k.jsxs)(m,{gutter:[12,8],align:`middle`,wrap:!0,children:[(0,k.jsx)(p,{children:(0,k.jsx)(ie,{level:4,style:{margin:0},children:`Day Register`})}),(0,k.jsx)(p,{children:(0,k.jsx)(d,{value:i,onChange:e=>{if(e){if(e.isAfter((0,O.default)(),`day`)){r.warning(`Future attendance is not allowed.`);return}o(e)}},disabledDate:e=>e&&e.isAfter((0,O.default)(),`day`),allowClear:!1,style:{width:160}})}),(0,k.jsx)(p,{flex:`auto`}),(0,k.jsx)(p,{children:(0,k.jsxs)(h,{wrap:!0,size:6,children:[(0,k.jsx)(l,{size:`small`,icon:(0,k.jsx)(C,{}),onClick:()=>Y(`PRESENT`),children:U.length>0?`Mark ${U.length} Present`:`All Present`}),(0,k.jsx)(l,{size:`small`,icon:(0,k.jsx)(g,{}),onClick:()=>Y(`LATE`),children:U.length>0?`Mark ${U.length} Late`:`All Late`}),(0,k.jsx)(l,{size:`small`,danger:!0,icon:(0,k.jsx)(T,{}),onClick:()=>Y(`ABSENT`),children:U.length>0?`Mark ${U.length} Absent`:`All Absent`}),(0,k.jsx)(l,{size:`small`,icon:(0,k.jsx)(ee,{}),onClick:q,loading:z,children:`Refresh`}),(0,k.jsx)(l,{size:`small`,icon:(0,k.jsx)(v,{}),onClick:()=>K(!0),children:`Daily Report`}),(0,k.jsxs)(l,{type:`primary`,icon:(0,k.jsx)(ne,{}),onClick:oe,loading:V,disabled:!Z,children:[`Save`,Z>0?` (${Z})`:``]})]})})]})}),(0,k.jsx)(m,{gutter:[10,10],children:Q.map(({label:e,value:t,color:n,icon:r})=>(0,k.jsx)(p,{xs:12,sm:8,md:4,children:(0,k.jsx)(f,{bordered:!1,style:{borderRadius:10},styles:{body:{padding:`10px 14px`}},children:(0,k.jsxs)(h,{size:10,align:`center`,children:[(0,k.jsx)(`span`,{style:{color:n,fontSize:18},children:r}),(0,k.jsx)(b,{title:e,value:t,valueStyle:{fontSize:18,fontWeight:700}})]})})},e))}),(0,k.jsx)(f,{bordered:!1,style:{borderRadius:12},styles:{body:{padding:0}},children:(0,k.jsx)(a,{rowKey:`id`,loading:z,dataSource:u,columns:ce,size:`small`,rowSelection:{selectedRowKeys:U,onChange:W},pagination:{pageSize:50,showSizeChanger:!0,showTotal:e=>`${e} employees`},scroll:{x:620},locale:{emptyText:`No employees found.`}})}),(0,k.jsx)(_,{title:$,open:G,onClose:()=>K(!1),width:960,children:(0,k.jsx)(re,{title:$,subTitle:`Generated ${(0,O.default)().format(`DD MMM YYYY, HH:mm`)}`,fileName:le,printButtonText:`Print`,downloadButtonText:`Download`,emailButtonText:`Email`,defaultEmailValues:{subject:$,body:`Please find attached the attendance report for ${i.format(`DD MMM YYYY`)}.`},contentStyle:{padding:24},children:(0,k.jsxs)(`div`,{className:`attendance-report-print`,children:[(0,k.jsx)(`style`,{children:`
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
                `}),(0,k.jsxs)(`div`,{className:`attendance-report-print__header`,children:[(0,k.jsxs)(`div`,{children:[(0,k.jsx)(`h2`,{children:`Daily Attendance Report`}),(0,k.jsx)(`p`,{children:i.format(`DD MMM YYYY`)})]}),(0,k.jsxs)(`p`,{children:[`Generated `,(0,O.default)().format(`DD MMM YYYY, HH:mm`)]})]}),(0,k.jsx)(`div`,{className:`attendance-report-print__stats`,children:Q.map(({label:e,value:t})=>(0,k.jsxs)(`div`,{className:`attendance-report-print__stat`,children:[(0,k.jsx)(`span`,{children:e}),(0,k.jsx)(`strong`,{children:t})]},e))}),(0,k.jsxs)(`table`,{children:[(0,k.jsx)(`thead`,{children:(0,k.jsxs)(`tr`,{children:[(0,k.jsx)(`th`,{children:`Employee`}),(0,k.jsx)(`th`,{children:`Code`}),(0,k.jsx)(`th`,{children:`Status`}),(0,k.jsx)(`th`,{children:`In`}),(0,k.jsx)(`th`,{children:`Out`}),(0,k.jsx)(`th`,{children:`Hours`})]})}),(0,k.jsx)(`tbody`,{children:se.map(e=>(0,k.jsxs)(`tr`,{children:[(0,k.jsx)(`td`,{children:e.employee}),(0,k.jsx)(`td`,{children:e.code}),(0,k.jsx)(`td`,{children:e.status.replace(`_`,` `)}),(0,k.jsx)(`td`,{children:e.in_time}),(0,k.jsx)(`td`,{children:e.out_time}),(0,k.jsx)(`td`,{children:e.hours})]},e.id))})]})]})})})]})})]})}export{I as default};