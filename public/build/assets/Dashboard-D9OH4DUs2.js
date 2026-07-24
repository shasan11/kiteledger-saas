import{i as e}from"./rolldown-runtime-aKtaBQYM.js";import{t}from"./axios-BQPRRFHk.js";import{i as n,o as r,t as i}from"./index.esm-CtIVDvdE.js";import{r as a,t as o}from"./jsx-runtime-RbF_zoRI.js";import{t as s}from"./table-DK2wnZMe.js";import{t as c}from"./alert-CXVdfG0X.js";import{t as l}from"./typography-BTjN9rxU.js";import{t as u}from"./skeleton-DWMEFrf7.js";import{t as d}from"./select-BHNpiCXT.js";import{t as f}from"./empty-BOJtdRz7.js";import{t as p}from"./tooltip-Drai6xQt.js";import{t as m}from"./button-DdnyfjyJ.js";import{t as h}from"./dayjs.min-BRtZKQ04.js";import{t as g}from"./date-picker-BRFiNHRV.js";import{t as _}from"./tabs-D6mM-bRn.js";import{t as v}from"./card-DkP92y8s.js";import{t as y}from"./ReloadOutlined-CMtviqc6.js";import{t as b}from"./tag-Dh3NArqV.js";import{c as x,r as S}from"./app-BwFUQDpF.js";import{t as C}from"./AuthenticatedLayout-CN4xNjh_.js";import{M as w,l as T,m as E,tn as D,u as O}from"./CartesianChart-Cbve2Etq.js";import{t as k}from"./Legend-BhWmwVYj.js";import{n as A,p as ee,t as j}from"./BarChart-CwHNZuur.js";import{i as te,t as ne}from"./PieChart-D5Ng0E_-.js";import{n as M,t as N}from"./LineChart-BMJx0pTa.js";import{n as re,t as ie}from"./AreaChart-BmIq6FBE.js";var P=e(a(),1),F=e(h(),1),I=o(),{RangePicker:ae}=g,{Text:L,Title:R}=l,z=`-`,B={primary:`var(--kd-primary)`,primaryActive:`var(--kd-primary-active)`,success:`var(--kd-success)`,warning:`var(--kd-warning)`,error:`var(--kd-error)`,info:`var(--kd-info)`,text:`var(--kd-text)`,muted:`var(--kd-muted)`},V=[B.primary,B.success,B.warning,B.info,B.primaryActive,B.error,B.muted],H=(e,t={})=>{try{return new Intl.NumberFormat(e,t)}catch{return new Intl.NumberFormat(`en-US`,t)}},oe=H(`en-NP`,{style:`currency`,currency:`NPR`,maximumFractionDigits:0}),U=H(`en-NP`,{style:`currency`,currency:`NPR`,notation:`compact`,maximumFractionDigits:1}),se=H(`en-NP`),W=(e,t)=>e==null||e===``?z:(t?U:oe).format(Number(e||0)),G=e=>e==null||e===``?z:se.format(Number(e||0)),K=e=>e?(0,F.default)(e).format(`DD MMM YYYY`):z,q=e=>Number(e||0),J=e=>{e&&e!==`#`&&n.visit(e)};function Y(e){if(!e||e.length<6)return null;let t=Math.floor(e.length/2),n=e.slice(0,t),r=e.slice(t),i=n.reduce((e,t)=>e+q(t.value),0),a=r.reduce((e,t)=>e+q(t.value),0);return i===0?a>0?100:null:(a-i)/Math.abs(i)*100}function X(){let e=S(),{token:n}=x.useToken(),a=r().props.branchContext||{},[o,s]=(0,P.useState)(!0),[l,u]=(0,P.useState)(null),[d,f]=(0,P.useState)({}),[p,h]=(0,P.useState)({branch_id:a.selectedBranchId||`all`,date_from:(0,F.default)().startOf(`month`).format(`YYYY-MM-DD`),date_to:(0,F.default)().format(`YYYY-MM-DD`)}),g=(0,P.useCallback)(async()=>{s(!0),u(null);try{let e=await t.get(`/dashboard-data`,{params:{branch_id:p.branch_id===`all`?void 0:p.branch_id,date_from:p.date_from,date_to:p.date_to}});f(e.data||{})}catch(t){u(t?.response?.data?.message||e(`Unable to load dashboard data.`))}finally{s(!1)}},[p,e]);(0,P.useEffect)(()=>{g()},[g]);let _=(0,P.useMemo)(()=>ye(d),[d]);return(0,I.jsxs)(C,{header:(0,I.jsx)(ce,{branches:d.branches||a.branches||[],filters:p,loading:o,onRefresh:g,onChange:h}),children:[(0,I.jsx)(i,{title:e(`Dashboard`)}),(0,I.jsx)(Ce,{token:n}),(0,I.jsx)(`main`,{className:`kd`,children:(0,I.jsxs)(`div`,{className:`kd-wrap`,children:[l&&(0,I.jsx)(c,{showIcon:!0,type:`error`,message:e(`Dashboard could not be loaded`),description:l,action:(0,I.jsx)(m,{onClick:g,children:e(`Retry`)})}),o?(0,I.jsx)(ve,{}):(0,I.jsxs)(I.Fragment,{children:[(0,I.jsx)(`section`,{className:`kd-kpis`,children:_.kpis.map(e=>(0,I.jsx)(le,{...e},e.key))}),(0,I.jsxs)(`section`,{className:`kd-row-2`,children:[(0,I.jsx)(ue,{data:_.chartData}),(0,I.jsx)(de,{data:_.expenseBreakdown})]}),(0,I.jsxs)(`section`,{className:`kd-row-3`,children:[(0,I.jsx)(pe,{data:_.cashflowChart}),(0,I.jsx)(me,{data:_.ageingData})]}),_.bizCards.length>0&&(0,I.jsx)(`section`,{className:`kd-biz-grid`,children:_.bizCards.map(e=>(0,I.jsx)(he,{card:e},e.key))}),(0,I.jsx)(be,{approaching:_.approachingProjects,overdue:_.overdueProjects}),(0,I.jsx)(ge,{transactions:_.transactions}),(0,I.jsxs)(`section`,{className:`kd-bottom`,children:[_.topCustomers.length>0&&(0,I.jsx)(Q,{title:`Top Customers`,data:_.topCustomers,color:B.primary}),_.topSuppliers.length>0&&(0,I.jsx)(Q,{title:`Top Suppliers`,data:_.topSuppliers,color:B.warning}),_.bankAccounts.length>0&&(0,I.jsx)(_e,{accounts:_.bankAccounts})]})]})]})})]})}function ce({branches:e,filters:t,loading:n,onRefresh:r,onChange:i}){let a=[{value:`all`,label:`All branches`},...(e||[]).map(e=>({value:e.value??e.id,label:e.label??e.name??`Branch #${e.id}`}))];return(0,I.jsxs)(`div`,{className:`kd-hdr`,children:[(0,I.jsxs)(`div`,{children:[(0,I.jsx)(R,{level:5,style:{margin:`0 0 1px`,fontWeight:650},children:`Dashboard`}),(0,I.jsx)(L,{type:`secondary`,style:{fontSize:11},children:`Financial overview for the selected period`})]}),(0,I.jsxs)(`div`,{className:`kd-hdr__ctl`,children:[(0,I.jsx)(d,{value:t.branch_id,options:a,style:{width:150},onChange:e=>i(t=>({...t,branch_id:e||`all`}))}),(0,I.jsx)(ae,{value:t.date_from&&t.date_to?[(0,F.default)(t.date_from),(0,F.default)(t.date_to)]:null,style:{width:230},onChange:e=>i(t=>({...t,date_from:e?.[0]?.format(`YYYY-MM-DD`),date_to:e?.[1]?.format(`YYYY-MM-DD`)}))}),(0,I.jsx)(p,{title:`Refresh`,children:(0,I.jsx)(m,{size:`small`,icon:(0,I.jsx)(y,{spin:n}),onClick:r})})]})]})}function le({label:e,value:t,sparkline:n,color:r,trend:i,invertTrend:a,helper:o}){let s=i>0,c=a?s?B.error:B.success:s?B.success:B.error,l=Array.isArray(n)&&n.some(e=>q(e.value)!==0),u=`kpi-g-${String(e||`metric`).toLowerCase().replace(/[^a-z0-9]+/g,`-`)}`;return(0,I.jsxs)(v,{className:`kd-card kd-kpi`,style:{"--kd-accent":r},styles:{body:{padding:0,height:`100%`,position:`relative`,overflow:`hidden`}},children:[(0,I.jsx)(`div`,{className:`kd-kpi__accent`}),(0,I.jsxs)(`div`,{className:`kd-kpi__content`,children:[(0,I.jsxs)(`div`,{className:`kd-kpi__top`,children:[(0,I.jsx)(L,{type:`secondary`,className:`kd-kpi__label`,children:e}),i!=null&&(0,I.jsxs)(`span`,{className:`kd-kpi__trend`,style:{"--kd-trend":c},children:[s?`+`:`-`,Math.abs(i).toFixed(1),`%`]})]}),(0,I.jsx)(`div`,{className:`kd-kpi__val`,children:W(t)}),o&&(0,I.jsx)(L,{type:`secondary`,className:`kd-kpi__helper`,children:o})]}),l&&(0,I.jsx)(`div`,{className:`kd-kpi__spark`,"aria-hidden":!0,children:(0,I.jsx)(D,{width:`100%`,height:`100%`,children:(0,I.jsxs)(ie,{data:n,children:[(0,I.jsx)(`defs`,{children:(0,I.jsxs)(`linearGradient`,{id:u,x1:`0`,y1:`0`,x2:`0`,y2:`1`,children:[(0,I.jsx)(`stop`,{offset:`0%`,stopColor:r,stopOpacity:.24}),(0,I.jsx)(`stop`,{offset:`100%`,stopColor:r,stopOpacity:.04})]})}),(0,I.jsx)(re,{type:`monotone`,dataKey:`value`,stroke:r,strokeWidth:1.6,fill:`url(#${u})`,dot:!1,isAnimationActive:!1})]})})})]})}function ue({data:e}){let t=e.some(e=>q(e.revenue)||q(e.expenses)||q(e.profit));return(0,I.jsxs)(v,{className:`kd-card kd-chart-main`,styles:{body:{padding:8}},children:[(0,I.jsxs)(`div`,{className:`kd-card-hdr`,children:[(0,I.jsx)(`span`,{className:`kd-card-hdr__t`,children:`Financial Performance`}),(0,I.jsx)(L,{type:`secondary`,style:{fontSize:11},children:`Revenue, expenses & net profit trend`})]}),t?(0,I.jsx)(`div`,{style:{height:180},children:(0,I.jsx)(D,{width:`100%`,height:`100%`,children:(0,I.jsxs)(N,{data:e,margin:{top:4,right:10,bottom:0,left:0},children:[(0,I.jsx)(E,{stroke:`var(--kd-grid)`,vertical:!1}),(0,I.jsx)(O,{dataKey:`label`,axisLine:!1,tickLine:!1,tick:{fill:`var(--kd-muted)`,fontSize:9}}),(0,I.jsx)(T,{axisLine:!1,tickLine:!1,tick:{fill:`var(--kd-muted)`,fontSize:9},tickFormatter:e=>U.format(e),width:58}),(0,I.jsx)(w,{content:(0,I.jsx)(Z,{})}),(0,I.jsx)(k,{iconType:`circle`,iconSize:7,wrapperStyle:{fontSize:11,paddingTop:4}}),(0,I.jsx)(M,{type:`monotone`,dataKey:`revenue`,name:`Revenue`,stroke:B.primary,strokeWidth:1.8,dot:!1,activeDot:{r:3}}),(0,I.jsx)(M,{type:`monotone`,dataKey:`expenses`,name:`Expenses`,stroke:B.warning,strokeWidth:1.8,dot:!1,activeDot:{r:3}}),(0,I.jsx)(M,{type:`monotone`,dataKey:`profit`,name:`Net Profit`,stroke:B.success,strokeWidth:1.8,dot:!1,activeDot:{r:3}})]})})}):(0,I.jsx)($,{title:`No financial data`,desc:`Revenue and expense activity will appear here.`})]})}function de({data:e}){let t=e.reduce((e,t)=>e+q(t.value),0);return(0,I.jsxs)(v,{className:`kd-card kd-chart-side`,styles:{body:{padding:8}},children:[(0,I.jsxs)(`div`,{className:`kd-card-hdr`,children:[(0,I.jsx)(`span`,{className:`kd-card-hdr__t`,children:`Expense Breakdown`}),(0,I.jsx)(L,{type:`secondary`,style:{fontSize:11},children:`Where your money goes`})]}),e.length>0&&t>0?(0,I.jsx)(`div`,{style:{height:180,display:`flex`,flexDirection:`column`,alignItems:`center`},children:(0,I.jsx)(D,{width:`100%`,height:`100%`,children:(0,I.jsxs)(ne,{children:[(0,I.jsx)(te,{data:e,dataKey:`value`,nameKey:`name`,cx:`50%`,cy:`45%`,innerRadius:`52%`,outerRadius:`78%`,paddingAngle:2,strokeWidth:0,children:e.map((e,t)=>(0,I.jsx)(ee,{fill:V[t%V.length]},t))}),(0,I.jsx)(w,{content:(0,I.jsx)(fe,{total:t})}),(0,I.jsx)(k,{iconType:`circle`,iconSize:7,wrapperStyle:{fontSize:10,lineHeight:`16px`},formatter:e=>(0,I.jsx)(`span`,{style:{color:`var(--kd-text)`,fontSize:10},children:e})})]})})}):(0,I.jsx)($,{title:`No expense data`,desc:`Expense categories will appear here.`,compact:!0})]})}function fe({active:e,payload:t,total:n}){if(!e||!t?.length)return null;let r=t[0],i=n>0?(q(r.value)/n*100).toFixed(1):0;return(0,I.jsxs)(`div`,{className:`kd-tip`,children:[(0,I.jsx)(L,{strong:!0,children:r.name}),(0,I.jsxs)(`div`,{className:`kd-tip__row`,children:[(0,I.jsx)(`span`,{style:{background:r.payload?.fill}}),(0,I.jsx)(L,{type:`secondary`,children:`Amount`}),(0,I.jsx)(L,{children:W(r.value)})]}),(0,I.jsxs)(`div`,{className:`kd-tip__row`,children:[(0,I.jsx)(`span`,{style:{background:`var(--kd-border)`}}),(0,I.jsx)(L,{type:`secondary`,children:`Share`}),(0,I.jsxs)(L,{children:[i,`%`]})]})]})}function pe({data:e}){let t=e.some(e=>q(e.cash_in)||q(e.cash_out));return(0,I.jsxs)(v,{className:`kd-card kd-chart-main`,styles:{body:{padding:8}},children:[(0,I.jsxs)(`div`,{className:`kd-card-hdr`,children:[(0,I.jsx)(`span`,{className:`kd-card-hdr__t`,children:`Cash Flow`}),(0,I.jsx)(L,{type:`secondary`,style:{fontSize:11},children:`Daily cash inflows and outflows`})]}),t?(0,I.jsx)(`div`,{style:{height:170},children:(0,I.jsx)(D,{width:`100%`,height:`100%`,children:(0,I.jsxs)(N,{data:e,margin:{top:4,right:10,bottom:0,left:0},children:[(0,I.jsx)(E,{stroke:`var(--kd-grid)`,vertical:!1}),(0,I.jsx)(O,{dataKey:`label`,axisLine:!1,tickLine:!1,tick:{fill:`var(--kd-muted)`,fontSize:9}}),(0,I.jsx)(T,{axisLine:!1,tickLine:!1,tick:{fill:`var(--kd-muted)`,fontSize:9},tickFormatter:e=>U.format(e),width:58}),(0,I.jsx)(w,{content:(0,I.jsx)(Z,{})}),(0,I.jsx)(k,{iconType:`circle`,iconSize:7,wrapperStyle:{fontSize:11,paddingTop:4}}),(0,I.jsx)(M,{type:`monotone`,dataKey:`cash_in`,name:`Cash In`,stroke:B.info,strokeWidth:1.8,dot:!1,activeDot:{r:3}}),(0,I.jsx)(M,{type:`monotone`,dataKey:`cash_out`,name:`Cash Out`,stroke:B.error,strokeWidth:1.8,dot:!1,activeDot:{r:3}}),(0,I.jsx)(M,{type:`monotone`,dataKey:`net`,name:`Net`,stroke:B.primaryActive,strokeWidth:1.8,strokeDasharray:`6 3`,dot:!1,activeDot:{r:3}})]})})}):(0,I.jsx)($,{title:`No cash flow data`,desc:`Cash inflows and outflows will appear here.`})]})}function me({data:e}){let t=e.some(e=>q(e.receivables)>0||q(e.payables)>0);return(0,I.jsxs)(v,{className:`kd-card kd-chart-side`,styles:{body:{padding:8}},children:[(0,I.jsxs)(`div`,{className:`kd-card-hdr`,children:[(0,I.jsx)(`span`,{className:`kd-card-hdr__t`,children:`Receivables vs Payables Ageing`}),(0,I.jsx)(L,{type:`secondary`,style:{fontSize:11},children:`Outstanding amounts by age`})]}),t?(0,I.jsx)(`div`,{style:{height:170},children:(0,I.jsx)(D,{width:`100%`,height:`100%`,children:(0,I.jsxs)(j,{data:e,margin:{top:4,right:6,bottom:0,left:0},children:[(0,I.jsx)(E,{stroke:`var(--kd-grid)`,vertical:!1}),(0,I.jsx)(O,{dataKey:`bucket`,axisLine:!1,tickLine:!1,tick:{fill:`var(--kd-muted)`,fontSize:9}}),(0,I.jsx)(T,{axisLine:!1,tickLine:!1,tick:{fill:`var(--kd-muted)`,fontSize:9},tickFormatter:e=>U.format(e),width:52}),(0,I.jsx)(w,{content:(0,I.jsx)(Z,{})}),(0,I.jsx)(k,{iconType:`circle`,iconSize:7,wrapperStyle:{fontSize:10,paddingTop:4}}),(0,I.jsx)(A,{dataKey:`receivables`,name:`Receivables`,fill:B.info,radius:[4,4,0,0],maxBarSize:22}),(0,I.jsx)(A,{dataKey:`payables`,name:`Payables`,fill:B.warning,radius:[4,4,0,0],maxBarSize:22})]})})}):(0,I.jsx)($,{title:`No ageing data`,desc:`Receivable and payable ageing will appear here.`,compact:!0})]})}function Z({active:e,payload:t,label:n}){return!e||!t?.length?null:(0,I.jsxs)(`div`,{className:`kd-tip`,children:[(0,I.jsx)(L,{strong:!0,style:{fontSize:11},children:n}),t.map(e=>(0,I.jsxs)(`div`,{className:`kd-tip__row`,children:[(0,I.jsx)(`span`,{style:{background:e.color||e.fill}}),(0,I.jsx)(L,{type:`secondary`,children:e.name}),(0,I.jsx)(L,{children:W(e.value)})]},e.dataKey))]})}function he({card:e}){return(0,I.jsxs)(v,{className:`kd-card kd-biz`,styles:{body:{padding:8}},children:[(0,I.jsxs)(`div`,{className:`kd-biz__head`,children:[(0,I.jsx)(L,{strong:!0,style:{fontSize:12,fontWeight:650},children:e.title}),e.href&&(0,I.jsx)(m,{type:`link`,size:`small`,style:{padding:0,fontSize:11,fontWeight:600},onClick:()=>J(e.href),children:e.linkText||`View`})]}),(0,I.jsx)(`div`,{className:`kd-biz__rows`,children:e.items.map(e=>(0,I.jsxs)(`div`,{className:`kd-biz__row`,children:[(0,I.jsx)(L,{type:`secondary`,style:{fontSize:11},children:e.label}),(0,I.jsx)(L,{strong:!0,style:{fontSize:11},children:e.format===`money`?W(e.value,!0):e.format===`text`?e.value||z:G(e.value)})]},e.label))})]})}function ge({transactions:e}){let t=[{title:`Date`,dataIndex:`date`,render:K,width:110},{title:`Type`,dataIndex:`type`,width:140},{title:`Number`,dataIndex:`number`,render:(e,t)=>t.action_url?(0,I.jsx)(m,{type:`link`,style:{padding:0,fontWeight:600},onClick:e=>{e.stopPropagation(),J(t.action_url)},children:e||z}):e||z},{title:`Party`,dataIndex:`party`,ellipsis:!0,render:e=>e||z},{title:`Amount`,dataIndex:`amount`,align:`right`,render:e=>W(e)},{title:`Status`,dataIndex:`status`,width:100,render:e=>(0,I.jsx)(`span`,{className:`kd-pill`,children:e||`posted`})}];return(0,I.jsxs)(v,{className:`kd-card`,styles:{body:{padding:e.length?0:8}},children:[(0,I.jsxs)(`div`,{className:`kd-card-hdr`,style:{padding:e.length?`8px`:0,borderBottom:e.length?`1px solid var(--kd-grid)`:`none`},children:[(0,I.jsx)(`span`,{className:`kd-card-hdr__t`,children:`Recent Transactions`}),(0,I.jsx)(L,{type:`secondary`,style:{fontSize:11},children:`Latest financial documents`})]}),e.length>0?(0,I.jsx)(s,{rowKey:`key`,columns:t,dataSource:e,pagination:!1,size:`small`,scroll:{x:700},onRow:e=>({onClick:()=>J(e.action_url),className:e.action_url?`kd-row--click`:``})}):(0,I.jsx)($,{title:`No recent transactions`,desc:`Posted documents will appear here.`,compact:!0})]})}function Q({title:e,data:t,color:n}){let r=t.slice(0,5).map(e=>({...e,name:Se(e.name,18)}));return(0,I.jsxs)(v,{className:`kd-card`,styles:{body:{padding:8}},children:[(0,I.jsx)(`div`,{className:`kd-card-hdr`,style:{marginBottom:10},children:(0,I.jsx)(`span`,{className:`kd-card-hdr__t`,children:e})}),(0,I.jsx)(`div`,{style:{height:120},children:(0,I.jsx)(D,{width:`100%`,height:`100%`,children:(0,I.jsxs)(j,{data:r,layout:`vertical`,margin:{top:0,right:16,bottom:0,left:4},children:[(0,I.jsx)(O,{type:`number`,axisLine:!1,tickLine:!1,tick:{fill:`var(--kd-muted)`,fontSize:9},tickFormatter:e=>U.format(e)}),(0,I.jsx)(T,{type:`category`,dataKey:`name`,axisLine:!1,tickLine:!1,width:96,tick:{fill:`var(--kd-text)`,fontSize:10}}),(0,I.jsx)(w,{content:(0,I.jsx)(Z,{})}),(0,I.jsx)(A,{dataKey:`amount`,name:`Amount`,fill:n,radius:[0,4,4,0],maxBarSize:16})]})})})]})}function _e({accounts:e}){return(0,I.jsxs)(v,{className:`kd-card`,styles:{body:{padding:8}},children:[(0,I.jsx)(`div`,{className:`kd-card-hdr`,style:{marginBottom:10},children:(0,I.jsx)(`span`,{className:`kd-card-hdr__t`,children:`Bank Accounts`})}),(0,I.jsx)(`div`,{className:`kd-bank-list`,children:e.map(e=>(0,I.jsxs)(`div`,{className:`kd-bank-row`,children:[(0,I.jsxs)(`div`,{style:{minWidth:0},children:[(0,I.jsx)(L,{style:{fontWeight:600,fontSize:13},ellipsis:!0,children:e.bank_name||z}),(0,I.jsx)(L,{type:`secondary`,style:{fontSize:11,display:`block`},ellipsis:!0,children:[e.account_name,e.account_number].filter(Boolean).join(` / `)||z})]}),(0,I.jsxs)(`div`,{style:{textAlign:`right`,whiteSpace:`nowrap`},children:[(0,I.jsx)(L,{style:{fontWeight:650,fontSize:13},children:W(e.balance)}),e.currency&&(0,I.jsx)(L,{type:`secondary`,style:{display:`block`,fontSize:11},children:e.currency})]})]},e.key))})]})}function $({title:e,desc:t,compact:n}){return(0,I.jsx)(`div`,{style:{minHeight:n?105:170,display:`flex`,alignItems:`center`,justifyContent:`center`,textAlign:`center`,padding:10},children:(0,I.jsxs)(f,{image:f.PRESENTED_IMAGE_SIMPLE,description:!1,children:[(0,I.jsx)(R,{level:5,style:{margin:`0 0 4px`},children:e}),(0,I.jsx)(L,{type:`secondary`,style:{fontSize:11},children:t})]})})}function ve(){return(0,I.jsxs)(`div`,{style:{display:`flex`,flexDirection:`column`,gap:8},children:[(0,I.jsx)(`div`,{className:`kd-kpis`,children:[1,2,3,4,5,6].map(e=>(0,I.jsx)(v,{className:`kd-card`,styles:{body:{padding:8}},children:(0,I.jsx)(u,{active:!0,paragraph:{rows:2}})},e))}),(0,I.jsxs)(`div`,{className:`kd-row-2`,children:[(0,I.jsx)(v,{className:`kd-card`,children:(0,I.jsx)(u,{active:!0,paragraph:{rows:8}})}),(0,I.jsx)(v,{className:`kd-card`,children:(0,I.jsx)(u,{active:!0,paragraph:{rows:8}})})]}),(0,I.jsx)(v,{className:`kd-card`,children:(0,I.jsx)(u,{active:!0,paragraph:{rows:5}})})]})}function ye(e){let t=e.financial_summary||{},n=e.metric_sparklines||{},r=e.revenue_expense_profit_chart||[],i=e.cashflow_chart||[],a=r.map(e=>({date:e.date,label:e.date?(0,F.default)(e.date).format(`DD MMM`):``,revenue:q(e.revenue),expenses:q(e.expenses),profit:q(e.profit)})),o=i.map(e=>({date:e.date,label:e.date?(0,F.default)(e.date).format(`DD MMM`):``,cash_in:q(e.cash_in),cash_out:q(e.cash_out),net:q(e.net)})),s=r.map(e=>({date:e.date,value:q(e.revenue)})),c=r.map(e=>({date:e.date,value:q(e.expenses)})),l=(n.net_profit||[]).map(e=>({date:e.date,value:q(e.value)})),u=(n.cash_bank||[]).map(e=>({date:e.date,value:q(e.value)})),d=(n.receivables||[]).map(e=>({date:e.date,value:q(e.value)})),f=(n.payables||[]).map(e=>({date:e.date,value:q(e.value)})),p=[{key:`revenue`,label:`Revenue`,value:t.revenue,sparkline:s,color:B.primary,trend:Y(s),helper:`This period`},{key:`expenses`,label:`Expenses`,value:t.expenses,sparkline:c,color:B.warning,trend:Y(c),invertTrend:!0,helper:`This period`},{key:`profit`,label:`Net Profit`,value:t.net_profit,sparkline:l,color:B.success,trend:Y(l)},{key:`cash`,label:`Cash & Bank`,value:t.cash_bank_balance,sparkline:u,color:B.info,trend:Y(u),helper:`Available`},{key:`receivables`,label:`Receivables`,value:t.receivables,sparkline:d,color:B.info,helper:`Outstanding`},{key:`payables`,label:`Payables`,value:t.payables,sparkline:f,color:B.error,helper:`Outstanding`}],m=e.expense_breakdown||[],h=xe(e.receivable_ageing,e.payable_ageing),g=e.cash_position||{},_=Array.isArray(g.bank_accounts)?g.bank_accounts:[],v=Array.isArray(e.recent_transactions)?e.recent_transactions:[],y=Array.isArray(e.top_customers)?e.top_customers:[],b=Array.isArray(e.top_suppliers)?e.top_suppliers:[],x=[],S=e.sales_summary;S&&x.push({key:`sales`,title:`Sales`,href:`/payment-in/invoices`,linkText:`View invoices`,items:[{label:`Total sales`,value:S.sales_total,format:`money`},{label:`Invoices`,value:S.invoice_count},{label:`Paid`,value:S.paid_amount,format:`money`},{label:`Unpaid`,value:S.unpaid_amount,format:`money`},{label:`Overdue`,value:S.overdue_amount,format:`money`}]});let C=e.purchase_summary;C&&x.push({key:`purchase`,title:`Purchases`,href:`/payment-out/purchase-bills`,linkText:`View bills`,items:[{label:`Total purchases`,value:C.purchase_total,format:`money`},{label:`Bills`,value:C.bill_count},{label:`Paid`,value:C.paid_amount,format:`money`},{label:`Unpaid bills`,value:C.unpaid_amount,format:`money`},{label:`Expense payables`,value:C.expense_payables,format:`money`},{label:`Total payables`,value:C.total_payables??C.unpaid_amount,format:`money`},{label:`Upcoming`,value:C.upcoming_payables,format:`money`}]});let w=e.cashflow_summary;if(w){let e=[{label:`Cash in`,value:w.cash_in,format:`money`},{label:`Cash out`,value:w.cash_out,format:`money`},{label:`Net cash flow`,value:w.net_cash_flow,format:`money`}];w.biggest_inflow&&e.push({label:`Top inflow`,value:w.biggest_inflow,format:`text`}),w.biggest_outflow&&e.push({label:`Top outflow`,value:w.biggest_outflow,format:`text`}),x.push({key:`cashflow`,title:`Cash Flow`,items:e})}let T=e.inventory_summary;T&&x.push({key:`inventory`,title:`Inventory`,href:`/inventory/products`,linkText:`View`,items:[{label:`Products`,value:T.total_products},{label:`Low stock`,value:T.low_stock_items},{label:`Value`,value:T.inventory_value,format:`money`},{label:`Warehouses`,value:T.warehouse_count}]});let E=e.crm_summary;E&&x.push({key:`crm`,title:`CRM`,href:`/crm`,linkText:`View`,items:[{label:`Open leads`,value:E.open_leads},{label:`Open deals`,value:E.open_deals},{label:`Pipeline`,value:E.pipeline_value,format:`money`},{label:`Won`,value:E.won_value,format:`money`}]});let D=e.hrm_summary;if(D){let e=[{label:`Employees`,value:D.active_employees}];D.on_leave_today>0&&e.push({label:`On leave`,value:D.on_leave_today}),D.attendance_today>0&&e.push({label:`Attendance`,value:D.attendance_today}),D.payroll_this_period>0&&e.push({label:`Payroll`,value:D.payroll_this_period,format:`money`}),x.push({key:`hrm`,title:`HRM`,href:`/hrm/users`,linkText:`View`,items:e})}let O=e.project_summary;if(O){let e=[{label:`Active`,value:O.active_projects},{label:`Completed`,value:O.completed_this_period}];O.overdue_tasks>0&&e.push({label:`Overdue tasks`,value:O.overdue_tasks}),O.billing_value>0&&e.push({label:`Billing`,value:O.billing_value,format:`money`}),x.push({key:`projects`,title:`Projects`,href:`/hrm/projects`,linkText:`View`,items:e})}return{kpis:p,chartData:a,cashflowChart:o,expenseBreakdown:m,ageingData:h,bizCards:x,transactions:v,topCustomers:y,topSuppliers:b,bankAccounts:_,approachingProjects:Array.isArray(e.approaching_deadline_projects)?e.approaching_deadline_projects:[],overdueProjects:Array.isArray(e.overdue_projects)?e.overdue_projects:[]}}function be({approaching:e,overdue:t}){let n=e=>[{title:`Project`,dataIndex:`name`,render:(e,t)=>(0,I.jsx)(m,{type:`link`,style:{padding:0,fontWeight:600},onClick:()=>J(t.action_url),children:e||z})},{title:`Manager`,dataIndex:`manager`,ellipsis:!0,render:e=>e||z},{title:`End Date`,dataIndex:`end_date`,width:120,render:K},{title:e===`overdue`?`Overdue`:`Time Left`,width:115,render:(t,n)=>e===`overdue`?`${n.days_overdue||0} day${Number(n.days_overdue)===1?``:`s`}`:`${n.days_left||0} day${Number(n.days_left)===1?``:`s`}`},{title:`Status`,dataIndex:`status`,width:120,render:e=>(0,I.jsx)(b,{children:String(e||z).replace(/_/g,` `)})}],r=(e,t)=>e.length?(0,I.jsx)(s,{size:`small`,rowKey:`id`,pagination:!1,dataSource:e,columns:n(t),scroll:{x:650}}):(0,I.jsx)($,{title:`No projects`,desc:`Project deadlines that need attention will appear here.`,compact:!0});return(0,I.jsxs)(v,{className:`kd-card`,styles:{body:{padding:8}},children:[(0,I.jsxs)(`div`,{className:`kd-card-hdr`,children:[(0,I.jsx)(`span`,{className:`kd-card-hdr__t`,children:`Project Deadlines`}),(0,I.jsx)(L,{type:`secondary`,style:{fontSize:11},children:`Approaching and overdue internal project dates`})]}),(0,I.jsx)(_,{size:`small`,items:[{key:`approaching`,label:`Approaching Deadline (${e.length})`,children:r(e,`approaching`)},{key:`overdue`,label:`Overdue (${t.length})`,children:r(t,`overdue`)}]})]})}function xe(e=[],t=[]){let n=new Map,r=[];return(e||[]).forEach(e=>{n.set(e.bucket,{bucket:e.bucket,receivables:q(e.amount),payables:0}),r.push(e.bucket)}),(t||[]).forEach(e=>{let t=n.get(e.bucket);t?t.payables=q(e.amount):(n.set(e.bucket,{bucket:e.bucket,receivables:0,payables:q(e.amount)}),r.push(e.bucket))}),r.filter((e,t,n)=>n.indexOf(e)===t).map(e=>n.get(e))}function Se(e,t){return e?e.length>t?e.slice(0,t-3)+`...`:e:z}function Ce({token:e}){return(0,I.jsx)(`style`,{children:`
            .kd {
                --kd-bg: ${e.colorBgLayout};
                --kd-card: ${e.colorBgContainer};
                --kd-elevated: ${e.colorBgElevated};
                --kd-soft: ${e.colorFillQuaternary};
                --kd-soft-strong: ${e.colorFillTertiary};
                --kd-border: ${e.colorBorderSecondary};
                --kd-border-strong: ${e.colorBorder};
                --kd-grid: ${e.colorSplit};
                --kd-text: ${e.colorText};
                --kd-muted: ${e.colorTextSecondary};
                --kd-subtle: ${e.colorTextTertiary};
                --kd-disabled: ${e.colorTextDisabled};
                --kd-hover: ${e.controlItemBgHover};
                --kd-active: ${e.controlItemBgActive};
                --kd-primary: ${e.colorPrimary};
                --kd-primary-active: ${e.colorPrimaryActive};
                --kd-primary-bg: ${e.colorPrimaryBg};
                --kd-primary-bg-hover: ${e.colorPrimaryBgHover};
                --kd-success: ${e.colorSuccess};
                --kd-success-bg: ${e.colorSuccessBg};
                --kd-warning: ${e.colorWarning};
                --kd-warning-bg: ${e.colorWarningBg};
                --kd-error: ${e.colorError};
                --kd-error-bg: ${e.colorErrorBg};
                --kd-info: ${e.colorInfo||e.colorPrimary};
                --kd-info-bg: ${e.colorInfoBg||e.colorPrimaryBg};
                --kd-shadow: ${e.boxShadowTertiary||e.boxShadowSecondary};
                --kd-shadow-strong: ${e.boxShadowSecondary||e.boxShadow};
                --kd-radius: ${e.borderRadiusLG}px;
                --kd-radius-sm: ${e.borderRadius}px;
                --kd-radius-xs: ${e.borderRadiusSM}px;
                --kd-gap: ${e.paddingXS}px;
                --kd-pad: ${e.paddingSM}px;
                min-height: calc(100vh - 96px);
                background: var(--kd-bg);
                padding: clamp(${e.paddingXS}px, 1vw, ${e.paddingMD}px);
            }
            .kd-wrap {
                width: min(1480px, 100%);
                margin: 0 auto;
                display: flex;
                flex-direction: column;
                gap: var(--kd-gap);
            }

            .kd-hdr {
                width: 100%;
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: var(--kd-gap);
            }
            .kd-hdr__ctl {
                display: flex;
                align-items: center;
                flex-wrap: wrap;
                gap: var(--kd-gap);
            }
            .kd-hdr__ctl .ant-select,
            .kd-hdr__ctl .ant-picker,
            .kd-hdr__ctl .ant-btn {
                border-radius: var(--kd-radius-sm);
            }
            .kd-hdr__ctl .ant-select-selector,
            .kd-hdr__ctl .ant-picker,
            .kd-hdr__ctl .ant-btn {
                min-height: 30px !important;
            }
            .kd .ant-card-small > .ant-card-body,
            .kd .ant-table-small .ant-table-cell {
                padding-top: ${e.paddingXXS}px !important;
                padding-bottom: ${e.paddingXXS}px !important;
            }

            .kd-card {
                background: var(--kd-card) !important;
                border: 1px solid var(--kd-border) !important;
                border-radius: var(--kd-radius) !important;
                box-shadow: var(--kd-shadow) !important;
                overflow: hidden;
            }
            .kd-card:hover {
                border-color: var(--kd-border-strong) !important;
                box-shadow: var(--kd-shadow-strong) !important;
            }
            .kd-card-hdr {
                display: flex;
                flex-direction: column;
                gap: ${e.marginXXS}px;
                margin-bottom: ${e.marginXS}px;
            }
            .kd-card-hdr__t {
                font-size: ${e.fontSize}px;
                font-weight: 700;
                line-height: 1.2;
                color: var(--kd-text);
            }

            .kd-kpis {
    display: grid;
    grid-template-columns: repeat(6, minmax(140px, 2fr));
    gap: var(--kd-gap);
    overflow-x: auto;
    overflow-y: hidden;
    padding-bottom: 2px;
}
    
            .kd-kpi {
                min-height: 86px;
                position: relative;
            }
            .kd-kpi::before {
                content: '';
                position: absolute;
                inset: 0;
                background: var(--kd-soft);
                opacity: 0.35;
                pointer-events: none;
            }
            .kd-kpi__accent {
                position: absolute;
                inset: 0 auto 0 0;
                width: ${Math.max(e.lineWidthBold||2,3)}px;
                background: var(--kd-accent);
            }
            .kd-kpi__content {
                position: relative;
                z-index: 1;
                display: flex;
                flex-direction: column;
                min-height: 86px;
                padding: ${e.paddingXS}px ${e.paddingSM}px;
            }
            .kd-kpi__top {
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: ${e.marginXXS}px;
            }
            .kd-kpi__label {
                font-size: ${e.fontSizeSM}px;
                font-weight: 600;
                letter-spacing: ${e.sizeXXS/200}px;
                text-transform: uppercase;
            }
            .kd-kpi__trend {
                display: inline-flex;
                align-items: center;
                border: 1px solid var(--kd-border);
                border-radius: ${e.borderRadiusSM}px;
                background: var(--kd-card);
                color: var(--kd-trend);
                font-size: ${e.fontSizeSM}px;
                line-height: 1;
                font-weight: 700;
                padding: 1px ${e.paddingXXS}px;
                white-space: nowrap;
            }
            .kd-kpi__val {
                color: var(--kd-text);
                font-size: clamp(${e.fontSizeLG}px, 1.25vw, ${e.fontSizeHeading5}px);
                font-weight: 800;
                line-height: 1.1;
                margin-top: ${e.marginXS}px;
                overflow-wrap: anywhere;
            }
            .kd-kpi__helper {
                display: block;
                font-size: ${e.fontSizeSM}px;
                margin-top: auto;
                padding-top: ${e.paddingXXS}px;
            }
            .kd-kpi__spark {
                position: absolute;
                right: ${e.paddingXXS}px;
                bottom: ${e.paddingXXS}px;
                width: 58%;
                height: 34px;
                opacity: 0.55;
                pointer-events: none;
            }

            .kd-row-2,
            .kd-row-3 {
                display: grid;
                grid-template-columns: minmax(0, 3fr) minmax(270px, 1.35fr);
                gap: var(--kd-gap);
                align-items: stretch;
            }
            .kd-chart-main,
            .kd-chart-side {
                min-height: 222px;
            }

            .kd-biz-grid {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(205px, 1fr));
                gap: var(--kd-gap);
            }
            .kd-biz {
                position: relative;
            }
            .kd-biz::before {
                content: '';
                position: absolute;
                inset: 0 0 auto 0;
                height: ${Math.max(e.lineWidthBold||2,3)}px;
                background: var(--kd-primary);
                opacity: 0.8;
            }
            .kd-biz__head {
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: ${e.marginXXS}px;
                margin-bottom: ${e.marginXS}px;
            }
            .kd-biz__rows {
                display: flex;
                flex-direction: column;
                gap: ${e.marginXXS}px;
            }
            .kd-biz__row {
                display: flex;
                justify-content: space-between;
                align-items: baseline;
                gap: ${e.marginXXS}px;
                padding: 1px 0;
                border-bottom: 1px solid var(--kd-grid);
            }
            .kd-biz__row:last-child {
                border-bottom: 0;
            }

            .kd-bottom {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
                gap: var(--kd-gap);
            }

            .kd-bank-list {
                display: flex;
                flex-direction: column;
            }
            .kd-bank-row {
                display: flex;
                justify-content: space-between;
                align-items: center;
                gap: ${e.marginXS}px;
                padding: ${e.paddingXXS}px 0;
                border-bottom: 1px solid var(--kd-grid);
            }
            .kd-bank-row:last-child {
                border-bottom: 0;
                padding-bottom: 0;
            }

            .kd-pill {
                display: inline-flex;
                align-items: center;
                padding: 1px ${e.paddingXXS}px;
                border: 1px solid var(--kd-border);
                border-radius: var(--kd-radius-sm);
                color: var(--kd-muted);
                background: var(--kd-soft);
                font-size: ${e.fontSizeSM}px;
                line-height: 1.15;
                text-transform: capitalize;
            }
            .kd-row--click {
                cursor: pointer;
            }
            .kd-row--click:hover td {
                background: var(--kd-hover) !important;
            }
            .kd .ant-table-wrapper .ant-table,
            .kd .ant-table-wrapper .ant-table-container,
            .kd .ant-table-wrapper .ant-table-thead > tr > th {
                background: var(--kd-card) !important;
            }
            .kd .ant-table-wrapper .ant-table-thead > tr > th {
                color: var(--kd-muted) !important;
                font-weight: 700;
            }
            .kd .ant-tabs-nav {
                margin-bottom: ${e.marginXS}px;
            }

            .kd-tip {
                min-width: 160px;
                padding: ${e.paddingXS}px;
                background: var(--kd-elevated);
                border: 1px solid var(--kd-border);
                border-radius: var(--kd-radius);
                box-shadow: var(--kd-shadow-strong);
            }
            .kd-tip__row {
                display: grid;
                grid-template-columns: ${e.sizeXXS}px 1fr auto;
                align-items: center;
                gap: ${e.marginXXS}px;
                margin-top: ${e.marginXXS}px;
                font-size: ${e.fontSizeSM}px;
            }
            .kd-tip__row span:first-child {
                width: ${e.sizeXXS}px;
                height: ${e.sizeXXS}px;
                border-radius: 999px;
            }

            .kd .recharts-default-legend {
                color: var(--kd-muted);
            }
            .kd .recharts-cartesian-axis-tick-value {
                fill: var(--kd-muted);
            }

            @media (max-width: 1280px) {
                .kd-kpis {
                    grid-template-columns: repeat(6, minmax(0, 1fr));
                }
                .kd-row-2,
                .kd-row-3 {
                    grid-template-columns: minmax(0, 1fr);
                }
            }
            @media (max-width: 768px) {
                .kd {
                    padding: ${e.paddingXS}px;
                }
                .kd-hdr {
                    flex-direction: column;
                    align-items: flex-start;
                }
                .kd-hdr__ctl,
                .kd-hdr__ctl .ant-picker {
                    width: 100% !important;
                }
                .kd-hdr__ctl .ant-select {
                    width: 100% !important;
                }
                .kd-kpis {
                    grid-template-columns: repeat(2, minmax(0, 1fr));
                }
                .kd-biz-grid,
                .kd-bottom {
                    grid-template-columns: minmax(0, 1fr);
                }
            }
            @media (max-width: 520px) {
                .kd-kpis {
                    grid-template-columns: minmax(0, fr);
                }
                .kd-card-hdr__t {
                    font-size: ${e.fontSize}px;
                }
            }
        `})}export{X as default};