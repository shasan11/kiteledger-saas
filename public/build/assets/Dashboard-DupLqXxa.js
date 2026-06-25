import{i as e}from"./chunk-62oNxeRG.js";import{i as t}from"./axios-CFfZBleg.js";import{r as n,t as r}from"./jsx-runtime-gigNY91P.js";import{Pt as i}from"./useSize-hzOUpMP_.js";import{t as a}from"./table-C0OVvqWD.js";import{t as o}from"./alert-CWS2pmeX.js";import{t as s}from"./select-CLz_Fzoi.js";import{t as c}from"./skeleton-cooCG3hX.js";import{t as l}from"./empty-CUdvJnZZ.js";import{t as u}from"./tooltip-CxcFxHZw.js";import{t as d}from"./button-B5dvIdG1.js";import{t as f}from"./dayjs.min-BjRok8LT.js";import{t as p}from"./date-picker-Cl7Mb_Gd.js";import{t as m}from"./tabs-Dynodvw3.js";import{t as h}from"./card-FobL5y2W.js";import{t as g}from"./typography-ofUTwIJF.js";import{t as _}from"./ReloadOutlined-D48CCI3o.js";import{t as v}from"./tag-BtLgFRxP.js";import{i as y,o as b,t as x}from"./index.esm-BVo_jOMH.js";import{c as S,r as C}from"./app-Bbh_1VUn.js";import{t as w}from"./AuthenticatedLayout-CJl9mEFa.js";import{An as T,Bn as E,C as D,Cn as O,E as ee,F as te,Gt as ne,In as k,Kt as re,M as A,N as ie,Nn as ae,O as oe,On as j,Ot as se,P as ce,Qt as le,Rn as ue,Ut as de,Wt as fe,Xt as pe,Yt as me,_ as he,b as ge,bt as _e,d as ve,dn as ye,dt as be,f as xe,fn as Se,ft as Ce,gn as M,jn as N,jt as we,k as Te,kn as Ee,l as P,m as De,mn as Oe,mt as ke,nn as Ae,pn as je,rt as Me,sn as Ne,t as Pe,tn as F,u as Fe,un as Ie,v as Le,x as Re,xn as ze,yn as I,zt as Be}from"./CartesianChart-BPWNZv1q.js";import{t as L}from"./Legend-BjrBccXG.js";import{i as Ve,n as He,p as Ue,r as We,t as Ge}from"./BarChart-D51jKHA3.js";import{a as Ke,i as qe,n as R,r as Je,t as Ye}from"./LineChart-BoZvon2J.js";import{i as Xe,t as Ze}from"./PieChart-BruuCNg5.js";var Qe=(e,t,n)=>Me(e,`xAxis`,We(e,t),n),$e=(e,t,n)=>Ce(e,`xAxis`,We(e,t),n),et=(e,t,n)=>Me(e,`yAxis`,Ve(e,t),n),tt=(e,t,n)=>Ce(e,`yAxis`,Ve(e,t),n),nt=I([me,Qe,et,$e,tt],(e,t,n,r,i)=>Oe(e,`xAxis`)?Ne(t,r,!1):Ne(n,i,!1)),rt=I([ke,(e,t)=>t],(e,t)=>e.filter(e=>e.type===`area`).find(e=>e.id===t)),it=e=>Oe(me(e),`xAxis`)?`yAxis`:`xAxis`,at=(e,t)=>it(e)===`yAxis`?Ve(e,t):We(e,t),ot=I([me,Qe,et,$e,tt,I([rt,(e,t,n)=>be(e,it(e),at(e,t),n)],(e,t)=>{if(!(e==null||t==null)){var{stackId:n}=e,r=_e(e);if(!(n==null||r==null)){var i=(t[n]?.stackedData)?.find(e=>e.key===r);if(i!=null)return i.map(e=>[e[0],e[1]])}}}),Be,nt,rt,we],(e,t,n,r,i,a,o,s,c,l)=>{var{chartData:u,dataStartIndex:d,dataEndIndex:f}=o;if(!(c==null||e!==`horizontal`&&e!==`vertical`||t==null||n==null||r==null||i==null||r.length===0||i.length===0||s==null)){var{data:p}=c,m=p&&p.length>0?p:u?.slice(d,f+1);if(m!=null)return At({layout:e,xAxis:t,yAxis:n,xAxisTicks:r,yAxisTicks:i,dataStartIndex:d,areaSettings:c,stackedData:a,displayedData:m,chartBaseValue:l,bandSize:s})}}),z=e(n()),st=[`id`],ct=[`activeDot`,`animationBegin`,`animationDuration`,`animationEasing`,`connectNulls`,`dot`,`fill`,`fillOpacity`,`hide`,`isAnimationActive`,`legendType`,`stroke`,`xAxisId`,`yAxisId`];function B(){return B=Object.assign?Object.assign.bind():function(e){for(var t=1;t<arguments.length;t++){var n=arguments[t];for(var r in n)({}).hasOwnProperty.call(n,r)&&(e[r]=n[r])}return e},B.apply(null,arguments)}function lt(e,t){if(e==null)return{};var n,r,i=ut(e,t);if(Object.getOwnPropertySymbols){var a=Object.getOwnPropertySymbols(e);for(r=0;r<a.length;r++)n=a[r],t.indexOf(n)===-1&&{}.propertyIsEnumerable.call(e,n)&&(i[n]=e[n])}return i}function ut(e,t){if(e==null)return{};var n={};for(var r in e)if({}.hasOwnProperty.call(e,r)){if(t.indexOf(r)!==-1)continue;n[r]=e[r]}return n}function dt(e,t){var n=Object.keys(e);if(Object.getOwnPropertySymbols){var r=Object.getOwnPropertySymbols(e);t&&(r=r.filter(function(t){return Object.getOwnPropertyDescriptor(e,t).enumerable})),n.push.apply(n,r)}return n}function V(e){for(var t=1;t<arguments.length;t++){var n=arguments[t]==null?{}:arguments[t];t%2?dt(Object(n),!0).forEach(function(t){ft(e,t,n[t])}):Object.getOwnPropertyDescriptors?Object.defineProperties(e,Object.getOwnPropertyDescriptors(n)):dt(Object(n)).forEach(function(t){Object.defineProperty(e,t,Object.getOwnPropertyDescriptor(n,t))})}return e}function ft(e,t,n){return(t=pt(t))in e?Object.defineProperty(e,t,{value:n,enumerable:!0,configurable:!0,writable:!0}):e[t]=n,e}function pt(e){var t=mt(e,`string`);return typeof t==`symbol`?t:t+``}function mt(e,t){if(typeof e!=`object`||!e)return e;var n=e[Symbol.toPrimitive];if(n!==void 0){var r=n.call(e,t||`default`);if(typeof r!=`object`)return r;throw TypeError(`@@toPrimitive must return a primitive value.`)}return(t===`string`?String:Number)(e)}function ht(e,t){return e&&e!==`none`?e:t}var gt=e=>{var{dataKey:t,name:n,stroke:r,fill:i,legendType:a,hide:o}=e;return[{inactive:o,dataKey:t,type:a,color:ht(r,i),value:Se(n,t),payload:e}]},_t=z.memo(e=>{var{dataKey:t,data:n,stroke:r,strokeWidth:i,fill:a,name:o,hide:s,unit:c,tooltipType:l,id:u}=e,d={dataDefinedOnItem:n,getPosition:ae,settings:{stroke:r,strokeWidth:i,fill:a,dataKey:t,nameKey:void 0,name:Se(o,t),hide:s,type:l,color:ht(r,a),unit:c,graphicalItemId:u}};return z.createElement(D,{tooltipEntrySettings:d})});function vt(e){var{clipPathId:t,points:n,props:r}=e,{needClip:i,dot:a,dataKey:o}=r,s=E(r);return z.createElement(Ke,{points:n,dot:a,className:`recharts-area-dots`,dotClassName:`recharts-area-dot`,dataKey:o,baseProps:s,needClip:i,clipPathId:t})}function yt(e){var{showLabels:t,children:n,points:r}=e,i=r.map(e=>{var t={x:e.x??0,y:e.y??0,width:0,lowerWidth:0,upperWidth:0,height:0};return V(V({},t),{},{value:e.value,payload:e.payload,parentViewBox:void 0,viewBox:t,fill:void 0})});return z.createElement(oe,{value:t?i:void 0},n)}function bt(e){var{points:t,baseLine:n,needClip:r,clipPathId:i,props:a}=e,{layout:o,type:s,stroke:c,connectNulls:l,isRange:u}=a,{id:d}=a,f=lt(a,st),p=E(f),m=ue(f);return z.createElement(z.Fragment,null,t?.length>1&&z.createElement(k,{clipPath:r?`url(#clipPath-${i})`:void 0},z.createElement(ne,B({},m,{id:d,points:t,connectNulls:l,type:s,baseLine:n,layout:o,stroke:`none`,className:`recharts-area-area`})),c!==`none`&&z.createElement(ne,B({},p,{className:`recharts-area-curve`,layout:o,type:s,connectNulls:l,fill:`none`,points:t})),c!==`none`&&u&&Array.isArray(n)&&z.createElement(ne,B({},p,{className:`recharts-area-curve`,layout:o,type:s,connectNulls:l,fill:`none`,points:n}))),z.createElement(vt,{points:t,props:f,clipPathId:i}))}function xt(e){var{alpha:t,baseLine:n,points:r,strokeWidth:i}=e,a=r[0]?.y,o=r[r.length-1]?.y;if(!M(a)||!M(o))return null;var s=t*Math.abs(a-o),c=Math.max(...r.map(e=>e.x||0));return N(n)?c=Math.max(n,c):n&&Array.isArray(n)&&n.length&&(c=Math.max(...n.map(e=>e.x||0),c)),N(c)?z.createElement(`rect`,{x:0,y:a<o?a:a-s,width:c+(i?parseInt(`${i}`,10):1),height:Math.floor(s)}):null}function St(e){var{alpha:t,baseLine:n,points:r,strokeWidth:i}=e,a=r[0]?.x,o=r[r.length-1]?.x;if(!M(a)||!M(o))return null;var s=t*Math.abs(a-o),c=Math.max(...r.map(e=>e.y||0));return N(n)?c=Math.max(n,c):n&&Array.isArray(n)&&n.length&&(c=Math.max(...n.map(e=>e.y||0),c)),N(c)?z.createElement(`rect`,{x:a<o?a:a-s,y:0,width:s,height:Math.floor(c+(i?parseInt(`${i}`,10):1))}):null}function Ct(e){var{alpha:t,layout:n,points:r,baseLine:i,strokeWidth:a}=e;return n===`vertical`?z.createElement(xt,{alpha:t,points:r,baseLine:i,strokeWidth:a}):z.createElement(St,{alpha:t,points:r,baseLine:i,strokeWidth:a})}function wt(e){var{needClip:t,clipPathId:n,props:r,previousPointsRef:i,previousBaselineRef:a}=e,{points:o,baseLine:s,isAnimationActive:c,animationBegin:l,animationDuration:u,animationEasing:d,onAnimationStart:f,onAnimationEnd:p}=r,m=de((0,z.useMemo)(()=>({points:o,baseLine:s}),[o,s]),`recharts-area-`),h=pe(),[g,_]=(0,z.useState)(!1),v=!g,y=(0,z.useCallback)(()=>{typeof p==`function`&&p(),_(!1)},[p]),b=(0,z.useCallback)(()=>{typeof f==`function`&&f(),_(!0)},[f]);if(h==null)return null;var x=i.current,S=a.current;return z.createElement(yt,{showLabels:v,points:o},r.children,z.createElement(fe,{animationId:m,begin:l,duration:u,isActive:c,easing:d,onAnimationEnd:y,onAnimationStart:b,key:m},e=>{if(x){var l=x.length/o.length,u=e===1?o:o.map((t,n)=>{var r=Math.floor(n*l);if(x[r]){var i=x[r];return V(V({},t),{},{x:j(i.x,t.x,e),y:j(i.y,t.y,e)})}return t}),d=N(s)?j(S,s,e):T(s)||Ee(s)?j(S,0,e):s.map((t,n)=>{var r=Math.floor(n*l);if(Array.isArray(S)&&S[r]){var i=S[r];return V(V({},t),{},{x:j(i.x,t.x,e),y:j(i.y,t.y,e)})}return t});return e>0&&(i.current=u,a.current=d),z.createElement(bt,{points:u,baseLine:d,needClip:t,clipPathId:n,props:r})}return e>0&&(i.current=o,a.current=s),z.createElement(k,null,c&&z.createElement(`defs`,null,z.createElement(`clipPath`,{id:`animationClipPath-${n}`},z.createElement(Ct,{alpha:e,points:o,baseLine:s,layout:h,strokeWidth:r.strokeWidth}))),z.createElement(k,{clipPath:`url(#animationClipPath-${n})`},z.createElement(bt,{points:o,baseLine:s,needClip:t,clipPathId:n,props:r})))}),z.createElement(Te,{label:r.label}))}function Tt(e){var{needClip:t,clipPathId:n,props:r}=e,i=(0,z.useRef)(null),a=(0,z.useRef)();return z.createElement(wt,{needClip:t,clipPathId:n,props:r,previousPointsRef:i,previousBaselineRef:a})}var Et=class extends z.PureComponent{render(){var{hide:e,dot:t,points:n,className:r,top:a,left:o,needClip:s,xAxisId:c,yAxisId:l,width:u,height:d,id:f,baseLine:p,zIndex:m}=this.props;if(e)return null;var h=i(`recharts-area`,r),g=f,{r:_,strokeWidth:v}=Je(t),y=ee(t),b=_*2+v,x=s?`url(#clipPath-${y?``:`dots-`}${g})`:void 0;return z.createElement(ce,{zIndex:m},z.createElement(k,{className:h},s&&z.createElement(`defs`,null,z.createElement(ve,{clipPathId:g,xAxisId:c,yAxisId:l}),!y&&z.createElement(`clipPath`,{id:`clipPath-dots-${g}`},z.createElement(`rect`,{x:o-b/2,y:a-b/2,width:u+b,height:d+b}))),z.createElement(Tt,{needClip:s,clipPathId:g,props:this.props})),z.createElement(qe,{points:n,mainColor:ht(this.props.stroke,this.props.fill),itemDataKey:this.props.dataKey,activeDot:this.props.activeDot,clipPath:x}),this.props.isRange&&Array.isArray(p)&&z.createElement(qe,{points:p,mainColor:ht(this.props.stroke,this.props.fill),itemDataKey:this.props.dataKey,activeDot:this.props.activeDot,clipPath:x}))}},Dt={activeDot:!0,animationBegin:0,animationDuration:1500,animationEasing:`ease`,connectNulls:!1,dot:!1,fill:`#3182bd`,fillOpacity:.6,hide:!1,isAnimationActive:`auto`,legendType:`line`,stroke:`#3182bd`,strokeWidth:1,type:`linear`,label:!1,xAxisId:0,yAxisId:0,zIndex:se.area};function Ot(e){var{activeDot:t,animationBegin:n,animationDuration:r,animationEasing:i,connectNulls:a,dot:o,fill:s,fillOpacity:c,hide:l,isAnimationActive:u,legendType:d,stroke:f,xAxisId:p,yAxisId:m}=e,h=lt(e,ct),g=le(),_=te(),{needClip:v}=xe(p,m),y=Ae(),{points:b,isRange:x,baseLine:S}=ze(t=>ot(t,e.id,y))??{},C=he();if(g!==`horizontal`&&g!==`vertical`||C==null||_!==`AreaChart`&&_!==`ComposedChart`)return null;var{height:w,width:T,x:E,y:D}=C;return!b||!b.length?null:z.createElement(Et,B({},h,{activeDot:t,animationBegin:n,animationDuration:r,animationEasing:i,baseLine:S,connectNulls:a,dot:o,fill:s,fillOpacity:c,height:w,hide:l,layout:g,isAnimationActive:u,isRange:x,legendType:d,needClip:v,points:b,stroke:f,width:T,left:E,top:D,xAxisId:p,yAxisId:m}))}var kt=(e,t,n,r,i)=>{var a=n??t;if(N(a))return a;var o=e===`horizontal`?i:r,s=o.scale.domain();if(o.type===`number`){var c=Math.max(s[0],s[1]),l=Math.min(s[0],s[1]);return a===`dataMin`?l:a===`dataMax`||c<0?c:Math.max(Math.min(s[0],s[1]),0)}return a===`dataMin`?s[0]:a===`dataMax`?s[1]:s[0]};function At(e){var{areaSettings:{connectNulls:t,baseValue:n,dataKey:r},stackedData:i,layout:a,chartBaseValue:o,xAxis:s,yAxis:c,displayedData:l,dataStartIndex:u,xAxisTicks:d,yAxisTicks:f,bandSize:p}=e,m=i&&i.length,h=kt(a,o,n,s,c),g=a===`horizontal`,_=!1,v=l.map((e,n)=>{var a;if(m)a=i[u+n];else{var o=je(e,r);Array.isArray(o)?(a=o,_=!0):a=[h,o]}var l=a?.[1]??null,v=l==null||m&&!t&&je(e,r)==null;return g?{x:Ie({axis:s,ticks:d,bandSize:p,entry:e,index:n}),y:v?null:c.scale.map(l)??null,value:a,payload:e}:{x:v?null:s.scale.map(l)??null,y:Ie({axis:c,ticks:f,bandSize:p,entry:e,index:n}),value:a,payload:e}});return{points:v,baseLine:(m||_?v.map(e=>{var t=Array.isArray(e.value)?e.value[0]:null;return g?{x:e.x,y:t!=null&&e.y!=null?c.scale.map(t)??null:null,payload:e.payload}:{x:t==null?null:s.scale.map(t)??null,y:e.y,payload:e.payload}}):g?c.scale.map(h):s.scale.map(h))??0,isRange:_}}function jt(e){var t=O(e,Dt),n=Ae();return z.createElement(ge,{id:t.id,type:`area`},e=>z.createElement(z.Fragment,null,z.createElement(Re,{legendPayload:gt(t)}),z.createElement(_t,{dataKey:t.dataKey,data:t.data,stroke:t.stroke,strokeWidth:t.strokeWidth,fill:t.fill,name:t.name,hide:t.hide,unit:t.unit,tooltipType:t.tooltipType,id:e}),z.createElement(Le,{type:`area`,id:e,data:t.data,dataKey:t.dataKey,xAxisId:t.xAxisId,yAxisId:t.yAxisId,zAxisId:0,stackId:ye(t.stackId),hide:t.hide,barSize:void 0,baseValue:t.baseValue,isPanorama:n,connectNulls:t.connectNulls}),z.createElement(Ot,B({},t,{id:e}))))}var Mt=z.memo(jt,re);Mt.displayName=`Area`;var Nt=[`axis`],Pt=(0,z.forwardRef)((e,t)=>z.createElement(Pe,{chartName:`AreaChart`,defaultTooltipEventType:`axis`,validateTooltipEventTypes:Nt,tooltipPayloadSearcher:ie,categoricalChartProps:e,ref:t})),H=e(f(),1),U=r(),{RangePicker:Ft}=p,{Text:W,Title:It}=g,G=`-`,K={primary:`var(--kd-primary)`,primaryActive:`var(--kd-primary-active)`,success:`var(--kd-success)`,warning:`var(--kd-warning)`,error:`var(--kd-error)`,info:`var(--kd-info)`,text:`var(--kd-text)`,muted:`var(--kd-muted)`},Lt=[K.primary,K.success,K.warning,K.info,K.primaryActive,K.error,K.muted],Rt=(e,t={})=>{try{return new Intl.NumberFormat(e,t)}catch{return new Intl.NumberFormat(`en-US`,t)}},zt=Rt(`en-NP`,{style:`currency`,currency:`NPR`,maximumFractionDigits:0}),q=Rt(`en-NP`,{style:`currency`,currency:`NPR`,notation:`compact`,maximumFractionDigits:1}),Bt=Rt(`en-NP`),J=(e,t)=>e==null||e===``?G:(t?q:zt).format(Number(e||0)),Vt=e=>e==null||e===``?G:Bt.format(Number(e||0)),Ht=e=>e?(0,H.default)(e).format(`DD MMM YYYY`):G,Y=e=>Number(e||0),X=e=>{e&&e!==`#`&&y.visit(e)};function Z(e){if(!e||e.length<6)return null;let t=Math.floor(e.length/2),n=e.slice(0,t),r=e.slice(t),i=n.reduce((e,t)=>e+Y(t.value),0),a=r.reduce((e,t)=>e+Y(t.value),0);return i===0?a>0?100:null:(a-i)/Math.abs(i)*100}function Ut(){let e=C(),{token:n}=S.useToken(),r=b().props.branchContext||{},[i,a]=(0,z.useState)(!0),[s,c]=(0,z.useState)(null),[l,u]=(0,z.useState)({}),[f,p]=(0,z.useState)({branch_id:r.selectedBranchId||`all`,date_from:(0,H.default)().startOf(`month`).format(`YYYY-MM-DD`),date_to:(0,H.default)().format(`YYYY-MM-DD`)}),m=(0,z.useCallback)(async()=>{a(!0),c(null);try{u((await t.get(`/dashboard-data`,{params:{branch_id:f.branch_id===`all`?void 0:f.branch_id,date_from:f.date_from,date_to:f.date_to}})).data||{})}catch(t){c(t?.response?.data?.message||e(`Unable to load dashboard data.`))}finally{a(!1)}},[f,e]);(0,z.useEffect)(()=>{m()},[m]);let h=(0,z.useMemo)(()=>nn(l),[l]);return(0,U.jsxs)(w,{header:(0,U.jsx)(Wt,{branches:l.branches||r.branches||[],filters:f,loading:i,onRefresh:m,onChange:p}),children:[(0,U.jsx)(x,{title:e(`Dashboard`)}),(0,U.jsx)(sn,{token:n}),(0,U.jsx)(`main`,{className:`kd`,children:(0,U.jsxs)(`div`,{className:`kd-wrap`,children:[s&&(0,U.jsx)(o,{showIcon:!0,type:`error`,message:e(`Dashboard could not be loaded`),description:s,action:(0,U.jsx)(d,{onClick:m,children:e(`Retry`)})}),i?(0,U.jsx)(tn,{}):(0,U.jsxs)(U.Fragment,{children:[(0,U.jsx)(`section`,{className:`kd-kpis`,children:h.kpis.map(e=>(0,U.jsx)(Gt,{...e},e.key))}),(0,U.jsxs)(`section`,{className:`kd-row-2`,children:[(0,U.jsx)(Kt,{data:h.chartData}),(0,U.jsx)(qt,{data:h.expenseBreakdown})]}),(0,U.jsxs)(`section`,{className:`kd-row-3`,children:[(0,U.jsx)(Yt,{data:h.cashflowChart}),(0,U.jsx)(Xt,{data:h.ageingData})]}),h.bizCards.length>0&&(0,U.jsx)(`section`,{className:`kd-biz-grid`,children:h.bizCards.map(e=>(0,U.jsx)(Zt,{card:e},e.key))}),(0,U.jsx)(rn,{approaching:h.approachingProjects,overdue:h.overdueProjects}),(0,U.jsx)(Qt,{transactions:h.transactions}),(0,U.jsxs)(`section`,{className:`kd-bottom`,children:[h.topCustomers.length>0&&(0,U.jsx)($t,{title:`Top Customers`,data:h.topCustomers,color:K.primary}),h.topSuppliers.length>0&&(0,U.jsx)($t,{title:`Top Suppliers`,data:h.topSuppliers,color:K.warning}),h.bankAccounts.length>0&&(0,U.jsx)(en,{accounts:h.bankAccounts})]})]})]})})]})}function Wt({branches:e,filters:t,loading:n,onRefresh:r,onChange:i}){let a=[{value:`all`,label:`All branches`},...(e||[]).map(e=>({value:e.value??e.id,label:e.label??e.name??`Branch #${e.id}`}))];return(0,U.jsxs)(`div`,{className:`kd-hdr`,children:[(0,U.jsxs)(`div`,{children:[(0,U.jsx)(It,{level:5,style:{margin:`0 0 1px`,fontWeight:650},children:`Dashboard`}),(0,U.jsx)(W,{type:`secondary`,style:{fontSize:11},children:`Financial overview for the selected period`})]}),(0,U.jsxs)(`div`,{className:`kd-hdr__ctl`,children:[(0,U.jsx)(s,{value:t.branch_id,options:a,style:{width:150},onChange:e=>i(t=>({...t,branch_id:e||`all`}))}),(0,U.jsx)(Ft,{value:t.date_from&&t.date_to?[(0,H.default)(t.date_from),(0,H.default)(t.date_to)]:null,style:{width:230},onChange:e=>i(t=>({...t,date_from:e?.[0]?.format(`YYYY-MM-DD`),date_to:e?.[1]?.format(`YYYY-MM-DD`)}))}),(0,U.jsx)(u,{title:`Refresh`,children:(0,U.jsx)(d,{size:`small`,icon:(0,U.jsx)(_,{spin:n}),onClick:r})})]})]})}function Gt({label:e,value:t,sparkline:n,color:r,trend:i,invertTrend:a,helper:o}){let s=i>0,c=a?s?K.error:K.success:s?K.success:K.error,l=Array.isArray(n)&&n.some(e=>Y(e.value)!==0),u=`kpi-g-${String(e||`metric`).toLowerCase().replace(/[^a-z0-9]+/g,`-`)}`;return(0,U.jsxs)(h,{className:`kd-card kd-kpi`,style:{"--kd-accent":r},styles:{body:{padding:0,height:`100%`,position:`relative`,overflow:`hidden`}},children:[(0,U.jsx)(`div`,{className:`kd-kpi__accent`}),(0,U.jsxs)(`div`,{className:`kd-kpi__content`,children:[(0,U.jsxs)(`div`,{className:`kd-kpi__top`,children:[(0,U.jsx)(W,{type:`secondary`,className:`kd-kpi__label`,children:e}),i!=null&&(0,U.jsxs)(`span`,{className:`kd-kpi__trend`,style:{"--kd-trend":c},children:[s?`+`:`-`,Math.abs(i).toFixed(1),`%`]})]}),(0,U.jsx)(`div`,{className:`kd-kpi__val`,children:J(t)}),o&&(0,U.jsx)(W,{type:`secondary`,className:`kd-kpi__helper`,children:o})]}),l&&(0,U.jsx)(`div`,{className:`kd-kpi__spark`,"aria-hidden":!0,children:(0,U.jsx)(F,{width:`100%`,height:`100%`,children:(0,U.jsxs)(Pt,{data:n,children:[(0,U.jsx)(`defs`,{children:(0,U.jsxs)(`linearGradient`,{id:u,x1:`0`,y1:`0`,x2:`0`,y2:`1`,children:[(0,U.jsx)(`stop`,{offset:`0%`,stopColor:r,stopOpacity:.24}),(0,U.jsx)(`stop`,{offset:`100%`,stopColor:r,stopOpacity:.04})]})}),(0,U.jsx)(Mt,{type:`monotone`,dataKey:`value`,stroke:r,strokeWidth:1.6,fill:`url(#${u})`,dot:!1,isAnimationActive:!1})]})})})]})}function Kt({data:e}){let t=e.some(e=>Y(e.revenue)||Y(e.expenses)||Y(e.profit));return(0,U.jsxs)(h,{className:`kd-card kd-chart-main`,styles:{body:{padding:8}},children:[(0,U.jsxs)(`div`,{className:`kd-card-hdr`,children:[(0,U.jsx)(`span`,{className:`kd-card-hdr__t`,children:`Financial Performance`}),(0,U.jsx)(W,{type:`secondary`,style:{fontSize:11},children:`Revenue, expenses & net profit trend`})]}),t?(0,U.jsx)(`div`,{style:{height:180},children:(0,U.jsx)(F,{width:`100%`,height:`100%`,children:(0,U.jsxs)(Ye,{data:e,margin:{top:4,right:10,bottom:0,left:0},children:[(0,U.jsx)(De,{stroke:`var(--kd-grid)`,vertical:!1}),(0,U.jsx)(Fe,{dataKey:`label`,axisLine:!1,tickLine:!1,tick:{fill:`var(--kd-muted)`,fontSize:9}}),(0,U.jsx)(P,{axisLine:!1,tickLine:!1,tick:{fill:`var(--kd-muted)`,fontSize:9},tickFormatter:e=>q.format(e),width:58}),(0,U.jsx)(A,{content:(0,U.jsx)(Q,{})}),(0,U.jsx)(L,{iconType:`circle`,iconSize:7,wrapperStyle:{fontSize:11,paddingTop:4}}),(0,U.jsx)(R,{type:`monotone`,dataKey:`revenue`,name:`Revenue`,stroke:K.primary,strokeWidth:1.8,dot:!1,activeDot:{r:3}}),(0,U.jsx)(R,{type:`monotone`,dataKey:`expenses`,name:`Expenses`,stroke:K.warning,strokeWidth:1.8,dot:!1,activeDot:{r:3}}),(0,U.jsx)(R,{type:`monotone`,dataKey:`profit`,name:`Net Profit`,stroke:K.success,strokeWidth:1.8,dot:!1,activeDot:{r:3}})]})})}):(0,U.jsx)($,{title:`No financial data`,desc:`Revenue and expense activity will appear here.`})]})}function qt({data:e}){let t=e.reduce((e,t)=>e+Y(t.value),0);return(0,U.jsxs)(h,{className:`kd-card kd-chart-side`,styles:{body:{padding:8}},children:[(0,U.jsxs)(`div`,{className:`kd-card-hdr`,children:[(0,U.jsx)(`span`,{className:`kd-card-hdr__t`,children:`Expense Breakdown`}),(0,U.jsx)(W,{type:`secondary`,style:{fontSize:11},children:`Where your money goes`})]}),e.length>0&&t>0?(0,U.jsx)(`div`,{style:{height:180,display:`flex`,flexDirection:`column`,alignItems:`center`},children:(0,U.jsx)(F,{width:`100%`,height:`100%`,children:(0,U.jsxs)(Ze,{children:[(0,U.jsx)(Xe,{data:e,dataKey:`value`,nameKey:`name`,cx:`50%`,cy:`45%`,innerRadius:`52%`,outerRadius:`78%`,paddingAngle:2,strokeWidth:0,children:e.map((e,t)=>(0,U.jsx)(Ue,{fill:Lt[t%Lt.length]},t))}),(0,U.jsx)(A,{content:(0,U.jsx)(Jt,{total:t})}),(0,U.jsx)(L,{iconType:`circle`,iconSize:7,wrapperStyle:{fontSize:10,lineHeight:`16px`},formatter:e=>(0,U.jsx)(`span`,{style:{color:`var(--kd-text)`,fontSize:10},children:e})})]})})}):(0,U.jsx)($,{title:`No expense data`,desc:`Expense categories will appear here.`,compact:!0})]})}function Jt({active:e,payload:t,total:n}){if(!e||!t?.length)return null;let r=t[0],i=n>0?(Y(r.value)/n*100).toFixed(1):0;return(0,U.jsxs)(`div`,{className:`kd-tip`,children:[(0,U.jsx)(W,{strong:!0,children:r.name}),(0,U.jsxs)(`div`,{className:`kd-tip__row`,children:[(0,U.jsx)(`span`,{style:{background:r.payload?.fill}}),(0,U.jsx)(W,{type:`secondary`,children:`Amount`}),(0,U.jsx)(W,{children:J(r.value)})]}),(0,U.jsxs)(`div`,{className:`kd-tip__row`,children:[(0,U.jsx)(`span`,{style:{background:`var(--kd-border)`}}),(0,U.jsx)(W,{type:`secondary`,children:`Share`}),(0,U.jsxs)(W,{children:[i,`%`]})]})]})}function Yt({data:e}){let t=e.some(e=>Y(e.cash_in)||Y(e.cash_out));return(0,U.jsxs)(h,{className:`kd-card kd-chart-main`,styles:{body:{padding:8}},children:[(0,U.jsxs)(`div`,{className:`kd-card-hdr`,children:[(0,U.jsx)(`span`,{className:`kd-card-hdr__t`,children:`Cash Flow`}),(0,U.jsx)(W,{type:`secondary`,style:{fontSize:11},children:`Daily cash inflows and outflows`})]}),t?(0,U.jsx)(`div`,{style:{height:170},children:(0,U.jsx)(F,{width:`100%`,height:`100%`,children:(0,U.jsxs)(Ye,{data:e,margin:{top:4,right:10,bottom:0,left:0},children:[(0,U.jsx)(De,{stroke:`var(--kd-grid)`,vertical:!1}),(0,U.jsx)(Fe,{dataKey:`label`,axisLine:!1,tickLine:!1,tick:{fill:`var(--kd-muted)`,fontSize:9}}),(0,U.jsx)(P,{axisLine:!1,tickLine:!1,tick:{fill:`var(--kd-muted)`,fontSize:9},tickFormatter:e=>q.format(e),width:58}),(0,U.jsx)(A,{content:(0,U.jsx)(Q,{})}),(0,U.jsx)(L,{iconType:`circle`,iconSize:7,wrapperStyle:{fontSize:11,paddingTop:4}}),(0,U.jsx)(R,{type:`monotone`,dataKey:`cash_in`,name:`Cash In`,stroke:K.info,strokeWidth:1.8,dot:!1,activeDot:{r:3}}),(0,U.jsx)(R,{type:`monotone`,dataKey:`cash_out`,name:`Cash Out`,stroke:K.error,strokeWidth:1.8,dot:!1,activeDot:{r:3}}),(0,U.jsx)(R,{type:`monotone`,dataKey:`net`,name:`Net`,stroke:K.primaryActive,strokeWidth:1.8,strokeDasharray:`6 3`,dot:!1,activeDot:{r:3}})]})})}):(0,U.jsx)($,{title:`No cash flow data`,desc:`Cash inflows and outflows will appear here.`})]})}function Xt({data:e}){let t=e.some(e=>Y(e.receivables)>0||Y(e.payables)>0);return(0,U.jsxs)(h,{className:`kd-card kd-chart-side`,styles:{body:{padding:8}},children:[(0,U.jsxs)(`div`,{className:`kd-card-hdr`,children:[(0,U.jsx)(`span`,{className:`kd-card-hdr__t`,children:`Receivables vs Payables Ageing`}),(0,U.jsx)(W,{type:`secondary`,style:{fontSize:11},children:`Outstanding amounts by age`})]}),t?(0,U.jsx)(`div`,{style:{height:170},children:(0,U.jsx)(F,{width:`100%`,height:`100%`,children:(0,U.jsxs)(Ge,{data:e,margin:{top:4,right:6,bottom:0,left:0},children:[(0,U.jsx)(De,{stroke:`var(--kd-grid)`,vertical:!1}),(0,U.jsx)(Fe,{dataKey:`bucket`,axisLine:!1,tickLine:!1,tick:{fill:`var(--kd-muted)`,fontSize:9}}),(0,U.jsx)(P,{axisLine:!1,tickLine:!1,tick:{fill:`var(--kd-muted)`,fontSize:9},tickFormatter:e=>q.format(e),width:52}),(0,U.jsx)(A,{content:(0,U.jsx)(Q,{})}),(0,U.jsx)(L,{iconType:`circle`,iconSize:7,wrapperStyle:{fontSize:10,paddingTop:4}}),(0,U.jsx)(He,{dataKey:`receivables`,name:`Receivables`,fill:K.info,radius:[4,4,0,0],maxBarSize:22}),(0,U.jsx)(He,{dataKey:`payables`,name:`Payables`,fill:K.warning,radius:[4,4,0,0],maxBarSize:22})]})})}):(0,U.jsx)($,{title:`No ageing data`,desc:`Receivable and payable ageing will appear here.`,compact:!0})]})}function Q({active:e,payload:t,label:n}){return!e||!t?.length?null:(0,U.jsxs)(`div`,{className:`kd-tip`,children:[(0,U.jsx)(W,{strong:!0,style:{fontSize:11},children:n}),t.map(e=>(0,U.jsxs)(`div`,{className:`kd-tip__row`,children:[(0,U.jsx)(`span`,{style:{background:e.color||e.fill}}),(0,U.jsx)(W,{type:`secondary`,children:e.name}),(0,U.jsx)(W,{children:J(e.value)})]},e.dataKey))]})}function Zt({card:e}){return(0,U.jsxs)(h,{className:`kd-card kd-biz`,styles:{body:{padding:8}},children:[(0,U.jsxs)(`div`,{className:`kd-biz__head`,children:[(0,U.jsx)(W,{strong:!0,style:{fontSize:12,fontWeight:650},children:e.title}),e.href&&(0,U.jsx)(d,{type:`link`,size:`small`,style:{padding:0,fontSize:11,fontWeight:600},onClick:()=>X(e.href),children:e.linkText||`View`})]}),(0,U.jsx)(`div`,{className:`kd-biz__rows`,children:e.items.map(e=>(0,U.jsxs)(`div`,{className:`kd-biz__row`,children:[(0,U.jsx)(W,{type:`secondary`,style:{fontSize:11},children:e.label}),(0,U.jsx)(W,{strong:!0,style:{fontSize:11},children:e.format===`money`?J(e.value,!0):e.format===`text`?e.value||G:Vt(e.value)})]},e.label))})]})}function Qt({transactions:e}){let t=[{title:`Date`,dataIndex:`date`,render:Ht,width:110},{title:`Type`,dataIndex:`type`,width:140},{title:`Number`,dataIndex:`number`,render:(e,t)=>t.action_url?(0,U.jsx)(d,{type:`link`,style:{padding:0,fontWeight:600},onClick:e=>{e.stopPropagation(),X(t.action_url)},children:e||G}):e||G},{title:`Party`,dataIndex:`party`,ellipsis:!0,render:e=>e||G},{title:`Amount`,dataIndex:`amount`,align:`right`,render:e=>J(e)},{title:`Status`,dataIndex:`status`,width:100,render:e=>(0,U.jsx)(`span`,{className:`kd-pill`,children:e||`posted`})}];return(0,U.jsxs)(h,{className:`kd-card`,styles:{body:{padding:e.length?0:8}},children:[(0,U.jsxs)(`div`,{className:`kd-card-hdr`,style:{padding:e.length?`8px`:0,borderBottom:e.length?`1px solid var(--kd-grid)`:`none`},children:[(0,U.jsx)(`span`,{className:`kd-card-hdr__t`,children:`Recent Transactions`}),(0,U.jsx)(W,{type:`secondary`,style:{fontSize:11},children:`Latest financial documents`})]}),e.length>0?(0,U.jsx)(a,{rowKey:`key`,columns:t,dataSource:e,pagination:!1,size:`small`,scroll:{x:700},onRow:e=>({onClick:()=>X(e.action_url),className:e.action_url?`kd-row--click`:``})}):(0,U.jsx)($,{title:`No recent transactions`,desc:`Posted documents will appear here.`,compact:!0})]})}function $t({title:e,data:t,color:n}){let r=t.slice(0,5).map(e=>({...e,name:on(e.name,18)}));return(0,U.jsxs)(h,{className:`kd-card`,styles:{body:{padding:8}},children:[(0,U.jsx)(`div`,{className:`kd-card-hdr`,style:{marginBottom:10},children:(0,U.jsx)(`span`,{className:`kd-card-hdr__t`,children:e})}),(0,U.jsx)(`div`,{style:{height:120},children:(0,U.jsx)(F,{width:`100%`,height:`100%`,children:(0,U.jsxs)(Ge,{data:r,layout:`vertical`,margin:{top:0,right:16,bottom:0,left:4},children:[(0,U.jsx)(Fe,{type:`number`,axisLine:!1,tickLine:!1,tick:{fill:`var(--kd-muted)`,fontSize:9},tickFormatter:e=>q.format(e)}),(0,U.jsx)(P,{type:`category`,dataKey:`name`,axisLine:!1,tickLine:!1,width:96,tick:{fill:`var(--kd-text)`,fontSize:10}}),(0,U.jsx)(A,{content:(0,U.jsx)(Q,{})}),(0,U.jsx)(He,{dataKey:`amount`,name:`Amount`,fill:n,radius:[0,4,4,0],maxBarSize:16})]})})})]})}function en({accounts:e}){return(0,U.jsxs)(h,{className:`kd-card`,styles:{body:{padding:8}},children:[(0,U.jsx)(`div`,{className:`kd-card-hdr`,style:{marginBottom:10},children:(0,U.jsx)(`span`,{className:`kd-card-hdr__t`,children:`Bank Accounts`})}),(0,U.jsx)(`div`,{className:`kd-bank-list`,children:e.map(e=>(0,U.jsxs)(`div`,{className:`kd-bank-row`,children:[(0,U.jsxs)(`div`,{style:{minWidth:0},children:[(0,U.jsx)(W,{style:{fontWeight:600,fontSize:13},ellipsis:!0,children:e.bank_name||G}),(0,U.jsx)(W,{type:`secondary`,style:{fontSize:11,display:`block`},ellipsis:!0,children:[e.account_name,e.account_number].filter(Boolean).join(` / `)||G})]}),(0,U.jsxs)(`div`,{style:{textAlign:`right`,whiteSpace:`nowrap`},children:[(0,U.jsx)(W,{style:{fontWeight:650,fontSize:13},children:J(e.balance)}),e.currency&&(0,U.jsx)(W,{type:`secondary`,style:{display:`block`,fontSize:11},children:e.currency})]})]},e.key))})]})}function $({title:e,desc:t,compact:n}){return(0,U.jsx)(`div`,{style:{minHeight:n?105:170,display:`flex`,alignItems:`center`,justifyContent:`center`,textAlign:`center`,padding:10},children:(0,U.jsxs)(l,{image:l.PRESENTED_IMAGE_SIMPLE,description:!1,children:[(0,U.jsx)(It,{level:5,style:{margin:`0 0 4px`},children:e}),(0,U.jsx)(W,{type:`secondary`,style:{fontSize:11},children:t})]})})}function tn(){return(0,U.jsxs)(`div`,{style:{display:`flex`,flexDirection:`column`,gap:8},children:[(0,U.jsx)(`div`,{className:`kd-kpis`,children:[1,2,3,4,5,6].map(e=>(0,U.jsx)(h,{className:`kd-card`,styles:{body:{padding:8}},children:(0,U.jsx)(c,{active:!0,paragraph:{rows:2}})},e))}),(0,U.jsxs)(`div`,{className:`kd-row-2`,children:[(0,U.jsx)(h,{className:`kd-card`,children:(0,U.jsx)(c,{active:!0,paragraph:{rows:8}})}),(0,U.jsx)(h,{className:`kd-card`,children:(0,U.jsx)(c,{active:!0,paragraph:{rows:8}})})]}),(0,U.jsx)(h,{className:`kd-card`,children:(0,U.jsx)(c,{active:!0,paragraph:{rows:5}})})]})}function nn(e){let t=e.financial_summary||{},n=e.metric_sparklines||{},r=e.revenue_expense_profit_chart||[],i=e.cashflow_chart||[],a=r.map(e=>({date:e.date,label:e.date?(0,H.default)(e.date).format(`DD MMM`):``,revenue:Y(e.revenue),expenses:Y(e.expenses),profit:Y(e.profit)})),o=i.map(e=>({date:e.date,label:e.date?(0,H.default)(e.date).format(`DD MMM`):``,cash_in:Y(e.cash_in),cash_out:Y(e.cash_out),net:Y(e.net)})),s=r.map(e=>({date:e.date,value:Y(e.revenue)})),c=r.map(e=>({date:e.date,value:Y(e.expenses)})),l=(n.net_profit||[]).map(e=>({date:e.date,value:Y(e.value)})),u=(n.cash_bank||[]).map(e=>({date:e.date,value:Y(e.value)})),d=(n.receivables||[]).map(e=>({date:e.date,value:Y(e.value)})),f=(n.payables||[]).map(e=>({date:e.date,value:Y(e.value)})),p=[{key:`revenue`,label:`Revenue`,value:t.revenue,sparkline:s,color:K.primary,trend:Z(s),helper:`This period`},{key:`expenses`,label:`Expenses`,value:t.expenses,sparkline:c,color:K.warning,trend:Z(c),invertTrend:!0,helper:`This period`},{key:`profit`,label:`Net Profit`,value:t.net_profit,sparkline:l,color:K.success,trend:Z(l)},{key:`cash`,label:`Cash & Bank`,value:t.cash_bank_balance,sparkline:u,color:K.info,trend:Z(u),helper:`Available`},{key:`receivables`,label:`Receivables`,value:t.receivables,sparkline:d,color:K.info,helper:`Outstanding`},{key:`payables`,label:`Payables`,value:t.payables,sparkline:f,color:K.error,helper:`Outstanding`}],m=e.expense_breakdown||[],h=an(e.receivable_ageing,e.payable_ageing),g=e.cash_position||{},_=Array.isArray(g.bank_accounts)?g.bank_accounts:[],v=Array.isArray(e.recent_transactions)?e.recent_transactions:[],y=Array.isArray(e.top_customers)?e.top_customers:[],b=Array.isArray(e.top_suppliers)?e.top_suppliers:[],x=[],S=e.sales_summary;S&&x.push({key:`sales`,title:`Sales`,href:`/payment-in/invoices`,linkText:`View invoices`,items:[{label:`Total sales`,value:S.sales_total,format:`money`},{label:`Invoices`,value:S.invoice_count},{label:`Paid`,value:S.paid_amount,format:`money`},{label:`Unpaid`,value:S.unpaid_amount,format:`money`},{label:`Overdue`,value:S.overdue_amount,format:`money`}]});let C=e.purchase_summary;C&&x.push({key:`purchase`,title:`Purchases`,href:`/payment-out/purchase-bills`,linkText:`View bills`,items:[{label:`Total purchases`,value:C.purchase_total,format:`money`},{label:`Bills`,value:C.bill_count},{label:`Paid`,value:C.paid_amount,format:`money`},{label:`Unpaid bills`,value:C.unpaid_amount,format:`money`},{label:`Expense payables`,value:C.expense_payables,format:`money`},{label:`Total payables`,value:C.total_payables??C.unpaid_amount,format:`money`},{label:`Upcoming`,value:C.upcoming_payables,format:`money`}]});let w=e.cashflow_summary;if(w){let e=[{label:`Cash in`,value:w.cash_in,format:`money`},{label:`Cash out`,value:w.cash_out,format:`money`},{label:`Net cash flow`,value:w.net_cash_flow,format:`money`}];w.biggest_inflow&&e.push({label:`Top inflow`,value:w.biggest_inflow,format:`text`}),w.biggest_outflow&&e.push({label:`Top outflow`,value:w.biggest_outflow,format:`text`}),x.push({key:`cashflow`,title:`Cash Flow`,items:e})}let T=e.inventory_summary;T&&x.push({key:`inventory`,title:`Inventory`,href:`/inventory/products`,linkText:`View`,items:[{label:`Products`,value:T.total_products},{label:`Low stock`,value:T.low_stock_items},{label:`Value`,value:T.inventory_value,format:`money`},{label:`Warehouses`,value:T.warehouse_count}]});let E=e.crm_summary;E&&x.push({key:`crm`,title:`CRM`,href:`/crm`,linkText:`View`,items:[{label:`Open leads`,value:E.open_leads},{label:`Open deals`,value:E.open_deals},{label:`Pipeline`,value:E.pipeline_value,format:`money`},{label:`Won`,value:E.won_value,format:`money`}]});let D=e.hrm_summary;if(D){let e=[{label:`Employees`,value:D.active_employees}];D.on_leave_today>0&&e.push({label:`On leave`,value:D.on_leave_today}),D.attendance_today>0&&e.push({label:`Attendance`,value:D.attendance_today}),D.payroll_this_period>0&&e.push({label:`Payroll`,value:D.payroll_this_period,format:`money`}),x.push({key:`hrm`,title:`HRM`,href:`/hrm/users`,linkText:`View`,items:e})}let O=e.project_summary;if(O){let e=[{label:`Active`,value:O.active_projects},{label:`Completed`,value:O.completed_this_period}];O.overdue_tasks>0&&e.push({label:`Overdue tasks`,value:O.overdue_tasks}),O.billing_value>0&&e.push({label:`Billing`,value:O.billing_value,format:`money`}),x.push({key:`projects`,title:`Projects`,href:`/hrm/projects`,linkText:`View`,items:e})}return{kpis:p,chartData:a,cashflowChart:o,expenseBreakdown:m,ageingData:h,bizCards:x,transactions:v,topCustomers:y,topSuppliers:b,bankAccounts:_,approachingProjects:Array.isArray(e.approaching_deadline_projects)?e.approaching_deadline_projects:[],overdueProjects:Array.isArray(e.overdue_projects)?e.overdue_projects:[]}}function rn({approaching:e,overdue:t}){let n=e=>[{title:`Project`,dataIndex:`name`,render:(e,t)=>(0,U.jsx)(d,{type:`link`,style:{padding:0,fontWeight:600},onClick:()=>X(t.action_url),children:e||G})},{title:`Manager`,dataIndex:`manager`,ellipsis:!0,render:e=>e||G},{title:`End Date`,dataIndex:`end_date`,width:120,render:Ht},{title:e===`overdue`?`Overdue`:`Time Left`,width:115,render:(t,n)=>e===`overdue`?`${n.days_overdue||0} day${Number(n.days_overdue)===1?``:`s`}`:`${n.days_left||0} day${Number(n.days_left)===1?``:`s`}`},{title:`Status`,dataIndex:`status`,width:120,render:e=>(0,U.jsx)(v,{children:String(e||G).replace(/_/g,` `)})}],r=(e,t)=>e.length?(0,U.jsx)(a,{size:`small`,rowKey:`id`,pagination:!1,dataSource:e,columns:n(t),scroll:{x:650}}):(0,U.jsx)($,{title:`No projects`,desc:`Project deadlines that need attention will appear here.`,compact:!0});return(0,U.jsxs)(h,{className:`kd-card`,styles:{body:{padding:8}},children:[(0,U.jsxs)(`div`,{className:`kd-card-hdr`,children:[(0,U.jsx)(`span`,{className:`kd-card-hdr__t`,children:`Project Deadlines`}),(0,U.jsx)(W,{type:`secondary`,style:{fontSize:11},children:`Approaching and overdue internal project dates`})]}),(0,U.jsx)(m,{size:`small`,items:[{key:`approaching`,label:`Approaching Deadline (${e.length})`,children:r(e,`approaching`)},{key:`overdue`,label:`Overdue (${t.length})`,children:r(t,`overdue`)}]})]})}function an(e=[],t=[]){let n=new Map,r=[];return(e||[]).forEach(e=>{n.set(e.bucket,{bucket:e.bucket,receivables:Y(e.amount),payables:0}),r.push(e.bucket)}),(t||[]).forEach(e=>{let t=n.get(e.bucket);t?t.payables=Y(e.amount):(n.set(e.bucket,{bucket:e.bucket,receivables:0,payables:Y(e.amount)}),r.push(e.bucket))}),r.filter((e,t,n)=>n.indexOf(e)===t).map(e=>n.get(e))}function on(e,t){return e?e.length>t?e.slice(0,t-3)+`...`:e:G}function sn({token:e}){return(0,U.jsx)(`style`,{children:`
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
        `})}export{Ut as default};