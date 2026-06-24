import{t as e}from"./jsx-runtime-gigNY91P.js";import{t}from"./button-B5dvIdG1.js";import{t as n}from"./space-Bu5OROsg.js";import{t as r}from"./ReusableCrud-BY7vXs8z.js";import{i,t as a}from"./index.esm-BVo_jOMH.js";import{t as o}from"./AuthenticatedLayout-BwWhhjhw.js";import{t as s}from"./ArrowLeftOutlined-DMsHqzbn.js";import{t as c}from"./SafetyCertificateOutlined-DUuu5Tky.js";import l from"./AccessControlTabs-Ddo69OWs.js";import{roleApi as u,roleFields as d,roleInitialValues as f,roleValidationSchema as p,transformRolePayload as m,transformRoleRecord as h}from"./roleFormConfig-BXsQWLZ1.js";var g=e();function _(e){let _=e.id,v=!!_,y=v?`Edit Role`:`Create Role`,b=()=>i.visit(route(`hrm.roles.index`));return(0,g.jsxs)(o,{user:e.auth?.user,header:(0,g.jsx)(l,{activeKey:`roles`}),children:[(0,g.jsx)(a,{title:y}),(0,g.jsxs)(`div`,{className:`role-form-page`,children:[(0,g.jsx)(`div`,{className:`role-form-page__header`,children:(0,g.jsxs)(n,{children:[(0,g.jsx)(t,{icon:(0,g.jsx)(s,{}),onClick:b,children:`Back`}),(0,g.jsx)(c,{style:{color:`#1677ff`,fontSize:20}}),(0,g.jsxs)(`div`,{children:[(0,g.jsx)(`h1`,{children:y}),(0,g.jsx)(`p`,{children:`Set the role details and assign permissions from the seeded permission list.`})]})]})}),(0,g.jsx)(`div`,{className:`role-form-page__body`,children:(0,g.jsx)(r,{icon:(0,g.jsx)(c,{}),title:`Role`,apiUrl:u(`/api/hrm/roles`),fields:d,validationSchema:p,crudInitialValues:f,transformPayload:m,transformRecord:h,ui_type:v?`edit form`:`add form`,look_up_var:_,submitLabelOverride:v?`Update Role`:`Create Role`,onAddSuccess:b,onEditSuccess:b})})]}),(0,g.jsx)(`style`,{children:`
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