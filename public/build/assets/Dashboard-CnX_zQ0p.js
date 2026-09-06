import{i as e}from"./rolldown-runtime-aKtaBQYM.js";import{t}from"./axios-BQPRRFHk.js";import{i as n,o as r,t as i}from"./index.esm-CtIVDvdE.js";import{r as a,t as o}from"./jsx-runtime-RbF_zoRI.js";import{t as s}from"./table-sosYro0l.js";import{t as c}from"./alert-BMEt18v7.js";import{t as l}from"./typography-BlWmaYWr.js";import{t as u}from"./skeleton-DlRG_YHH.js";import{t as d}from"./select-D1gP4WaH.js";import{t as f}from"./empty-41qDbwiS.js";import{t as ee}from"./tooltip-DRvKpi-S.js";import{t as p}from"./button-ZrI-T1CS.js";import{t as m}from"./dayjs.min-BRtZKQ04.js";import{t as h}from"./date-picker-DTcMirK-.js";import{t as g}from"./tabs-ro8UlKqh.js";import{t as _}from"./card-C0Xr1RgP.js";import{t as v}from"./ReloadOutlined-CMtviqc6.js";import{t as y}from"./tag-5JFZRmzJ.js";import{l as te,r as b}from"./app-JQ4Gltw7.js";import{t as x}from"./AuthenticatedLayout-Du7aKfRk.js";import{t as S}from"./ArrowRightOutlined-BoA64VOv.js";import{t as C}from"./CheckCircleOutlined-B_TrR1yt.js";import{t as w}from"./WarningOutlined-KVDD8iB3.js";import{M as T,l as E,m as D,u as O,zt as k}from"./CartesianChart-BsPrN-un.js";import{t as A}from"./Legend-DalhT8G-.js";import{c as ne,n as j,t as re}from"./BarChart-DcdHcNJ6.js";import{n as ie,t as ae}from"./PieChart-DVb3x8Yi.js";import{n as M,t as oe}from"./LineChart-DFnLWXQw.js";import{n as se,t as ce}from"./AreaChart-BxUzMI-1.js";import{t as le}from"./humanizeLabel-DrY7Jofm.js";var N=e(a(),1),P=e(m(),1),F=o(),{RangePicker:ue}=h,{Text:I,Title:L}=l,R=`-`,z={primary:`var(--kd-primary)`,primaryActive:`var(--kd-primary-active)`,success:`var(--kd-success)`,warning:`var(--kd-warning)`,error:`var(--kd-error)`,info:`var(--kd-info)`,text:`var(--kd-text)`,muted:`var(--kd-muted)`},de=[z.primary,z.success,z.warning,z.info,z.primaryActive,z.error,z.muted],B=(e,t={})=>{try{return new Intl.NumberFormat(e,t)}catch{return new Intl.NumberFormat(`en-US`,t)}},V=`en-NP`,H=`NPR`,fe=B(V,{style:`currency`,currency:H,maximumFractionDigits:0}),U=B(V,{style:`currency`,currency:H,notation:`compact`,maximumFractionDigits:1}),pe=B(V),me=e=>{let t=String(e||``).toUpperCase();!/^[A-Z]{3}$/.test(t)||t===H||(H=t,fe=B(V,{style:`currency`,currency:t,maximumFractionDigits:0}),U=B(V,{style:`currency`,currency:t,notation:`compact`,maximumFractionDigits:1}))},W=(e,t)=>e==null||e===``?R:(t?U:fe).format(Number(e||0)),he=e=>e==null||e===``?R:pe.format(Number(e||0)),G=e=>e?(0,P.default)(e).format(`DD MMM YYYY`):R,K=e=>Number(e||0),q=e=>{e&&e!==`#`&&n.visit(e)},ge=e=>e?(0,P.default)(e).format(`YYYY-MM-DD`):void 0,_e=(e={})=>{let t=e.current_fiscal_year||e.currentFiscalYear||{};return{date_from:ge(t.start_date)||(0,P.default)().startOf(`month`).format(`YYYY-MM-DD`),date_to:ge(t.end_date)||(0,P.default)().format(`YYYY-MM-DD`)}},J=e=>K(e)>=0?`positive`:`negative`,Y=e=>e==null||e===``?R:U.format(Number(e||0));function X(e=[],t=[],{snapshot:n=!1,maxPoints:r=18}={}){let i=(0,P.default)().endOf(`day`),a=e.filter(e=>!e?.date||!(0,P.default)(e.date).isAfter(i,`day`)),o=a.length?a:e,s=new Set(o.map(e=>(0,P.default)(e?.date).format(`YYYY-MM`)));if(o.length<=r||s.size===1)return o;let c=new Map;return o.forEach(e=>{let r=(0,P.default)(e?.date),i=r.isValid()?r.format(`YYYY-MM`):`item-${c.size}`,a=c.get(i)||{date:e?.date,label:r.isValid()?r.format(`MMM YY`):``};t.forEach(t=>{a[t]=n?K(e?.[t]):K(a[t])+K(e?.[t])}),a.date=e?.date||a.date,c.set(i,a)}),Array.from(c.values())}function ve(){let e=b(),{token:n}=te.useToken(),a=r(),o=a.props.branchContext||{},[s,l]=(0,N.useState)(!0),[u,d]=(0,N.useState)(null),[f,ee]=(0,N.useState)({}),[m,h]=(0,N.useState)(()=>({branch_id:o.selectedBranchId||`all`,..._e(o)})),g=(0,N.useCallback)(async()=>{l(!0),d(null);try{let e=await t.get(`/dashboard-data`,{params:{branch_id:m.branch_id===`all`?void 0:m.branch_id,date_from:m.date_from,date_to:m.date_to}});ee(e.data||{})}catch(t){d(t?.response?.data?.message||e(`Unable to load dashboard data.`))}finally{l(!1)}},[m,e]);(0,N.useEffect)(()=>{g()},[g]);let _=(0,N.useMemo)(()=>Fe(f),[f]),v=f.branches||o.branches||[];return a.props.auth?.user?.name?.split(` `)?.[0],(0,F.jsxs)(x,{header:(0,F.jsx)(xe,{branches:v,filters:m,loading:s,onRefresh:g,onChange:h}),children:[(0,F.jsx)(i,{title:e(`Dashboard`)}),(0,F.jsx)(ze,{token:n}),(0,F.jsx)(`main`,{className:`kd`,children:(0,F.jsxs)(`div`,{className:`kd-wrap`,children:[u&&(0,F.jsx)(c,{showIcon:!0,type:`error`,message:e(`Dashboard could not be loaded`),description:u,action:(0,F.jsx)(p,{onClick:g,children:e(`Retry`)})}),s?(0,F.jsx)(Pe,{}):u?null:(0,F.jsxs)(F.Fragment,{children:[(0,F.jsx)(`section`,{className:`kd-kpi-grid`,"aria-label":e(`Key financial metrics`),children:_.kpis.map(e=>(0,F.jsx)(Se,{...e},e.key))}),(0,F.jsxs)(`section`,{className:`kd-focus-grid`,"aria-label":e(`Financial overview`),children:[(0,F.jsx)(Ce,{data:_.chartData,summary:_.executive}),(0,F.jsx)(be,{items:_.attentionItems})]}),(0,F.jsx)(ye,{model:_,data:f}),(0,F.jsxs)(`section`,{className:`kd-cash-expense-row`,children:[(0,F.jsx)(we,{data:_.expenseBreakdown}),(0,F.jsx)(Ee,{data:_.cashflowChart})]}),(0,F.jsxs)(`section`,{className:_.bankAccounts.length?`kd-row-2`:`kd-row-1`,children:[(0,F.jsx)(De,{data:_.ageingData}),_.bankAccounts.length>0&&(0,F.jsx)(Ne,{accounts:_.bankAccounts})]}),(_.topCustomers.length>0||_.topSuppliers.length>0)&&(0,F.jsxs)(`section`,{className:`kd-row-2`,children:[_.topCustomers.length>0&&(0,F.jsx)(Me,{title:e(`Top customers`),subtitle:e(`Highest sales contribution`),data:_.topCustomers,color:z.primary}),_.topSuppliers.length>0&&(0,F.jsx)(Me,{title:e(`Top suppliers`),subtitle:e(`Highest purchase contribution`),data:_.topSuppliers,color:z.warning})]}),_.bizCards.length>0&&(0,F.jsx)(Oe,{cards:_.bizCards}),(_.approachingProjects.length>0||_.overdueProjects.length>0)&&(0,F.jsx)(Ie,{approaching:_.approachingProjects,overdue:_.overdueProjects}),(0,F.jsx)(je,{transactions:_.transactions})]})]})})]})}function Z({title:e,subtitle:t}){return(0,F.jsxs)(`div`,{className:`kd-card-heading`,children:[(0,F.jsx)(`span`,{className:`kd-card-heading__title`,children:e}),t&&(0,F.jsx)(I,{type:`secondary`,children:t})]})}function ye({model:e,data:t}){let n=b(),{executive:r,cashPosition:i}=e,a=t.cashflow_summary,o=[{label:`Net profit margin`,value:r.revenue>0?`${r.margin.toFixed(1)}%`:R,helper:`Net profit / revenue`,tone:J(r.netProfit)},{label:`Net cash flow`,value:a?W(a.net_cash_flow):R,helper:`Cash received less cash paid`,tone:J(a?.net_cash_flow)},{label:`Net liquidity`,value:W(i.netLiquidity),helper:`Cash + receivables − payables`,tone:J(i.netLiquidity)},{label:`Cash coverage`,value:r.payables>0?`${(r.cash/r.payables).toFixed(2)}×`:R,helper:r.payables>0?`Cash & bank / outstanding payables`:`No outstanding payables`,tone:`neutral`}];return(0,F.jsx)(`section`,{className:`kd-signal-grid`,"aria-label":n(`Financial indicators`),children:o.map(e=>(0,F.jsxs)(`div`,{className:`kd-signal`,"data-tone":e.tone,children:[(0,F.jsxs)(`div`,{className:`kd-signal__top`,children:[(0,F.jsx)(I,{type:`secondary`,children:n(e.label)}),(0,F.jsx)(`span`,{className:`kd-signal__dot`,"aria-hidden":`true`})]}),(0,F.jsx)(`strong`,{className:`kd-signal__value`,children:e.value}),(0,F.jsx)(I,{type:`secondary`,className:`kd-signal__helper`,children:n(e.helper)})]},e.label))})}function be({items:e}){let t=b(),n=e.slice(0,4);return(0,F.jsx)(_,{size:`small`,className:`kd-card kd-attention`,title:(0,F.jsx)(Z,{title:t(`Needs attention`),subtitle:t(`Items that may require action`)}),extra:n.length?(0,F.jsxs)(y,{icon:(0,F.jsx)(w,{}),color:`warning`,children:[n.length,` `,t(`open`)]}):(0,F.jsx)(y,{icon:(0,F.jsx)(C,{}),color:`success`,children:t(`All clear`)}),children:(0,F.jsx)(`div`,{className:`kd-attention__list`,children:n.length?n.map(e=>(0,F.jsxs)(`button`,{type:`button`,className:`kd-attention__item`,onClick:()=>q(e.href),children:[(0,F.jsxs)(`span`,{className:`kd-attention__copy`,children:[(0,F.jsx)(`b`,{children:t(e.label)}),(0,F.jsx)(`small`,{children:t(e.module)})]}),(0,F.jsxs)(`span`,{className:`kd-attention__value`,children:[(0,F.jsx)(`strong`,{children:e.format===`money`?W(e.value,!0):he(e.value)}),(0,F.jsx)(S,{"aria-hidden":`true`})]})]},e.key)):(0,F.jsxs)(`div`,{className:`kd-attention__empty`,children:[(0,F.jsx)(C,{}),(0,F.jsxs)(`div`,{children:[(0,F.jsx)(I,{strong:!0,children:t(`Nothing urgent right now`)}),(0,F.jsx)(I,{type:`secondary`,children:t(`No overdue or exceptional items were found.`)})]})]})})})}function xe({branches:e,filters:t,loading:n,onRefresh:r,onChange:i}){let a=b(),o=[{value:`all`,label:a(`All branches`)},...(e||[]).map(e=>({value:e.value??e.id,label:e.label??e.name??`${a(`Branch`)} #${e.id}`}))];return(0,F.jsxs)(`div`,{className:`kd-hdr`,children:[(0,F.jsxs)(`div`,{className:`kd-hdr__copy`,children:[(0,F.jsx)(L,{level:4,children:a(`Dashboard`)}),(0,F.jsx)(I,{type:`secondary`,children:a(`Financial and operational performance`)})]}),(0,F.jsxs)(`div`,{className:`kd-hdr__ctl`,children:[(0,F.jsx)(d,{value:t.branch_id,options:o,className:`kd-hdr__branch`,"aria-label":a(`Branch`),onChange:e=>i(t=>({...t,branch_id:e||`all`}))}),(0,F.jsx)(ue,{allowClear:!1,presets:[{label:a(`This month`),value:[(0,P.default)().startOf(`month`),(0,P.default)()]},{label:a(`Last month`),value:[(0,P.default)().subtract(1,`month`).startOf(`month`),(0,P.default)().subtract(1,`month`).endOf(`month`)]},{label:a(`Last 90 days`),value:[(0,P.default)().subtract(89,`day`),(0,P.default)()]},{label:a(`Year to date`),value:[(0,P.default)().startOf(`year`),(0,P.default)()]}],value:t.date_from&&t.date_to?[(0,P.default)(t.date_from),(0,P.default)(t.date_to)]:null,className:`kd-hdr__range`,onChange:e=>i(t=>({...t,date_from:e?.[0]?.format(`YYYY-MM-DD`),date_to:e?.[1]?.format(`YYYY-MM-DD`)}))}),(0,F.jsx)(ee,{title:a(`Refresh`),children:(0,F.jsx)(p,{"aria-label":a(`Refresh dashboard`),disabled:n,icon:(0,F.jsx)(v,{spin:n}),onClick:r})})]})]})}function Se({label:e,value:t,helper:n,sparkline:r=[],color:i}){let a=b();return(0,F.jsxs)(_,{size:`small`,className:`kd-card kd-kpi`,style:{"--kd-kpi-accent":i},children:[(0,F.jsxs)(`div`,{className:`kd-kpi__head`,children:[(0,F.jsx)(I,{type:`secondary`,children:a(e)}),(0,F.jsx)(`span`,{className:`kd-kpi__accent`,"aria-hidden":`true`})]}),(0,F.jsx)(`strong`,{className:`kd-kpi__value`,children:W(t)}),(0,F.jsxs)(`div`,{className:`kd-kpi__footer`,children:[(0,F.jsx)(I,{type:`secondary`,children:a(n||`Selected period`)}),(0,F.jsx)(`div`,{className:`kd-kpi__trend`,role:`img`,"aria-label":a(`${e} trend for the selected period`),children:r.length?(0,F.jsx)(k,{width:`100%`,height:`100%`,children:(0,F.jsxs)(ce,{data:r,margin:{top:3,right:1,bottom:1,left:1},children:[(0,F.jsx)(T,{labelFormatter:(e,t)=>G(t?.[0]?.payload?.date),formatter:t=>[W(t),a(e)],contentStyle:{background:`var(--kd-elevated)`,borderColor:`var(--kd-border)`,borderRadius:`var(--kd-radius-sm)`,color:`var(--kd-text)`,boxShadow:`var(--kd-shadow-strong)`},itemStyle:{color:`var(--kd-text)`}}),(0,F.jsx)(se,{type:`monotone`,dataKey:`value`,stroke:i,fill:i,fillOpacity:.08,strokeWidth:2,dot:!1,activeDot:{r:3},isAnimationActive:!1})]})}):(0,F.jsx)(`span`,{className:`kd-kpi__dash`,children:R})})]})]})}function Ce({data:e,summary:t}){let n=b(),r=e.some(e=>K(e.revenue)||K(e.expenses)||K(e.profit)),i=t.revenue>0?`${t.margin.toFixed(1)}% ${n(`margin`)}`:n(`No margin data`);return(0,F.jsxs)(_,{size:`small`,className:`kd-card kd-performance`,title:(0,F.jsx)(Z,{title:n(`Financial performance`),subtitle:n(`Revenue, expenses and net profit over time`)}),extra:(0,F.jsx)(y,{color:t.netProfit>=0?`success`:`error`,children:i}),children:[(0,F.jsxs)(`div`,{className:`kd-performance__stats`,children:[(0,F.jsxs)(`div`,{children:[(0,F.jsx)(I,{type:`secondary`,children:n(`Revenue`)}),(0,F.jsx)(`strong`,{children:Y(t.revenue)})]}),(0,F.jsxs)(`div`,{children:[(0,F.jsx)(I,{type:`secondary`,children:n(`Expenses`)}),(0,F.jsx)(`strong`,{children:Y(t.expenses)})]}),(0,F.jsxs)(`div`,{children:[(0,F.jsx)(I,{type:`secondary`,children:n(`Net profit`)}),(0,F.jsx)(`strong`,{children:Y(t.netProfit)})]})]}),r?(0,F.jsx)(`div`,{className:`kd-performance__chart`,role:`img`,"aria-label":n(`Revenue, expenses and net profit over time`),children:(0,F.jsx)(k,{width:`100%`,height:`100%`,children:(0,F.jsxs)(oe,{data:e,margin:{top:18,right:10,bottom:6,left:0},children:[(0,F.jsx)(D,{stroke:`var(--kd-grid)`,vertical:!1}),(0,F.jsx)(O,{dataKey:`label`,axisLine:!1,tickLine:!1,minTickGap:24,tick:{fill:`var(--kd-muted)`,fontSize:`var(--kd-font-sm)`}}),(0,F.jsx)(E,{axisLine:!1,tickLine:!1,width:66,tickFormatter:e=>Y(e),tick:{fill:`var(--kd-muted)`,fontSize:`var(--kd-font-sm)`}}),(0,F.jsx)(T,{content:(0,F.jsx)(Q,{})}),(0,F.jsx)(A,{iconType:`plainline`,wrapperStyle:{fontSize:`var(--kd-font-sm)`},formatter:e=>(0,F.jsx)(`span`,{style:{color:`var(--kd-text)`},children:e})}),(0,F.jsx)(M,{type:`monotone`,dataKey:`revenue`,name:n(`Revenue`),stroke:z.primary,strokeWidth:2.25,dot:e.length<=2,activeDot:{r:4}}),(0,F.jsx)(M,{type:`monotone`,dataKey:`expenses`,name:n(`Expenses`),stroke:z.warning,strokeWidth:2,strokeDasharray:`5 3`,dot:e.length<=2,activeDot:{r:4}}),(0,F.jsx)(M,{type:`monotone`,dataKey:`profit`,name:n(`Net profit`),stroke:z.success,strokeWidth:2,strokeDasharray:`2 3`,dot:e.length<=2,activeDot:{r:4}})]})})}):(0,F.jsx)($,{title:n(`No financial data`),desc:n(`Revenue and expense activity will appear here.`)}),(0,F.jsxs)(`div`,{className:`kd-performance__insight`,children:[(0,F.jsx)(`span`,{className:`kd-performance__insight-dot`,"aria-hidden":`true`}),(0,F.jsx)(I,{type:`secondary`,children:n(t.message)})]})]})}function we({data:e}){let t=b(),n=e.reduce((e,t)=>e+K(t.value),0);return(0,F.jsx)(_,{size:`small`,className:`kd-card kd-chart-side`,title:(0,F.jsx)(Z,{title:t(`Expense breakdown`),subtitle:t(`Expenses by category`)}),extra:n>0?(0,F.jsx)(I,{strong:!0,children:Y(n)}):null,children:e.length>0&&n>0?(0,F.jsx)(`div`,{className:`kd-donut`,children:(0,F.jsx)(k,{width:`100%`,height:`100%`,children:(0,F.jsxs)(ae,{children:[(0,F.jsx)(ie,{data:e,dataKey:`value`,nameKey:`name`,cx:`50%`,cy:`44%`,innerRadius:`54%`,outerRadius:`76%`,paddingAngle:2,strokeWidth:0,children:e.map((e,t)=>(0,F.jsx)(ne,{fill:de[t%de.length]},t))}),(0,F.jsx)(T,{content:(0,F.jsx)(Te,{total:n})}),(0,F.jsx)(A,{iconType:`circle`,iconSize:7,wrapperStyle:{fontSize:`var(--kd-font-sm)`,lineHeight:`18px`},formatter:e=>(0,F.jsx)(`span`,{style:{color:`var(--kd-text)`,fontSize:`var(--kd-font-sm)`},children:e})})]})})}):(0,F.jsx)($,{title:t(`No expense data`),desc:t(`Expense categories will appear here.`),compact:!0})})}function Te({active:e,payload:t,total:n}){if(!e||!t?.length)return null;let r=t[0],i=n>0?(K(r.value)/n*100).toFixed(1):0;return(0,F.jsxs)(`div`,{className:`kd-tip`,children:[(0,F.jsx)(I,{strong:!0,children:r.name}),(0,F.jsxs)(`div`,{className:`kd-tip__row`,children:[(0,F.jsx)(`span`,{style:{background:r.payload?.fill}}),(0,F.jsx)(I,{type:`secondary`,children:`Amount`}),(0,F.jsx)(I,{children:W(r.value)})]}),(0,F.jsxs)(`div`,{className:`kd-tip__row`,children:[(0,F.jsx)(`span`,{style:{background:`var(--kd-border)`}}),(0,F.jsx)(I,{type:`secondary`,children:`Share`}),(0,F.jsxs)(I,{children:[i,`%`]})]})]})}function Ee({data:e}){let t=b(),n=e.some(e=>K(e.cash_in)||K(e.cash_out));return(0,F.jsx)(_,{size:`small`,className:`kd-card kd-chart-main`,title:(0,F.jsx)(Z,{title:t(`Cash flow`),subtitle:t(`Cash inflows, outflows and net movement`)}),children:n?(0,F.jsx)(`div`,{className:`kd-chart-standard`,children:(0,F.jsx)(k,{width:`100%`,height:`100%`,children:(0,F.jsxs)(oe,{data:e,margin:{top:8,right:10,bottom:0,left:0},children:[(0,F.jsx)(D,{stroke:`var(--kd-grid)`,vertical:!1}),(0,F.jsx)(O,{dataKey:`label`,axisLine:!1,tickLine:!1,tick:{fill:`var(--kd-muted)`,fontSize:`var(--kd-font-sm)`}}),(0,F.jsx)(E,{axisLine:!1,tickLine:!1,tick:{fill:`var(--kd-muted)`,fontSize:`var(--kd-font-sm)`},tickFormatter:e=>U.format(e),width:58}),(0,F.jsx)(T,{content:(0,F.jsx)(Q,{})}),(0,F.jsx)(A,{iconType:`circle`,iconSize:7,wrapperStyle:{fontSize:`var(--kd-font-sm)`,paddingTop:4}}),(0,F.jsx)(M,{type:`monotone`,dataKey:`cash_in`,name:t(`Cash In`),stroke:z.info,strokeWidth:2,dot:!1,activeDot:{r:3}}),(0,F.jsx)(M,{type:`monotone`,dataKey:`cash_out`,name:t(`Cash Out`),stroke:z.error,strokeWidth:2,dot:!1,activeDot:{r:3}}),(0,F.jsx)(M,{type:`monotone`,dataKey:`net`,name:t(`Net`),stroke:z.primaryActive,strokeWidth:2,strokeDasharray:`6 3`,dot:!1,activeDot:{r:3}})]})})}):(0,F.jsx)($,{title:t(`No cash flow data`),desc:t(`Cash inflows and outflows will appear here.`)})})}function De({data:e}){let t=b(),n=e.some(e=>K(e.receivables)>0||K(e.payables)>0);return(0,F.jsx)(_,{size:`small`,className:`kd-card kd-chart-side`,title:(0,F.jsx)(Z,{title:t(`Receivables vs payables`),subtitle:t(`Outstanding amounts by age`)}),children:n?(0,F.jsx)(`div`,{className:`kd-chart-standard`,children:(0,F.jsx)(k,{width:`100%`,height:`100%`,children:(0,F.jsxs)(re,{data:e,margin:{top:8,right:6,bottom:0,left:0},children:[(0,F.jsx)(D,{stroke:`var(--kd-grid)`,vertical:!1}),(0,F.jsx)(O,{dataKey:`bucket`,axisLine:!1,tickLine:!1,tick:{fill:`var(--kd-muted)`,fontSize:`var(--kd-font-sm)`}}),(0,F.jsx)(E,{axisLine:!1,tickLine:!1,tick:{fill:`var(--kd-muted)`,fontSize:`var(--kd-font-sm)`},tickFormatter:e=>U.format(e),width:52}),(0,F.jsx)(T,{content:(0,F.jsx)(Q,{})}),(0,F.jsx)(A,{iconType:`circle`,iconSize:7,wrapperStyle:{fontSize:`var(--kd-font-sm)`,paddingTop:4}}),(0,F.jsx)(j,{dataKey:`receivables`,name:t(`Receivables`),fill:z.info,radius:[4,4,0,0],maxBarSize:22}),(0,F.jsx)(j,{dataKey:`payables`,name:t(`Payables`),fill:z.warning,radius:[4,4,0,0],maxBarSize:22})]})})}):(0,F.jsx)($,{title:t(`No ageing data`),desc:t(`Receivable and payable ageing will appear here.`),compact:!0})})}function Q({active:e,payload:t,label:n}){return!e||!t?.length?null:(0,F.jsxs)(`div`,{className:`kd-tip`,children:[(0,F.jsx)(I,{strong:!0,className:`kd-tip__title`,children:n}),t.map(e=>(0,F.jsxs)(`div`,{className:`kd-tip__row`,children:[(0,F.jsx)(`span`,{style:{background:e.color||e.fill}}),(0,F.jsx)(I,{type:`secondary`,children:e.name}),(0,F.jsx)(I,{children:W(e.value)})]},e.dataKey))]})}function Oe({cards:e}){let t=b();return(0,F.jsxs)(`section`,{className:`kd-section`,"aria-labelledby":`operating-summary-title`,children:[(0,F.jsx)(`div`,{className:`kd-section__head`,children:(0,F.jsxs)(`div`,{children:[(0,F.jsx)(L,{id:`operating-summary-title`,level:5,children:t(`Operating summary`)}),(0,F.jsx)(I,{type:`secondary`,children:t(`A quick pulse across the modules you use`)})]})}),(0,F.jsx)(`div`,{className:`kd-modules__grid`,children:e.map(e=>{let n=e.items[0];return(0,F.jsxs)(_,{size:`small`,className:`kd-card kd-module`,children:[(0,F.jsxs)(`div`,{className:`kd-module__head`,children:[(0,F.jsx)(I,{strong:!0,children:t(e.title)}),e.href&&(0,F.jsxs)(p,{type:`link`,size:`small`,onClick:()=>q(e.href),children:[t(e.linkText||`View`),` `,(0,F.jsx)(S,{})]})]}),(0,F.jsxs)(`div`,{className:`kd-module__primary`,children:[(0,F.jsx)(I,{type:`secondary`,children:t(n?.label)}),(0,F.jsx)(`strong`,{children:ke(n)})]}),(0,F.jsx)(`div`,{className:`kd-module__facts`,children:e.items.slice(1).map(e=>(0,F.jsxs)(`span`,{children:[(0,F.jsx)(`small`,{children:t(e.label)}),(0,F.jsx)(`b`,{children:ke(e)})]},e.label))})]},e.key)})})]})}function ke(e){return e?e.format===`money`?W(e.value,!0):e.format===`text`?e.value||R:he(e.value):R}function Ae(e){let t=String(e||``).toLowerCase();return[`paid`,`posted`,`approved`,`completed`,`active`,`success`].some(e=>t.includes(e))?`success`:[`overdue`,`failed`,`rejected`,`cancelled`,`canceled`].some(e=>t.includes(e))?`error`:[`pending`,`draft`,`processing`,`in_progress`,`in progress`].some(e=>t.includes(e))?`processing`:[`partial`,`upcoming`,`warning`].some(e=>t.includes(e))?`warning`:`default`}function je({transactions:e}){let t=b(),n=[{title:t(`Date`),dataIndex:`date`,render:G,width:120},{title:t(`Type`),dataIndex:`type`,width:140},{title:t(`Number`),dataIndex:`number`,render:(e,t)=>t.action_url?(0,F.jsx)(p,{type:`link`,className:`kd-table-link`,onClick:e=>{e.stopPropagation(),q(t.action_url)},children:e||R}):e||R},{title:t(`Party`),dataIndex:`party`,ellipsis:!0,render:e=>e||R},{title:t(`Amount`),dataIndex:`amount`,align:`right`,render:e=>(0,F.jsx)(I,{strong:!0,children:W(e)})},{title:t(`Status`),dataIndex:`status`,width:110,render:e=>(0,F.jsx)(y,{color:Ae(e),children:le(e||`posted`)})}];return(0,F.jsx)(_,{size:`small`,className:`kd-card kd-table-card`,title:(0,F.jsx)(Z,{title:t(`Recent transactions`),subtitle:t(`Latest posted financial documents`)}),children:e.length>0?(0,F.jsx)(s,{rowKey:`key`,columns:n,dataSource:e,pagination:!1,size:`small`,scroll:{x:760},onRow:e=>({onClick:()=>q(e.action_url),className:e.action_url?`kd-row--click`:``})}):(0,F.jsx)($,{title:t(`No recent transactions`),desc:t(`Posted documents will appear here.`),compact:!0})})}function Me({title:e,subtitle:t,data:n,color:r}){let i=n.slice(0,5).map(e=>({...e,name:Re(e.name,18)}));return(0,F.jsx)(_,{size:`small`,className:`kd-card`,title:(0,F.jsx)(Z,{title:e,subtitle:t}),children:(0,F.jsx)(`div`,{className:`kd-chart-compact`,children:(0,F.jsx)(k,{width:`100%`,height:`100%`,children:(0,F.jsxs)(re,{data:i,layout:`vertical`,margin:{top:2,right:16,bottom:0,left:4},children:[(0,F.jsx)(O,{type:`number`,axisLine:!1,tickLine:!1,tick:{fill:`var(--kd-muted)`,fontSize:`var(--kd-font-sm)`},tickFormatter:e=>U.format(e)}),(0,F.jsx)(E,{type:`category`,dataKey:`name`,axisLine:!1,tickLine:!1,width:100,tick:{fill:`var(--kd-text)`,fontSize:`var(--kd-font-sm)`}}),(0,F.jsx)(T,{content:(0,F.jsx)(Q,{})}),(0,F.jsx)(j,{dataKey:`amount`,name:`Amount`,fill:r,radius:[0,4,4,0],maxBarSize:16})]})})})})}function Ne({accounts:e}){let t=b();return(0,F.jsx)(_,{size:`small`,className:`kd-card kd-bank-card`,title:(0,F.jsx)(Z,{title:t(`Bank accounts`),subtitle:t(`Available balances by account`)}),extra:(0,F.jsx)(y,{children:e.length}),children:(0,F.jsx)(`div`,{className:`kd-bank-list`,children:e.map(e=>(0,F.jsxs)(`div`,{className:`kd-bank-row`,children:[(0,F.jsxs)(`div`,{className:`kd-bank-row__copy`,children:[(0,F.jsx)(I,{strong:!0,ellipsis:!0,children:e.bank_name||R}),(0,F.jsx)(I,{type:`secondary`,ellipsis:!0,children:[e.account_name,e.account_number].filter(Boolean).join(` / `)||R})]}),(0,F.jsxs)(`div`,{className:`kd-bank-row__amount`,children:[(0,F.jsx)(I,{strong:!0,children:W(e.balance)}),e.currency&&(0,F.jsx)(I,{type:`secondary`,children:e.currency})]})]},e.key))})})}function $({title:e,desc:t,compact:n}){return(0,F.jsx)(`div`,{className:`kd-empty${n?` kd-empty--compact`:``}`,children:(0,F.jsxs)(f,{image:f.PRESENTED_IMAGE_SIMPLE,description:!1,children:[(0,F.jsx)(L,{level:5,children:e}),(0,F.jsx)(I,{type:`secondary`,children:t})]})})}function Pe(){return(0,F.jsxs)(`div`,{className:`kd-skeleton`,children:[(0,F.jsx)(`div`,{className:`kd-kpi-grid`,children:[1,2,3,4,5,6].map(e=>(0,F.jsx)(_,{className:`kd-card`,children:(0,F.jsx)(u,{active:!0,paragraph:{rows:1}})},e))}),(0,F.jsxs)(`div`,{className:`kd-focus-grid`,children:[(0,F.jsx)(_,{size:`small`,className:`kd-card`,children:(0,F.jsx)(u,{active:!0,paragraph:{rows:8}})}),(0,F.jsx)(_,{size:`small`,className:`kd-card`,children:(0,F.jsx)(u,{active:!0,paragraph:{rows:6}})})]}),(0,F.jsx)(`div`,{className:`kd-signal-grid`,children:[1,2,3,4].map(e=>(0,F.jsx)(_,{className:`kd-card`,children:(0,F.jsx)(u,{active:!0,paragraph:{rows:1}})},e))}),(0,F.jsxs)(`div`,{className:`kd-cash-expense-row`,children:[(0,F.jsx)(_,{size:`small`,className:`kd-card`,children:(0,F.jsx)(u,{active:!0,paragraph:{rows:6}})}),(0,F.jsx)(_,{size:`small`,className:`kd-card`,children:(0,F.jsx)(u,{active:!0,paragraph:{rows:6}})})]}),(0,F.jsx)(_,{size:`small`,className:`kd-card`,children:(0,F.jsx)(u,{active:!0,paragraph:{rows:5}})})]})}function Fe(e){let t=e.financial_summary||{};me(t.currency||e.currency);let n=e.metric_sparklines||{},r=e.revenue_expense_profit_chart||[],i=e.cashflow_chart||[],a=X(r.map(e=>({date:e.date,label:e.date?(0,P.default)(e.date).format(`DD MMM`):``,revenue:K(e.revenue),expenses:K(e.expenses),profit:K(e.profit)})),[`revenue`,`expenses`,`profit`]),o=X(i.map(e=>({date:e.date,label:e.date?(0,P.default)(e.date).format(`DD MMM`):``,cash_in:K(e.cash_in),cash_out:K(e.cash_out),net:K(e.net)})),[`cash_in`,`cash_out`,`net`]),s=X(r.map(e=>({date:e.date,value:K(e.revenue)})),[`value`]),c=X(r.map(e=>({date:e.date,value:K(e.expenses)})),[`value`]),l=X((n.net_profit||[]).map(e=>({date:e.date,value:K(e.value)})),[`value`]),u=X((n.cash_bank||[]).map(e=>({date:e.date,value:K(e.value)})),[`value`],{snapshot:!0}),d=X((n.receivables||[]).map(e=>({date:e.date,value:K(e.value)})),[`value`],{snapshot:!0}),f=X((n.payables||[]).map(e=>({date:e.date,value:K(e.value)})),[`value`],{snapshot:!0}),ee={revenue:K(t.revenue),expenses:K(t.expenses),netProfit:K(t.net_profit),receivables:K(t.receivables),payables:K(t.payables),cash:K(t.cash_bank_balance),currency:t.currency||e.currency||`NPR`,margin:K(t.revenue)>0?K(t.net_profit)/K(t.revenue)*100:0,message:K(t.net_profit)>=0?`Revenue is covering costs for this period. Keep an eye on receivables so profit turns into cash.`:`Expenses are ahead of revenue for this period. The fastest wins are collecting receivables and reviewing major costs.`},p=[{key:`revenue`,label:`Revenue`,value:t.revenue,sparkline:s,color:z.primary,helper:`This period`},{key:`expenses`,label:`Expenses`,value:t.expenses,sparkline:c,color:z.warning,invertTrend:!0,helper:`This period`},{key:`profit`,label:`Net Profit`,value:t.net_profit,sparkline:l,color:K(t.net_profit)>=0?z.success:z.error,helper:K(t.revenue)>0?`${(K(t.net_profit)/K(t.revenue)*100).toFixed(1)}% margin`:`This period`},{key:`cash`,label:`Cash & Bank`,value:t.cash_bank_balance,sparkline:u,color:z.info,helper:`Available`},{key:`receivables`,label:`Receivables`,value:t.receivables,sparkline:d,color:z.info,helper:`Outstanding`},{key:`payables`,label:`Payables`,value:t.payables,sparkline:f,color:z.error,helper:`Outstanding`}],m=e.expense_breakdown||[],h=Le(e.receivable_ageing,e.payable_ageing),g=e.cash_position||{},_={cashBankBalance:K(t.cash_bank_balance??g.cash_bank_balance),receivables:K(t.receivables),payables:K(t.payables),netLiquidity:K(t.cash_bank_balance??g.cash_bank_balance)+K(t.receivables)-K(t.payables)},v=Array.isArray(g.bank_accounts)?g.bank_accounts:[],y=Array.isArray(e.recent_transactions)?e.recent_transactions:[],te=Array.isArray(e.top_customers)?e.top_customers:[],b=Array.isArray(e.top_suppliers)?e.top_suppliers:[],x=[],S=e.sales_summary;S&&x.push({key:`sales`,title:`Sales`,href:`/payment-in/invoices`,linkText:`View invoices`,items:[{label:`Total sales`,value:S.sales_total,format:`money`},{label:`Overdue`,value:S.overdue_amount,format:`money`},{label:`Unpaid`,value:S.unpaid_amount,format:`money`},{label:`Invoices`,value:S.invoice_count},{label:`Paid`,value:S.paid_amount,format:`money`}]});let C=e.purchase_summary;C&&x.push({key:`purchase`,title:`Purchases`,href:`/payment-out/purchase-bills`,linkText:`View bills`,items:[{label:`Total purchases`,value:C.purchase_total,format:`money`},{label:`Total payables`,value:C.total_payables??C.unpaid_amount,format:`money`},{label:`Upcoming`,value:C.upcoming_payables,format:`money`},{label:`Bills`,value:C.bill_count},{label:`Paid`,value:C.paid_amount,format:`money`},{label:`Expense payables`,value:C.expense_payables,format:`money`}]});let w=e.cashflow_summary;if(w){let e=[{label:`Cash in`,value:w.cash_in,format:`money`},{label:`Cash out`,value:w.cash_out,format:`money`},{label:`Net cash flow`,value:w.net_cash_flow,format:`money`}];x.push({key:`cashflow`,title:`Cash Flow`,items:e})}let T=e.inventory_summary;T&&x.push({key:`inventory`,title:`Inventory`,href:`/inventory/products`,linkText:`View`,items:[{label:`Products`,value:T.total_products},{label:`Low stock`,value:T.low_stock_items},{label:`Value`,value:T.inventory_value,format:`money`},{label:`Warehouses`,value:T.warehouse_count}]});let E=e.crm_summary;E&&x.push({key:`crm`,title:`CRM`,href:`/crm`,linkText:`View`,items:[{label:`Open leads`,value:E.open_leads},{label:`Open deals`,value:E.open_deals},{label:`Pipeline`,value:E.pipeline_value,format:`money`},{label:`Won`,value:E.won_value,format:`money`}]});let D=e.hrm_summary;if(D){let e=[{label:`Employees`,value:D.active_employees}];e.push({label:`On leave today`,value:D.on_leave_today}),e.push({label:`Attendance today`,value:D.attendance_today}),e.push({label:`Payroll`,value:D.payroll_this_period,format:`money`}),x.push({key:`hrm`,title:`HRM`,href:`/hrm/users`,linkText:`View`,items:e})}let O=e.project_summary;if(O){let e=[{label:`Active`,value:O.active_projects},{label:`Completed`,value:O.completed_this_period}];e.push({label:`Overdue tasks`,value:O.overdue_tasks}),e.push({label:`Billing`,value:O.billing_value,format:`money`}),x.push({key:`projects`,title:`Projects`,href:`/hrm/projects`,linkText:`View`,items:e})}return{executive:ee,cashPosition:_,attentionItems:[S&&K(S.overdue_amount)>0?{key:`overdue-sales`,module:`Sales`,label:`Overdue invoices`,value:S.overdue_amount,format:`money`,href:`/payment-in/invoices`}:null,C&&K(C.upcoming_payables)>0?{key:`upcoming-payables`,module:`Purchases`,label:`Upcoming payables`,value:C.upcoming_payables,format:`money`,href:`/payment-out/purchase-bills`}:null,T&&K(T.low_stock_items)>0?{key:`low-stock`,module:`Inventory`,label:`Low stock items`,value:T.low_stock_items,href:`/inventory/products`}:null,O&&K(O.overdue_tasks)>0?{key:`overdue-tasks`,module:`Projects`,label:`Overdue tasks`,value:O.overdue_tasks,href:`/hrm/projects`}:null].filter(Boolean),kpis:p,chartData:a,cashflowChart:o,expenseBreakdown:m,ageingData:h,bizCards:x,transactions:y,topCustomers:te,topSuppliers:b,bankAccounts:v,approachingProjects:Array.isArray(e.approaching_deadline_projects)?e.approaching_deadline_projects:[],overdueProjects:Array.isArray(e.overdue_projects)?e.overdue_projects:[]}}function Ie({approaching:e,overdue:t}){let n=b(),r=e=>[{title:n(`Project`),dataIndex:`name`,render:(e,t)=>(0,F.jsx)(p,{type:`link`,className:`kd-table-link`,onClick:()=>q(t.action_url),children:e||R})},{title:n(`Manager`),dataIndex:`manager`,ellipsis:!0,render:e=>e||R},{title:n(`End Date`),dataIndex:`end_date`,width:120,render:G},{title:n(e===`overdue`?`Overdue`:`Time Left`),width:120,render:(t,r)=>e===`overdue`?`${r.days_overdue||0} ${Number(r.days_overdue)===1?n(`day`):n(`days`)}`:`${r.days_left||0} ${Number(r.days_left)===1?n(`day`):n(`days`)}`},{title:n(`Status`),dataIndex:`status`,width:120,render:e=>(0,F.jsx)(y,{color:Ae(e),children:String(e||R).replace(/_/g,` `)})}],i=(e,t)=>e.length?(0,F.jsx)(s,{size:`small`,rowKey:`id`,pagination:!1,dataSource:e,columns:r(t),scroll:{x:680}}):(0,F.jsx)($,{title:n(`No projects`),desc:n(`Project deadlines that need attention will appear here.`),compact:!0});return(0,F.jsx)(_,{size:`small`,className:`kd-card kd-table-card`,title:(0,F.jsx)(Z,{title:n(`Project deadlines`),subtitle:n(`Approaching and overdue internal project dates`)}),children:(0,F.jsx)(g,{size:`small`,items:[{key:`approaching`,label:`${n(`Approaching`)} (${e.length})`,children:i(e,`approaching`)},{key:`overdue`,label:`${n(`Overdue`)} (${t.length})`,children:i(t,`overdue`)}]})})}function Le(e=[],t=[]){let n=new Map,r=[];return(e||[]).forEach(e=>{n.set(e.bucket,{bucket:e.bucket,receivables:K(e.amount),payables:0}),r.push(e.bucket)}),(t||[]).forEach(e=>{let t=n.get(e.bucket);t?t.payables=K(e.amount):(n.set(e.bucket,{bucket:e.bucket,receivables:0,payables:K(e.amount)}),r.push(e.bucket))}),r.filter((e,t,n)=>n.indexOf(e)===t).map(e=>n.get(e))}function Re(e,t){return e?e.length>t?e.slice(0,t-3)+`...`:e:R}function ze({token:e}){return(0,F.jsx)(`style`,{children:`
        .kd, .kd-hdr {
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
            --kd-font-sm: ${e.fontSizeSM}px;
            --kd-font: ${e.fontSize}px;
            --kd-font-lg: ${e.fontSizeLG}px;
            --kd-font-xl: ${e.fontSizeXL}px;
            --kd-metric: ${e.fontSizeHeading3}px;
            --kd-weight: ${e.fontWeightStrong};
            --kd-control: ${e.controlHeight}px;
            font-family: ${e.fontFamily};
            font-size: ${e.fontSize}px;
            line-height: ${e.lineHeight};
        }

        .kd {
            min-height: 100%;
            padding: ${e.paddingLG}px;
            background: var(--kd-bg);
            color: var(--kd-text);
        }

        .kd-wrap {
            width: 100%;
            max-width: 1600px;
            margin-inline: auto;
            display: flex;
            flex-direction: column;
            gap: ${e.marginLG}px;
            min-width: 0;
        }

        .kd-hdr {
            width: 100%;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: ${e.margin}px;
            min-width: 0;
        }

        .kd-hdr__copy {
            display: grid;
            gap: ${e.marginXXS}px;
            min-width: 0;
        }

        .kd-hdr__copy .ant-typography {
            margin: 0;
        }

        .kd-eyebrow {
            display: block;
            color: var(--kd-primary);
            font-size: ${e.fontSizeSM}px;
            font-weight: ${e.fontWeightStrong};
            letter-spacing: 0.04em;
            text-transform: uppercase;
        }

        .kd-hdr__ctl {
            display: flex;
            align-items: center;
            justify-content: flex-end;
            gap: ${e.marginSM}px;
            min-width: 0;
        }

        .kd-hdr__branch { width: 170px; }
        .kd-hdr__range { width: 250px; }

        .kd-intro {
            display: flex;
            align-items: flex-end;
            justify-content: space-between;
            gap: ${e.marginLG}px;
            padding: ${e.paddingLG}px;
            border: ${e.lineWidth}px solid var(--kd-border);
            border-radius: var(--kd-radius);
            background: var(--kd-card);
            box-shadow: var(--kd-shadow);
        }

        .kd-intro__copy {
            display: grid;
            gap: ${e.marginXS}px;
            min-width: 0;
        }

        .kd-intro__title.ant-typography {
            margin: 0;
            color: var(--kd-text);
        }

        .kd-context {
            display: flex;
            align-items: stretch;
            border: ${e.lineWidth}px solid var(--kd-border);
            border-radius: var(--kd-radius-sm);
            overflow: hidden;
            background: var(--kd-soft);
            flex: 0 0 auto;
        }

        .kd-context__item {
            min-width: 150px;
            display: grid;
            gap: ${e.marginXXS}px;
            padding: ${e.paddingSM}px ${e.padding}px;
        }

        .kd-context__item + .kd-context__item {
            border-inline-start: ${e.lineWidth}px solid var(--kd-border);
        }

        .kd-context__item .ant-typography {
            font-size: ${e.fontSizeSM}px;
        }

        .kd-context__item strong {
            color: var(--kd-text);
            font-weight: ${e.fontWeightStrong};
            white-space: nowrap;
        }

        .kd-kpi-grid,
        .kd-signal-grid,
        .kd-focus-grid,
        .kd-cash-expense-row,
        .kd-row-2,
        .kd-row-1,
        .kd-modules__grid {
            display: grid;
            gap: ${e.margin}px;
            min-width: 0;
        }

        .kd-kpi-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
        .kd-signal-grid { grid-template-columns: repeat(4, minmax(0, 1fr)); }
        .kd-focus-grid { grid-template-columns: minmax(0, 2fr) minmax(300px, 0.85fr); align-items: stretch; }
        .kd-cash-expense-row { grid-template-columns: minmax(300px, 0.8fr) minmax(0, 1.35fr); }
        .kd-row-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
        .kd-row-1 { grid-template-columns: minmax(0, 1fr); }
        .kd-modules__grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }

        .kd-card.ant-card {
            min-width: 0;
            overflow: hidden;
            border-color: var(--kd-border);
            background: var(--kd-card);
            box-shadow: var(--kd-shadow);
        }

        .kd-card.ant-card .ant-card-head {
            min-height: auto;
            padding-inline: ${e.paddingLG}px;
            border-bottom-color: var(--kd-grid);
        }

        .kd-card.ant-card .ant-card-head-title,
        .kd-card.ant-card .ant-card-extra {
            padding-block: ${e.padding}px;
        }

        .kd-card.ant-card .ant-card-body {
            padding: ${e.paddingLG}px;
        }

        .kd-card-heading {
            display: grid;
            gap: ${e.marginXXS}px;
            white-space: normal;
        }

        .kd-card-heading__title {
            color: var(--kd-text);
            font-size: ${e.fontSizeLG}px;
            font-weight: ${e.fontWeightStrong};
            line-height: ${e.lineHeightLG};
        }

        .kd-card-heading .ant-typography {
            font-size: ${e.fontSizeSM}px;
        }

        .kd-kpi.ant-card {
            position: relative;
        }

        .kd-kpi.ant-card::before {
            content: '';
            position: absolute;
            inset-inline: 0;
            top: 0;
            height: ${e.lineWidthBold||2}px;
            background: var(--kd-kpi-accent, var(--kd-primary));
        }

        .kd-kpi__head,
        .kd-kpi__footer {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: ${e.marginSM}px;
        }

        .kd-kpi__head .ant-typography,
        .kd-kpi__footer > .ant-typography {
            font-size: ${e.fontSizeSM}px;
        }

        .kd-kpi__accent {
            width: ${e.sizeXXS}px;
            height: ${e.sizeXXS}px;
            border-radius: 999px;
            background: var(--kd-kpi-accent, var(--kd-primary));
            flex: 0 0 auto;
        }

        .kd-kpi__value {
            display: block;
            margin-top: ${e.marginXS}px;
            color: var(--kd-text);
            font-size: var(--kd-metric);
            line-height: 1.2;
            font-weight: ${e.fontWeightStrong};
            letter-spacing: -0.02em;
            overflow-wrap: anywhere;
        }

        .kd-kpi__footer {
            margin-top: ${e.marginSM}px;
        }

        .kd-kpi__trend {
            width: 44%;
            min-width: 72px;
            height: 38px;
        }

        .kd-kpi__dash {
            width: 100%;
            height: 100%;
            display: grid;
            place-items: center;
            color: var(--kd-subtle);
        }

        .kd-performance.ant-card,
        .kd-attention.ant-card {
            height: 100%;
        }

        .kd-performance > .ant-card-body {
            display: flex;
            flex-direction: column;
            min-height: 0;
        }

        .kd-performance__stats {
            display: grid;
            grid-template-columns: repeat(3, minmax(0, 1fr));
            gap: ${e.marginSM}px;
            margin-bottom: ${e.marginSM}px;
        }

        .kd-performance__stats > div {
            min-width: 0;
            display: grid;
            gap: ${e.marginXXS}px;
            padding: ${e.paddingSM}px ${e.padding}px;
            border: ${e.lineWidth}px solid var(--kd-border);
            border-radius: var(--kd-radius-sm);
            background: var(--kd-soft);
        }

        .kd-performance__stats .ant-typography {
            font-size: ${e.fontSizeSM}px;
        }

        .kd-performance__stats strong {
            font-size: ${e.fontSizeLG}px;
            font-weight: ${e.fontWeightStrong};
            color: var(--kd-text);
            overflow-wrap: anywhere;
        }

        .kd-performance__chart {
            flex: 0 0 auto;
            height: 310px;
            min-width: 0;
        }

        .kd-performance__insight {
            display: flex;
            align-items: flex-start;
            gap: ${e.marginXS}px;
            margin-top: ${e.marginSM}px;
            padding-top: ${e.paddingSM}px;
            border-top: ${e.lineWidth}px solid var(--kd-grid);
        }

        .kd-performance__insight-dot {
            width: ${e.sizeXXS}px;
            height: ${e.sizeXXS}px;
            margin-top: ${e.marginXXS}px;
            border-radius: 999px;
            background: var(--kd-primary);
            flex: 0 0 auto;
        }

        .kd-signal {
            position: relative;
            display: grid;
            gap: ${e.marginXXS}px;
            min-width: 0;
            padding: ${e.padding}px;
            border: ${e.lineWidth}px solid var(--kd-border);
            border-radius: var(--kd-radius);
            background: var(--kd-card);
            box-shadow: var(--kd-shadow);
        }

        .kd-signal__top {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: ${e.marginXS}px;
        }

        .kd-signal__top .ant-typography,
        .kd-signal__helper.ant-typography {
            font-size: ${e.fontSizeSM}px;
        }

        .kd-signal__dot {
            width: ${e.sizeXXS}px;
            height: ${e.sizeXXS}px;
            border-radius: 999px;
            background: var(--kd-muted);
            flex: 0 0 auto;
        }

        .kd-signal[data-tone='positive'] .kd-signal__dot { background: var(--kd-success); }
        .kd-signal[data-tone='negative'] .kd-signal__dot { background: var(--kd-error); }

        .kd-signal__value {
            color: var(--kd-text);
            font-size: ${e.fontSizeXL}px;
            line-height: ${e.lineHeightLG};
            font-weight: ${e.fontWeightStrong};
            overflow-wrap: anywhere;
        }

        .kd-attention > .ant-card-body {
            padding-top: ${e.paddingXS}px;
        }

        .kd-attention__list {
            display: grid;
        }

        .kd-attention__item {
            width: 100%;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: ${e.marginSM}px;
            padding: ${e.padding}px ${e.paddingXS}px;
            border: 0;
            border-bottom: ${e.lineWidth}px solid var(--kd-grid);
            border-radius: var(--kd-radius-xs);
            background: transparent;
            color: var(--kd-text);
            text-align: start;
            font: inherit;
            cursor: pointer;
            transition: background ${e.motionDurationFast};
        }

        .kd-attention__item:last-child { border-bottom-color: transparent; }
        .kd-attention__item:hover { background: var(--kd-hover); }
        .kd-attention__item:focus-visible { outline: ${e.lineWidthFocus}px solid var(--kd-primary); outline-offset: 1px; }

        .kd-attention__copy {
            display: grid;
            gap: ${e.marginXXS}px;
            min-width: 0;
        }

        .kd-attention__copy b {
            font-weight: ${e.fontWeightStrong};
        }

        .kd-attention__copy small {
            color: var(--kd-muted);
            font-size: ${e.fontSizeSM}px;
        }

        .kd-attention__value {
            display: flex;
            align-items: center;
            gap: ${e.marginXS}px;
            flex: 0 0 auto;
        }

        .kd-attention__value strong { font-weight: ${e.fontWeightStrong}; }
        .kd-attention__value .anticon { color: var(--kd-subtle); font-size: ${e.fontSizeSM}px; }

        .kd-attention__empty {
            min-height: 230px;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: ${e.marginSM}px;
            padding: ${e.paddingLG}px;
            text-align: left;
        }

        .kd-attention__empty > .anticon {
            color: var(--kd-success);
            font-size: ${e.fontSizeHeading4}px;
        }

        .kd-attention__empty > div {
            display: grid;
            gap: ${e.marginXXS}px;
        }

        .kd-donut,
        .kd-chart-standard {
            height: 270px;
        }

        .kd-chart-compact {
            height: 220px;
        }

        .kd-section {
            display: grid;
            gap: ${e.marginSM}px;
        }

        .kd-section__head {
            display: flex;
            align-items: flex-end;
            justify-content: space-between;
            gap: ${e.margin}px;
        }

        .kd-section__head > div {
            display: grid;
            gap: ${e.marginXXS}px;
        }

        .kd-section__head .ant-typography { margin: 0; }

        .kd-module.ant-card .ant-card-body {
            display: flex;
            flex-direction: column;
            height: 100%;
        }

        .kd-module__head {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: ${e.marginXS}px;
            min-height: var(--kd-control);
            padding-bottom: ${e.paddingSM}px;
            border-bottom: ${e.lineWidth}px solid var(--kd-grid);
        }

        .kd-module__head .ant-btn {
            padding-inline: 0;
        }

        .kd-module__primary {
            display: grid;
            gap: ${e.marginXXS}px;
            padding-block: ${e.padding}px;
        }

        .kd-module__primary strong {
            color: var(--kd-text);
            font-size: ${e.fontSizeHeading4}px;
            line-height: ${e.lineHeightHeading4};
            font-weight: ${e.fontWeightStrong};
            overflow-wrap: anywhere;
        }

        .kd-module__facts {
            display: grid;
            gap: ${e.marginXS}px;
            margin-top: auto;
        }

        .kd-module__facts span {
            display: flex;
            align-items: baseline;
            justify-content: space-between;
            gap: ${e.marginXS}px;
        }

        .kd-module__facts small {
            color: var(--kd-muted);
            font-size: ${e.fontSizeSM}px;
        }

        .kd-module__facts b {
            color: var(--kd-text);
            font-weight: ${e.fontWeightStrong};
            text-align: end;
        }

        .kd-bank-list {
            display: grid;
        }

        .kd-bank-row {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: ${e.marginSM}px;
            padding-block: ${e.padding}px;
            border-bottom: ${e.lineWidth}px solid var(--kd-grid);
        }

        .kd-bank-row:first-child { padding-top: 0; }
        .kd-bank-row:last-child { padding-bottom: 0; border-bottom: 0; }

        .kd-bank-row__copy,
        .kd-bank-row__amount {
            display: grid;
            gap: ${e.marginXXS}px;
            min-width: 0;
        }

        .kd-bank-row__copy .ant-typography,
        .kd-bank-row__amount .ant-typography {
            font-size: ${e.fontSizeSM}px;
        }

        .kd-bank-row__amount {
            flex: 0 0 auto;
            text-align: end;
        }

        .kd-table-card .ant-table-wrapper {
            margin-inline: -${e.paddingLG}px;
            margin-bottom: -${e.paddingLG}px;
        }

        .kd-table-card .ant-table {
            border-top: ${e.lineWidth}px solid var(--kd-grid);
        }

        .kd-table-card .ant-table-thead > tr > th {
            color: var(--kd-muted);
            font-size: ${e.fontSizeSM}px;
            font-weight: ${e.fontWeightStrong};
            background: var(--kd-soft);
        }

        .kd-table-card .ant-table-tbody > tr > td {
            border-bottom-color: var(--kd-grid);
        }

        .kd-table-link.ant-btn {
            height: auto;
            padding: 0;
            font-weight: ${e.fontWeightStrong};
        }

        .kd-row--click { cursor: pointer; }
        .kd-row--click:hover > td { background: var(--kd-hover) !important; }

        .kd-tip {
            min-width: 180px;
            padding: ${e.paddingSM}px;
            border: ${e.lineWidth}px solid var(--kd-border);
            border-radius: var(--kd-radius-sm);
            background: var(--kd-elevated);
            box-shadow: var(--kd-shadow-strong);
        }

        .kd-tip__title.ant-typography {
            font-size: ${e.fontSizeSM}px;
        }

        .kd-tip__row {
            display: grid;
            grid-template-columns: ${e.sizeXXS}px 1fr auto;
            align-items: center;
            gap: ${e.marginXS}px;
            margin-top: ${e.marginXXS}px;
        }

        .kd-tip__row > span:first-child {
            width: ${e.sizeXXS}px;
            height: ${e.sizeXXS}px;
            border-radius: 999px;
        }

        .kd-empty {
            min-height: 180px;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: ${e.padding}px;
            text-align: center;
        }

        .kd-empty--compact { min-height: 120px; }

        .kd-empty .ant-empty-description { display: none; }
        .kd-empty .ant-typography { margin: 0; }
        .kd-empty .ant-empty-footer { margin-top: ${e.marginXS}px; }
        .kd-empty .ant-empty-footer .ant-typography { display: block; font-size: ${e.fontSizeSM}px; }

        .kd-skeleton {
            display: flex;
            flex-direction: column;
            gap: ${e.marginLG}px;
        }

        @media (max-width: 1280px) {
            .kd-focus-grid { grid-template-columns: minmax(0, 1.55fr) minmax(280px, 0.9fr); }
            .kd-signal-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
        }

        @media (max-width: 1050px) {
            .kd { padding: ${e.padding}px; }
            .kd-kpi-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
            .kd-focus-grid,
            .kd-cash-expense-row,
            .kd-row-2 { grid-template-columns: minmax(0, 1fr); }
            .kd-modules__grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
            .kd-intro { align-items: flex-start; flex-direction: column; }
            .kd-context { width: 100%; }
            .kd-context__item { flex: 1 1 0; min-width: 0; }
        }

        @media (max-width: 760px) {
            .kd-hdr {
                align-items: flex-start;
                flex-direction: column;
            }

            .kd-hdr__ctl {
                width: 100%;
                flex-wrap: wrap;
                justify-content: flex-start;
            }

            .kd-hdr__branch,
            .kd-hdr__range {
                flex: 1 1 220px;
                width: auto;
                min-width: 0;
            }

            .kd-kpi-grid,
            .kd-signal-grid,
            .kd-modules__grid {
                grid-template-columns: minmax(0, 1fr);
            }

            .kd-performance__stats {
                grid-template-columns: minmax(0, 1fr);
            }

            .kd-performance__chart { height: 260px; }
            .kd-donut, .kd-chart-standard { height: 240px; }
        }

        @media (max-width: 520px) {
            .kd { padding: ${e.paddingSM}px; }
            .kd-wrap { gap: ${e.margin}px; }
            .kd-intro { padding: ${e.padding}px; }
            .kd-context { flex-direction: column; }
            .kd-context__item + .kd-context__item {
                border-inline-start: 0;
                border-top: ${e.lineWidth}px solid var(--kd-border);
            }
            .kd-card.ant-card .ant-card-head,
            .kd-card.ant-card .ant-card-body { padding-inline: ${e.padding}px; }
            .kd-table-card .ant-table-wrapper {
                margin-inline: -${e.padding}px;
                margin-bottom: -${e.paddingLG}px;
            }
            .kd-kpi__trend { width: 40%; }
        }
    `})}export{ve as default};