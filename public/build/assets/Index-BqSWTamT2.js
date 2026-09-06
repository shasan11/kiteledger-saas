import{i as e}from"./rolldown-runtime-aKtaBQYM.js";import{t}from"./axios-BQPRRFHk.js";import{t as n}from"./index.esm-CtIVDvdE.js";import{r,t as i}from"./jsx-runtime-RbF_zoRI.js";import{t as a}from"./table-sosYro0l.js";import{t as o}from"./typography-BlWmaYWr.js";import{t as s}from"./select-D1gP4WaH.js";import{t as c}from"./avatar-BOLagyMK.js";import{t as l}from"./button-ZrI-T1CS.js";import{t as u}from"./dayjs.min-BRtZKQ04.js";import{t as d}from"./date-picker-DTcMirK-.js";import{t as f}from"./card-C0Xr1RgP.js";import{n as p,t as ee}from"./row-DiFu7gfS.js";import{t as m}from"./space-BXAcXX1Q.js";import{t as h}from"./ClockCircleOutlined-B5RN5CVK.js";import{t as g}from"./drawer-CW-x5V59.js";import{t as _}from"./FileTextOutlined-B6ownMO3.js";import{t as v}from"./input-7h35vTt9.js";import{t as te}from"./ReloadOutlined-CMtviqc6.js";import{t as y}from"./tag-5JFZRmzJ.js";import{d as b}from"./app-DnC0Zo9j.js";import{t as x}from"./AuthenticatedLayout-B5_U8JtE.js";import{t as S}from"./CheckCircleOutlined-B_TrR1yt.js";import{t as C}from"./FieldTimeOutlined-C0cSmXiW.js";import{t as ne}from"./SaveOutlined-Dd9ggDs_.js";import{t as w}from"./StopOutlined-nZ2Jb1g9.js";import{t as T}from"./TeamOutlined-C7snhPGm.js";import{t as re}from"./PrintableComponent-CA5UVady.js";var E=e(r(),1),D=e(u(),1),O=i(),{Text:k,Title:A}=o,j=``,M=e=>`${j}${e}`,N=[{value:`PRESENT`,label:`Present`},{value:`LATE`,label:`Late`},{value:`HALF_DAY`,label:`Half Day`},{value:`ABSENT`,label:`Absent`},{value:`ON_LEAVE`,label:`On Leave`},{value:`HOLIDAY`,label:`Holiday`}],P=[`ABSENT`,`HOLIDAY`,`ON_LEAVE`],F=e=>{let t=e?.response?.data;if(typeof t?.message==`string`&&t.message)return t.message;if(typeof t?.detail==`string`&&t.detail)return t.detail;if(t?.errors&&typeof t.errors==`object`){let e=Object.values(t.errors)[0];if(Array.isArray(e)&&e.length)return e[0];if(typeof e==`string`)return e}return e?.message||`Request failed.`};function I({auth:e}){let{message:r}=b.useApp(),[i,o]=(0,E.useState)((0,D.default)()),[u,j]=(0,E.useState)([]),[I,ie]=(0,E.useState)({}),[L,R]=(0,E.useState)({}),[z,B]=(0,E.useState)(!1),[V,H]=(0,E.useState)(!1),[U,W]=(0,E.useState)([]),[G,K]=(0,E.useState)(!1),q=(0,E.useCallback)(async()=>{B(!0);try{let e=i.format(`YYYY-MM-DD`),[n,r]=await Promise.all([t.get(M(`/api/hrm/users/`),{params:{page_size:500}}),t.get(M(`/api/hrm/attendances/`),{params:{in_time_from:e,in_time_to:e,page_size:500}})]);j(n.data?.results||[]);let a=r.data?.results||r.data?.data||[],o={};a.forEach(e=>{o[e.user_id]=e}),ie(o);let s={};a.forEach(e=>{let t=e.in_time_status||``,n=P.includes(t);s[e.user_id]={in_time:!n&&e.in_time?(0,D.default)(e.in_time).format(`HH:mm`):``,out_time:!n&&e.out_time?(0,D.default)(e.out_time).format(`HH:mm`):``,status:t,attendance_id:e.id,dirty:!1}}),R(s)}finally{B(!1)}},[i]);(0,E.useEffect)(()=>{q()},[q]);let J=(e,t,n)=>{R(r=>({...r,[e]:{...r[e]||{},[t]:n,dirty:!0}}))},Y=e=>{let t=U.length>0?U:u.map(e=>e.id),n=P.includes(e);R(r=>{let i={...r};return t.forEach(t=>{let a=r[t]||{};i[t]={...a,status:e,in_time:n?``:a.in_time||`09:00`,out_time:n?``:a.out_time||`18:00`,attendance_id:I[t]?.id,dirty:!0}}),i})},ae=async()=>{if(i.isAfter((0,D.default)(),`day`)){r.warning(`Future attendance cannot be saved.`);return}let e=i.format(`YYYY-MM-DD`),n=Object.entries(L).filter(([,e])=>e.dirty&&e.status);if(!n.length){r.info(`No changes to save.`);return}H(!0);let a=await Promise.all(n.map(async([n,r])=>{try{let i=P.includes(r.status),a={user_id:Number(n),in_time:i?`${e}T00:00:00`:r.in_time?`${e}T${r.in_time}:00`:null,out_time:i?null:r.out_time?`${e}T${r.out_time}:00`:null,in_time_status:r.status||null,out_time_status:r.status||null,active:!0};return r.attendance_id?await t.patch(M(`/api/hrm/attendances/${r.attendance_id}/`),a):await t.post(M(`/api/hrm/attendances/`),a),{ok:!0}}catch(e){return{ok:!1,error:F(e)}}})),o=a.filter(e=>e.ok).length,s=a.length-o,c=a.find(e=>!e.ok)?.error;H(!1),s>0?r.warning(`${o} saved, ${s} failed. ${c||``}`.trim()):r.success(`${o} attendance record${o===1?``:`s`} saved.`),await q()},X=(0,E.useMemo)(()=>{let e={PRESENT:0,LATE:0,ABSENT:0,ON_LEAVE:0};Object.values(L).forEach(t=>{t.status&&e[t.status]!==void 0&&e[t.status]++});let t=Object.values(L).filter(e=>e.status).length;return{...e,unmarked:u.length-t}},[L,u]),Z=(0,E.useMemo)(()=>Object.values(L).filter(e=>e.dirty&&e.status).length,[L]),Q=(0,E.useMemo)(()=>u.map(e=>{let t=L[e.id]||{},n=[e.first_name,e.last_name].filter(Boolean).join(` `)||e.username||e.email||`-`,r=t.in_time||(I[e.id]?.in_time?(0,D.default)(I[e.id].in_time).format(`HH:mm`):``),a=t.out_time||(I[e.id]?.out_time?(0,D.default)(I[e.id].out_time).format(`HH:mm`):``),o=r?(0,D.default)(`${i.format(`YYYY-MM-DD`)} ${r}`):null,s=a?(0,D.default)(`${i.format(`YYYY-MM-DD`)} ${a}`):null,c=o?.isValid()&&s?.isValid()&&s.isAfter(o)?(s.diff(o,`minute`)/60).toFixed(2):`-`;return{id:e.id,employee:n,code:e.employee_id||e.username||`-`,status:t.status||`UNMARKED`,in_time:r||`-`,out_time:a||`-`,hours:c}}),[I,i,L,u]),oe=[{title:`Employee`,key:`employee`,width:220,render:(e,t)=>{let n=[t.first_name,t.last_name].filter(Boolean).join(` `)||t.username||t.email;return(0,O.jsxs)(m,{size:10,children:[(0,O.jsx)(c,{size:32,style:{background:`#1677ff`,fontSize:12,fontWeight:700},children:[t.first_name?.[0],t.last_name?.[0]].filter(Boolean).join(``).toUpperCase()||`U`}),(0,O.jsxs)(`div`,{children:[(0,O.jsx)(k,{strong:!0,style:{display:`block`,lineHeight:1.3},children:n}),(0,O.jsx)(k,{type:`secondary`,style:{fontSize:12},children:t.employee_id||t.username})]})]})}},{title:`Status`,key:`status`,width:155,render:(e,t)=>(0,O.jsx)(s,{value:L[t.id]?.status||null,onChange:e=>J(t.id,`status`,e),options:N,placeholder:`-`,style:{width:`100%`},allowClear:!0,size:`small`})},{title:`In Time`,key:`in_time`,width:120,render:(e,t)=>(0,O.jsx)(v,{type:`time`,size:`small`,value:L[t.id]?.in_time||``,onChange:e=>J(t.id,`in_time`,e.target.value),disabled:P.includes(L[t.id]?.status)})},{title:`Out Time`,key:`out_time`,width:120,render:(e,t)=>(0,O.jsx)(v,{type:`time`,size:`small`,value:L[t.id]?.out_time||``,onChange:e=>J(t.id,`out_time`,e.target.value),disabled:P.includes(L[t.id]?.status)})},{title:`Record`,key:`record`,width:90,align:`center`,render:(e,t)=>L[t.id]?.dirty?(0,O.jsx)(y,{color:`orange`,children:`Unsaved`}):I[t.id]?(0,O.jsx)(y,{color:`green`,children:`Saved`}):(0,O.jsx)(y,{children:`-`})}],se=[{label:`Total`,value:u.length,color:`#1677ff`,icon:(0,O.jsx)(T,{})},{label:`Present`,value:X.PRESENT,color:`#52c41a`,icon:(0,O.jsx)(S,{})},{label:`Late`,value:X.LATE,color:`#faad14`,icon:(0,O.jsx)(h,{})},{label:`Absent`,value:X.ABSENT,color:`#ff4d4f`,icon:(0,O.jsx)(w,{})},{label:`On Leave`,value:X.ON_LEAVE,color:`#1890ff`,icon:(0,O.jsx)(T,{})},{label:`Unmarked`,value:X.unmarked,color:`#8c8c8c`,icon:(0,O.jsx)(C,{})}],$=`Daily Attendance Report - ${i.format(`DD MMM YYYY`)}`,ce=`daily-attendance-${i.format(`YYYY-MM-DD`)}.pdf`;return(0,O.jsxs)(x,{auth:e,children:[(0,O.jsx)(n,{title:`Attendance`}),(0,O.jsx)(`div`,{style:{padding:16,minHeight:`calc(100vh - 64px)`},children:(0,O.jsxs)(m,{direction:`vertical`,size:12,style:{display:`flex`},children:[(0,O.jsx)(f,{bordered:!1,style:{borderRadius:12},styles:{body:{padding:`12px 16px`}},children:(0,O.jsxs)(ee,{gutter:[12,8],align:`middle`,wrap:!0,children:[(0,O.jsx)(p,{children:(0,O.jsx)(A,{level:4,style:{margin:0},children:`Day Register`})}),(0,O.jsx)(p,{children:(0,O.jsx)(d,{value:i,onChange:e=>{if(e){if(e.isAfter((0,D.default)(),`day`)){r.warning(`Future attendance is not allowed.`);return}o(e)}},disabledDate:e=>e&&e.isAfter((0,D.default)(),`day`),allowClear:!1,style:{width:160}})}),(0,O.jsx)(p,{flex:`auto`}),(0,O.jsx)(p,{children:(0,O.jsxs)(m,{wrap:!0,size:6,children:[(0,O.jsx)(l,{size:`small`,icon:(0,O.jsx)(S,{}),onClick:()=>Y(`PRESENT`),children:U.length>0?`Mark ${U.length} Present`:`All Present`}),(0,O.jsx)(l,{size:`small`,icon:(0,O.jsx)(h,{}),onClick:()=>Y(`LATE`),children:U.length>0?`Mark ${U.length} Late`:`All Late`}),(0,O.jsx)(l,{size:`small`,danger:!0,icon:(0,O.jsx)(w,{}),onClick:()=>Y(`ABSENT`),children:U.length>0?`Mark ${U.length} Absent`:`All Absent`}),(0,O.jsx)(l,{size:`small`,icon:(0,O.jsx)(te,{}),onClick:q,loading:z,children:`Refresh`}),(0,O.jsx)(l,{size:`small`,icon:(0,O.jsx)(_,{}),onClick:()=>K(!0),children:`Daily Report`}),(0,O.jsxs)(l,{type:`primary`,icon:(0,O.jsx)(ne,{}),onClick:ae,loading:V,disabled:!Z,children:[`Save`,Z>0?` (${Z})`:``]})]})})]})}),(0,O.jsx)(f,{bordered:!1,style:{borderRadius:12},styles:{body:{padding:0}},children:(0,O.jsx)(a,{rowKey:`id`,loading:z,dataSource:u,columns:oe,size:`small`,rowSelection:{selectedRowKeys:U,onChange:W},pagination:{pageSize:50,showSizeChanger:!0,showTotal:e=>`${e} employees`},scroll:{x:620},locale:{emptyText:`No employees found.`}})}),(0,O.jsx)(g,{title:$,open:G,onClose:()=>K(!1),width:960,children:(0,O.jsx)(re,{title:$,subTitle:`Generated ${(0,D.default)().format(`DD MMM YYYY, HH:mm`)}`,fileName:ce,printButtonText:`Print`,downloadButtonText:`Download`,emailButtonText:`Email`,defaultEmailValues:{subject:$,body:`Please find attached the attendance report for ${i.format(`DD MMM YYYY`)}.`},contentStyle:{padding:24},children:(0,O.jsxs)(`div`,{className:`attendance-report-print`,children:[(0,O.jsx)(`style`,{children:`
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
                `}),(0,O.jsxs)(`div`,{className:`attendance-report-print__header`,children:[(0,O.jsxs)(`div`,{children:[(0,O.jsx)(`h2`,{children:`Daily Attendance Report`}),(0,O.jsx)(`p`,{children:i.format(`DD MMM YYYY`)})]}),(0,O.jsxs)(`p`,{children:[`Generated `,(0,D.default)().format(`DD MMM YYYY, HH:mm`)]})]}),(0,O.jsx)(`div`,{className:`attendance-report-print__stats`,children:se.map(({label:e,value:t})=>(0,O.jsxs)(`div`,{className:`attendance-report-print__stat`,children:[(0,O.jsx)(`span`,{children:e}),(0,O.jsx)(`strong`,{children:t})]},e))}),(0,O.jsxs)(`table`,{children:[(0,O.jsx)(`thead`,{children:(0,O.jsxs)(`tr`,{children:[(0,O.jsx)(`th`,{children:`Employee`}),(0,O.jsx)(`th`,{children:`Code`}),(0,O.jsx)(`th`,{children:`Status`}),(0,O.jsx)(`th`,{children:`In`}),(0,O.jsx)(`th`,{children:`Out`}),(0,O.jsx)(`th`,{children:`Hours`})]})}),(0,O.jsx)(`tbody`,{children:Q.map(e=>(0,O.jsxs)(`tr`,{children:[(0,O.jsx)(`td`,{children:e.employee}),(0,O.jsx)(`td`,{children:e.code}),(0,O.jsx)(`td`,{children:e.status.replace(`_`,` `)}),(0,O.jsx)(`td`,{children:e.in_time}),(0,O.jsx)(`td`,{children:e.out_time}),(0,O.jsx)(`td`,{children:e.hours})]},e.id))})]})]})})})]})})]})}export{I as default};