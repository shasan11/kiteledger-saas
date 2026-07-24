import{i as e}from"./rolldown-runtime-aKtaBQYM.js";import{t}from"./axios-BQPRRFHk.js";import{i as n,t as r}from"./index.esm-CtIVDvdE.js";import{r as i,t as a}from"./jsx-runtime-RbF_zoRI.js";import{a as o}from"./table-DK2wnZMe.js";import{t as s}from"./alert-CXVdfG0X.js";import{t as c}from"./typography-BTjN9rxU.js";import{t as ee}from"./skeleton-DWMEFrf7.js";import{t as l}from"./empty-BOJtdRz7.js";import{t as u}from"./avatar-EA2dx6l6.js";import{t as d}from"./dropdown-BkC9qBXY.js";import{t as f}from"./button-DdnyfjyJ.js";import{t as p}from"./card-DkP92y8s.js";import{t as m}from"./space-_4B_xOOu.js";import{t as h}from"./flex-Ck__RgfI.js";import{t as te}from"./message-Lq1UzMpA.js";import{t as g}from"./tag-Dh3NArqV.js";import{t as _}from"./ReusableCrud-CBQa-bY7.js";import{t as v}from"./EditOutlined-DDNyn6SO.js";import{c as ne}from"./app-D4CZYYgw.js";import{a as y,t as re}from"./AuthenticatedLayout-OEHjUhv1.js";import{t as b}from"./ArrowLeftOutlined-CzB-XQhI.js";import{t as x}from"./CheckCircleOutlined-B_TrR1yt.js";import{t as ie}from"./MailOutlined-CZag93En.js";import{t as S}from"./MoreOutlined-BocTFMVG.js";import{t as ae}from"./PhoneOutlined-CsUUtGa5.js";import{t as C}from"./StopOutlined-nZ2Jb1g9.js";import{t as w}from"./UsergroupAddOutlined-Dr0YedMi.js";import{i as T,n as E}from"./index.esm-CBn_TnkU.js";var D=e(i(),1),O=a(),{Title:k,Text:A,Paragraph:oe}=c,j=``,M=e=>`${j}${e}`,N=e=>e===``||e==null?null:typeof e==`string`?e.trim()||null:e,P=()=>typeof route<`u`&&typeof route==`function`,F=(e,t=null,n=`#`)=>{try{return P()?t?route(e,t):route(e):n}catch{return n}},I=()=>{let e=localStorage.getItem(`accessToken`);return{Accept:`application/json`,"Content-Type":`application/json`,...e?{Authorization:`Bearer ${e}`}:{}}},L=e=>e==null||e===``,R=(e=``)=>String(e).replace(/_/g,` `).replace(/\b\w/g,e=>e.toUpperCase()),se=(e=``)=>{let t=String(e).trim().split(/\s+/).filter(Boolean);return t.length?t.length===1?t[0].slice(0,2).toUpperCase():`${t[0][0]}${t[1][0]}`.toUpperCase():`?`},z=e=>{if(!e)return`-`;try{return new Date(e).toLocaleString(`en-GB`,{day:`2-digit`,month:`short`,year:`numeric`,hour:`2-digit`,minute:`2-digit`})}catch{return e}},ce=e=>`NPR ${Number(e||0).toLocaleString(void 0,{minimumFractionDigits:2,maximumFractionDigits:2})}`,B=e=>typeof e?.count==`number`?e.count:Array.isArray(e?.results)?e.results.length:Array.isArray(e?.data)?e.data.length:Array.isArray(e)?e.length:0,le=[`button`,`a`,`input`,`textarea`,`select`,`.ant-checkbox-wrapper`,`.ant-switch`,`.ant-dropdown-trigger`,`.ant-btn`,`.ant-tag`,`.ant-select`,`.ant-pagination`,`.ant-table-selection-column`].join(`,`);function V({active:e}){return e===!1?(0,O.jsx)(g,{color:`error`,icon:(0,O.jsx)(C,{}),className:`contact-group-show__tag`,children:`Inactive`}):(0,O.jsx)(g,{color:`success`,icon:(0,O.jsx)(x,{}),className:`contact-group-show__tag`,children:`Active`})}function ue({value:e}){return e===`customer`?(0,O.jsx)(g,{color:`blue`,className:`contact-group-show__tag`,children:`Customer`}):e===`supplier`?(0,O.jsx)(g,{color:`purple`,className:`contact-group-show__tag`,children:`Supplier`}):e===`lead`?(0,O.jsx)(g,{color:`gold`,className:`contact-group-show__tag`,children:`Lead`}):(0,O.jsx)(g,{className:`contact-group-show__tag`,children:R(e||`Unknown`)})}function de({value:e}){return L(e)?(0,O.jsx)(A,{type:`secondary`,children:`Not Available`}):(0,O.jsx)(`span`,{children:e})}function H({title:e,extra:t,children:n}){return(0,O.jsx)(p,{className:`contact-group-show__card`,title:e,extra:t,children:n})}function U({title:e,value:t,tone:n=`default`,icon:r}){return(0,O.jsx)(p,{className:`contact-group-show__metric contact-group-show__metric--${n}`,children:(0,O.jsxs)(`div`,{className:`contact-group-show__metric-inner`,children:[(0,O.jsx)(`div`,{className:`contact-group-show__metric-icon`,children:r}),(0,O.jsxs)(`div`,{className:`contact-group-show__metric-content`,children:[(0,O.jsx)(A,{type:`secondary`,children:e}),(0,O.jsx)(`strong`,{children:t})]})]})})}function fe({rows:e=[]}){let t=e.filter(Boolean);return t.length?(0,O.jsx)(`div`,{className:`contact-group-show__info-grid`,children:t.map(e=>(0,O.jsxs)(`div`,{className:`contact-group-show__info-item`,children:[(0,O.jsx)(`div`,{className:`contact-group-show__info-label`,children:e.label}),(0,O.jsx)(`div`,{className:`contact-group-show__info-value`,children:e.value??`-`})]},e.label))}):(0,O.jsx)(l,{image:l.PRESENTED_IMAGE_SIMPLE,description:`No details available`})}function pe({rows:e=[]}){let t=e.filter(Boolean);return t.length?(0,O.jsx)(`div`,{className:`contact-group-show__rail-grid`,children:t.map(e=>(0,O.jsxs)(`div`,{className:`contact-group-show__rail-row`,children:[(0,O.jsx)(`div`,{className:`contact-group-show__rail-label`,children:e.label}),(0,O.jsx)(`div`,{className:`contact-group-show__rail-value`,children:e.value??`-`})]},e.label))}):null}function me({token:e,groupName:t,parentName:n,goBack:r,goEdit:i,actionItems:a,onActionClick:o,saving:s}){return(0,O.jsxs)(h,{align:`center`,justify:`space-between`,wrap:`wrap`,gap:e.marginSM,children:[(0,O.jsxs)(h,{align:`center`,gap:e.marginSM,style:{minWidth:0},children:[(0,O.jsx)(f,{type:`text`,icon:(0,O.jsx)(b,{}),onClick:r,children:`Contact Groups`}),(0,O.jsxs)(`div`,{style:{minWidth:0},children:[(0,O.jsx)(k,{level:4,style:{margin:0,lineHeight:1.2,color:e.colorTextHeading},children:t}),(0,O.jsx)(A,{type:`secondary`,ellipsis:!0,style:{maxWidth:640,display:`block`},children:n?`Under ${n}`:`Root contact group`})]})]}),(0,O.jsxs)(m,{size:8,wrap:!0,children:[(0,O.jsx)(f,{icon:(0,O.jsx)(v,{}),onClick:i,children:`Edit`}),(0,O.jsx)(d,{menu:{items:a,onClick:o},placement:`bottomRight`,trigger:[`click`],children:(0,O.jsxs)(f,{loading:s,children:[`Options `,(0,O.jsx)(S,{})]})})]})]})}function W({auth:e,id:i}){let{token:a}=ne.useToken(),[c,d]=te.useMessage(),[f,h]=(0,D.useState)(null),[g,b]=(0,D.useState)({contacts:0,subGroups:0}),[S,j]=(0,D.useState)(`overview`),[P,L]=(0,D.useState)(!0),[R,W]=(0,D.useState)(!1),[he,G]=(0,D.useState)(!1),[K,q]=(0,D.useState)(``),ge=async()=>{L(!0),q(``);try{let e=await t.get(M(`/api/contact-groups/${i}/`),{headers:I()});h(e.data?.data??e.data)}catch(e){let t=e?.response?.data?.message||`Failed to load contact group.`;q(t),c.error(t)}finally{L(!1)}},_e=async()=>{W(!0);try{let[e,n]=await Promise.all([t.get(M(`/api/contacts/`),{headers:I(),params:{contact_group_id:i,page_size:1}}),t.get(M(`/api/contact-groups/`),{headers:I(),params:{parent_id:i,page_size:1}})]);b({contacts:B(e.data),subGroups:B(n.data)})}catch{b({contacts:0,subGroups:0})}finally{W(!1)}},ve=async()=>{await Promise.all([ge(),_e()])};(0,D.useEffect)(()=>{ve()},[i]);let J=f?.name||`Contact Group`,Y=f?.parent?.name||f?.parent_name||null,X=typeof g.contacts==`number`?g.contacts:f?.contacts_count??f?.contacts?.length??0,Z=typeof g.subGroups==`number`?g.subGroups:f?.children_count??f?.children?.length??0,ye=()=>{n.visit(F(`crm.contact-groups.index`,null,`/crm/contact-groups`))},Q=()=>{n.visit(F(`crm.contact-groups.edit`,i,`/crm/contact-groups/${i}/edit`))},be=async()=>{G(!0),q(``);try{let e=await t.patch(M(`/api/contact-groups/${i}/`),{active:f?.active===!1},{headers:I()});h(e.data?.data??e.data),c.success(`Contact group updated.`)}catch(e){let t=e?.response?.data?.message||`Failed to update contact group.`;q(t),c.error(t)}finally{G(!1)}},$=e=>({onClick:t=>{t.target.closest(le)||e&&n.visit(e)},style:{cursor:e?`pointer`:`default`}}),xe=e=>$(F(`crm.contacts.show`,e?.id,`/crm/contacts/${e?.id}`)),Se=e=>$(F(`crm.contact-groups.show`,e?.id,`/crm/contact-groups/${e?.id}`)),Ce=(0,D.useMemo)(()=>[{title:`Group`,dataIndex:`name`,key:`name`,backendSort:!0,sortField:`name`,width:300,render:(e,t)=>(0,O.jsxs)(m,{size:a.marginSM,children:[(0,O.jsx)(u,{size:36,icon:(0,O.jsx)(o,{}),style:{background:a.colorPrimaryBg,color:a.colorPrimary}}),(0,O.jsxs)(`div`,{style:{minWidth:0},children:[(0,O.jsx)(A,{strong:!0,ellipsis:!0,style:{display:`block`,maxWidth:210},children:e||`-`}),(0,O.jsx)(A,{type:`secondary`,style:{fontSize:a.fontSizeSM},children:t?.description||`No description`})]})]})},{title:`Status`,dataIndex:`active`,key:`active`,width:130,render:e=>(0,O.jsx)(V,{active:e})}],[a]),we=(0,D.useMemo)(()=>[{name:`name`,label:`Group Name`,type:`text`,required:!0,col:24,placeholder:`Example: Suppliers, Customers, Corporate Clients`},{name:`parent_id`,label:`Parent Group`,type:`fkSelect`,col:24,readOnly:!0,fkUrl:M(`/api/contact-groups/`),fkSearchParam:`search`,fkPageSize:20,fkValueKey:`id`,fkLabelKey:`name`},{name:`description`,label:`Description`,type:`textarea`,rows:3,col:24,placeholder:`Short note about this group`},{name:`active`,label:`Active`,type:`switch`,col:12}],[]),Te=(0,D.useMemo)(()=>[{title:`Contact`,dataIndex:`name`,key:`name`,backendSort:!0,sortField:`name`,render:(e,t)=>(0,O.jsxs)(m,{size:a.marginSM,children:[(0,O.jsx)(u,{size:36,style:{background:a.colorPrimaryBg,color:a.colorPrimary,fontWeight:a.fontWeightStrong},children:se(e)}),(0,O.jsxs)(`div`,{style:{minWidth:0},children:[(0,O.jsx)(A,{strong:!0,ellipsis:!0,style:{display:`block`,maxWidth:260},children:e||`-`}),(0,O.jsxs)(m,{size:a.marginXS,wrap:!0,style:{marginTop:a.marginXXS},children:[(0,O.jsx)(A,{type:`secondary`,style:{fontSize:a.fontSizeSM},children:t?.code||`No code`}),t?.phone?(0,O.jsxs)(A,{type:`secondary`,style:{fontSize:a.fontSizeSM},children:[(0,O.jsx)(ae,{}),` `,t.phone]}):null,t?.email?(0,O.jsxs)(A,{type:`secondary`,style:{fontSize:a.fontSizeSM},children:[(0,O.jsx)(ie,{}),` `,t.email]}):null]})]})]})},{title:`Type`,dataIndex:`contact_type`,key:`contact_type`,width:130,render:e=>(0,O.jsx)(ue,{value:e})},{title:`Credit Limit`,dataIndex:`credit_limit`,key:`credit_limit`,width:150,align:`right`,render:e=>ce(e)},{title:`Status`,dataIndex:`active`,key:`active`,width:120,render:e=>(0,O.jsx)(V,{active:e})}],[a]),Ee=(0,D.useMemo)(()=>[{name:`name`,label:`Contact Name`,type:`text`,required:!0,col:12},{name:`code`,label:`Code`,type:`text`,col:6},{name:`contact_type`,label:`Contact Type`,type:`select`,required:!0,col:6,options:[{value:`customer`,label:`Customer`},{value:`supplier`,label:`Supplier`},{value:`lead`,label:`Lead`}]},{name:`phone`,label:`Phone`,type:`phone`,col:8,placeholder:`+977 9800000000`,defaultCountryCode:`+977`},{name:`email`,label:`Email`,type:`text`,col:8},{name:`pan`,label:`PAN`,type:`text`,col:8},{name:`tax_registration_no`,label:`Tax Registration No`,type:`text`,col:8},{name:`tax_registration_type`,label:`Tax Type`,type:`select`,col:8,options:[{value:`none`,label:`None`},{value:`pan`,label:`PAN`},{value:`vat`,label:`VAT`},{value:`gstin`,label:`GSTIN`},{value:`tan`,label:`TAN`},{value:`ein`,label:`EIN`},{value:`sales_tax_permit`,label:`Sales Tax Permit`},{value:`state_tax_id`,label:`State Tax ID`}]},{name:`credit_limit`,label:`Credit Limit`,type:`number`,col:8},{name:`contact_group_id`,label:`Contact Group`,type:`fkSelect`,readOnly:!0,col:12,fkUrl:M(`/api/contact-groups/`),fkSearchParam:`search`,fkPageSize:20,fkValueKey:`id`,fkLabelKey:`name`},{name:`accept_purchase`,label:`Accept Purchase`,type:`switch`,col:6},{name:`active`,label:`Active`,type:`switch`,col:6},{name:`address`,label:`Address`,type:`textarea`,rows:2,col:24}],[]),De={name:``,parent_id:i,description:``,active:!0},Oe={name:``,code:``,contact_type:`customer`,phone:``,email:``,pan:``,tax_registration_no:``,tax_registration_type:`none`,contact_group_id:i,credit_limit:0,accept_purchase:!1,active:!0,address:``},ke=[{key:`edit`,icon:(0,O.jsx)(v,{}),label:`Edit Group`},{key:`toggle-status`,icon:f?.active===!1?(0,O.jsx)(x,{}):(0,O.jsx)(C,{}),label:f?.active===!1?`Make Active`:`Make Inactive`}],Ae=(0,O.jsxs)(m,{direction:`vertical`,size:14,style:{width:`100%`},children:[(0,O.jsxs)(`div`,{className:`contact-group-show__stats`,children:[(0,O.jsx)(U,{title:`Contacts`,value:R?`-`:X,tone:`blue`,icon:(0,O.jsx)(y,{})}),(0,O.jsx)(U,{title:`Sub Groups`,value:R?`-`:Z,tone:`green`,icon:(0,O.jsx)(w,{})}),(0,O.jsx)(U,{title:`Status`,value:f?.active===!1?`Inactive`:`Active`,tone:f?.active===!1?`red`:`green`,icon:f?.active===!1?(0,O.jsx)(C,{}):(0,O.jsx)(x,{})})]}),(0,O.jsx)(H,{title:`Overview`,children:(0,O.jsx)(fe,{rows:[{label:`Group Name`,value:f?.name},{label:`Parent Group`,value:Y||`-`},{label:`Status`,value:(0,O.jsx)(V,{active:f?.active})},{label:`Contacts`,value:X},{label:`Sub Groups`,value:Z},{label:`Created At`,value:z(f?.created_at)},{label:`Updated At`,value:z(f?.updated_at)}]})}),(0,O.jsx)(H,{title:`Description`,children:(0,O.jsx)(oe,{style:{margin:0},children:(0,O.jsx)(de,{value:f?.description})})})]}),je=(0,O.jsx)(H,{title:`Contacts`,children:(0,O.jsx)(_,{icon:(0,O.jsx)(y,{}),title:`Contacts`,apiUrl:M(`/api/contacts/`),baseFilters:{contact_group_id:i},columns:Te,fields:Ee,validationSchema:E({name:T().required(`Name is required`),contact_type:T().required(`Contact type is required`),email:T().nullable().email(`Invalid email`)}),crudInitialValues:Oe,transformPayload:e=>({...e,name:N(e.name),code:N(e.code),phone:N(e.phone),email:N(e.email),pan:N(e.pan),tax_registration_no:N(e.tax_registration_no),tax_registration_type:N(e.tax_registration_type)||`none`,address:N(e.address),contact_group_id:i,credit_limit:e.credit_limit!==null&&e.credit_limit!==void 0&&e.credit_limit!==``?Number(e.credit_limit):0,accept_purchase:!!e.accept_purchase,active:e.active!==!1}),form_ui:`drawer`,drawerWidth:860,enableServerPagination:!0,showSearch:!0,canView:!0,canAdd:!0,canEdit:!0,canDelete:!0,hasActions:!0,hasActionColumns:!0,activeTableRowFunction:xe},`contacts-${i}`)}),Me=(0,O.jsx)(H,{title:`Sub Groups`,children:(0,O.jsx)(_,{icon:(0,O.jsx)(w,{}),title:`Sub Groups`,apiUrl:M(`/api/contact-groups/`),baseFilters:{parent_id:i},columns:Ce,fields:we,validationSchema:E({name:T().required(`Name is required`)}),crudInitialValues:De,transformPayload:e=>({...e,name:N(e.name),parent_id:i,description:N(e.description),active:e.active!==!1}),form_ui:`modal`,modalWidth:640,enableServerPagination:!0,showSearch:!0,canView:!0,canAdd:!0,canEdit:!0,canDelete:!0,hasActions:!0,hasActionColumns:!0,activeTableRowFunction:Se},`child-groups-${i}`)}),Ne=[{key:`overview`,label:`Overview`,count:null,content:Ae},{key:`contacts`,label:`Contacts`,count:X,content:je},{key:`groups`,label:`Sub Groups`,count:Z,content:Me}],Pe=Ne.find(e=>e.key===S)?.content||Ae,Fe={"--cgs-bg":a.colorBgLayout,"--cgs-surface":a.colorBgContainer,"--cgs-elevated":a.colorBgElevated,"--cgs-soft":a.colorFillAlter,"--cgs-muted":a.colorFillQuaternary,"--cgs-border":a.colorBorderSecondary,"--cgs-border-strong":a.colorBorder,"--cgs-text":a.colorText,"--cgs-text-secondary":a.colorTextSecondary,"--cgs-text-tertiary":a.colorTextTertiary,"--cgs-primary":a.colorPrimary,"--cgs-primary-bg":a.colorPrimaryBg,"--cgs-primary-border":a.colorPrimaryBorder,"--cgs-success":a.colorSuccess,"--cgs-success-bg":a.colorSuccessBg,"--cgs-warning":a.colorWarning,"--cgs-warning-bg":a.colorWarningBg,"--cgs-error":a.colorError,"--cgs-error-bg":a.colorErrorBg,"--cgs-radius":`${a.borderRadiusLG}px`,"--cgs-radius-sm":`${a.borderRadius}px`,"--cgs-padding":`${a.padding}px`,"--cgs-padding-lg":`${a.paddingLG}px`,"--cgs-padding-sm":`${a.paddingSM}px`,"--cgs-padding-xs":`${a.paddingXS}px`,"--cgs-font-sm":`${a.fontSizeSM}px`,"--cgs-font":`${a.fontSize}px`,"--cgs-font-lg":`${a.fontSizeLG}px`,"--cgs-shadow":a.boxShadowTertiary};return(0,O.jsxs)(re,{user:e?.user,header:(0,O.jsx)(me,{token:a,groupName:J,parentName:Y,goBack:ye,goEdit:Q,actionItems:ke,saving:he,onActionClick:({key:e})=>{e===`edit`&&Q(),e===`toggle-status`&&be()}}),children:[d,(0,O.jsx)(r,{title:J}),(0,O.jsx)(`style`,{children:`
        .contact-group-show {
          min-height: calc(100vh - 110px);
          background: var(--cgs-bg);
          color: var(--cgs-text);
          padding: var(--cgs-padding);
        }

        .contact-group-show__shell {
          max-width: 1600px;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          gap: var(--cgs-padding);
        }

        .contact-group-show__rail-card.ant-card,
        .contact-group-show__card.ant-card,
        .contact-group-show__metric.ant-card {
          border-color: var(--cgs-border);
          border-radius: var(--cgs-radius);
          box-shadow: var(--cgs-shadow);
          overflow: hidden;
        }

        .contact-group-show__body {
          display: grid;
          grid-template-columns: 310px minmax(0, 1fr);
          gap: var(--cgs-padding);
          align-items: start;
        }

        .contact-group-show__rail {
          position: sticky;
          top: var(--cgs-padding);
          min-width: 0;
        }

        .contact-group-show__rail-card .ant-card-body {
          padding: var(--cgs-padding);
          display: flex;
          flex-direction: column;
          gap: var(--cgs-padding-sm);
        }

        .contact-group-show__entity {
          display: flex;
          align-items: flex-start;
          gap: var(--cgs-padding-sm);
          padding-bottom: var(--cgs-padding-sm);
          border-bottom: 1px solid var(--cgs-border);
        }

        .contact-group-show__entity-title {
          margin: 0 !important;
          font-size: 18px !important;
          line-height: 1.25 !important;
          color: var(--cgs-text);
          word-break: break-word;
        }

        .contact-group-show__entity-subtitle {
          display: block;
          margin-top: 3px;
          font-size: var(--cgs-font-sm);
        }

        .contact-group-show__tags {
          display: flex;
          flex-wrap: wrap;
          gap: 5px;
          margin-top: 8px;
        }

        .contact-group-show__tag {
          margin-inline-end: 0 !important;
          font-size: 11px;
          line-height: 18px;
          padding-inline: 7px;
          border-radius: 999px;
        }

        .contact-group-show__rail-summary {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: var(--cgs-padding-sm);
        }

        .contact-group-show__mini-stat {
          border: 1px solid var(--cgs-border);
          background: var(--cgs-muted);
          border-radius: var(--cgs-radius-sm);
          padding: 10px;
        }

        .contact-group-show__mini-stat span {
          display: block;
          font-size: 11px;
          color: var(--cgs-text-secondary);
          margin-bottom: 4px;
        }

        .contact-group-show__mini-stat strong {
          font-size: 20px;
          line-height: 1.15;
          color: var(--cgs-text);
        }

        .contact-group-show__rail-grid {
          border: 1px solid var(--cgs-border);
          border-radius: var(--cgs-radius-sm);
          overflow: hidden;
          background: var(--cgs-surface);
        }

        .contact-group-show__rail-row {
          display: grid;
          grid-template-columns: 96px minmax(0, 1fr);
          border-bottom: 1px solid var(--cgs-border);
          font-size: var(--cgs-font-sm);
        }

        .contact-group-show__rail-row:last-child {
          border-bottom: 0;
        }

        .contact-group-show__rail-label {
          padding: 8px 10px;
          background: var(--cgs-muted);
          color: var(--cgs-text-secondary);
          font-weight: 700;
          border-right: 1px solid var(--cgs-border);
        }

        .contact-group-show__rail-value {
          padding: 8px 10px;
          color: var(--cgs-text);
          word-break: break-word;
        }

        .contact-group-show__tabs {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .contact-group-show__tab {
          width: 100%;
          min-height: 38px;
          border: 1px solid transparent;
          border-radius: var(--cgs-radius-sm);
          background: transparent;
          color: var(--cgs-text-secondary);
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          padding: 0 11px;
          cursor: pointer;
          font-size: var(--cgs-font-sm);
          font-weight: 800;
          text-align: left;
          transition: 0.16s ease;
        }

        .contact-group-show__tab:hover {
          background: var(--cgs-muted);
          color: var(--cgs-text);
        }

        .contact-group-show__tab--active {
          background: var(--cgs-primary-bg);
          color: var(--cgs-primary);
          border-color: var(--cgs-primary-border);
        }

        .contact-group-show__tab-count {
          min-width: 22px;
          height: 20px;
          padding: 0 7px;
          border-radius: 999px;
          background: var(--cgs-surface);
          border: 1px solid var(--cgs-border);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: 11px;
        }

        .contact-group-show__main {
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: var(--cgs-padding);
          overflow: hidden;
        }

        .contact-group-show__stats {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: var(--cgs-padding-sm);
        }

        .contact-group-show__metric {
          position: relative;
        }

        .contact-group-show__metric::before {
          content: '';
          position: absolute;
          inset-inline: 0;
          top: 0;
          height: 3px;
          background: var(--cgs-border-strong);
        }

        .contact-group-show__metric--blue::before {
          background: var(--cgs-primary);
        }

        .contact-group-show__metric--green::before {
          background: var(--cgs-success);
        }

        .contact-group-show__metric--red::before {
          background: var(--cgs-error);
        }

        .contact-group-show__metric .ant-card-body {
          padding: var(--cgs-padding);
        }

        .contact-group-show__metric-inner {
          display: flex;
          align-items: flex-start;
          gap: var(--cgs-padding-sm);
        }

        .contact-group-show__metric-icon {
          width: 38px;
          height: 38px;
          border-radius: 999px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          color: var(--cgs-primary);
          background: var(--cgs-primary-bg);
          flex: none;
          font-size: 17px;
        }

        .contact-group-show__metric--green .contact-group-show__metric-icon {
          color: var(--cgs-success);
          background: var(--cgs-success-bg);
        }

        .contact-group-show__metric--red .contact-group-show__metric-icon {
          color: var(--cgs-error);
          background: var(--cgs-error-bg);
        }

        .contact-group-show__metric-content {
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .contact-group-show__metric-content strong {
          font-size: 22px;
          line-height: 1.15;
          color: var(--cgs-text);
          word-break: break-word;
        }

        .contact-group-show__card.ant-card {
          background: var(--cgs-surface);
        }

        .contact-group-show__card .ant-card-head {
          min-height: 46px;
          padding: 0 var(--cgs-padding);
          border-bottom: 1px solid var(--cgs-border);
          background: var(--cgs-elevated);
        }

        .contact-group-show__card .ant-card-head-title {
          font-size: var(--cgs-font);
          font-weight: 800;
          color: var(--cgs-text);
        }

        .contact-group-show__card .ant-card-body {
          padding: var(--cgs-padding);
          min-width: 0;
        }

        .contact-group-show__info-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          border: 1px solid var(--cgs-border);
          border-radius: var(--cgs-radius-sm);
          overflow: hidden;
          font-size: var(--cgs-font-sm);
          background: var(--cgs-surface);
        }

        .contact-group-show__info-item {
          display: grid;
          grid-template-columns: 150px minmax(0, 1fr);
          border-right: 1px solid var(--cgs-border);
          border-bottom: 1px solid var(--cgs-border);
          min-width: 0;
        }

        .contact-group-show__info-item:nth-child(2n) {
          border-right: 0;
        }

        .contact-group-show__info-item:nth-last-child(-n + 2) {
          border-bottom: 0;
        }

        .contact-group-show__info-label {
          padding: 9px 11px;
          background: var(--cgs-muted);
          color: var(--cgs-text-secondary);
          font-weight: 700;
          border-right: 1px solid var(--cgs-border);
          white-space: nowrap;
        }

        .contact-group-show__info-value {
          padding: 9px 11px;
          background: var(--cgs-surface);
          color: var(--cgs-text);
          word-break: break-word;
          min-width: 0;
        }

        .contact-group-show .ant-table {
          font-size: var(--cgs-font-sm);
        }

        .contact-group-show .ant-table-wrapper .ant-table-container {
          border-radius: var(--cgs-radius-sm);
          overflow: hidden;
        }

        .contact-group-show .ant-table-thead > tr > th {
          padding: 9px 11px !important;
          background: var(--cgs-muted) !important;
          font-weight: 800;
          color: var(--cgs-text-secondary) !important;
          border-color: var(--cgs-border) !important;
          white-space: nowrap;
        }

        .contact-group-show .ant-table-tbody > tr > td {
          padding: 8px 11px !important;
          vertical-align: middle;
          border-color: var(--cgs-border) !important;
        }

        .contact-group-show .ant-table-tbody > tr:hover > td {
          background: var(--cgs-muted) !important;
        }

        .contact-group-show__state {
          padding: var(--cgs-padding-lg);
          background: var(--cgs-surface);
          border: 1px solid var(--cgs-border);
          border-radius: var(--cgs-radius);
          box-shadow: var(--cgs-shadow);
        }

        @media (max-width: 1100px) {
          .contact-group-show__body {
            grid-template-columns: 1fr;
          }

          .contact-group-show__rail {
            position: static;
          }

          .contact-group-show__rail-card .ant-card-body {
            display: grid;
            grid-template-columns: auto minmax(0, 1fr);
            align-items: start;
          }

          .contact-group-show__entity,
          .contact-group-show__rail-summary,
          .contact-group-show__rail-grid,
          .contact-group-show__tabs {
            grid-column: 1 / -1;
          }

          .contact-group-show__tabs {
            flex-direction: row;
            overflow-x: auto;
          }

          .contact-group-show__tab {
            width: auto;
            min-width: 132px;
            white-space: nowrap;
            flex: none;
          }
        }

        @media (max-width: 768px) {
          .contact-group-show {
            padding: var(--cgs-padding-sm);
          }

          .contact-group-show__stats,
          .contact-group-show__info-grid,
          .contact-group-show__rail-summary {
            grid-template-columns: 1fr;
          }

          .contact-group-show__info-item {
            grid-template-columns: 1fr;
            border-right: 0;
          }

          .contact-group-show__info-item:nth-last-child(-n + 2) {
            border-bottom: 1px solid var(--cgs-border);
          }

          .contact-group-show__info-item:last-child {
            border-bottom: 0;
          }

          .contact-group-show__info-label {
            border-right: 0;
            border-bottom: 1px solid var(--cgs-border);
          }

          .contact-group-show__rail-row {
            grid-template-columns: 1fr;
          }

          .contact-group-show__rail-label {
            border-right: 0;
            border-bottom: 1px solid var(--cgs-border);
          }

          .contact-group-show__card .ant-card-body {
            overflow-x: auto;
          }
        }
      `}),(0,O.jsx)(`div`,{className:`contact-group-show`,style:Fe,children:(0,O.jsxs)(`div`,{className:`contact-group-show__shell`,children:[K?(0,O.jsx)(`div`,{className:`contact-group-show__state`,children:(0,O.jsx)(s,{type:`error`,message:K,showIcon:!0,closable:!0,onClose:()=>q(``)})}):null,P?(0,O.jsx)(`div`,{className:`contact-group-show__state`,children:(0,O.jsx)(ee,{active:!0,paragraph:{rows:8}})}):null,!P&&!f&&!K?(0,O.jsx)(`div`,{className:`contact-group-show__state`,children:(0,O.jsx)(l,{description:`Contact group not found`})}):null,!P&&f?(0,O.jsxs)(`div`,{className:`contact-group-show__body`,children:[(0,O.jsx)(`aside`,{className:`contact-group-show__rail`,children:(0,O.jsxs)(p,{className:`contact-group-show__rail-card`,children:[(0,O.jsxs)(`div`,{className:`contact-group-show__entity`,children:[(0,O.jsx)(u,{size:48,icon:(0,O.jsx)(o,{}),style:{background:a.colorPrimaryBg,color:a.colorPrimary,flex:`none`}}),(0,O.jsxs)(`div`,{style:{minWidth:0},children:[(0,O.jsx)(k,{level:4,className:`contact-group-show__entity-title`,children:J}),(0,O.jsx)(A,{type:`secondary`,className:`contact-group-show__entity-subtitle`,children:Y?`Under ${Y}`:`Root contact group`}),(0,O.jsx)(`div`,{className:`contact-group-show__tags`,children:(0,O.jsx)(V,{active:f?.active})})]})]}),(0,O.jsxs)(`div`,{className:`contact-group-show__rail-summary`,children:[(0,O.jsxs)(`div`,{className:`contact-group-show__mini-stat`,children:[(0,O.jsx)(`span`,{children:`Contacts`}),(0,O.jsx)(`strong`,{children:R?`-`:X})]}),(0,O.jsxs)(`div`,{className:`contact-group-show__mini-stat`,children:[(0,O.jsx)(`span`,{children:`Sub Groups`}),(0,O.jsx)(`strong`,{children:R?`-`:Z})]})]}),(0,O.jsx)(pe,{rows:[{label:`Parent`,value:Y||`-`},{label:`Status`,value:(0,O.jsx)(V,{active:f?.active})},{label:`Created`,value:z(f?.created_at)},{label:`Updated`,value:z(f?.updated_at)}]}),(0,O.jsx)(`div`,{className:`contact-group-show__tabs`,children:Ne.map(e=>(0,O.jsxs)(`button`,{type:`button`,className:`contact-group-show__tab ${S===e.key?`contact-group-show__tab--active`:``}`,onClick:()=>j(e.key),children:[(0,O.jsx)(`span`,{children:e.label}),e.count!==null&&e.count!==void 0?(0,O.jsx)(`span`,{className:`contact-group-show__tab-count`,children:e.count}):null]},e.key))})]})}),(0,O.jsx)(`main`,{className:`contact-group-show__main`,children:Pe})]}):null]})})]})}export{W as default};