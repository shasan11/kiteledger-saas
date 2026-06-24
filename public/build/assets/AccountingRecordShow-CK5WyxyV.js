import{i as e}from"./chunk-62oNxeRG.js";import{i as t}from"./axios-CFfZBleg.js";import{r as n,t as r}from"./jsx-runtime-gigNY91P.js";import{n as i}from"./extends-x5GMP-Nc.js";import{t as a}from"./table-C0OVvqWD.js";import{t as o}from"./alert-CWS2pmeX.js";import{t as s}from"./select-CLz_Fzoi.js";import{t as c}from"./skeleton-cooCG3hX.js";import{t as l}from"./empty-CUdvJnZZ.js";import{t as u}from"./dropdown-DP2vvyVC.js";import{t as d}from"./button-B5dvIdG1.js";import{t as ee}from"./dayjs.min-BjRok8LT.js";import{t as f}from"./tabs-Dynodvw3.js";import{t as p}from"./card-FobL5y2W.js";import{n as m,t as h}from"./row-hwYmTzeb.js";import{t as te}from"./input-number-kJtByppq.js";import{t as g}from"./space-Bu5OROsg.js";import{t as ne}from"./drawer-GuhU5A3J.js";import{t as _}from"./FileTextOutlined-DphxzDJR.js";import{t as v}from"./form-DSdkaKNq.js";import{t as y}from"./SwapOutlined-CSAtoT3v.js";import{t as b}from"./input-DA-GO2ec.js";import{t as x}from"./typography-ofUTwIJF.js";import{t as S}from"./message-Crs4rgLq.js";import{t as re}from"./modal-Cko4-fB7.js";import{t as C}from"./tag-BtLgFRxP.js";import{i as w,n as T,t as E}from"./index.esm-BVo_jOMH.js";import{c as D}from"./app-1lBVmWdH.js";import{t as ie}from"./AuthenticatedLayout-Di5OPFh2.js";import{t as ae}from"./ArrowLeftOutlined-DMsHqzbn.js";import{t as O}from"./BankOutlined-CJQWdfn6.js";import{t as oe}from"./CheckCircleOutlined-eSY8LeCR.js";import{t as se}from"./DollarOutlined-CQnAQMzB.js";import{t as k}from"./FileExcelOutlined-BxVY7vZU.js";import{t as ce}from"./MoreOutlined-wVoq7JyG.js";import{t as le}from"./PrinterOutlined-q2ijiNdf.js";import{t as A}from"./SafetyCertificateOutlined-FhY9wCaq.js";import{n as j,r as ue,t as M}from"./currency-CIKUxWWM.js";import{t as de}from"./PrintableComponent-BXlEhWA9.js";import{t as fe}from"./Transactions-DEKceyby.js";import{t as pe}from"./BusinessRuleApprovalModal-XQiWpMlU.js";var N=e(n(),1),P=e(ee(),1),F=r(),{Text:I,Title:me}=x,{useToken:he}=D,L=``,R=e=>`${L}${e}`,z=()=>{let e=localStorage.getItem(`accessToken`);return{Accept:`application/json`,"Content-Type":`application/json`,...e?{Authorization:`Bearer ${e}`}:{}}},B=(e,t=null,n=`#`)=>{try{if(typeof route==`function`)return t==null?route(e):route(e,t)}catch{return n}return n},V=(e=``)=>String(e).replace(/_/g,` `).replace(/([a-z])([A-Z])/g,`$1 $2`).replace(/\b\w/g,e=>e.toUpperCase()),ge=e=>String(e??``).replaceAll(`&`,`&amp;`).replaceAll(`<`,`&lt;`).replaceAll(`>`,`&gt;`).replaceAll(`"`,`&quot;`).replaceAll(`'`,`&#039;`),H=(e,t,n=``)=>t?String(t).split(`.`).reduce((e,t)=>e==null?n:e[t],e)??n:n,_e=(e=null)=>e?.address||[e?.address_line_1,e?.address_line_2,e?.city,e?.state,e?.postal_code,e?.country].filter(Boolean).join(`, `),ve=(e,t)=>{let n=(e,n,r=``)=>H(e,n,void 0)??H(t,n,r),r=(e,i=t)=>String(e||``).replace(/{{([#^])([\w.]+)}}([\s\S]*?){{\/\2}}/g,(e,a,o,s)=>{let c=n(i,o,null),l=Array.isArray(c)?c.length>0:!!c;return a===`^`?l?``:r(s,i):Array.isArray(c)?c.map((e,n)=>r(s,{...t,...e||{},"@index":n+1})).join(``):l?r(s,typeof c==`object`?{...t,...c}:i):``}).replace(/{{\s*([^}]+)\s*}}/g,(e,t)=>ge(n(i,t.trim(),``)));return r(e)},U=(e,t=!1)=>{if(!e)return`-`;let n=(0,P.default)(e);return n.isValid()?n.format(t?`MMM D, YYYY HH:mm`:`DD-MM-YYYY`):e},W=e=>e==null||e===``?`-`:typeof e==`boolean`?e?`Yes`:`No`:e,ye=e=>/bank/i.test(e)?`bank`:/cash/i.test(e)?`cash`:/chart/i.test(e)?`chart`:/journal/i.test(e)?`journal`:/loan/i.test(e)?`loan`:`generic`,be=(e,t)=>({asset:t.colorPrimary,liability:t.colorWarning,equity:t.colorInfo,income:t.colorSuccess,expense:t.colorError})[String(e||``).toLowerCase()]||t.colorPrimary,xe=(e,t,n)=>({bank:n.colorPrimary,cash:n.colorSuccess,chart:be(t?.type,n),journal:n.colorSuccess,loan:n.colorWarning,generic:n.colorPrimary})[e]||n.colorPrimary,G=e=>({bank:(0,F.jsx)(O,{}),cash:(0,F.jsx)(y,{}),chart:(0,F.jsx)(A,{}),journal:(0,F.jsx)(_,{}),loan:(0,F.jsx)(se,{})})[e]||(0,F.jsx)(_,{});function K({title:e,extra:t,children:n}){return(0,F.jsx)(p,{className:`accounting-show__card`,title:e,extra:t,children:n})}function q({label:e,value:t,action:n,tone:r=`primary`}){return(0,F.jsxs)(p,{className:`accounting-show__metric accounting-show__metric--${r}`,style:{"--metric-color":`var(--accounting-show-${r})`},children:[(0,F.jsx)(I,{type:`secondary`,children:e}),(0,F.jsx)(`strong`,{children:t}),n?(0,F.jsx)(`div`,{className:`accounting-show__metric-action`,children:n}):null]})}function J({rows:e=[],columns:t=2}){let n=e.filter(Boolean),r=[];for(let e=0;e<n.length;e+=t)r.push(n.slice(e,e+t));return n.length?(0,F.jsx)(`table`,{className:`accounting-show__info-table`,children:(0,F.jsx)(`tbody`,{children:r.map((e,n)=>(0,F.jsx)(`tr`,{children:Array.from({length:t}).map((t,n)=>{let r=e[n];return(0,F.jsxs)(N.Fragment,{children:[(0,F.jsx)(`th`,{children:r?.label||``}),(0,F.jsx)(`td`,{children:r?W(r.value):``})]},n)})},n))})}):(0,F.jsx)(l,{image:l.PRESENTED_IMAGE_SIMPLE,description:`No details available`})}function Se({rows:e=[]}){return(0,F.jsx)(`div`,{className:`accounting-show__rail-table`,children:e.filter(Boolean).map(e=>(0,F.jsxs)(`div`,{className:`accounting-show__rail-row`,children:[(0,F.jsx)(`div`,{className:`accounting-show__rail-label`,children:e.label}),(0,F.jsx)(`div`,{className:`accounting-show__rail-value`,children:W(e.value)})]},e.label))})}function Ce({record:e}){return e?.active===!1?(0,F.jsx)(C,{children:`Inactive`}):e?.approved===!0?(0,F.jsx)(C,{color:`success`,children:`Approved`}):e?.approved===!1?(0,F.jsx)(C,{color:`warning`,children:`Not Approved`}):e?.status?(0,F.jsx)(C,{color:e.status===`posted`?`success`:`processing`,children:V(e.status)}):(0,F.jsx)(C,{color:`processing`,children:`Active`})}function we({module:e,record:t,recordTitle:n,subtitle:r,title:i,formatMoney:a,token:o}){let s=xe(e,t,o),c=t?.amount??t?.balance??t?.total_amount??t?.total??t?.current_balance??t?.opening_balance??0;return(0,F.jsx)(`aside`,{className:`accounting-show__rail`,children:(0,F.jsxs)(p,{className:`accounting-show__rail-card`,style:{"--module-color":s},children:[(0,F.jsxs)(`div`,{className:`accounting-show__entity`,children:[(0,F.jsx)(`div`,{className:`accounting-show__icon`,children:G(e)}),(0,F.jsxs)(`div`,{className:`accounting-show__entity-text`,children:[(0,F.jsx)(me,{level:4,children:n}),(0,F.jsx)(I,{type:`secondary`,children:r||i})]})]}),(0,F.jsxs)(`div`,{className:`accounting-show__amount`,children:[(0,F.jsx)(I,{type:`secondary`,children:`Amount`}),(0,F.jsx)(`strong`,{children:a(c)})]}),(0,F.jsx)(Se,{rows:[{label:`Status`,value:(0,F.jsx)(Ce,{record:t})},{label:`Branch`,value:M(t?.branch)},{label:`Approved By`,value:M(t?.approvedBy||t?.approved_by)},{label:`Approved At`,value:U(t?.approved_at,!0)},{label:`Created`,value:U(t?.created_at,!0)},{label:`Updated`,value:U(t?.updated_at,!0)}]})]})})}function Te({record:e,formatMoney:t}){let[n,r]=(0,N.useState)({date_from:``,date_to:``,status:``,approved:``}),i=(e?.recent_transactions||[]).filter(e=>!(n.date_from&&(0,P.default)(e.voucher_date).isBefore((0,P.default)(n.date_from),`day`)||n.date_to&&(0,P.default)(e.voucher_date).isAfter((0,P.default)(n.date_to),`day`)||n.status&&e.status!==n.status||n.approved!==``&&String(!!e.approved)!==n.approved));return(0,F.jsxs)(F.Fragment,{children:[(0,F.jsx)(K,{title:`Overview`,children:(0,F.jsx)(J,{rows:[{label:`Name`,value:e?.name},{label:`Code`,value:e?.code},{label:`Type`,value:V(e?.type||`-`)},{label:`Parent Account`,value:e?.parent?(0,F.jsx)(T,{href:B(`accounting.chart-of-accounts.show`,e.parent.id,`/accounting/chart-of-accounts/${e.parent.id}`),children:M(e.parent)}):`-`},{label:`Branch`,value:M(e?.branch)},{label:`Status`,value:e?.active?`Active`:`Inactive`},{label:`Created Date`,value:U(e?.created_at,!0)},{label:`Updated Date`,value:U(e?.updated_at,!0)},{label:`Amount / Balance`,value:t(e?.amount??e?.balance??0)},{label:`Description`,value:e?.description}]})}),(0,F.jsxs)(K,{title:`Recent Transactions`,extra:(0,F.jsx)(d,{size:`small`,icon:(0,F.jsx)(k,{}),onClick:()=>{let t=[[`Voucher number`,`Voucher date`,`Description`,`Debit`,`Credit`,`Net movement`,`Voucher status`,`Approval status`,`Branch`],...i.map(e=>[e.voucher_no||``,e.voucher_date||``,e.description||``,e.debit||0,e.credit||0,e.net_movement||0,e.status||``,e.approval_status||``,M(e.branch)])].map(e=>e.map(e=>`"${String(e).replace(/"/g,`""`)}"`).join(`,`)).join(`
`),n=new Blob([t],{type:`text/csv;charset=utf-8;`}),r=URL.createObjectURL(n),a=document.createElement(`a`);a.href=r,a.download=`${e?.code||`chart-of-account`}-transactions.csv`,a.click(),URL.revokeObjectURL(r)},children:`Export CSV`}),children:[(0,F.jsxs)(g,{wrap:!0,className:`accounting-show__filters`,children:[(0,F.jsx)(b,{type:`date`,value:n.date_from,onChange:e=>r(t=>({...t,date_from:e.target.value}))}),(0,F.jsx)(b,{type:`date`,value:n.date_to,onChange:e=>r(t=>({...t,date_to:e.target.value}))}),(0,F.jsx)(s,{allowClear:!0,placeholder:`Status`,value:n.status||void 0,onChange:e=>r(t=>({...t,status:e||``})),style:{width:150},options:[{value:`draft`,label:`Draft`},{value:`posted`,label:`Posted`},{value:`cancelled`,label:`Cancelled`}]}),(0,F.jsx)(s,{placeholder:`Approval`,value:n.approved,onChange:e=>r(t=>({...t,approved:e})),style:{width:170},options:[{value:``,label:`All approvals`},{value:`true`,label:`Approved`},{value:`false`,label:`Not Approved`}]})]}),(0,F.jsx)(a,{size:`small`,scroll:{x:1100},rowClassName:(e,t)=>t%2==0?`accounting-show__table-row`:`accounting-show__table-row is-alt`,columns:[{title:`Voucher Number`,dataIndex:`voucher_no`,width:150,render:(e,t)=>t.journal_voucher_id?(0,F.jsx)(T,{href:B(`accounting.journal-vouchers.show`,t.journal_voucher_id,`/accounting/journal-vouchers/${t.journal_voucher_id}`),children:e||`-`}):e||`-`},{title:`Voucher Date`,dataIndex:`voucher_date`,width:130,render:U},{title:`Description`,dataIndex:`description`,width:220,render:e=>e||`-`},{title:`Debit`,dataIndex:`debit`,width:120,align:`right`,render:t},{title:`Credit`,dataIndex:`credit`,width:120,align:`right`,render:t},{title:`Net Movement`,dataIndex:`net_movement`,width:140,align:`right`,render:t},{title:`Voucher Status`,dataIndex:`status`,width:130,render:e=>e||`-`},{title:`Approval Status`,dataIndex:`approval_status`,width:140,render:e=>(0,F.jsx)(C,{color:e===`Approved`?`success`:`warning`,children:e||`Not Approved`})},{title:`Branch`,dataIndex:`branch`,width:150,render:M}],dataSource:i,rowKey:(e,t)=>e?.id||t,pagination:{pageSize:10},locale:{emptyText:(0,F.jsx)(l,{description:`No recent transactions`})}})]})]})}function Ee({record:e,formatMoney:t,currency:n}){let r=e?.statement_balance??e?.opening_balance??0,i=e?.software_ledger_balance??e?.current_balance??e?.opening_balance??0,o=e?.reconciliation_difference??Math.abs(j(r)-j(i)),s=j(o)<.01,c=e?.bank_transactions||[];return(0,F.jsxs)(F.Fragment,{children:[(0,F.jsx)(K,{title:`Bank Account`,children:(0,F.jsx)(J,{rows:[{label:`Display Name`,value:e?.display_name},{label:`Bank Name`,value:e?.bank_name||(e?.type===`cash`?`Cash Account`:`-`)},{label:`Account Name`,value:e?.account_name},{label:`Account Number`,value:e?.account_number},{label:`Account Type`,value:e?.account_type||V(e?.type||`-`)},{label:`Currency`,value:M(e?.currency)},{label:`Branch`,value:M(e?.branch)},{label:`Code`,value:e?.code},{label:`Swift Code`,value:e?.swift_code},{label:`Opening Balance`,value:t(e?.opening_balance)},{label:`Current Software Balance`,value:t(i)},{label:`Created`,value:U(e?.created_at,!0)},{label:`Updated`,value:U(e?.updated_at,!0)},{label:`Description`,value:e?.description}]})}),(0,F.jsxs)(h,{gutter:[12,12],children:[(0,F.jsx)(m,{xs:24,md:8,children:(0,F.jsx)(q,{label:`Balance in Bank Account`,value:t(r),tone:`primary`,action:(0,F.jsxs)(I,{type:`secondary`,children:[n?.code||`Base`,` · Last statement `,U(e?.last_statement_date)]})})}),(0,F.jsx)(m,{xs:24,md:8,children:(0,F.jsx)(q,{label:`Balance in Software`,value:t(i),tone:`success`,action:(0,F.jsxs)(I,{type:`secondary`,children:[`Base currency · Last transaction `,U(e?.last_software_transaction_date)]})})}),(0,F.jsx)(m,{xs:24,md:8,children:(0,F.jsx)(q,{label:s?`Reconciled`:`Reconciliation Needed`,value:`Difference ${t(o)}`,tone:s?`success`:`warning`,action:s?null:(0,F.jsx)(d,{size:`small`,type:`primary`,onClick:()=>w.visit(B(`accounting.bank-accounts.index`,{bank_account_id:e.id,view:`reconcile`},`/accounting/bank-accounts?bank_account_id=${e.id}&view=reconcile`)),children:`Reconcile Now`})})})]}),(0,F.jsx)(K,{title:`Balance History: Bank vs Software`,children:(0,F.jsx)(a,{size:`small`,pagination:!1,rowKey:(e,t)=>e?.date||t,dataSource:e?.balance_history||[],columns:[{title:`Date`,dataIndex:`date`,width:150,render:U},{title:`Bank Statement Balance`,dataIndex:`bank_statement_balance`,align:`right`,render:t},{title:`Software Ledger Balance`,dataIndex:`software_ledger_balance`,align:`right`,render:t}],locale:{emptyText:(0,F.jsx)(l,{description:`No balance history`})}})}),(0,F.jsx)(K,{title:`Deposit vs Withdrawal`,children:(0,F.jsx)(a,{size:`small`,pagination:!1,rowKey:(e,t)=>e?.date||t,dataSource:e?.deposit_withdrawal_summary||[],columns:[{title:`Date`,dataIndex:`date`,width:150,render:U},{title:`Deposits`,dataIndex:`deposits`,align:`right`,render:t},{title:`Withdrawals`,dataIndex:`withdrawals`,align:`right`,render:t}],locale:{emptyText:(0,F.jsx)(l,{description:`No deposit or withdrawal data`})}})}),(0,F.jsx)(K,{title:`Bank Transactions`,children:(0,F.jsx)(f,{size:`small`,items:[`all`,`matched`,`unmatched`,`needs_review`,`ignored`].map(e=>({key:e,label:V(e),children:(0,F.jsx)(a,{size:`small`,scroll:{x:1500},rowKey:(e,t)=>e?.id||t,dataSource:e===`all`?c:c.filter(t=>t.matching_status===e),columns:[{title:`Transaction Date`,dataIndex:`transaction_date`,width:150,render:U},{title:`Description`,dataIndex:`description`,width:260,render:e=>e||`-`},{title:`Reference Number`,dataIndex:`reference_no`,width:170,render:e=>e||`-`},{title:`Deposit`,dataIndex:`deposit`,width:130,align:`right`,render:e=>j(e)?t(e):`-`},{title:`Withdrawal`,dataIndex:`withdrawal`,width:130,align:`right`,render:e=>j(e)?t(e):`-`},{title:`Running Balance`,dataIndex:`running_balance`,width:160,align:`right`,render:t},{title:`Matched Software Transaction`,dataIndex:`matched_transaction`,width:220,render:M},{title:`Matching Status`,dataIndex:`matching_status`,width:150,render:e=>(0,F.jsx)(C,{children:V(e||`unmatched`)})},{title:`Difference`,dataIndex:`difference`,width:130,align:`right`,render:t},{title:`Actions`,width:280,fixed:`right`,render:(e,t)=>t?.matching_status===`matched`?`-`:(0,F.jsxs)(g,{size:4,children:[(0,F.jsx)(d,{size:`small`,children:`Match`}),(0,F.jsx)(d,{size:`small`,children:`Create`}),(0,F.jsx)(d,{size:`small`,children:`Ignore`})]})}],pagination:{pageSize:10}})}))})})]})}function De({record:e,formatMoney:t}){let n=e?.items||e?.cash_transfer_lines||e?.cashTransferLines||[],r=n.reduce((e,t)=>e+j(t?.amount),0);return(0,F.jsxs)(F.Fragment,{children:[e?.approved===!1?(0,F.jsx)(o,{showIcon:!0,type:`warning`,message:`This cash transfer is not approved yet.`}):null,(0,F.jsxs)(K,{title:`Details`,children:[(0,F.jsx)(J,{rows:[{label:`Transfer No`,value:e?.transfer_no},{label:`Date`,value:U(e?.transfer_date)},{label:`Reference`,value:e?.reference},{label:`From Account`,value:M(e?.from_account||e?.fromAccount)},{label:`Status`,value:e?.status},{label:`Approval Status`,value:e?.approved?`Approved`:`Not Approved`}]}),(0,F.jsx)(a,{size:`small`,className:`accounting-show__spaced-table`,pagination:!1,rowKey:(e,t)=>e?.id||t,dataSource:n,columns:[{title:`Transferred To`,render:(e,t)=>M(t?.to_account||t?.toAccount)},{title:`Description`,dataIndex:`description`,render:e=>e||`-`},{title:`Amount`,dataIndex:`amount`,align:`right`,render:t}],summary:()=>(0,F.jsxs)(a.Summary.Row,{children:[(0,F.jsx)(a.Summary.Cell,{index:0,colSpan:2,children:(0,F.jsx)(`strong`,{children:`Total`})}),(0,F.jsx)(a.Summary.Cell,{index:1,align:`right`,children:(0,F.jsx)(`strong`,{children:t(r)})})]})})]})]})}function Oe({record:e,formatMoney:t}){let n=e?.items||e?.journal_voucher_lines||e?.journalVoucherLines||e?.lines||[],r=n.reduce((e,t)=>e+j(t?.debit),0),i=n.reduce((e,t)=>e+j(t?.credit),0),o=Math.abs(r-i);return(0,F.jsxs)(K,{title:`Journal Voucher`,children:[(0,F.jsx)(J,{rows:[{label:`Voucher Number`,value:e?.voucher_no},{label:`Voucher Date`,value:U(e?.voucher_date)},{label:`Reference`,value:e?.reference},{label:`Branch`,value:M(e?.branch)},{label:`Currency`,value:M(e?.currency)},{label:`Status`,value:e?.status},{label:`Approval Status`,value:e?.approved?`Approved`:`Not Approved`},{label:`Narration`,value:e?.narration}]}),(0,F.jsx)(a,{size:`small`,className:`accounting-show__spaced-table`,pagination:!1,rowKey:(e,t)=>e?.id||t,dataSource:n,columns:[{title:`Chart of Account`,render:(e,t)=>{let n=t?.chart_of_account||t?.chartOfAccount||t?.account?.chart_of_account||t?.account?.chartOfAccount,r=t?.account||t?.account_id_detail;return M(n||r)||`-`}},{title:`Description`,dataIndex:`description`,render:e=>e||`-`},{title:`Debit`,dataIndex:`debit`,align:`right`,render:e=>j(e)?t(e):`-`},{title:`Credit`,dataIndex:`credit`,align:`right`,render:e=>j(e)?t(e):`-`}],summary:()=>(0,F.jsxs)(F.Fragment,{children:[(0,F.jsxs)(a.Summary.Row,{children:[(0,F.jsx)(a.Summary.Cell,{index:0,colSpan:2,children:(0,F.jsx)(`strong`,{children:`Total`})}),(0,F.jsx)(a.Summary.Cell,{index:1,align:`right`,children:(0,F.jsx)(`strong`,{children:t(r)})}),(0,F.jsx)(a.Summary.Cell,{index:2,align:`right`,children:(0,F.jsx)(`strong`,{children:t(i)})})]}),(0,F.jsxs)(a.Summary.Row,{children:[(0,F.jsx)(a.Summary.Cell,{index:0,colSpan:3,children:(0,F.jsx)(`strong`,{children:`Difference`})}),(0,F.jsx)(a.Summary.Cell,{index:1,align:`right`,children:(0,F.jsx)(`strong`,{children:t(o)})})]})]})})]})}function ke({record:e,formatMoney:n,onRefresh:r}){let[i,o]=(0,N.useState)([]),[c,l]=(0,N.useState)(!1),[u,ee]=(0,N.useState)(`topup`),[f,p]=(0,N.useState)(null),[ne,_]=(0,N.useState)(!1),[y]=v.useForm(),x=e?.top_ups||e?.loan_top_ups||e?.loanTopUps||[],w=e?.charges||e?.loan_charges||e?.loanCharges||[],T=e=>(0,F.jsx)(C,{color:e?`success`:`warning`,children:e?`Approved`:`Not Approved`}),E=e=>e===`charge`?`/api/loan-charges`:`/api/loan-top-ups`;(0,N.useEffect)(()=>{let e=!0;return t.get(R(`/api/accounts/`),{headers:z(),params:{active:!0,page_size:100,ordering:`code`}}).then(t=>{let n=t.data?.results||t.data?.data||(Array.isArray(t.data)?t.data:[]);e&&o(n.map(e=>({value:e.id,label:[e.code,e.name||e.label].filter(Boolean).join(` - `)||e.id})))}).catch(()=>{}),()=>{e=!1}},[]);let D=(t,n=null)=>{ee(t),p(n),y.setFieldsValue(t===`charge`?{charge_name:n?.charge_name||``,charge_date:n?.charge_date?(0,P.default)(n.charge_date).format(`YYYY-MM-DD`):(0,P.default)().format(`YYYY-MM-DD`),charges_paid_from_account_id:n?.charges_paid_from_account_id||n?.charges_paid_from_account?.id||n?.chargesPaidFromAccount?.id||null,amount:j(n?.amount),reference:n?.reference||``,notes:n?.notes||``,approved:!!n?.approved,active:n?.active!==!1}:{topup_date:n?.topup_date?(0,P.default)(n.topup_date).format(`YYYY-MM-DD`):(0,P.default)().format(`YYYY-MM-DD`),loan_received_in_account_id:n?.loan_received_in_account_id||n?.loan_received_in_account?.id||n?.loanReceivedInAccount?.id||e?.loan_received_in_account_id||null,amount:j(n?.amount),reference:n?.reference||``,notes:n?.notes||``,approved:!!n?.approved,active:n?.active!==!1}),l(!0)},ie=async()=>{let n=await y.validateFields(),i=u,a=i===`charge`,o={...n,loan_account_id:e.id,amount:j(n.amount),active:n.active!==!1,approved:!!n.approved};_(!0);try{let e=E(i);f?.id?await t.patch(R(`${e}/${f.id}/`),o,{headers:z()}):await t.post(R(`${e}/`),o,{headers:z()}),await r?.(),S.success(`${a?`Charge`:`Top-up`} ${f?.id?`updated`:`created`}`),l(!1)}catch(e){S.error(e?.response?.data?.message||`Failed to save ${a?`charge`:`top-up`}`)}finally{_(!1)}},ae=async(e,n,i)=>{try{await t.patch(R(`${E(e)}/${n.id}/`),{approved:i},{headers:z()}),await r?.(),S.success(i?`Marked as approved`:`Marked as not approved`)}catch(e){S.error(e?.response?.data?.message||`Approval update failed`)}},O=(e,n)=>{re.confirm({title:`Delete this ${e===`charge`?`charge`:`top-up`}?`,okText:`Delete`,okButtonProps:{danger:!0},onOk:async()=>{await t.delete(R(`${E(e)}/${n.id}/`),{headers:z()}),await r?.(),S.success(e===`charge`?`Charge deleted`:`Top-up deleted`)}})},oe=(e,t)=>(0,F.jsxs)(g,{size:4,children:[(0,F.jsx)(d,{size:`small`,onClick:()=>D(e,t),children:`Edit`}),(0,F.jsx)(d,{size:`small`,onClick:()=>ae(e,t,!t?.approved),children:t?.approved?`Mark Not Approved`:`Approve`}),(0,F.jsx)(d,{size:`small`,danger:!0,onClick:()=>O(e,t),children:`Delete`})]});return(0,F.jsxs)(F.Fragment,{children:[(0,F.jsxs)(h,{gutter:[12,12],children:[(0,F.jsx)(m,{xs:24,md:6,children:(0,F.jsx)(q,{label:`Opening Balance`,value:n(e?.opening_balance)})}),(0,F.jsx)(m,{xs:24,md:6,children:(0,F.jsx)(q,{label:`Current Balance`,value:n(e?.current_balance),tone:`success`})}),(0,F.jsx)(m,{xs:24,md:6,children:(0,F.jsx)(q,{label:`Interest Rate`,value:`${j(e?.interest_rate_per_annum).toLocaleString()}%`,tone:`warning`})}),(0,F.jsx)(m,{xs:24,md:6,children:(0,F.jsx)(q,{label:`Duration`,value:`${j(e?.duration_in_month).toLocaleString()} months`,tone:`info`})})]}),(0,F.jsx)(K,{title:`Loan Account Details`,children:(0,F.jsx)(J,{rows:[{label:`Loan Account`,value:e?.name},{label:`Lender Bank`,value:e?.bank_name},{label:`Loan Number`,value:e?.loan_number},{label:`Balance As Of`,value:U(e?.balance_as_of)},{label:`Loan Received In`,value:M(e?.loan_received_in_account||e?.loanReceivedInAccount)},{label:`Related Account`,value:M(e?.related_account||e?.relatedAccount)},{label:`Processing Fee`,value:n(e?.processing_fee)},{label:`Status`,value:V(e?.status||`active`)},{label:`Description`,value:e?.description}]})}),(0,F.jsx)(K,{title:`Top-ups`,extra:(0,F.jsx)(d,{size:`small`,type:`primary`,onClick:()=>D(`topup`),children:`Add Top-up`}),children:(0,F.jsx)(a,{size:`small`,dataSource:x,rowKey:(e,t)=>e?.id||t,pagination:!1,scroll:{x:900},columns:[{title:`Date`,dataIndex:`topup_date`,render:U},{title:`Received In`,render:(e,t)=>M(t?.loan_received_in_account||t?.loanReceivedInAccount)},{title:`Reference`,dataIndex:`reference`,render:e=>e||`-`},{title:`Amount`,dataIndex:`amount`,align:`right`,render:n},{title:`Approval Status`,dataIndex:`approved`,render:T},{title:`Actions`,width:250,render:(e,t)=>oe(`topup`,t)}]})}),(0,F.jsx)(K,{title:`Charges`,extra:(0,F.jsx)(d,{size:`small`,type:`primary`,onClick:()=>D(`charge`),children:`Add Charge`}),children:(0,F.jsx)(a,{size:`small`,dataSource:w,rowKey:(e,t)=>e?.id||t,pagination:!1,scroll:{x:900},columns:[{title:`Date`,dataIndex:`charge_date`,render:U},{title:`Charge`,dataIndex:`charge_name`,render:e=>e||`-`},{title:`Paid From`,render:(e,t)=>M(t?.charges_paid_from_account||t?.chargesPaidFromAccount)},{title:`Amount`,dataIndex:`amount`,align:`right`,render:n},{title:`Approval Status`,dataIndex:`approved`,render:T},{title:`Actions`,width:250,render:(e,t)=>oe(`charge`,t)}]})}),(0,F.jsx)(re,{title:`${f?.id?`Edit`:`Add`} ${u===`charge`?`Loan Charge`:`Loan Top-up`}`,open:c,onCancel:()=>l(!1),onOk:ie,confirmLoading:ne,destroyOnClose:!0,width:620,children:(0,F.jsxs)(v,{form:y,layout:`vertical`,children:[u===`charge`?(0,F.jsxs)(F.Fragment,{children:[(0,F.jsx)(v.Item,{name:`charge_name`,label:`Charge Name`,rules:[{required:!0,message:`Charge name is required`}],children:(0,F.jsx)(b,{placeholder:`Processing fee, bank charge...`})}),(0,F.jsx)(v.Item,{name:`charge_date`,label:`Charge Date`,rules:[{required:!0,message:`Charge date is required`}],children:(0,F.jsx)(b,{type:`date`})}),(0,F.jsx)(v.Item,{name:`charges_paid_from_account_id`,label:`Paid From Account`,rules:[{required:!0,message:`Paid from account is required`}],children:(0,F.jsx)(s,{showSearch:!0,placeholder:`Select account`,options:i,optionFilterProp:`label`})})]}):(0,F.jsxs)(F.Fragment,{children:[(0,F.jsx)(v.Item,{name:`topup_date`,label:`Top-up Date`,rules:[{required:!0,message:`Top-up date is required`}],children:(0,F.jsx)(b,{type:`date`})}),(0,F.jsx)(v.Item,{name:`loan_received_in_account_id`,label:`Received In Account`,rules:[{required:!0,message:`Received in account is required`}],children:(0,F.jsx)(s,{showSearch:!0,placeholder:`Select account`,options:i,optionFilterProp:`label`})})]}),(0,F.jsx)(v.Item,{name:`amount`,label:`Amount`,rules:[{required:!0,message:`Amount is required`}],children:(0,F.jsx)(te,{min:.01,precision:2,style:{width:`100%`}})}),(0,F.jsx)(v.Item,{name:`reference`,label:`Reference`,children:(0,F.jsx)(b,{})}),(0,F.jsx)(v.Item,{name:`notes`,label:`Notes`,children:(0,F.jsx)(b.TextArea,{rows:3})}),(0,F.jsxs)(h,{gutter:12,children:[(0,F.jsx)(m,{xs:24,md:12,children:(0,F.jsx)(v.Item,{name:`approved`,label:`Approval Status`,children:(0,F.jsx)(s,{options:[{value:!1,label:`Not Approved`},{value:!0,label:`Approved`}]})})}),(0,F.jsx)(m,{xs:24,md:12,children:(0,F.jsx)(v.Item,{name:`active`,label:`Status`,children:(0,F.jsx)(s,{options:[{value:!0,label:`Active`},{value:!1,label:`Inactive`}]})})})]})]})})]})}function Ae({record:e,formatMoney:t,title:n}){let r=Object.entries(e||{}).filter(([e,t])=>!([`id`,`account`,`account_id_detail`,`items`].includes(e)||Array.isArray(t)));return(0,F.jsx)(K,{title:`${n} Details`,children:(0,F.jsx)(J,{rows:r.map(([e,n])=>({label:V(e),value:/(amount|balance|total|debit|credit)/i.test(e)?t(n):M(n)}))})})}function Y({id:e,title:n,endpoint:r,backRoute:a,backLabel:ee,titleField:f=`name`,subtitleField:m,editRoute:h}){let{token:_}=he(),{currency:y,formatMoney:x}=ue(),[C,D]=(0,N.useState)(null),[O,se]=(0,N.useState)(!0),[k,A]=(0,N.useState)(!1),[P,L]=(0,N.useState)(!1),[ge,H]=(0,N.useState)(``),[W,be]=(0,N.useState)(!1),[xe,G]=(0,N.useState)(null),[q,J]=(0,N.useState)(!1),[Se,Ce]=(0,N.useState)(``),[Y,je]=(0,N.useState)(null),[Me,Ne]=(0,N.useState)(!1),[Pe]=v.useForm(),X=ye(n),Z=r.replace(/\/+$/,``),Q=X===`cash`?`cash_transfer`:X===`journal`?`journal_voucher`:null,Fe=(0,N.useMemo)(()=>({"--accounting-show-bg":_.colorBgLayout,"--accounting-show-surface":_.colorBgContainer,"--accounting-show-elevated":_.colorBgElevated,"--accounting-show-surface-soft":_.colorFillQuaternary,"--accounting-show-surface-muted":_.colorFillTertiary,"--accounting-show-border":_.colorBorderSecondary,"--accounting-show-border-strong":_.colorBorder,"--accounting-show-text":_.colorText,"--accounting-show-text-secondary":_.colorTextSecondary,"--accounting-show-text-tertiary":_.colorTextTertiary,"--accounting-show-primary":_.colorPrimary,"--accounting-show-primary-bg":_.colorPrimaryBg,"--accounting-show-success":_.colorSuccess,"--accounting-show-success-bg":_.colorSuccessBg,"--accounting-show-warning":_.colorWarning,"--accounting-show-warning-bg":_.colorWarningBg,"--accounting-show-error":_.colorError,"--accounting-show-info":_.colorInfo,"--accounting-show-radius":`${_.borderRadius}px`,"--accounting-show-radius-lg":`${_.borderRadiusLG}px`,"--accounting-show-padding-xxs":`${_.paddingXXS}px`,"--accounting-show-padding-xs":`${_.paddingXS}px`,"--accounting-show-padding-sm":`${_.paddingSM}px`,"--accounting-show-padding":`${_.padding}px`,"--accounting-show-padding-lg":`${_.paddingLG}px`,"--accounting-show-font-size-sm":`${_.fontSizeSM}px`,"--accounting-show-font-size":`${_.fontSize}px`,"--accounting-show-font-size-lg":`${_.fontSizeLG}px`,"--accounting-show-shadow":_.boxShadowTertiary||`none`}),[_]),Ie=async()=>{se(!0),H(``);try{let n=await t.get(R(`${Z}/${e}/`),{headers:z()});D(n.data?.data??n.data)}catch(e){let t=e?.response?.data?.message||`Failed to load ${n}`;H(t),D(null),S.error(t)}finally{se(!1)}};(0,N.useEffect)(()=>{Ie()},[Z,e]),(0,N.useEffect)(()=>{if(!W||!C||!Q)return;let e=!0;return(async()=>{J(!0),Ce(``),G(null);try{let[n,r]=await Promise.all([t.get(R(`/api/printing-templates/resolve?document_type=${encodeURIComponent(Q)}`),{headers:z()}),t.get(R(`/api/app-settings/current`),{headers:z()}).catch(()=>({data:null}))]);e&&(G(n.data?.data??n.data??null),je(r.data?.data??r.data??null))}catch(t){e&&(G(null),Ce(t?.response?.data?.message||`No active print template found. Fallback template is being used.`))}finally{e&&J(!1)}})(),()=>{e=!1}},[W,C,Q]);let $=(0,N.useMemo)(()=>C&&[`journal`,`cash`].includes(X)&&Object.prototype.hasOwnProperty.call(C,`approved`)&&C.approved!==!0?`#DRAFT`:C?.[f]||C?.display_name||C?.voucher_no||C?.transfer_no||C?.code||n,[X,C,n,f]),Le=m&&C?.[m]?C[m]:C?.code||C?.reference||``,Re=C&&Object.prototype.hasOwnProperty.call(C,`approved`)&&!C.approved&&!C.void,ze=(0,N.useMemo)(()=>{let e=X===`journal`?C?.journalVoucherLines||C?.journal_voucher_lines||C?.items||[]:C?.cashTransferLines||C?.cash_transfer_lines||C?.items||[],t=j(C?.total_debit??C?.total_amount??C?.amount??C?.total);return{record:C,company:{name:Y?.company_name||C?.company?.name||C?.branch?.name||`KiteLedger`,legal_name:Y?.legal_name||Y?.company_name||C?.company?.legal_name||C?.company?.name||``,logo:Y?.logo_url||Y?.dark_logo_url||Y?.logo||Y?.dark_logo||C?.company?.logo_url||C?.company?.logo||``,address:_e(Y)||C?.company?.address||C?.branch?.address||``,phone:Y?.phone||C?.company?.phone||C?.branch?.phone||``,email:Y?.email||C?.company?.email||C?.branch?.email||``,website:Y?.website||C?.company?.website||``,pan_or_vat:Y?.tax_number||Y?.vat_number||C?.company?.tax_id||C?.company?.pan_no||C?.branch?.tax_id||``,registration_number:Y?.registration_number||C?.company?.registration_number||``,footer:Y?.footer||``,tax_id:Y?.tax_number||Y?.vat_number||C?.company?.tax_id||C?.company?.pan_no||C?.branch?.tax_id||``,initials:String(Y?.company_name||C?.company?.name||C?.branch?.name||`KL`).split(/\s+/).map(e=>e.charAt(0)).join(``).slice(0,3).toUpperCase()},branch:{name:C?.branch?.name||``,address:C?.branch?.address||``,phone:C?.branch?.phone||``},document:{type:Q||``,title:n,number:$,date:U(C?.voucher_date||C?.transfer_date||C?.date),reference:C?.reference||`-`,status:V(C?.status||(C?.approved?`approved`:`draft`)),approved:!!C?.approved,void:!!C?.void,voided:!!C?.void,is_draft:!C?.void&&C?.approved!==!0,show_watermark:!!(Y?.show_watermark??!0),voided_reason:C?.voided_reason||``,notes:C?.notes||C?.narration||``,terms:``},party:{name:M(C?.contact||C?.fromAccount||C?.from_account||C?.account),address:``,phone:``,email:``,tax_id:``},account:{name:M(C?.account||C?.fromAccount||C?.from_account||C?.toAccount||C?.to_account)},currency:{code:C?.currency?.code||Y?.default_currency||``,symbol:C?.currency?.symbol||``,name:C?.currency?.name||``},exchange_rate:C?.exchange_rate?Number(C.exchange_rate).toFixed(2):``,totals:{subtotal:x(t),discount:x(0),tax:x(0),grand_total:x(t),total:x(t),amount_in_words:C?.amount_in_words||C?.total_in_words||``},payment:{method:C?.payment_method||C?.method||``,reference_number:C?.reference_no||C?.reference||``,source_account:M(C?.fromAccount||C?.from_account||C?.account),destination_account:M(C?.toAccount||C?.to_account)},subtotal:x(t),discount:x(0),tax:x(0),total:x(t),amount_paid:x(0),balance_due:x(0),notes:C?.notes||C?.narration||``,terms:``,prepared_by:M(C?.userAdd||C?.user_add),approved_by:M(C?.approvedBy||C?.approved_by),printed_at:new Date().toLocaleString(),settings:{show_watermark:!!(Y?.show_watermark??!0)},lines:e.map(e=>({product_name:M(e?.chartOfAccount||e?.chart_of_account||e?.account||e?.toAccount||e?.to_account)||`-`,description:e?.description||e?.narration||`-`,qty:`1.00`,unit_price:x(e?.debit||e?.amount||e?.credit||0),debit:x(e?.debit||0),credit:x(e?.credit||0),tax_amount:x(0),line_total:x(e?.debit||e?.amount||e?.credit||0),amount:x(e?.amount||e?.debit||e?.credit||0)})),items:e.map(e=>({product_name:M(e?.chartOfAccount||e?.chart_of_account||e?.account||e?.toAccount||e?.to_account)||`-`,description:e?.description||e?.narration||`-`,qty:`1.00`,unit_price:x(e?.debit||e?.amount||e?.credit||0),debit:x(e?.debit||0),credit:x(e?.credit||0),discount_amount:x(0),tax_amount:x(0),line_total:x(e?.debit||e?.amount||e?.credit||0),amount:x(e?.amount||e?.debit||e?.credit||0)}))}},[Y,x,X,Q,C,$,n]),Be=xe||{template_html:`
<section class="print-document">
  <header class="doc-header">
    <div><h1>{{company.name}}</h1><p>{{company.address}}</p><p>{{company.phone}} {{company.email}}</p></div>
    <div class="doc-meta"><h2>{{document.title}}</h2><p><strong>No:</strong> {{document.number}}</p><p><strong>Date:</strong> {{document.date}}</p><p><strong>Status:</strong> {{document.status}}</p></div>
  </header>
  <table class="lines"><thead><tr><th>#</th><th>Description</th><th class="num">Amount</th></tr></thead><tbody>{{#lines}}<tr><td>{{@index}}</td><td>{{product_name}}<br><span>{{description}}</span></td><td class="num">{{line_total}}</td></tr>{{/lines}}</tbody></table>
  <section class="totals"><p class="grand"><span>Total</span><strong>{{totals.grand_total}}</strong></p></section>
  <footer class="signatures"><div><span>Prepared By</span></div><div><span>Approved By</span></div><div><span>Received By</span></div></footer>
</section>`,template_css:`.print-document{font-family:Arial,sans-serif;color:#111827;font-size:12px}.doc-header{display:flex;justify-content:space-between;gap:24px;border-bottom:2px solid #111827;padding-bottom:14px;margin-bottom:18px}.doc-meta{text-align:right}.lines{width:100%;border-collapse:collapse}.lines th,.lines td{border:1px solid #d1d5db;padding:8px}.lines th{background:#f3f4f6;text-align:left}.lines span{color:#6b7280;font-size:11px}.num{text-align:right}.totals{width:300px;margin-left:auto;margin-top:16px}.totals p{display:flex;justify-content:space-between;border-bottom:2px solid #111827;padding:8px 0}.signatures{display:grid;grid-template-columns:repeat(3,1fr);gap:24px;margin-top:48px}.signatures div{border-top:1px solid #111827;padding-top:8px;text-align:center;font-weight:700}`},Ve=async(n,r)=>{A(!0);try{await t.patch(R(`${Z}/${e}/`),n,{headers:z()}),S.success(r),L(!1),await Ie()}catch(e){S.error(e?.response?.data?.message||`Update failed`)}finally{A(!1)}},He=async()=>{A(!0);try{await t.post(R(`${Z}/${e}/approve`),{},{headers:z()}),S.success(`${n} approved`),Ne(!1),await Ie()}catch(e){S.error(e?.response?.data?.message||`Approval failed`)}finally{A(!1)}},Ue=()=>{Pe.setFieldsValue(C||{}),L(!0)};return(0,F.jsxs)(ie,{children:[(0,F.jsx)(E,{title:$||n}),(0,F.jsx)(`style`,{children:`
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
      `}),(0,F.jsx)(`div`,{className:`accounting-show`,style:Fe,children:(0,F.jsxs)(`div`,{className:`accounting-show__shell`,children:[(0,F.jsx)(p,{className:`accounting-show__bar-card`,children:(0,F.jsxs)(`div`,{className:`accounting-show__bar`,children:[(0,F.jsxs)(`div`,{className:`accounting-show__crumb`,children:[(0,F.jsx)(T,{href:B(a,null,`#`),children:(0,F.jsx)(d,{type:`text`,icon:(0,F.jsx)(ae,{}),children:ee})}),(0,F.jsxs)(`div`,{className:`accounting-show__title-wrap`,children:[(0,F.jsx)(me,{level:4,children:O?n:$}),(0,F.jsx)(I,{type:`secondary`,ellipsis:!0,style:{maxWidth:640},children:Le||n})]})]}),(0,F.jsxs)(g,{size:8,wrap:!0,children:[Q?(0,F.jsx)(d,{icon:(0,F.jsx)(le,{}),onClick:()=>be(!0),disabled:O||!C,children:`Print Preview`}):null,(0,F.jsx)(u,{menu:{items:[{key:`edit`,label:`Edit ${n}`},C?.active===!1?{key:`active`,label:`Make Active`}:{key:`inactive`,label:`Make Inactive`},Re?{key:`approve`,label:`Approve`,icon:(0,F.jsx)(oe,{})}:null].filter(Boolean),onClick:({key:t})=>{if(t===`edit`){if(C?.approved||C?.void)return;h?w.visit(route(h,e)):Ue()}t===`active`&&Ve({active:!0},`${n} activated`),t===`inactive`&&Ve({active:!1},`${n} inactivated`),t===`approve`&&Ne(!0)}},trigger:[`click`],children:(0,F.jsxs)(d,{loading:k,children:[`Options `,(0,F.jsx)(ce,{})]})}),(0,F.jsx)(d,{type:`text`,icon:(0,F.jsx)(i,{}),onClick:()=>w.visit(B(a,null,`#`))})]})]})}),ge?(0,F.jsx)(`div`,{className:`accounting-show__state`,children:(0,F.jsx)(o,{type:`error`,showIcon:!0,message:ge,closable:!0,onClose:()=>H(``)})}):null,O?(0,F.jsx)(`div`,{className:`accounting-show__state`,children:(0,F.jsx)(c,{active:!0,paragraph:{rows:8}})}):C?(0,F.jsxs)(`div`,{className:`accounting-show__body`,children:[(0,F.jsx)(we,{module:X,record:C,recordTitle:$,subtitle:Le,title:n,formatMoney:x,token:_}),(0,F.jsxs)(`main`,{className:`accounting-show__main`,children:[Re?(0,F.jsx)(o,{showIcon:!0,type:`warning`,message:`This transaction is still in draft and has not been approved.`,description:`Approve it to assign the final document number and post it.`,action:(0,F.jsx)(d,{size:`small`,type:`primary`,onClick:He,children:`Approve`})}):null,C?.void?(0,F.jsx)(o,{showIcon:!0,type:`error`,message:`This transaction has been voided`,description:C?.voided_reason?`Reason: ${C.voided_reason}`:`This transaction is voided and cannot be edited or approved.`}):null,C?.active===!1&&X===`bank`?(0,F.jsx)(o,{showIcon:!0,type:`warning`,message:`This bank account is inactive.`,action:(0,F.jsx)(d,{size:`small`,type:`primary`,onClick:()=>Ve({active:!0},`Bank account activated`),children:`Make Active`})}):null,X===`chart`?(0,F.jsx)(Te,{record:C,formatMoney:x}):X===`bank`?(0,F.jsx)(Ee,{record:C,formatMoney:x,currency:y}):X===`cash`?(0,F.jsx)(De,{record:C,formatMoney:x}):X===`journal`?(0,F.jsx)(Oe,{record:C,formatMoney:x}):X===`loan`?(0,F.jsx)(ke,{record:C,formatMoney:x,onRefresh:Ie}):(0,F.jsx)(Ae,{record:C,formatMoney:x,title:n}),(0,F.jsx)(K,{title:`Record Info`,children:(0,F.jsx)(fe,{record:C})})]})]}):(0,F.jsx)(`div`,{className:`accounting-show__state`,children:(0,F.jsx)(l,{description:`${n} not found`})})]})}),(0,F.jsx)(ne,{title:`Print Preview`,open:W,onClose:()=>be(!1),width:1180,destroyOnClose:!1,styles:{body:{background:_.colorBgLayout,padding:16}},children:Q?q?(0,F.jsx)(c,{active:!0,paragraph:{rows:12}}):C?(0,F.jsxs)(de,{fileName:`${String($||n||`document`).replace(/[^\w.-]+/g,`_`)}.pdf`,documentTitle:$||n,printLabel:`Print`,downloadLabel:`Download PDF`,emailLabel:`Email`,children:[Se?(0,F.jsx)(o,{type:`info`,showIcon:!0,message:Se,style:{marginBottom:12}}):null,(0,F.jsx)(`style`,{children:Be.template_css||``}),(0,F.jsx)(`div`,{dangerouslySetInnerHTML:{__html:ve(Be.template_html,ze)}})]}):(0,F.jsx)(l,{description:`No record found for printing`}):(0,F.jsx)(o,{type:`warning`,showIcon:!0,message:`Unsupported document type`})}),(0,F.jsx)(re,{title:`Edit ${n}`,open:P,confirmLoading:k,onCancel:()=>L(!1),onOk:()=>Pe.validateFields().then(e=>Ve(e,`${n} updated`)),destroyOnClose:!0,children:(0,F.jsxs)(v,{form:Pe,layout:`vertical`,children:[X===`chart`?(0,F.jsxs)(F.Fragment,{children:[(0,F.jsx)(v.Item,{name:`name`,label:`Name`,rules:[{required:!0}],children:(0,F.jsx)(b,{})}),(0,F.jsx)(v.Item,{name:`description`,label:`Description`,children:(0,F.jsx)(b.TextArea,{rows:3})}),(0,F.jsx)(v.Item,{name:`active`,label:`Status`,children:(0,F.jsx)(s,{options:[{value:!0,label:`Active`},{value:!1,label:`Inactive`}]})})]}):null,X===`bank`?(0,F.jsxs)(F.Fragment,{children:[(0,F.jsx)(v.Item,{name:`display_name`,label:`Display Name`,rules:[{required:!0}],children:(0,F.jsx)(b,{})}),(0,F.jsx)(v.Item,{name:`bank_name`,label:`Bank Name`,children:(0,F.jsx)(b,{})}),(0,F.jsx)(v.Item,{name:`account_name`,label:`Account Name`,children:(0,F.jsx)(b,{})}),(0,F.jsx)(v.Item,{name:`account_number`,label:`Account Number`,children:(0,F.jsx)(b,{})}),(0,F.jsx)(v.Item,{name:`account_type`,label:`Account Type`,children:(0,F.jsx)(b,{})}),(0,F.jsx)(v.Item,{name:`swift_code`,label:`Swift Code`,children:(0,F.jsx)(b,{})}),(0,F.jsx)(v.Item,{name:`description`,label:`Description`,children:(0,F.jsx)(b.TextArea,{rows:3})})]}):null,X===`cash`?(0,F.jsxs)(F.Fragment,{children:[(0,F.jsx)(v.Item,{name:`reference`,label:`Reference`,children:(0,F.jsx)(b,{})}),(0,F.jsx)(v.Item,{name:`notes`,label:`Notes`,children:(0,F.jsx)(b.TextArea,{rows:3})}),(0,F.jsx)(v.Item,{name:`status`,label:`Status`,children:(0,F.jsx)(s,{options:[{value:`draft`,label:`Draft`},{value:`posted`,label:`Posted`},{value:`cancelled`,label:`Cancelled`}]})})]}):null,X===`journal`?(0,F.jsxs)(F.Fragment,{children:[(0,F.jsx)(v.Item,{name:`reference`,label:`Reference`,children:(0,F.jsx)(b,{})}),(0,F.jsx)(v.Item,{name:`narration`,label:`Narration`,children:(0,F.jsx)(b.TextArea,{rows:3})}),(0,F.jsx)(v.Item,{name:`status`,label:`Status`,children:(0,F.jsx)(s,{options:[{value:`draft`,label:`Draft`},{value:`posted`,label:`Posted`},{value:`cancelled`,label:`Cancelled`}]})})]}):null,X===`loan`?(0,F.jsxs)(F.Fragment,{children:[(0,F.jsx)(v.Item,{name:`name`,label:`Loan Account Name`,rules:[{required:!0}],children:(0,F.jsx)(b,{})}),(0,F.jsx)(v.Item,{name:`bank_name`,label:`Lender Bank`,children:(0,F.jsx)(b,{})}),(0,F.jsx)(v.Item,{name:`loan_number`,label:`Loan Number`,children:(0,F.jsx)(b,{})}),(0,F.jsx)(v.Item,{name:`opening_balance`,label:`Opening Balance`,children:(0,F.jsx)(te,{style:{width:`100%`}})}),(0,F.jsx)(v.Item,{name:`current_balance`,label:`Current Balance`,children:(0,F.jsx)(te,{style:{width:`100%`}})}),(0,F.jsx)(v.Item,{name:`description`,label:`Description`,children:(0,F.jsx)(b.TextArea,{rows:3})})]}):null]})}),(0,F.jsx)(pe,{open:Me,module:Q||X,transactionId:C?.id,onApprove:He,confirmLoading:k,onCancel:()=>Ne(!1)})]})}export{Y as default};