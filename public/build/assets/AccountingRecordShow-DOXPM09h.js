import{i as e}from"./rolldown-runtime-aKtaBQYM.js";import{t}from"./axios-BQPRRFHk.js";import{i as n,n as r,t as i}from"./index.esm-CtIVDvdE.js";import{r as a,t as o}from"./jsx-runtime-RbF_zoRI.js";import{t as s}from"./CloseOutlined-DkOIVzB2.js";import{t as c}from"./table-DK2wnZMe.js";import{t as l}from"./alert-CXVdfG0X.js";import{t as ee}from"./typography-BTjN9rxU.js";import{t as u}from"./skeleton-DWMEFrf7.js";import{t as d}from"./select-BHNpiCXT.js";import{t as f}from"./empty-BOJtdRz7.js";import{t as te}from"./dropdown-BkC9qBXY.js";import{t as p}from"./button-DdnyfjyJ.js";import{t as m}from"./dayjs.min-BRtZKQ04.js";import{t as h}from"./tabs-D6mM-bRn.js";import{t as g}from"./card-DkP92y8s.js";import{n as _,t as v}from"./row-3lWxq59F.js";import{t as ne}from"./input-number-6jOzYSyi.js";import{t as y}from"./space-_4B_xOOu.js";import{t as re}from"./drawer-qIW_CdGU.js";import{t as b}from"./FileTextOutlined-B6ownMO3.js";import{t as x}from"./form-B52HFnKB.js";import{t as S}from"./SwapOutlined-DRZNChnF.js";import{t as C}from"./input-D-fdS88J.js";import{t as w}from"./message-Lq1UzMpA.js";import{t as ie}from"./modal-B6mMaOFG.js";import{t as T}from"./tag-Dh3NArqV.js";import{c as E}from"./app-D4CZYYgw.js";import{t as ae}from"./AuthenticatedLayout-OEHjUhv1.js";import{t as oe}from"./ArrowLeftOutlined-CzB-XQhI.js";import{t as D}from"./BankOutlined-DP0-4QOY.js";import{t as se}from"./CheckCircleOutlined-B_TrR1yt.js";import{t as ce}from"./DollarOutlined-CdV6-qfI.js";import{t as O}from"./FileExcelOutlined-IeA2wKg_.js";import{t as le}from"./MoreOutlined-BocTFMVG.js";import{t as ue}from"./PrinterOutlined-B7FgpLcl.js";import{t as k}from"./SafetyCertificateOutlined-DyQWwOLo.js";import{n as A,r as de,t as j}from"./currency-C34x0B2L.js";import{t as fe}from"./PrintableComponent-DPQw3Fzm.js";import{t as pe}from"./Transactions-Bl2L_Jgf.js";import{t as me}from"./BusinessRuleApprovalModal-BWJWbM-h.js";var M=e(a(),1),N=e(m(),1),P=o(),{Text:F,Title:he}=ee,{useToken:ge}=E,I=``,L=e=>`${I}${e}`,R=()=>{let e=localStorage.getItem(`accessToken`);return{Accept:`application/json`,"Content-Type":`application/json`,...e?{Authorization:`Bearer ${e}`}:{}}},z=(e,t=null,n=`#`)=>{try{if(typeof route==`function`)return t==null?route(e):route(e,t)}catch{return n}return n},B=(e=``)=>String(e).replace(/_/g,` `).replace(/([a-z])([A-Z])/g,`$1 $2`).replace(/\b\w/g,e=>e.toUpperCase()),_e=e=>String(e??``).replaceAll(`&`,`&amp;`).replaceAll(`<`,`&lt;`).replaceAll(`>`,`&gt;`).replaceAll(`"`,`&quot;`).replaceAll(`'`,`&#039;`),V=(e,t,n=``)=>t?String(t).split(`.`).reduce((e,t)=>e==null?n:e[t],e)??n:n,ve=(e=null)=>e?.address||[e?.address_line_1,e?.address_line_2,e?.city,e?.state,e?.postal_code,e?.country].filter(Boolean).join(`, `),ye=(e,t)=>{let n=(e,n,r=``)=>V(e,n,void 0)??V(t,n,r),r=(e,i=t)=>String(e||``).replace(/{{([#^])([\w.]+)}}([\s\S]*?){{\/\2}}/g,(e,a,o,s)=>{let c=n(i,o,null),l=Array.isArray(c)?c.length>0:!!c;return a===`^`?l?``:r(s,i):Array.isArray(c)?c.map((e,n)=>r(s,{...t,...e||{},"@index":n+1})).join(``):l?r(s,typeof c==`object`?{...t,...c}:i):``}).replace(/{{\s*([^}]+)\s*}}/g,(e,t)=>_e(n(i,t.trim(),``)));return r(e)},H=(e,t=!1)=>{if(!e)return`-`;let n=(0,N.default)(e);return n.isValid()?n.format(t?`MMM D, YYYY HH:mm`:`DD-MM-YYYY`):e},U=e=>e==null||e===``?`-`:typeof e==`boolean`?e?`Yes`:`No`:e,be=e=>/bank/i.test(e)?`bank`:/cash/i.test(e)?`cash`:/chart/i.test(e)?`chart`:/journal/i.test(e)?`journal`:/loan/i.test(e)?`loan`:`generic`,xe=(e,t)=>({asset:t.colorPrimary,liability:t.colorWarning,equity:t.colorInfo,income:t.colorSuccess,expense:t.colorError})[String(e||``).toLowerCase()]||t.colorPrimary,Se=(e,t,n)=>({bank:n.colorPrimary,cash:n.colorSuccess,chart:xe(t?.type,n),journal:n.colorSuccess,loan:n.colorWarning,generic:n.colorPrimary})[e]||n.colorPrimary,W=e=>({bank:(0,P.jsx)(D,{}),cash:(0,P.jsx)(S,{}),chart:(0,P.jsx)(k,{}),journal:(0,P.jsx)(b,{}),loan:(0,P.jsx)(ce,{})})[e]||(0,P.jsx)(b,{});function G({title:e,extra:t,children:n}){return(0,P.jsx)(g,{className:`accounting-show__card`,title:e,extra:t,children:n})}function K({label:e,value:t,action:n,tone:r=`primary`}){return(0,P.jsxs)(g,{className:`accounting-show__metric accounting-show__metric--${r}`,style:{"--metric-color":`var(--accounting-show-${r})`},children:[(0,P.jsx)(F,{type:`secondary`,children:e}),(0,P.jsx)(`strong`,{children:t}),n?(0,P.jsx)(`div`,{className:`accounting-show__metric-action`,children:n}):null]})}function q({rows:e=[],columns:t=2}){let n=e.filter(Boolean),r=[];for(let e=0;e<n.length;e+=t)r.push(n.slice(e,e+t));return n.length?(0,P.jsx)(`table`,{className:`accounting-show__info-table`,children:(0,P.jsx)(`tbody`,{children:r.map((e,n)=>(0,P.jsx)(`tr`,{children:Array.from({length:t}).map((t,n)=>{let r=e[n];return(0,P.jsxs)(M.Fragment,{children:[(0,P.jsx)(`th`,{children:r?.label||``}),(0,P.jsx)(`td`,{children:r?U(r.value):``})]},n)})},n))})}):(0,P.jsx)(f,{image:f.PRESENTED_IMAGE_SIMPLE,description:`No details available`})}function Ce({rows:e=[]}){return(0,P.jsx)(`div`,{className:`accounting-show__rail-table`,children:e.filter(Boolean).map(e=>(0,P.jsxs)(`div`,{className:`accounting-show__rail-row`,children:[(0,P.jsx)(`div`,{className:`accounting-show__rail-label`,children:e.label}),(0,P.jsx)(`div`,{className:`accounting-show__rail-value`,children:U(e.value)})]},e.label))})}function we({record:e}){return e?.active===!1?(0,P.jsx)(T,{children:`Inactive`}):e?.approved===!0?(0,P.jsx)(T,{color:`success`,children:`Approved`}):e?.approved===!1?(0,P.jsx)(T,{color:`warning`,children:`Not Approved`}):e?.status?(0,P.jsx)(T,{color:e.status===`posted`?`success`:`processing`,children:B(e.status)}):(0,P.jsx)(T,{color:`processing`,children:`Active`})}function Te({module:e,record:t,recordTitle:n,subtitle:r,title:i,formatMoney:a,token:o}){let s=Se(e,t,o),c=t?.amount??t?.balance??t?.total_amount??t?.total??t?.current_balance??t?.opening_balance??0;return(0,P.jsx)(`aside`,{className:`accounting-show__rail`,children:(0,P.jsxs)(g,{className:`accounting-show__rail-card`,style:{"--module-color":s},children:[(0,P.jsxs)(`div`,{className:`accounting-show__entity`,children:[(0,P.jsx)(`div`,{className:`accounting-show__icon`,children:W(e)}),(0,P.jsxs)(`div`,{className:`accounting-show__entity-text`,children:[(0,P.jsx)(he,{level:4,children:n}),(0,P.jsx)(F,{type:`secondary`,children:r||i})]})]}),(0,P.jsxs)(`div`,{className:`accounting-show__amount`,children:[(0,P.jsx)(F,{type:`secondary`,children:`Amount`}),(0,P.jsx)(`strong`,{children:a(c)})]}),(0,P.jsx)(Ce,{rows:[{label:`Status`,value:(0,P.jsx)(we,{record:t})},{label:`Branch`,value:j(t?.branch)},{label:`Approved By`,value:j(t?.approvedBy||t?.approved_by)},{label:`Approved At`,value:H(t?.approved_at,!0)},{label:`Created`,value:H(t?.created_at,!0)},{label:`Updated`,value:H(t?.updated_at,!0)}]})]})})}function Ee({record:e,formatMoney:t}){let[n,i]=(0,M.useState)({date_from:``,date_to:``,status:``,approved:``}),a=(e?.recent_transactions||[]).filter(e=>!(n.date_from&&(0,N.default)(e.voucher_date).isBefore((0,N.default)(n.date_from),`day`)||n.date_to&&(0,N.default)(e.voucher_date).isAfter((0,N.default)(n.date_to),`day`)||n.status&&e.status!==n.status||n.approved!==``&&String(!!e.approved)!==n.approved));return(0,P.jsxs)(P.Fragment,{children:[(0,P.jsx)(G,{title:`Overview`,children:(0,P.jsx)(q,{rows:[{label:`Name`,value:e?.name},{label:`Code`,value:e?.code},{label:`Type`,value:B(e?.type||`-`)},{label:`Parent Account`,value:e?.parent?(0,P.jsx)(r,{href:z(`accounting.chart-of-accounts.show`,e.parent.id,`/accounting/chart-of-accounts/${e.parent.id}`),children:j(e.parent)}):`-`},{label:`Branch`,value:j(e?.branch)},{label:`Status`,value:e?.active?`Active`:`Inactive`},{label:`Created Date`,value:H(e?.created_at,!0)},{label:`Updated Date`,value:H(e?.updated_at,!0)},{label:`Amount / Balance`,value:t(e?.amount??e?.balance??0)},{label:`Description`,value:e?.description}]})}),(0,P.jsxs)(G,{title:`Recent Transactions`,extra:(0,P.jsx)(p,{size:`small`,icon:(0,P.jsx)(O,{}),onClick:()=>{let t=[[`Voucher number`,`Voucher date`,`Description`,`Debit`,`Credit`,`Net movement`,`Voucher status`,`Approval status`,`Branch`],...a.map(e=>[e.voucher_no||``,e.voucher_date||``,e.description||``,e.debit||0,e.credit||0,e.net_movement||0,e.status||``,e.approval_status||``,j(e.branch)])].map(e=>e.map(e=>`"${String(e).replace(/"/g,`""`)}"`).join(`,`)).join(`
`),n=new Blob([t],{type:`text/csv;charset=utf-8;`}),r=URL.createObjectURL(n),i=document.createElement(`a`);i.href=r,i.download=`${e?.code||`chart-of-account`}-transactions.csv`,i.click(),URL.revokeObjectURL(r)},children:`Export CSV`}),children:[(0,P.jsxs)(y,{wrap:!0,className:`accounting-show__filters`,children:[(0,P.jsx)(C,{type:`date`,value:n.date_from,onChange:e=>i(t=>({...t,date_from:e.target.value}))}),(0,P.jsx)(C,{type:`date`,value:n.date_to,onChange:e=>i(t=>({...t,date_to:e.target.value}))}),(0,P.jsx)(d,{allowClear:!0,placeholder:`Status`,value:n.status||void 0,onChange:e=>i(t=>({...t,status:e||``})),style:{width:150},options:[{value:`draft`,label:`Draft`},{value:`posted`,label:`Posted`},{value:`cancelled`,label:`Cancelled`}]}),(0,P.jsx)(d,{placeholder:`Approval`,value:n.approved,onChange:e=>i(t=>({...t,approved:e})),style:{width:170},options:[{value:``,label:`All approvals`},{value:`true`,label:`Approved`},{value:`false`,label:`Not Approved`}]})]}),(0,P.jsx)(c,{size:`small`,scroll:{x:1100},rowClassName:(e,t)=>t%2==0?`accounting-show__table-row`:`accounting-show__table-row is-alt`,columns:[{title:`Voucher Number`,dataIndex:`voucher_no`,width:150,render:(e,t)=>t.journal_voucher_id?(0,P.jsx)(r,{href:z(`accounting.journal-vouchers.show`,t.journal_voucher_id,`/accounting/journal-vouchers/${t.journal_voucher_id}`),children:e||`-`}):e||`-`},{title:`Voucher Date`,dataIndex:`voucher_date`,width:130,render:H},{title:`Description`,dataIndex:`description`,width:220,render:e=>e||`-`},{title:`Debit`,dataIndex:`debit`,width:120,align:`right`,render:t},{title:`Credit`,dataIndex:`credit`,width:120,align:`right`,render:t},{title:`Net Movement`,dataIndex:`net_movement`,width:140,align:`right`,render:t},{title:`Voucher Status`,dataIndex:`status`,width:130,render:e=>e||`-`},{title:`Approval Status`,dataIndex:`approval_status`,width:140,render:e=>(0,P.jsx)(T,{color:e===`Approved`?`success`:`warning`,children:e||`Not Approved`})},{title:`Branch`,dataIndex:`branch`,width:150,render:j}],dataSource:a,rowKey:(e,t)=>e?.id||t,pagination:{pageSize:10},locale:{emptyText:(0,P.jsx)(f,{description:`No recent transactions`})}})]})]})}function De({record:e,formatMoney:t,currency:r}){let i=e?.statement_balance??e?.opening_balance??0,a=e?.software_ledger_balance??e?.current_balance??e?.opening_balance??0,o=e?.reconciliation_difference??Math.abs(A(i)-A(a)),s=A(o)<.01,l=e?.bank_transactions||[];return(0,P.jsxs)(P.Fragment,{children:[(0,P.jsx)(G,{title:`Bank Account`,children:(0,P.jsx)(q,{rows:[{label:`Display Name`,value:e?.display_name},{label:`Bank Name`,value:e?.bank_name||(e?.type===`cash`?`Cash Account`:`-`)},{label:`Account Name`,value:e?.account_name},{label:`Account Number`,value:e?.account_number},{label:`Account Type`,value:e?.account_type||B(e?.type||`-`)},{label:`Currency`,value:j(e?.currency)},{label:`Branch`,value:j(e?.branch)},{label:`Code`,value:e?.code},{label:`Swift Code`,value:e?.swift_code},{label:`Opening Balance`,value:t(e?.opening_balance)},{label:`Current Software Balance`,value:t(a)},{label:`Created`,value:H(e?.created_at,!0)},{label:`Updated`,value:H(e?.updated_at,!0)},{label:`Description`,value:e?.description}]})}),(0,P.jsxs)(v,{gutter:[12,12],children:[(0,P.jsx)(_,{xs:24,md:8,children:(0,P.jsx)(K,{label:`Balance in Bank Account`,value:t(i),tone:`primary`,action:(0,P.jsxs)(F,{type:`secondary`,children:[r?.code||`Base`,` · Last statement `,H(e?.last_statement_date)]})})}),(0,P.jsx)(_,{xs:24,md:8,children:(0,P.jsx)(K,{label:`Balance in Software`,value:t(a),tone:`success`,action:(0,P.jsxs)(F,{type:`secondary`,children:[`Base currency · Last transaction `,H(e?.last_software_transaction_date)]})})}),(0,P.jsx)(_,{xs:24,md:8,children:(0,P.jsx)(K,{label:s?`Reconciled`:`Reconciliation Needed`,value:`Difference ${t(o)}`,tone:s?`success`:`warning`,action:s?null:(0,P.jsx)(p,{size:`small`,type:`primary`,onClick:()=>n.visit(z(`accounting.bank-accounts.index`,{bank_account_id:e.id,view:`reconcile`},`/accounting/bank-accounts?bank_account_id=${e.id}&view=reconcile`)),children:`Reconcile Now`})})})]}),(0,P.jsx)(G,{title:`Balance History: Bank vs Software`,children:(0,P.jsx)(c,{size:`small`,pagination:!1,rowKey:(e,t)=>e?.date||t,dataSource:e?.balance_history||[],columns:[{title:`Date`,dataIndex:`date`,width:150,render:H},{title:`Bank Statement Balance`,dataIndex:`bank_statement_balance`,align:`right`,render:t},{title:`Software Ledger Balance`,dataIndex:`software_ledger_balance`,align:`right`,render:t}],locale:{emptyText:(0,P.jsx)(f,{description:`No balance history`})}})}),(0,P.jsx)(G,{title:`Deposit vs Withdrawal`,children:(0,P.jsx)(c,{size:`small`,pagination:!1,rowKey:(e,t)=>e?.date||t,dataSource:e?.deposit_withdrawal_summary||[],columns:[{title:`Date`,dataIndex:`date`,width:150,render:H},{title:`Deposits`,dataIndex:`deposits`,align:`right`,render:t},{title:`Withdrawals`,dataIndex:`withdrawals`,align:`right`,render:t}],locale:{emptyText:(0,P.jsx)(f,{description:`No deposit or withdrawal data`})}})}),(0,P.jsx)(G,{title:`Bank Transactions`,children:(0,P.jsx)(h,{size:`small`,items:[`all`,`matched`,`unmatched`,`needs_review`,`ignored`].map(e=>({key:e,label:B(e),children:(0,P.jsx)(c,{size:`small`,scroll:{x:1500},rowKey:(e,t)=>e?.id||t,dataSource:e===`all`?l:l.filter(t=>t.matching_status===e),columns:[{title:`Transaction Date`,dataIndex:`transaction_date`,width:150,render:H},{title:`Description`,dataIndex:`description`,width:260,render:e=>e||`-`},{title:`Reference Number`,dataIndex:`reference_no`,width:170,render:e=>e||`-`},{title:`Deposit`,dataIndex:`deposit`,width:130,align:`right`,render:e=>A(e)?t(e):`-`},{title:`Withdrawal`,dataIndex:`withdrawal`,width:130,align:`right`,render:e=>A(e)?t(e):`-`},{title:`Running Balance`,dataIndex:`running_balance`,width:160,align:`right`,render:t},{title:`Matched Software Transaction`,dataIndex:`matched_transaction`,width:220,render:j},{title:`Matching Status`,dataIndex:`matching_status`,width:150,render:e=>(0,P.jsx)(T,{children:B(e||`unmatched`)})},{title:`Difference`,dataIndex:`difference`,width:130,align:`right`,render:t},{title:`Actions`,width:280,fixed:`right`,render:(e,t)=>t?.matching_status===`matched`?`-`:(0,P.jsxs)(y,{size:4,children:[(0,P.jsx)(p,{size:`small`,children:`Match`}),(0,P.jsx)(p,{size:`small`,children:`Create`}),(0,P.jsx)(p,{size:`small`,children:`Ignore`})]})}],pagination:{pageSize:10}})}))})})]})}function Oe({record:e,formatMoney:t}){let n=e?.items||e?.cash_transfer_lines||e?.cashTransferLines||[],r=n.reduce((e,t)=>e+A(t?.amount),0);return(0,P.jsxs)(P.Fragment,{children:[e?.approved===!1?(0,P.jsx)(l,{showIcon:!0,type:`warning`,message:`This cash transfer is not approved yet.`}):null,(0,P.jsxs)(G,{title:`Details`,children:[(0,P.jsx)(q,{rows:[{label:`Transfer No`,value:e?.transfer_no},{label:`Date`,value:H(e?.transfer_date)},{label:`Reference`,value:e?.reference},{label:`From Account`,value:j(e?.from_account||e?.fromAccount)},{label:`Status`,value:e?.status},{label:`Approval Status`,value:e?.approved?`Approved`:`Not Approved`}]}),(0,P.jsx)(c,{size:`small`,className:`accounting-show__spaced-table`,pagination:!1,rowKey:(e,t)=>e?.id||t,dataSource:n,columns:[{title:`Transferred To`,render:(e,t)=>j(t?.to_account||t?.toAccount)},{title:`Description`,dataIndex:`description`,render:e=>e||`-`},{title:`Amount`,dataIndex:`amount`,align:`right`,render:t}],summary:()=>(0,P.jsxs)(c.Summary.Row,{children:[(0,P.jsx)(c.Summary.Cell,{index:0,colSpan:2,children:(0,P.jsx)(`strong`,{children:`Total`})}),(0,P.jsx)(c.Summary.Cell,{index:1,align:`right`,children:(0,P.jsx)(`strong`,{children:t(r)})})]})})]})]})}function ke({record:e,formatMoney:t}){let n=e?.items||e?.journal_voucher_lines||e?.journalVoucherLines||e?.lines||[],r=n.reduce((e,t)=>e+A(t?.debit),0),i=n.reduce((e,t)=>e+A(t?.credit),0),a=Math.abs(r-i);return(0,P.jsxs)(G,{title:`Journal Voucher`,children:[(0,P.jsx)(q,{rows:[{label:`Voucher Number`,value:e?.voucher_no},{label:`Voucher Date`,value:H(e?.voucher_date)},{label:`Reference`,value:e?.reference},{label:`Branch`,value:j(e?.branch)},{label:`Currency`,value:j(e?.currency)},{label:`Status`,value:e?.status},{label:`Approval Status`,value:e?.approved?`Approved`:`Not Approved`},{label:`Narration`,value:e?.narration}]}),(0,P.jsx)(c,{size:`small`,className:`accounting-show__spaced-table`,pagination:!1,rowKey:(e,t)=>e?.id||t,dataSource:n,columns:[{title:`Chart of Account`,render:(e,t)=>{let n=t?.chart_of_account||t?.chartOfAccount||t?.account?.chart_of_account||t?.account?.chartOfAccount,r=t?.account||t?.account_id_detail;return j(n||r)||`-`}},{title:`Description`,dataIndex:`description`,render:e=>e||`-`},{title:`Debit`,dataIndex:`debit`,align:`right`,render:e=>A(e)?t(e):`-`},{title:`Credit`,dataIndex:`credit`,align:`right`,render:e=>A(e)?t(e):`-`}],summary:()=>(0,P.jsxs)(P.Fragment,{children:[(0,P.jsxs)(c.Summary.Row,{children:[(0,P.jsx)(c.Summary.Cell,{index:0,colSpan:2,children:(0,P.jsx)(`strong`,{children:`Total`})}),(0,P.jsx)(c.Summary.Cell,{index:1,align:`right`,children:(0,P.jsx)(`strong`,{children:t(r)})}),(0,P.jsx)(c.Summary.Cell,{index:2,align:`right`,children:(0,P.jsx)(`strong`,{children:t(i)})})]}),(0,P.jsxs)(c.Summary.Row,{children:[(0,P.jsx)(c.Summary.Cell,{index:0,colSpan:3,children:(0,P.jsx)(`strong`,{children:`Difference`})}),(0,P.jsx)(c.Summary.Cell,{index:1,align:`right`,children:(0,P.jsx)(`strong`,{children:t(a)})})]})]})})]})}function Ae({record:e,formatMoney:n,onRefresh:r}){let[i,a]=(0,M.useState)([]),[o,s]=(0,M.useState)(!1),[l,ee]=(0,M.useState)(`topup`),[u,f]=(0,M.useState)(null),[te,m]=(0,M.useState)(!1),[h]=x.useForm(),g=e?.top_ups||e?.loan_top_ups||e?.loanTopUps||[],re=e?.charges||e?.loan_charges||e?.loanCharges||[],b=e=>(0,P.jsx)(T,{color:e?`success`:`warning`,children:e?`Approved`:`Not Approved`}),S=e=>e===`charge`?`/api/loan-charges`:`/api/loan-top-ups`;(0,M.useEffect)(()=>{let e=!0;return t.get(L(`/api/accounts/`),{headers:R(),params:{active:!0,page_size:100,ordering:`code`}}).then(t=>{let n=t.data?.results||t.data?.data||(Array.isArray(t.data)?t.data:[]);e&&a(n.map(e=>({value:e.id,label:[e.code,e.name||e.label].filter(Boolean).join(` - `)||e.id})))}).catch(()=>{}),()=>{e=!1}},[]);let E=(t,n=null)=>{ee(t),f(n),h.setFieldsValue(t===`charge`?{charge_name:n?.charge_name||``,charge_date:n?.charge_date?(0,N.default)(n.charge_date).format(`YYYY-MM-DD`):(0,N.default)().format(`YYYY-MM-DD`),charges_paid_from_account_id:n?.charges_paid_from_account_id||n?.charges_paid_from_account?.id||n?.chargesPaidFromAccount?.id||null,amount:A(n?.amount),reference:n?.reference||``,notes:n?.notes||``,approved:!!n?.approved,active:n?.active!==!1}:{topup_date:n?.topup_date?(0,N.default)(n.topup_date).format(`YYYY-MM-DD`):(0,N.default)().format(`YYYY-MM-DD`),loan_received_in_account_id:n?.loan_received_in_account_id||n?.loan_received_in_account?.id||n?.loanReceivedInAccount?.id||e?.loan_received_in_account_id||null,amount:A(n?.amount),reference:n?.reference||``,notes:n?.notes||``,approved:!!n?.approved,active:n?.active!==!1}),s(!0)},ae=async()=>{let n=await h.validateFields(),i=l,a=i===`charge`,o={...n,loan_account_id:e.id,amount:A(n.amount),active:n.active!==!1,approved:!!n.approved};m(!0);try{let e=S(i);u?.id?await t.patch(L(`${e}/${u.id}/`),o,{headers:R()}):await t.post(L(`${e}/`),o,{headers:R()}),await r?.(),w.success(`${a?`Charge`:`Top-up`} ${u?.id?`updated`:`created`}`),s(!1)}catch(e){w.error(e?.response?.data?.message||`Failed to save ${a?`charge`:`top-up`}`)}finally{m(!1)}},oe=async(e,n,i)=>{try{await t.patch(L(`${S(e)}/${n.id}/`),{approved:i},{headers:R()}),await r?.(),w.success(i?`Marked as approved`:`Marked as not approved`)}catch(e){w.error(e?.response?.data?.message||`Approval update failed`)}},D=(e,n)=>{ie.confirm({title:`Delete this ${e===`charge`?`charge`:`top-up`}?`,okText:`Delete`,okButtonProps:{danger:!0},onOk:async()=>{await t.delete(L(`${S(e)}/${n.id}/`),{headers:R()}),await r?.(),w.success(e===`charge`?`Charge deleted`:`Top-up deleted`)}})},se=(e,t)=>(0,P.jsxs)(y,{size:4,children:[(0,P.jsx)(p,{size:`small`,onClick:()=>E(e,t),children:`Edit`}),(0,P.jsx)(p,{size:`small`,onClick:()=>oe(e,t,!t?.approved),children:t?.approved?`Mark Not Approved`:`Approve`}),(0,P.jsx)(p,{size:`small`,danger:!0,onClick:()=>D(e,t),children:`Delete`})]});return(0,P.jsxs)(P.Fragment,{children:[(0,P.jsxs)(v,{gutter:[12,12],children:[(0,P.jsx)(_,{xs:24,md:6,children:(0,P.jsx)(K,{label:`Opening Balance`,value:n(e?.opening_balance)})}),(0,P.jsx)(_,{xs:24,md:6,children:(0,P.jsx)(K,{label:`Current Balance`,value:n(e?.current_balance),tone:`success`})}),(0,P.jsx)(_,{xs:24,md:6,children:(0,P.jsx)(K,{label:`Interest Rate`,value:`${A(e?.interest_rate_per_annum).toLocaleString()}%`,tone:`warning`})}),(0,P.jsx)(_,{xs:24,md:6,children:(0,P.jsx)(K,{label:`Duration`,value:`${A(e?.duration_in_month).toLocaleString()} months`,tone:`info`})})]}),(0,P.jsx)(G,{title:`Loan Account Details`,children:(0,P.jsx)(q,{rows:[{label:`Loan Account`,value:e?.name},{label:`Lender Bank`,value:e?.bank_name},{label:`Loan Number`,value:e?.loan_number},{label:`Balance As Of`,value:H(e?.balance_as_of)},{label:`Loan Received In`,value:j(e?.loan_received_in_account||e?.loanReceivedInAccount)},{label:`Related Account`,value:j(e?.related_account||e?.relatedAccount)},{label:`Processing Fee`,value:n(e?.processing_fee)},{label:`Status`,value:B(e?.status||`active`)},{label:`Description`,value:e?.description}]})}),(0,P.jsx)(G,{title:`Top-ups`,extra:(0,P.jsx)(p,{size:`small`,type:`primary`,onClick:()=>E(`topup`),children:`Add Top-up`}),children:(0,P.jsx)(c,{size:`small`,dataSource:g,rowKey:(e,t)=>e?.id||t,pagination:!1,scroll:{x:900},columns:[{title:`Date`,dataIndex:`topup_date`,render:H},{title:`Received In`,render:(e,t)=>j(t?.loan_received_in_account||t?.loanReceivedInAccount)},{title:`Reference`,dataIndex:`reference`,render:e=>e||`-`},{title:`Amount`,dataIndex:`amount`,align:`right`,render:n},{title:`Approval Status`,dataIndex:`approved`,render:b},{title:`Actions`,width:250,render:(e,t)=>se(`topup`,t)}]})}),(0,P.jsx)(G,{title:`Charges`,extra:(0,P.jsx)(p,{size:`small`,type:`primary`,onClick:()=>E(`charge`),children:`Add Charge`}),children:(0,P.jsx)(c,{size:`small`,dataSource:re,rowKey:(e,t)=>e?.id||t,pagination:!1,scroll:{x:900},columns:[{title:`Date`,dataIndex:`charge_date`,render:H},{title:`Charge`,dataIndex:`charge_name`,render:e=>e||`-`},{title:`Paid From`,render:(e,t)=>j(t?.charges_paid_from_account||t?.chargesPaidFromAccount)},{title:`Amount`,dataIndex:`amount`,align:`right`,render:n},{title:`Approval Status`,dataIndex:`approved`,render:b},{title:`Actions`,width:250,render:(e,t)=>se(`charge`,t)}]})}),(0,P.jsx)(ie,{title:`${u?.id?`Edit`:`Add`} ${l===`charge`?`Loan Charge`:`Loan Top-up`}`,open:o,onCancel:()=>s(!1),onOk:ae,confirmLoading:te,destroyOnClose:!0,width:620,children:(0,P.jsxs)(x,{form:h,layout:`vertical`,children:[l===`charge`?(0,P.jsxs)(P.Fragment,{children:[(0,P.jsx)(x.Item,{name:`charge_name`,label:`Charge Name`,rules:[{required:!0,message:`Charge name is required`}],children:(0,P.jsx)(C,{placeholder:`Processing fee, bank charge...`})}),(0,P.jsx)(x.Item,{name:`charge_date`,label:`Charge Date`,rules:[{required:!0,message:`Charge date is required`}],children:(0,P.jsx)(C,{type:`date`})}),(0,P.jsx)(x.Item,{name:`charges_paid_from_account_id`,label:`Paid From Account`,rules:[{required:!0,message:`Paid from account is required`}],children:(0,P.jsx)(d,{showSearch:!0,placeholder:`Select account`,options:i,optionFilterProp:`label`})})]}):(0,P.jsxs)(P.Fragment,{children:[(0,P.jsx)(x.Item,{name:`topup_date`,label:`Top-up Date`,rules:[{required:!0,message:`Top-up date is required`}],children:(0,P.jsx)(C,{type:`date`})}),(0,P.jsx)(x.Item,{name:`loan_received_in_account_id`,label:`Received In Account`,rules:[{required:!0,message:`Received in account is required`}],children:(0,P.jsx)(d,{showSearch:!0,placeholder:`Select account`,options:i,optionFilterProp:`label`})})]}),(0,P.jsx)(x.Item,{name:`amount`,label:`Amount`,rules:[{required:!0,message:`Amount is required`}],children:(0,P.jsx)(ne,{min:.01,precision:2,style:{width:`100%`}})}),(0,P.jsx)(x.Item,{name:`reference`,label:`Reference`,children:(0,P.jsx)(C,{})}),(0,P.jsx)(x.Item,{name:`notes`,label:`Notes`,children:(0,P.jsx)(C.TextArea,{rows:3})}),(0,P.jsxs)(v,{gutter:12,children:[(0,P.jsx)(_,{xs:24,md:12,children:(0,P.jsx)(x.Item,{name:`approved`,label:`Approval Status`,children:(0,P.jsx)(d,{options:[{value:!1,label:`Not Approved`},{value:!0,label:`Approved`}]})})}),(0,P.jsx)(_,{xs:24,md:12,children:(0,P.jsx)(x.Item,{name:`active`,label:`Status`,children:(0,P.jsx)(d,{options:[{value:!0,label:`Active`},{value:!1,label:`Inactive`}]})})})]})]})})]})}function je({record:e,formatMoney:t,title:n}){let r=Object.entries(e||{}).filter(([e,t])=>!([`id`,`account`,`account_id_detail`,`items`].includes(e)||Array.isArray(t)));return(0,P.jsx)(G,{title:`${n} Details`,children:(0,P.jsx)(q,{rows:r.map(([e,n])=>({label:B(e),value:/(amount|balance|total|debit|credit)/i.test(e)?t(n):j(n)}))})})}function J({id:e,title:a,endpoint:o,backRoute:c,backLabel:ee,titleField:m=`name`,subtitleField:h,editRoute:_}){let{token:v}=ge(),{currency:b,formatMoney:S}=de(),[T,E]=(0,M.useState)(null),[D,ce]=(0,M.useState)(!0),[O,k]=(0,M.useState)(!1),[N,I]=(0,M.useState)(!1),[_e,V]=(0,M.useState)(``),[U,xe]=(0,M.useState)(!1),[Se,W]=(0,M.useState)(null),[K,q]=(0,M.useState)(!1),[Ce,we]=(0,M.useState)(``),[J,Me]=(0,M.useState)(null),[Ne,Pe]=(0,M.useState)(!1),[Fe]=x.useForm(),Y=be(a),X=o.replace(/\/+$/,``),Z=Y===`cash`?`cash_transfer`:Y===`journal`?`journal_voucher`:null,Ie=(0,M.useMemo)(()=>({"--accounting-show-bg":v.colorBgLayout,"--accounting-show-surface":v.colorBgContainer,"--accounting-show-elevated":v.colorBgElevated,"--accounting-show-surface-soft":v.colorFillQuaternary,"--accounting-show-surface-muted":v.colorFillTertiary,"--accounting-show-border":v.colorBorderSecondary,"--accounting-show-border-strong":v.colorBorder,"--accounting-show-text":v.colorText,"--accounting-show-text-secondary":v.colorTextSecondary,"--accounting-show-text-tertiary":v.colorTextTertiary,"--accounting-show-primary":v.colorPrimary,"--accounting-show-primary-bg":v.colorPrimaryBg,"--accounting-show-success":v.colorSuccess,"--accounting-show-success-bg":v.colorSuccessBg,"--accounting-show-warning":v.colorWarning,"--accounting-show-warning-bg":v.colorWarningBg,"--accounting-show-error":v.colorError,"--accounting-show-info":v.colorInfo,"--accounting-show-radius":`${v.borderRadius}px`,"--accounting-show-radius-lg":`${v.borderRadiusLG}px`,"--accounting-show-padding-xxs":`${v.paddingXXS}px`,"--accounting-show-padding-xs":`${v.paddingXS}px`,"--accounting-show-padding-sm":`${v.paddingSM}px`,"--accounting-show-padding":`${v.padding}px`,"--accounting-show-padding-lg":`${v.paddingLG}px`,"--accounting-show-font-size-sm":`${v.fontSizeSM}px`,"--accounting-show-font-size":`${v.fontSize}px`,"--accounting-show-font-size-lg":`${v.fontSizeLG}px`,"--accounting-show-shadow":v.boxShadowTertiary||`none`}),[v]),Q=async()=>{ce(!0),V(``);try{let n=await t.get(L(`${X}/${e}/`),{headers:R()});E(n.data?.data??n.data)}catch(e){let t=e?.response?.data?.message||`Failed to load ${a}`;V(t),E(null),w.error(t)}finally{ce(!1)}};(0,M.useEffect)(()=>{Q()},[X,e]),(0,M.useEffect)(()=>{if(!U||!T||!Z)return;let e=!0;return(async()=>{q(!0),we(``),W(null);try{let[n,r]=await Promise.all([t.get(L(`/api/printing-templates/resolve?document_type=${encodeURIComponent(Z)}`),{headers:R()}),t.get(L(`/api/app-settings/current`),{headers:R()}).catch(()=>({data:null}))]);e&&(W(n.data?.data??n.data??null),Me(r.data?.data??r.data??null))}catch(t){e&&(W(null),we(t?.response?.data?.message||`No active print template found. Fallback template is being used.`))}finally{e&&q(!1)}})(),()=>{e=!1}},[U,T,Z]);let $=(0,M.useMemo)(()=>T&&[`journal`,`cash`].includes(Y)&&Object.prototype.hasOwnProperty.call(T,`approved`)&&T.approved!==!0?`#DRAFT`:T?.[m]||T?.display_name||T?.voucher_no||T?.transfer_no||T?.code||a,[Y,T,a,m]),Le=h&&T?.[h]?T[h]:T?.code||T?.reference||``,Re=T&&Object.prototype.hasOwnProperty.call(T,`approved`)&&!T.approved&&!T.void,ze=(0,M.useMemo)(()=>{let e=Y===`journal`?T?.journalVoucherLines||T?.journal_voucher_lines||T?.items||[]:T?.cashTransferLines||T?.cash_transfer_lines||T?.items||[],t=A(T?.total_debit??T?.total_amount??T?.amount??T?.total);return{record:T,company:{name:J?.company_name||T?.company?.name||T?.branch?.name||`KiteLedger`,legal_name:J?.legal_name||J?.company_name||T?.company?.legal_name||T?.company?.name||``,logo:J?.logo_url||J?.dark_logo_url||J?.logo||J?.dark_logo||T?.company?.logo_url||T?.company?.logo||``,address:ve(J)||T?.company?.address||T?.branch?.address||``,phone:J?.phone||T?.company?.phone||T?.branch?.phone||``,email:J?.email||T?.company?.email||T?.branch?.email||``,website:J?.website||T?.company?.website||``,pan_or_vat:J?.tax_number||J?.vat_number||T?.company?.tax_id||T?.company?.pan_no||T?.branch?.tax_id||``,registration_number:J?.registration_number||T?.company?.registration_number||``,footer:J?.footer||``,tax_id:J?.tax_number||J?.vat_number||T?.company?.tax_id||T?.company?.pan_no||T?.branch?.tax_id||``,initials:String(J?.company_name||T?.company?.name||T?.branch?.name||`KL`).split(/\s+/).map(e=>e.charAt(0)).join(``).slice(0,3).toUpperCase()},branch:{name:T?.branch?.name||``,address:T?.branch?.address||``,phone:T?.branch?.phone||``},document:{type:Z||``,title:a,number:$,date:H(T?.voucher_date||T?.transfer_date||T?.date),reference:T?.reference||`-`,status:B(T?.status||(T?.approved?`approved`:`draft`)),approved:!!T?.approved,void:!!T?.void,voided:!!T?.void,is_draft:!T?.void&&T?.approved!==!0,show_watermark:!!(J?.show_watermark??!0),voided_reason:T?.voided_reason||``,notes:T?.notes||T?.narration||``,terms:``},party:{name:j(T?.contact||T?.fromAccount||T?.from_account||T?.account),address:``,phone:``,email:``,tax_id:``},account:{name:j(T?.account||T?.fromAccount||T?.from_account||T?.toAccount||T?.to_account)},currency:{code:T?.currency?.code||J?.default_currency||``,symbol:T?.currency?.symbol||``,name:T?.currency?.name||``},exchange_rate:T?.exchange_rate?Number(T.exchange_rate).toFixed(2):``,totals:{subtotal:S(t),discount:S(0),tax:S(0),grand_total:S(t),total:S(t),amount_in_words:T?.amount_in_words||T?.total_in_words||``},payment:{method:T?.payment_method||T?.method||``,reference_number:T?.reference_no||T?.reference||``,source_account:j(T?.fromAccount||T?.from_account||T?.account),destination_account:j(T?.toAccount||T?.to_account)},subtotal:S(t),discount:S(0),tax:S(0),total:S(t),amount_paid:S(0),balance_due:S(0),notes:T?.notes||T?.narration||``,terms:``,prepared_by:j(T?.userAdd||T?.user_add),approved_by:j(T?.approvedBy||T?.approved_by),printed_at:new Date().toLocaleString(),settings:{show_watermark:!!(J?.show_watermark??!0)},lines:e.map(e=>({product_name:j(e?.chartOfAccount||e?.chart_of_account||e?.account||e?.toAccount||e?.to_account)||`-`,description:e?.description||e?.narration||`-`,qty:`1.00`,unit_price:S(e?.debit||e?.amount||e?.credit||0),debit:S(e?.debit||0),credit:S(e?.credit||0),tax_amount:S(0),line_total:S(e?.debit||e?.amount||e?.credit||0),amount:S(e?.amount||e?.debit||e?.credit||0)})),items:e.map(e=>({product_name:j(e?.chartOfAccount||e?.chart_of_account||e?.account||e?.toAccount||e?.to_account)||`-`,description:e?.description||e?.narration||`-`,qty:`1.00`,unit_price:S(e?.debit||e?.amount||e?.credit||0),debit:S(e?.debit||0),credit:S(e?.credit||0),discount_amount:S(0),tax_amount:S(0),line_total:S(e?.debit||e?.amount||e?.credit||0),amount:S(e?.amount||e?.debit||e?.credit||0)}))}},[J,S,Y,Z,T,$,a]),Be=Se||{template_html:`
<section class="print-document">
  <header class="doc-header">
    <div><h1>{{company.name}}</h1><p>{{company.address}}</p><p>{{company.phone}} {{company.email}}</p></div>
    <div class="doc-meta"><h2>{{document.title}}</h2><p><strong>No:</strong> {{document.number}}</p><p><strong>Date:</strong> {{document.date}}</p><p><strong>Status:</strong> {{document.status}}</p></div>
  </header>
  <table class="lines"><thead><tr><th>#</th><th>Description</th><th class="num">Amount</th></tr></thead><tbody>{{#lines}}<tr><td>{{@index}}</td><td>{{product_name}}<br><span>{{description}}</span></td><td class="num">{{line_total}}</td></tr>{{/lines}}</tbody></table>
  <section class="totals"><p class="grand"><span>Total</span><strong>{{totals.grand_total}}</strong></p></section>
  <footer class="signatures"><div><span>Prepared By</span></div><div><span>Approved By</span></div><div><span>Received By</span></div></footer>
</section>`,template_css:`.print-document{font-family:Arial,sans-serif;color:#111827;font-size:12px}.doc-header{display:flex;justify-content:space-between;gap:24px;border-bottom:2px solid #111827;padding-bottom:14px;margin-bottom:18px}.doc-meta{text-align:right}.lines{width:100%;border-collapse:collapse}.lines th,.lines td{border:1px solid #d1d5db;padding:8px}.lines th{background:#f3f4f6;text-align:left}.lines span{color:#6b7280;font-size:11px}.num{text-align:right}.totals{width:300px;margin-left:auto;margin-top:16px}.totals p{display:flex;justify-content:space-between;border-bottom:2px solid #111827;padding:8px 0}.signatures{display:grid;grid-template-columns:repeat(3,1fr);gap:24px;margin-top:48px}.signatures div{border-top:1px solid #111827;padding-top:8px;text-align:center;font-weight:700}`},Ve=async(n,r)=>{k(!0);try{await t.patch(L(`${X}/${e}/`),n,{headers:R()}),w.success(r),I(!1),await Q()}catch(e){w.error(e?.response?.data?.message||`Update failed`)}finally{k(!1)}},He=async()=>{k(!0);try{await t.post(L(`${X}/${e}/approve`),{},{headers:R()}),w.success(`${a} approved`),Pe(!1),await Q()}catch(e){w.error(e?.response?.data?.message||`Approval failed`)}finally{k(!1)}},Ue=()=>{Fe.setFieldsValue(T||{}),I(!0)};return(0,P.jsxs)(ae,{children:[(0,P.jsx)(i,{title:$||a}),(0,P.jsx)(`style`,{children:`
        .accounting-show {
          min-height: calc(100vh - 64px);
          background: var(--accounting-show-bg);
          color: var(--accounting-show-text);
          padding: var(--accounting-show-padding);
        }

        .accounting-show__shell {
          max-width: 1600px;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          gap: var(--accounting-show-padding);
        }

        .accounting-show__bar-card.ant-card,
        .accounting-show__rail-card.ant-card,
        .accounting-show__card.ant-card,
        .accounting-show__metric.ant-card {
          border-color: var(--accounting-show-border);
          border-radius: var(--accounting-show-radius-lg);
          box-shadow: var(--accounting-show-shadow);
          overflow: hidden;
        }

        .accounting-show__bar-card .ant-card-body {
          padding: var(--accounting-show-padding-sm) var(--accounting-show-padding);
        }

        .accounting-show__bar {
          min-height: 50px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: var(--accounting-show-padding);
          background: var(--accounting-show-surface);
        }

        .accounting-show__crumb {
          display: flex;
          align-items: center;
          gap: var(--accounting-show-padding-sm);
          min-width: 0;
        }

        .accounting-show__title-wrap {
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .accounting-show__title-wrap h4 {
          margin: 0 !important;
          line-height: 1.2 !important;
        }

        .accounting-show__body {
          display: grid;
          grid-template-columns: 320px minmax(0, 1fr);
          gap: var(--accounting-show-padding);
          align-items: start;
        }

        .accounting-show__rail {
          position: sticky;
          top: var(--accounting-show-padding);
          min-width: 0;
        }

        .accounting-show__rail-card .ant-card-body {
          padding: var(--accounting-show-padding);
          display: flex;
          flex-direction: column;
          gap: var(--accounting-show-padding-sm);
        }

        .accounting-show__entity {
          display: flex;
          align-items: flex-start;
          gap: var(--accounting-show-padding-sm);
          padding-bottom: var(--accounting-show-padding-sm);
          border-bottom: 1px solid var(--accounting-show-border);
        }

        .accounting-show__entity-text {
          min-width: 0;
        }

        .accounting-show__entity-text h4 {
          margin: 0 !important;
          font-size: 18px !important;
          line-height: 1.25 !important;
          color: var(--accounting-show-text) !important;
          word-break: break-word;
        }

        .accounting-show__entity-text .ant-typography {
          font-size: var(--accounting-show-font-size-sm);
        }

        .accounting-show__icon {
          width: 44px;
          height: 44px;
          border-radius: 999px;
          display: grid;
          place-items: center;
          font-size: 20px;
          flex: none;
          color: var(--module-color);
          background: color-mix(in srgb, var(--module-color) 12%, var(--accounting-show-surface));
          border: 1px solid color-mix(in srgb, var(--module-color) 28%, var(--accounting-show-border));
        }

        .accounting-show__amount {
          padding: var(--accounting-show-padding-sm);
          border-radius: var(--accounting-show-radius);
          background: color-mix(in srgb, var(--module-color) 10%, var(--accounting-show-surface));
          border: 1px solid color-mix(in srgb, var(--module-color) 22%, var(--accounting-show-border));
          display: flex;
          flex-direction: column;
          gap: 3px;
        }

        .accounting-show__amount .ant-typography {
          font-size: var(--accounting-show-font-size-sm);
        }

        .accounting-show__amount strong {
          font-size: 22px;
          line-height: 1.15;
          color: var(--module-color);
          word-break: break-word;
        }

        .accounting-show__rail-table {
          border: 1px solid var(--accounting-show-border);
          border-radius: var(--accounting-show-radius);
          overflow: hidden;
          background: var(--accounting-show-surface);
        }

        .accounting-show__rail-row {
          display: grid;
          grid-template-columns: 96px minmax(0, 1fr);
          border-bottom: 1px solid var(--accounting-show-border);
        }

        .accounting-show__rail-row:last-child {
          border-bottom: 0;
        }

        .accounting-show__rail-label,
        .accounting-show__rail-value {
          padding: 8px 10px;
          font-size: var(--accounting-show-font-size-sm);
          line-height: 1.35;
          word-break: break-word;
        }

        .accounting-show__rail-label {
          background: var(--accounting-show-surface-soft);
          color: var(--accounting-show-text-secondary);
          font-weight: 700;
          border-right: 1px solid var(--accounting-show-border);
        }

        .accounting-show__rail-value {
          color: var(--accounting-show-text);
        }

        .accounting-show__main {
          display: flex;
          flex-direction: column;
          gap: var(--accounting-show-padding);
          min-width: 0;
          overflow: hidden;
        }

        .accounting-show__card.ant-card,
        .accounting-show__metric.ant-card {
          background: var(--accounting-show-surface);
        }

        .accounting-show__card .ant-card-head {
          min-height: 46px;
          padding: 0 var(--accounting-show-padding);
          border-bottom: 1px solid var(--accounting-show-border);
          background: var(--accounting-show-elevated);
        }

        .accounting-show__card .ant-card-head-title {
          font-size: var(--accounting-show-font-size);
          font-weight: 800;
          color: var(--accounting-show-text);
        }

        .accounting-show__card .ant-card-extra {
          font-size: var(--accounting-show-font-size-sm);
        }

        .accounting-show__card .ant-card-body {
          padding: var(--accounting-show-padding);
          min-width: 0;
        }

        .accounting-show__metric {
          position: relative;
        }

        .accounting-show__metric::before {
          content: '';
          position: absolute;
          inset-inline: 0;
          top: 0;
          height: 3px;
          background: var(--metric-color);
        }

        .accounting-show__metric .ant-card-body {
          min-height: 96px;
          padding: var(--accounting-show-padding);
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .accounting-show__metric strong {
          font-size: 20px;
          font-weight: 800;
          line-height: 1.2;
          color: var(--metric-color);
          word-break: break-word;
        }

        .accounting-show__metric-action {
          margin-top: 4px;
        }

        .accounting-show__info-table {
          width: 100%;
          border-collapse: separate;
          border-spacing: 0;
          table-layout: fixed;
          font-size: var(--accounting-show-font-size-sm);
          border: 1px solid var(--accounting-show-border);
          border-radius: var(--accounting-show-radius);
          overflow: hidden;
        }

        .accounting-show__info-table th {
          width: 15%;
          padding: 9px 11px;
          background: var(--accounting-show-surface-soft);
          border-right: 1px solid var(--accounting-show-border);
          border-bottom: 1px solid var(--accounting-show-border);
          color: var(--accounting-show-text-secondary);
          font-weight: 700;
          text-align: left;
          vertical-align: top;
          white-space: nowrap;
        }

        .accounting-show__info-table td {
          width: 35%;
          padding: 9px 11px;
          background: var(--accounting-show-surface);
          border-right: 1px solid var(--accounting-show-border);
          border-bottom: 1px solid var(--accounting-show-border);
          color: var(--accounting-show-text);
          vertical-align: top;
          word-break: break-word;
        }

        .accounting-show__info-table tr:last-child th,
        .accounting-show__info-table tr:last-child td {
          border-bottom: 0;
        }

        .accounting-show__info-table th:last-child,
        .accounting-show__info-table td:last-child {
          border-right: 0;
        }

        .accounting-show .ant-table {
          font-size: var(--accounting-show-font-size-sm);
        }

        .accounting-show .ant-table-wrapper .ant-table-container {
          border-radius: var(--accounting-show-radius);
          overflow: hidden;
        }

        .accounting-show .ant-table-wrapper .ant-table-thead > tr > th {
          padding: 9px 11px !important;
          background: var(--accounting-show-surface-muted) !important;
          font-weight: 800;
          color: var(--accounting-show-text-secondary) !important;
          white-space: nowrap;
          border-color: var(--accounting-show-border) !important;
        }

        .accounting-show .ant-table-wrapper .ant-table-tbody > tr > td {
          padding: 8px 11px !important;
          vertical-align: middle;
          border-color: var(--accounting-show-border) !important;
        }

        .accounting-show__table-row.is-alt > td {
          background: var(--accounting-show-surface-soft);
        }

        .accounting-show .ant-table-wrapper .ant-table-summary > tr > td {
          padding: 9px 11px !important;
          background: var(--accounting-show-surface-soft);
          font-weight: 800;
          border-color: var(--accounting-show-border) !important;
        }

        .accounting-show .ant-tag {
          margin-inline-end: 0;
          font-size: 11px;
          line-height: 18px;
          padding-inline: 7px;
          border-radius: 999px;
        }

        .accounting-show .ant-tabs-nav {
          margin-bottom: var(--accounting-show-padding-xs) !important;
        }

        .accounting-show .ant-tabs-tab {
          padding: var(--accounting-show-padding-xs) 0 !important;
          font-size: var(--accounting-show-font-size-sm);
        }

        .accounting-show__filters {
          margin-bottom: var(--accounting-show-padding-sm);
        }

        .accounting-show__spaced-table {
          margin-top: var(--accounting-show-padding-sm);
        }

        .accounting-show__state {
          padding: var(--accounting-show-padding-lg);
          background: var(--accounting-show-surface);
          border: 1px solid var(--accounting-show-border);
          border-radius: var(--accounting-show-radius-lg);
          box-shadow: var(--accounting-show-shadow);
        }

        @media (max-width: 1100px) {
          .accounting-show__body {
            grid-template-columns: 1fr;
          }

          .accounting-show__rail {
            position: static;
          }

          .accounting-show__rail-card .ant-card-body {
            display: grid;
            grid-template-columns: auto minmax(0, 1fr);
            align-items: start;
          }

          .accounting-show__entity,
          .accounting-show__amount,
          .accounting-show__rail-table {
            grid-column: 1 / -1;
          }
        }

        @media (max-width: 768px) {
          .accounting-show {
            padding: var(--accounting-show-padding-sm);
          }

          .accounting-show__bar {
            align-items: stretch;
            flex-direction: column;
          }

          .accounting-show__crumb {
            align-items: flex-start;
          }

          .accounting-show__info-table {
            min-width: 760px;
          }

          .accounting-show__card .ant-card-body {
            overflow-x: auto;
          }

          .accounting-show__rail-row {
            grid-template-columns: 1fr;
          }

          .accounting-show__rail-label {
            border-right: 0;
            border-bottom: 1px solid var(--accounting-show-border);
          }
        }
      `}),(0,P.jsx)(`div`,{className:`accounting-show`,style:Ie,children:(0,P.jsxs)(`div`,{className:`accounting-show__shell`,children:[(0,P.jsx)(g,{className:`accounting-show__bar-card`,children:(0,P.jsxs)(`div`,{className:`accounting-show__bar`,children:[(0,P.jsxs)(`div`,{className:`accounting-show__crumb`,children:[(0,P.jsx)(r,{href:z(c,null,`#`),children:(0,P.jsx)(p,{type:`text`,icon:(0,P.jsx)(oe,{}),children:ee})}),(0,P.jsxs)(`div`,{className:`accounting-show__title-wrap`,children:[(0,P.jsx)(he,{level:4,children:D?a:$}),(0,P.jsx)(F,{type:`secondary`,ellipsis:!0,style:{maxWidth:640},children:Le||a})]})]}),(0,P.jsxs)(y,{size:8,wrap:!0,children:[Z?(0,P.jsx)(p,{icon:(0,P.jsx)(ue,{}),onClick:()=>xe(!0),disabled:D||!T,children:`Print Preview`}):null,(0,P.jsx)(te,{menu:{items:[{key:`edit`,label:`Edit ${a}`},T?.active===!1?{key:`active`,label:`Make Active`}:{key:`inactive`,label:`Make Inactive`},Re?{key:`approve`,label:`Approve`,icon:(0,P.jsx)(se,{})}:null].filter(Boolean),onClick:({key:t})=>{if(t===`edit`){if(T?.approved||T?.void)return;_?n.visit(route(_,e)):Ue()}t===`active`&&Ve({active:!0},`${a} activated`),t===`inactive`&&Ve({active:!1},`${a} inactivated`),t===`approve`&&Pe(!0)}},trigger:[`click`],children:(0,P.jsxs)(p,{loading:O,children:[`Options `,(0,P.jsx)(le,{})]})}),(0,P.jsx)(p,{type:`text`,icon:(0,P.jsx)(s,{}),onClick:()=>n.visit(z(c,null,`#`))})]})]})}),_e?(0,P.jsx)(`div`,{className:`accounting-show__state`,children:(0,P.jsx)(l,{type:`error`,showIcon:!0,message:_e,closable:!0,onClose:()=>V(``)})}):null,D?(0,P.jsx)(`div`,{className:`accounting-show__state`,children:(0,P.jsx)(u,{active:!0,paragraph:{rows:8}})}):T?(0,P.jsxs)(`div`,{className:`accounting-show__body`,children:[(0,P.jsx)(Te,{module:Y,record:T,recordTitle:$,subtitle:Le,title:a,formatMoney:S,token:v}),(0,P.jsxs)(`main`,{className:`accounting-show__main`,children:[Re?(0,P.jsx)(l,{showIcon:!0,type:`warning`,message:`This transaction is still in draft and has not been approved.`,description:`Approve it to assign the final document number and post it.`,action:(0,P.jsx)(p,{size:`small`,type:`primary`,onClick:He,children:`Approve`})}):null,T?.void?(0,P.jsx)(l,{showIcon:!0,type:`error`,message:`This transaction has been voided`,description:T?.voided_reason?`Reason: ${T.voided_reason}`:`This transaction is voided and cannot be edited or approved.`}):null,T?.active===!1&&Y===`bank`?(0,P.jsx)(l,{showIcon:!0,type:`warning`,message:`This bank account is inactive.`,action:(0,P.jsx)(p,{size:`small`,type:`primary`,onClick:()=>Ve({active:!0},`Bank account activated`),children:`Make Active`})}):null,Y===`chart`?(0,P.jsx)(Ee,{record:T,formatMoney:S}):Y===`bank`?(0,P.jsx)(De,{record:T,formatMoney:S,currency:b}):Y===`cash`?(0,P.jsx)(Oe,{record:T,formatMoney:S}):Y===`journal`?(0,P.jsx)(ke,{record:T,formatMoney:S}):Y===`loan`?(0,P.jsx)(Ae,{record:T,formatMoney:S,onRefresh:Q}):(0,P.jsx)(je,{record:T,formatMoney:S,title:a}),(0,P.jsx)(G,{title:`Record Info`,children:(0,P.jsx)(pe,{record:T})})]})]}):(0,P.jsx)(`div`,{className:`accounting-show__state`,children:(0,P.jsx)(f,{description:`${a} not found`})})]})}),(0,P.jsx)(re,{title:`Print Preview`,open:U,onClose:()=>xe(!1),width:1180,destroyOnClose:!1,styles:{body:{background:v.colorBgLayout,padding:16}},children:Z?K?(0,P.jsx)(u,{active:!0,paragraph:{rows:12}}):T?(0,P.jsxs)(fe,{fileName:`${String($||a||`document`).replace(/[^\w.-]+/g,`_`)}.pdf`,documentTitle:$||a,printLabel:`Print`,downloadLabel:`Download PDF`,emailLabel:`Email`,children:[Ce?(0,P.jsx)(l,{type:`info`,showIcon:!0,message:Ce,style:{marginBottom:12}}):null,(0,P.jsx)(`style`,{children:Be.template_css||``}),(0,P.jsx)(`div`,{dangerouslySetInnerHTML:{__html:ye(Be.template_html,ze)}})]}):(0,P.jsx)(f,{description:`No record found for printing`}):(0,P.jsx)(l,{type:`warning`,showIcon:!0,message:`Unsupported document type`})}),(0,P.jsx)(ie,{title:`Edit ${a}`,open:N,confirmLoading:O,onCancel:()=>I(!1),onOk:()=>Fe.validateFields().then(e=>Ve(e,`${a} updated`)),destroyOnClose:!0,children:(0,P.jsxs)(x,{form:Fe,layout:`vertical`,children:[Y===`chart`?(0,P.jsxs)(P.Fragment,{children:[(0,P.jsx)(x.Item,{name:`name`,label:`Name`,rules:[{required:!0}],children:(0,P.jsx)(C,{})}),(0,P.jsx)(x.Item,{name:`description`,label:`Description`,children:(0,P.jsx)(C.TextArea,{rows:3})}),(0,P.jsx)(x.Item,{name:`active`,label:`Status`,children:(0,P.jsx)(d,{options:[{value:!0,label:`Active`},{value:!1,label:`Inactive`}]})})]}):null,Y===`bank`?(0,P.jsxs)(P.Fragment,{children:[(0,P.jsx)(x.Item,{name:`display_name`,label:`Display Name`,rules:[{required:!0}],children:(0,P.jsx)(C,{})}),(0,P.jsx)(x.Item,{name:`bank_name`,label:`Bank Name`,children:(0,P.jsx)(C,{})}),(0,P.jsx)(x.Item,{name:`account_name`,label:`Account Name`,children:(0,P.jsx)(C,{})}),(0,P.jsx)(x.Item,{name:`account_number`,label:`Account Number`,children:(0,P.jsx)(C,{})}),(0,P.jsx)(x.Item,{name:`account_type`,label:`Account Type`,children:(0,P.jsx)(C,{})}),(0,P.jsx)(x.Item,{name:`swift_code`,label:`Swift Code`,children:(0,P.jsx)(C,{})}),(0,P.jsx)(x.Item,{name:`description`,label:`Description`,children:(0,P.jsx)(C.TextArea,{rows:3})})]}):null,Y===`cash`?(0,P.jsxs)(P.Fragment,{children:[(0,P.jsx)(x.Item,{name:`reference`,label:`Reference`,children:(0,P.jsx)(C,{})}),(0,P.jsx)(x.Item,{name:`notes`,label:`Notes`,children:(0,P.jsx)(C.TextArea,{rows:3})}),(0,P.jsx)(x.Item,{name:`status`,label:`Status`,children:(0,P.jsx)(d,{options:[{value:`draft`,label:`Draft`},{value:`posted`,label:`Posted`},{value:`cancelled`,label:`Cancelled`}]})})]}):null,Y===`journal`?(0,P.jsxs)(P.Fragment,{children:[(0,P.jsx)(x.Item,{name:`reference`,label:`Reference`,children:(0,P.jsx)(C,{})}),(0,P.jsx)(x.Item,{name:`narration`,label:`Narration`,children:(0,P.jsx)(C.TextArea,{rows:3})}),(0,P.jsx)(x.Item,{name:`status`,label:`Status`,children:(0,P.jsx)(d,{options:[{value:`draft`,label:`Draft`},{value:`posted`,label:`Posted`},{value:`cancelled`,label:`Cancelled`}]})})]}):null,Y===`loan`?(0,P.jsxs)(P.Fragment,{children:[(0,P.jsx)(x.Item,{name:`name`,label:`Loan Account Name`,rules:[{required:!0}],children:(0,P.jsx)(C,{})}),(0,P.jsx)(x.Item,{name:`bank_name`,label:`Lender Bank`,children:(0,P.jsx)(C,{})}),(0,P.jsx)(x.Item,{name:`loan_number`,label:`Loan Number`,children:(0,P.jsx)(C,{})}),(0,P.jsx)(x.Item,{name:`opening_balance`,label:`Opening Balance`,children:(0,P.jsx)(ne,{style:{width:`100%`}})}),(0,P.jsx)(x.Item,{name:`current_balance`,label:`Current Balance`,children:(0,P.jsx)(ne,{style:{width:`100%`}})}),(0,P.jsx)(x.Item,{name:`description`,label:`Description`,children:(0,P.jsx)(C.TextArea,{rows:3})})]}):null]})}),(0,P.jsx)(me,{open:Ne,module:Z||Y,transactionId:T?.id,onApprove:He,confirmLoading:O,onCancel:()=>Pe(!1)})]})}export{J as default};