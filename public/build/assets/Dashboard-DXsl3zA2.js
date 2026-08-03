import{i as e}from"./rolldown-runtime-aKtaBQYM.js";import{t}from"./axios-BQPRRFHk.js";import{i as n,o as r,t as i}from"./index.esm-CtIVDvdE.js";import{r as a,t as o}from"./jsx-runtime-RbF_zoRI.js";import{t as s}from"./table-BMDeAgZR.js";import{t as c}from"./alert-CXVdfG0X.js";import{t as l}from"./typography-BTjN9rxU.js";import{t as u}from"./skeleton-DWMEFrf7.js";import{t as d}from"./select-IWcNEzUl.js";import{t as f}from"./empty-BOJtdRz7.js";import{t as p}from"./tooltip-Drai6xQt.js";import{t as m}from"./button-DdnyfjyJ.js";import{t as h}from"./dayjs.min-BRtZKQ04.js";import{t as g}from"./date-picker-CxDyWGnc.js";import{t as _}from"./card-DPJCOPMC.js";import{t as v}from"./ReloadOutlined-CMtviqc6.js";import{l as y,r as b}from"./app-TV59OP20.js";import{t as x}from"./AuthenticatedLayout-Bw13pkt-.js";import{M as S,l as C,m as w,tn as T,u as E}from"./CartesianChart-Cbve2Etq.js";import{t as D}from"./Legend-BhWmwVYj.js";import{n as O,t as k}from"./LineChart-BMJx0pTa.js";var A=e(a(),1),j=e(h(),1),M=o(),{RangePicker:N}=g,{Text:P,Title:F}=l,I=`-`,L={primary:`var(--kd-primary)`,primaryActive:`var(--kd-primary-active)`,success:`var(--kd-success)`,warning:`var(--kd-warning)`,error:`var(--kd-error)`,info:`var(--kd-info)`,text:`var(--kd-text)`,muted:`var(--kd-muted)`};L.primary,L.success,L.warning,L.info,L.primaryActive,L.error,L.muted;var R=(e,t={})=>{try{return new Intl.NumberFormat(e,t)}catch{return new Intl.NumberFormat(`en-US`,t)}},z=R(`en-NP`,{style:`currency`,currency:`NPR`,maximumFractionDigits:0}),B=R(`en-NP`,{style:`currency`,currency:`NPR`,notation:`compact`,maximumFractionDigits:1}),V=R(`en-NP`),H=(e,t)=>e==null||e===``?I:(t?B:z).format(Number(e||0)),U=e=>e==null||e===``?I:V.format(Number(e||0)),W=e=>e?(0,j.default)(e).format(`DD MMM YYYY`):I,G=e=>Number(e||0),K=e=>{e&&e!==`#`&&n.visit(e)},q=e=>e?(0,j.default)(e).format(`YYYY-MM-DD`):void 0,J=(e={})=>{let t=e.current_fiscal_year||e.currentFiscalYear||{};return{date_from:q(t.start_date)||(0,j.default)().startOf(`month`).format(`YYYY-MM-DD`),date_to:q(t.end_date)||(0,j.default)().format(`YYYY-MM-DD`)}},Y=e=>e==null||e===``?I:B.format(Number(e||0));function X(e){if(!e||e.length<6)return null;let t=Math.floor(e.length/2),n=e.slice(0,t),r=e.slice(t),i=n.reduce((e,t)=>e+G(t.value),0),a=r.reduce((e,t)=>e+G(t.value),0);return i===0?a>0?100:null:(a-i)/Math.abs(i)*100}function Z(){let e=b(),{token:n}=y.useToken(),a=r().props.branchContext||{},[o,s]=(0,A.useState)(!0),[l,u]=(0,A.useState)(null),[d,f]=(0,A.useState)({}),[p,h]=(0,A.useState)(()=>({branch_id:a.selectedBranchId||`all`,...J(a)})),g=(0,A.useCallback)(async()=>{s(!0),u(null);try{let e=await t.get(`/dashboard-data`,{params:{branch_id:p.branch_id===`all`?void 0:p.branch_id,date_from:p.date_from,date_to:p.date_to}});f(e.data||{})}catch(t){u(t?.response?.data?.message||e(`Unable to load dashboard data.`))}finally{s(!1)}},[p,e]);(0,A.useEffect)(()=>{g()},[g]);let _=(0,A.useMemo)(()=>ce(d),[d]);return(0,M.jsxs)(x,{header:(0,M.jsx)(ne,{branches:d.branches||a.branches||[],filters:p,loading:o,onRefresh:g,onChange:h}),children:[(0,M.jsx)(i,{title:e(`Dashboard`)}),(0,M.jsx)(ue,{token:n}),(0,M.jsx)(`main`,{className:`kd`,children:(0,M.jsxs)(`div`,{className:`kd-wrap`,children:[l&&(0,M.jsx)(c,{showIcon:!0,type:`error`,message:e(`Dashboard could not be loaded`),description:l,action:(0,M.jsx)(m,{onClick:g,children:e(`Retry`)})}),o?(0,M.jsx)(se,{}):(0,M.jsxs)(M.Fragment,{children:[(0,M.jsx)(`section`,{className:`kd-signal-grid`,children:_.signalCards.map(e=>(0,M.jsx)(ee,{card:e},e.key))}),(0,M.jsxs)(`section`,{className:`kd-focus-grid`,children:[(0,M.jsx)(re,{data:_.chartData,summary:_.executive}),(0,M.jsx)(te,{summary:_.cashPosition,items:_.attentionItems})]}),_.bizCards.length>0&&(0,M.jsx)(ae,{cards:_.bizCards}),(0,M.jsx)(oe,{transactions:_.transactions})]})]})})]})}function ee({card:e}){return(0,M.jsx)(_,{className:`kd-card kd-signal`,style:{"--kd-accent":e.color},styles:{body:{padding:0}},children:(0,M.jsxs)(`div`,{className:`kd-signal__body`,children:[(0,M.jsx)(`div`,{className:`kd-signal__top`,children:(0,M.jsx)(P,{type:`secondary`,className:`kd-signal__label`,children:e.label})}),(0,M.jsx)(`div`,{className:`kd-signal__value`,children:H(e.value)}),(0,M.jsx)(P,{type:`secondary`,className:`kd-signal__helper`,children:e.helper})]})})}function te({summary:e,items:t}){let n=t.slice(0,4);return(0,M.jsxs)(_,{className:`kd-card kd-attention`,styles:{body:{padding:0}},children:[(0,M.jsxs)(`div`,{className:`kd-section-head`,children:[(0,M.jsxs)(`div`,{children:[(0,M.jsx)(`span`,{className:`kd-card-hdr__t`,children:`Attention`}),(0,M.jsx)(P,{type:`secondary`,children:`Items worth reviewing`})]}),(0,M.jsx)(`span`,{className:`kd-status ${n.length?`kd-status--warn`:`kd-status--good`}`,children:n.length?`${n.length} open`:`All clear`})]}),(0,M.jsxs)(`div`,{className:`kd-liquidity`,children:[(0,M.jsxs)(`div`,{children:[(0,M.jsx)(P,{type:`secondary`,children:`Net liquidity`}),(0,M.jsx)(`strong`,{children:H(e.netLiquidity)})]}),(0,M.jsxs)(P,{type:`secondary`,children:[`Cash & bank `,Y(e.cashBankBalance)]})]}),(0,M.jsx)(`div`,{className:`kd-attention__list`,children:n.length?n.map(e=>(0,M.jsxs)(`button`,{type:`button`,className:`kd-attention__item`,onClick:()=>K(e.href),children:[(0,M.jsxs)(`span`,{children:[(0,M.jsx)(`b`,{children:e.label}),(0,M.jsx)(`small`,{children:e.module})]}),(0,M.jsx)(`strong`,{children:e.format===`money`?H(e.value,!0):U(e.value)})]},e.key)):(0,M.jsxs)(`div`,{className:`kd-attention__empty`,children:[(0,M.jsx)(`span`,{className:`kd-health-dot kd-health-dot--good`}),(0,M.jsx)(P,{type:`secondary`,children:`No overdue or exceptional items`})]})})]})}function ne({branches:e,filters:t,loading:n,onRefresh:r,onChange:i}){let a=[{value:`all`,label:`All branches`},...(e||[]).map(e=>({value:e.value??e.id,label:e.label??e.name??`Branch #${e.id}`}))];return(0,M.jsxs)(`div`,{className:`kd-hdr`,children:[(0,M.jsxs)(`div`,{children:[(0,M.jsx)(F,{level:5,style:{margin:`0 0 1px`,fontWeight:650},children:`Dashboard`}),(0,M.jsx)(P,{type:`secondary`,style:{fontSize:11},children:`Financial overview for the selected fiscal period`})]}),(0,M.jsxs)(`div`,{className:`kd-hdr__ctl`,children:[(0,M.jsx)(d,{value:t.branch_id,options:a,style:{width:150},onChange:e=>i(t=>({...t,branch_id:e||`all`}))}),(0,M.jsx)(N,{value:t.date_from&&t.date_to?[(0,j.default)(t.date_from),(0,j.default)(t.date_to)]:null,style:{width:230},onChange:e=>i(t=>({...t,date_from:e?.[0]?.format(`YYYY-MM-DD`),date_to:e?.[1]?.format(`YYYY-MM-DD`)}))}),(0,M.jsx)(p,{title:`Refresh`,children:(0,M.jsx)(m,{size:`small`,icon:(0,M.jsx)(v,{spin:n}),onClick:r})})]})]})}function re({data:e,summary:t}){let n=e.some(e=>G(e.revenue)||G(e.expenses)||G(e.profit));return(0,M.jsxs)(_,{className:`kd-card kd-chart-main kd-performance`,styles:{body:{padding:0}},children:[(0,M.jsxs)(`div`,{className:`kd-performance__head`,children:[(0,M.jsxs)(`div`,{children:[(0,M.jsx)(`span`,{className:`kd-card-hdr__t`,children:`Financial performance`}),(0,M.jsx)(P,{type:`secondary`,style:{fontSize:11,display:`block`},children:`Revenue, expenses & net profit trend`})]}),(0,M.jsxs)(`div`,{className:`kd-performance__stats`,children:[(0,M.jsxs)(`span`,{children:[`Revenue `,(0,M.jsx)(`b`,{children:Y(t.revenue)})]}),(0,M.jsxs)(`span`,{children:[`Expenses `,(0,M.jsx)(`b`,{children:Y(t.expenses)})]}),(0,M.jsxs)(`span`,{children:[`Profit `,(0,M.jsx)(`b`,{children:Y(t.netProfit)})]})]})]}),n?(0,M.jsx)(`div`,{className:`kd-performance__chart`,children:(0,M.jsx)(T,{width:`100%`,height:`100%`,children:(0,M.jsxs)(k,{data:e,margin:{top:4,right:10,bottom:0,left:0},children:[(0,M.jsx)(w,{stroke:`var(--kd-grid)`,vertical:!1}),(0,M.jsx)(E,{dataKey:`label`,axisLine:!1,tickLine:!1,tick:{fill:`var(--kd-muted)`,fontSize:9}}),(0,M.jsx)(C,{axisLine:!1,tickLine:!1,tick:{fill:`var(--kd-muted)`,fontSize:9},tickFormatter:e=>B.format(e),width:58}),(0,M.jsx)(S,{content:(0,M.jsx)(ie,{})}),(0,M.jsx)(D,{iconType:`circle`,iconSize:7,wrapperStyle:{fontSize:11,paddingTop:4}}),(0,M.jsx)(O,{type:`monotone`,dataKey:`revenue`,name:`Revenue`,stroke:L.primary,strokeWidth:1.8,dot:!1,activeDot:{r:3}}),(0,M.jsx)(O,{type:`monotone`,dataKey:`expenses`,name:`Expenses`,stroke:L.warning,strokeWidth:1.8,dot:!1,activeDot:{r:3}}),(0,M.jsx)(O,{type:`monotone`,dataKey:`profit`,name:`Net Profit`,stroke:L.text,strokeWidth:1.8,dot:!1,activeDot:{r:3}})]})})}):(0,M.jsx)($,{title:`No financial data`,desc:`Revenue and expense activity will appear here.`})]})}function ie({active:e,payload:t,label:n}){return!e||!t?.length?null:(0,M.jsxs)(`div`,{className:`kd-tip`,children:[(0,M.jsx)(P,{strong:!0,style:{fontSize:11},children:n}),t.map(e=>(0,M.jsxs)(`div`,{className:`kd-tip__row`,children:[(0,M.jsx)(`span`,{style:{background:e.color||e.fill}}),(0,M.jsx)(P,{type:`secondary`,children:e.name}),(0,M.jsx)(P,{children:H(e.value)})]},e.dataKey))]})}function ae({cards:e}){return(0,M.jsxs)(_,{className:`kd-card kd-modules`,styles:{body:{padding:0}},children:[(0,M.jsx)(`div`,{className:`kd-section-head`,children:(0,M.jsxs)(`div`,{children:[(0,M.jsx)(`span`,{className:`kd-card-hdr__t`,children:`Modules`}),(0,M.jsx)(P,{type:`secondary`,children:`Key operating numbers at a glance`})]})}),(0,M.jsx)(`div`,{className:`kd-modules__grid`,children:e.map(e=>{let t=e.items[0];return(0,M.jsxs)(`article`,{className:`kd-module`,children:[(0,M.jsxs)(`div`,{className:`kd-module__head`,children:[(0,M.jsx)(P,{strong:!0,children:e.title}),e.href&&(0,M.jsx)(m,{type:`link`,size:`small`,onClick:()=>K(e.href),children:`View`})]}),(0,M.jsxs)(`div`,{className:`kd-module__primary`,children:[(0,M.jsx)(P,{type:`secondary`,children:t?.label}),(0,M.jsx)(`strong`,{children:Q(t)})]}),(0,M.jsx)(`div`,{className:`kd-module__facts`,children:e.items.slice(1,4).map(e=>(0,M.jsxs)(`span`,{children:[(0,M.jsx)(`small`,{children:e.label}),(0,M.jsx)(`b`,{children:Q(e)})]},e.label))})]},e.key)})})]})}function Q(e){return e?e.format===`money`?H(e.value,!0):e.format===`text`?e.value||I:U(e.value):I}function oe({transactions:e}){let t=[{title:`Date`,dataIndex:`date`,render:W,width:110},{title:`Type`,dataIndex:`type`,width:140},{title:`Number`,dataIndex:`number`,render:(e,t)=>t.action_url?(0,M.jsx)(m,{type:`link`,style:{padding:0,fontWeight:600},onClick:e=>{e.stopPropagation(),K(t.action_url)},children:e||I}):e||I},{title:`Party`,dataIndex:`party`,ellipsis:!0,render:e=>e||I},{title:`Amount`,dataIndex:`amount`,align:`right`,render:e=>H(e)},{title:`Status`,dataIndex:`status`,width:100,render:e=>(0,M.jsx)(`span`,{className:`kd-pill`,children:e||`posted`})}];return(0,M.jsxs)(_,{className:`kd-card`,styles:{body:{padding:e.length?0:8}},children:[(0,M.jsxs)(`div`,{className:`kd-card-hdr`,style:{padding:e.length?`8px`:0,borderBottom:e.length?`1px solid var(--kd-grid)`:`none`},children:[(0,M.jsx)(`span`,{className:`kd-card-hdr__t`,children:`Recent Transactions`}),(0,M.jsx)(P,{type:`secondary`,style:{fontSize:11},children:`Latest financial documents`})]}),e.length>0?(0,M.jsx)(s,{rowKey:`key`,columns:t,dataSource:e,pagination:!1,size:`small`,scroll:{x:700},onRow:e=>({onClick:()=>K(e.action_url),className:e.action_url?`kd-row--click`:``})}):(0,M.jsx)($,{title:`No recent transactions`,desc:`Posted documents will appear here.`,compact:!0})]})}function $({title:e,desc:t,compact:n}){return(0,M.jsx)(`div`,{style:{minHeight:n?105:170,display:`flex`,alignItems:`center`,justifyContent:`center`,textAlign:`center`,padding:10},children:(0,M.jsxs)(f,{image:f.PRESENTED_IMAGE_SIMPLE,description:!1,children:[(0,M.jsx)(F,{level:5,style:{margin:`0 0 4px`},children:e}),(0,M.jsx)(P,{type:`secondary`,style:{fontSize:11},children:t})]})})}function se(){return(0,M.jsxs)(`div`,{style:{display:`flex`,flexDirection:`column`,gap:`var(--kd-gap)`},children:[(0,M.jsx)(`div`,{className:`kd-signal-grid`,children:[1,2,3,4].map(e=>(0,M.jsx)(_,{className:`kd-card`,styles:{body:{padding:14}},children:(0,M.jsx)(u,{active:!0,paragraph:{rows:2}})},e))}),(0,M.jsxs)(`div`,{className:`kd-focus-grid`,children:[(0,M.jsx)(_,{className:`kd-card`,children:(0,M.jsx)(u,{active:!0,paragraph:{rows:7}})}),(0,M.jsx)(_,{className:`kd-card`,children:(0,M.jsx)(u,{active:!0,paragraph:{rows:7}})})]}),(0,M.jsx)(_,{className:`kd-card`,children:(0,M.jsx)(u,{active:!0,paragraph:{rows:6}})}),(0,M.jsx)(_,{className:`kd-card`,children:(0,M.jsx)(u,{active:!0,paragraph:{rows:4}})})]})}function ce(e){let t=e.financial_summary||{},n=e.metric_sparklines||{},r=e.revenue_expense_profit_chart||[],i=e.cashflow_chart||[],a=r.map(e=>({date:e.date,label:e.date?(0,j.default)(e.date).format(`DD MMM`):``,revenue:G(e.revenue),expenses:G(e.expenses),profit:G(e.profit)})),o=i.map(e=>({date:e.date,label:e.date?(0,j.default)(e.date).format(`DD MMM`):``,cash_in:G(e.cash_in),cash_out:G(e.cash_out),net:G(e.net)})),s=r.map(e=>({date:e.date,value:G(e.revenue)})),c=r.map(e=>({date:e.date,value:G(e.expenses)})),l=(n.net_profit||[]).map(e=>({date:e.date,value:G(e.value)})),u=(n.cash_bank||[]).map(e=>({date:e.date,value:G(e.value)})),d=(n.receivables||[]).map(e=>({date:e.date,value:G(e.value)})),f=(n.payables||[]).map(e=>({date:e.date,value:G(e.value)})),p={revenue:G(t.revenue),expenses:G(t.expenses),netProfit:G(t.net_profit),receivables:G(t.receivables),payables:G(t.payables),cash:G(t.cash_bank_balance),currency:t.currency||e.currency||`NPR`,margin:G(t.revenue)>0?G(t.net_profit)/G(t.revenue)*100:0,message:G(t.net_profit)>=0?`Revenue is covering costs for this period. Keep an eye on receivables so profit turns into cash.`:`Expenses are ahead of revenue for this period. The fastest wins are collecting receivables and reviewing major costs.`},m=[{key:`revenue`,label:`Revenue`,value:t.revenue,sparkline:s,color:L.primary,trend:X(s),helper:`Approved invoice value`},{key:`profit`,label:`Net profit`,value:t.net_profit,sparkline:l,color:L.success,trend:X(l),helper:`Revenue minus expenses`},{key:`receivables`,label:`Receivables`,value:t.receivables,sparkline:d,color:L.info,helper:`Customer money to collect`},{key:`payables`,label:`Payables`,value:t.payables,sparkline:f,color:L.warning,helper:`Supplier and expense dues`,invertTrend:!0}],h=[{key:`revenue`,label:`Revenue`,value:t.revenue,sparkline:s,color:L.primary,trend:X(s),helper:`This period`},{key:`expenses`,label:`Expenses`,value:t.expenses,sparkline:c,color:L.warning,trend:X(c),invertTrend:!0,helper:`This period`},{key:`profit`,label:`Net Profit`,value:t.net_profit,sparkline:l,color:L.success,trend:X(l)},{key:`cash`,label:`Cash & Bank`,value:t.cash_bank_balance,sparkline:u,color:L.info,trend:X(u),helper:`Available`},{key:`receivables`,label:`Receivables`,value:t.receivables,sparkline:d,color:L.info,helper:`Outstanding`},{key:`payables`,label:`Payables`,value:t.payables,sparkline:f,color:L.error,helper:`Outstanding`}],g=e.expense_breakdown||[],_=le(e.receivable_ageing,e.payable_ageing),v=e.cash_position||{},y={cashBankBalance:G(t.cash_bank_balance??v.cash_bank_balance),receivables:G(t.receivables),payables:G(t.payables),netLiquidity:G(t.cash_bank_balance??v.cash_bank_balance)+G(t.receivables)-G(t.payables)},b=Array.isArray(v.bank_accounts)?v.bank_accounts:[],x=Array.isArray(e.recent_transactions)?e.recent_transactions:[],S=Array.isArray(e.top_customers)?e.top_customers:[],C=Array.isArray(e.top_suppliers)?e.top_suppliers:[],w=[],T=e.sales_summary;T&&w.push({key:`sales`,title:`Sales`,href:`/payment-in/invoices`,linkText:`View invoices`,items:[{label:`Total sales`,value:T.sales_total,format:`money`},{label:`Overdue`,value:T.overdue_amount,format:`money`},{label:`Unpaid`,value:T.unpaid_amount,format:`money`},{label:`Invoices`,value:T.invoice_count},{label:`Paid`,value:T.paid_amount,format:`money`}]});let E=e.purchase_summary;E&&w.push({key:`purchase`,title:`Purchases`,href:`/payment-out/purchase-bills`,linkText:`View bills`,items:[{label:`Total purchases`,value:E.purchase_total,format:`money`},{label:`Total payables`,value:E.total_payables??E.unpaid_amount,format:`money`},{label:`Upcoming`,value:E.upcoming_payables,format:`money`},{label:`Bills`,value:E.bill_count},{label:`Paid`,value:E.paid_amount,format:`money`},{label:`Expense payables`,value:E.expense_payables,format:`money`}]});let D=e.cashflow_summary;if(D){let e=[{label:`Cash in`,value:D.cash_in,format:`money`},{label:`Cash out`,value:D.cash_out,format:`money`},{label:`Net cash flow`,value:D.net_cash_flow,format:`money`}];w.push({key:`cashflow`,title:`Cash Flow`,items:e})}let O=e.inventory_summary;O&&w.push({key:`inventory`,title:`Inventory`,href:`/inventory/products`,linkText:`View`,items:[{label:`Products`,value:O.total_products},{label:`Low stock`,value:O.low_stock_items},{label:`Value`,value:O.inventory_value,format:`money`},{label:`Warehouses`,value:O.warehouse_count}]});let k=e.crm_summary;k&&w.push({key:`crm`,title:`CRM`,href:`/crm`,linkText:`View`,items:[{label:`Open leads`,value:k.open_leads},{label:`Open deals`,value:k.open_deals},{label:`Pipeline`,value:k.pipeline_value,format:`money`},{label:`Won`,value:k.won_value,format:`money`}]});let A=e.hrm_summary;if(A){let e=[{label:`Employees`,value:A.active_employees}];A.on_leave_today>0&&e.push({label:`On leave`,value:A.on_leave_today}),A.attendance_today>0&&e.push({label:`Attendance`,value:A.attendance_today}),A.payroll_this_period>0&&e.push({label:`Payroll`,value:A.payroll_this_period,format:`money`}),w.push({key:`hrm`,title:`HRM`,href:`/hrm/users`,linkText:`View`,items:e})}let M=e.project_summary;if(M){let e=[{label:`Active`,value:M.active_projects},{label:`Completed`,value:M.completed_this_period}];M.overdue_tasks>0&&e.push({label:`Overdue tasks`,value:M.overdue_tasks}),M.billing_value>0&&e.push({label:`Billing`,value:M.billing_value,format:`money`}),w.push({key:`projects`,title:`Projects`,href:`/hrm/projects`,linkText:`View`,items:e})}return{executive:p,signalCards:m,cashPosition:y,attentionItems:[T&&G(T.overdue_amount)>0?{key:`overdue-sales`,module:`Sales`,label:`Overdue invoices`,value:T.overdue_amount,format:`money`,href:`/payment-in/invoices`}:null,E&&G(E.upcoming_payables)>0?{key:`upcoming-payables`,module:`Purchases`,label:`Upcoming payables`,value:E.upcoming_payables,format:`money`,href:`/payment-out/purchase-bills`}:null,O&&G(O.low_stock_items)>0?{key:`low-stock`,module:`Inventory`,label:`Low stock items`,value:O.low_stock_items,href:`/inventory/products`}:null,M&&G(M.overdue_tasks)>0?{key:`overdue-tasks`,module:`Projects`,label:`Overdue tasks`,value:M.overdue_tasks,href:`/hrm/projects`}:null].filter(Boolean),kpis:h,chartData:a,cashflowChart:o,expenseBreakdown:g,ageingData:_,bizCards:w,transactions:x,topCustomers:S,topSuppliers:C,bankAccounts:b,approachingProjects:Array.isArray(e.approaching_deadline_projects)?e.approaching_deadline_projects:[],overdueProjects:Array.isArray(e.overdue_projects)?e.overdue_projects:[]}}function le(e=[],t=[]){let n=new Map,r=[];return(e||[]).forEach(e=>{n.set(e.bucket,{bucket:e.bucket,receivables:G(e.amount),payables:0}),r.push(e.bucket)}),(t||[]).forEach(e=>{let t=n.get(e.bucket);t?t.payables=G(e.amount):(n.set(e.bucket,{bucket:e.bucket,receivables:0,payables:G(e.amount)}),r.push(e.bucket))}),r.filter((e,t,n)=>n.indexOf(e)===t).map(e=>n.get(e))}function ue({token:e}){return(0,M.jsx)(`style`,{children:`
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
            .kd-row-2,
            .kd-row-3 {
                grid-template-columns: minmax(0, 1fr);
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
                .kd-signal-grid,
                .kd-kpis {
                    grid-template-columns: repeat(2, minmax(0, 1fr));
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
        `})}export{Z as default};