import{i as e}from"./rolldown-runtime-aKtaBQYM.js";import{i as t,o as n,t as r}from"./index.esm-CtIVDvdE.js";import{r as i,t as a}from"./jsx-runtime-RbF_zoRI.js";import{t as o}from"./alert-CXVdfG0X.js";import{t as s}from"./typography-BTjN9rxU.js";import{t as c}from"./empty-BOJtdRz7.js";import{t as l}from"./avatar-EA2dx6l6.js";import{t as u}from"./button-DdnyfjyJ.js";import{t as d}from"./dayjs.min-BRtZKQ04.js";import{t as f}from"./tabs-D6mM-bRn.js";import{t as p}from"./card-DkP92y8s.js";import{t as m}from"./grid-DO-50pkA.js";import{t as h}from"./space-_4B_xOOu.js";import{t as g}from"./CalendarOutlined-DUSBWepV.js";import{t as _}from"./descriptions-B_EA6wD_.js";import{t as v}from"./tag-Dh3NArqV.js";import{t as y}from"./DeleteOutlined-CjnT_w1K.js";import{t as b}from"./EditOutlined-DDNyn6SO.js";import{c as x}from"./app-BH-XQ_Jt.js";import{t as S}from"./AuthenticatedLayout-C-3uMj1M.js";import{r as C}from"./MenuUnfoldOutlined-70ijiF0N.js";import{t as w}from"./LockOutlined-xx_Y72ip.js";import{t as T}from"./MailOutlined-CZag93En.js";import{t as E}from"./SafetyCertificateOutlined-DyQWwOLo.js";import{t as D}from"./TeamOutlined-C7snhPGm.js";import{t as O}from"./UserOutlined-LfvzV8NT.js";import k from"./DeleteUserForm-B5WPBbzw.js";import A from"./UpdatePasswordForm-BYro07fb.js";import j from"./UpdateProfileInformationForm-BN5UqW5l.js";var M=e(d(),1),N=e(i(),1),P=a(),{Text:F,Title:I}=s,{useBreakpoint:L}=m,R=e=>e?(0,M.default)(e).format(`DD MMM YYYY`):`-`,z=e=>(e?.display_name||e?.name||e?.email||`User`).split(` `).map(e=>e?.[0]).filter(Boolean).slice(0,2).join(``).toUpperCase();function B({title:e,icon:t,children:n,extra:r}){return(0,P.jsx)(p,{className:`profile-page__card`,title:(0,P.jsxs)(h,{children:[t,e]}),extra:r,bordered:!0,children:n})}function V({label:e,value:t}){return(0,P.jsxs)(`div`,{className:`profile-page__meta-item`,children:[(0,P.jsx)(F,{type:`secondary`,children:e}),(0,P.jsx)(`strong`,{children:t||`-`})]})}function H({mustVerifyEmail:e,status:i,profileUser:a,employeeProfile:s,accountInfo:d={}}){let m=n(),h=a||m.props.auth.user,M=L(),[H,U]=(0,N.useState)(`profile`),{token:W}=x.useToken(),G=(0,N.useMemo)(()=>{let e=d?.roles||[];return e.length?e.join(`, `):h?.role?.name||s?.designation?.name||`Team member`},[d,h,s]),K=s?.branch?.name||h?.branch?.name||m.props.branchContext?.branches?.find(e=>e.id===m.props.auth?.currentBranchId)?.name||null,q=[h?.street,h?.city,h?.state,h?.zip_code,h?.country].filter(Boolean).join(`, `),J=[{key:`profile`,label:`Profile`,children:(0,P.jsx)(B,{title:`Personal information`,icon:(0,P.jsx)(b,{}),children:(0,P.jsx)(j,{user:h,employeeProfile:s,mustVerifyEmail:e,status:i})})},{key:`security`,label:`Security`,children:(0,P.jsx)(B,{title:`Account security`,icon:(0,P.jsx)(w,{}),children:(0,P.jsx)(A,{})})},{key:`account`,label:`Account info`,children:(0,P.jsx)(B,{title:`Account information`,icon:(0,P.jsx)(E,{}),children:(0,P.jsxs)(_,{bordered:!0,size:`small`,column:{xs:1,md:2},children:[(0,P.jsx)(_.Item,{label:`User ID`,children:(0,P.jsx)(`code`,{children:h?.id||`-`})}),(0,P.jsx)(_.Item,{label:`Employee code`,children:(0,P.jsx)(`code`,{children:s?.employee_id||h?.employee_id||`-`})}),(0,P.jsx)(_.Item,{label:`Roles`,children:G?(0,P.jsx)(v,{children:G}):`-`}),(0,P.jsx)(_.Item,{label:`Permissions`,children:d?.permissions_count??`-`}),(0,P.jsx)(_.Item,{label:`Branch`,children:K||`-`}),(0,P.jsx)(_.Item,{label:`Department`,children:s?.department?.name||h?.department?.name||`-`}),(0,P.jsx)(_.Item,{label:`Created`,children:R(h?.created_at)}),(0,P.jsx)(_.Item,{label:`Last updated`,children:R(h?.updated_at)}),(0,P.jsx)(_.Item,{label:`Last login`,children:`Not tracked`}),(0,P.jsx)(_.Item,{label:`Email verification`,children:h?.email_verified_at?(0,P.jsx)(v,{color:`green`,children:`Verified`}):(0,P.jsx)(v,{color:`gold`,children:`Pending`})})]})})},{key:`employee`,label:`Employee profile`,children:(0,P.jsx)(B,{title:`Employee profile`,icon:(0,P.jsx)(D,{}),children:s?(0,P.jsxs)(_,{bordered:!0,size:`small`,column:{xs:1,md:2},children:[(0,P.jsx)(_.Item,{label:`Employee code`,children:(0,P.jsx)(`code`,{children:s.employee_id||`-`})}),(0,P.jsx)(_.Item,{label:`Employment status`,children:s.employment_status?.name||s.employmentStatus?.name||`-`}),(0,P.jsx)(_.Item,{label:`Department`,children:s.department?.name||`-`}),(0,P.jsx)(_.Item,{label:`Designation`,children:s.designation?.name||`-`}),(0,P.jsx)(_.Item,{label:`Phone`,children:h?.phone||s.emergency_contact_phone||`-`}),(0,P.jsx)(_.Item,{label:`Joining date`,children:R(s.join_date)}),(0,P.jsx)(_.Item,{label:`Branch`,children:s.branch?.name||`-`}),(0,P.jsx)(_.Item,{label:`Reporting manager`,children:`Not assigned`}),(0,P.jsx)(_.Item,{label:`Address`,span:2,children:s.address||q||`-`})]}):(0,P.jsx)(c,{description:`No employee profile linked to this account.`})})},{key:`danger`,label:`Danger Zone`,children:(0,P.jsx)(B,{title:`Danger Zone`,icon:(0,P.jsx)(y,{}),children:(0,P.jsx)(k,{})})}];return(0,P.jsxs)(S,{header:(0,P.jsx)(`div`,{className:`profile-page__header`,children:(0,P.jsxs)(`div`,{children:[(0,P.jsx)(F,{type:`secondary`,children:`Account settings`}),(0,P.jsx)(I,{level:4,style:{margin:0},children:`Profile`})]})}),children:[(0,P.jsx)(r,{title:`Profile`}),(0,P.jsx)(`style`,{children:`
                .profile-page {
                    min-height: calc(100vh - 120px);
                    background: ${W.colorBgLayout};
                    padding: 18px;
                }

                .profile-page__shell {
                    max-width: 1280px;
                    margin: 0 auto;
                    display: flex;
                    flex-direction: column;
                    gap: 16px;
                }

                .profile-page__summary.ant-card,
                .profile-page__identity.ant-card,
                .profile-page__card.ant-card {
                    border-color: ${W.colorBorderSecondary};
                    border-radius: ${W.borderRadiusLG}px;
                    box-shadow: none;
                }

                .profile-page__summary .ant-card-body {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 18px;
                    flex-wrap: wrap;
                }

                .profile-page__person {
                    display: flex;
                    align-items: center;
                    gap: 16px;
                    min-width: 0;
                }

                .profile-page__avatar {
                    background: ${W.colorPrimaryBg};
                    color: ${W.colorPrimary};
                    border: 1px solid ${W.colorPrimaryBorder};
                    font-weight: 700;
                }

                .profile-page__title {
                    min-width: 0;
                }

                .profile-page__title h3 {
                    max-width: 520px;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                }

                .profile-page__chips {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 6px;
                    margin-top: 8px;
                }

                .profile-page__quick-actions {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 8px;
                    justify-content: flex-end;
                }

                .profile-page__body {
                    display: grid;
                    grid-template-columns: 300px minmax(0, 1fr);
                    gap: 16px;
                    align-items: start;
                }

                .profile-page__identity .ant-card-body {
                    display: flex;
                    flex-direction: column;
                    gap: 16px;
                }

                .profile-page__identity-head {
                    text-align: center;
                    padding-bottom: 16px;
                    border-bottom: 1px solid ${W.colorBorderSecondary};
                }

                .profile-page__meta-list {
                    display: flex;
                    flex-direction: column;
                    gap: 14px;
                }

                .profile-page__meta-item {
                    display: flex;
                    flex-direction: column;
                    gap: 3px;
                    min-width: 0;
                }

                .profile-page__meta-item strong {
                    color: ${W.colorText};
                    font-weight: 600;
                    overflow-wrap: anywhere;
                }

                .profile-page__main {
                    min-width: 0;
                }

                .profile-page__tabs .ant-tabs-nav {
                    margin-bottom: 12px;
                }

                .profile-form__avatar-row {
                    display: flex;
                    gap: 16px;
                    align-items: center;
                    padding-bottom: 20px;
                    margin-bottom: 20px;
                    border-bottom: 1px solid ${W.colorBorderSecondary};
                }

                .profile-form__avatar-copy {
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                }

                .profile-security__strength {
                    margin-top: -12px;
                    margin-bottom: 18px;
                }

                .profile-danger__body {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    gap: 16px;
                    margin-top: 16px;
                    flex-wrap: wrap;
                }

                @media (max-width: 991px) {
                    .profile-page__body {
                        grid-template-columns: 1fr;
                    }

                    .profile-page__identity {
                        order: 2;
                    }

                    .profile-page__main {
                        order: 1;
                    }
                }

                @media (max-width: 575px) {
                    .profile-page {
                        padding: 12px;
                    }

                    .profile-page__summary .ant-card-body,
                    .profile-page__person,
                    .profile-form__avatar-row {
                        align-items: flex-start;
                    }

                    .profile-page__person,
                    .profile-form__avatar-row {
                        flex-direction: column;
                    }

                    .profile-page__quick-actions {
                        width: 100%;
                        justify-content: flex-start;
                    }

                    .profile-page__quick-actions .ant-btn {
                        flex: 1 1 auto;
                    }

                    .profile-page__title h3 {
                        max-width: 100%;
                        white-space: normal;
                    }
                }
            `}),(0,P.jsx)(`div`,{className:`profile-page`,children:(0,P.jsxs)(`div`,{className:`profile-page__shell`,children:[(0,P.jsxs)(p,{className:`profile-page__summary`,bordered:!0,children:[(0,P.jsxs)(`div`,{className:`profile-page__person`,children:[(0,P.jsx)(l,{size:M.xs?64:76,src:h?.image_url,icon:h?.image_url?null:(0,P.jsx)(O,{}),className:`profile-page__avatar`,children:h?.image_url?null:z(h)}),(0,P.jsxs)(`div`,{className:`profile-page__title`,children:[(0,P.jsx)(I,{level:3,style:{margin:0},children:h?.display_name||h?.name||`User`}),(0,P.jsxs)(F,{type:`secondary`,children:[(0,P.jsx)(T,{}),` `,h?.email||`No email available`]}),(0,P.jsxs)(`div`,{className:`profile-page__chips`,children:[(0,P.jsx)(v,{color:h?.active===!1?`red`:`green`,children:h?.active===!1?`Inactive`:`Active`}),(0,P.jsx)(v,{children:G}),K&&(0,P.jsx)(v,{children:K}),(0,P.jsxs)(v,{icon:(0,P.jsx)(g,{}),children:[`Updated `,R(h?.updated_at)]})]})]})]}),(0,P.jsxs)(`div`,{className:`profile-page__quick-actions`,children:[(0,P.jsx)(u,{icon:(0,P.jsx)(b,{}),onClick:()=>U(`profile`),children:`Edit Profile`}),(0,P.jsx)(u,{icon:(0,P.jsx)(w,{}),onClick:()=>U(`security`),children:`Change Password`}),(0,P.jsx)(u,{icon:(0,P.jsx)(E,{}),onClick:()=>U(`account`),children:`Security`}),(0,P.jsx)(u,{danger:!0,icon:(0,P.jsx)(C,{}),onClick:()=>t.post(route(`logout`)),children:`Logout`})]})]}),e&&h?.email_verified_at===null&&(0,P.jsx)(o,{showIcon:!0,type:`warning`,message:`Your email address is unverified.`,description:`Some account actions may remain limited until you verify your email address.`}),(0,P.jsxs)(`div`,{className:`profile-page__body`,children:[(0,P.jsxs)(p,{className:`profile-page__identity`,bordered:!0,children:[(0,P.jsxs)(`div`,{className:`profile-page__identity-head`,children:[(0,P.jsx)(l,{size:96,src:h?.image_url,icon:h?.image_url?null:(0,P.jsx)(O,{}),className:`profile-page__avatar`,children:h?.image_url?null:z(h)}),(0,P.jsx)(I,{level:4,style:{margin:`12px 0 0`},children:h?.display_name||h?.name||`User`}),(0,P.jsx)(F,{type:`secondary`,children:G})]}),(0,P.jsxs)(`div`,{className:`profile-page__meta-list`,children:[(0,P.jsx)(V,{label:`Email`,value:h?.email}),(0,P.jsx)(V,{label:`Phone`,value:h?.phone}),(0,P.jsx)(V,{label:`Branch`,value:K}),(0,P.jsx)(V,{label:`Department`,value:s?.department?.name||h?.department?.name}),(0,P.jsx)(V,{label:`Employee code`,value:s?.employee_id||h?.employee_id}),(0,P.jsx)(V,{label:`Address`,value:q})]})]}),(0,P.jsx)(`main`,{className:`profile-page__main`,children:(0,P.jsx)(f,{className:`profile-page__tabs`,activeKey:H,onChange:U,items:J})})]})]})})]})}export{H as default};