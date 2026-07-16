import{i as e}from"./chunk-62oNxeRG.js";import{i as t}from"./axios-CFfZBleg.js";import{r as n,t as r}from"./jsx-runtime-gigNY91P.js";import{t as i}from"./select-BmOvnPIw.js";import{t as a}from"./empty-BZQ-tvZU.js";import{t as o}from"./SearchOutlined-Crr96xZS.js";import{t as s}from"./PlusOutlined-HIrDAG4O.js";import{t as c}from"./dropdown-kzbiVvRS.js";import{t as l}from"./button-Dz1Av4BD.js";import{t as u}from"./tabs-BYU3tg5F.js";import{t as d}from"./card-Vt669Ygr.js";import{n as f,t as p}from"./row-BjiB-KD9.js";import{t as ee}from"./space-DwTT9ayb.js";import{t as te}from"./input-BDCOVLHk.js";import{t as ne}from"./EyeOutlined-DZ2pvFMs.js";import{n as re,t as m}from"./typography-COSGzUQY.js";import{t as h}from"./message-G__c7vuu.js";import{t as g}from"./ReloadOutlined-D8To57B1.js";import{t as _}from"./tag-CxQ8hfzV.js";import{t as v}from"./ReusableCrud-B_IBu4Iv.js";import{t as y}from"./DeleteOutlined-D5JqvZYn.js";import{t as ie}from"./EditOutlined-MYYWDS3l.js";import{i as b,t as ae}from"./index.esm-s6VguL6m.js";import{t as oe}from"./AuthenticatedLayout-Clfz6EYL.js";import{t as x}from"./BankOutlined-CElAlwXB.js";import{t as se}from"./MoreOutlined-M1t-PyHU.js";import{t as S}from"./WalletOutlined-DIhyGJLs.js";import{i as ce}from"./defaultCurrency-y7317jy2.js";import{a as C,i as w,n as le,o as T}from"./index.esm-Bnj5Dmy_.js";import{r as E}from"./currency-DkqOWW_K.js";var D=e(n(),1),O=r(),{Text:k,Title:A}=m,j=``,M=e=>`${j}${e}`,N=()=>{let e=typeof window<`u`?localStorage.getItem(`accessToken`):null;return e?{Authorization:`Bearer ${e}`}:{}},P=(...e)=>{for(let t of e)if(t!=null&&String(t).trim()!==``)return t;return`-`},F=(e={})=>Object.fromEntries(Object.entries(e).filter(([,e])=>e!=null&&e!==``)),I=(e,t={})=>{let n=F(t),r=Object.entries(n).map(([e,t])=>`${encodeURIComponent(e)}=${encodeURIComponent(t)}`).join(`&`);return r?e.includes(`?`)?`${e}&${r}`:`${e}?${r}`:e},L=e=>{if(e==null)return!1;let t=String(e).trim();return t!==``&&t!==`-`},R=(e,t)=>{let n=e?.type===`bank`;return[[`Account Type`,n?`Bank Account`:`Cash Account`],[`Display Name`,e?.display_name],[`Code`,e?.code],[`Currency`,t],...n?[[`Bank Name`,e?.bank_name],[`Account Name`,e?.account_name],[`Account Number`,e?.account_number],[`Bank Account Type`,e?.account_type],[`Swift Code`,e?.swift_code]]:[],[`Description`,e?.description]].filter(([,e])=>L(e)).map(([e,t])=>`${e}: ${t}`).join(`
`)},z=async e=>{if(!e)return!1;try{if(navigator?.clipboard?.writeText)return await navigator.clipboard.writeText(e),!0}catch(e){console.warn(e)}let t=document.createElement(`textarea`);t.value=e,t.style.position=`fixed`,t.style.left=`-9999px`,t.style.top=`-9999px`,document.body.appendChild(t),t.focus(),t.select();let n=document.execCommand(`copy`);return document.body.removeChild(t),n};function B(){let e=M(`/api/bank-accounts/`),{formatMoney:n}=E(),r=ce(!0),[m,k]=(0,D.useState)([]),[j,F]=(0,D.useState)(!1),[L,B]=(0,D.useState)(``),[V,H]=(0,D.useState)(``),[U,W]=(0,D.useState)(`all`),[G,K]=(0,D.useState)({current:1,pageSize:20,total:0}),[q,J]=(0,D.useState)(0),[ue,Y]=(0,D.useState)(`add`),[de,X]=(0,D.useState)(null),[fe,Z]=(0,D.useState)(``),Q=(0,D.useMemo)(()=>U===`inactive`?`false`:`all`,[U]),$=(0,D.useCallback)(async({page:n,pageSize:r,search:i,type:a,active:o}={})=>{try{F(!0);let s=o??Q,c=I(e,{page:n??G.current,page_size:r??G.pageSize,search:i??L,type:a??V,active:s===`all`?void 0:s,ordering:`display_name`}),l=(await t.get(c,{headers:N()}))?.data;if(Array.isArray(l?.results)){k(l.results),K(e=>({...e,current:n??e.current,pageSize:r??e.pageSize,total:Number(l.count||0)}));return}if(Array.isArray(l)){k(l),K(e=>({...e,current:1,total:l.length}));return}k([]),K(e=>({...e,total:0}))}catch(e){console.error(e),h.error(`Failed to load bank accounts.`)}finally{F(!1)}},[e,G.current,G.pageSize,L,V,Q]);(0,D.useEffect)(()=>{$({page:1})},[$]),(0,D.useEffect)(()=>{let e=!1;return t.get(M(`/api/app-settings/current`),{headers:N()}).then(t=>{if(e)return;let n=t.data?.data??t.data??{},r=n.legal_name||n.company_name||``;Z(String(r||``).trim())}).catch(()=>{e||Z(``)}),()=>{e=!0}},[]);let pe=()=>{Y(`add`),X(null),J(e=>e+1)},me=e=>{Y(`edit`),X(e.id),J(e=>e+1)},he=async n=>{try{await t.put(`${e.replace(/\/+$/,``)}/${n.id}`,{active:!1},{headers:N()}),h.success(`Bank account made inactive.`),$()}catch(e){console.error(e),h.error(`Failed to update bank account.`)}},ge=async n=>{try{await t.put(`${e.replace(/\/+$/,``)}/${n.id}`,{active:!0},{headers:N()}),h.success(`Bank account activated.`),$()}catch(e){console.error(e),h.error(`Failed to update bank account.`)}},_e=async e=>{let t=R(e,P(e?.currency_name,e?.currency?.label,e?.currency?.code,e?.currency?.name));if(!t){h.warning(`No bank account information available to copy.`);return}await z(t)?h.success(`Bank account details copied.`):h.error(`Failed to copy bank account details.`)},ve=({values:e,setFieldValue:t,readOnly:n})=>{let r=e?.type;return(0,O.jsx)(`div`,{style:{display:`flex`,gap:8,flexWrap:`wrap`},children:[{value:`bank`,label:`Bank`,icon:(0,O.jsx)(x,{})},{value:`cash`,label:`Cash`,icon:(0,O.jsx)(S,{})}].map(e=>{let i=r===e.value;return(0,O.jsxs)(`button`,{type:`button`,disabled:n,onClick:()=>{t(`type`,e.value),e.value===`cash`&&(t(`bank_name`,``),t(`account_name`,``),t(`account_number`,``),t(`account_type`,``),t(`swift_code`,``))},style:{width:130,height:40,border:i?`1px solid #1677ff`:`1px solid #d9dee7`,background:i?`#fff`:`#f8fafc`,borderRadius:4,cursor:n?`not-allowed`:`pointer`,display:`flex`,alignItems:`center`,justifyContent:`center`,gap:8,fontSize:13,fontWeight:600},children:[e.icon,(0,O.jsx)(`span`,{children:e.label})]},e.value)})})},ye=e=>()=>(0,O.jsx)(`div`,{style:{fontSize:12,fontWeight:700,color:`#667085`,marginBottom:-8},children:e}),be=(0,D.useMemo)(()=>[{name:`type`,label:`Type`,type:`custom`,required:!0,col:24,render:ve},{name:`bank_name`,label:`Bank`,type:`text`,required:!0,col:24,placeholder:`Bank name`,condition:e=>e?.type===`bank`},{name:`display_name`,label:`Display Name`,type:`text`,required:!0,col:24,placeholder:`Display name`},{name:`code`,label:`Code`,type:`text`,readOnly:!0,col:12,placeholder:`Auto-generated`},{name:`currency_id`,label:`Currency`,type:`fkSelect`,required:!0,col:12,placeholder:`Select currency`,fkUrl:`/api/currencies/`,fkSearchParam:`search`,fkPageSize:20,fkValueKey:`id`,fkLabelKey:`name`,labelField:`currency_name`,fkExtraParams:{active:!0},fkLabel:e=>[e?.code||``,e?.name||``].filter(Boolean).join(` - `)},{name:`bank_info_title`,label:``,type:`custom`,col:24,render:ye(`Bank Info`),condition:e=>e?.type===`bank`},{name:`account_name`,label:`Account Name`,type:`text`,col:12,placeholder:`Account name`,condition:e=>e?.type===`bank`},{name:`account_number`,label:`Account Number`,type:`text`,col:12,placeholder:`Account number`,condition:e=>e?.type===`bank`},{name:`account_type`,label:`Account Type`,type:`select`,col:12,placeholder:`Select...`,options:[{value:`saving`,label:`Saving Account`},{value:`current`,label:`Current Account`},{value:`checking`,label:`Checking Account`},{value:`fixed_deposit`,label:`Fixed Deposit`},{value:`loan`,label:`Loan Account`},{value:`overdraft`,label:`Overdraft Account`}],condition:e=>e?.type===`bank`},{name:`swift_code`,label:`Swift Code`,type:`text`,col:12,placeholder:`Swift code`,condition:e=>e?.type===`bank`},{name:`description`,label:`Description`,type:`textarea`,col:24,rows:1,placeholder:`Description`}],[]),xe=le().shape({type:w().oneOf([`bank`,`cash`]).required(`Type is required`),display_name:w().trim().max(150,`Display name cannot exceed 150 characters`).required(`Display Name is required`),currency_id:T().nullable().required(`Currency is required`),bank_name:w().when(`type`,{is:`bank`,then:e=>e.trim().max(150,`Bank name cannot exceed 150 characters`).required(`Bank is required`),otherwise:e=>e.nullable()}),account_name:w().nullable().max(150),account_number:w().nullable().max(80),account_type:w().nullable().max(50),swift_code:w().nullable().max(50),description:w().nullable(),active:C().nullable(),is_system_generated:C().nullable()}),Se={type:`bank`,display_name:``,currency_id:r?.id??null,currency_id_detail:r??null,currency_name:r?[r.code,r.name].filter(Boolean).join(` - `):``,description:``,bank_name:``,account_name:fe,account_number:``,account_type:``,swift_code:``,active:!0,is_system_generated:!1},Ce=e=>{let t=e.type===`bank`,n={type:e.type||`bank`,display_name:e.display_name?.trim()||null,code:e.code?.trim()||null,currency_id:e.currency_id||null,description:e.description?.trim()||null,bank_name:t&&e.bank_name?.trim()||null,account_name:t&&e.account_name?.trim()||null,account_number:t&&e.account_number?.trim()||null,account_type:t&&e.account_type||null,swift_code:t&&e.swift_code?.trim()||null,active:e.active!==!1,is_system_generated:!!e.is_system_generated};return Object.keys(n).forEach(e=>{n[e]===``&&(n[e]=null)}),n},we=(e,{setFieldValue:t})=>{let n=e?.currency_id_detail;if(n){let r=n.label||[n.code,n.name].filter(Boolean).join(` - `)||n.name||``;r&&e.currency_name!==r&&t(`currency_name`,r,!1)}},Te=(0,D.useMemo)(()=>[{title:`Display Name`,dataIndex:`display_name`,key:`display_name`}],[]);return(0,O.jsxs)(oe,{header:(0,O.jsxs)(`div`,{className:`bank-page__layout-header`,children:[(0,O.jsx)(`div`,{children:(0,O.jsx)(A,{level:5,className:`bank-page__title`,children:`Bank Accounts`})}),(0,O.jsxs)(ee,{size:8,children:[(0,O.jsx)(l,{size:`small`,icon:(0,O.jsx)(g,{}),onClick:()=>$(),children:`Reload`}),(0,O.jsx)(l,{size:`small`,type:`primary`,icon:(0,O.jsx)(s,{}),onClick:pe,children:`Add New`})]})]}),children:[(0,O.jsx)(ae,{title:`Bank Accounts`}),(0,O.jsx)(`style`,{children:`
                .bank-page {
                    min-height: calc(100vh - 100px);
                    background: #f5f7fb;
                    padding: 8px;
                }

                .bank-page__layout-header {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 12px;
                    min-height: 32px;
                }

                .bank-page__title {
                    margin: 0 !important;
                    line-height: 1.1 !important;
                    font-size: 16px !important;
                }

                .bank-page__toolbar-card {
                    margin-bottom: 8px;
                    border-radius: 4px;
                    border: 1px solid #e5e7eb;
                }

                .bank-page__toolbar-card .ant-card-body {
                    padding: 8px;
                }

                .bank-page__toolbar {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 8px;
                    flex-wrap: wrap;
                }

                .bank-page__toolbar-left {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    flex-wrap: wrap;
                }

                .bank-page__cards {
                    margin-top: 2px;
                }

                .bank-page__compact-card.ant-card {
                    border: 1px solid #dbe1ea;
                    border-radius: 10px;
                    box-shadow: none;
                    height: 100%;
                    cursor: pointer;
                }

                .bank-page__compact-card .ant-card-body {
                    padding: 12px;
                }

                .bank-page__card-head {
                    display: flex;
                    align-items: flex-start;
                    justify-content: space-between;
                    gap: 8px;
                    margin-bottom: 8px;
                }

                .bank-page__card-left {
                    display: flex;
                    align-items: flex-start;
                    gap: 10px;
                    min-width: 0;
                    flex: 1;
                }

                .bank-page__avatar {
                    width: 38px;
                    height: 38px;
                    border-radius: 999px;
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    flex: none;
                    font-size: 16px;
                    background: #eef4ff;
                    color: #1677ff;
                }

                .bank-page__avatar.cash {
                    background: #edf9ee;
                    color: #22c55e;
                }

                .bank-page__name {
                    margin: 0 !important;
                    font-size: 14px !important;
                    line-height: 1.25 !important;
                    color: #1d4ed8 !important;
                }

                .bank-page__subname {
                    display: block;
                    margin-top: 2px;
                    font-size: 12px;
                    font-weight: 600;
                    color: #1f2937;
                    line-height: 1.2;
                }

                .bank-page__amount {
                    margin: 8px 0 10px 0;
                    font-size: 14px;
                    font-weight: 500;
                    color: #1f2937;
                }

                .bank-page__tags {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 6px;
                }

                .bank-page__tags .ant-tag {
                    margin-inline-end: 0;
                    margin-bottom: 0;
                    border-radius: 999px;
                    font-size: 11px;
                    line-height: 20px;
                    padding: 0 8px;
                }

                .bank-page__empty-card .ant-card-body {
                    padding: 22px;
                }

                .bank-page .ant-tabs-nav {
                    margin-bottom: 0 !important;
                }

                .bank-page .ant-tabs-tab {
                    padding-top: 6px !important;
                    padding-bottom: 10px !important;
                }

                .bank-page__hidden-crud {
                    display: none;
                }
            `}),(0,O.jsxs)(`div`,{className:`bank-page`,children:[(0,O.jsx)(d,{className:`bank-page__toolbar-card`,bordered:!1,children:(0,O.jsxs)(`div`,{className:`bank-page__toolbar`,children:[(0,O.jsxs)(`div`,{className:`bank-page__toolbar-left`,children:[(0,O.jsx)(te,{allowClear:!0,size:`small`,prefix:(0,O.jsx)(o,{}),placeholder:`Search bank, code, account no...`,value:L,onChange:e=>B(e.target.value),onPressEnter:()=>$({page:1,search:L}),style:{width:260}}),(0,O.jsx)(i,{allowClear:!0,size:`small`,placeholder:`Type`,value:V||void 0,onChange:e=>{let t=e||``;H(t),$({page:1,type:t})},style:{width:120},options:[{value:`bank`,label:`Bank`},{value:`cash`,label:`Cash`}]}),(0,O.jsx)(l,{size:`small`,type:`primary`,icon:(0,O.jsx)(o,{}),onClick:()=>$({page:1,search:L,type:V,active:Q}),children:`Search`})]}),(0,O.jsx)(u,{activeKey:U,onChange:e=>{W(e),$({page:1,active:e===`inactive`?`false`:`all`})},items:[{key:`all`,label:`All`},{key:`inactive`,label:`Inactive`}]})]})}),m.length<1&&!j?(0,O.jsx)(d,{className:`bank-page__empty-card`,children:(0,O.jsx)(a,{description:`No bank accounts found`})}):(0,O.jsx)(p,{gutter:[12,12],className:`bank-page__cards`,children:m.map(e=>{let t=e?.type===`bank`,r=P(e?.currency_name,e?.currency?.label,e?.currency?.code,e?.currency?.name),i=n(e?.current_balance??e?.software_ledger_balance??0),a=[{key:`view`,label:`View Details`,icon:(0,O.jsx)(ne,{})},{key:`copy`,label:`Copy Details`,icon:(0,O.jsx)(re,{})},{key:`edit`,label:`Edit`,icon:(0,O.jsx)(ie,{})},{key:e?.active===!1?`restore`:`delete`,label:e?.active===!1?`Make Active`:`Make Inactive`,icon:(0,O.jsx)(y,{}),danger:e?.active!==!1}];return(0,O.jsx)(f,{xs:24,sm:12,md:12,lg:8,xl:6,children:(0,O.jsxs)(d,{hoverable:!0,className:`bank-page__compact-card`,onClick:()=>b.visit(route(`accounting.bank-accounts.show`,e.id)),children:[(0,O.jsxs)(`div`,{className:`bank-page__card-head`,children:[(0,O.jsxs)(`div`,{className:`bank-page__card-left`,children:[(0,O.jsx)(`span`,{className:`bank-page__avatar ${t?``:`cash`}`,children:t?(0,O.jsx)(x,{}):(0,O.jsx)(S,{})}),(0,O.jsxs)(`div`,{style:{minWidth:0},children:[(0,O.jsx)(A,{level:5,className:`bank-page__name`,children:e?.display_name||`-`}),(0,O.jsx)(`span`,{className:`bank-page__subname`,children:e?.bank_name||e?.account_name||(t?`Bank Account`:`Cash Account`)})]})]}),(0,O.jsx)(c,{menu:{items:a,onClick:({key:t,domEvent:n})=>{n?.stopPropagation?.(),t===`view`&&b.visit(route(`accounting.bank-accounts.show`,e.id)),t===`copy`&&_e(e),t===`edit`&&me(e),t===`delete`&&he(e),t===`restore`&&ge(e)}},trigger:[`click`],children:(0,O.jsx)(l,{type:`text`,size:`small`,icon:(0,O.jsx)(se,{}),onClick:e=>e.stopPropagation()})})]}),(0,O.jsx)(`div`,{className:`bank-page__amount`,children:i}),(0,O.jsxs)(`div`,{className:`bank-page__tags`,children:[(0,O.jsx)(_,{color:t?`blue`:`green`,children:t?`Bank`:`Cash`}),(0,O.jsx)(_,{children:r}),e?.code?(0,O.jsx)(_,{children:e.code}):null,(0,O.jsx)(_,{color:e?.active===!1?`default`:`success`,children:e?.active===!1?`Inactive`:`Active`}),e?.account_type&&t?(0,O.jsx)(_,{children:e.account_type}):null,e?.account_number&&t?(0,O.jsxs)(_,{children:[`Acc: `,e.account_number]}):null,e?.swift_code&&t?(0,O.jsxs)(_,{children:[`Swift: `,e.swift_code]}):null,e?.description?(0,O.jsx)(_,{children:e.description}):null]})]})},e.id)})})]}),(0,O.jsx)(`div`,{className:`bank-page__hidden-crud`,children:(0,O.jsx)(v,{icon:(0,O.jsx)(x,{}),title:`Bank Account`,apiUrl:e,columns:Te,fields:be,validationSchema:xe,crudInitialValues:Se,transformPayload:Ce,onFormValuesChange:we,form_ui:`modal`,modalWidth:680,openOnMount:q>0,openMode:ue,openEditId:de,onAddSuccess:()=>$(),onEditSuccess:()=>$(),enableServerPagination:!0,pageParam:`page`,pageSizeParam:`page_size`,searchParam:`search`,activeParam:`active`,sortMode:`ordering`,orderingParam:`ordering`,defaultSortField:`display_name`,defaultSortOrder:`ascend`,showSearch:!1,enableInactiveDrawer:!1,canAdd:!0,canEdit:!0,canDelete:!1,canView:!1,hasActions:!1,hasActionColumns:!1},`bank-account-form-${q}`)})]})}export{B as default};