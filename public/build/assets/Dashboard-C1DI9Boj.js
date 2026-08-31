import{i as e}from"./rolldown-runtime-aKtaBQYM.js";import{t}from"./axios-BQPRRFHk.js";import{i as n,o as r,t as i}from"./index.esm-CtIVDvdE.js";import{r as a,t as o}from"./jsx-runtime-RbF_zoRI.js";import{t as s}from"./table-BKgcrxLi.js";import{t as c}from"./alert-BMEt18v7.js";import{t as l}from"./typography-BlWmaYWr.js";import{t as u}from"./skeleton-DlRG_YHH.js";import{t as d}from"./select-D1gP4WaH.js";import{t as f}from"./empty-41qDbwiS.js";import{t as p}from"./tooltip-DRvKpi-S.js";import{t as m}from"./button-B6mwfiyB.js";import{t as h}from"./dayjs.min-BRtZKQ04.js";import{t as g}from"./date-picker-BFeL-0Wn.js";import{t as _}from"./tabs-D6mM-bRn.js";import{t as v}from"./card-CJAFBOcu.js";import{t as y}from"./ReloadOutlined-CMtviqc6.js";import{t as b}from"./tag-KfHE2k4Q.js";import{l as x,r as ee}from"./app-hemeyIb6.js";import{t as S}from"./AuthenticatedLayout-HtL-j2sY.js";import{M as C,l as w,m as T,tn as E,u as D}from"./CartesianChart-Cbve2Etq.js";import{t as O}from"./Legend-BhWmwVYj.js";import{n as k,p as te,t as A}from"./BarChart-CwHNZuur.js";import{i as ne,t as re}from"./PieChart-D5Ng0E_-.js";import{n as j,t as M}from"./LineChart-BMJx0pTa.js";import{n as ie,t as ae}from"./AreaChart-BmIq6FBE.js";var N=e(a(),1),P=e(h(),1),F=o(),{RangePicker:oe}=g,{Text:I,Title:se}=l,L=`-`,R={primary:`var(--kd-primary)`,primaryActive:`var(--kd-primary-active)`,success:`var(--kd-success)`,warning:`var(--kd-warning)`,error:`var(--kd-error)`,info:`var(--kd-info)`,text:`var(--kd-text)`,muted:`var(--kd-muted)`},z=[R.primary,R.success,R.warning,R.info,R.primaryActive,R.error,R.muted],B=(e,t={})=>{try{return new Intl.NumberFormat(e,t)}catch{return new Intl.NumberFormat(`en-US`,t)}},V=`en-NP`,H=`NPR`,U=B(V,{style:`currency`,currency:H,maximumFractionDigits:0}),W=B(V,{style:`currency`,currency:H,notation:`compact`,maximumFractionDigits:1}),ce=B(V),le=e=>{let t=String(e||``).toUpperCase();!/^[A-Z]{3}$/.test(t)||t===H||(H=t,U=B(V,{style:`currency`,currency:t,maximumFractionDigits:0}),W=B(V,{style:`currency`,currency:t,notation:`compact`,maximumFractionDigits:1}))},G=(e,t)=>e==null||e===``?L:(t?W:U).format(Number(e||0)),K=e=>e==null||e===``?L:ce.format(Number(e||0)),q=e=>e?(0,P.default)(e).format(`DD MMM YYYY`):L,J=e=>Number(e||0),Y=e=>{e&&e!==`#`&&n.visit(e)},ue=e=>e?(0,P.default)(e).format(`YYYY-MM-DD`):void 0,de=(e={})=>{let t=e.current_fiscal_year||e.currentFiscalYear||{};return{date_from:ue(t.start_date)||(0,P.default)().startOf(`month`).format(`YYYY-MM-DD`),date_to:ue(t.end_date)||(0,P.default)().format(`YYYY-MM-DD`)}},X=e=>e==null||e===``?L:W.format(Number(e||0));function Z(e){if(!e||e.length<6)return null;let t=Math.floor(e.length/2),n=e.slice(0,t),r=e.slice(t),i=n.reduce((e,t)=>e+J(t.value),0),a=r.reduce((e,t)=>e+J(t.value),0);return i===0?a>0?100:null:(a-i)/Math.abs(i)*100}function fe(){let e=ee(),{token:n}=x.useToken(),a=r().props.branchContext||{},[o,s]=(0,N.useState)(!0),[l,u]=(0,N.useState)(null),[d,f]=(0,N.useState)({}),[p,h]=(0,N.useState)(()=>({branch_id:a.selectedBranchId||`all`,...de(a)})),g=(0,N.useCallback)(async()=>{s(!0),u(null);try{let e=await t.get(`/dashboard-data`,{params:{branch_id:p.branch_id===`all`?void 0:p.branch_id,date_from:p.date_from,date_to:p.date_to}});f(e.data||{})}catch(t){u(t?.response?.data?.message||e(`Unable to load dashboard data.`))}finally{s(!1)}},[p,e]);(0,N.useEffect)(()=>{g()},[g]);let _=(0,N.useMemo)(()=>De(d),[d]);return(0,F.jsxs)(S,{header:(0,F.jsx)(me,{branches:d.branches||a.branches||[],filters:p,loading:o,onRefresh:g,onChange:h}),children:[(0,F.jsx)(i,{title:e(`Dashboard`)}),(0,F.jsx)(je,{token:n}),(0,F.jsx)(`main`,{className:`kd`,children:(0,F.jsxs)(`div`,{className:`kd-wrap`,children:[l&&(0,F.jsx)(c,{showIcon:!0,type:`error`,message:e(`Dashboard could not be loaded`),description:l,action:(0,F.jsx)(m,{onClick:g,children:e(`Retry`)})}),o?(0,F.jsx)(Ee,{}):(0,F.jsxs)(F.Fragment,{children:[(0,F.jsx)(`section`,{className:`kd-kpis`,children:_.kpis.map(e=>(0,F.jsx)(he,{...e},e.key))}),(0,F.jsxs)(`section`,{className:`kd-focus-grid`,children:[(0,F.jsx)(ge,{data:_.chartData,summary:_.executive}),(0,F.jsx)(pe,{summary:_.cashPosition,items:_.attentionItems})]}),(0,F.jsxs)(`section`,{className:`kd-cash-expense-row`,children:[(0,F.jsx)(_e,{data:_.expenseBreakdown}),(0,F.jsx)(ye,{data:_.cashflowChart})]}),(0,F.jsxs)(`section`,{className:_.bankAccounts.length?`kd-row-2`:`kd-row-1`,children:[(0,F.jsx)(be,{data:_.ageingData}),_.bankAccounts.length>0&&(0,F.jsx)(Te,{accounts:_.bankAccounts})]}),(_.topCustomers.length>0||_.topSuppliers.length>0)&&(0,F.jsxs)(`section`,{className:`kd-row-2`,children:[(0,F.jsx)(we,{title:e(`Top customers`),data:_.topCustomers,color:R.primary}),(0,F.jsx)(we,{title:e(`Top suppliers`),data:_.topSuppliers,color:R.warning})]}),_.bizCards.length>0&&(0,F.jsx)(xe,{cards:_.bizCards}),(_.approachingProjects.length>0||_.overdueProjects.length>0)&&(0,F.jsx)(Oe,{approaching:_.approachingProjects,overdue:_.overdueProjects}),(0,F.jsx)(Ce,{transactions:_.transactions})]})]})})]})}function pe({summary:e,items:t}){let n=t.slice(0,4);return(0,F.jsxs)(v,{className:`kd-card kd-attention`,styles:{body:{padding:0}},children:[(0,F.jsxs)(`div`,{className:`kd-section-head`,children:[(0,F.jsxs)(`div`,{children:[(0,F.jsx)(`span`,{className:`kd-card-hdr__t`,children:`Attention`}),(0,F.jsx)(I,{type:`secondary`,children:`Items worth reviewing`})]}),(0,F.jsx)(`span`,{className:`kd-status ${n.length?`kd-status--warn`:`kd-status--good`}`,children:n.length?`${n.length} open`:`All clear`})]}),(0,F.jsxs)(`div`,{className:`kd-liquidity`,children:[(0,F.jsxs)(`div`,{children:[(0,F.jsx)(I,{type:`secondary`,children:`Net liquidity`}),(0,F.jsx)(`strong`,{children:G(e.netLiquidity)})]}),(0,F.jsxs)(I,{type:`secondary`,children:[`Cash & bank `,X(e.cashBankBalance)]})]}),(0,F.jsx)(`div`,{className:`kd-attention__list`,children:n.length?n.map(e=>(0,F.jsxs)(`button`,{type:`button`,className:`kd-attention__item`,onClick:()=>Y(e.href),children:[(0,F.jsxs)(`span`,{children:[(0,F.jsx)(`b`,{children:e.label}),(0,F.jsx)(`small`,{children:e.module})]}),(0,F.jsx)(`strong`,{children:e.format===`money`?G(e.value,!0):K(e.value)})]},e.key)):(0,F.jsxs)(`div`,{className:`kd-attention__empty`,children:[(0,F.jsx)(`span`,{className:`kd-health-dot kd-health-dot--good`}),(0,F.jsx)(I,{type:`secondary`,children:`No overdue or exceptional items`})]})})]})}function me({branches:e,filters:t,loading:n,onRefresh:r,onChange:i}){let a=[{value:`all`,label:`All branches`},...(e||[]).map(e=>({value:e.value??e.id,label:e.label??e.name??`Branch #${e.id}`}))];return(0,F.jsxs)(`div`,{className:`kd-hdr`,children:[(0,F.jsxs)(`div`,{children:[(0,F.jsx)(se,{level:5,style:{margin:`0 0 1px`,fontWeight:650},children:`Dashboard`}),(0,F.jsx)(I,{type:`secondary`,style:{fontSize:11},children:`Financial overview for the selected fiscal period`})]}),(0,F.jsxs)(`div`,{className:`kd-hdr__ctl`,children:[(0,F.jsx)(d,{value:t.branch_id,options:a,style:{width:150},onChange:e=>i(t=>({...t,branch_id:e||`all`}))}),(0,F.jsx)(oe,{value:t.date_from&&t.date_to?[(0,P.default)(t.date_from),(0,P.default)(t.date_to)]:null,style:{width:230},onChange:e=>i(t=>({...t,date_from:e?.[0]?.format(`YYYY-MM-DD`),date_to:e?.[1]?.format(`YYYY-MM-DD`)}))}),(0,F.jsx)(p,{title:`Refresh`,children:(0,F.jsx)(m,{size:`small`,icon:(0,F.jsx)(y,{spin:n}),onClick:r})})]})]})}function he({label:e,value:t,sparkline:n,color:r,trend:i,invertTrend:a,helper:o}){let s=i>0,c=a?s?R.error:R.success:s?R.success:R.error,l=Array.isArray(n)&&n.some(e=>J(e.value)!==0),u=`kpi-g-${String(e||`metric`).toLowerCase().replace(/[^a-z0-9]+/g,`-`)}`;return(0,F.jsxs)(v,{className:`kd-card kd-kpi`,style:{"--kd-accent":r},styles:{body:{padding:0,height:`100%`,position:`relative`,overflow:`hidden`}},children:[(0,F.jsx)(`div`,{className:`kd-kpi__accent`}),(0,F.jsxs)(`div`,{className:`kd-kpi__content`,children:[(0,F.jsxs)(`div`,{className:`kd-kpi__top`,children:[(0,F.jsx)(I,{type:`secondary`,className:`kd-kpi__label`,children:e}),i!=null&&(0,F.jsxs)(`span`,{className:`kd-kpi__trend`,style:{"--kd-trend":c},children:[s?`+`:`-`,Math.abs(i).toFixed(1),`%`]})]}),(0,F.jsx)(`div`,{className:`kd-kpi__val`,children:G(t)}),o&&(0,F.jsx)(I,{type:`secondary`,className:`kd-kpi__helper`,children:o})]}),l&&(0,F.jsx)(`div`,{className:`kd-kpi__spark`,"aria-hidden":!0,children:(0,F.jsx)(E,{width:`100%`,height:`100%`,children:(0,F.jsxs)(ae,{data:n,children:[(0,F.jsx)(`defs`,{children:(0,F.jsxs)(`linearGradient`,{id:u,x1:`0`,y1:`0`,x2:`0`,y2:`1`,children:[(0,F.jsx)(`stop`,{offset:`0%`,stopColor:r,stopOpacity:.24}),(0,F.jsx)(`stop`,{offset:`100%`,stopColor:r,stopOpacity:.04})]})}),(0,F.jsx)(ie,{type:`monotone`,dataKey:`value`,stroke:r,strokeWidth:1.6,fill:`url(#${u})`,dot:!1,isAnimationActive:!1})]})})})]})}function ge({data:e,summary:t}){let n=e.some(e=>J(e.revenue)||J(e.expenses)||J(e.profit));return(0,F.jsxs)(v,{className:`kd-card kd-chart-main kd-performance`,styles:{body:{padding:0}},children:[(0,F.jsxs)(`div`,{className:`kd-performance__head`,children:[(0,F.jsxs)(`div`,{children:[(0,F.jsx)(`span`,{className:`kd-card-hdr__t`,children:`Financial performance`}),(0,F.jsx)(I,{type:`secondary`,style:{fontSize:11,display:`block`},children:`Revenue, expenses & net profit trend`})]}),(0,F.jsxs)(`div`,{className:`kd-performance__stats`,children:[(0,F.jsxs)(`span`,{children:[`Revenue `,(0,F.jsx)(`b`,{children:X(t.revenue)})]}),(0,F.jsxs)(`span`,{children:[`Expenses `,(0,F.jsx)(`b`,{children:X(t.expenses)})]}),(0,F.jsxs)(`span`,{children:[`Profit `,(0,F.jsx)(`b`,{children:X(t.netProfit)})]})]})]}),n?(0,F.jsx)(`div`,{className:`kd-performance__chart`,children:(0,F.jsx)(E,{width:`100%`,height:`100%`,children:(0,F.jsxs)(M,{data:e,margin:{top:4,right:10,bottom:0,left:0},children:[(0,F.jsx)(T,{stroke:`var(--kd-grid)`,vertical:!1}),(0,F.jsx)(D,{dataKey:`label`,axisLine:!1,tickLine:!1,tick:{fill:`var(--kd-muted)`,fontSize:9}}),(0,F.jsx)(w,{axisLine:!1,tickLine:!1,tick:{fill:`var(--kd-muted)`,fontSize:9},tickFormatter:e=>W.format(e),width:58}),(0,F.jsx)(C,{content:(0,F.jsx)(Q,{})}),(0,F.jsx)(O,{iconType:`circle`,iconSize:7,wrapperStyle:{fontSize:11,paddingTop:4}}),(0,F.jsx)(j,{type:`monotone`,dataKey:`revenue`,name:`Revenue`,stroke:R.primary,strokeWidth:1.8,dot:!1,activeDot:{r:3}}),(0,F.jsx)(j,{type:`monotone`,dataKey:`expenses`,name:`Expenses`,stroke:R.warning,strokeWidth:1.8,dot:!1,activeDot:{r:3}}),(0,F.jsx)(j,{type:`monotone`,dataKey:`profit`,name:`Net Profit`,stroke:R.text,strokeWidth:1.8,dot:!1,activeDot:{r:3}})]})})}):(0,F.jsx)($,{title:`No financial data`,desc:`Revenue and expense activity will appear here.`})]})}function _e({data:e}){let t=e.reduce((e,t)=>e+J(t.value),0);return(0,F.jsxs)(v,{className:`kd-card kd-chart-side`,styles:{body:{padding:8}},children:[(0,F.jsxs)(`div`,{className:`kd-card-hdr`,children:[(0,F.jsx)(`span`,{className:`kd-card-hdr__t`,children:`Expense Breakdown`}),(0,F.jsx)(I,{type:`secondary`,style:{fontSize:11},children:`Where your money goes`})]}),e.length>0&&t>0?(0,F.jsx)(`div`,{style:{height:180,display:`flex`,flexDirection:`column`,alignItems:`center`},children:(0,F.jsx)(E,{width:`100%`,height:`100%`,children:(0,F.jsxs)(re,{children:[(0,F.jsx)(ne,{data:e,dataKey:`value`,nameKey:`name`,cx:`50%`,cy:`45%`,innerRadius:`52%`,outerRadius:`78%`,paddingAngle:2,strokeWidth:0,children:e.map((e,t)=>(0,F.jsx)(te,{fill:z[t%z.length]},t))}),(0,F.jsx)(C,{content:(0,F.jsx)(ve,{total:t})}),(0,F.jsx)(O,{iconType:`circle`,iconSize:7,wrapperStyle:{fontSize:10,lineHeight:`16px`},formatter:e=>(0,F.jsx)(`span`,{style:{color:`var(--kd-text)`,fontSize:10},children:e})})]})})}):(0,F.jsx)($,{title:`No expense data`,desc:`Expense categories will appear here.`,compact:!0})]})}function ve({active:e,payload:t,total:n}){if(!e||!t?.length)return null;let r=t[0],i=n>0?(J(r.value)/n*100).toFixed(1):0;return(0,F.jsxs)(`div`,{className:`kd-tip`,children:[(0,F.jsx)(I,{strong:!0,children:r.name}),(0,F.jsxs)(`div`,{className:`kd-tip__row`,children:[(0,F.jsx)(`span`,{style:{background:r.payload?.fill}}),(0,F.jsx)(I,{type:`secondary`,children:`Amount`}),(0,F.jsx)(I,{children:G(r.value)})]}),(0,F.jsxs)(`div`,{className:`kd-tip__row`,children:[(0,F.jsx)(`span`,{style:{background:`var(--kd-border)`}}),(0,F.jsx)(I,{type:`secondary`,children:`Share`}),(0,F.jsxs)(I,{children:[i,`%`]})]})]})}function ye({data:e}){let t=e.some(e=>J(e.cash_in)||J(e.cash_out));return(0,F.jsxs)(v,{className:`kd-card kd-chart-main`,styles:{body:{padding:8}},children:[(0,F.jsxs)(`div`,{className:`kd-card-hdr`,children:[(0,F.jsx)(`span`,{className:`kd-card-hdr__t`,children:`Cash Flow`}),(0,F.jsx)(I,{type:`secondary`,style:{fontSize:11},children:`Daily cash inflows and outflows`})]}),t?(0,F.jsx)(`div`,{style:{height:170},children:(0,F.jsx)(E,{width:`100%`,height:`100%`,children:(0,F.jsxs)(M,{data:e,margin:{top:4,right:10,bottom:0,left:0},children:[(0,F.jsx)(T,{stroke:`var(--kd-grid)`,vertical:!1}),(0,F.jsx)(D,{dataKey:`label`,axisLine:!1,tickLine:!1,tick:{fill:`var(--kd-muted)`,fontSize:9}}),(0,F.jsx)(w,{axisLine:!1,tickLine:!1,tick:{fill:`var(--kd-muted)`,fontSize:9},tickFormatter:e=>W.format(e),width:58}),(0,F.jsx)(C,{content:(0,F.jsx)(Q,{})}),(0,F.jsx)(O,{iconType:`circle`,iconSize:7,wrapperStyle:{fontSize:11,paddingTop:4}}),(0,F.jsx)(j,{type:`monotone`,dataKey:`cash_in`,name:`Cash In`,stroke:R.info,strokeWidth:1.8,dot:!1,activeDot:{r:3}}),(0,F.jsx)(j,{type:`monotone`,dataKey:`cash_out`,name:`Cash Out`,stroke:R.error,strokeWidth:1.8,dot:!1,activeDot:{r:3}}),(0,F.jsx)(j,{type:`monotone`,dataKey:`net`,name:`Net`,stroke:R.primaryActive,strokeWidth:1.8,strokeDasharray:`6 3`,dot:!1,activeDot:{r:3}})]})})}):(0,F.jsx)($,{title:`No cash flow data`,desc:`Cash inflows and outflows will appear here.`})]})}function be({data:e}){let t=e.some(e=>J(e.receivables)>0||J(e.payables)>0);return(0,F.jsxs)(v,{className:`kd-card kd-chart-side`,styles:{body:{padding:8}},children:[(0,F.jsxs)(`div`,{className:`kd-card-hdr`,children:[(0,F.jsx)(`span`,{className:`kd-card-hdr__t`,children:`Receivables vs Payables Ageing`}),(0,F.jsx)(I,{type:`secondary`,style:{fontSize:11},children:`Outstanding amounts by age`})]}),t?(0,F.jsx)(`div`,{style:{height:170},children:(0,F.jsx)(E,{width:`100%`,height:`100%`,children:(0,F.jsxs)(A,{data:e,margin:{top:4,right:6,bottom:0,left:0},children:[(0,F.jsx)(T,{stroke:`var(--kd-grid)`,vertical:!1}),(0,F.jsx)(D,{dataKey:`bucket`,axisLine:!1,tickLine:!1,tick:{fill:`var(--kd-muted)`,fontSize:9}}),(0,F.jsx)(w,{axisLine:!1,tickLine:!1,tick:{fill:`var(--kd-muted)`,fontSize:9},tickFormatter:e=>W.format(e),width:52}),(0,F.jsx)(C,{content:(0,F.jsx)(Q,{})}),(0,F.jsx)(O,{iconType:`circle`,iconSize:7,wrapperStyle:{fontSize:10,paddingTop:4}}),(0,F.jsx)(k,{dataKey:`receivables`,name:`Receivables`,fill:R.info,radius:[4,4,0,0],maxBarSize:22}),(0,F.jsx)(k,{dataKey:`payables`,name:`Payables`,fill:R.warning,radius:[4,4,0,0],maxBarSize:22})]})})}):(0,F.jsx)($,{title:`No ageing data`,desc:`Receivable and payable ageing will appear here.`,compact:!0})]})}function Q({active:e,payload:t,label:n}){return!e||!t?.length?null:(0,F.jsxs)(`div`,{className:`kd-tip`,children:[(0,F.jsx)(I,{strong:!0,style:{fontSize:11},children:n}),t.map(e=>(0,F.jsxs)(`div`,{className:`kd-tip__row`,children:[(0,F.jsx)(`span`,{style:{background:e.color||e.fill}}),(0,F.jsx)(I,{type:`secondary`,children:e.name}),(0,F.jsx)(I,{children:G(e.value)})]},e.dataKey))]})}function xe({cards:e}){return(0,F.jsxs)(v,{className:`kd-card kd-modules`,styles:{body:{padding:0}},children:[(0,F.jsx)(`div`,{className:`kd-section-head`,children:(0,F.jsxs)(`div`,{children:[(0,F.jsx)(`span`,{className:`kd-card-hdr__t`,children:`Modules`}),(0,F.jsx)(I,{type:`secondary`,children:`Key operating numbers at a glance`})]})}),(0,F.jsx)(`div`,{className:`kd-modules__grid`,children:e.map(e=>{let t=e.items[0];return(0,F.jsxs)(`article`,{className:`kd-module`,children:[(0,F.jsxs)(`div`,{className:`kd-module__head`,children:[(0,F.jsx)(I,{strong:!0,children:e.title}),e.href&&(0,F.jsx)(m,{type:`link`,size:`small`,onClick:()=>Y(e.href),children:`View`})]}),(0,F.jsxs)(`div`,{className:`kd-module__primary`,children:[(0,F.jsx)(I,{type:`secondary`,children:t?.label}),(0,F.jsx)(`strong`,{children:Se(t)})]}),(0,F.jsx)(`div`,{className:`kd-module__facts`,children:e.items.slice(1,4).map(e=>(0,F.jsxs)(`span`,{children:[(0,F.jsx)(`small`,{children:e.label}),(0,F.jsx)(`b`,{children:Se(e)})]},e.label))})]},e.key)})})]})}function Se(e){return e?e.format===`money`?G(e.value,!0):e.format===`text`?e.value||L:K(e.value):L}function Ce({transactions:e}){let t=[{title:`Date`,dataIndex:`date`,render:q,width:110},{title:`Type`,dataIndex:`type`,width:140},{title:`Number`,dataIndex:`number`,render:(e,t)=>t.action_url?(0,F.jsx)(m,{type:`link`,style:{padding:0,fontWeight:600},onClick:e=>{e.stopPropagation(),Y(t.action_url)},children:e||L}):e||L},{title:`Party`,dataIndex:`party`,ellipsis:!0,render:e=>e||L},{title:`Amount`,dataIndex:`amount`,align:`right`,render:e=>G(e)},{title:`Status`,dataIndex:`status`,width:100,render:e=>(0,F.jsx)(`span`,{className:`kd-pill`,children:e||`posted`})}];return(0,F.jsxs)(v,{className:`kd-card`,styles:{body:{padding:e.length?0:8}},children:[(0,F.jsxs)(`div`,{className:`kd-card-hdr`,style:{padding:e.length?`8px`:0,borderBottom:e.length?`1px solid var(--kd-grid)`:`none`},children:[(0,F.jsx)(`span`,{className:`kd-card-hdr__t`,children:`Recent Transactions`}),(0,F.jsx)(I,{type:`secondary`,style:{fontSize:11},children:`Latest financial documents`})]}),e.length>0?(0,F.jsx)(s,{rowKey:`key`,columns:t,dataSource:e,pagination:!1,size:`small`,scroll:{x:700},onRow:e=>({onClick:()=>Y(e.action_url),className:e.action_url?`kd-row--click`:``})}):(0,F.jsx)($,{title:`No recent transactions`,desc:`Posted documents will appear here.`,compact:!0})]})}function we({title:e,data:t,color:n}){let r=t.slice(0,5).map(e=>({...e,name:Ae(e.name,18)}));return(0,F.jsxs)(v,{className:`kd-card`,styles:{body:{padding:8}},children:[(0,F.jsx)(`div`,{className:`kd-card-hdr`,style:{marginBottom:10},children:(0,F.jsx)(`span`,{className:`kd-card-hdr__t`,children:e})}),(0,F.jsx)(`div`,{style:{height:120},children:(0,F.jsx)(E,{width:`100%`,height:`100%`,children:(0,F.jsxs)(A,{data:r,layout:`vertical`,margin:{top:0,right:16,bottom:0,left:4},children:[(0,F.jsx)(D,{type:`number`,axisLine:!1,tickLine:!1,tick:{fill:`var(--kd-muted)`,fontSize:9},tickFormatter:e=>W.format(e)}),(0,F.jsx)(w,{type:`category`,dataKey:`name`,axisLine:!1,tickLine:!1,width:96,tick:{fill:`var(--kd-text)`,fontSize:10}}),(0,F.jsx)(C,{content:(0,F.jsx)(Q,{})}),(0,F.jsx)(k,{dataKey:`amount`,name:`Amount`,fill:n,radius:[0,4,4,0],maxBarSize:16})]})})})]})}function Te({accounts:e}){return(0,F.jsxs)(v,{className:`kd-card`,styles:{body:{padding:8}},children:[(0,F.jsx)(`div`,{className:`kd-card-hdr`,style:{marginBottom:10},children:(0,F.jsx)(`span`,{className:`kd-card-hdr__t`,children:`Bank Accounts`})}),(0,F.jsx)(`div`,{className:`kd-bank-list`,children:e.map(e=>(0,F.jsxs)(`div`,{className:`kd-bank-row`,children:[(0,F.jsxs)(`div`,{style:{minWidth:0},children:[(0,F.jsx)(I,{style:{fontWeight:600,fontSize:13},ellipsis:!0,children:e.bank_name||L}),(0,F.jsx)(I,{type:`secondary`,style:{fontSize:11,display:`block`},ellipsis:!0,children:[e.account_name,e.account_number].filter(Boolean).join(` / `)||L})]}),(0,F.jsxs)(`div`,{style:{textAlign:`right`,whiteSpace:`nowrap`},children:[(0,F.jsx)(I,{style:{fontWeight:650,fontSize:13},children:G(e.balance)}),e.currency&&(0,F.jsx)(I,{type:`secondary`,style:{display:`block`,fontSize:11},children:e.currency})]})]},e.key))})]})}function $({title:e,desc:t,compact:n}){return(0,F.jsx)(`div`,{style:{minHeight:n?105:170,display:`flex`,alignItems:`center`,justifyContent:`center`,textAlign:`center`,padding:10},children:(0,F.jsxs)(f,{image:f.PRESENTED_IMAGE_SIMPLE,description:!1,children:[(0,F.jsx)(se,{level:5,style:{margin:`0 0 4px`},children:e}),(0,F.jsx)(I,{type:`secondary`,style:{fontSize:11},children:t})]})})}function Ee(){return(0,F.jsxs)(`div`,{style:{display:`flex`,flexDirection:`column`,gap:`var(--kd-gap)`},children:[(0,F.jsx)(`div`,{className:`kd-kpis`,children:[1,2,3,4,5,6].map(e=>(0,F.jsx)(v,{className:`kd-card`,styles:{body:{padding:14}},children:(0,F.jsx)(u,{active:!0,paragraph:{rows:1}})},e))}),(0,F.jsxs)(`div`,{className:`kd-focus-grid`,children:[(0,F.jsx)(v,{className:`kd-card`,children:(0,F.jsx)(u,{active:!0,paragraph:{rows:7}})}),(0,F.jsx)(v,{className:`kd-card`,children:(0,F.jsx)(u,{active:!0,paragraph:{rows:7}})})]}),(0,F.jsxs)(`div`,{className:`kd-cash-expense-row`,children:[(0,F.jsx)(v,{className:`kd-card`,children:(0,F.jsx)(u,{active:!0,paragraph:{rows:5}})}),(0,F.jsx)(v,{className:`kd-card`,children:(0,F.jsx)(u,{active:!0,paragraph:{rows:5}})})]}),(0,F.jsxs)(`div`,{className:`kd-row-2`,children:[(0,F.jsx)(v,{className:`kd-card`,children:(0,F.jsx)(u,{active:!0,paragraph:{rows:4}})}),(0,F.jsx)(v,{className:`kd-card`,children:(0,F.jsx)(u,{active:!0,paragraph:{rows:4}})})]}),(0,F.jsx)(v,{className:`kd-card`,children:(0,F.jsx)(u,{active:!0,paragraph:{rows:4}})})]})}function De(e){let t=e.financial_summary||{};le(t.currency||e.currency);let n=e.metric_sparklines||{},r=e.revenue_expense_profit_chart||[],i=e.cashflow_chart||[],a=r.map(e=>({date:e.date,label:e.date?(0,P.default)(e.date).format(`DD MMM`):``,revenue:J(e.revenue),expenses:J(e.expenses),profit:J(e.profit)})),o=i.map(e=>({date:e.date,label:e.date?(0,P.default)(e.date).format(`DD MMM`):``,cash_in:J(e.cash_in),cash_out:J(e.cash_out),net:J(e.net)})),s=r.map(e=>({date:e.date,value:J(e.revenue)})),c=r.map(e=>({date:e.date,value:J(e.expenses)})),l=(n.net_profit||[]).map(e=>({date:e.date,value:J(e.value)})),u=(n.cash_bank||[]).map(e=>({date:e.date,value:J(e.value)})),d=(n.receivables||[]).map(e=>({date:e.date,value:J(e.value)})),f=(n.payables||[]).map(e=>({date:e.date,value:J(e.value)})),p={revenue:J(t.revenue),expenses:J(t.expenses),netProfit:J(t.net_profit),receivables:J(t.receivables),payables:J(t.payables),cash:J(t.cash_bank_balance),currency:t.currency||e.currency||`NPR`,margin:J(t.revenue)>0?J(t.net_profit)/J(t.revenue)*100:0,message:J(t.net_profit)>=0?`Revenue is covering costs for this period. Keep an eye on receivables so profit turns into cash.`:`Expenses are ahead of revenue for this period. The fastest wins are collecting receivables and reviewing major costs.`},m=[{key:`revenue`,label:`Revenue`,value:t.revenue,sparkline:s,color:R.primary,trend:Z(s),helper:`This period`},{key:`expenses`,label:`Expenses`,value:t.expenses,sparkline:c,color:R.warning,trend:Z(c),invertTrend:!0,helper:`This period`},{key:`profit`,label:`Net Profit`,value:t.net_profit,sparkline:l,color:R.success,trend:Z(l),helper:J(t.revenue)>0?`${(J(t.net_profit)/J(t.revenue)*100).toFixed(1)}% margin`:`This period`},{key:`cash`,label:`Cash & Bank`,value:t.cash_bank_balance,sparkline:u,color:R.info,trend:Z(u),helper:`Available`},{key:`receivables`,label:`Receivables`,value:t.receivables,sparkline:d,color:R.info,helper:`Outstanding`},{key:`payables`,label:`Payables`,value:t.payables,sparkline:f,color:R.error,helper:`Outstanding`}],h=e.expense_breakdown||[],g=ke(e.receivable_ageing,e.payable_ageing),_=e.cash_position||{},v={cashBankBalance:J(t.cash_bank_balance??_.cash_bank_balance),receivables:J(t.receivables),payables:J(t.payables),netLiquidity:J(t.cash_bank_balance??_.cash_bank_balance)+J(t.receivables)-J(t.payables)},y=Array.isArray(_.bank_accounts)?_.bank_accounts:[],b=Array.isArray(e.recent_transactions)?e.recent_transactions:[],x=Array.isArray(e.top_customers)?e.top_customers:[],ee=Array.isArray(e.top_suppliers)?e.top_suppliers:[],S=[],C=e.sales_summary;C&&S.push({key:`sales`,title:`Sales`,href:`/payment-in/invoices`,linkText:`View invoices`,items:[{label:`Total sales`,value:C.sales_total,format:`money`},{label:`Overdue`,value:C.overdue_amount,format:`money`},{label:`Unpaid`,value:C.unpaid_amount,format:`money`},{label:`Invoices`,value:C.invoice_count},{label:`Paid`,value:C.paid_amount,format:`money`}]});let w=e.purchase_summary;w&&S.push({key:`purchase`,title:`Purchases`,href:`/payment-out/purchase-bills`,linkText:`View bills`,items:[{label:`Total purchases`,value:w.purchase_total,format:`money`},{label:`Total payables`,value:w.total_payables??w.unpaid_amount,format:`money`},{label:`Upcoming`,value:w.upcoming_payables,format:`money`},{label:`Bills`,value:w.bill_count},{label:`Paid`,value:w.paid_amount,format:`money`},{label:`Expense payables`,value:w.expense_payables,format:`money`}]});let T=e.cashflow_summary;if(T){let e=[{label:`Cash in`,value:T.cash_in,format:`money`},{label:`Cash out`,value:T.cash_out,format:`money`},{label:`Net cash flow`,value:T.net_cash_flow,format:`money`}];S.push({key:`cashflow`,title:`Cash Flow`,items:e})}let E=e.inventory_summary;E&&S.push({key:`inventory`,title:`Inventory`,href:`/inventory/products`,linkText:`View`,items:[{label:`Products`,value:E.total_products},{label:`Low stock`,value:E.low_stock_items},{label:`Value`,value:E.inventory_value,format:`money`},{label:`Warehouses`,value:E.warehouse_count}]});let D=e.crm_summary;D&&S.push({key:`crm`,title:`CRM`,href:`/crm`,linkText:`View`,items:[{label:`Open leads`,value:D.open_leads},{label:`Open deals`,value:D.open_deals},{label:`Pipeline`,value:D.pipeline_value,format:`money`},{label:`Won`,value:D.won_value,format:`money`}]});let O=e.hrm_summary;if(O){let e=[{label:`Employees`,value:O.active_employees}];O.on_leave_today>0&&e.push({label:`On leave`,value:O.on_leave_today}),O.attendance_today>0&&e.push({label:`Attendance`,value:O.attendance_today}),O.payroll_this_period>0&&e.push({label:`Payroll`,value:O.payroll_this_period,format:`money`}),S.push({key:`hrm`,title:`HRM`,href:`/hrm/users`,linkText:`View`,items:e})}let k=e.project_summary;if(k){let e=[{label:`Active`,value:k.active_projects},{label:`Completed`,value:k.completed_this_period}];k.overdue_tasks>0&&e.push({label:`Overdue tasks`,value:k.overdue_tasks}),k.billing_value>0&&e.push({label:`Billing`,value:k.billing_value,format:`money`}),S.push({key:`projects`,title:`Projects`,href:`/hrm/projects`,linkText:`View`,items:e})}return{executive:p,cashPosition:v,attentionItems:[C&&J(C.overdue_amount)>0?{key:`overdue-sales`,module:`Sales`,label:`Overdue invoices`,value:C.overdue_amount,format:`money`,href:`/payment-in/invoices`}:null,w&&J(w.upcoming_payables)>0?{key:`upcoming-payables`,module:`Purchases`,label:`Upcoming payables`,value:w.upcoming_payables,format:`money`,href:`/payment-out/purchase-bills`}:null,E&&J(E.low_stock_items)>0?{key:`low-stock`,module:`Inventory`,label:`Low stock items`,value:E.low_stock_items,href:`/inventory/products`}:null,k&&J(k.overdue_tasks)>0?{key:`overdue-tasks`,module:`Projects`,label:`Overdue tasks`,value:k.overdue_tasks,href:`/hrm/projects`}:null].filter(Boolean),kpis:m,chartData:a,cashflowChart:o,expenseBreakdown:h,ageingData:g,bizCards:S,transactions:b,topCustomers:x,topSuppliers:ee,bankAccounts:y,approachingProjects:Array.isArray(e.approaching_deadline_projects)?e.approaching_deadline_projects:[],overdueProjects:Array.isArray(e.overdue_projects)?e.overdue_projects:[]}}function Oe({approaching:e,overdue:t}){let n=e=>[{title:`Project`,dataIndex:`name`,render:(e,t)=>(0,F.jsx)(m,{type:`link`,style:{padding:0,fontWeight:600},onClick:()=>Y(t.action_url),children:e||L})},{title:`Manager`,dataIndex:`manager`,ellipsis:!0,render:e=>e||L},{title:`End Date`,dataIndex:`end_date`,width:120,render:q},{title:e===`overdue`?`Overdue`:`Time Left`,width:115,render:(t,n)=>e===`overdue`?`${n.days_overdue||0} day${Number(n.days_overdue)===1?``:`s`}`:`${n.days_left||0} day${Number(n.days_left)===1?``:`s`}`},{title:`Status`,dataIndex:`status`,width:120,render:e=>(0,F.jsx)(b,{children:String(e||L).replace(/_/g,` `)})}],r=(e,t)=>e.length?(0,F.jsx)(s,{size:`small`,rowKey:`id`,pagination:!1,dataSource:e,columns:n(t),scroll:{x:650}}):(0,F.jsx)($,{title:`No projects`,desc:`Project deadlines that need attention will appear here.`,compact:!0});return(0,F.jsxs)(v,{className:`kd-card`,styles:{body:{padding:8}},children:[(0,F.jsxs)(`div`,{className:`kd-card-hdr`,children:[(0,F.jsx)(`span`,{className:`kd-card-hdr__t`,children:`Project Deadlines`}),(0,F.jsx)(I,{type:`secondary`,style:{fontSize:11},children:`Approaching and overdue internal project dates`})]}),(0,F.jsx)(_,{size:`small`,items:[{key:`approaching`,label:`Approaching Deadline (${e.length})`,children:r(e,`approaching`)},{key:`overdue`,label:`Overdue (${t.length})`,children:r(t,`overdue`)}]})]})}function ke(e=[],t=[]){let n=new Map,r=[];return(e||[]).forEach(e=>{n.set(e.bucket,{bucket:e.bucket,receivables:J(e.amount),payables:0}),r.push(e.bucket)}),(t||[]).forEach(e=>{let t=n.get(e.bucket);t?t.payables=J(e.amount):(n.set(e.bucket,{bucket:e.bucket,receivables:0,payables:J(e.amount)}),r.push(e.bucket))}),r.filter((e,t,n)=>n.indexOf(e)===t).map(e=>n.get(e))}function Ae(e,t){return e?e.length>t?e.slice(0,t-3)+`...`:e:L}function je({token:e}){return(0,F.jsx)(`style`,{children:`
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
                --kd-gap: clamp(9px, .8vw, 12px);
                --kd-pad: clamp(10px, 1vw, 14px);
                min-height: calc(100vh - 96px);
                background: var(--kd-bg);
                padding: clamp(10px, 1.2vw, 16px);
            }
            .kd-wrap {
                width: min(1440px, 100%);
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
                border-radius: 10px !important;
                box-shadow: none !important;
                overflow: hidden;
                transition: border-color 140ms ease;
            }
            .kd-card:hover {
                border-color: var(--kd-border-strong) !important;
                box-shadow: none !important;
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

            .kd-hero {
                position: relative;
                overflow: hidden;
                display: grid;
                grid-template-columns: minmax(0, 1fr) minmax(280px, 420px);
                gap: clamp(16px, 2vw, 28px);
                align-items: stretch;
                padding: clamp(18px, 2.2vw, 28px);
                border-radius: 18px;
                border: 1px solid var(--kd-border);
                border-left: 4px solid var(--kd-primary);
                background: var(--kd-card);
                box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
            }
            .kd-hero--negative {
                border-left-color: var(--kd-warning);
            }
            .kd-hero__main,
            .kd-hero__score {
                position: relative;
                z-index: 1;
            }
            .kd-eyebrow {
                display: inline-flex;
                align-items: center;
                gap: 8px;
                width: fit-content;
                color: var(--kd-muted);
                font-size: 11px;
                font-weight: 800;
                letter-spacing: .08em;
                text-transform: uppercase;
            }
            .kd-eyebrow__dot {
                width: 7px;
                height: 7px;
                border-radius: 999px;
                background: var(--kd-success);
            }
            .kd-hero__title {
                color: var(--kd-text) !important;
                margin: 12px 0 8px !important;
                font-size: clamp(25px, 2.5vw, 38px) !important;
                line-height: 1.08 !important;
                letter-spacing: -0.035em;
                max-width: 700px;
            }
            .kd-hero__copy {
                display: block;
                max-width: 680px;
                color: var(--kd-muted) !important;
                font-size: 14px;
                line-height: 1.6;
            }
            .kd-hero__meta {
                display: flex;
                flex-wrap: wrap;
                gap: 8px;
                margin-top: 18px;
            }
            .kd-hero__meta span {
                display: inline-flex;
                align-items: center;
                min-height: 28px;
                padding: 5px 10px;
                border-radius: 999px;
                background: var(--kd-soft);
                color: var(--kd-muted);
                font-size: 12px;
                font-weight: 650;
            }
            .kd-hero__score {
                display: flex;
                flex-direction: column;
                justify-content: center;
                padding: clamp(16px, 2vw, 24px);
                border-radius: 16px;
                background: var(--kd-soft);
                border: 1px solid var(--kd-grid);
            }
            .kd-hero__status {
                width: fit-content;
                padding: 4px 8px;
                border-radius: 999px;
                font-size: 12px;
                font-weight: 800;
                line-height: 1;
            }
            .kd-hero__status--positive {
                color: var(--kd-success);
                background: var(--kd-success-bg);
            }
            .kd-hero__status--negative {
                color: var(--kd-warning);
                background: var(--kd-warning-bg);
            }
            .kd-hero__amount {
                margin-top: 12px;
                color: var(--kd-text);
                font-size: clamp(30px, 3.1vw, 48px);
                line-height: 1;
                font-weight: 900;
                letter-spacing: -0.05em;
                overflow-wrap: anywhere;
            }
            .kd-hero__sub {
                display: flex;
                flex-wrap: wrap;
                gap: 8px;
                margin-top: 16px;
            }
            .kd-hero__sub span {
                color: var(--kd-muted);
                font-size: 12px;
                font-weight: 700;
            }

            .kd-signal-grid {
                display: grid;
                grid-template-columns: repeat(4, minmax(0, 1fr));
                gap: var(--kd-gap);
            }
            .kd-signal {
                min-height: 132px;
                position: relative;
            }
            .kd-signal::before {
                content: '';
                position: absolute;
                inset: 0 auto 0 0;
                width: 3px;
                background: var(--kd-accent);
                pointer-events: none;
            }
            .kd-signal__body {
                position: relative;
                z-index: 1;
                min-height: 132px;
                padding: 16px;
                display: flex;
                flex-direction: column;
            }
            .kd-signal__top {
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 8px;
            }
            .kd-signal__icon {
                width: 26px;
                height: 3px;
                border-radius: 999px;
                background: var(--kd-accent);
            }
            .kd-signal__trend {
                display: inline-flex;
                align-items: center;
                padding: 3px 7px;
                border-radius: 999px;
                color: var(--kd-trend);
                background: transparent;
                border: 1px solid var(--kd-border);
                font-size: 11px;
                font-weight: 800;
            }
            .kd-signal__label {
                margin-top: 12px;
                font-size: 11px;
                font-weight: 800;
                letter-spacing: .07em;
                text-transform: uppercase;
            }
            .kd-signal__value {
                margin-top: 6px;
                color: var(--kd-text);
                font-size: clamp(21px, 1.7vw, 28px);
                line-height: 1.05;
                font-weight: 900;
                letter-spacing: -0.04em;
                overflow-wrap: anywhere;
            }
            .kd-signal__helper {
                display: block;
                margin-top: auto;
                padding-top: 12px;
                font-size: 12px;
            }
            .kd-signal__spark {
                position: absolute;
                right: 0;
                bottom: 0;
                width: 58%;
                height: 42px;
                opacity: .28;
                pointer-events: none;
            }

            .kd-kpis {
    display: grid;
    grid-template-columns: repeat(6, minmax(0, 1fr));
    gap: var(--kd-gap);
    padding-bottom: 2px;
}
    
            .kd-kpi {
                min-height: 116px;
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
                min-height: 116px;
                padding: ${e.paddingXS}px ${e.paddingSM}px ${e.paddingLG}px;
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
                inset: auto 0 0 0;
                width: 100%;
                height: 40px;
                opacity: 0.85;
                pointer-events: none;
            }

            .kd-row-2,
            .kd-row-3,
            .kd-cash-expense-row {
                display: grid;
                gap: var(--kd-gap);
                align-items: stretch;
            }
            .kd-main-grid {
                display: grid;
                grid-template-columns: minmax(0, 1.45fr) minmax(320px, .75fr);
                gap: var(--kd-gap);
                align-items: stretch;
            }
            .kd-side-stack {
                display: grid;
                grid-template-rows: auto 1fr;
                gap: var(--kd-gap);
                min-width: 0;
            }
            .kd-insight-grid {
                display: grid;
                grid-template-columns: minmax(280px, .7fr) minmax(0, 1fr);
                gap: var(--kd-gap);
                align-items: stretch;
            }
            .kd-row-1 {
                display: grid;
                gap: var(--kd-gap);
                grid-template-columns: minmax(0, 1fr);
            }
            .kd-row-2 {
                grid-template-columns: repeat(2, minmax(0, 1fr));
            }
            .kd-row-3 {
                grid-template-columns: repeat(3, minmax(0, 1fr));
            }
            .kd-cash-expense-row {
                grid-template-columns: minmax(250px, 30%) minmax(0, 70%);
            }
            .kd-chart-main,
            .kd-chart-side {
                min-height: 222px;
            }
            .kd-performance__head {
                display: flex;
                align-items: flex-start;
                justify-content: space-between;
                gap: 12px;
                padding: 16px 16px 8px;
            }
            .kd-performance__stats {
                display: flex;
                flex-wrap: wrap;
                justify-content: flex-end;
                gap: 8px;
            }
            .kd-performance__stats span {
                display: inline-flex;
                align-items: center;
                gap: 6px;
                padding: 5px 8px;
                border-radius: 999px;
                color: var(--kd-muted);
                border: 1px solid var(--kd-border);
                font-size: 11px;
                white-space: nowrap;
            }
            .kd-performance__stats b {
                color: var(--kd-text);
            }
            .kd-performance__chart {
                height: 300px;
                padding: 4px 12px 16px 6px;
            }
            .kd-cash-card__head {
                display: flex;
                justify-content: space-between;
                gap: 10px;
                padding: 16px 16px 6px;
            }
            .kd-health-dot {
                width: 10px;
                height: 10px;
                border-radius: 999px;
                margin-top: 3px;
                background: var(--kd-health);
            }
            .kd-health-dot--good { --kd-health: var(--kd-success); }
            .kd-health-dot--bad { --kd-health: var(--kd-error); }
            .kd-cash-card__total {
                padding: 4px 16px 14px;
                color: var(--kd-text);
                font-size: clamp(24px, 2.4vw, 36px);
                line-height: 1.05;
                font-weight: 900;
                letter-spacing: -0.05em;
                overflow-wrap: anywhere;
            }
            .kd-cash-card__rows {
                display: grid;
                gap: 1px;
                background: var(--kd-grid);
                border-top: 1px solid var(--kd-grid);
            }
            .kd-cash-card__row {
                display: grid;
                grid-template-columns: 10px 1fr auto;
                align-items: center;
                gap: 9px;
                padding: 9px 16px;
                background: var(--kd-card);
                font-size: 12px;
            }
            .kd-mini-dot {
                width: 8px;
                height: 8px;
                border-radius: 999px;
                background: var(--kd-dot);
            }
            .kd-mini-dot--good { --kd-dot: var(--kd-success); }
            .kd-mini-dot--info { --kd-dot: var(--kd-info); }
            .kd-mini-dot--warn { --kd-dot: var(--kd-warning); }
            .kd-mini-dot--bad { --kd-dot: var(--kd-error); }

            .kd-biz-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(235px, 1fr));
                gap: var(--kd-gap);
            }
            .kd-biz-grid--premium {
                align-items: stretch;
            }
            .kd-biz {
                position: relative;
            }
            .kd-biz::before {
                content: '';
                position: absolute;
                inset: 0 auto 0 0;
                width: 3px;
                background: var(--kd-primary);
                opacity: 0.8;
            }
            .kd-biz__head {
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: ${e.marginXXS}px;
                margin-bottom: 10px;
            }
            .kd-biz__rows {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 8px;
            }
            .kd-biz__row {
                display: flex;
                flex-direction: column;
                gap: 3px;
                min-width: 0;
                padding: 8px 9px;
                border: 1px solid var(--kd-grid);
                border-radius: 10px;
                background: var(--kd-card);
            }
            .kd-biz__row:first-child {
                grid-column: 1 / -1;
                background: var(--kd-soft);
                border-color: var(--kd-border);
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

            .kd-signal {
                min-height: 104px;
                border-top: 2px solid var(--kd-accent) !important;
            }
            .kd-signal::before,
            .kd-signal__icon,
            .kd-signal__spark {
                display: none;
            }
            .kd-signal__body {
                min-height: 102px;
                padding: 12px 14px;
            }
            .kd-signal__label {
                margin: 0;
                font-size: 11px;
                font-weight: 600;
                letter-spacing: 0;
                text-transform: none;
            }
            .kd-signal__value {
                margin-top: 7px;
                font-size: clamp(20px, 1.5vw, 25px);
                font-weight: 750;
                letter-spacing: -0.025em;
            }
            .kd-signal__helper {
                padding-top: 6px;
                font-size: 10px;
            }
            .kd-signal__trend {
                padding: 0;
                border: 0;
                border-radius: 0;
                font-size: 10px;
                font-weight: 700;
            }

            .kd-focus-grid {
                display: grid;
                grid-template-columns: minmax(0, 1.75fr) minmax(285px, .75fr);
                gap: var(--kd-gap);
                align-items: stretch;
            }
            .kd-section-head {
                min-height: 52px;
                display: flex;
                align-items: flex-start;
                justify-content: space-between;
                gap: 12px;
                padding: 12px 14px;
                border-bottom: 1px solid var(--kd-grid);
            }
            .kd-section-head > div {
                display: grid;
                gap: 2px;
            }
            .kd-section-head .ant-typography {
                font-size: 10px;
            }
            .kd-performance__head {
                min-height: 52px;
                align-items: center;
                padding: 11px 14px;
                border-bottom: 1px solid var(--kd-grid);
            }
            .kd-performance__stats {
                gap: 10px;
            }
            .kd-performance__stats span {
                padding: 0;
                border: 0;
                border-radius: 0;
                font-size: 10px;
            }
            .kd-performance__chart {
                height: 238px;
                padding: 10px 12px 12px 4px;
            }

            .kd-status {
                display: inline-flex;
                align-items: center;
                min-height: 22px;
                padding: 2px 7px;
                border-radius: 999px;
                font-size: 10px;
                font-weight: 650;
                white-space: nowrap;
            }
            .kd-status--warn {
                color: var(--kd-warning);
                background: var(--kd-warning-bg);
            }
            .kd-status--good {
                color: var(--kd-success);
                background: var(--kd-success-bg);
            }
            .kd-liquidity {
                display: flex;
                align-items: flex-end;
                justify-content: space-between;
                gap: 10px;
                padding: 12px 14px;
                border-bottom: 1px solid var(--kd-grid);
            }
            .kd-liquidity > div {
                display: grid;
                gap: 3px;
            }
            .kd-liquidity .ant-typography {
                font-size: 10px;
            }
            .kd-liquidity strong {
                color: var(--kd-text);
                font-size: 20px;
                line-height: 1.1;
                letter-spacing: -.025em;
            }
            .kd-attention__list {
                display: grid;
            }
            .kd-attention__item {
                appearance: none;
                width: 100%;
                min-height: 49px;
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 12px;
                padding: 8px 14px;
                border: 0;
                border-bottom: 1px solid var(--kd-grid);
                background: transparent;
                color: var(--kd-text);
                text-align: left;
                cursor: pointer;
            }
            .kd-attention__item:last-child {
                border-bottom: 0;
            }
            .kd-attention__item:hover {
                background: var(--kd-hover);
            }
            .kd-attention__item > span {
                min-width: 0;
                display: grid;
                gap: 1px;
            }
            .kd-attention__item b,
            .kd-attention__item strong {
                font-size: 11px;
                font-weight: 650;
            }
            .kd-attention__item small {
                color: var(--kd-muted);
                font-size: 10px;
            }
            .kd-attention__item strong {
                white-space: nowrap;
            }
            .kd-attention__empty {
                min-height: 86px;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 8px;
                padding: 14px;
            }

            .kd-modules__grid {
                display: grid;
                grid-template-columns: repeat(3, minmax(0, 1fr));
            }
            .kd-module {
                min-width: 0;
                padding: 11px 14px 12px;
                border-right: 1px solid var(--kd-grid);
                border-bottom: 1px solid var(--kd-grid);
            }
            .kd-module:nth-child(3n) {
                border-right: 0;
            }
            .kd-module:nth-last-child(-n + 3) {
                border-bottom: 0;
            }
            .kd-module__head {
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 8px;
            }
            .kd-module__head > .ant-typography {
                font-size: 12px;
            }
            .kd-module__head .ant-btn {
                height: auto;
                padding: 0;
                font-size: 10px;
            }
            .kd-module__primary {
                display: grid;
                gap: 2px;
                margin-top: 8px;
            }
            .kd-module__primary .ant-typography {
                font-size: 10px;
            }
            .kd-module__primary strong {
                color: var(--kd-text);
                font-size: 18px;
                line-height: 1.15;
                letter-spacing: -.02em;
            }
            .kd-module__facts {
                display: flex;
                flex-wrap: wrap;
                gap: 6px 14px;
                margin-top: 9px;
            }
            .kd-module__facts span {
                display: inline-flex;
                align-items: baseline;
                gap: 4px;
            }
            .kd-module__facts small {
                color: var(--kd-muted);
                font-size: 9px;
            }
            .kd-module__facts b {
                color: var(--kd-text);
                font-size: 10px;
                font-weight: 650;
            }

            .kd .ant-table-small .ant-table-cell {
                padding: 7px 10px !important;
                font-size: 11px;
            }
            .kd .ant-table-wrapper .ant-table-thead > tr > th {
                font-size: 10px;
                font-weight: 650;
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
                .kd-signal-grid {
                    grid-template-columns: repeat(2, minmax(0, 1fr));
                }
                .kd-kpis {
                    grid-template-columns: repeat(3, minmax(0, 1fr));
                }
                .kd-hero,
                .kd-focus-grid,
                .kd-main-grid,
                .kd-insight-grid,
                .kd-row-2,
                .kd-row-3,
                .kd-cash-expense-row {
                    grid-template-columns: minmax(0, 1fr);
                }
                .kd-performance__chart {
                    height: 238px;
                }
                .kd-modules__grid {
                    grid-template-columns: repeat(2, minmax(0, 1fr));
                }
                .kd-module:nth-child(3n) { border-right: 1px solid var(--kd-grid); }
                .kd-module:nth-child(2n) { border-right: 0; }
                .kd-module:nth-last-child(-n + 3) { border-bottom: 1px solid var(--kd-grid); }
                .kd-module:nth-last-child(-n + 2) { border-bottom: 0; }
            }
            @media (max-width: 768px) {
                .kd {
                    padding: ${e.paddingXS}px;
                }
                .kd-hero {
                    border-radius: 22px;
                    padding: 18px;
                }
                .kd-hero__score {
                    padding: 16px;
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
                .kd-signal-grid,
                .kd-biz-grid,
                .kd-bottom {
                    grid-template-columns: minmax(0, 1fr);
                }
                .kd-modules__grid {
                    grid-template-columns: minmax(0, 1fr);
                }
                .kd-module,
                .kd-module:nth-child(2n),
                .kd-module:nth-child(3n),
                .kd-module:nth-last-child(-n + 2) {
                    border-right: 0;
                    border-bottom: 1px solid var(--kd-grid);
                }
                .kd-module:last-child {
                    border-bottom: 0;
                }
                .kd-performance__head,
                .kd-performance__stats {
                    align-items: flex-start;
                    justify-content: flex-start;
                }
                .kd-performance__head {
                    flex-direction: column;
                }
                .kd-biz__rows {
                    grid-template-columns: minmax(0, 1fr);
                }
            }
            @media (max-width: 520px) {
                .kd-kpis {
                    grid-template-columns: minmax(0, 1fr);
                }
                .kd-card-hdr__t {
                    font-size: ${e.fontSize}px;
                }
            }
        `})}export{fe as default};