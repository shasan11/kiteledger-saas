import{i as e}from"./rolldown-runtime-aKtaBQYM.js";import{t}from"./axios-BQPRRFHk.js";import{i as n,t as r}from"./index.esm-CtIVDvdE.js";import{r as i,t as a}from"./jsx-runtime-RbF_zoRI.js";import{t as o}from"./CheckCircleFilled-CrtTIKWF.js";import{t as ee}from"./table-sosYro0l.js";import{t as te}from"./alert-BMEt18v7.js";import{t as s}from"./typography-BlWmaYWr.js";import{t as c}from"./skeleton-DlRG_YHH.js";import{t as ne}from"./tooltip-DRvKpi-S.js";import{t as l}from"./button-ZrI-T1CS.js";import{t as u}from"./card-C0Xr1RgP.js";import{t as d}from"./grid-DO-50pkA.js";import{t as f}from"./input-number-BeN5afQA.js";import{t as p}from"./space-BXAcXX1Q.js";import{t as re}from"./drawer-CW-x5V59.js";import{t as ie}from"./FileTextOutlined-B6ownMO3.js";import{t as ae}from"./input-7h35vTt9.js";import{t as oe}from"./EyeOutlined-DWmMawEw.js";import{t as m}from"./message-BtrxVWbG.js";import{t as se}from"./modal-C4AZJjsb.js";import{t as ce}from"./ReloadOutlined-CMtviqc6.js";import{t as h}from"./WarningFilled-DKLmEjKC.js";import{t as g}from"./tag-5JFZRmzJ.js";import{l as le}from"./app-CVMuBsSA.js";import{t as ue}from"./AuthenticatedLayout-DFo18ZHG.js";import{t as de}from"./ArrowLeftOutlined-CzB-XQhI.js";import{t as fe}from"./CheckCircleOutlined-B_TrR1yt.js";import{t as _}from"./FileDoneOutlined-D9Wy9T9C.js";import{t as pe}from"./LinkOutlined-jVRA2Njw.js";import{t as me}from"./SaveOutlined-Dd9ggDs_.js";import{t as he}from"./ShoppingCartOutlined-MPUgiHCJ.js";import{t as ge}from"./TeamOutlined-C7snhPGm.js";import _e,{fieldLabel as ve}from"./ReviewIssuePanel-DPJDGmR0.js";import{h as v}from"./documentUtils-e1ijlycC.js";import ye,{getDocumentStatusIconColor as be}from"./DocumentStatusTag-DN_Lc7uE.js";import xe from"./DocumentPreview-DMVlnlzG.js";import Se from"./DocumentProcessingTimeline-C1_wTcQy.js";import Ce from"./EntityLinkSelect-CtBs8cUd.js";import we from"./LineTotalsSummary-BwDXzts2.js";import Te from"./ReviewField-CX8m5AdQ.js";var y=e(i(),1),b=a(),{Title:Ee,Text:x}=s,{useBreakpoint:De}=d,Oe=[`document_type`,`document_number`,`document_date`,`due_date`,`currency_code`],ke=[`unknown`,`sales_invoice`,`purchase_bill`,`expense_receipt`,`customer_payment_slip`,`supplier_payment_slip`,`credit_note`,`debit_note`,`journal_voucher`,`purchase_order`,`sales_order`,`quotation`,`warehouse_transfer`,`inventory_adjustment`,`bank_statement`,`other`],Ae=[`party.name`,`party.email`,`party.phone`,`party.tax_number`],S=e=>{if(e==null||e===``)return null;let t=Number(e);return Number.isFinite(t)?t:null},je=(e={})=>{let t=S(e.quantity),n=S(e.rate);if(t===null||n===null)return S(e.amount);let r=S(e.discount)||0,i=S(e.tax_amount??e.tax)||0;return Math.round((t*n-r+i)*100)/100},Me=(e={})=>{let t=S(e.quantity),n=S(e.rate);if(t!==null&&n!==null)return Math.round((t*n-(S(e.discount)||0))*100)/100;let r=S(e.amount);return r===null?null:Math.round((r-(S(e.tax_amount??e.tax)||0))*100)/100},Ne=e=>{let t=S(e);return t===null?`—`:new Intl.NumberFormat(void 0,{minimumFractionDigits:2,maximumFractionDigits:2}).format(t)},C=(e,t)=>({...e,value:t,origin:`derived`,origin_label:`Calculated`,state:`ok`,state_label:`Looks good`,tone:`green`,needs_review:!1,warnings:[]});function w({icon:e,title:t,description:n}){return(0,b.jsxs)(`div`,{className:`document-review__section-title`,children:[(0,b.jsx)(`span`,{className:`document-review__section-icon`,"aria-hidden":`true`,children:e}),(0,b.jsxs)(`span`,{className:`document-review__section-copy`,children:[(0,b.jsx)(x,{strong:!0,className:`document-review__section-name`,children:t}),n&&(0,b.jsx)(x,{type:`secondary`,className:`document-review__section-description`,children:n})]})]})}function T({publicId:e,aiReadiness:i={},documentTypes:a=[]}){let{token:s}=le.useToken(),d=!De().lg,[T,Pe]=(0,y.useState)(!0),[Fe,Ie]=(0,y.useState)(!1),[E,Le]=(0,y.useState)(null),[D,Re]=(0,y.useState)(null),[O,k]=(0,y.useState)({}),[A,j]=(0,y.useState)({}),[M,ze]=(0,y.useState)(null),[Be,Ve]=(0,y.useState)({}),[N,He]=(0,y.useState)([]),[Ue,We]=(0,y.useState)(!1),[Ge,Ke]=(0,y.useState)(!1),[qe,P]=(0,y.useState)(!1),[F,Je]=(0,y.useState)(null),[I,L]=(0,y.useState)(null),[Ye,Xe]=(0,y.useState)(`details`),[Ze,Qe]=(0,y.useState)(!1),R=(0,y.useRef)(!0),z=(0,y.useRef)(null),B=(0,y.useRef)(null),V=(0,y.useRef)({}),H=(0,y.useRef)({}),U=(0,y.useRef)(null);(0,y.useEffect)(()=>(R.current=!0,()=>{R.current=!1,z.current?.abort(),window.clearTimeout(B.current)}),[]);let W=(0,y.useCallback)(async()=>{z.current?.abort();let n=new AbortController;z.current=n;try{let{data:r}=await t.get(`/api/document-uploads/${e}/extraction`,{signal:n.signal});if(!R.current)return;Le(r.document),Re(r.extraction),ze(r.readiness||null),Ve(r.permissions||{}),He(r.matches||[]),L(null)}catch(e){if(t.isCancel?.(e)||e.name===`CanceledError`||!R.current)return;L(e.response?.data?.message||`This document could not be loaded.`)}finally{R.current&&Pe(!1)}},[e]);(0,y.useEffect)(()=>{W()},[W]),(0,y.useEffect)(()=>{let e=D?.stage;if(!(!e||e.is_terminal))return B.current=window.setTimeout(W,3e3),()=>window.clearTimeout(B.current)},[D,W]);let G=(0,y.useMemo)(()=>{let e=D?.review;if(!e)return null;let t={...e.fields};Object.entries(O).forEach(([e,n])=>{t[e]&&(t[e]={...t[e],value:n,origin:`user`,origin_label:`You entered`,state:`user_confirmed`,state_label:`You confirmed`,tone:`green`,needs_review:!1,edited_by_user:!0,original_value:t[e].original_value??t[e].value})});let n=(e.lines||[]).map((e,t)=>({...e,...A[t]||{}})),r=Object.values(A).some(e=>[`quantity`,`rate`,`discount`,`tax_amount`].some(t=>Object.hasOwn(e,t))),i=Object.values(A).some(e=>Object.hasOwn(e,`tax_amount`)),a=Object.hasOwn(O,`totals.discount_total`)||Object.hasOwn(O,`totals.tax_total`);if(r&&t[`totals.subtotal`]){let e=Math.round(n.reduce((e,t)=>e+(Me(t)||0),0)*100)/100;t[`totals.subtotal`]=C(t[`totals.subtotal`],e)}if(i&&!Object.hasOwn(O,`totals.tax_total`)&&t[`totals.tax_total`]){let e=Math.round(n.reduce((e,t)=>e+(S(t.tax_amount??t.tax)||0),0)*100)/100;t[`totals.tax_total`]=C(t[`totals.tax_total`],e)}if((r||a)&&t[`totals.grand_total`]){let e=S(t[`totals.subtotal`]?.value)||0,n=S(t[`totals.tax_total`]?.value)||0,r=S(t[`totals.discount_total`]?.value)||0,i=S(t[`totals.shipping`]?.value)||0,a=Math.round((e+n-r+i)*100)/100;if(t[`totals.grand_total`]=C(t[`totals.grand_total`],a),t[`totals.balance_due`]){let e=S(t[`totals.paid_amount`]?.value)||0;t[`totals.balance_due`]=C(t[`totals.balance_due`],Math.round((a-e)*100)/100)}}return{...e,fields:t,lines:n}},[D,O,A]),$e=(e,t)=>k(n=>({...n,[e]:t})),K=(e,t,n)=>j(r=>({...r,[e]:{...r[e]||{},[t]:n}})),q=e=>!!Be?.[e],J=Object.keys(O).length+Object.values(A).reduce((e,t)=>e+Object.keys(t).length,0),et=e=>{let t=V.current[e.key];t?.scrollIntoView({behavior:`smooth`,block:`center`}),t?.querySelector(`input`)?.focus()},tt=e=>{let t=H.current[e],n=U.current;if(Xe(e),!t)return;if(d||!n){t.scrollIntoView({behavior:`smooth`,block:`start`});return}let r=t.getBoundingClientRect().top-n.getBoundingClientRect().top+n.scrollTop-78;n.scrollTo({top:r,behavior:`smooth`})},nt=()=>{let e=U.current;if(!e)return;let t=e.getBoundingClientRect().top+96,n=Object.entries(H.current).filter(([,e])=>e).sort(([,e],[,t])=>e.getBoundingClientRect().top-t.getBoundingClientRect().top),r=n.reduce((e,[n,r])=>r.getBoundingClientRect().top<=t?n:e,n[0]?.[0]||`details`);Xe(e=>e===r?e:r)},Y=async()=>{if(J===0)return m.info(`No changes to save.`),!0;Ie(!0);try{return await t.patch(`/api/document-uploads/${e}`,{review_edits:O,review_lines:A}),m.success(`Your corrections were saved.`),k({}),j({}),await W(),!0}catch(e){return m.error(e.response?.data?.message||`Your corrections could not be saved.`),!1}finally{R.current&&Ie(!1)}},rt=async({notify:n=!0}={})=>{if(!M?.conversion_target||!q(`document_upload.proposal.create`)||J>0&&!await Y())return null;Ke(!0);try{let{data:r}=await t.post(`/api/document-uploads/${e}/proposals`,{transaction_type:M.conversion_target});return n&&m.success(`Draft proposal is ready for review.`),await W(),r}catch(e){return m.error(e.response?.data?.message||`The proposal could not be created.`),null}finally{R.current&&Ke(!1)}},it=async()=>{if(!(J>0&&!await Y())){We(!0);try{let{data:n}=await t.post(`/api/document-uploads/${e}/match-entities`);He(n.matches||[]),m.success(`Record matching completed.`),await W()}catch(e){m.error(e.response?.data?.message||`Record matching could not be completed.`)}finally{R.current&&We(!1)}}},at=async(n=!1)=>{let r=(await rt({notify:!1}))?.proposal;if(r){P(!0);try{let{data:i}=await t.post(`/api/document-uploads/${e}/proposals/${r.id}/convert`,{override_duplicate:n});Je(i.open_url||null),m.success(i.message||`Draft transaction created.`),await W(),i.open_url&&window.open(i.open_url,`_blank`)}catch(e){let t=e.response?.data;t?.code===`DOCUMENT_DUPLICATE_DETECTED`?se.confirm({title:`Possible duplicate found`,content:t.message,okText:`Create draft anyway`,onOk:()=>at(!0)}):m.error(t?.message||`The draft transaction could not be created.`)}finally{R.current&&P(!1)}}},X=(0,y.useMemo)(()=>N.filter(e=>e.entity_type!==`product`),[N]),ot=[{title:`Description`,dataIndex:`description`,render:(e,t,n)=>(0,b.jsx)(ae,{value:e??``,onChange:e=>K(n,`description`,e.target.value)})},{title:`Quantity`,dataIndex:`quantity`,width:110,render:(e,t,n)=>(0,b.jsx)(f,{min:0,value:e,onChange:e=>K(n,`quantity`,e),style:{width:`100%`}})},{title:`Rate`,dataIndex:`rate`,width:130,render:(e,t,n)=>(0,b.jsx)(f,{min:0,value:e,onChange:e=>K(n,`rate`,e),style:{width:`100%`}})},{title:`Tax`,dataIndex:`tax_amount`,width:120,render:(e,t,n)=>(0,b.jsx)(f,{min:0,precision:2,value:e,onChange:e=>K(n,`tax_amount`,e),style:{width:`100%`}})},{title:`Amount`,dataIndex:`amount`,width:140,align:`right`,render:(e,t)=>(0,b.jsx)(x,{className:`document-review__readonly-amount`,children:Ne(je(t))})}],st=[{title:`Record type`,dataIndex:`entity_type`,width:130,render:e=>v(e||`record`)},{title:`Extracted value`,dataIndex:`extracted_name`},{title:`Match status`,dataIndex:`match_status`,width:130,render:e=>(0,b.jsx)(g,{color:[`matched`,`created`,`user_selected`].includes(e)?`success`:e===`suggested`?`warning`:`default`,children:v(e||`unmatched`)})},{title:`Link to`,key:`actions`,width:280,render:(t,n)=>(0,b.jsx)(Ce,{publicId:e,match:n,type:n.entity_type,canLink:q(`document_upload.entity_match`),canCreate:q(`document_upload.create_fk`)&&[`customer`,`supplier`,`product`,`currency`,`warehouse`].includes(n.entity_type),placeholder:`Search or create`,onLinked:W})}],ct=(0,y.useMemo)(()=>{let e=a.length?a:ke,t=G?.fields?.document_type?.value;return(t&&!e.includes(t)?[...e,t]:e).map(e=>({value:e,label:v(e)}))},[a,G]),Z=e=>(0,b.jsx)(`div`,{className:`document-review__field-grid`,children:e.filter(e=>G?.fields?.[e]).map(e=>(0,b.jsx)(Te,{ref:t=>{V.current[e]=t},field:G.fields[e],label:ve(e),options:e===`document_type`?ct:void 0,onChange:$e},e))}),lt=D?.stage&&!D.stage.is_terminal,ut=Object.values(G?.fields||{}),Q=ut.filter(e=>e.needs_review).length,dt={details:Oe.filter(e=>G?.fields?.[e]?.needs_review).length,contact:Ae.filter(e=>G?.fields?.[e]?.needs_review).length,items:ut.filter(e=>e.key?.startsWith(`totals.`)&&e.needs_review).length,records:0},ft=[{key:`details`,label:`Details`,icon:(0,b.jsx)(_,{})},{key:`contact`,label:`Contact`,icon:(0,b.jsx)(ge,{})},{key:`items`,label:`Items & totals`,icon:(0,b.jsx)(he,{})},...X.length>0||q(`document_upload.entity_match`)?[{key:`records`,label:`Linked records`,icon:(0,b.jsx)(pe,{})}]:[]],$=I?{type:`error`,message:I}:D?.error?{type:`error`,message:D.error.message,retry:D.error.actions?.includes(`retry`)}:D?.attempt?.partial?{type:`warning`,message:`Only part of this document could be read. Check the details carefully.`}:null,pt=(0,b.jsxs)(`div`,{className:`document-review__details-flow`,children:[(0,b.jsx)(`div`,{className:`document-review__section-nav-wrap`,children:(0,b.jsx)(`nav`,{className:`document-review__section-nav`,"aria-label":`Review sections`,children:ft.map(e=>{let t=dt[e.key]||0,n=Ye===e.key,r=e.key!==`records`||X.length>0;return(0,b.jsxs)(`button`,{type:`button`,className:`document-review__section-nav-item${n?` is-active`:``}`,"aria-current":n?`location`:void 0,onClick:()=>tt(e.key),children:[(0,b.jsx)(`span`,{className:`document-review__section-nav-icon`,"aria-hidden":`true`,children:e.icon}),(0,b.jsx)(`span`,{children:e.label}),t>0?(0,b.jsx)(`span`,{className:`document-review__section-nav-count`,children:t}):r?(0,b.jsx)(o,{className:`document-review__section-nav-check`,"aria-label":`Complete`}):(0,b.jsx)(`span`,{className:`document-review__section-nav-pending`,"aria-label":`Not linked`})]},e.key)})})}),G&&Q>0&&(0,b.jsx)(_e,{review:G,onSelectIssue:et}),G&&Q===0&&M?.ready&&(0,b.jsxs)(`div`,{className:`document-review__readiness is-ready`,children:[(0,b.jsx)(`span`,{className:`document-review__readiness-icon`,children:(0,b.jsx)(fe,{})}),(0,b.jsxs)(`div`,{children:[(0,b.jsx)(x,{strong:!0,children:`Ready to create`}),(0,b.jsx)(x,{type:`secondary`,children:`Everything required is complete. Give the values one final check, then create the draft.`})]})]}),G&&Q===0&&M&&!M.ready&&(0,b.jsxs)(`div`,{className:`document-review__readiness is-blocked`,children:[(0,b.jsx)(`span`,{className:`document-review__readiness-icon`,children:(0,b.jsx)(h,{})}),(0,b.jsxs)(`div`,{className:`document-review__readiness-copy`,children:[(0,b.jsx)(x,{strong:!0,children:`One more step before creating the draft`}),(M.blockers||[]).map(e=>{let t=e.toLowerCase().includes(`line item`)?`items`:null;return t?(0,b.jsx)(`button`,{type:`button`,className:`document-review__blocker is-actionable`,onClick:()=>tt(t),children:e},e):(0,b.jsx)(x,{className:`document-review__blocker`,children:e},e)})]})]}),G&&(0,b.jsx)(`section`,{ref:e=>{H.current.details=e},id:`review-details`,className:`document-review__section`,children:(0,b.jsx)(u,{size:`small`,title:(0,b.jsx)(w,{icon:(0,b.jsx)(_,{}),title:`Document details`,description:`Identity, dates, and currency`}),children:Z(Oe)})}),G&&(0,b.jsx)(`section`,{ref:e=>{H.current.contact=e},id:`review-contact`,className:`document-review__section`,children:(0,b.jsx)(u,{size:`small`,title:(0,b.jsx)(w,{icon:(0,b.jsx)(ge,{}),title:`Contact and tax`,description:`Customer or supplier information`}),children:Z(Ae)})}),G&&(0,b.jsx)(`section`,{ref:e=>{H.current.items=e},id:`review-items`,className:`document-review__section`,children:(0,b.jsxs)(u,{size:`small`,title:(0,b.jsx)(w,{icon:(0,b.jsx)(he,{}),title:`Items and totals`,description:`${G.lines?.length||0} ${G.lines?.length===1?`line item`:`line items`}`}),children:[d?(0,b.jsxs)(p,{direction:`vertical`,size:8,style:{width:`100%`},children:[(G.lines||[]).map((e,t)=>(0,b.jsx)(u,{size:`small`,title:`Item ${t+1}`,styles:{body:{padding:10}},children:(0,b.jsxs)(p,{direction:`vertical`,size:8,style:{width:`100%`},children:[(0,b.jsxs)(`div`,{children:[(0,b.jsx)(x,{type:`secondary`,className:`document-review__field-label`,children:`Description`}),(0,b.jsx)(ae,{value:e.description??``,onChange:e=>K(t,`description`,e.target.value)})]}),(0,b.jsxs)(`div`,{className:`document-review__line-values`,children:[[[`quantity`,`Quantity`],[`rate`,`Rate`],[`tax_amount`,`Tax`]].map(([n,r])=>(0,b.jsxs)(`div`,{children:[(0,b.jsx)(x,{type:`secondary`,className:`document-review__field-label`,children:r}),(0,b.jsx)(f,{min:0,precision:n===`tax_amount`?2:void 0,value:e[n],onChange:e=>K(t,n,e),style:{width:`100%`}})]},n)),(0,b.jsxs)(`div`,{children:[(0,b.jsx)(x,{type:`secondary`,className:`document-review__field-label`,children:`Amount`}),(0,b.jsx)(`div`,{className:`document-review__readonly-amount is-mobile`,children:Ne(je(e))})]})]})]})},e.index??t)),(G.lines||[]).length===0&&(0,b.jsx)(x,{type:`secondary`,children:`No line items were found.`})]}):(0,b.jsx)(ee,{size:`small`,rowKey:(e,t)=>e.index??t,dataSource:G.lines||[],columns:ot,pagination:!1,scroll:{x:760},locale:{emptyText:`No line items were found.`}}),(0,b.jsx)(we,{fields:G.fields,currency:G.fields?.currency_code?.value||null,onChange:$e,fieldRefs:V,editableKeys:[`totals.discount_total`,`totals.tax_total`]})]})}),G&&(X.length>0||q(`document_upload.entity_match`))&&(0,b.jsx)(`section`,{ref:e=>{H.current.records=e},id:`review-records`,className:`document-review__section`,children:(0,b.jsx)(u,{size:`small`,title:(0,b.jsx)(w,{icon:(0,b.jsx)(pe,{}),title:`Linked records`,description:`Connect extracted values to existing records`}),extra:(0,b.jsx)(l,{size:`small`,loading:Ue,disabled:!q(`document_upload.entity_match`),onClick:it,children:N.length?`Refresh matches`:`Find matches`}),children:d?(0,b.jsxs)(p,{direction:`vertical`,size:8,style:{width:`100%`},children:[X.map(t=>(0,b.jsx)(u,{size:`small`,styles:{body:{padding:10}},children:(0,b.jsxs)(p,{direction:`vertical`,size:8,style:{width:`100%`},children:[(0,b.jsxs)(p,{wrap:!0,size:6,children:[(0,b.jsx)(x,{strong:!0,children:v(t.entity_type||`record`)}),(0,b.jsx)(g,{color:[`matched`,`created`,`user_selected`].includes(t.match_status)?`success`:t.match_status===`suggested`?`warning`:`default`,children:v(t.match_status||`unmatched`)})]}),t.extracted_name&&(0,b.jsx)(x,{type:`secondary`,children:t.extracted_name}),(0,b.jsx)(Ce,{publicId:e,match:t,type:t.entity_type,canLink:q(`document_upload.entity_match`),canCreate:q(`document_upload.create_fk`)&&[`customer`,`supplier`,`product`,`currency`,`warehouse`].includes(t.entity_type),placeholder:`Search or create`,onLinked:W})]})},t.id)),X.length===0&&(0,b.jsx)(x,{type:`secondary`,children:`No related records have been linked yet.`})]}):(0,b.jsx)(ee,{size:`small`,rowKey:`id`,dataSource:X,columns:st,pagination:!1,scroll:{x:680},locale:{emptyText:`No related records have been linked yet.`}})})})]});async function mt(){try{await t.post(`/api/document-uploads/${e}/scan-ai`),m.success(`Scanning again.`),k({}),j({}),W()}catch(e){m.error(e.response?.data?.message||`The scan could not be started.`)}}function ht(){if(J===0)return mt();se.confirm({title:`Discard unsaved corrections and scan again?`,content:`Scanning again replaces the current extraction. Save your corrections first, or explicitly discard them to continue.`,okText:`Discard and rescan`,okButtonProps:{danger:!0},cancelText:`Keep corrections`,onOk:mt})}return(0,b.jsxs)(ue,{children:[(0,b.jsx)(r,{title:`Review document`}),(0,b.jsxs)(`div`,{className:`document-review`,style:{"--review-bg":s.colorBgLayout,"--review-surface":s.colorBgContainer,"--review-border":s.colorBorderSecondary,"--review-border-strong":s.colorBorder,"--review-text":s.colorText,"--review-muted":s.colorTextSecondary,"--review-primary":s.colorPrimary,"--review-primary-bg":s.colorPrimaryBg,"--review-success":s.colorSuccess,"--review-success-bg":s.colorSuccessBg,"--review-success-border":s.colorSuccessBorder,"--review-warning":s.colorWarning,"--review-warning-bg":s.colorWarningBg,"--review-warning-border":s.colorWarningBorder,"--review-error":s.colorError},children:[(0,b.jsx)(`style`,{children:`
                    .document-review {
                        min-height: 100vh;
                        background: ${s.colorBgLayout};
                        padding: 0;
                    }

                    .document-review * {
                        box-sizing: border-box;
                    }

                    .document-review__shell {
                        width: 100%;
                        margin: 0;
                        overflow: hidden;
                        border: 0;
                        border-radius: 0;
                        background: ${s.colorBgContainer};
                        box-shadow: none;
                    }

                    .document-review__header {
                        position: sticky;
                        top: 0;
                        z-index: 20;
                        display: flex;
                        align-items: center;
                        gap: 12px;
                        min-height: 64px;
                        padding: 10px 12px;
                        background: ${s.colorBgContainer};
                        border-bottom: 1px solid ${s.colorBorderSecondary};
                        box-shadow: none;
                    }

                    .document-review__top-notice {
                        border: 0;
                        border-bottom: 1px solid ${s.colorBorderSecondary};
                        border-radius: 0;
                    }

                    .document-review__back {
                        flex: none;
                    }

                    .document-review__icon {
                        width: 34px;
                        height: 34px;
                        flex: none;
                        display: grid;
                        place-items: center;
                        border: 0;
                        border-radius: 0;
                        background: ${s.colorPrimaryBg};
                        box-shadow: none;
                    }

                    .document-review__heading {
                        min-width: 0;
                        flex: 1;
                    }

                    .document-review__heading-row {
                        display: flex;
                        align-items: center;
                        gap: 8px;
                        min-width: 0;
                    }

                    .document-review__title {
                        margin: 0 !important;
                        min-width: 0;
                        max-width: 720px;
                    }

                    .document-review__subtitle {
                        display: block;
                        margin-top: 2px;
                        font-size: 12px;
                        line-height: 1.45;
                    }

                    .document-review__meta {
                        margin-top: 6px;
                    }

                    .document-review__content {
                        min-width: 0;
                    }

                    .document-review__notice {
                        margin: 12px 12px 0;
                    }

                    .document-review__workspace {
                        display: grid;
                        grid-template-columns: minmax(360px, 44%) minmax(0, 56%);
                        align-items: start;
                        min-height: calc(100vh - 120px);
                    }

                    .document-review__preview-pane {
                        position: sticky;
                        top: 64px;
                        min-width: 0;
                        height: calc(100vh - 120px);
                        border-right: 1px solid ${s.colorBorderSecondary};
                        background: ${s.colorFillQuaternary};
                    }

                    .document-review__preview-pane .document-preview {
                        border: 0 !important;
                        background: transparent !important;
                    }

                    .document-review__preview-pane .document-preview__toolbar {
                        min-height: 40px;
                        padding-inline: 8px !important;
                        background: ${s.colorBgContainer};
                        border-bottom-color: ${s.colorBorderSecondary} !important;
                    }

                    .document-review__preview-pane .document-preview__toolbar .ant-typography,
                    .document-review__preview-pane .document-preview__toolbar .ant-btn {
                        color: ${s.colorTextSecondary};
                    }

                    .document-review__preview-pane .document-preview__toolbar .ant-btn:disabled {
                        color: ${s.colorTextQuaternary};
                    }

                    .document-review__preview-pane .document-preview__canvas {
                        background: ${s.colorFillQuaternary} !important;
                    }

                    .document-review__details-pane {
                        min-width: 0;
                        padding: 18px;
                        background: ${s.colorBgLayout};
                    }

                    .document-review__details-pane > .ant-space > .ant-space-item > .ant-card {
                        border-color: ${s.colorBorderSecondary};
                        border-radius: 0 !important;
                        background: ${s.colorBgContainer};
                        box-shadow: none;
                    }

                    .document-review__details-pane > .ant-space > .ant-space-item > .ant-card:hover {
                        border-color: ${s.colorBorderSecondary};
                        box-shadow: none;
                    }

                    .document-review .ant-card-head {
                        min-height: 42px;
                        padding-inline: 14px;
                        border-bottom-color: ${s.colorBorderSecondary};
                    }

                    .document-review .ant-card-head-title {
                        padding-block: 12px;
                        font-weight: 600;
                    }

                    .document-review .ant-card-body {
                        padding: 16px;
                    }

                    .document-review__section-title {
                        display: flex;
                        align-items: center;
                        gap: 10px;
                        min-width: 0;
                    }

                    .document-review__section-icon {
                        width: 32px;
                        height: 32px;
                        flex: none;
                        display: grid;
                        place-items: center;
                        border-radius: 0;
                        color: ${s.colorPrimary};
                        background: ${s.colorPrimaryBg};
                    }

                    .document-review__section-name {
                        display: block;
                        line-height: 1.35;
                    }

                    .document-review__section-name { font-size: 13px; }

                    .document-review .ant-form-item {
                        margin-bottom: 10px;
                    }

                    .document-review .ant-input,
                    .document-review .ant-input-number,
                    .document-review .ant-select-selector {
                        border-radius: 8px !important;
                    }

                    .document-review-field:hover {
                        border-color: ${s.colorBorder} !important;
                        box-shadow: none;
                    }

                    .document-review-field:focus-within {
                        border-color: ${s.colorPrimary} !important;
                        background: ${s.colorBgContainer} !important;
                        box-shadow: 0 0 0 3px ${s.colorPrimaryBg};
                    }

                    .document-review-field.is-attention:focus-within {
                        border-color: ${s.colorWarning} !important;
                        box-shadow: 0 0 0 3px ${s.colorWarningBg};
                    }

                    .document-review .ant-table-wrapper {
                        overflow: hidden;
                        border: 1px solid ${s.colorBorderSecondary};
                        border-radius: 8px;
                    }

                    .document-review .ant-table-cell {
                        padding: 8px 10px !important;
                    }

                    .document-review .ant-table-thead > tr > th {
                        font-size: 11px;
                        font-weight: 600;
                        color: ${s.colorTextSecondary};
                        background: ${s.colorFillQuaternary};
                    }

                    .document-review__field-label {
                        display: block;
                        margin-bottom: 4px;
                        font-size: 11px;
                        font-weight: 500;
                    }

                    .document-review__line-values {
                        display: grid;
                        grid-template-columns: repeat(4, minmax(0, 1fr));
                        gap: 8px;
                    }

                    .document-line-totals {
                        padding-top: 4px;
                        border-top: 1px solid ${s.colorBorderSecondary};
                    }

                    .document-line-total-input input {
                        text-align: right !important;
                        font-variant-numeric: tabular-nums;
                    }

                    .document-review__footer {
                        position: sticky;
                        bottom: 0;
                        z-index: 18;
                        display: flex;
                        align-items: center;
                        gap: 8px;
                        padding: 11px 16px;
                        background: ${s.colorBgContainer};
                        border-top: 1px solid ${s.colorBorderSecondary};
                        box-shadow: 0 -8px 24px rgba(15, 23, 42, .04);
                    }

                    .document-review__footer .ant-btn { border-radius: 6px; }
                    .document-review__footer .ant-btn-primary {
                        box-shadow: none;
                    }

                    .document-review__save-state {
                        flex: 1;
                        min-width: 140px;
                        font-size: 12px;
                    }

                    .document-review__secondary-actions {
                        display: flex;
                        align-items: center;
                        gap: 8px;
                    }

                    .document-review__primary-actions {
                        display: flex;
                        align-items: center;
                        gap: 8px;
                    }

                    .document-review__mobile {
                        padding: 0 12px 12px;
                    }

                    .document-review__mobile .ant-tabs-nav {
                        position: sticky;
                        top: 68px;
                        z-index: 12;
                        margin: 0 -12px 12px;
                        padding: 0 12px;
                        background: ${s.colorBgContainer};
                    }

                    .document-review__mobile .ant-tabs-nav-list {
                        width: auto;
                        padding: 0;
                        border-radius: 0;
                        background: transparent;
                    }

                    .document-review__mobile .ant-tabs-tab {
                        flex: none;
                        margin: 0 24px 0 0 !important;
                        padding: 10px 0;
                        border-radius: 0;
                    }

                    .document-review__mobile .ant-tabs-tab-active {
                        background: transparent;
                        box-shadow: none;
                    }

                    .document-review__mobile .ant-tabs-content-holder {
                        min-width: 0;
                    }

                    @media (max-width: 1199px) {
                        .document-review {
                            padding: 0;
                        }
                    }

                    @media (max-width: 991px) {
                        .document-review__header {
                            min-height: 64px;
                            padding: 10px 12px;
                        }

                        .document-review__subtitle {
                            display: none;
                        }

                        .document-review__notice {
                            margin: 10px 10px 0;
                        }

                        .document-review__footer {
                            padding: 10px 12px;
                        }

                    }

                    @media (max-width: 767px) {
                        .document-review {
                            padding: 0;
                            background: ${s.colorBgContainer};
                        }

                        .document-review__shell {
                            border: 0;
                            border-radius: 0;
                            box-shadow: none;
                        }

                        .document-review__header {
                            gap: 8px;
                        }

                        .document-review__icon {
                            display: none;
                        }

                        .document-review__heading-row {
                            align-items: flex-start;
                        }

                        .document-review__title {
                            font-size: 16px !important;
                        }

                        .document-review__meta {
                            margin-top: 4px;
                        }

                        .document-review__mobile {
                            padding: 0 10px 10px;
                        }

                        .document-review__mobile .ant-tabs-nav {
                            top: 63px;
                            margin-inline: -10px;
                            padding-inline: 10px;
                        }

                        .document-review .ant-card-body {
                            padding: 12px;
                        }

                        .document-review__footer {
                            display: grid;
                            grid-template-columns: 1fr 1fr;
                            gap: 8px;
                            padding: 8px 10px calc(8px + env(safe-area-inset-bottom));
                        }

                        .document-review__save-state {
                            grid-column: 1 / -1;
                            min-width: 0;
                        }

                        .document-review__secondary-actions,
                        .document-review__primary-actions {
                            display: contents;
                        }

                        .document-review__footer .ant-btn,
                        .document-review__footer .ant-tooltip,
                        .document-review__footer .ant-tooltip > span,
                        .document-review__footer .ant-tooltip > span > .ant-btn {
                            width: 100%;
                        }

                        .document-review__footer .ant-btn-primary {
                            grid-column: 1 / -1;
                        }
                    }

                    @media (max-width: 480px) {
                        .document-review__back .ant-btn > span:not(.ant-btn-icon) {
                            display: none;
                        }

                        .document-review__line-values {
                            grid-template-columns: 1fr;
                        }

                        .document-review__footer {
                            grid-template-columns: 1fr;
                        }

                        .document-review__save-state,
                        .document-review__footer .ant-btn-primary {
                            grid-column: 1;
                        }
                    }
                `}),(0,b.jsxs)(`div`,{className:`document-review__shell`,children:[$&&(0,b.jsx)(te,{className:`document-review__top-notice`,banner:!0,showIcon:!0,type:$.type,message:$.message,action:$.retry?(0,b.jsx)(l,{size:`small`,icon:(0,b.jsx)(ce,{}),onClick:ht,children:`Retry scan`}):null}),(0,b.jsxs)(`header`,{className:`document-review__header`,children:[(0,b.jsx)(`div`,{className:`document-review__back`,children:(0,b.jsx)(l,{type:`text`,icon:(0,b.jsx)(de,{}),onClick:()=>n.visit(`/documents/upload`),"aria-label":`Back to documents`,children:`Documents`})}),(0,b.jsx)(`div`,{className:`document-review__icon`,"aria-hidden":`true`,children:(0,b.jsx)(ie,{style:{fontSize:18,color:be(E?.status,s)}})}),(0,b.jsxs)(`div`,{className:`document-review__heading`,children:[(0,b.jsx)(x,{type:`secondary`,className:`document-review__eyebrow`,children:`Document review`}),(0,b.jsx)(Ee,{level:4,className:`document-review__title`,ellipsis:{tooltip:E?.label||E?.original_name},children:E?.label||E?.original_name||`Review document`}),(0,b.jsxs)(p,{size:6,wrap:!0,className:`document-review__meta`,children:[E&&(0,b.jsx)(ye,{status:E.status,issueCount:D?.attempt?.review_issue_count||0}),G?.document_type_label&&(0,b.jsx)(g,{bordered:!1,children:G.document_type_label}),E?.original_name&&E.original_name!==E.label&&(0,b.jsx)(x,{type:`secondary`,className:`document-review__filename`,ellipsis:{tooltip:E.original_name},children:E.original_name})]})]}),!T&&G&&(0,b.jsxs)(`div`,{className:`document-review__header-actions`,children:[(0,b.jsxs)(`div`,{className:`document-review__progress${M?.ready?` is-ready`:``}`,children:[(0,b.jsx)(`span`,{className:`document-review__progress-icon`,"aria-hidden":`true`,children:M?.ready?(0,b.jsx)(o,{}):(0,b.jsx)(h,{})}),(0,b.jsxs)(`span`,{children:[(0,b.jsx)(x,{strong:!0,children:M?.ready?`Ready to create`:`${Q||M?.blockers?.length||1} to resolve`}),(0,b.jsx)(x,{type:`secondary`,children:J>0?`${J} unsaved`:`Changes saved`})]})]}),(0,b.jsx)(l,{icon:(0,b.jsx)(oe,{}),onClick:()=>Qe(!0),children:`Show original`})]})]}),(0,b.jsxs)(`div`,{className:`document-review__content`,children:[lt&&(0,b.jsx)(`div`,{className:`document-review__notice`,children:(0,b.jsx)(u,{size:`small`,children:(0,b.jsx)(Se,{stage:D.stage,startedAt:D.created_at})})}),T&&(0,b.jsxs)(`div`,{"aria-label":`Loading document review`,style:{display:`grid`,gridTemplateColumns:d?`1fr`:`minmax(280px, 0.8fr) minmax(420px, 1.2fr)`,gap:d?8:10,minHeight:0,padding:d?6:10},children:[(0,b.jsxs)(`div`,{style:{padding:10,border:`1px solid ${s.colorBorderSecondary}`,background:s.colorBgContainer},children:[(0,b.jsx)(c.Input,{active:!0,block:!0,style:{height:d?160:300}}),(0,b.jsxs)(`div`,{style:{display:`flex`,justifyContent:`space-between`,gap:8,marginTop:8},children:[(0,b.jsx)(c.Input,{active:!0,size:`small`,style:{width:`48%`}}),(0,b.jsx)(c.Button,{active:!0,size:`small`,style:{width:92}})]})]}),(0,b.jsx)(`div`,{style:{display:`grid`,alignContent:`start`,gap:8},children:Array.from({length:d?1:2}).map((e,t)=>(0,b.jsx)(`div`,{style:{padding:10,border:`1px solid ${s.colorBorderSecondary}`,background:s.colorBgContainer},children:(0,b.jsx)(c,{active:!0,title:{width:t===0?`34%`:`26%`},paragraph:{rows:2,width:[`100%`,`82%`]}})},t))})]}),!T&&(0,b.jsx)(`div`,{className:`document-review__workspace is-preview-hidden${d?` document-review__mobile`:``}`,children:(0,b.jsx)(`div`,{ref:U,className:`document-review__details-pane`,onScroll:nt,children:pt})}),(0,b.jsx)(re,{title:`Original document`,placement:`right`,width:d?`100%`:760,open:Ze,onClose:()=>Qe(!1),destroyOnHidden:!1,styles:{body:{padding:0,overflow:`hidden`,background:s.colorBgLayout}},children:(0,b.jsx)(xe,{document:E,onDownload:e=>window.open(`/api/document-uploads/${e.public_id}/preview`,`_blank`)})}),!T&&G&&(0,b.jsxs)(`div`,{className:`document-review__footer`,children:[(0,b.jsxs)(`div`,{className:`document-review__save-state${J>0?` has-changes`:``}`,children:[J>0?(0,b.jsx)(h,{}):(0,b.jsx)(o,{}),(0,b.jsx)(x,{type:J>0?void 0:`secondary`,children:J>0?`${J} change${J===1?``:`s`} not saved`:`All changes saved`})]}),(0,b.jsxs)(`div`,{className:`document-review__secondary-actions`,children:[(0,b.jsx)(ne,{title:i.document_scanning_available===!1?i.issues?.[0]?.message:null,children:(0,b.jsx)(`span`,{children:(0,b.jsx)(l,{icon:(0,b.jsx)(ce,{}),disabled:i.document_scanning_available===!1,onClick:ht,children:`Scan again`})})}),(0,b.jsx)(l,{icon:(0,b.jsx)(me,{}),loading:Fe,disabled:J===0||!q(`document_upload.proposal.update`),onClick:Y,children:`Save changes`})]}),(0,b.jsxs)(`div`,{className:`document-review__primary-actions`,children:[F&&(0,b.jsx)(l,{onClick:()=>window.open(F,`_blank`),children:`Open draft`}),(0,b.jsx)(ne,{title:M?.ready?null:M?.blockers?.[0]||`Complete the required details first.`,children:(0,b.jsx)(`span`,{children:(0,b.jsx)(l,{type:`primary`,loading:Ge||qe,disabled:!M?.ready||lt||!q(`document_upload.convert`)||!q(`document_upload.proposal.create`),onClick:()=>at(!1),children:`Create draft`})})})]})]})]})]})]})]})}export{T as default};