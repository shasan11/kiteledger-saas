import{i as e}from"./chunk-62oNxeRG.js";import{i as t}from"./axios-CFfZBleg.js";import{r as n,t as r}from"./jsx-runtime-gigNY91P.js";import{t as i}from"./table-7HIFvDMr.js";import{t as a}from"./alert-BaHPwePE.js";import{t as o}from"./skeleton-AlTJQnhB.js";import{t as s}from"./select-DERalnSy.js";import{t as c}from"./empty-Cy-mvObV.js";import{t as l}from"./tooltip-clCwpzP8.js";import{t as u}from"./button-BmYu5N-C.js";import{t as d}from"./dayjs.min-CATwxWQA.js";import{t as f}from"./date-picker-D_uc1Hii.js";import{t as p}from"./card-DTJPOkHd.js";import{t as m}from"./spin-BfAw3Rbz.js";import{t as h}from"./checkbox-CV99JMDR.js";import{n as g,t as _}from"./row-BBL_6KDH.js";import{t as v}from"./divider-Ct4j5QWj.js";import{t as y}from"./space-z60N_4CI.js";import{t as b}from"./drawer-DtcwWALr.js";import{t as x}from"./list-BV3wuoTI.js";import{n as S,t as C}from"./typography-C64NIvH1.js";import{t as w}from"./message-DCCj7RBS.js";import{t as ee}from"./ReloadOutlined-DOxyFpkG.js";import{t as te}from"./statistic-CnUcTCHO.js";import{t as T}from"./tag-6_jbeUxL.js";import{t as ne}from"./DownloadOutlined-Bkrkdd--.js";import{o as re,t as ie}from"./index.esm-DhG8u0u_.js";import{c as ae}from"./app-CFwJBgsW.js";import{i as E,t as oe}from"./AuthenticatedLayout-QCsF94_K.js";import{t as se}from"./FileExcelOutlined-BnKh5c_-.js";import{t as ce}from"./FilePdfOutlined-BPmGRrLM.js";import{t as le}from"./PlayCircleOutlined-BlAy1AsQ.js";import{t as ue}from"./PrinterOutlined-DcggOzLg.js";var D=e(n(),1),O=e(d(),1),k=r(),{Text:A}=C;function j({title:e,items:t=[]}){return t.length?(0,k.jsxs)(`div`,{children:[(0,k.jsx)(A,{strong:!0,style:{display:`block`,marginBottom:8},children:e}),(0,k.jsx)(x,{size:`small`,dataSource:t,renderItem:e=>(0,k.jsx)(x.Item,{style:{paddingLeft:0,paddingRight:0},children:(0,k.jsx)(A,{children:e})})})]}):null}var{Paragraph:M,Text:de,Title:N}=C;function fe(e,t){return[[t||`Report`,[e.executive_summary]],[`Key Numbers`,e.key_numbers],[`Notable Trends`,e.trends],[`Risks or Anomalies`,e.risks],[`Suggested Actions`,e.recommended_actions],[`Disclaimer`,[e.disclaimer]]].filter(([,e])=>Array.isArray(e)&&e.filter(Boolean).length).map(([e,t])=>`${e}\n${t.filter(Boolean).map(e=>`- ${e}`).join(`
`)}`).join(`

`)}function P({open:e,onClose:t,onRegenerate:n,loading:r,error:i,data:s,reportTitle:c,filters:l={}}){let d=s?.summary,f=l.date_from&&l.date_to?`${l.date_from} to ${l.date_to}`:l.as_of_date||l.ageing_as_of_date;return(0,k.jsx)(b,{title:`AI Report Summary`,open:e,onClose:t,width:560,destroyOnClose:!1,extra:(0,k.jsxs)(y,{children:[(0,k.jsx)(u,{icon:(0,k.jsx)(S,{}),onClick:async()=>{if(d)try{await navigator.clipboard.writeText(fe(d,c)),w.success(`AI report summary copied.`)}catch{w.error(`Could not copy the summary.`)}},disabled:!d||r,children:`Copy`}),(0,k.jsx)(u,{icon:(0,k.jsx)(ee,{}),onClick:n,loading:r,disabled:!s&&r,children:`Regenerate`})]}),children:(0,k.jsxs)(y,{direction:`vertical`,size:16,style:{width:`100%`},children:[(0,k.jsxs)(y,{size:8,wrap:!0,children:[(0,k.jsx)(T,{color:`blue`,children:c||`Report`}),f&&(0,k.jsx)(T,{children:f}),s?.meta?.cached&&(0,k.jsx)(T,{color:`default`,children:`Cached`}),s?.meta?.sampled_row_count<s?.meta?.row_count&&(0,k.jsxs)(T,{color:`gold`,children:[`Sampled `,s.meta.sampled_row_count,` of `,s.meta.row_count,` rows`]})]}),r&&(0,k.jsx)(o,{active:!0,paragraph:{rows:9}}),!r&&i&&(0,k.jsx)(a,{type:`error`,showIcon:!0,message:`Summary unavailable`,description:i}),!r&&!i&&d&&(0,k.jsxs)(k.Fragment,{children:[(0,k.jsxs)(`div`,{children:[(0,k.jsx)(N,{level:5,style:{marginTop:0,marginBottom:8},children:`Executive Summary`}),(0,k.jsx)(M,{style:{marginBottom:0},children:d.executive_summary||`No executive summary was returned.`})]}),(0,k.jsx)(v,{style:{margin:`2px 0`}}),(0,k.jsx)(j,{title:`Key Numbers`,items:d.key_numbers||[]}),(0,k.jsx)(j,{title:`Notable Trends`,items:d.trends||[]}),(0,k.jsx)(j,{title:`Risks or Anomalies`,items:d.risks||[]}),(0,k.jsx)(j,{title:`Suggested Actions`,items:d.recommended_actions||[]}),(0,k.jsx)(a,{type:`info`,showIcon:!0,message:(0,k.jsx)(de,{type:`secondary`,children:d.disclaimer})})]})]})})}var F=``,I=e=>`${F}${e}`;function pe({category:e,reportKey:n,reportTitle:r,filters:i={},columns:a=[],rows:o=[],totals:s={},summaryCards:c=[],metadata:d={},disabled:f=!1}){let[p,m]=(0,D.useState)(!1),[h,g]=(0,D.useState)(!1),[_,v]=(0,D.useState)(null),[y,b]=(0,D.useState)(null),x=async()=>{m(!0),g(!0),b(null);try{v((await t.post(I(`/api/reports/${e}/${n}/ai-summary`),{filters:i,columns:a.slice(0,30).map(e=>({key:e.key,title:String(e.title||e.key||``)})),rows:o.slice(0,100),totals:s,summary_cards:c,metadata:{...d,row_count:o.length}})).data?.data||null)}catch(e){let t=e?.response?.data?.message||`Unable to generate summary right now. Please try again.`;b(t),w.error(t)}finally{g(!1)}};return(0,k.jsxs)(k.Fragment,{children:[(0,k.jsx)(l,{title:f?`Generate the report before requesting an AI summary.`:`Summarize the generated report`,children:(0,k.jsx)(u,{icon:(0,k.jsx)(E,{}),disabled:f,loading:h,onClick:x,children:`AI Summary`})}),(0,k.jsx)(P,{open:p,onClose:()=>m(!1),onRegenerate:x,loading:h,error:y,data:_,reportTitle:r,filters:i})]})}var L=``,R=e=>`${L}${e}`,{RangePicker:me}=f,{Text:z,Title:he}=C,B=`debit.credit.amount.total.balance.value.qty.stock.paid.due.tax.discount.cost.salary.deduction.payable.inflow.outflow.profit.revenue.expense.subtotal.price.fee.rate.bonus.entitlement.sales.purchase.gross.net.asset.liability.equity.opening.closing.running`.split(`.`),ge={posted:`green`,approved:`green`,paid:`green`,active:`green`,healthy:`green`,"in stock":`green`,"approved leave":`blue`,draft:`gold`,pending:`gold`,"part paid":`orange`,"low stock":`orange`,watch:`orange`,late:`orange`,early_out:`orange`,void:`red`,cancelled:`red`,inactive:`default`,"out of stock":`red`,absent:`red`,rejected:`red`},_e=new Set([`status`,`approval`,`payment_status`,`interpretation`,`age_bucket`,`leave_status`,`in_time_status`,`out_time_status`]);function V(e){let t=(e||``).toLowerCase();return B.some(e=>t.includes(e))}function H(e){let t=Number(e??0);return Number.isFinite(t)?t.toLocaleString(void 0,{minimumFractionDigits:2,maximumFractionDigits:2}):String(e??`-`)}function ve(e){return e==null||e===``?null:typeof e==`object`?e?.name||e?.code||e?.label||null:e}function ye(){let e=new URLSearchParams(window.location.search),t={};for(let[n,r]of e.entries())r===`1`?t[n]=!0:r===`0`?t[n]=!1:t[n]=r;return t}function U(e){let t=new URLSearchParams;Object.entries(e).forEach(([e,n])=>{n==null||n===``||n===!1||t.set(e,n===!0?`1`:String(n))});let n=t.toString();window.history.replaceState({},``,`${window.location.pathname}${n?`?${n}`:``}`)}function be({source:e,value:n,label:r,placeholder:i,onChange:a}){let[o,c]=(0,D.useState)([]),[l,u]=(0,D.useState)(!1),d=(0,D.useRef)(null),f=(0,D.useCallback)(async r=>{u(!0);try{let{data:i}=await t.get(R(`/api/reports/options/${e}`),{params:{search:r||void 0,selected_id:n||void 0,limit:30}});c((i?.items||[]).map(e=>({value:e.id,label:e.label||e.name||String(e.id)})))}catch{c([])}finally{u(!1)}},[e,n]);return(0,D.useEffect)(()=>{f(``)},[e]),(0,k.jsx)(s,{allowClear:!0,showSearch:!0,filterOption:!1,loading:l,style:{width:`100%`},placeholder:i||`Select ${r}`,value:n||void 0,onChange:e=>a(e??null),onSearch:e=>{d.current&&clearTimeout(d.current),d.current=setTimeout(()=>f(e),250)},options:o})}function W(){let{token:e}=ae.useToken(),n=re(),r=n.props.auth?.permissions||[],o=!!n.props.auth?.canBypassPermissions,l=e=>o||r.includes(e),d=n.props.branchContext||{},v=n.props.reportCategory,b=n.props.reportKey,{title:x=b||`Report`,category_label:S=v,description:C,filter_schema:w=[],permission:E,default_date_mode:A=`period`}=n.props.reportConfig||{},j=v,M=b,de=l(`reports.view`)||E&&l(E),N=l(`reports.export`),fe=l(`reports.ai_summary`),P=d.selectedBranchId||n.props.auth?.currentBranchId,F=(0,D.useMemo)(()=>({date_from:(0,O.default)().startOf(`month`).format(`YYYY-MM-DD`),date_to:(0,O.default)().format(`YYYY-MM-DD`),as_of_date:(0,O.default)().format(`YYYY-MM-DD`),ageing_as_of_date:(0,O.default)().format(`YYYY-MM-DD`),branch_id:P,group_by:`day`,include_zero_balance:!1,include_zero_stock:!1,include_inactive:!1}),[P]),[I,L]=(0,D.useState)(()=>({...F,...ye()})),[B,W]=(0,D.useState)({loading:!1,error:null,data:null}),[G,xe]=(0,D.useState)(!1),[K,Se]=(0,D.useState)(null),[q,Ce]=(0,D.useState)(null),[we,J]=(0,D.useState)(!1),[Y,X]=(0,D.useState)(!1),Te=(0,D.useRef)(null);(0,D.useEffect)(()=>{U(I),new URLSearchParams(window.location.search).get(`auto_generate`)===`1`&&setTimeout(()=>Oe(),0)},[]),(0,D.useEffect)(()=>{let e=()=>X(!0),t=()=>X(!1);return window.addEventListener(`beforeprint`,e),window.addEventListener(`afterprint`,t),()=>{window.removeEventListener(`beforeprint`,e),window.removeEventListener(`afterprint`,t)}},[]);let Ee=()=>{X(!0),setTimeout(()=>{window.print(),setTimeout(()=>X(!1),200)},80)},De=(0,D.useMemo)(()=>!I.branch_id||I.branch_id===`all`?`All Branches`:(d.branches||[]).find(e=>String(e.id)===String(I.branch_id))?.name||`Current Branch`,[d.branches,I.branch_id]),Z=e=>{L(t=>{let n={...t,...e};return G&&J(!0),n})},Oe=async()=>{U(I),W({loading:!0,error:null,data:B.data}),J(!1);try{let{data:e}=await t.get(R(`/api/reports/${j}/${M}`),{params:I});W({loading:!1,error:e.error?e.error===!0?e.message:e.error:null,data:e.error?null:e}),e.error||(xe(!0),Se({...I}),Ce((0,O.default)().format(`YYYY-MM-DD HH:mm:ss`)))}catch(e){W({loading:!1,error:e?.response?.data?.message||e?.response?.data?.error||e?.message||`Failed to load report.`,data:null})}},ke=()=>{L({...F}),U({}),W({loading:!1,error:null,data:null}),xe(!1),Se(null),Ce(null),J(!1)},Q=e=>{let t=K||I,n=new URLSearchParams;return Object.entries(t).forEach(([e,t])=>{t==null||t===``||t===!1||n.set(e,t===!0?`1`:String(t))}),n.set(`format`,e),R(`/api/reports/${j}/${M}/export?${n.toString()}`)},Ae=(0,D.useMemo)(()=>(B.data?.columns||[]).map(e=>({title:e.title,dataIndex:e.key,key:e.key,align:V(e.key)?`right`:`left`,render:t=>{let n=ve(t);return n===null?(0,k.jsx)(z,{type:`secondary`,children:`-`}):_e.has(e.key)?(0,k.jsx)(T,{color:ge[String(n).toLowerCase()]||`default`,children:String(n)}):typeof t==`boolean`?t?`Yes`:`No`:V(e.key)&&typeof n==`number`?H(n):String(n)}})),[B.data?.columns]),je=G&&!B.loading,$=N&&G&&!B.loading;return de?(0,k.jsxs)(oe,{header:(0,k.jsx)(`h2`,{className:`text-xl font-semibold leading-tight`,children:x}),children:[(0,k.jsx)(ie,{title:x}),(0,k.jsx)(`style`,{children:`
        .print-only { display: none; }

        @media print {
          /* Zero @page margin so the browser has no room for its default
             header/footer (URL, page numbers, date). Real margins live on
             .report-print-area below. Users can re-enable browser headers
             from the print dialog if they want. */
          @page { size: A4 landscape; margin: 0; }

          html, body {
            background: #fff !important;
            margin: 0 !important;
            padding: 0 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color: #000 !important;
            font-size: 10px !important;
            line-height: 1.25 !important;
          }

          /* Hide everything except the print area */
          body * { visibility: hidden !important; }
          .report-print-area, .report-print-area * { visibility: visible !important; }
          .report-print-area {
            position: absolute !important;
            inset: 0 !important;
            width: 100% !important;
            padding: 8mm 8mm 10mm !important;
            margin: 0 !important;
            box-sizing: border-box !important;
          }

          /* Hide chrome */
          .report-toolbar, .ant-layout-sider, .ant-layout-header,
          .ant-breadcrumb, .report-no-print,
          .ant-pagination, .ant-table-pagination,
          .ant-back-top, .ant-float-btn-group, .ant-float-btn {
            display: none !important;
          }

          .print-only { display: block !important; }

          /* Strip down card/container shells */
          .report-print-area .ant-card,
          .report-print-area .ant-card-bordered { background: #fff !important; border: 0 !important; box-shadow: none !important; }
          .report-print-area .ant-card-body { padding: 0 !important; }

          /* Tight print header */
          .report-print-header { border-bottom: 1.5px solid #000 !important; padding-bottom: 6px !important; margin-bottom: 8px !important; }
          .report-print-header h1 { font-size: 16px !important; margin: 0 0 2px !important; font-weight: 700 !important; }
          .report-print-header .meta { font-size: 10px !important; color: #333 !important; margin: 1px 0 !important; }
          .report-print-header .filters-line { font-size: 9.5px !important; color: #555 !important; margin-top: 2px !important; }

          /* Summary cards → inline compact strip */
          .report-summary-row { display: flex !important; flex-wrap: wrap !important; gap: 0 !important;
            border: 1px solid #999 !important; border-radius: 0 !important; margin: 0 0 6px !important; }
          .report-summary-row .ant-col { flex: 1 1 0 !important; max-width: none !important; padding: 0 !important; }
          .report-summary-row .ant-card { border-right: 1px solid #ddd !important; border-radius: 0 !important; }
          .report-summary-row .ant-col:last-child .ant-card { border-right: 0 !important; }
          .report-summary-row .ant-card-body { padding: 4px 8px !important; }
          .report-summary-row .ant-statistic-title { font-size: 9px !important; color: #444 !important; margin: 0 !important; }
          .report-summary-row .ant-statistic-content { font-size: 11px !important; line-height: 1.2 !important; }
          .report-summary-row .ant-statistic-content-value { font-weight: 600 !important; }

          /* Table density */
          .report-print-area .ant-table,
          .report-print-area .ant-table-content,
          .report-print-area .ant-table-container,
          .report-print-area .ant-table-cell { background: #fff !important; color: #000 !important; }
          .report-print-area .ant-table { font-size: 9px !important; }
          .report-print-area .ant-table-thead > tr > th {
            background: #f0f0f0 !important;
            color: #000 !important;
            font-weight: 700 !important;
            padding: 3px 5px !important;
            border-bottom: 1px solid #000 !important;
            border-right: 1px solid #ddd !important;
            line-height: 1.2 !important;
            white-space: nowrap !important;
          }
          .report-print-area .ant-table-tbody > tr > td {
            padding: 2px 5px !important;
            border-bottom: 1px solid #e5e5e5 !important;
            border-right: 1px solid #f0f0f0 !important;
            line-height: 1.2 !important;
          }
          .report-print-area .ant-table-tbody > tr:nth-child(even) > td { background: #fafafa !important; }
          .report-print-area .ant-table-summary > tr > td {
            font-weight: 700 !important;
            border-top: 1.5px solid #000 !important;
            border-bottom: 1.5px solid #000 !important;
            padding: 3px 5px !important;
            background: #fff !important;
          }

          /* Tag rendering — plain text-ish */
          .report-print-area .ant-tag {
            background: transparent !important;
            border: 1px solid #888 !important;
            color: #000 !important;
            padding: 0 4px !important;
            font-size: 9px !important;
            line-height: 1.3 !important;
            margin: 0 !important;
          }

          /* Strip scroll wrappers so the whole table flows */
          .report-print-area .ant-table-body,
          .report-print-area .ant-table-content,
          .report-print-area .ant-table-container { overflow: visible !important; }
          .report-print-area .ant-table-sticky-holder,
          .report-print-area .ant-table-sticky-scroll { position: static !important; display: none !important; }

          /* Page break behaviour */
          .report-print-area table { page-break-inside: auto !important; border-collapse: collapse !important; width: 100% !important; }
          .report-print-area tr { page-break-inside: avoid !important; page-break-after: auto !important; }
          .report-print-area thead { display: table-header-group !important; }
          .report-print-area tfoot { display: table-footer-group !important; }
          .report-print-area .ant-alert { display: none !important; }
          .report-print-area .ant-empty { padding: 16px 0 !important; }

          /* Right-align numerics (use tabular-nums for clean column alignment) */
          .report-print-area .ant-table-cell { font-variant-numeric: tabular-nums !important; }
        }
      `}),(0,k.jsxs)(`div`,{style:{padding:20,background:e.colorBgLayout,minHeight:`calc(100vh - 96px)`},children:[(0,k.jsx)(p,{bordered:!1,style:{marginBottom:16,background:e.colorBgContainer},className:`report-no-print`,children:(0,k.jsxs)(y,{direction:`vertical`,size:4,style:{width:`100%`},children:[(0,k.jsxs)(y,{align:`center`,wrap:!0,children:[(0,k.jsx)(he,{level:4,style:{margin:0},children:x}),(0,k.jsx)(T,{color:`blue`,children:S}),G&&q&&(0,k.jsxs)(T,{color:`green`,children:[`Generated `,q]}),(0,k.jsx)(T,{children:A===`as_of`?`As-of report`:A===`ageing`?`Ageing report`:A===`none`?`Master list`:`Period report`})]}),C&&(0,k.jsx)(z,{type:`secondary`,children:C})]})}),(0,k.jsx)(p,{bordered:!1,className:`report-toolbar`,style:{marginBottom:16,background:e.colorBgContainer},children:(0,k.jsxs)(_,{gutter:[12,16],children:[w.map(e=>{let t=(0,k.jsx)(z,{type:`secondary`,style:{display:`block`,marginBottom:4,fontSize:12},children:e.label});if(e.type===`dateRange`)return(0,k.jsxs)(g,{xs:24,md:12,lg:8,children:[t,(0,k.jsx)(me,{style:{width:`100%`},value:I.date_from&&I.date_to?[(0,O.default)(I.date_from),(0,O.default)(I.date_to)]:null,onChange:e=>Z({date_from:e?.[0]?.format(`YYYY-MM-DD`)??null,date_to:e?.[1]?.format(`YYYY-MM-DD`)??null})})]},e.key);if(e.type===`date`)return(0,k.jsxs)(g,{xs:24,md:8,lg:6,children:[t,(0,k.jsx)(f,{style:{width:`100%`},value:I[e.key]?(0,O.default)(I[e.key]):null,onChange:t=>Z({[e.key]:t?.format(`YYYY-MM-DD`)??null})})]},e.key);if(e.type===`branch`)return(0,k.jsxs)(g,{xs:24,md:8,lg:6,children:[t,(0,k.jsx)(be,{source:`branches`,label:e.label,value:I.branch_id,onChange:e=>Z({branch_id:e})})]},e.key);if(e.type===`checkbox`)return(0,k.jsx)(g,{xs:24,md:8,lg:6,style:{display:`flex`,alignItems:`flex-end`,paddingBottom:4},children:(0,k.jsx)(h,{checked:!!I[e.key],onChange:t=>Z({[e.key]:t.target.checked}),children:e.label})},e.key);if(e.type===`status`){let n=[`draft`,`posted`,`part_paid`,`paid`,`void`,`cancelled`].map(e=>({value:e,label:e.replace(/_/g,` `).replace(/\b\w/g,e=>e.toUpperCase())}));return(0,k.jsxs)(g,{xs:24,md:8,lg:6,children:[t,(0,k.jsx)(s,{allowClear:!0,style:{width:`100%`},placeholder:`Select ${e.label}`,value:I[e.key]||void 0,onChange:t=>Z({[e.key]:t??null}),options:n})]},e.key)}if(e.type===`groupBy`){let n=({sales:[`day`,`week`,`month`,`customer`,`branch`],purchase:[`day`,`week`,`month`,`supplier`,`branch`]}[j]||[`day`,`week`,`month`,`branch`]).map(e=>({value:e,label:e.charAt(0).toUpperCase()+e.slice(1)}));return(0,k.jsxs)(g,{xs:24,md:8,lg:6,children:[t,(0,k.jsx)(s,{allowClear:!0,style:{width:`100%`},placeholder:`Select ${e.label}`,value:I[e.key]||void 0,onChange:t=>Z({[e.key]:t??null}),options:n})]},e.key)}return(0,k.jsxs)(g,{xs:24,md:8,lg:6,children:[t,(0,k.jsx)(be,{source:e.source,label:e.label,value:I[e.key],onChange:t=>Z({[e.key]:t})})]},e.key)}),(0,k.jsx)(g,{xs:24,children:(0,k.jsxs)(y,{wrap:!0,children:[(0,k.jsx)(u,{type:`primary`,icon:(0,k.jsx)(le,{}),onClick:Oe,loading:B.loading,children:`Generate Report`}),(0,k.jsx)(u,{icon:(0,k.jsx)(ee,{}),onClick:ke,children:`Reset`}),fe&&(0,k.jsx)(pe,{category:j,reportKey:M,reportTitle:x,filters:K||I,columns:B.data?.columns||[],rows:B.data?.rows||[],totals:B.data?.totals||{},summaryCards:B.data?.summary||[],metadata:{currency:B.data?.currency?.code||n.props.defaultCurrency?.code||``,branch:De,generated_at:q},disabled:!G||B.loading||we}),(0,k.jsx)(u,{icon:(0,k.jsx)(se,{}),disabled:!$,onClick:()=>window.open(Q(`xlsx`),`_blank`),children:`Export Excel`}),(0,k.jsx)(u,{icon:(0,k.jsx)(ne,{}),disabled:!$,onClick:()=>window.open(Q(`csv`),`_blank`),children:`Export CSV`}),(0,k.jsx)(u,{icon:(0,k.jsx)(ce,{}),disabled:!$,onClick:()=>window.open(Q(`pdf`),`_blank`),children:`Export PDF`}),(0,k.jsx)(u,{icon:(0,k.jsx)(ue,{}),disabled:!je,onClick:Ee,children:`Print`})]})})]})}),we&&G&&(0,k.jsx)(a,{type:`warning`,showIcon:!0,message:`Filters changed — click Generate Report to refresh results.`,style:{marginBottom:16},className:`report-no-print`,closable:!0,onClose:()=>J(!1)}),(0,k.jsxs)(`div`,{ref:Te,className:`report-print-area`,children:[(0,k.jsxs)(`div`,{className:`print-only report-print-header`,children:[(()=>{let e=B.data?.company||{},t=[e.phone&&`Phone: ${e.phone}`,e.email&&`Email: ${e.email}`,e.website].filter(Boolean),n=[e.tax_number&&`Tax No: ${e.tax_number}`,e.vat_number&&`VAT No: ${e.vat_number}`,e.registration_number&&`Reg No: ${e.registration_number}`].filter(Boolean);return(0,k.jsxs)(k.Fragment,{children:[e.name&&(0,k.jsx)(`h1`,{children:e.name}),e.tag_line&&(0,k.jsx)(`p`,{className:`meta`,children:e.tag_line}),e.address&&(0,k.jsx)(`p`,{className:`meta`,children:e.address}),t.length>0&&(0,k.jsx)(`p`,{className:`meta`,children:t.join(`  ·  `)}),n.length>0&&(0,k.jsx)(`p`,{className:`meta`,children:n.join(`  ·  `)})]})})(),(0,k.jsx)(`p`,{className:`report-title`,style:{fontSize:13,fontWeight:700,margin:`6px 0 2px`},children:x}),(0,k.jsxs)(`p`,{className:`meta`,children:[(0,k.jsx)(`strong`,{children:S}),` · Branch: ${De}`,q&&` · Generated: ${q}`]}),(B.data?.period?.from||K?.as_of_date||K?.ageing_as_of_date)&&(0,k.jsx)(`p`,{className:`meta`,children:B.data?.period?.from?`Period: ${B.data.period.from} to ${B.data.period.to}`:K?.as_of_date?`As of: ${K.as_of_date}`:`Ageing as of: ${K.ageing_as_of_date}`}),K&&(0,k.jsx)(`p`,{className:`filters-line`,children:Object.entries(K).filter(([e,t])=>t!==null&&t!==``&&t!==!1&&![`date_from`,`date_to`,`as_of_date`,`ageing_as_of_date`,`branch_id`,`group_by`].includes(e)).slice(0,8).map(([e,t])=>`${e.replace(/_/g,` `)}: ${t}`).join(`  ·  `)})]}),!G&&!B.loading&&!B.error&&(0,k.jsx)(p,{bordered:!1,style:{background:e.colorBgContainer},children:(0,k.jsx)(c,{image:c.PRESENTED_IMAGE_SIMPLE,description:(0,k.jsxs)(y,{direction:`vertical`,align:`center`,size:4,children:[(0,k.jsx)(z,{style:{fontSize:15,fontWeight:500,color:e.colorText},children:`Generate Report`}),(0,k.jsxs)(z,{type:`secondary`,children:[`Select filters above and click `,(0,k.jsx)(`strong`,{children:`Generate Report`}),` to view results.`]})]})})}),B.loading&&(0,k.jsx)(p,{bordered:!1,style:{background:e.colorBgContainer},children:(0,k.jsxs)(`div`,{style:{padding:48,textAlign:`center`},children:[(0,k.jsx)(m,{size:`large`}),(0,k.jsx)(`div`,{style:{marginTop:16},children:(0,k.jsx)(z,{type:`secondary`,children:`Generating report…`})})]})}),!B.loading&&B.error&&(0,k.jsx)(a,{type:`error`,showIcon:!0,message:`Report Error`,description:B.error,style:{marginBottom:16}}),!B.loading&&!B.error&&G&&B.data&&(0,k.jsxs)(k.Fragment,{children:[(B.data.summary||[]).length>0&&(0,k.jsx)(_,{gutter:[12,12],className:`report-summary-row`,style:{marginBottom:16},children:B.data.summary.map(t=>(0,k.jsx)(g,{xs:24,sm:12,md:8,lg:6,children:(0,k.jsx)(p,{bordered:!1,size:`small`,style:{background:e.colorBgContainer},children:(0,k.jsx)(te,{title:t.label,value:typeof t.value==`number`?H(t.value):t.value??`-`,valueStyle:{fontSize:18}})})},t.label))}),(0,k.jsx)(p,{bordered:!1,style:{background:e.colorBgContainer},children:(B.data.rows||[]).length===0?(0,k.jsx)(c,{description:`No records found for the selected filters.`}):(0,k.jsx)(i,{size:`small`,sticky:!Y,rowKey:(e,t)=>`row-${t}`,columns:Ae,dataSource:B.data.rows||[],pagination:Y?!1:{pageSize:100,showSizeChanger:!0,pageSizeOptions:[50,100,250,500],showTotal:e=>`${e.toLocaleString()} records`},scroll:Y?void 0:{x:`max-content`},summary:()=>{let e=Object.entries(B.data.totals||{});return e.length?(0,k.jsx)(i.Summary,{fixed:!0,children:e.map(([e,t])=>(0,k.jsxs)(i.Summary.Row,{children:[(0,k.jsx)(i.Summary.Cell,{index:0,colSpan:Math.max(Ae.length-1,1),children:(0,k.jsx)(z,{strong:!0,children:e.replace(/_/g,` `).replace(/\b\w/g,e=>e.toUpperCase())})}),(0,k.jsx)(i.Summary.Cell,{index:1,align:`right`,children:(0,k.jsx)(z,{strong:!0,children:typeof t==`number`?H(t):String(t??``)})})]},e))}):null}})})]})]})]})]}):(0,k.jsxs)(oe,{header:(0,k.jsx)(`h2`,{className:`text-xl font-semibold leading-tight`,children:x}),children:[(0,k.jsx)(ie,{title:x}),(0,k.jsx)(`div`,{style:{padding:32,display:`flex`,justifyContent:`center`},children:(0,k.jsx)(p,{bordered:!1,style:{maxWidth:480,textAlign:`center`},children:(0,k.jsxs)(y,{direction:`vertical`,size:`middle`,children:[(0,k.jsx)(he,{level:4,style:{color:e.colorError,margin:0},children:`Access Denied`}),(0,k.jsx)(z,{type:`secondary`,children:`You do not have permission to view this report.`})]})})})]})}export{W as default};