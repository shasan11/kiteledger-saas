import{i as e,n as t}from"./rolldown-runtime-aKtaBQYM.js";import{t as n}from"./axios-BQPRRFHk.js";import{r,t as i}from"./jsx-runtime-RbF_zoRI.js";import{r as a}from"./ColorPresets-CoZGKBn8.js";import{t as o}from"./empty-BOJtdRz7.js";import{t as s}from"./button-DdnyfjyJ.js";import{t as c}from"./spin-CwFiyjRP.js";import{t as l}from"./checkbox-DKmP0Rfx.js";import{t as u}from"./space-_4B_xOOu.js";import{t as d}from"./input-D-fdS88J.js";import{t as f}from"./tag-Dh3NArqV.js";var p=t({default:()=>x}),m=e(r(),1),h=i(),g=[`view`,`create`,`update`,`delete`,`manage`,`approve`,`void`],_=new Set(g),v=e=>String(e||``).replace(/[_-]/g,` `).replace(/\b\w/g,e=>e.toUpperCase()),y=e=>e==null?null:typeof e==`object`?e.id??e.value??null:e,b=e=>{let t=String(e.name||``).split(`.`).filter(Boolean),n=t.length>1?t[t.length-1]:`manage`,r=t[0]||`general`,i=t.length>2?t.slice(1,-1).join(`.`):`general`;return{...e,action:n,module:r,resource:i}};function x({value:e,setFieldValue:t,readOnly:r,field:i}){let[p,x]=(0,m.useState)([]),[S,C]=(0,m.useState)(!0),[w,T]=(0,m.useState)(``),E=(0,m.useMemo)(()=>new Set((Array.isArray(e)?e:[]).map(y).filter(Boolean).map(String)),[e]);(0,m.useEffect)(()=>{let e=!1;return(async()=>{C(!0);try{let t=[],r=1,a=null;for(;r<=100;){let{data:e}=await n.get(i.fkUrl,{params:{page:r,page_size:100}}),o=Array.isArray(e?.results)?e.results:Array.isArray(e)?e:[];if(t.push(...o),a=typeof e?.count==`number`?e.count:a,!e?.next&&(a==null||t.length>=a||o.length<100))break;r+=1}e||x(t)}finally{e||C(!1)}})(),()=>{e=!0}},[i.fkUrl]);let D=(0,m.useMemo)(()=>p.map(b).filter(e=>_.has(e.action)),[p]),O=(0,m.useMemo)(()=>{let e=new Set(D.map(e=>e.action));return Array.from(e).sort((e,t)=>g.indexOf(e)-g.indexOf(t)||e.localeCompare(t))},[D]),k=(0,m.useMemo)(()=>{let e=w.trim().toLowerCase(),t=D.filter(t=>!e||[t.name,t.description,t.module,t.resource,t.action].filter(Boolean).some(t=>String(t).toLowerCase().includes(e))),n=new Map;return t.forEach(e=>{n.has(e.module)||n.set(e.module,new Map);let t=n.get(e.module);t.has(e.resource)||t.set(e.resource,[]),t.get(e.resource).push(e)}),Array.from(n.entries()).map(([e,t])=>({module:e,resources:Array.from(t.entries()).map(([e,t])=>({resource:e,permissions:t.sort((e,t)=>g.indexOf(e.action)-g.indexOf(t.action)||e.action.localeCompare(t.action))}))}))},[D,w]),A=e=>t(i.name,Array.from(e)),j=(e,t)=>{let n=new Set(E);t?n.add(String(e)):n.delete(String(e)),A(n)},M=(e,t)=>{let n=new Set(E);e.forEach(e=>{t?n.add(String(e)):n.delete(String(e))}),A(n)},N=p.map(e=>e.id).filter(Boolean),P=N.filter(e=>E.has(String(e))).length;return S?(0,h.jsx)(`div`,{style:{padding:24,textAlign:`center`},children:(0,h.jsx)(c,{})}):p.length?(0,h.jsxs)(`div`,{className:`permission-matrix`,children:[(0,h.jsxs)(u,{style:{width:`100%`,justifyContent:`space-between`,marginBottom:12},wrap:!0,children:[(0,h.jsx)(d.Search,{allowClear:!0,placeholder:`Search permissions`,value:w,onChange:e=>T(e.target.value),style:{width:280}}),(0,h.jsxs)(u,{wrap:!0,children:[(0,h.jsxs)(f,{color:`blue`,children:[P,` selected`]}),(0,h.jsx)(s,{size:`small`,disabled:r,onClick:()=>M(N,!0),children:`Select all`}),(0,h.jsx)(s,{size:`small`,disabled:r,onClick:()=>M(N,!1),children:`Clear`})]})]}),(0,h.jsx)(a,{bordered:!1,defaultActiveKey:k.slice(0,2).map(e=>e.module),items:k.map(e=>{let t=e.resources.flatMap(e=>e.permissions.map(e=>e.id)),n=t.filter(e=>E.has(String(e))).length;return{key:e.module,label:(0,h.jsxs)(u,{children:[(0,h.jsx)(`strong`,{children:v(e.module)}),(0,h.jsxs)(f,{children:[n,`/`,t.length]})]}),children:(0,h.jsxs)(`div`,{className:`permission-matrix__table`,children:[(0,h.jsxs)(`div`,{className:`permission-matrix__row permission-matrix__row--head`,style:{gridTemplateColumns:`minmax(180px, 1fr) repeat(${O.length}, 92px)`},children:[(0,h.jsx)(`div`,{children:`Permission`}),O.map(e=>(0,h.jsx)(`div`,{children:v(e)},e))]}),e.resources.map(e=>{let t=e.permissions.map(e=>e.id),n=t.filter(e=>E.has(String(e))).length;return(0,h.jsxs)(`div`,{className:`permission-matrix__row`,style:{gridTemplateColumns:`minmax(180px, 1fr) repeat(${O.length}, 92px)`},children:[(0,h.jsx)(`div`,{children:(0,h.jsx)(l,{disabled:r,checked:n===t.length,indeterminate:n>0&&n<t.length,onChange:e=>M(t,e.target.checked),children:(0,h.jsx)(`strong`,{children:v(e.resource)})})}),O.map(t=>{let n=e.permissions.find(e=>e.action===t);return n?(0,h.jsx)(`div`,{children:(0,h.jsx)(l,{disabled:r,checked:E.has(String(n.id)),title:n.name,onChange:e=>j(n.id,e.target.checked)})},t):(0,h.jsx)(`div`,{className:`permission-matrix__empty`},t)})]},e.resource)})]})}})}),(0,h.jsx)(`style`,{children:`
        .permission-matrix .ant-collapse {
          background: #fff;
        }

        .permission-matrix .ant-collapse-item {
          border: 1px solid #e5e7eb;
          border-radius: 6px;
          margin-bottom: 10px;
          overflow: hidden;
        }

        .permission-matrix .ant-collapse-header {
          background: #f8fafc;
          align-items: center !important;
        }

        .permission-matrix__table {
          overflow-x: auto;
          border: 1px solid #edf0f4;
        }

        .permission-matrix__row {
          display: grid;
          min-width: max-content;
          align-items: center;
          border-bottom: 1px solid #edf0f4;
        }

        .permission-matrix__row:last-child {
          border-bottom: 0;
        }

        .permission-matrix__row > div {
          min-height: 42px;
          padding: 9px 12px;
          display: flex;
          align-items: center;
          border-right: 1px solid #edf0f4;
        }

        .permission-matrix__row > div:not(:first-child) {
          justify-content: center;
        }

        .permission-matrix__row > div:last-child {
          border-right: 0;
        }

        .permission-matrix__row--head {
          background: #fbfcfe;
          color: #111827;
          font-size: 11px;
          font-weight: 750;
          text-transform: uppercase;
        }

        .permission-matrix__empty {
          background: #fcfcfd;
        }
      `})]}):(0,h.jsx)(o,{description:`No permissions found`})}export{p as n,x as t};