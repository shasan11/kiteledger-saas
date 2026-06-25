import{i as e}from"./chunk-62oNxeRG.js";import{r as t,t as n}from"./jsx-runtime-gigNY91P.js";import{t as r}from"./grid-B-U-xHEr.js";import{t as i}from"./alert-CWS2pmeX.js";import{t as a}from"./empty-CUdvJnZZ.js";import{t as o}from"./avatar-Dil-NrNh.js";import{t as s}from"./button-B5dvIdG1.js";import{t as c}from"./dayjs.min-BjRok8LT.js";import{t as l}from"./tabs-Dynodvw3.js";import{t as u}from"./card-FobL5y2W.js";import{t as d}from"./space-Bu5OROsg.js";import{t as f}from"./CalendarOutlined-CmwSqQ9C.js";import{t as p}from"./descriptions-Bey7JyeC.js";import{t as m}from"./typography-ofUTwIJF.js";import{t as h}from"./tag-BtLgFRxP.js";import{t as g}from"./DeleteOutlined-BXRr9pOX.js";import{t as _}from"./EditOutlined-L2h70V4O.js";import{i as v,o as y,t as b}from"./index.esm-BVo_jOMH.js";import{c as x}from"./app-Bbh_1VUn.js";import{a as S,t as C}from"./AuthenticatedLayout-CJl9mEFa.js";import{t as w}from"./LockOutlined-DBBiF1gE.js";import{t as T}from"./MailOutlined-BpqltPfc.js";import{t as E}from"./SafetyCertificateOutlined-DUuu5Tky.js";import{t as D}from"./TeamOutlined-Q7dq4nX4.js";import{t as O}from"./UserOutlined-Dv0TP5-E.js";import k from"./DeleteUserForm-BgWTFZOJ.js";import A from"./UpdatePasswordForm-D1aZ_ZoY.js";import j from"./UpdateProfileInformationForm-C6huWTKo.js";var M=e(c(),1),N=e(t(),1),P=n(),{Text:F,Title:I}=m,{useBreakpoint:L}=r,R=e=>e?(0,M.default)(e).format(`DD MMM YYYY`):`-`,z=e=>(e?.display_name||e?.name||e?.email||`User`).split(` `).map(e=>e?.[0]).filter(Boolean).slice(0,2).join(``).toUpperCase();function B({title:e,icon:t,children:n,extra:r}){return(0,P.jsx)(u,{className:`profile-page__card`,title:(0,P.jsxs)(d,{children:[t,e]}),extra:r,bordered:!0,children:n})}function V({label:e,value:t}){return(0,P.jsxs)(`div`,{className:`profile-page__meta-item`,children:[(0,P.jsx)(F,{type:`secondary`,children:e}),(0,P.jsx)(`strong`,{children:t||`-`})]})}function H({mustVerifyEmail:e,status:t,profileUser:n,employeeProfile:r,accountInfo:c={}}){let d=y(),m=n||d.props.auth.user,M=L(),[H,U]=(0,N.useState)(`profile`),{token:W}=x.useToken(),G=(0,N.useMemo)(()=>{let e=c?.roles||[];return e.length?e.join(`, `):m?.role?.name||r?.designation?.name||`Team member`},[c,m,r]),K=r?.branch?.name||m?.branch?.name||d.props.branchContext?.branches?.find(e=>e.id===d.props.auth?.currentBranchId)?.name||null,q=[m?.street,m?.city,m?.state,m?.zip_code,m?.country].filter(Boolean).join(`, `),J=[{key:`profile`,label:`Profile`,children:(0,P.jsx)(B,{title:`Personal information`,icon:(0,P.jsx)(_,{}),children:(0,P.jsx)(j,{user:m,employeeProfile:r,mustVerifyEmail:e,status:t})})},{key:`security`,label:`Security`,children:(0,P.jsx)(B,{title:`Account security`,icon:(0,P.jsx)(w,{}),children:(0,P.jsx)(A,{})})},{key:`account`,label:`Account info`,children:(0,P.jsx)(B,{title:`Account information`,icon:(0,P.jsx)(E,{}),children:(0,P.jsxs)(p,{bordered:!0,size:`small`,column:{xs:1,md:2},children:[(0,P.jsx)(p.Item,{label:`User ID`,children:(0,P.jsx)(`code`,{children:m?.id||`-`})}),(0,P.jsx)(p.Item,{label:`Employee code`,children:(0,P.jsx)(`code`,{children:r?.employee_id||m?.employee_id||`-`})}),(0,P.jsx)(p.Item,{label:`Roles`,children:G?(0,P.jsx)(h,{children:G}):`-`}),(0,P.jsx)(p.Item,{label:`Permissions`,children:c?.permissions_count??`-`}),(0,P.jsx)(p.Item,{label:`Branch`,children:K||`-`}),(0,P.jsx)(p.Item,{label:`Department`,children:r?.department?.name||m?.department?.name||`-`}),(0,P.jsx)(p.Item,{label:`Created`,children:R(m?.created_at)}),(0,P.jsx)(p.Item,{label:`Last updated`,children:R(m?.updated_at)}),(0,P.jsx)(p.Item,{label:`Last login`,children:`Not tracked`}),(0,P.jsx)(p.Item,{label:`Email verification`,children:m?.email_verified_at?(0,P.jsx)(h,{color:`green`,children:`Verified`}):(0,P.jsx)(h,{color:`gold`,children:`Pending`})})]})})},{key:`employee`,label:`Employee profile`,children:(0,P.jsx)(B,{title:`Employee profile`,icon:(0,P.jsx)(D,{}),children:r?(0,P.jsxs)(p,{bordered:!0,size:`small`,column:{xs:1,md:2},children:[(0,P.jsx)(p.Item,{label:`Employee code`,children:(0,P.jsx)(`code`,{children:r.employee_id||`-`})}),(0,P.jsx)(p.Item,{label:`Employment status`,children:r.employment_status?.name||r.employmentStatus?.name||`-`}),(0,P.jsx)(p.Item,{label:`Department`,children:r.department?.name||`-`}),(0,P.jsx)(p.Item,{label:`Designation`,children:r.designation?.name||`-`}),(0,P.jsx)(p.Item,{label:`Phone`,children:m?.phone||r.emergency_contact_phone||`-`}),(0,P.jsx)(p.Item,{label:`Joining date`,children:R(r.join_date)}),(0,P.jsx)(p.Item,{label:`Branch`,children:r.branch?.name||`-`}),(0,P.jsx)(p.Item,{label:`Reporting manager`,children:`Not assigned`}),(0,P.jsx)(p.Item,{label:`Address`,span:2,children:r.address||q||`-`})]}):(0,P.jsx)(a,{description:`No employee profile linked to this account.`})})},{key:`danger`,label:`Danger Zone`,children:(0,P.jsx)(B,{title:`Danger Zone`,icon:(0,P.jsx)(g,{}),children:(0,P.jsx)(k,{})})}];return(0,P.jsxs)(C,{header:(0,P.jsx)(`div`,{className:`profile-page__header`,children:(0,P.jsxs)(`div`,{children:[(0,P.jsx)(F,{type:`secondary`,children:`Account settings`}),(0,P.jsx)(I,{level:4,style:{margin:0},children:`Profile`})]})}),children:[(0,P.jsx)(b,{title:`Profile`}),(0,P.jsx)(`style`,{children:`
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
            `}),(0,P.jsx)(`div`,{className:`profile-page`,children:(0,P.jsxs)(`div`,{className:`profile-page__shell`,children:[(0,P.jsxs)(u,{className:`profile-page__summary`,bordered:!0,children:[(0,P.jsxs)(`div`,{className:`profile-page__person`,children:[(0,P.jsx)(o,{size:M.xs?64:76,src:m?.image_url,icon:m?.image_url?null:(0,P.jsx)(O,{}),className:`profile-page__avatar`,children:m?.image_url?null:z(m)}),(0,P.jsxs)(`div`,{className:`profile-page__title`,children:[(0,P.jsx)(I,{level:3,style:{margin:0},children:m?.display_name||m?.name||`User`}),(0,P.jsxs)(F,{type:`secondary`,children:[(0,P.jsx)(T,{}),` `,m?.email||`No email available`]}),(0,P.jsxs)(`div`,{className:`profile-page__chips`,children:[(0,P.jsx)(h,{color:m?.active===!1?`red`:`green`,children:m?.active===!1?`Inactive`:`Active`}),(0,P.jsx)(h,{children:G}),K&&(0,P.jsx)(h,{children:K}),(0,P.jsxs)(h,{icon:(0,P.jsx)(f,{}),children:[`Updated `,R(m?.updated_at)]})]})]})]}),(0,P.jsxs)(`div`,{className:`profile-page__quick-actions`,children:[(0,P.jsx)(s,{icon:(0,P.jsx)(_,{}),onClick:()=>U(`profile`),children:`Edit Profile`}),(0,P.jsx)(s,{icon:(0,P.jsx)(w,{}),onClick:()=>U(`security`),children:`Change Password`}),(0,P.jsx)(s,{icon:(0,P.jsx)(E,{}),onClick:()=>U(`account`),children:`Security`}),(0,P.jsx)(s,{danger:!0,icon:(0,P.jsx)(S,{}),onClick:()=>v.post(route(`logout`)),children:`Logout`})]})]}),e&&m?.email_verified_at===null&&(0,P.jsx)(i,{showIcon:!0,type:`warning`,message:`Your email address is unverified.`,description:`Some account actions may remain limited until you verify your email address.`}),(0,P.jsxs)(`div`,{className:`profile-page__body`,children:[(0,P.jsxs)(u,{className:`profile-page__identity`,bordered:!0,children:[(0,P.jsxs)(`div`,{className:`profile-page__identity-head`,children:[(0,P.jsx)(o,{size:96,src:m?.image_url,icon:m?.image_url?null:(0,P.jsx)(O,{}),className:`profile-page__avatar`,children:m?.image_url?null:z(m)}),(0,P.jsx)(I,{level:4,style:{margin:`12px 0 0`},children:m?.display_name||m?.name||`User`}),(0,P.jsx)(F,{type:`secondary`,children:G})]}),(0,P.jsxs)(`div`,{className:`profile-page__meta-list`,children:[(0,P.jsx)(V,{label:`Email`,value:m?.email}),(0,P.jsx)(V,{label:`Phone`,value:m?.phone}),(0,P.jsx)(V,{label:`Branch`,value:K}),(0,P.jsx)(V,{label:`Department`,value:r?.department?.name||m?.department?.name}),(0,P.jsx)(V,{label:`Employee code`,value:r?.employee_id||m?.employee_id}),(0,P.jsx)(V,{label:`Address`,value:q})]})]}),(0,P.jsx)(`main`,{className:`profile-page__main`,children:(0,P.jsx)(l,{className:`profile-page__tabs`,activeKey:H,onChange:U,items:J})})]})]})})]})}export{H as default};