import{i as e}from"./chunk-62oNxeRG.js";import{i as t}from"./axios-CFfZBleg.js";import{r as n,t as r}from"./jsx-runtime-gigNY91P.js";import{Pt as i}from"./useSize-hzOUpMP_.js";import{t as a}from"./table-tecCJUwL.js";import{t as o}from"./alert-BaHPwePE.js";import{t as s}from"./select-BmOvnPIw.js";import{t as c}from"./skeleton-AlTJQnhB.js";import{t as l}from"./empty-BZQ-tvZU.js";import{t as u}from"./tooltip-clCwpzP8.js";import{t as d}from"./button-Dz1Av4BD.js";import{t as f}from"./dayjs.min-CJ7289I6.js";import{t as p}from"./date-picker-BgUf6MZL.js";import{t as m}from"./tabs-BYU3tg5F.js";import{t as h}from"./card-Vt669Ygr.js";import{t as g}from"./typography-COSGzUQY.js";import{t as _}from"./ReloadOutlined-D8To57B1.js";import{t as v}from"./tag-CxQ8hfzV.js";import{i as y,o as b,t as x}from"./index.esm-s6VguL6m.js";import{c as S,r as C}from"./app-D2im8Q56.js";import{t as w}from"./AuthenticatedLayout-Clfz6EYL.js";import{A as T,An as E,B as D,C as O,Cn as k,Ct as ee,Fn as te,Gn as A,H as ne,Hn as j,Jt as re,Ln as ie,Nn as ae,O as oe,Rn as se,S as ce,T as le,Tn as ue,Tt as de,V as fe,Yn as pe,Zt as me,_n as he,an as ge,ar as _e,b as ve,cr as M,dn as ye,er as N,f as be,fr as xe,gn as Se,j as Ce,ln as we,nr as Te,pn as Ee,pt as De,qn as Oe,rr as P,tr as ke,un as Ae,ur as je,xt as Me,yn as Ne,z as F,zn as Pe,zt as Fe}from"./CategoricalChart-sok1BzJ7.js";import{t as I}from"./Legend-DUL4ITI5.js";import{i as Ie}from"./tooltipContext-TRuC_-5p.js";import{a as Le,i as Re,n as L,r as ze,t as Be}from"./LineChart-BWGIhCTc.js";import{i as Ve,t as He}from"./PieChart-BDdm2Pfu.js";import{i as Ue,n as We,r as Ge,t as Ke}from"./BarChart-TVYMbC7w.js";import{a as qe,i as Je,n as R,r as z,s as Ye,t as Xe}from"./CartesianChart-lRmTBYGO.js";var Ze=(e,t,n)=>De(e,`xAxis`,Ge(e,t),n),Qe=(e,t,n)=>ee(e,`xAxis`,Ge(e,t),n),$e=(e,t,n)=>De(e,`yAxis`,Ue(e,t),n),et=(e,t,n)=>ee(e,`yAxis`,Ue(e,t),n),tt=A([Se,Ze,$e,Qe,et],(e,t,n,r,i)=>Pe(e,`xAxis`)?E(t,r,!1):E(n,i,!1)),nt=A([de,(e,t)=>t],(e,t)=>e.filter(e=>e.type===`area`).find(e=>e.id===t)),rt=e=>Pe(Se(e),`xAxis`)?`yAxis`:`xAxis`,it=(e,t)=>rt(e)===`yAxis`?Ue(e,t):Ge(e,t),at=A([Se,Ze,$e,Qe,et,A([nt,(e,t,n)=>Me(e,rt(e),it(e,t),n)],(e,t)=>{if(!(e==null||t==null)){var{stackId:n}=e,r=Fe(e);if(!(n==null||r==null)){var i=(t[n]?.stackedData)?.find(e=>e.key===r);if(i!=null)return i.map(e=>[e[0],e[1]])}}}),ge,tt,nt,me],(e,t,n,r,i,a,o,s,c,l)=>{var{chartData:u,dataStartIndex:d,dataEndIndex:f}=o;if(!(c==null||e!==`horizontal`&&e!==`vertical`||t==null||n==null||r==null||i==null||r.length===0||i.length===0||s==null)){var{data:p}=c,m=p&&p.length>0?p:u?.slice(d,f+1);if(m!=null)return Ot({layout:e,xAxis:t,yAxis:n,xAxisTicks:r,yAxisTicks:i,dataStartIndex:d,areaSettings:c,stackedData:a,displayedData:m,chartBaseValue:l,bandSize:s})}}),B=e(n()),ot=[`id`],st=[`activeDot`,`animationBegin`,`animationDuration`,`animationEasing`,`connectNulls`,`dot`,`fill`,`fillOpacity`,`hide`,`isAnimationActive`,`legendType`,`stroke`,`xAxisId`,`yAxisId`];function V(){return V=Object.assign?Object.assign.bind():function(e){for(var t=1;t<arguments.length;t++){var n=arguments[t];for(var r in n)({}).hasOwnProperty.call(n,r)&&(e[r]=n[r])}return e},V.apply(null,arguments)}function ct(e,t){if(e==null)return{};var n,r,i=lt(e,t);if(Object.getOwnPropertySymbols){var a=Object.getOwnPropertySymbols(e);for(r=0;r<a.length;r++)n=a[r],t.indexOf(n)===-1&&{}.propertyIsEnumerable.call(e,n)&&(i[n]=e[n])}return i}function lt(e,t){if(e==null)return{};var n={};for(var r in e)if({}.hasOwnProperty.call(e,r)){if(t.indexOf(r)!==-1)continue;n[r]=e[r]}return n}function ut(e,t){var n=Object.keys(e);if(Object.getOwnPropertySymbols){var r=Object.getOwnPropertySymbols(e);t&&(r=r.filter(function(t){return Object.getOwnPropertyDescriptor(e,t).enumerable})),n.push.apply(n,r)}return n}function H(e){for(var t=1;t<arguments.length;t++){var n=arguments[t]==null?{}:arguments[t];t%2?ut(Object(n),!0).forEach(function(t){dt(e,t,n[t])}):Object.getOwnPropertyDescriptors?Object.defineProperties(e,Object.getOwnPropertyDescriptors(n)):ut(Object(n)).forEach(function(t){Object.defineProperty(e,t,Object.getOwnPropertyDescriptor(n,t))})}return e}function dt(e,t,n){return(t=ft(t))in e?Object.defineProperty(e,t,{value:n,enumerable:!0,configurable:!0,writable:!0}):e[t]=n,e}function ft(e){var t=pt(e,`string`);return typeof t==`symbol`?t:t+``}function pt(e,t){if(typeof e!=`object`||!e)return e;var n=e[Symbol.toPrimitive];if(n!==void 0){var r=n.call(e,t||`default`);if(typeof r!=`object`)return r;throw TypeError(`@@toPrimitive must return a primitive value.`)}return(t===`string`?String:Number)(e)}function U(e,t){return e&&e!==`none`?e:t}var mt=e=>{var{dataKey:t,name:n,stroke:r,fill:i,legendType:a,hide:o}=e;return[{inactive:o,dataKey:t,type:a,color:U(r,i),value:ie(n,t),payload:e}]},ht=B.memo(e=>{var{dataKey:t,data:n,stroke:r,strokeWidth:i,fill:a,name:o,hide:s,unit:c,tooltipType:l,id:u}=e,d={dataDefinedOnItem:n,getPosition:_e,settings:{stroke:r,strokeWidth:i,fill:a,dataKey:t,nameKey:void 0,name:ie(o,t),hide:s,type:l,color:U(r,a),unit:c,graphicalItemId:u}};return B.createElement(le,{tooltipEntrySettings:d})});function gt(e){var{clipPathId:t,points:n,props:r}=e,{needClip:i,dot:a,dataKey:o}=r,s=xe(r);return B.createElement(Le,{points:n,dot:a,className:`recharts-area-dots`,dotClassName:`recharts-area-dot`,dataKey:o,baseProps:s,needClip:i,clipPathId:t})}function _t(e){var{showLabels:t,children:n,points:r}=e,i=r.map(e=>{var t={x:e.x??0,y:e.y??0,width:0,lowerWidth:0,upperWidth:0,height:0};return H(H({},t),{},{value:e.value,payload:e.payload,parentViewBox:void 0,viewBox:t,fill:void 0})});return B.createElement(T,{value:t?i:void 0},n)}function vt(e){var{points:t,baseLine:n,needClip:r,clipPathId:i,props:a}=e,{layout:o,type:s,stroke:c,connectNulls:l,isRange:u}=a,{id:d}=a,f=ct(a,ot),p=xe(f),m=je(f);return B.createElement(B.Fragment,null,t?.length>1&&B.createElement(M,{clipPath:r?`url(#clipPath-${i})`:void 0},B.createElement(ye,V({},m,{id:d,points:t,connectNulls:l,type:s,baseLine:n,layout:o,stroke:`none`,className:`recharts-area-area`})),c!==`none`&&B.createElement(ye,V({},p,{className:`recharts-area-curve`,layout:o,type:s,connectNulls:l,fill:`none`,points:t})),c!==`none`&&u&&Array.isArray(n)&&B.createElement(ye,V({},p,{className:`recharts-area-curve`,layout:o,type:s,connectNulls:l,fill:`none`,points:n}))),B.createElement(gt,{points:t,props:f,clipPathId:i}))}function yt(e){var{alpha:t,baseLine:n,points:r,strokeWidth:i}=e,a=r[0]?.y,o=r[r.length-1]?.y;if(!j(a)||!j(o))return null;var s=t*Math.abs(a-o),c=Math.max(...r.map(e=>e.x||0));return P(n)?c=Math.max(n,c):n&&Array.isArray(n)&&n.length&&(c=Math.max(...n.map(e=>e.x||0),c)),P(c)?B.createElement(`rect`,{x:0,y:a<o?a:a-s,width:c+(i?parseInt(`${i}`,10):1),height:Math.floor(s)}):null}function bt(e){var{alpha:t,baseLine:n,points:r,strokeWidth:i}=e,a=r[0]?.x,o=r[r.length-1]?.x;if(!j(a)||!j(o))return null;var s=t*Math.abs(a-o),c=Math.max(...r.map(e=>e.y||0));return P(n)?c=Math.max(n,c):n&&Array.isArray(n)&&n.length&&(c=Math.max(...n.map(e=>e.y||0),c)),P(c)?B.createElement(`rect`,{x:a<o?a:a-s,y:0,width:s,height:Math.floor(c+(i?parseInt(`${i}`,10):1))}):null}function xt(e){var{alpha:t,layout:n,points:r,baseLine:i,strokeWidth:a}=e;return n===`vertical`?B.createElement(yt,{alpha:t,points:r,baseLine:i,strokeWidth:a}):B.createElement(bt,{alpha:t,points:r,baseLine:i,strokeWidth:a})}function St(e){var{needClip:t,clipPathId:n,props:r,previousPointsRef:i,previousBaselineRef:a}=e,{points:o,baseLine:s,isAnimationActive:c,animationBegin:l,animationDuration:u,animationEasing:d,onAnimationStart:f,onAnimationEnd:p}=r,m=we((0,B.useMemo)(()=>({points:o,baseLine:s}),[o,s]),`recharts-area-`),h=he(),[g,_]=(0,B.useState)(!1),v=!g,y=(0,B.useCallback)(()=>{typeof p==`function`&&p(),_(!1)},[p]),b=(0,B.useCallback)(()=>{typeof f==`function`&&f(),_(!0)},[f]);if(h==null)return null;var x=i.current,S=a.current;return B.createElement(_t,{showLabels:v,points:o},r.children,B.createElement(Ae,{animationId:m,begin:l,duration:u,isActive:c,easing:d,onAnimationEnd:y,onAnimationStart:b,key:m},e=>{if(x){var l=x.length/o.length,u=e===1?o:o.map((t,n)=>{var r=Math.floor(n*l);if(x[r]){var i=x[r];return H(H({},t),{},{x:N(i.x,t.x,e),y:N(i.y,t.y,e)})}return t}),d=P(s)?N(S,s,e):Te(s)||ke(s)?N(S,0,e):s.map((t,n)=>{var r=Math.floor(n*l);if(Array.isArray(S)&&S[r]){var i=S[r];return H(H({},t),{},{x:N(i.x,t.x,e),y:N(i.y,t.y,e)})}return t});return e>0&&(i.current=u,a.current=d),B.createElement(vt,{points:u,baseLine:d,needClip:t,clipPathId:n,props:r})}return e>0&&(i.current=o,a.current=s),B.createElement(M,null,c&&B.createElement(`defs`,null,B.createElement(`clipPath`,{id:`animationClipPath-${n}`},B.createElement(xt,{alpha:e,points:o,baseLine:s,layout:h,strokeWidth:r.strokeWidth}))),B.createElement(M,{clipPath:`url(#animationClipPath-${n})`},B.createElement(vt,{points:o,baseLine:s,needClip:t,clipPathId:n,props:r})))}),B.createElement(Ce,{label:r.label}))}function Ct(e){var{needClip:t,clipPathId:n,props:r}=e,i=(0,B.useRef)(null),a=(0,B.useRef)();return B.createElement(St,{needClip:t,clipPathId:n,props:r,previousPointsRef:i,previousBaselineRef:a})}var wt=class extends B.PureComponent{render(){var{hide:e,dot:t,points:n,className:r,top:a,left:o,needClip:s,xAxisId:c,yAxisId:l,width:u,height:d,id:f,baseLine:p,zIndex:m}=this.props;if(e)return null;var h=i(`recharts-area`,r),g=f,{r:_,strokeWidth:v}=ze(t),y=oe(t),b=_*2+v,x=s?`url(#clipPath-${y?``:`dots-`}${g})`:void 0;return B.createElement(fe,{zIndex:m},B.createElement(M,{className:h},s&&B.createElement(`defs`,null,B.createElement(Je,{clipPathId:g,xAxisId:c,yAxisId:l}),!y&&B.createElement(`clipPath`,{id:`clipPath-dots-${g}`},B.createElement(`rect`,{x:o-b/2,y:a-b/2,width:u+b,height:d+b}))),B.createElement(Ct,{needClip:s,clipPathId:g,props:this.props})),B.createElement(Re,{points:n,mainColor:U(this.props.stroke,this.props.fill),itemDataKey:this.props.dataKey,activeDot:this.props.activeDot,clipPath:x}),this.props.isRange&&Array.isArray(p)&&B.createElement(Re,{points:p,mainColor:U(this.props.stroke,this.props.fill),itemDataKey:this.props.dataKey,activeDot:this.props.activeDot,clipPath:x}))}},Tt={activeDot:!0,animationBegin:0,animationDuration:1500,animationEasing:`ease`,connectNulls:!1,dot:!1,fill:`#3182bd`,fillOpacity:.6,hide:!1,isAnimationActive:`auto`,legendType:`line`,stroke:`#3182bd`,strokeWidth:1,type:`linear`,label:!1,xAxisId:0,yAxisId:0,zIndex:re.area};function Et(e){var{activeDot:t,animationBegin:n,animationDuration:r,animationEasing:i,connectNulls:a,dot:o,fill:s,fillOpacity:c,hide:l,isAnimationActive:u,legendType:d,stroke:f,xAxisId:p,yAxisId:m}=e,h=ct(e,st),g=Ne(),_=ne(),{needClip:v}=qe(p,m),y=ue(),{points:b,isRange:x,baseLine:S}=Oe(t=>at(t,e.id,y))??{},C=be();if(g!==`horizontal`&&g!==`vertical`||C==null||_!==`AreaChart`&&_!==`ComposedChart`)return null;var{height:w,width:T,x:E,y:D}=C;return!b||!b.length?null:B.createElement(wt,V({},h,{activeDot:t,animationBegin:n,animationDuration:r,animationEasing:i,baseLine:S,connectNulls:a,dot:o,fill:s,fillOpacity:c,height:w,hide:l,layout:g,isAnimationActive:u,isRange:x,legendType:d,needClip:v,points:b,stroke:f,width:T,left:E,top:D,xAxisId:p,yAxisId:m}))}var Dt=(e,t,n,r,i)=>{var a=n??t;if(P(a))return a;var o=e===`horizontal`?i:r,s=o.scale.domain();if(o.type===`number`){var c=Math.max(s[0],s[1]),l=Math.min(s[0],s[1]);return a===`dataMin`?l:a===`dataMax`||c<0?c:Math.max(Math.min(s[0],s[1]),0)}return a===`dataMin`?s[0]:a===`dataMax`?s[1]:s[0]};function Ot(e){var{areaSettings:{connectNulls:t,baseValue:n,dataKey:r},stackedData:i,layout:a,chartBaseValue:o,xAxis:s,yAxis:c,displayedData:l,dataStartIndex:u,xAxisTicks:d,yAxisTicks:f,bandSize:p}=e,m=i&&i.length,h=Dt(a,o,n,s,c),g=a===`horizontal`,_=!1,v=l.map((e,n)=>{var a;if(m)a=i[u+n];else{var o=se(e,r);Array.isArray(o)?(a=o,_=!0):a=[h,o]}var l=a?.[1]??null,v=l==null||m&&!t&&se(e,r)==null;return g?{x:ae({axis:s,ticks:d,bandSize:p,entry:e,index:n}),y:v?null:c.scale.map(l)??null,value:a,payload:e}:{x:v?null:s.scale.map(l)??null,y:ae({axis:c,ticks:f,bandSize:p,entry:e,index:n}),value:a,payload:e}});return{points:v,baseLine:(m||_?v.map(e=>{var t=Array.isArray(e.value)?e.value[0]:null;return g?{x:e.x,y:t!=null&&e.y!=null?c.scale.map(t)??null:null,payload:e.payload}:{x:t==null?null:s.scale.map(t)??null,y:e.y,payload:e.payload}}):g?c.scale.map(h):s.scale.map(h))??0,isRange:_}}function kt(e){var t=pe(e,Tt),n=ue();return B.createElement(ce,{id:t.id,type:`area`},e=>B.createElement(B.Fragment,null,B.createElement(O,{legendPayload:mt(t)}),B.createElement(ht,{dataKey:t.dataKey,data:t.data,stroke:t.stroke,strokeWidth:t.strokeWidth,fill:t.fill,name:t.name,hide:t.hide,unit:t.unit,tooltipType:t.tooltipType,id:e}),B.createElement(ve,{type:`area`,id:e,data:t.data,dataKey:t.dataKey,xAxisId:t.xAxisId,yAxisId:t.yAxisId,zAxisId:0,stackId:te(t.stackId),hide:t.hide,barSize:void 0,baseValue:t.baseValue,isPanorama:n,connectNulls:t.connectNulls}),B.createElement(Et,V({},t,{id:e}))))}var At=B.memo(kt,Ee);At.displayName=`Area`;var jt=[`axis`],Mt=(0,B.forwardRef)((e,t)=>B.createElement(Xe,{chartName:`AreaChart`,defaultTooltipEventType:`axis`,validateTooltipEventTypes:jt,tooltipPayloadSearcher:D,categoricalChartProps:e,ref:t})),W=e(f(),1),G=r(),{RangePicker:Nt}=p,{Text:K,Title:Pt}=g,q=`-`,J={primary:`var(--kd-primary)`,primaryActive:`var(--kd-primary-active)`,success:`var(--kd-success)`,warning:`var(--kd-warning)`,error:`var(--kd-error)`,info:`var(--kd-info)`,text:`var(--kd-text)`,muted:`var(--kd-muted)`},Ft=[J.primary,J.success,J.warning,J.info,J.primaryActive,J.error,J.muted],It=(e,t={})=>{try{return new Intl.NumberFormat(e,t)}catch{return new Intl.NumberFormat(`en-US`,t)}},Lt=It(`en-NP`,{style:`currency`,currency:`NPR`,maximumFractionDigits:0}),Y=It(`en-NP`,{style:`currency`,currency:`NPR`,notation:`compact`,maximumFractionDigits:1}),Rt=It(`en-NP`),X=(e,t)=>e==null||e===``?q:(t?Y:Lt).format(Number(e||0)),zt=e=>e==null||e===``?q:Rt.format(Number(e||0)),Bt=e=>e?(0,W.default)(e).format(`DD MMM YYYY`):q,Z=e=>Number(e||0),Q=e=>{e&&e!==`#`&&y.visit(e)};function Vt(e){if(!e||e.length<6)return null;let t=Math.floor(e.length/2),n=e.slice(0,t),r=e.slice(t),i=n.reduce((e,t)=>e+Z(t.value),0),a=r.reduce((e,t)=>e+Z(t.value),0);return i===0?a>0?100:null:(a-i)/Math.abs(i)*100}function Ht(){let e=C(),{token:n}=S.useToken(),r=b().props.branchContext||{},[i,a]=(0,B.useState)(!0),[s,c]=(0,B.useState)(null),[l,u]=(0,B.useState)({}),[f,p]=(0,B.useState)({branch_id:r.selectedBranchId||`all`,date_from:(0,W.default)().startOf(`month`).format(`YYYY-MM-DD`),date_to:(0,W.default)().format(`YYYY-MM-DD`)}),m=(0,B.useCallback)(async()=>{a(!0),c(null);try{u((await t.get(`/dashboard-data`,{params:{branch_id:f.branch_id===`all`?void 0:f.branch_id,date_from:f.date_from,date_to:f.date_to}})).data||{})}catch(t){c(t?.response?.data?.message||e(`Unable to load dashboard data.`))}finally{a(!1)}},[f,e]);(0,B.useEffect)(()=>{m()},[m]);let h=(0,B.useMemo)(()=>nn(l),[l]);return(0,G.jsxs)(w,{header:(0,G.jsx)(Ut,{branches:l.branches||r.branches||[],filters:f,loading:i,onRefresh:m,onChange:p}),children:[(0,G.jsx)(x,{title:e(`Dashboard`)}),(0,G.jsx)(sn,{token:n}),(0,G.jsx)(`main`,{className:`kd`,children:(0,G.jsxs)(`div`,{className:`kd-wrap`,children:[s&&(0,G.jsx)(o,{showIcon:!0,type:`error`,message:e(`Dashboard could not be loaded`),description:s,action:(0,G.jsx)(d,{onClick:m,children:e(`Retry`)})}),i?(0,G.jsx)(tn,{}):(0,G.jsxs)(G.Fragment,{children:[(0,G.jsx)(`section`,{className:`kd-kpis`,children:h.kpis.map(e=>(0,G.jsx)(Wt,{...e},e.key))}),(0,G.jsxs)(`section`,{className:`kd-row-2`,children:[(0,G.jsx)(Gt,{data:h.chartData}),(0,G.jsx)(Kt,{data:h.expenseBreakdown})]}),(0,G.jsxs)(`section`,{className:`kd-row-3`,children:[(0,G.jsx)(Jt,{data:h.cashflowChart}),(0,G.jsx)(Yt,{data:h.ageingData})]}),h.bizCards.length>0&&(0,G.jsx)(`section`,{className:`kd-biz-grid`,children:h.bizCards.map(e=>(0,G.jsx)(Zt,{card:e},e.key))}),(0,G.jsx)(rn,{approaching:h.approachingProjects,overdue:h.overdueProjects}),(0,G.jsx)(Qt,{transactions:h.transactions}),(0,G.jsxs)(`section`,{className:`kd-bottom`,children:[h.topCustomers.length>0&&(0,G.jsx)($t,{title:`Top Customers`,data:h.topCustomers,color:J.primary}),h.topSuppliers.length>0&&(0,G.jsx)($t,{title:`Top Suppliers`,data:h.topSuppliers,color:J.warning}),h.bankAccounts.length>0&&(0,G.jsx)(en,{accounts:h.bankAccounts})]})]})]})})]})}function Ut({branches:e,filters:t,loading:n,onRefresh:r,onChange:i}){let a=[{value:`all`,label:`All branches`},...(e||[]).map(e=>({value:e.value??e.id,label:e.label??e.name??`Branch #${e.id}`}))];return(0,G.jsxs)(`div`,{className:`kd-hdr`,children:[(0,G.jsxs)(`div`,{children:[(0,G.jsx)(Pt,{level:5,style:{margin:`0 0 1px`,fontWeight:650},children:`Dashboard`}),(0,G.jsx)(K,{type:`secondary`,style:{fontSize:11},children:`Financial overview for the selected period`})]}),(0,G.jsxs)(`div`,{className:`kd-hdr__ctl`,children:[(0,G.jsx)(s,{value:t.branch_id,options:a,style:{width:150},onChange:e=>i(t=>({...t,branch_id:e||`all`}))}),(0,G.jsx)(Nt,{value:t.date_from&&t.date_to?[(0,W.default)(t.date_from),(0,W.default)(t.date_to)]:null,style:{width:230},onChange:e=>i(t=>({...t,date_from:e?.[0]?.format(`YYYY-MM-DD`),date_to:e?.[1]?.format(`YYYY-MM-DD`)}))}),(0,G.jsx)(u,{title:`Refresh`,children:(0,G.jsx)(d,{size:`small`,icon:(0,G.jsx)(_,{spin:n}),onClick:r})})]})]})}function Wt({label:e,value:t,sparkline:n,color:r,trend:i,invertTrend:a,helper:o}){let s=i>0,c=a?s?J.error:J.success:s?J.success:J.error,l=Array.isArray(n)&&n.some(e=>Z(e.value)!==0),u=`kpi-g-${String(e||`metric`).toLowerCase().replace(/[^a-z0-9]+/g,`-`)}`;return(0,G.jsxs)(h,{className:`kd-card kd-kpi`,style:{"--kd-accent":r},styles:{body:{padding:0,height:`100%`,position:`relative`,overflow:`hidden`}},children:[(0,G.jsx)(`div`,{className:`kd-kpi__accent`}),(0,G.jsxs)(`div`,{className:`kd-kpi__content`,children:[(0,G.jsxs)(`div`,{className:`kd-kpi__top`,children:[(0,G.jsx)(K,{type:`secondary`,className:`kd-kpi__label`,children:e}),i!=null&&(0,G.jsxs)(`span`,{className:`kd-kpi__trend`,style:{"--kd-trend":c},children:[s?`+`:`-`,Math.abs(i).toFixed(1),`%`]})]}),(0,G.jsx)(`div`,{className:`kd-kpi__val`,children:X(t)}),o&&(0,G.jsx)(K,{type:`secondary`,className:`kd-kpi__helper`,children:o})]}),l&&(0,G.jsx)(`div`,{className:`kd-kpi__spark`,"aria-hidden":!0,children:(0,G.jsx)(k,{width:`100%`,height:`100%`,children:(0,G.jsxs)(Mt,{data:n,children:[(0,G.jsx)(`defs`,{children:(0,G.jsxs)(`linearGradient`,{id:u,x1:`0`,y1:`0`,x2:`0`,y2:`1`,children:[(0,G.jsx)(`stop`,{offset:`0%`,stopColor:r,stopOpacity:.24}),(0,G.jsx)(`stop`,{offset:`100%`,stopColor:r,stopOpacity:.04})]})}),(0,G.jsx)(At,{type:`monotone`,dataKey:`value`,stroke:r,strokeWidth:1.6,fill:`url(#${u})`,dot:!1,isAnimationActive:!1})]})})})]})}function Gt({data:e}){let t=e.some(e=>Z(e.revenue)||Z(e.expenses)||Z(e.profit));return(0,G.jsxs)(h,{className:`kd-card kd-chart-main`,styles:{body:{padding:8}},children:[(0,G.jsxs)(`div`,{className:`kd-card-hdr`,children:[(0,G.jsx)(`span`,{className:`kd-card-hdr__t`,children:`Financial Performance`}),(0,G.jsx)(K,{type:`secondary`,style:{fontSize:11},children:`Revenue, expenses & net profit trend`})]}),t?(0,G.jsx)(`div`,{style:{height:180},children:(0,G.jsx)(k,{width:`100%`,height:`100%`,children:(0,G.jsxs)(Be,{data:e,margin:{top:4,right:10,bottom:0,left:0},children:[(0,G.jsx)(Ye,{stroke:`var(--kd-grid)`,vertical:!1}),(0,G.jsx)(z,{dataKey:`label`,axisLine:!1,tickLine:!1,tick:{fill:`var(--kd-muted)`,fontSize:9}}),(0,G.jsx)(R,{axisLine:!1,tickLine:!1,tick:{fill:`var(--kd-muted)`,fontSize:9},tickFormatter:e=>Y.format(e),width:58}),(0,G.jsx)(F,{content:(0,G.jsx)(Xt,{})}),(0,G.jsx)(I,{iconType:`circle`,iconSize:7,wrapperStyle:{fontSize:11,paddingTop:4}}),(0,G.jsx)(L,{type:`monotone`,dataKey:`revenue`,name:`Revenue`,stroke:J.primary,strokeWidth:1.8,dot:!1,activeDot:{r:3}}),(0,G.jsx)(L,{type:`monotone`,dataKey:`expenses`,name:`Expenses`,stroke:J.warning,strokeWidth:1.8,dot:!1,activeDot:{r:3}}),(0,G.jsx)(L,{type:`monotone`,dataKey:`profit`,name:`Net Profit`,stroke:J.success,strokeWidth:1.8,dot:!1,activeDot:{r:3}})]})})}):(0,G.jsx)($,{title:`No financial data`,desc:`Revenue and expense activity will appear here.`})]})}function Kt({data:e}){let t=e.reduce((e,t)=>e+Z(t.value),0);return(0,G.jsxs)(h,{className:`kd-card kd-chart-side`,styles:{body:{padding:8}},children:[(0,G.jsxs)(`div`,{className:`kd-card-hdr`,children:[(0,G.jsx)(`span`,{className:`kd-card-hdr__t`,children:`Expense Breakdown`}),(0,G.jsx)(K,{type:`secondary`,style:{fontSize:11},children:`Where your money goes`})]}),e.length>0&&t>0?(0,G.jsx)(`div`,{style:{height:180,display:`flex`,flexDirection:`column`,alignItems:`center`},children:(0,G.jsx)(k,{width:`100%`,height:`100%`,children:(0,G.jsxs)(He,{children:[(0,G.jsx)(Ve,{data:e,dataKey:`value`,nameKey:`name`,cx:`50%`,cy:`45%`,innerRadius:`52%`,outerRadius:`78%`,paddingAngle:2,strokeWidth:0,children:e.map((e,t)=>(0,G.jsx)(Ie,{fill:Ft[t%Ft.length]},t))}),(0,G.jsx)(F,{content:(0,G.jsx)(qt,{total:t})}),(0,G.jsx)(I,{iconType:`circle`,iconSize:7,wrapperStyle:{fontSize:10,lineHeight:`16px`},formatter:e=>(0,G.jsx)(`span`,{style:{color:`var(--kd-text)`,fontSize:10},children:e})})]})})}):(0,G.jsx)($,{title:`No expense data`,desc:`Expense categories will appear here.`,compact:!0})]})}function qt({active:e,payload:t,total:n}){if(!e||!t?.length)return null;let r=t[0],i=n>0?(Z(r.value)/n*100).toFixed(1):0;return(0,G.jsxs)(`div`,{className:`kd-tip`,children:[(0,G.jsx)(K,{strong:!0,children:r.name}),(0,G.jsxs)(`div`,{className:`kd-tip__row`,children:[(0,G.jsx)(`span`,{style:{background:r.payload?.fill}}),(0,G.jsx)(K,{type:`secondary`,children:`Amount`}),(0,G.jsx)(K,{children:X(r.value)})]}),(0,G.jsxs)(`div`,{className:`kd-tip__row`,children:[(0,G.jsx)(`span`,{style:{background:`var(--kd-border)`}}),(0,G.jsx)(K,{type:`secondary`,children:`Share`}),(0,G.jsxs)(K,{children:[i,`%`]})]})]})}function Jt({data:e}){let t=e.some(e=>Z(e.cash_in)||Z(e.cash_out));return(0,G.jsxs)(h,{className:`kd-card kd-chart-main`,styles:{body:{padding:8}},children:[(0,G.jsxs)(`div`,{className:`kd-card-hdr`,children:[(0,G.jsx)(`span`,{className:`kd-card-hdr__t`,children:`Cash Flow`}),(0,G.jsx)(K,{type:`secondary`,style:{fontSize:11},children:`Daily cash inflows and outflows`})]}),t?(0,G.jsx)(`div`,{style:{height:170},children:(0,G.jsx)(k,{width:`100%`,height:`100%`,children:(0,G.jsxs)(Be,{data:e,margin:{top:4,right:10,bottom:0,left:0},children:[(0,G.jsx)(Ye,{stroke:`var(--kd-grid)`,vertical:!1}),(0,G.jsx)(z,{dataKey:`label`,axisLine:!1,tickLine:!1,tick:{fill:`var(--kd-muted)`,fontSize:9}}),(0,G.jsx)(R,{axisLine:!1,tickLine:!1,tick:{fill:`var(--kd-muted)`,fontSize:9},tickFormatter:e=>Y.format(e),width:58}),(0,G.jsx)(F,{content:(0,G.jsx)(Xt,{})}),(0,G.jsx)(I,{iconType:`circle`,iconSize:7,wrapperStyle:{fontSize:11,paddingTop:4}}),(0,G.jsx)(L,{type:`monotone`,dataKey:`cash_in`,name:`Cash In`,stroke:J.info,strokeWidth:1.8,dot:!1,activeDot:{r:3}}),(0,G.jsx)(L,{type:`monotone`,dataKey:`cash_out`,name:`Cash Out`,stroke:J.error,strokeWidth:1.8,dot:!1,activeDot:{r:3}}),(0,G.jsx)(L,{type:`monotone`,dataKey:`net`,name:`Net`,stroke:J.primaryActive,strokeWidth:1.8,strokeDasharray:`6 3`,dot:!1,activeDot:{r:3}})]})})}):(0,G.jsx)($,{title:`No cash flow data`,desc:`Cash inflows and outflows will appear here.`})]})}function Yt({data:e}){let t=e.some(e=>Z(e.receivables)>0||Z(e.payables)>0);return(0,G.jsxs)(h,{className:`kd-card kd-chart-side`,styles:{body:{padding:8}},children:[(0,G.jsxs)(`div`,{className:`kd-card-hdr`,children:[(0,G.jsx)(`span`,{className:`kd-card-hdr__t`,children:`Receivables vs Payables Ageing`}),(0,G.jsx)(K,{type:`secondary`,style:{fontSize:11},children:`Outstanding amounts by age`})]}),t?(0,G.jsx)(`div`,{style:{height:170},children:(0,G.jsx)(k,{width:`100%`,height:`100%`,children:(0,G.jsxs)(Ke,{data:e,margin:{top:4,right:6,bottom:0,left:0},children:[(0,G.jsx)(Ye,{stroke:`var(--kd-grid)`,vertical:!1}),(0,G.jsx)(z,{dataKey:`bucket`,axisLine:!1,tickLine:!1,tick:{fill:`var(--kd-muted)`,fontSize:9}}),(0,G.jsx)(R,{axisLine:!1,tickLine:!1,tick:{fill:`var(--kd-muted)`,fontSize:9},tickFormatter:e=>Y.format(e),width:52}),(0,G.jsx)(F,{content:(0,G.jsx)(Xt,{})}),(0,G.jsx)(I,{iconType:`circle`,iconSize:7,wrapperStyle:{fontSize:10,paddingTop:4}}),(0,G.jsx)(We,{dataKey:`receivables`,name:`Receivables`,fill:J.info,radius:[4,4,0,0],maxBarSize:22}),(0,G.jsx)(We,{dataKey:`payables`,name:`Payables`,fill:J.warning,radius:[4,4,0,0],maxBarSize:22})]})})}):(0,G.jsx)($,{title:`No ageing data`,desc:`Receivable and payable ageing will appear here.`,compact:!0})]})}function Xt({active:e,payload:t,label:n}){return!e||!t?.length?null:(0,G.jsxs)(`div`,{className:`kd-tip`,children:[(0,G.jsx)(K,{strong:!0,style:{fontSize:11},children:n}),t.map(e=>(0,G.jsxs)(`div`,{className:`kd-tip__row`,children:[(0,G.jsx)(`span`,{style:{background:e.color||e.fill}}),(0,G.jsx)(K,{type:`secondary`,children:e.name}),(0,G.jsx)(K,{children:X(e.value)})]},e.dataKey))]})}function Zt({card:e}){return(0,G.jsxs)(h,{className:`kd-card kd-biz`,styles:{body:{padding:8}},children:[(0,G.jsxs)(`div`,{className:`kd-biz__head`,children:[(0,G.jsx)(K,{strong:!0,style:{fontSize:12,fontWeight:650},children:e.title}),e.href&&(0,G.jsx)(d,{type:`link`,size:`small`,style:{padding:0,fontSize:11,fontWeight:600},onClick:()=>Q(e.href),children:e.linkText||`View`})]}),(0,G.jsx)(`div`,{className:`kd-biz__rows`,children:e.items.map(e=>(0,G.jsxs)(`div`,{className:`kd-biz__row`,children:[(0,G.jsx)(K,{type:`secondary`,style:{fontSize:11},children:e.label}),(0,G.jsx)(K,{strong:!0,style:{fontSize:11},children:e.format===`money`?X(e.value,!0):e.format===`text`?e.value||q:zt(e.value)})]},e.label))})]})}function Qt({transactions:e}){let t=[{title:`Date`,dataIndex:`date`,render:Bt,width:110},{title:`Type`,dataIndex:`type`,width:140},{title:`Number`,dataIndex:`number`,render:(e,t)=>t.action_url?(0,G.jsx)(d,{type:`link`,style:{padding:0,fontWeight:600},onClick:e=>{e.stopPropagation(),Q(t.action_url)},children:e||q}):e||q},{title:`Party`,dataIndex:`party`,ellipsis:!0,render:e=>e||q},{title:`Amount`,dataIndex:`amount`,align:`right`,render:e=>X(e)},{title:`Status`,dataIndex:`status`,width:100,render:e=>(0,G.jsx)(`span`,{className:`kd-pill`,children:e||`posted`})}];return(0,G.jsxs)(h,{className:`kd-card`,styles:{body:{padding:e.length?0:8}},children:[(0,G.jsxs)(`div`,{className:`kd-card-hdr`,style:{padding:e.length?`8px`:0,borderBottom:e.length?`1px solid var(--kd-grid)`:`none`},children:[(0,G.jsx)(`span`,{className:`kd-card-hdr__t`,children:`Recent Transactions`}),(0,G.jsx)(K,{type:`secondary`,style:{fontSize:11},children:`Latest financial documents`})]}),e.length>0?(0,G.jsx)(a,{rowKey:`key`,columns:t,dataSource:e,pagination:!1,size:`small`,scroll:{x:700},onRow:e=>({onClick:()=>Q(e.action_url),className:e.action_url?`kd-row--click`:``})}):(0,G.jsx)($,{title:`No recent transactions`,desc:`Posted documents will appear here.`,compact:!0})]})}function $t({title:e,data:t,color:n}){let r=t.slice(0,5).map(e=>({...e,name:on(e.name,18)}));return(0,G.jsxs)(h,{className:`kd-card`,styles:{body:{padding:8}},children:[(0,G.jsx)(`div`,{className:`kd-card-hdr`,style:{marginBottom:10},children:(0,G.jsx)(`span`,{className:`kd-card-hdr__t`,children:e})}),(0,G.jsx)(`div`,{style:{height:120},children:(0,G.jsx)(k,{width:`100%`,height:`100%`,children:(0,G.jsxs)(Ke,{data:r,layout:`vertical`,margin:{top:0,right:16,bottom:0,left:4},children:[(0,G.jsx)(z,{type:`number`,axisLine:!1,tickLine:!1,tick:{fill:`var(--kd-muted)`,fontSize:9},tickFormatter:e=>Y.format(e)}),(0,G.jsx)(R,{type:`category`,dataKey:`name`,axisLine:!1,tickLine:!1,width:96,tick:{fill:`var(--kd-text)`,fontSize:10}}),(0,G.jsx)(F,{content:(0,G.jsx)(Xt,{})}),(0,G.jsx)(We,{dataKey:`amount`,name:`Amount`,fill:n,radius:[0,4,4,0],maxBarSize:16})]})})})]})}function en({accounts:e}){return(0,G.jsxs)(h,{className:`kd-card`,styles:{body:{padding:8}},children:[(0,G.jsx)(`div`,{className:`kd-card-hdr`,style:{marginBottom:10},children:(0,G.jsx)(`span`,{className:`kd-card-hdr__t`,children:`Bank Accounts`})}),(0,G.jsx)(`div`,{className:`kd-bank-list`,children:e.map(e=>(0,G.jsxs)(`div`,{className:`kd-bank-row`,children:[(0,G.jsxs)(`div`,{style:{minWidth:0},children:[(0,G.jsx)(K,{style:{fontWeight:600,fontSize:13},ellipsis:!0,children:e.bank_name||q}),(0,G.jsx)(K,{type:`secondary`,style:{fontSize:11,display:`block`},ellipsis:!0,children:[e.account_name,e.account_number].filter(Boolean).join(` / `)||q})]}),(0,G.jsxs)(`div`,{style:{textAlign:`right`,whiteSpace:`nowrap`},children:[(0,G.jsx)(K,{style:{fontWeight:650,fontSize:13},children:X(e.balance)}),e.currency&&(0,G.jsx)(K,{type:`secondary`,style:{display:`block`,fontSize:11},children:e.currency})]})]},e.key))})]})}function $({title:e,desc:t,compact:n}){return(0,G.jsx)(`div`,{style:{minHeight:n?105:170,display:`flex`,alignItems:`center`,justifyContent:`center`,textAlign:`center`,padding:10},children:(0,G.jsxs)(l,{image:l.PRESENTED_IMAGE_SIMPLE,description:!1,children:[(0,G.jsx)(Pt,{level:5,style:{margin:`0 0 4px`},children:e}),(0,G.jsx)(K,{type:`secondary`,style:{fontSize:11},children:t})]})})}function tn(){return(0,G.jsxs)(`div`,{style:{display:`flex`,flexDirection:`column`,gap:8},children:[(0,G.jsx)(`div`,{className:`kd-kpis`,children:[1,2,3,4,5,6].map(e=>(0,G.jsx)(h,{className:`kd-card`,styles:{body:{padding:8}},children:(0,G.jsx)(c,{active:!0,paragraph:{rows:2}})},e))}),(0,G.jsxs)(`div`,{className:`kd-row-2`,children:[(0,G.jsx)(h,{className:`kd-card`,children:(0,G.jsx)(c,{active:!0,paragraph:{rows:8}})}),(0,G.jsx)(h,{className:`kd-card`,children:(0,G.jsx)(c,{active:!0,paragraph:{rows:8}})})]}),(0,G.jsx)(h,{className:`kd-card`,children:(0,G.jsx)(c,{active:!0,paragraph:{rows:5}})})]})}function nn(e){let t=e.financial_summary||{},n=e.metric_sparklines||{},r=e.revenue_expense_profit_chart||[],i=e.cashflow_chart||[],a=r.map(e=>({date:e.date,label:e.date?(0,W.default)(e.date).format(`DD MMM`):``,revenue:Z(e.revenue),expenses:Z(e.expenses),profit:Z(e.profit)})),o=i.map(e=>({date:e.date,label:e.date?(0,W.default)(e.date).format(`DD MMM`):``,cash_in:Z(e.cash_in),cash_out:Z(e.cash_out),net:Z(e.net)})),s=r.map(e=>({date:e.date,value:Z(e.revenue)})),c=r.map(e=>({date:e.date,value:Z(e.expenses)})),l=(n.net_profit||[]).map(e=>({date:e.date,value:Z(e.value)})),u=(n.cash_bank||[]).map(e=>({date:e.date,value:Z(e.value)})),d=(n.receivables||[]).map(e=>({date:e.date,value:Z(e.value)})),f=(n.payables||[]).map(e=>({date:e.date,value:Z(e.value)})),p=[{key:`revenue`,label:`Revenue`,value:t.revenue,sparkline:s,color:J.primary,trend:Vt(s),helper:`This period`},{key:`expenses`,label:`Expenses`,value:t.expenses,sparkline:c,color:J.warning,trend:Vt(c),invertTrend:!0,helper:`This period`},{key:`profit`,label:`Net Profit`,value:t.net_profit,sparkline:l,color:J.success,trend:Vt(l)},{key:`cash`,label:`Cash & Bank`,value:t.cash_bank_balance,sparkline:u,color:J.info,trend:Vt(u),helper:`Available`},{key:`receivables`,label:`Receivables`,value:t.receivables,sparkline:d,color:J.info,helper:`Outstanding`},{key:`payables`,label:`Payables`,value:t.payables,sparkline:f,color:J.error,helper:`Outstanding`}],m=e.expense_breakdown||[],h=an(e.receivable_ageing,e.payable_ageing),g=e.cash_position||{},_=Array.isArray(g.bank_accounts)?g.bank_accounts:[],v=Array.isArray(e.recent_transactions)?e.recent_transactions:[],y=Array.isArray(e.top_customers)?e.top_customers:[],b=Array.isArray(e.top_suppliers)?e.top_suppliers:[],x=[],S=e.sales_summary;S&&x.push({key:`sales`,title:`Sales`,href:`/payment-in/invoices`,linkText:`View invoices`,items:[{label:`Total sales`,value:S.sales_total,format:`money`},{label:`Invoices`,value:S.invoice_count},{label:`Paid`,value:S.paid_amount,format:`money`},{label:`Unpaid`,value:S.unpaid_amount,format:`money`},{label:`Overdue`,value:S.overdue_amount,format:`money`}]});let C=e.purchase_summary;C&&x.push({key:`purchase`,title:`Purchases`,href:`/payment-out/purchase-bills`,linkText:`View bills`,items:[{label:`Total purchases`,value:C.purchase_total,format:`money`},{label:`Bills`,value:C.bill_count},{label:`Paid`,value:C.paid_amount,format:`money`},{label:`Unpaid bills`,value:C.unpaid_amount,format:`money`},{label:`Expense payables`,value:C.expense_payables,format:`money`},{label:`Total payables`,value:C.total_payables??C.unpaid_amount,format:`money`},{label:`Upcoming`,value:C.upcoming_payables,format:`money`}]});let w=e.cashflow_summary;if(w){let e=[{label:`Cash in`,value:w.cash_in,format:`money`},{label:`Cash out`,value:w.cash_out,format:`money`},{label:`Net cash flow`,value:w.net_cash_flow,format:`money`}];w.biggest_inflow&&e.push({label:`Top inflow`,value:w.biggest_inflow,format:`text`}),w.biggest_outflow&&e.push({label:`Top outflow`,value:w.biggest_outflow,format:`text`}),x.push({key:`cashflow`,title:`Cash Flow`,items:e})}let T=e.inventory_summary;T&&x.push({key:`inventory`,title:`Inventory`,href:`/inventory/products`,linkText:`View`,items:[{label:`Products`,value:T.total_products},{label:`Low stock`,value:T.low_stock_items},{label:`Value`,value:T.inventory_value,format:`money`},{label:`Warehouses`,value:T.warehouse_count}]});let E=e.crm_summary;E&&x.push({key:`crm`,title:`CRM`,href:`/crm`,linkText:`View`,items:[{label:`Open leads`,value:E.open_leads},{label:`Open deals`,value:E.open_deals},{label:`Pipeline`,value:E.pipeline_value,format:`money`},{label:`Won`,value:E.won_value,format:`money`}]});let D=e.hrm_summary;if(D){let e=[{label:`Employees`,value:D.active_employees}];D.on_leave_today>0&&e.push({label:`On leave`,value:D.on_leave_today}),D.attendance_today>0&&e.push({label:`Attendance`,value:D.attendance_today}),D.payroll_this_period>0&&e.push({label:`Payroll`,value:D.payroll_this_period,format:`money`}),x.push({key:`hrm`,title:`HRM`,href:`/hrm/users`,linkText:`View`,items:e})}let O=e.project_summary;if(O){let e=[{label:`Active`,value:O.active_projects},{label:`Completed`,value:O.completed_this_period}];O.overdue_tasks>0&&e.push({label:`Overdue tasks`,value:O.overdue_tasks}),O.billing_value>0&&e.push({label:`Billing`,value:O.billing_value,format:`money`}),x.push({key:`projects`,title:`Projects`,href:`/hrm/projects`,linkText:`View`,items:e})}return{kpis:p,chartData:a,cashflowChart:o,expenseBreakdown:m,ageingData:h,bizCards:x,transactions:v,topCustomers:y,topSuppliers:b,bankAccounts:_,approachingProjects:Array.isArray(e.approaching_deadline_projects)?e.approaching_deadline_projects:[],overdueProjects:Array.isArray(e.overdue_projects)?e.overdue_projects:[]}}function rn({approaching:e,overdue:t}){let n=e=>[{title:`Project`,dataIndex:`name`,render:(e,t)=>(0,G.jsx)(d,{type:`link`,style:{padding:0,fontWeight:600},onClick:()=>Q(t.action_url),children:e||q})},{title:`Manager`,dataIndex:`manager`,ellipsis:!0,render:e=>e||q},{title:`End Date`,dataIndex:`end_date`,width:120,render:Bt},{title:e===`overdue`?`Overdue`:`Time Left`,width:115,render:(t,n)=>e===`overdue`?`${n.days_overdue||0} day${Number(n.days_overdue)===1?``:`s`}`:`${n.days_left||0} day${Number(n.days_left)===1?``:`s`}`},{title:`Status`,dataIndex:`status`,width:120,render:e=>(0,G.jsx)(v,{children:String(e||q).replace(/_/g,` `)})}],r=(e,t)=>e.length?(0,G.jsx)(a,{size:`small`,rowKey:`id`,pagination:!1,dataSource:e,columns:n(t),scroll:{x:650}}):(0,G.jsx)($,{title:`No projects`,desc:`Project deadlines that need attention will appear here.`,compact:!0});return(0,G.jsxs)(h,{className:`kd-card`,styles:{body:{padding:8}},children:[(0,G.jsxs)(`div`,{className:`kd-card-hdr`,children:[(0,G.jsx)(`span`,{className:`kd-card-hdr__t`,children:`Project Deadlines`}),(0,G.jsx)(K,{type:`secondary`,style:{fontSize:11},children:`Approaching and overdue internal project dates`})]}),(0,G.jsx)(m,{size:`small`,items:[{key:`approaching`,label:`Approaching Deadline (${e.length})`,children:r(e,`approaching`)},{key:`overdue`,label:`Overdue (${t.length})`,children:r(t,`overdue`)}]})]})}function an(e=[],t=[]){let n=new Map,r=[];return(e||[]).forEach(e=>{n.set(e.bucket,{bucket:e.bucket,receivables:Z(e.amount),payables:0}),r.push(e.bucket)}),(t||[]).forEach(e=>{let t=n.get(e.bucket);t?t.payables=Z(e.amount):(n.set(e.bucket,{bucket:e.bucket,receivables:0,payables:Z(e.amount)}),r.push(e.bucket))}),r.filter((e,t,n)=>n.indexOf(e)===t).map(e=>n.get(e))}function on(e,t){return e?e.length>t?e.slice(0,t-3)+`...`:e:q}function sn({token:e}){return(0,G.jsx)(`style`,{children:`
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
        `})}export{Ht as default};