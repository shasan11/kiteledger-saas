import{i as e}from"./rolldown-runtime-aKtaBQYM.js";import{t}from"./axios-BQPRRFHk.js";import{i as n,t as r}from"./index.esm-CtIVDvdE.js";import{r as i,t as a}from"./jsx-runtime-RbF_zoRI.js";import{n as o,t as s}from"./typography-BTjN9rxU.js";import{t as c}from"./select-BHNpiCXT.js";import{t as l}from"./empty-BOJtdRz7.js";import{t as u}from"./SearchOutlined-obcpVUK3.js";import{t as ee}from"./PlusOutlined-pba_3Pld.js";import{t as te}from"./dropdown-BkC9qBXY.js";import{t as d}from"./button-DdnyfjyJ.js";import{t as f}from"./tabs-D6mM-bRn.js";import{t as p}from"./card-DkP92y8s.js";import{n as ne,t as m}from"./row-3lWxq59F.js";import{t as h}from"./space-_4B_xOOu.js";import{t as g}from"./input-D-fdS88J.js";import{t as _}from"./EyeOutlined-DWmMawEw.js";import{t as v}from"./message-Lq1UzMpA.js";import{t as y}from"./ReloadOutlined-CMtviqc6.js";import{t as b}from"./tag-Dh3NArqV.js";import{t as re}from"./ReusableCrud-hdcDvsu0.js";import{t as ie}from"./DeleteOutlined-CjnT_w1K.js";import{t as ae}from"./EditOutlined-DDNyn6SO.js";import{t as oe}from"./AuthenticatedLayout-pySdsG0n.js";import{t as x}from"./BankOutlined-DP0-4QOY.js";import{t as se}from"./MoreOutlined-BocTFMVG.js";import{t as S}from"./WalletOutlined-D-eP3Umz.js";import{i as ce}from"./defaultCurrency-CBwoHQOC.js";import{a as C,i as w,n as le,o as ue}from"./index.esm-CBn_TnkU.js";import{r as T}from"./currency-C34x0B2L.js";var E=e(i(),1),D=a(),{Text:O,Title:k}=s,A=``,j=e=>`${A}${e}`,M=()=>{let e=typeof window<`u`?localStorage.getItem(`accessToken`):null;return e?{Authorization:`Bearer ${e}`}:{}},N=(...e)=>{for(let t of e)if(t!=null&&String(t).trim()!==``)return t;return`-`},P=(e={})=>Object.fromEntries(Object.entries(e).filter(([,e])=>e!=null&&e!==``)),F=(e,t={})=>{let n=P(t),r=Object.entries(n).map(([e,t])=>`${encodeURIComponent(e)}=${encodeURIComponent(t)}`).join(`&`);return r?e.includes(`?`)?`${e}&${r}`:`${e}?${r}`:e},I=e=>{if(e==null)return!1;let t=String(e).trim();return t!==``&&t!==`-`},L=(e,t)=>{let n=e?.type===`bank`;return[[`Account Type`,n?`Bank Account`:`Cash Account`],[`Display Name`,e?.display_name],[`Code`,e?.code],[`Currency`,t],...n?[[`Bank Name`,e?.bank_name],[`Account Name`,e?.account_name],[`Account Number`,e?.account_number],[`Bank Account Type`,e?.account_type],[`Swift Code`,e?.swift_code]]:[],[`Description`,e?.description]].filter(([,e])=>I(e)).map(([e,t])=>`${e}: ${t}`).join(`
`)},R=async e=>{if(!e)return!1;try{if(navigator?.clipboard?.writeText)return await navigator.clipboard.writeText(e),!0}catch(e){console.warn(e)}let t=document.createElement(`textarea`);t.value=e,t.style.position=`fixed`,t.style.left=`-9999px`,t.style.top=`-9999px`,document.body.appendChild(t),t.focus(),t.select();let n=document.execCommand(`copy`);return document.body.removeChild(t),n};function z(){let e=j(`/api/bank-accounts/`),{formatMoney:i}=T(),a=ce(!0),[s,O]=(0,E.useState)([]),[A,P]=(0,E.useState)(!1),[I,z]=(0,E.useState)(``),[B,V]=(0,E.useState)(``),[H,U]=(0,E.useState)(`all`),[W,G]=(0,E.useState)({current:1,pageSize:20,total:0}),[K,q]=(0,E.useState)(0),[de,J]=(0,E.useState)(`add`),[fe,Y]=(0,E.useState)(null),[pe,X]=(0,E.useState)(``),Z=(0,E.useMemo)(()=>H===`inactive`?`false`:`all`,[H]),Q=(0,E.useCallback)(async({page:n,pageSize:r,search:i,type:a,active:o}={})=>{try{P(!0);let s=o??Z,c=F(e,{page:n??W.current,page_size:r??W.pageSize,search:i??I,type:a??B,active:s===`all`?void 0:s,ordering:`display_name`}),l=(await t.get(c,{headers:M()}))?.data;if(Array.isArray(l?.results)){O(l.results),G(e=>({...e,current:n??e.current,pageSize:r??e.pageSize,total:Number(l.count||0)}));return}if(Array.isArray(l)){O(l),G(e=>({...e,current:1,total:l.length}));return}O([]),G(e=>({...e,total:0}))}catch(e){console.error(e),v.error(`Failed to load bank accounts.`)}finally{P(!1)}},[e,W.current,W.pageSize,I,B,Z]);(0,E.useEffect)(()=>{Q({page:1})},[Q]),(0,E.useEffect)(()=>{let e=!1;return t.get(j(`/api/app-settings/current`),{headers:M()}).then(t=>{if(e)return;let n=t.data?.data??t.data??{},r=n.legal_name||n.company_name||``;X(String(r||``).trim())}).catch(()=>{e||X(``)}),()=>{e=!0}},[]);let me=()=>{J(`add`),Y(null),q(e=>e+1)},he=e=>{J(`edit`),Y(e.id),q(e=>e+1)},$=async n=>{try{await t.put(`${e.replace(/\/+$/,``)}/${n.id}`,{active:!1},{headers:M()}),v.success(`Bank account made inactive.`),Q()}catch(e){console.error(e),v.error(`Failed to update bank account.`)}},ge=async n=>{try{await t.put(`${e.replace(/\/+$/,``)}/${n.id}`,{active:!0},{headers:M()}),v.success(`Bank account activated.`),Q()}catch(e){console.error(e),v.error(`Failed to update bank account.`)}},_e=async e=>{let t=L(e,N(e?.currency_name,e?.currency?.label,e?.currency?.code,e?.currency?.name));if(!t){v.warning(`No bank account information available to copy.`);return}await R(t)?v.success(`Bank account details copied.`):v.error(`Failed to copy bank account details.`)},ve=({values:e,setFieldValue:t,readOnly:n})=>{let r=e?.type;return(0,D.jsx)(`div`,{style:{display:`flex`,gap:8,flexWrap:`wrap`},children:[{value:`bank`,label:`Bank`,icon:(0,D.jsx)(x,{})},{value:`cash`,label:`Cash`,icon:(0,D.jsx)(S,{})}].map(e=>{let i=r===e.value;return(0,D.jsxs)(`button`,{type:`button`,disabled:n,onClick:()=>{t(`type`,e.value),e.value===`cash`&&(t(`bank_name`,``),t(`account_name`,``),t(`account_number`,``),t(`account_type`,``),t(`swift_code`,``))},style:{width:130,height:40,border:i?`1px solid #1677ff`:`1px solid #d9dee7`,background:i?`#fff`:`#f8fafc`,borderRadius:4,cursor:n?`not-allowed`:`pointer`,display:`flex`,alignItems:`center`,justifyContent:`center`,gap:8,fontSize:13,fontWeight:600},children:[e.icon,(0,D.jsx)(`span`,{children:e.label})]},e.value)})})},ye=e=>()=>(0,D.jsx)(`div`,{style:{fontSize:12,fontWeight:700,color:`#667085`,marginBottom:-8},children:e}),be=(0,E.useMemo)(()=>[{name:`type`,label:`Type`,type:`custom`,required:!0,col:24,render:ve},{name:`bank_name`,label:`Bank`,type:`text`,required:!0,col:24,placeholder:`Bank name`,condition:e=>e?.type===`bank`},{name:`display_name`,label:`Display Name`,type:`text`,required:!0,col:24,placeholder:`Display name`},{name:`code`,label:`Code`,type:`text`,readOnly:!0,col:12,placeholder:`Auto-generated`},{name:`currency_id`,label:`Currency`,type:`fkSelect`,required:!0,col:12,placeholder:`Select currency`,fkUrl:`/api/currencies/`,fkSearchParam:`search`,fkPageSize:20,fkValueKey:`id`,fkLabelKey:`name`,labelField:`currency_name`,fkExtraParams:{active:!0},fkLabel:e=>[e?.code||``,e?.name||``].filter(Boolean).join(` - `)},{name:`bank_info_title`,label:``,type:`custom`,col:24,render:ye(`Bank Info`),condition:e=>e?.type===`bank`},{name:`account_name`,label:`Account Name`,type:`text`,col:12,placeholder:`Account name`,condition:e=>e?.type===`bank`},{name:`account_number`,label:`Account Number`,type:`text`,col:12,placeholder:`Account number`,condition:e=>e?.type===`bank`},{name:`account_type`,label:`Account Type`,type:`select`,col:12,placeholder:`Select...`,options:[{value:`saving`,label:`Saving Account`},{value:`current`,label:`Current Account`},{value:`checking`,label:`Checking Account`},{value:`fixed_deposit`,label:`Fixed Deposit`},{value:`loan`,label:`Loan Account`},{value:`overdraft`,label:`Overdraft Account`}],condition:e=>e?.type===`bank`},{name:`swift_code`,label:`Swift Code`,type:`text`,col:12,placeholder:`Swift code`,condition:e=>e?.type===`bank`},{name:`description`,label:`Description`,type:`textarea`,col:24,rows:1,placeholder:`Description`}],[]),xe=le().shape({type:w().oneOf([`bank`,`cash`]).required(`Type is required`),display_name:w().trim().max(150,`Display name cannot exceed 150 characters`).required(`Display Name is required`),currency_id:ue().nullable().required(`Currency is required`),bank_name:w().when(`type`,{is:`bank`,then:e=>e.trim().max(150,`Bank name cannot exceed 150 characters`).required(`Bank is required`),otherwise:e=>e.nullable()}),account_name:w().nullable().max(150),account_number:w().nullable().max(80),account_type:w().nullable().max(50),swift_code:w().nullable().max(50),description:w().nullable(),active:C().nullable(),is_system_generated:C().nullable()}),Se={type:`bank`,display_name:``,currency_id:a?.id??null,currency_id_detail:a??null,currency_name:a?[a.code,a.name].filter(Boolean).join(` - `):``,description:``,bank_name:``,account_name:pe,account_number:``,account_type:``,swift_code:``,active:!0,is_system_generated:!1},Ce=e=>{let t=e.type===`bank`,n={type:e.type||`bank`,display_name:e.display_name?.trim()||null,code:e.code?.trim()||null,currency_id:e.currency_id||null,description:e.description?.trim()||null,bank_name:t&&e.bank_name?.trim()||null,account_name:t&&e.account_name?.trim()||null,account_number:t&&e.account_number?.trim()||null,account_type:t&&e.account_type||null,swift_code:t&&e.swift_code?.trim()||null,active:e.active!==!1,is_system_generated:!!e.is_system_generated};return Object.keys(n).forEach(e=>{n[e]===``&&(n[e]=null)}),n},we=(e,{setFieldValue:t})=>{let n=e?.currency_id_detail;if(n){let r=n.label||[n.code,n.name].filter(Boolean).join(` - `)||n.name||``;r&&e.currency_name!==r&&t(`currency_name`,r,!1)}},Te=(0,E.useMemo)(()=>[{title:`Display Name`,dataIndex:`display_name`,key:`display_name`}],[]);return(0,D.jsxs)(oe,{header:(0,D.jsxs)(`div`,{className:`bank-page__layout-header`,children:[(0,D.jsx)(`div`,{children:(0,D.jsx)(k,{level:5,className:`bank-page__title`,children:`Bank Accounts`})}),(0,D.jsxs)(h,{size:8,children:[(0,D.jsx)(d,{size:`small`,icon:(0,D.jsx)(y,{}),onClick:()=>Q(),children:`Reload`}),(0,D.jsx)(d,{size:`small`,type:`primary`,icon:(0,D.jsx)(ee,{}),onClick:me,children:`Add New`})]})]}),children:[(0,D.jsx)(r,{title:`Bank Accounts`}),(0,D.jsx)(`style`,{children:`
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
            `}),(0,D.jsxs)(`div`,{className:`bank-page`,children:[(0,D.jsx)(p,{className:`bank-page__toolbar-card`,bordered:!1,children:(0,D.jsxs)(`div`,{className:`bank-page__toolbar`,children:[(0,D.jsxs)(`div`,{className:`bank-page__toolbar-left`,children:[(0,D.jsx)(g,{allowClear:!0,size:`small`,prefix:(0,D.jsx)(u,{}),placeholder:`Search bank, code, account no...`,value:I,onChange:e=>z(e.target.value),onPressEnter:()=>Q({page:1,search:I}),style:{width:260}}),(0,D.jsx)(c,{allowClear:!0,size:`small`,placeholder:`Type`,value:B||void 0,onChange:e=>{let t=e||``;V(t),Q({page:1,type:t})},style:{width:120},options:[{value:`bank`,label:`Bank`},{value:`cash`,label:`Cash`}]}),(0,D.jsx)(d,{size:`small`,type:`primary`,icon:(0,D.jsx)(u,{}),onClick:()=>Q({page:1,search:I,type:B,active:Z}),children:`Search`})]}),(0,D.jsx)(f,{activeKey:H,onChange:e=>{U(e),Q({page:1,active:e===`inactive`?`false`:`all`})},items:[{key:`all`,label:`All`},{key:`inactive`,label:`Inactive`}]})]})}),s.length<1&&!A?(0,D.jsx)(p,{className:`bank-page__empty-card`,children:(0,D.jsx)(l,{description:`No bank accounts found`})}):(0,D.jsx)(m,{gutter:[12,12],className:`bank-page__cards`,children:s.map(e=>{let t=e?.type===`bank`,r=N(e?.currency_name,e?.currency?.label,e?.currency?.code,e?.currency?.name),a=i(e?.current_balance??e?.software_ledger_balance??0),s=[{key:`view`,label:`View Details`,icon:(0,D.jsx)(_,{})},{key:`copy`,label:`Copy Details`,icon:(0,D.jsx)(o,{})},{key:`edit`,label:`Edit`,icon:(0,D.jsx)(ae,{})},{key:e?.active===!1?`restore`:`delete`,label:e?.active===!1?`Make Active`:`Make Inactive`,icon:(0,D.jsx)(ie,{}),danger:e?.active!==!1}];return(0,D.jsx)(ne,{xs:24,sm:12,md:12,lg:8,xl:6,children:(0,D.jsxs)(p,{hoverable:!0,className:`bank-page__compact-card`,onClick:()=>n.visit(route(`accounting.bank-accounts.show`,e.id)),children:[(0,D.jsxs)(`div`,{className:`bank-page__card-head`,children:[(0,D.jsxs)(`div`,{className:`bank-page__card-left`,children:[(0,D.jsx)(`span`,{className:`bank-page__avatar ${t?``:`cash`}`,children:t?(0,D.jsx)(x,{}):(0,D.jsx)(S,{})}),(0,D.jsxs)(`div`,{style:{minWidth:0},children:[(0,D.jsx)(k,{level:5,className:`bank-page__name`,children:e?.display_name||`-`}),(0,D.jsx)(`span`,{className:`bank-page__subname`,children:e?.bank_name||e?.account_name||(t?`Bank Account`:`Cash Account`)})]})]}),(0,D.jsx)(te,{menu:{items:s,onClick:({key:t,domEvent:r})=>{r?.stopPropagation?.(),t===`view`&&n.visit(route(`accounting.bank-accounts.show`,e.id)),t===`copy`&&_e(e),t===`edit`&&he(e),t===`delete`&&$(e),t===`restore`&&ge(e)}},trigger:[`click`],children:(0,D.jsx)(d,{type:`text`,size:`small`,icon:(0,D.jsx)(se,{}),onClick:e=>e.stopPropagation()})})]}),(0,D.jsx)(`div`,{className:`bank-page__amount`,children:a}),(0,D.jsxs)(`div`,{className:`bank-page__tags`,children:[(0,D.jsx)(b,{color:t?`blue`:`green`,children:t?`Bank`:`Cash`}),(0,D.jsx)(b,{children:r}),e?.code?(0,D.jsx)(b,{children:e.code}):null,(0,D.jsx)(b,{color:e?.active===!1?`default`:`success`,children:e?.active===!1?`Inactive`:`Active`}),e?.account_type&&t?(0,D.jsx)(b,{children:e.account_type}):null,e?.account_number&&t?(0,D.jsxs)(b,{children:[`Acc: `,e.account_number]}):null,e?.swift_code&&t?(0,D.jsxs)(b,{children:[`Swift: `,e.swift_code]}):null,e?.description?(0,D.jsx)(b,{children:e.description}):null]})]})},e.id)})})]}),(0,D.jsx)(`div`,{className:`bank-page__hidden-crud`,children:(0,D.jsx)(re,{icon:(0,D.jsx)(x,{}),title:`Bank Account`,apiUrl:e,columns:Te,fields:be,validationSchema:xe,crudInitialValues:Se,transformPayload:Ce,onFormValuesChange:we,form_ui:`modal`,modalWidth:680,openOnMount:K>0,openMode:de,openEditId:fe,onAddSuccess:()=>Q(),onEditSuccess:()=>Q(),enableServerPagination:!0,pageParam:`page`,pageSizeParam:`page_size`,searchParam:`search`,activeParam:`active`,sortMode:`ordering`,orderingParam:`ordering`,defaultSortField:`display_name`,defaultSortOrder:`ascend`,showSearch:!1,enableInactiveDrawer:!1,canAdd:!0,canEdit:!0,canDelete:!1,canView:!1,hasActions:!1,hasActionColumns:!1},`bank-account-form-${K}`)})]})}export{z as default};