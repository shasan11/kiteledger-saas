import{i as e}from"./rolldown-runtime-aKtaBQYM.js";import{t}from"./axios-BQPRRFHk.js";import{o as n,t as r}from"./index.esm-CtIVDvdE.js";import{r as i,t as a}from"./jsx-runtime-RbF_zoRI.js";import{t as o}from"./table-sosYro0l.js";import{t as s}from"./alert-BMEt18v7.js";import{r as c}from"./ColorPresets-hxW4JF27.js";import{n as l,t as u}from"./typography-BlWmaYWr.js";import{t as d}from"./empty-41qDbwiS.js";import{t as f}from"./tooltip-DRvKpi-S.js";import{t as p}from"./button-ZrI-T1CS.js";import{t as m}from"./PlusOutlined-oShiVD3P.js";import{t as h}from"./card-C0Xr1RgP.js";import{t as g}from"./spin-PWSpGrrn.js";import{t as ee}from"./grid-DO-50pkA.js";import{n as _,t as v}from"./row-DiFu7gfS.js";import{t as y}from"./space-BXAcXX1Q.js";import{t as b}from"./descriptions-ccrgriAr.js";import{t as te}from"./drawer-CW-x5V59.js";import{t as ne}from"./input-7h35vTt9.js";import{t as x}from"./list-CaWgcOM5.js";import{t as S}from"./message-BtrxVWbG.js";import{t as re}from"./modal-C4AZJjsb.js";import{t as ie}from"./ReloadOutlined-CMtviqc6.js";import{t as C}from"./statistic-CWEJLXuk.js";import{t as w}from"./tag-5JFZRmzJ.js";import{t as ae}from"./DeleteOutlined-CjnT_w1K.js";import{l as T}from"./app-nvfu2YN6.js";import{n as E,t as oe}from"./AuthenticatedLayout-BXQyTrnY.js";import{i as D}from"./MenuUnfoldOutlined-Ckmr74yU.js";import{t as O}from"./CheckCircleOutlined-B_TrR1yt.js";import{t as se}from"./CloseCircleOutlined-Cb6cduCh.js";import{t as k}from"./ExclamationCircleOutlined-mfLkUCcO.js";import{t as ce}from"./FileSearchOutlined-DI3zyxoz.js";import{t as le}from"./HistoryOutlined-B_-HQCbi.js";import{t as A}from"./InfoCircleOutlined-tZ6NWCAO.js";import{t as j}from"./LinkOutlined-jVRA2Njw.js";import{t as M}from"./SafetyCertificateOutlined-DyQWwOLo.js";import{t as ue}from"./SendOutlined-CqihlbL8.js";import{t as de}from"./StopOutlined-nZ2Jb1g9.js";import{t as N}from"./WarningOutlined-KVDD8iB3.js";import{i as fe,n as P,r as F}from"./money-KdByVOIW.js";var I=e(i(),1),L=a();function pe(e){if(e?.format===`money`||e?.formatted)return P(e.formatted,e.value,e.currency_display);let t=Number(e?.value);return Number.isFinite(t)?fe(t,Number.isInteger(t)?0:2):e?.value}function me({cards:e=[],currency:t=null}){return!Array.isArray(e)||e.length===0?null:(0,L.jsx)(v,{gutter:[8,8],style:{marginTop:10},children:e.map(e=>(0,L.jsx)(_,{xs:24,sm:12,md:8,children:(0,L.jsx)(h,{size:`small`,style:{borderRadius:8},styles:{body:{padding:12}},children:(0,L.jsx)(C,{title:e.label,value:pe({...e,currency_display:t}),valueStyle:{fontSize:18,lineHeight:1.2,fontVariantNumeric:`tabular-nums`}})})},e.label))})}var{Text:R}=u;function he(e,t,n){return t===`money`&&e!=null&&e!==``?F(e,n):e??``}function ge({table:e,currency:t=null}){if(!e)return null;let n=(e.columns||[]).map(e=>({title:e.label,dataIndex:e.key,key:e.key,ellipsis:!0,align:e.format===`money`?`right`:`left`,render:n=>he(n,e.format,t)}));return(0,L.jsxs)(h,{size:`small`,style:{borderRadius:8},styles:{body:{padding:10}},children:[(0,L.jsx)(R,{strong:!0,children:e.title}),Array.isArray(e.rows)&&e.rows.length?(0,L.jsx)(o,{size:`small`,rowKey:(t,n)=>`${e.title}-${n}`,columns:n,dataSource:e.rows,pagination:e.rows.length>8&&{pageSize:8,size:`small`},scroll:{x:!0},style:{marginTop:8}}):(0,L.jsx)(d,{image:d.PRESENTED_IMAGE_SIMPLE,description:`No rows to show`})]})}var{Text:_e}=u;function ve({note:e}){return e?(0,L.jsx)(w,{icon:(0,L.jsx)(D,{}),color:`blue`,bordered:!1,style:{whiteSpace:`normal`,padding:`4px 8px`},children:(0,L.jsx)(_e,{style:{fontSize:12},children:e})}):null}function ye({warnings:e=[]}){return!Array.isArray(e)||e.length===0?null:(0,L.jsx)(y,{direction:`vertical`,size:6,style:{width:`100%`,marginTop:10},children:e.map(e=>(0,L.jsx)(s,{type:`warning`,showIcon:!0,message:e},e))})}var{Text:z}=u;function be({followups:e=[],onSelect:t}){return!Array.isArray(e)||e.length===0?null:(0,L.jsxs)(y,{direction:`vertical`,size:6,style:{width:`100%`,marginTop:10},children:[(0,L.jsx)(z,{type:`secondary`,style:{fontSize:12},children:`Follow-up questions`}),(0,L.jsx)(y,{wrap:!0,size:[6,6],children:e.map(e=>(0,L.jsx)(p,{size:`small`,onClick:()=>t?.(e),children:e},e))})]})}var{Title:B,Paragraph:xe,Text:V}=u;function H({message:e={},onFollowup:t}){let n=e.answer,r=n?.body?.trim()&&n.body.trim()!==n?.headline?.trim(),i=n?.confidence===`high`?`success`:n?.confidence===`medium`?`blue`:`warning`;return(0,L.jsxs)(y,{direction:`vertical`,size:12,style:{width:`100%`},children:[n?(0,L.jsxs)(L.Fragment,{children:[(0,L.jsx)(B,{level:4,style:{margin:0,lineHeight:1.35},children:n.headline}),r&&(0,L.jsx)(xe,{style:{margin:0,whiteSpace:`pre-wrap`,fontSize:15,lineHeight:1.75},children:n.body}),(n.bullets||[]).length>0&&(0,L.jsxs)(`div`,{style:{padding:`10px 14px`,borderRadius:10,background:`rgba(127,127,127,.06)`},children:[(0,L.jsx)(V,{strong:!0,children:`Key points`}),(0,L.jsx)(`ul`,{style:{margin:`8px 0 0`,paddingInlineStart:20},children:n.bullets.map((e,t)=>(0,L.jsx)(`li`,{style:{marginBottom:5},children:e},`${t}-${e}`))})]}),(n.limitations||[]).length>0&&(0,L.jsx)(s,{type:`info`,showIcon:!0,icon:(0,L.jsx)(A,{}),message:`What I could not confirm`,description:n.limitations.join(` `)}),(0,L.jsx)(w,{color:i,icon:(0,L.jsx)(O,{}),bordered:!1,style:{width:`fit-content`},children:n.confidence_label||`Needs more context`})]}):e.content?(0,L.jsx)(V,{style:{whiteSpace:`pre-wrap`,lineHeight:1.7},children:e.content}):null,(0,L.jsx)(me,{cards:e.cards,currency:e.currency}),(0,L.jsx)(ye,{warnings:e.warnings}),(e.tables||[]).map(t=>(0,L.jsx)(ge,{table:t,currency:e.currency},t.title)),(0,L.jsx)(ve,{note:e.source_note}),(0,L.jsx)(be,{followups:e.followups||n?.followups,onSelect:t})]})}var{Text:U}=u,W={low:`green`,medium:`gold`,high:`orange`,critical:`red`};function G(e){return String(e).replace(/_/g,` `).replace(/\b\w/g,e=>e.toUpperCase())}function K({preview:e}){if(!e||typeof e!=`object`)return null;let{items:t,...n}=e,r=Object.entries(n).filter(([,e])=>e!=null&&typeof e!=`object`);return(0,L.jsxs)(L.Fragment,{children:[r.length>0&&(0,L.jsx)(b,{size:`small`,column:1,bordered:!0,style:{marginBottom:t?10:0},children:r.map(([e,t])=>(0,L.jsx)(b.Item,{label:G(e),children:String(t)},e))}),Array.isArray(t)&&t.length>0&&(0,L.jsx)(o,{size:`small`,pagination:!1,rowKey:(e,t)=>t,dataSource:t,columns:Object.keys(t[0]).map(e=>({title:G(e),dataIndex:e,key:e}))})]})}function q({before:e,after:t}){if(!e&&!t)return null;let n=Array.from(new Set([...Object.keys(e||{}),...Object.keys(t||{})]));return n.length===0?null:(0,L.jsx)(o,{size:`small`,pagination:!1,rowKey:`field`,dataSource:n.map(n=>({field:G(n),before:e?.[n]??`-`,after:t?.[n]??`-`})),columns:[{title:`Field`,dataIndex:`field`,key:`field`},{title:`Before`,dataIndex:`before`,key:`before`},{title:`After`,dataIndex:`after`,key:`after`,render:e=>(0,L.jsx)(U,{strong:!0,children:String(e)})}]})}function J({action:e,state:t={},onApprove:n,onReject:r}){let[i,a]=(0,I.useState)(``);if(!e)return null;let o=t.status||e.status||`pending`,c=!!t.loading,l=t.result||null,u=t.error||null,d=e.risk_level||`medium`,f=e.requires_confirmation||[`high`,`critical`].includes(d),m=e.confirmation_text||null,g=e.missing_fields||[],ee=[`executed`,`rejected`,`failed`].includes(o),_=!f||!m||i.trim()===m;return(0,L.jsxs)(h,{size:`small`,style:{marginTop:12,borderColor:d===`critical`?`#ff4d4f`:void 0},title:(0,L.jsxs)(y,{size:8,wrap:!0,children:[(0,L.jsx)(M,{}),(0,L.jsx)(U,{strong:!0,children:e.title||G(e.action_type||`Action`)}),(0,L.jsxs)(w,{color:W[d]||`default`,bordered:!1,children:[d,` risk`]}),ee&&(0,L.jsx)(w,{color:o===`executed`?`success`:o===`rejected`?`default`:`error`,bordered:!1,children:o})]}),children:[e.summary&&(0,L.jsx)(U,{type:`secondary`,style:{display:`block`,marginBottom:10},children:e.summary}),(0,L.jsx)(K,{preview:e.preview}),(0,L.jsx)(q,{before:e.before,after:e.after}),Array.isArray(e.risk_reasons)&&e.risk_reasons.length>0&&(0,L.jsx)(s,{type:`warning`,showIcon:!0,icon:(0,L.jsx)(N,{}),style:{marginTop:10},message:`Review before approval`,description:(0,L.jsx)(`ul`,{style:{margin:0,paddingInlineStart:18},children:e.risk_reasons.map((e,t)=>(0,L.jsx)(`li`,{children:e},t))})}),g.length>0&&(0,L.jsx)(s,{type:`info`,showIcon:!0,style:{marginTop:10},message:`More detail needed`,description:`This draft is missing required fields. Add them in chat before approving.`}),u&&(0,L.jsx)(s,{type:`error`,showIcon:!0,style:{marginTop:10},message:u}),l&&o===`executed`&&(0,L.jsx)(s,{type:`success`,showIcon:!0,style:{marginTop:10},message:l.message||`Action completed.`,description:l.open_url?(0,L.jsx)(`a`,{href:l.open_url,children:`Open the created record →`}):null}),!ee&&(0,L.jsxs)(L.Fragment,{children:[(0,L.jsx)(s,{type:`info`,showIcon:!0,style:{marginTop:10,marginBottom:10},message:`AI prepared this action. Review carefully before approval - it will only run after you approve.`}),f&&m&&(0,L.jsx)(ne,{placeholder:`Type "${m}" to confirm`,value:i,onChange:e=>a(e.target.value),style:{marginBottom:10},disabled:c}),(0,L.jsxs)(y,{children:[(0,L.jsx)(p,{type:`primary`,icon:(0,L.jsx)(O,{}),loading:c,disabled:g.length>0||!_,onClick:()=>n?.(e,i.trim()),children:`Approve`}),(0,L.jsx)(p,{danger:!0,icon:(0,L.jsx)(se,{}),disabled:c,onClick:()=>r?.(e),children:`Reject`})]})]})]})}var{Text:Y,Paragraph:Se}=u;function X({sources:e}){return(0,L.jsx)(y,{direction:`vertical`,size:8,style:{width:`100%`},children:e.map((e,t)=>(0,L.jsxs)(h,{size:`small`,styles:{body:{padding:12}},children:[(0,L.jsxs)(y,{size:6,wrap:!0,style:{marginBottom:5},children:[(0,L.jsx)(Y,{strong:!0,children:e.label||`KiteLedger source`}),e.module&&(0,L.jsx)(w,{color:`blue`,bordered:!1,children:e.module}),e.type&&(0,L.jsx)(w,{bordered:!1,children:e.type}),e.status&&(0,L.jsx)(w,{bordered:!1,children:e.status}),e.match_label&&(0,L.jsx)(w,{color:`geekblue`,bordered:!1,children:e.match_label})]}),e.date&&(0,L.jsx)(Y,{type:`secondary`,style:{fontSize:12},children:e.date}),e.snippet&&(0,L.jsx)(Se,{type:`secondary`,ellipsis:{rows:3},style:{margin:`5px 0 8px`,fontSize:13},children:e.snippet}),e.route&&(0,L.jsx)(p,{type:`link`,size:`small`,href:e.route,icon:(0,L.jsx)(j,{}),style:{padding:0},children:`Open`})]},e.key||`${e.label}-${t}`))})}function Ce({sources:e=[]}){if(!Array.isArray(e)||e.length===0)return null;let t=(0,L.jsxs)(y,{size:6,children:[(0,L.jsx)(ce,{}),(0,L.jsxs)(Y,{children:[`Used sources (`,e.length,`)`]})]});return e.length>2?(0,L.jsx)(c,{ghost:!0,size:`small`,items:[{key:`sources`,label:t,children:(0,L.jsx)(X,{sources:e})}]}):(0,L.jsxs)(`div`,{style:{marginTop:6},children:[t,(0,L.jsx)(`div`,{style:{marginTop:8},children:(0,L.jsx)(X,{sources:e})})]})}function we(){let{token:e}=T.useToken();return(0,L.jsx)(`style`,{children:`
            @keyframes kl-rise {
                from { opacity: 0; transform: translateY(8px); }
                to   { opacity: 1; transform: none; }
            }

            @keyframes kl-pulse {
                0%, 100% { opacity: 0.35; transform: scale(0.85); }
                50%      { opacity: 1;    transform: scale(1); }
            }

            /* Entrance: 220ms ease-out sits in the 150-300ms band where motion
               reads as responsive rather than sluggish. */
            .kl-rise {
                animation: kl-rise 220ms cubic-bezier(0.16, 1, 0.3, 1) both;
            }

            .kl-dot {
                width: 6px;
                height: 6px;
                border-radius: 999px;
                background: ${e.colorPrimary};
                display: inline-block;
                animation: kl-pulse 1.2s ease-in-out infinite;
            }

            /* Staggered so the three dots read as one object, not three timers. */
            .kl-dot:nth-child(2) { animation-delay: 0.16s; }
            .kl-dot:nth-child(3) { animation-delay: 0.32s; }

            /* Figures use tabular numerals so digits line up in columns and
               values do not jitter as they change. */
            .kl-tabular {
                font-variant-numeric: tabular-nums;
                font-feature-settings: 'tnum';
            }

            .kl-prompt-card {
                transition: background-color 140ms ease-out, color 140ms ease-out;
                cursor: pointer;
            }

            .kl-prompt-card:hover {
                background: ${e.colorFillQuaternary} !important;
            }

            .kl-prompt-card:focus-visible {
                outline: 2px solid ${e.colorPrimary};
                outline-offset: 2px;
            }

            @media (prefers-reduced-motion: reduce) {
                .kl-rise,
                .kl-dot,
                .kl-prompt-card {
                    animation: none !important;
                    transition: none !important;
                    transform: none !important;
                }
            }
        `})}var{Title:Te,Text:Z}=u,Ee=[{key:`general`,label:`Start a conversation`,prompts:[`Hello - what can you help me with?`]},{key:`financial`,requires:`financial`,label:`Financial position`,prompts:[`Give me a financial overview for this fiscal year.`,`How are sales performing this month?`]},{key:`receivables`,requires:`financial`,label:`Money owed`,prompts:[`Which customers owe us the most?`,`Which supplier bills are due soon?`]},{key:`records`,requires:`tools`,label:`Find a record`,prompts:[`Find invoice INV-0001.`,`Show payments received from a customer.`]},{key:`help`,requires:`rag`,label:`How to use KiteLedger`,prompts:[`How do I create and send an invoice?`,`Which report shows the trial balance?`]}];function De({onSelect:e,disabled:t=!1,isMobile:n=!1,capabilities:r={}}){let{token:i}=T.useToken(),a=Ee.filter(e=>e.requires?e.requires===`financial`?r.financialTools:e.requires===`tools`?r.toolCalling:e.requires===`rag`&&r.rag:!0).flatMap(e=>e.prompts.map(t=>({prompt:t,label:e.label}))).slice(0,6);return(0,L.jsxs)(`div`,{className:`kl-rise`,style:{width:`100%`,maxWidth:720,padding:n?`20px 4px`:`36px 8px`},children:[(0,L.jsxs)(`div`,{style:{display:`flex`,alignItems:`center`,gap:14},children:[(0,L.jsx)(E,{size:n?42:48}),(0,L.jsxs)(`div`,{style:{minWidth:0},children:[(0,L.jsx)(Te,{level:2,style:{margin:0,fontSize:n?23:28,lineHeight:1.2,letterSpacing:`-0.03em`},children:`How can I help?`}),(0,L.jsx)(Z,{type:`secondary`,style:{display:`block`,marginTop:4,fontSize:14,lineHeight:1.5},children:`Ask about your business, find a record, or learn how KiteLedger works.`})]})]}),(0,L.jsx)(Z,{strong:!0,style:{display:`block`,margin:`30px 0 10px`,fontSize:13},children:`Try asking`}),(0,L.jsx)(`div`,{style:{display:`grid`,gridTemplateColumns:n?`minmax(0, 1fr)`:`repeat(2, minmax(0, 1fr))`,gap:8},children:a.map(({prompt:n,label:r})=>(0,L.jsxs)(`button`,{type:`button`,className:`kl-prompt-card`,disabled:t,onClick:()=>e?.(n),style:{width:`100%`,minHeight:64,padding:`10px 12px`,border:`1px solid ${i.colorBorderSecondary}`,borderRadius:8,background:i.colorBgContainer,color:t?i.colorTextDisabled:i.colorText,textAlign:`left`,font:`inherit`,cursor:t?`not-allowed`:`pointer`},children:[(0,L.jsx)(Z,{type:`secondary`,style:{display:`block`,fontSize:11,lineHeight:1.25},children:r}),(0,L.jsx)(`span`,{style:{display:`block`,marginTop:3,fontSize:14,lineHeight:1.4},children:n})]},n))})]})}var{Text:Oe}=u;function ke({isMobile:e=!1,label:t=`Working on your request`}){let{token:n}=T.useToken();return(0,L.jsx)(`div`,{className:`kl-rise`,style:{display:`flex`,justifyContent:`flex-start`,padding:e?`6px 0`:`8px 0`},role:`status`,"aria-live":`polite`,children:(0,L.jsx)(`div`,{style:{padding:`10px 14px`,borderRadius:`${n.borderRadiusXL}px ${n.borderRadiusXL}px ${n.borderRadiusXL}px 4px`,border:`1px solid ${n.colorBorderSecondary}`,background:n.colorBgContainer,boxShadow:n.boxShadowTertiary},children:(0,L.jsxs)(y,{size:10,children:[(0,L.jsxs)(`span`,{"aria-hidden":`true`,children:[(0,L.jsx)(`span`,{className:`kl-dot`}),(0,L.jsx)(`span`,{className:`kl-dot`,style:{marginLeft:4}}),(0,L.jsx)(`span`,{className:`kl-dot`,style:{marginLeft:4}})]}),(0,L.jsx)(Oe,{type:`secondary`,style:{fontSize:13},children:t})]})})})}var{Title:Q,Text:$}=u,Ae=/\b[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}\b/gi,je=6e4;function Me(e){return String(e?.title||``).replace(Ae,``).trim()||`Untitled conversation`}function Ne(e){if(typeof window>`u`)return null;try{let t=JSON.parse(window.sessionStorage.getItem(e)||`null`);return!t?.value||Date.now()-Number(t.savedAt||0)>je?(window.sessionStorage.removeItem(e),null):t.value}catch{return null}}function Pe(e,t){if(!(typeof window>`u`))try{window.sessionStorage.setItem(e,JSON.stringify({savedAt:Date.now(),value:t}))}catch{}}function Fe(e=[],t=[]){return Array.isArray(e)?t.some(t=>e.includes(t)):!1}async function Ie(e,t,n,r){let i=document.querySelector(`meta[name="csrf-token"]`)?.getAttribute(`content`),a=await fetch(`/api/ai/chat/stream`,{method:`POST`,credentials:`same-origin`,signal:t,headers:{Accept:`text/event-stream`,"Content-Type":`application/json`,"X-Requested-With":`XMLHttpRequest`,...i?{"X-CSRF-TOKEN":i}:{}},body:JSON.stringify(e)}),o=a.headers.get(`content-type`)||``;if(!a.ok||!o.includes(`text/event-stream`)||!a.body){let e={};try{e=await a.json()}catch{}let t=Error(e.message||`Streaming is unavailable.`);throw t.code=e.code||`AI_STREAM_UNAVAILABLE`,t.allowFallback=!0,t.status=a.status,t}let s=a.body.getReader(),c=new TextDecoder,l=``,u=null,d=null,f=!1,p=e=>{let t=`message`,i=[];if(e.split(/\r?\n/).forEach(e=>{e.startsWith(`event:`)&&(t=e.slice(6).trim()),e.startsWith(`data:`)&&i.push(e.slice(5).trimStart())}),!i.length)return;let a;try{a=JSON.parse(i.join(`
`))}catch{return}t===`stage`&&n(a.label||`Working on your request`),t===`delta`&&a.text&&(f=!0,r?.(a.text)),t===`answer`&&(f=!0,u=a),t===`error`&&(d=a)};for(;;){let{value:e,done:t}=await s.read();l+=c.decode(e||new Uint8Array,{stream:!t});let n=l.split(/\r?\n\r?\n/);if(l=n.pop()||``,n.forEach(p),t)break}if(l.trim()&&p(l),d){let e=Error(d.message||`Copilot could not complete the request.`);throw e.code=d.code||`AI_PROVIDER_ERROR`,e.allowFallback=!1,e}if(!u){let e=Error(`Copilot ended the response before an answer was received.`);throw e.code=`AI_STREAM_INCOMPLETE`,e.allowFallback=!f,e}return u}function Le({token:e,compact:t=!1}){return(0,L.jsxs)(y,{size:9,align:`center`,style:{minWidth:0},children:[(0,L.jsx)(E,{size:t?30:34}),(0,L.jsxs)(`div`,{style:{minWidth:0},children:[(0,L.jsx)(Q,{level:5,style:{margin:0,fontSize:t?14:15,fontWeight:700,lineHeight:1.15,letterSpacing:`-0.015em`},children:`KiteLedger Copilot`}),!t&&(0,L.jsx)($,{type:`secondary`,ellipsis:!0,style:{display:`block`,marginTop:1,fontSize:11,lineHeight:1.25},children:`Business assistant`})]})]})}function Re({token:e}){return(0,L.jsx)(`style`,{children:`
            .kl-premium-page * {
                box-sizing: border-box;
            }

            .kl-premium-page .ant-card-head {
                border-bottom-color: ${e.colorBorderSecondary};
            }

            .kl-premium-page .kl-premium-main,
            .kl-premium-page .kl-premium-sidebar {
                box-shadow: none !important;
            }

            .kl-premium-page .kl-premium-main > .ant-card-body {
                min-height: 0;
                height: 100%;
                display: flex;
                flex-direction: column;
            }

            .kl-premium-page .kl-sidebar-chat {
                transition: background-color 140ms ease, border-color 140ms ease;
            }

            .kl-premium-page .kl-premium-sidebar .ant-list-items {
                display: grid;
                gap: 4px;
            }

            .kl-premium-page .kl-recent-conversations {
                scrollbar-width: thin;
                scrollbar-color: transparent transparent;
                scrollbar-gutter: stable;
            }

            .kl-premium-page .kl-recent-conversations:hover {
                scrollbar-color: ${e.colorFillSecondary} transparent;
            }

            .kl-premium-page .kl-recent-conversations::-webkit-scrollbar {
                width: 6px;
            }

            .kl-premium-page .kl-recent-conversations::-webkit-scrollbar-thumb {
                background: transparent;
                border-radius: 999px;
            }

            .kl-premium-page .kl-recent-conversations:hover::-webkit-scrollbar-thumb {
                background: ${e.colorFillSecondary};
            }

            .kl-premium-page .kl-sidebar-chat:hover {
                background: ${e.colorFillTertiary} !important;
            }

            .kl-premium-page .kl-message-bubble {
                transition: border-color 140ms ease, background-color 140ms ease;
            }

            .kl-premium-page .kl-message-bubble .kl-copy-button {
                opacity: .42;
                transition: opacity 140ms ease;
            }

            .kl-premium-page .kl-message-bubble:hover .kl-copy-button {
                opacity: 1;
            }

            .kl-premium-page .kl-chat-scroll {
                scrollbar-width: thin;
                scrollbar-color: ${e.colorFillSecondary} transparent;
                overscroll-behavior: contain;
            }

            .kl-premium-page .kl-chat-scroll::-webkit-scrollbar {
                width: 6px;
            }

            .kl-premium-page .kl-chat-scroll::-webkit-scrollbar-thumb {
                background: ${e.colorFillSecondary};
                border-radius: 999px;
            }

            .kl-premium-page .kl-composer-textarea textarea {
                padding: 0 !important;
                background: transparent !important;
                box-shadow: none !important;
                line-height: 1.5 !important;
            }

            .kl-premium-page .kl-composer-textarea,
            .kl-premium-page .kl-composer-textarea:hover,
            .kl-premium-page .kl-composer-textarea:focus,
            .kl-premium-page .kl-composer-textarea.ant-input-affix-wrapper-focused {
                border: 0 !important;
                box-shadow: none !important;
                background: transparent !important;
            }

            .kl-premium-page .kl-ai-preparing-mark {
                position: relative;
                width: 72px;
                height: 72px;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                border-radius: 22px;
                background: ${e.colorPrimaryBg};
                border: 1px solid ${e.colorPrimaryBorder};
                box-shadow: 0 14px 36px ${e.colorPrimaryBgHover};
                animation: kl-ai-preparing-float 2.4s ease-in-out infinite;
            }

            .kl-premium-page .kl-ai-preparing-mark::before,
            .kl-premium-page .kl-ai-preparing-mark::after {
                content: '';
                position: absolute;
                inset: -8px;
                border-radius: 28px;
                border: 1px solid ${e.colorPrimaryBorder};
                opacity: 0;
                animation: kl-ai-preparing-ring 2.2s ease-out infinite;
            }

            .kl-premium-page .kl-ai-preparing-mark::after {
                animation-delay: 1.1s;
            }

            .kl-premium-page .kl-ai-preparing-dots {
                display: inline-flex;
                align-items: center;
                gap: 5px;
                height: 10px;
            }

            .kl-premium-page .kl-ai-preparing-dots span {
                width: 5px;
                height: 5px;
                border-radius: 999px;
                background: ${e.colorPrimary};
                animation: kl-ai-preparing-dot 1.2s ease-in-out infinite;
            }

            .kl-premium-page .kl-ai-preparing-dots span:nth-child(2) { animation-delay: 140ms; }
            .kl-premium-page .kl-ai-preparing-dots span:nth-child(3) { animation-delay: 280ms; }

            @keyframes kl-ai-preparing-float {
                0%, 100% { transform: translateY(0); }
                50% { transform: translateY(-4px); }
            }

            @keyframes kl-ai-preparing-ring {
                0% { transform: scale(.86); opacity: .52; }
                75%, 100% { transform: scale(1.18); opacity: 0; }
            }

            @keyframes kl-ai-preparing-dot {
                0%, 60%, 100% { transform: translateY(0); opacity: .35; }
                30% { transform: translateY(-3px); opacity: 1; }
            }

            @media (prefers-reduced-motion: reduce) {
                .kl-premium-page .kl-ai-preparing-mark,
                .kl-premium-page .kl-ai-preparing-mark::before,
                .kl-premium-page .kl-ai-preparing-mark::after,
                .kl-premium-page .kl-ai-preparing-dots span {
                    animation: none !important;
                }
            }

            @media (max-width: 767px) {
                .kl-premium-page .kl-premium-main > .ant-card-body {
                    height: 100%;
                }

                .kl-premium-page .kl-copy-button {
                    opacity: .72 !important;
                }
            }
        `})}function ze({health:e,healthLoading:t,healthError:n,aiReady:r}){let i={height:22,marginInlineEnd:0,paddingInline:8,borderRadius:999,display:`inline-flex`,alignItems:`center`,gap:4,fontSize:11,fontWeight:650,lineHeight:`20px`};return t?(0,L.jsx)(w,{icon:(0,L.jsx)(g,{size:`small`}),bordered:!1,style:i,children:`Preparing`}):n?(0,L.jsx)(w,{color:`error`,icon:(0,L.jsx)(k,{}),bordered:!1,style:i,children:`Error`}):r?(0,L.jsx)(w,{color:`success`,icon:(0,L.jsx)(O,{}),bordered:!1,style:i,children:`Ready`}):(0,L.jsx)(w,{color:`warning`,icon:(0,L.jsx)(k,{}),bordered:!1,style:i,children:`Not ready`})}function Be({token:e}){return(0,L.jsxs)(`div`,{role:`status`,"aria-live":`polite`,"aria-label":`Preparing AI`,style:{width:`100%`,minHeight:`100%`,display:`flex`,flexDirection:`column`,alignItems:`center`,justifyContent:`center`,gap:18,padding:24,textAlign:`center`},children:[(0,L.jsx)(`div`,{className:`kl-ai-preparing-mark`,"aria-hidden":`true`,children:(0,L.jsx)(E,{size:44})}),(0,L.jsxs)(`div`,{children:[(0,L.jsxs)(y,{size:8,align:`center`,children:[(0,L.jsx)(Q,{level:4,style:{margin:0,fontSize:18,letterSpacing:`-0.02em`},children:`Preparing AI`}),(0,L.jsxs)(`span`,{className:`kl-ai-preparing-dots`,"aria-hidden":`true`,children:[(0,L.jsx)(`span`,{}),(0,L.jsx)(`span`,{}),(0,L.jsx)(`span`,{})]})]}),(0,L.jsx)($,{type:`secondary`,style:{display:`block`,maxWidth:420,marginTop:7,lineHeight:1.55},children:`Loading your secure business context and capabilities…`})]})]})}function Ve({evidence:e,token:t}){if(!e?.label)return null;let n=!!e.verified,r=e.as_of?new Date(e.as_of):null,i=[e.currency,e.branch_scope,e.filters?.date_range?`${e.filters.date_range.from} to ${e.filters.date_range.to}`:null,r&&!Number.isNaN(r.getTime())?`as of ${r.toLocaleString()}`:null].filter(Boolean).join(` · `);return(0,L.jsxs)(`div`,{style:{marginTop:8,display:`flex`,flexWrap:`wrap`,alignItems:`center`,gap:6},children:[(0,L.jsx)(w,{color:n?`green`:`blue`,icon:n?(0,L.jsx)(O,{}):null,bordered:!1,style:{marginInlineEnd:0},children:e.label}),i&&(0,L.jsx)($,{type:`secondary`,className:`kl-tabular`,style:{fontSize:11},children:i})]})}function He({message:e,token:t,isMobile:n,onCopy:r,onFollowup:i,actionStates:a={},onApprove:o,onReject:s}){let c=e.role===`user`,u=e.role===`assistant`,d=e.role===`system`,m={width:`fit-content`,maxWidth:n?`96%`:c?`min(720px, 76%)`:`min(920px, 90%)`,borderRadius:8,padding:n?`8px 0`:`10px 0`,whiteSpace:`pre-wrap`,wordBreak:`break-word`,lineHeight:1.52,fontSize:14,boxShadow:`none`,border:0,background:`transparent`,color:t.colorText};return c&&(m.background=t.colorPrimaryBg,m.color=t.colorText,m.padding=n?`9px 11px`:`10px 13px`),d&&(m.background=t.colorWarningBg,m.border=`1px solid ${t.colorWarningBorder}`,m.padding=n?`9px 11px`:`10px 13px`,m.color=t.colorText),(0,L.jsxs)(x.Item,{style:{border:`none`,padding:n?`4px 0`:`5px 0`,display:`flex`,alignItems:`flex-start`,justifyContent:c?`flex-end`:`flex-start`,gap:8},children:[!c&&(0,L.jsx)(`div`,{"aria-hidden":`true`,style:{width:26,height:26,marginTop:2,flex:`0 0 26px`,borderRadius:7,display:`inline-flex`,alignItems:`center`,justifyContent:`center`,color:u?t.colorPrimary:t.colorWarning,background:u?`transparent`:t.colorWarningBg,border:0,boxShadow:`none`},children:u?(0,L.jsx)(E,{size:26}):(0,L.jsx)(k,{})}),(0,L.jsxs)(`div`,{className:`kl-message-bubble`,style:m,children:[!c&&(0,L.jsx)(`div`,{style:{marginBottom:5,display:`flex`,alignItems:`center`,justifyContent:`space-between`,gap:8},children:(0,L.jsx)($,{strong:!0,style:{color:d?t.colorWarningText:t.colorText,fontSize:12,letterSpacing:`0.01em`},children:u?`KiteLedger Copilot`:`System notice`})}),(0,L.jsx)(H,{message:e,onFollowup:i}),u&&(0,L.jsx)(Ve,{evidence:e.evidence,token:t}),Array.isArray(e.sources)&&e.sources.length>0&&(0,L.jsx)(Ce,{sources:e.sources}),Array.isArray(e.actions)&&e.actions.map(e=>(0,L.jsx)(J,{action:e,state:a[e.id]||{},onApprove:o,onReject:s},e.id)),u&&(0,L.jsxs)(`div`,{style:{marginTop:8,paddingTop:6,borderTop:`1px solid ${t.colorBorderSecondary}`,display:`flex`,alignItems:`center`,justifyContent:`space-between`,gap:8,flexWrap:`wrap`},children:[(0,L.jsx)(y,{size:5,wrap:!0,children:e.cached&&(0,L.jsx)(w,{color:`green`,bordered:!1,style:{marginInlineEnd:0,borderRadius:999,fontSize:10},children:`Cached response`})}),(0,L.jsx)(f,{title:`Copy response`,children:(0,L.jsx)(p,{className:`kl-copy-button`,size:`small`,type:`text`,icon:(0,L.jsx)(l,{}),"aria-label":`Copy response`,onClick:()=>r(e.content)})})]})]})]})}function Ue(){let{token:e}=T.useToken(),i=!ee.useBreakpoint().md,a=n(),o=a.props?.auth?.permissions||[],c=!!a.props?.auth?.canBypassPermissions,l=(0,I.useMemo)(()=>{let e=a.props?.auth?.user?.id||`guest`,t=a.props?.branchContext?.selectedBranchId||a.props?.auth?.currentBranchId||`all`,n=a.props?.branchContext?.current_fiscal_year_id||`current`,r=a.props?.tenantContext?.companyName||`tenant`;return`kiteledger:ai-health:v1:${encodeURIComponent(r)}:${e}:${t}:${n}`},[a.props?.auth?.user?.id,a.props?.auth?.currentBranchId,a.props?.branchContext?.selectedBranchId,a.props?.branchContext?.current_fiscal_year_id,a.props?.tenantContext?.companyName]),u=(0,I.useMemo)(()=>Ne(l),[l]),d=c||Fe(o,[`ai.view`,`ai.use`,`ai.chat`,`ai.manage`]),[g,_]=(0,I.useState)(u),[v,b]=(0,I.useState)(null),[C,w]=(0,I.useState)(!u),[E,D]=(0,I.useState)([]),[O,se]=(0,I.useState)(``),[k,ce]=(0,I.useState)(!1),[A,j]=(0,I.useState)(null),[M,N]=(0,I.useState)(null),[fe,P]=(0,I.useState)({}),[F,pe]=(0,I.useState)([]),[me,R]=(0,I.useState)(!1),[he,ge]=(0,I.useState)(!1),[_e,ve]=(0,I.useState)(null),[ye,z]=(0,I.useState)(null),[be,B]=(0,I.useState)(`Working on your request`),[xe,V]=(0,I.useState)(``),H=(0,I.useRef)(null),U=(0,I.useRef)(null),W=(0,I.useMemo)(()=>!g||!d?!1:g.ready??!!(g.ok&&g.ai_enabled&&g.copilot_enabled&&g.provider_configured),[g,d]),G=(0,I.useMemo)(()=>C?null:v?v.code===`AI_PERMISSION_DENIED`?`You do not have permission to use KiteLedger Copilot.`:`Copilot readiness could not be checked. Try refreshing.`:g?W?null:d?g.ai_enabled===!1?`AI features are disabled by the platform administrator.`:g.copilot_enabled===!1?`KiteLedger Copilot is currently disabled.`:g.provider_configured===!1?`The shared AI provider has not been configured.`:g.provider_connection_verified===!1?`The shared AI provider and selected model have not passed the administrator connection test.`:g.selected_model_valid===!1?`The selected AI model is unavailable. Ask the platform administrator to test another model.`:`KiteLedger Copilot is not ready.`:`You do not have permission to use KiteLedger Copilot.`:`Copilot readiness could not be checked. Try refreshing.`,[g,v,C,W,d]),K=(0,I.useCallback)(async()=>{if(d)try{ve(null);let e=await t.get(`/api/ai/conversations`),n=e.data?.conversations?.data||e.data?.conversations||[];pe(Array.isArray(n)?n:[])}catch(e){ve(e.response?.data?.message||`Conversation history could not be loaded. Chat remains available.`)}},[d]),q=(0,I.useMemo)(()=>({page:{padding:i?`0 6px 6px`:`0 10px 10px`,background:e.colorBgLayout,height:i?`calc(100dvh - 110px)`:`calc(100dvh - 118px)`,minHeight:360,overflow:`hidden`,display:`flex`,flexDirection:`column`},shell:{display:`grid`,gridTemplateColumns:i?`minmax(0, 1fr)`:`248px minmax(0, 1fr)`,gap:0,alignItems:`stretch`,width:`100%`,maxWidth:1680,margin:`0 auto`,flex:`1 1 auto`,minHeight:0},sideCard:{height:`100%`,margin:0,borderRadius:0,border:0,overflow:`hidden`,background:e.colorBgLayout},mainCard:{height:`100%`,borderRadius:i?0:`0 0 12px 0`,border:0,borderLeft:i?0:`1px solid ${e.colorBorderSecondary}`,overflow:`hidden`,minWidth:0,background:e.colorBgContainer},chatArea:{flex:1,minHeight:0,overflowY:`auto`,padding:i?`12px`:`20px 24px`,background:e.colorBgContainer},composer:{flex:`0 0 auto`,padding:i?7:9,borderTop:`1px solid ${e.colorBorderSecondary}`,background:e.colorBgContainer,position:`sticky`,bottom:0,zIndex:5},composerSurface:{padding:i?`8px 9px`:`8px 10px`,borderRadius:8,background:e.colorBgElevated,border:`1px solid ${e.colorBorder}`,transition:`border-color 140ms ease`},composerBox:{display:`flex`,flexDirection:`row`,alignItems:`flex-end`,gap:8},sidebarSection:{display:`flex`,flexDirection:`column`,gap:10,width:`100%`,height:`100%`,minHeight:0,overflowY:`auto`},sectionLabel:{margin:0,color:e.colorTextTertiary,fontSize:12,fontWeight:600,letterSpacing:0},toolbar:{display:`flex`,alignItems:`center`,justifyContent:`space-between`,gap:7,width:`100%`,minWidth:0},toolbarActions:{display:`flex`,alignItems:`center`,justifyContent:`flex-end`,gap:4,width:`auto`},compactButton:{borderRadius:8,paddingInline:i?8:10},emptyState:{width:`100%`,maxWidth:760,minHeight:`100%`,margin:`0 auto`,display:`flex`,alignItems:`center`,justifyContent:`center`}}),[e,i]);(0,I.useEffect)(()=>{if(!d){w(!1);return}let e=!1,n=Ne(l);return _(n),w(!n),b(null),t.get(`/api/ai/health`).then(t=>{e||(_(t.data),Pe(l,t.data))}).catch(t=>{e||n||(t.response?.status===403?b(t.response.data||{message:`Permission denied.`}):b({message:t.response?.data?.message||`Failed to load AI health.`}))}).finally(()=>{e||w(!1)}),()=>{e=!0}},[d,l]),(0,I.useEffect)(()=>{K()},[K]),(0,I.useEffect)(()=>{U.current&&(U.current.scrollTop=U.current.scrollHeight)},[E,k]);let J=async e=>{let n=(e??O).trim();if(!n||k)return;if(!W){N({message:G||`KiteLedger Copilot is not ready.`});return}N(null),z(null);let r={role:`user`,content:n,id:`${Date.now()}-user`};D(e=>[...e,r]),se(``),ce(!0),V(``),B(`Understanding your question`);let i=e=>V(t=>t+e),o=()=>V(``),s=new AbortController;H.current=s;let c=!1,l=(Number(g?.runtime_timeout_seconds||180)+30)*1e3,u=window.setTimeout(()=>{c=!0,s.abort()},l),d={message:n,conversation_id:A,context_type:`auto`,context_payload:{url:a.url},cache:!0};try{let e;if(g?.stream_enabled)try{e=await Ie(d,s.signal,B,i)}catch(n){if(!n.allowFallback||s.signal.aborted)throw n;o(),B(`Preparing your answer`),e=(await t.post(`/api/ai/chat`,d,{signal:s.signal,timeout:l})).data}else e=(await t.post(`/api/ai/chat`,d,{signal:s.signal,timeout:l})).data;let n=e?.message?.content||`(no reply)`;j(e?.conversation_id||A),K(),D(t=>[...t,{role:`assistant`,content:n,id:`${Date.now()}-assistant`,cached:e?.cached,actions:e?.actions||[],sources:e?.sources||[],cards:e?.cards||[],tables:e?.tables||[],warnings:e?.warnings||[],source_note:e?.source_note||null,followups:e?.followups||[],answer_type:e?.answer_type||null,answer:e?.answer||null,evidence:e?.evidence||null,currency:e?.currency||null}])}catch(e){if((t.isCancel(e)||e.name===`CanceledError`||e.name===`AbortError`)&&!c)D(e=>[...e,{role:`system`,content:`Response display was stopped. The provider may still be finishing the request on the server.`,id:`${Date.now()}-system`}]);else{z(n);let t=e.response?.data,r=c||e.code===`ECONNABORTED`?`AI_TIMEOUT`:t?.code||e.code||null,i=t?.message||e.message||`AI request failed.`;r===`AI_TIMEOUT`&&(i=`AI request timed out. Try a shorter prompt. If this continues, ask the platform administrator to review the shared model and timeout settings.`),r===`AI_PERMISSION_DENIED`&&t?.required_permission&&(i=t.message||`You do not have permission to use KiteLedger Copilot.`),N({message:i,code:r})}}finally{window.clearTimeout(u),ce(!1),V(``),B(`Working on your request`),H.current=null}},Y=()=>{H.current?.abort()},Se=()=>{let e=ye||[...E].reverse().find(e=>e.role===`user`)?.content;e&&(D(t=>{let n=t.findLastIndex(t=>t.role===`user`&&t.content===e);return n>=0?t.slice(0,n):t}),N(null),J(e))},X=async e=>{try{await navigator.clipboard?.writeText(e),S.success(`Copied`)}catch{S.error(`Copy failed`)}},Ce=()=>{D([]),j(null),N(null),P({}),z(null)},Te=()=>{D([]),N(null),P({}),z(null)},Z=async e=>{ge(!0);try{let n=await t.get(`/api/ai/conversations/${encodeURIComponent(e)}`),r=n.data?.messages?.data||n.data?.messages||[];D(r.map((t,n)=>({...t,id:`${e}-${n}-${t.created_at||``}`}))),j(e),R(!1),N(null),P({})}catch(e){S.error(e.response?.data?.message||`Could not open that conversation.`)}finally{ge(!1)}},Ee=async(e,n)=>{e.stopPropagation(),re.confirm({title:`Delete this conversation permanently?`,content:`Its messages cannot be recovered. This does not delete accounting records or drafts.`,okText:`Delete conversation`,okButtonProps:{danger:!0},cancelText:`Keep conversation`,onOk:async()=>{try{await t.delete(`/api/ai/conversations/${encodeURIComponent(n)}`),A===n&&Ce(),await K(),S.success(`Conversation deleted.`)}catch(e){throw S.error(e.response?.data?.message||`Could not delete that conversation.`),e}}})},Oe=e=>{if(A){Ee(e,A);return}Te()},Q=(e,t)=>{D(n=>n.map(n=>Array.isArray(n.actions)?{...n,actions:n.actions.map(n=>n.id===e?{...n,...t}:n)}:n))},Ae=async(e,n)=>{let r=e.id;P(e=>({...e,[r]:{...e[r],loading:!0,error:null}}));try{let e=await t.post(`/api/ai/actions/${r}/approve`,{confirmation_text:n||void 0});P(t=>({...t,[r]:{loading:!1,status:`executed`,result:e.data?.result||null}})),Q(r,{status:`executed`}),S.success(e.data?.message||`AI action executed.`)}catch(e){let t=e.response?.data,n=t?.code===`AI_CONFIRMATION_REQUIRED`?t.message:t?.message||`Could not complete the action.`;P(e=>({...e,[r]:{loading:!1,status:t?.status||`failed`,error:n}})),t?.status===`failed`&&Q(r,{status:`failed`}),S.error(n)}},je=async e=>{let n=e.id;P(e=>({...e,[n]:{...e[n],loading:!0,error:null}}));try{await t.post(`/api/ai/actions/${n}/reject`),P(e=>({...e,[n]:{loading:!1,status:`rejected`}})),Q(n,{status:`rejected`}),S.info(`AI action rejected.`)}catch(e){let t=e.response?.data?.message||`Could not reject the action.`;P(e=>({...e,[n]:{loading:!1,error:t}})),S.error(t)}},Ve=C?`Preparing KiteLedger Copilot`:v?`Copilot unavailable`:W?`Copilot ready`:`Copilot not ready`,Ue=C?e.colorWarning:v?e.colorError:W?e.colorSuccess:e.colorWarning,We=(0,L.jsxs)(`div`,{style:q.toolbar,children:[(0,L.jsx)(Le,{token:e,compact:i}),(0,L.jsxs)(`div`,{style:q.toolbarActions,children:[i?(0,L.jsx)(f,{title:Ve,children:(0,L.jsx)(`span`,{role:`status`,"aria-label":Ve,style:{width:10,height:10,flex:`0 0 10px`,borderRadius:`50%`,background:Ue,boxShadow:`0 0 0 3px ${e.colorFillQuaternary}`}})}):(0,L.jsx)(ze,{health:g,healthLoading:C,healthError:v,aiReady:W}),(0,L.jsx)(p,{size:`small`,icon:(0,L.jsx)(le,{}),onClick:()=>R(!0),"aria-label":`Open conversation history`,style:q.compactButton,children:!i&&`History`}),(0,L.jsx)(p,{size:`small`,type:`primary`,icon:(0,L.jsx)(m,{}),onClick:Ce,"aria-label":`Start a new conversation`,style:q.compactButton,children:!i&&`New`}),(0,L.jsx)(f,{title:A?`Delete this conversation`:`Clear this conversation`,children:(0,L.jsx)(p,{size:`small`,type:`text`,danger:!0,icon:(0,L.jsx)(ae,{}),"aria-label":A?`Delete conversation`:`Clear conversation`,onClick:Oe,disabled:!E.length,style:{borderRadius:e.borderRadiusLG}})})]})]});return d?(0,L.jsxs)(oe,{header:We,children:[(0,L.jsx)(r,{title:`KiteLedger Copilot`}),(0,L.jsx)(we,{}),(0,L.jsx)(Re,{token:e}),(0,L.jsxs)(`div`,{className:`kl-premium-page`,style:q.page,children:[(v||M||!C&&g&&!W)&&(0,L.jsxs)(y,{direction:`vertical`,size:10,style:{width:`100%`,maxWidth:1320,margin:`0 auto 12px`},children:[v&&(0,L.jsx)(s,{type:`error`,showIcon:!0,message:v.message,description:`Please contact your administrator or try again.`}),!C&&g&&!g.ai_enabled&&(0,L.jsx)(s,{type:`warning`,showIcon:!0,message:`KiteLedger Copilot is disabled by the central administrator.`,description:`Contact the platform administrator to enable AI for the application.`}),!C&&g?.ai_enabled&&!g.provider_configured&&(0,L.jsx)(s,{type:`warning`,showIcon:!0,message:`AI provider is not configured by the central administrator.`,description:`Contact the platform administrator to configure the shared AI provider.`}),M&&(0,L.jsx)(s,{type:`error`,showIcon:!0,closable:!0,message:M.message,onClose:()=>N(null)})]}),(0,L.jsxs)(`div`,{style:q.shell,children:[!i&&(0,L.jsx)(h,{className:`kl-premium-sidebar`,size:`small`,bordered:!1,style:q.sideCard,styles:{body:{padding:10,height:`100%`,overflow:`hidden`}},children:(0,L.jsxs)(`div`,{className:`kl-recent-conversations`,style:q.sidebarSection,children:[(0,L.jsx)($,{style:q.sectionLabel,children:`Recent conversations`}),F.length?(0,L.jsx)(x,{size:`small`,split:!1,dataSource:F.slice(0,7),renderItem:t=>{let n=A===t.id;return(0,L.jsx)(x.Item,{className:`kl-sidebar-chat`,onClick:()=>Z(t.id),style:{cursor:`pointer`,margin:0,padding:`9px 10px`,borderRadius:7,border:`1px solid transparent`,background:n?e.colorPrimaryBg:`transparent`},children:(0,L.jsx)(x.Item.Meta,{avatar:(0,L.jsx)(`div`,{style:{width:24,height:24,borderRadius:e.borderRadius,display:`inline-flex`,alignItems:`center`,justifyContent:`center`,color:n?e.colorPrimary:e.colorTextSecondary,background:n?e.colorPrimaryBgHover:e.colorFillQuaternary},children:(0,L.jsx)(le,{})}),title:(0,L.jsx)($,{strong:n,ellipsis:!0,style:{maxWidth:152,fontSize:12},children:Me(t)}),description:(0,L.jsx)($,{type:`secondary`,ellipsis:!0,style:{display:`block`,maxWidth:152,fontSize:11},children:t.updated_at?new Date(t.updated_at).toLocaleString():t.module||`KiteLedger Copilot`})})})}}):(0,L.jsx)(`div`,{style:{padding:`10px 8px`,borderRadius:e.borderRadiusLG,border:`1px dashed ${e.colorBorder}`,background:e.colorFillQuaternary,textAlign:`center`},children:(0,L.jsx)($,{type:`secondary`,style:{fontSize:12},children:`Recent chats appear here.`})})]})}),(0,L.jsxs)(h,{className:`kl-premium-main`,size:`small`,bordered:!1,style:q.mainCard,styles:{body:{padding:0}},children:[(0,L.jsxs)(`div`,{ref:U,className:`kl-chat-scroll`,style:q.chatArea,"aria-busy":C||k,children:[C&&!g?(0,L.jsx)(Be,{token:e}):E.length===0?(0,L.jsx)(`div`,{style:q.emptyState,children:(0,L.jsx)(De,{onSelect:J,disabled:!W||k,isMobile:i,capabilities:{financialTools:!!g?.financial_tools_available,toolCalling:!!g?.tool_calling_available,rag:!!g?.rag_index_ready,writeProposals:!!g?.write_proposals_available}})}):(0,L.jsx)(x,{dataSource:E,split:!1,renderItem:(t,n)=>(0,L.jsx)(`div`,{className:`kl-rise`,style:{animationDelay:n<6?`${n*40}ms`:`0ms`},children:(0,L.jsx)(He,{message:t,token:e,isMobile:i,onCopy:X,onFollowup:J,actionStates:fe,onApprove:Ae,onReject:je})},t.id)}),k&&xe?(0,L.jsx)(`div`,{className:`kl-rise`,children:(0,L.jsx)(He,{message:{id:`streaming`,role:`assistant`,content:xe,streaming:!0},token:e,isMobile:i,onCopy:X,onFollowup:J,actionStates:fe,onApprove:Ae,onReject:je})}):k&&(0,L.jsx)(ke,{isMobile:i,label:be})]}),(0,L.jsx)(`div`,{style:q.composer,children:(0,L.jsxs)(`div`,{style:q.composerSurface,children:[(0,L.jsxs)(`div`,{style:q.composerBox,children:[(0,L.jsx)(ne.TextArea,{className:`kl-composer-textarea`,value:O,onChange:e=>se(e.target.value),placeholder:C?`Preparing AI…`:W?`Ask about invoices, cash flow, customers, inventory, reports, or KiteLedger workflows…`:G||`KiteLedger Copilot is not ready.`,autoSize:{minRows:1,maxRows:i?4:5},bordered:!1,disabled:!W||k,onPressEnter:e=>{e.shiftKey||(e.preventDefault(),J())},style:{minHeight:36,resize:`none`,fontSize:14}}),(0,L.jsxs)(y,{size:5,style:{flex:`0 0 auto`},children:[(0,L.jsx)(f,{title:`Retry the last prompt`,children:(0,L.jsx)(p,{icon:(0,L.jsx)(ie,{}),onClick:Se,disabled:k||!E.length,"aria-label":`Retry last prompt`,style:{width:38,height:38,borderRadius:e.borderRadiusLG}})}),k?(0,L.jsx)(p,{danger:!0,type:`primary`,icon:(0,L.jsx)(de,{}),onClick:Y,style:{width:i?40:84,height:38,borderRadius:e.borderRadiusLG,fontWeight:650},children:!i&&`Stop`}):(0,L.jsx)(p,{type:`primary`,icon:(0,L.jsx)(ue,{}),onClick:()=>J(),disabled:!W||!O.trim(),style:{width:i?40:84,height:38,borderRadius:e.borderRadiusLG,boxShadow:e.boxShadowTertiary,fontWeight:650},children:!i&&`Send`})]})]}),!i&&(0,L.jsx)($,{type:`secondary`,style:{display:`block`,marginTop:7,fontSize:11},children:`Enter send · Shift + Enter newline`})]})})]})]}),(0,L.jsxs)(te,{title:(0,L.jsx)(Le,{token:e,compact:!0}),open:me,onClose:()=>R(!1),width:i?`100%`:380,styles:{header:{borderBottom:`1px solid ${e.colorBorderSecondary}`},body:{padding:10}},children:[_e&&(0,L.jsx)(s,{type:`warning`,showIcon:!0,closable:!0,message:_e,onClose:()=>ve(null),style:{marginBottom:12}}),(0,L.jsx)($,{type:`secondary`,style:{display:`block`,margin:`0 2px 12px`,fontSize:12},children:`Select a conversation to continue where you left off.`}),(0,L.jsx)(x,{loading:he,dataSource:F,locale:{emptyText:`No saved conversations yet.`},split:!1,renderItem:t=>(0,L.jsx)(x.Item,{className:`kl-sidebar-chat`,onClick:()=>Z(t.id),style:{cursor:`pointer`,marginBottom:4,padding:`8px 9px`,borderRadius:e.borderRadiusLG,border:`1px solid ${e.colorBorderSecondary}`},actions:[(0,L.jsx)(p,{type:`text`,danger:!0,icon:(0,L.jsx)(ae,{}),"aria-label":`Delete conversation`,onClick:e=>Ee(e,t.id)},`delete`)],children:(0,L.jsx)(x.Item.Meta,{avatar:(0,L.jsx)(`div`,{style:{width:28,height:28,borderRadius:e.borderRadiusLG,display:`inline-flex`,alignItems:`center`,justifyContent:`center`,color:e.colorPrimary,background:e.colorPrimaryBg,border:`1px solid ${e.colorPrimaryBorder}`},children:(0,L.jsx)(le,{})}),title:Me(t),description:t.updated_at?new Date(t.updated_at).toLocaleString():t.module||`KiteLedger Copilot`})})})]})]})]}):(0,L.jsxs)(oe,{header:(0,L.jsx)(Le,{token:e}),children:[(0,L.jsx)(r,{title:`KiteLedger Copilot`}),(0,L.jsx)(`div`,{style:q.page,children:(0,L.jsx)(s,{type:`warning`,showIcon:!0,message:`You do not have permission to use KiteLedger Copilot.`,description:`Please contact your administrator if you need access.`})})]})}export{Ue as default};