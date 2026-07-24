import{i as e,t}from"./index.esm-CtIVDvdE.js";import{t as n}from"./jsx-runtime-RbF_zoRI.js";import{t as r}from"./button-DdnyfjyJ.js";import{t as i}from"./space-_4B_xOOu.js";import{t as a}from"./ReusableCrud-BLqzv_vh.js";import{t as o}from"./AuthenticatedLayout-Dw3pMMQL.js";import{t as s}from"./ArrowLeftOutlined-CzB-XQhI.js";import{t as c}from"./SafetyCertificateOutlined-DyQWwOLo.js";import l from"./AccessControlTabs-B-kTcYNY.js";import{roleApi as u,roleFields as d,roleInitialValues as f,roleValidationSchema as p,transformRolePayload as m,transformRoleRecord as h}from"./roleFormConfig--kJWU2_D.js";var g=n();function _(n){let _=n.id,v=!!_,y=v?`Edit Role`:`Create Role`,b=()=>e.visit(route(`hrm.roles.index`));return(0,g.jsxs)(o,{user:n.auth?.user,header:(0,g.jsx)(l,{activeKey:`roles`}),children:[(0,g.jsx)(t,{title:y}),(0,g.jsxs)(`div`,{className:`role-form-page`,children:[(0,g.jsx)(`div`,{className:`role-form-page__header`,children:(0,g.jsxs)(i,{children:[(0,g.jsx)(r,{icon:(0,g.jsx)(s,{}),onClick:b,children:`Back`}),(0,g.jsx)(c,{style:{color:`#1677ff`,fontSize:20}}),(0,g.jsxs)(`div`,{children:[(0,g.jsx)(`h1`,{children:y}),(0,g.jsx)(`p`,{children:`Set the role details and assign permissions from the seeded permission list.`})]})]})}),(0,g.jsx)(`div`,{className:`role-form-page__body`,children:(0,g.jsx)(a,{icon:(0,g.jsx)(c,{}),title:`Role`,apiUrl:u(`/api/hrm/roles`),fields:d,validationSchema:p,crudInitialValues:f,transformPayload:m,transformRecord:h,ui_type:v?`edit form`:`add form`,look_up_var:_,submitLabelOverride:v?`Update Role`:`Create Role`,onAddSuccess:b,onEditSuccess:b})})]}),(0,g.jsx)(`style`,{children:`
        .role-form-page {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .role-form-page__header {
          background: #fff;
          border: 1px solid #edf0f4;
          border-radius: 8px;
          padding: 16px;
        }

        .role-form-page__header h1 {
          margin: 0;
          font-size: 18px;
          font-weight: 700;
          line-height: 1.25;
        }

        .role-form-page__header p {
          margin: 2px 0 0;
          color: #64748b;
          font-size: 13px;
        }

        .role-form-page__body {
          background: #fff;
          border: 1px solid #edf0f4;
          border-radius: 8px;
          padding: 16px;
        }
      `})]})}export{_ as default};