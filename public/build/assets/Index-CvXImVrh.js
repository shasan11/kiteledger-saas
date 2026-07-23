import{i as e}from"./chunk-62oNxeRG.js";import{i as t}from"./axios-CFfZBleg.js";import{r as n,t as r}from"./jsx-runtime-gigNY91P.js";import{t as i}from"./dayjs.min-CJ7289I6.js";import{t as a}from"./space-DwTT9ayb.js";import{t as o}from"./typography-COSGzUQY.js";import{t as s}from"./tag-CxQ8hfzV.js";import{t as c}from"./ReusableCrud-DzZhmCEW.js";import{t as l}from"./index.esm-s6VguL6m.js";import{t as u}from"./AuthenticatedLayout-PBzSTFGM.js";import{t as d}from"./PercentageOutlined-5yL4pIgB.js";import{i as f,n as p,o as m,r as h}from"./index.esm-Bnj5Dmy_.js";var g=e(n(),1),_=e(i(),1),v=r(),{Text:y}=o,b=``,x=e=>`${b}${e}`,S=e=>{let t=Number(e);return Number.isFinite(t)?t:0},C=e=>e==null||e===``?null:typeof e==`object`?e.id??e.value??null:e,w=e=>e==null||typeof e==`string`&&e.trim()===``?null:e,T=e=>{if(!e)return null;if(_.default.isDayjs(e))return e.isValid()?e.format(`YYYY-MM-DD`):null;let t=(0,_.default)(e,[`YYYY-MM-DD`,`DD-MM-YYYY`],!0);if(t.isValid())return t.format(`YYYY-MM-DD`);let n=(0,_.default)(e);return n.isValid()?n.format(`YYYY-MM-DD`):null},E=e=>e?String(e).replace(/_/g,` `).replace(/\b\w/g,e=>e.toUpperCase()):`-`,D=(e,t,n)=>e?.[t]?.label||e?.[t]?.name||e?.[n]?.label||e?.[`${n}_detail`]?.label||e?.[`${t}_name`]||e?.[`${n}_name`]||`-`,O=e=>{let t=S(e);return t<=0?`default`:t<=5?`blue`:t<=13?`green`:`orange`},k={sale:`green`,purchase:`blue`,both:`purple`,expense:`gold`},A=[{value:`vat`,label:`VAT`},{value:`gst`,label:`GST`},{value:`sales_tax`,label:`Sales Tax`},{value:`service_tax`,label:`Service Tax`},{value:`tds`,label:`TDS`},{value:`tcs`,label:`TCS`},{value:`withholding`,label:`Withholding`},{value:`use_tax`,label:`Use Tax`},{value:`reverse_charge`,label:`Reverse Charge`},{value:`zero_rated`,label:`Zero Rated`},{value:`exempt`,label:`Exempt`},{value:`excise`,label:`Excise`},{value:`customs`,label:`Customs`},{value:`custom`,label:`Custom`}],j=[{value:`sale`,label:`Sale`},{value:`purchase`,label:`Purchase`},{value:`both`,label:`Both`},{value:`expense`,label:`Expense`}],M=[{value:`single`,label:`Single Rate`},{value:`split`,label:`Split / Components`},{value:`compound`,label:`Compound`}],N=[{value:`NP`,label:`NP - Nepal`},{value:`IN`,label:`IN - India`},{value:`US`,label:`US - United States`}],P={id:void 0,component_name:``,component_type:`vat`,rate_percent:0,account_id:null,sort_order:0};function F({auth:e}){let[n,r]=(0,g.useState)(N);(0,g.useEffect)(()=>{t.get(x(`/api/tax-country-options`)).then(({data:e})=>{Array.isArray(e)&&e.length&&r(e.map(e=>({value:e.value,label:`${e.value} - ${e.label}`})))}).catch(()=>{})},[]);let i=(0,g.useMemo)(()=>({title:`Tax Jurisdiction`,buttonLabel:`Add Tax Jurisdiction`,apiUrl:x(`/api/tax-jurisdictions/`),initialValues:{country_code:`NP`,name:``,code:``,tax_system:``,active:!0},validationSchema:p({country_code:f().required(`Country is required`),name:f().required(`Jurisdiction name is required`),code:f().required(`Code is required`)}),fields:[{name:`country_code`,label:`Country`,type:`select`,col:12,required:!0,options:n},{name:`name`,label:`Name`,type:`text`,col:12,required:!0,placeholder:`Nepal VAT`},{name:`code`,label:`Code`,type:`text`,col:12,required:!0,placeholder:`NP-VAT`},{name:`tax_system`,label:`Tax System Code`,type:`text`,col:12,placeholder:`e.g. nepal_vat / france_tva`},{name:`active`,label:`Active`,type:`switch`,col:8}],transformPayload:e=>({country_code:e.country_code||`NP`,name:w(e.name),code:w(e.code),tax_system:w(e.tax_system)||void 0,active:e.active!==!1})}),[n]),o=(0,g.useMemo)(()=>({title:`Tax Class`,buttonLabel:`Add Tax Class`,apiUrl:x(`/api/tax-classes/`),initialValues:{tax_jurisdiction_id:null,country_code:`NP`,name:``,code:``,tax_type:`vat`,tax_behavior:`standard`,description:``,active:!0},validationSchema:p({name:f().required(`Tax class name is required`),code:f().required(`Code is required`),tax_type:f().required(`Tax type is required`)}),fields:[{name:`name`,label:`Name`,type:`text`,col:12,required:!0,placeholder:`VAT 13%`},{name:`code`,label:`Code`,type:`text`,col:12,required:!0,placeholder:`VAT13`},{name:`tax_jurisdiction_id`,label:`Jurisdiction`,type:`fkSelect`,col:12,fkUrl:x(`/api/tax-jurisdictions/`),fkSearchParam:`search`,fkPageSize:20,fkValueKey:`id`,fkLabelKey:`name`,storeFullObject:!0,quickAdd:i,allowClear:!0},{name:`tax_type`,label:`Tax Type`,type:`select`,col:12,required:!0,options:A},{name:`description`,label:`Description`,type:`textarea`,col:24,rows:2},{name:`active`,label:`Active`,type:`switch`,col:8}],transformPayload:e=>({tax_jurisdiction_id:C(e.tax_jurisdiction_id),country_code:e.tax_jurisdiction_id?.country_code||e.country_code||`NP`,name:w(e.name),code:w(e.code),tax_type:e.tax_type||`vat`,tax_behavior:e.tax_behavior||`standard`,description:w(e.description),active:e.active!==!1})}),[n,i]),_=(0,g.useMemo)(()=>[{title:`Tax Rate`,dataIndex:`name`,key:`name`,sorter:!0,render:(e,t)=>(0,v.jsxs)(a,{direction:`vertical`,size:0,children:[(0,v.jsx)(y,{strong:!0,children:e||`-`}),(0,v.jsx)(y,{type:`secondary`,children:t?.code||`-`})]})},{title:`Rate`,dataIndex:`rate_percent`,key:`rate_percent`,width:110,align:`right`,sorter:!0,render:e=>(0,v.jsxs)(s,{color:O(e),style:{marginInlineEnd:0},children:[S(e),`%`]})},{title:`Applies On`,dataIndex:`applies_on`,key:`applies_on`,width:130,render:e=>(0,v.jsx)(s,{color:k[e]||`default`,children:E(e||`both`)})},{title:`Jurisdiction`,key:`tax_jurisdiction`,render:(e,t)=>D(t,`tax_jurisdiction`,`tax_jurisdiction_id`)},{title:`Tax Class`,key:`tax_class`,render:(e,t)=>D(t,`tax_class`,`tax_class_id`)},{title:`Inclusive`,dataIndex:`inclusive`,key:`inclusive`,width:120,render:e=>(0,v.jsx)(s,{color:e?`green`:`default`,children:e?`Inclusive`:`Exclusive`})},{title:`Status`,dataIndex:`active`,key:`active`,width:100,render:e=>(0,v.jsx)(s,{color:e===!1?`red`:`green`,children:e===!1?`Inactive`:`Active`})}],[]),b=(0,g.useMemo)(()=>[{type:`group`,label:`Tax Rate Details`,col:24,accordion:!1,children:[{name:`name`,label:`Tax Name`,type:`text`,col:12,required:!0,placeholder:`VAT 13%`},{name:`code`,label:`Code`,type:`text`,col:6,placeholder:`VAT13`},{name:`rate_percent`,label:`Rate %`,type:`number`,col:6,required:!0,min:0,max:100,placeholder:`13`},{name:`tax_class_id`,label:`Tax Class`,type:`fkSelect`,col:12,required:!0,fkUrl:x(`/api/tax-classes/`),fkSearchParam:`search`,fkPageSize:20,fkValueKey:`id`,fkLabelKey:`name`,storeFullObject:!0,quickAdd:o,allowClear:!0,placeholder:`Select tax class`},{name:`tax_jurisdiction_id`,label:`Tax Jurisdiction`,type:`fkSelect`,col:12,required:!0,fkUrl:x(`/api/tax-jurisdictions/`),fkSearchParam:`search`,fkPageSize:20,fkValueKey:`id`,fkLabelKey:`name`,storeFullObject:!0,quickAdd:i,allowClear:!0,placeholder:`Select jurisdiction`},{name:`applies_on`,label:`Applies On`,type:`select`,col:8,required:!0,options:j},{name:`calculation_method`,label:`Calculation`,type:`select`,col:8,required:!0,options:M},{name:`inclusive`,label:`Inclusive Tax`,type:`switch`,col:4},{name:`active`,label:`Active`,type:`switch`,col:4}]},{type:`group`,label:`+ Add More Details`,col:24,defaultOpen:!1,bordered:!1,children:[{name:`tax_type`,label:`Tax Type`,type:`select`,col:8,options:A},{name:`effective_from`,label:`Effective From`,type:`datePicker`,col:8,format:`DD-MM-YYYY`},{name:`effective_to`,label:`Effective To`,type:`datePicker`,col:8,format:`DD-MM-YYYY`},{name:`report_code`,label:`Report Code`,type:`text`,col:8,placeholder:`Optional`},{name:`components`,label:`Tax Components`,type:`objectArray`,col:24,addButtonLabel:`Add Component`,defaultItem:{...P},headerBg:`#334155`,headerColor:`#ffffff`,rowStartExpanded:!1,columns:[{key:`component_name`,name:`component_name`,label:`Component`,type:`text`,width:`220px`,placeholder:`CGST / SGST`},{key:`component_type`,name:`component_type`,label:`Type`,type:`select`,width:`140px`,options:A},{key:`rate_percent`,name:`rate_percent`,label:`Rate %`,type:`number`,width:`100px`,min:0,max:100},{key:`account_id`,name:`account_id`,label:`Account`,type:`fkSelect`,width:`240px`,fkUrl:x(`/api/accounts/`),fkSearchParam:`search`,fkPageSize:20,fkValueKey:`id`,fkLabelKey:`name`,allowClear:!0},{key:`sort_order`,name:`sort_order`,label:`Sort`,type:`number`,width:`90px`,min:0}]}]}],[i,o]),F=(0,g.useMemo)(()=>p({name:f().required(`Tax name is required`),tax_class_id:m().test(`tax-class-required`,`Tax class is required`,e=>!!C(e)).required(`Tax class is required`),tax_jurisdiction_id:m().test(`tax-jurisdiction-required`,`Tax jurisdiction is required`,e=>!!C(e)).required(`Tax jurisdiction is required`),rate_percent:h().typeError(`Rate must be a number`).min(0,`Rate cannot be negative`).max(100,`Rate cannot exceed 100`).required(`Rate is required`),applies_on:f().required(`Applies on is required`),calculation_method:f().required(`Calculation method is required`)}),[]),I=(0,g.useMemo)(()=>({name:``,code:``,tax_class_id:null,tax_jurisdiction_id:null,country_code:`NP`,tax_type:`vat`,rate_percent:0,inclusive:!1,calculation_method:`single`,applies_on:`both`,effective_from:null,effective_to:null,report_code:``,active:!0,components:[],deleted_component_ids:[]}),[]);return(0,v.jsxs)(u,{auth:e,children:[(0,v.jsx)(l,{title:`Tax Rates`}),(0,v.jsx)(`style`,{children:`
          .tax-rate-drawer .ant-drawer-header {
            min-height: 42px;
            padding: 0 16px;
            border-bottom: 1px solid #e2e8f0;
          }

          .tax-rate-drawer .ant-drawer-title {
            font-size: 14px;
            font-weight: 700;
            color: #0f172a;
          }

          .tax-rate-drawer .ant-drawer-body {
            padding: 16px;
            background: #f8fafc;
          }

          .tax-rate-drawer .ant-form {
            max-width: 980px;
            margin: 0 auto;
            padding: 16px;
            background: #ffffff;
            border: 1px solid #e2e8f0;
            box-shadow: 0 12px 30px rgba(15, 23, 42, 0.06);
          }

          .tax-rate-drawer .ant-form-item {
            margin-bottom: 14px;
          }

          .tax-rate-drawer .ant-form-item-label {
            padding-bottom: 4px;
          }

          .tax-rate-drawer .ant-form-item-label > label {
            height: auto;
            font-size: 12px;
            font-weight: 650;
            color: #334155;
          }

          .tax-rate-drawer .ant-input,
          .tax-rate-drawer .ant-input-number,
          .tax-rate-drawer .ant-picker,
          .tax-rate-drawer .ant-select-selector {
            min-height: 34px;
            border-radius: 6px !important;
            border-color: #cbd5e1 !important;
            box-shadow: none !important;
          }

          .tax-rate-drawer .ant-input-number {
            width: 100%;
          }

          .tax-rate-drawer textarea.ant-input {
            min-height: 76px;
          }

          .tax-rate-drawer .ant-table {
            border: 1px solid #e2e8f0;
            border-radius: 8px;
          }

          .tax-rate-drawer .ant-table-thead > tr > th {
            background: #334155 !important;
            color: #ffffff !important;
            font-size: 12px;
            font-weight: 700;
          }

          .tax-rate-drawer .ant-table-tbody > tr > td {
            padding: 8px;
            vertical-align: top;
          }
        `}),(0,v.jsx)(c,{title:`Tax Rates`,addTitle:`New Tax Rate`,editTitle:`Edit Tax Rate`,icon:(0,v.jsx)(d,{}),apiUrl:x(`/api/tax-rates/`),columns:_,fields:b,validationSchema:F,crudInitialValues:I,transformRecord:(e={})=>({...e,tax_class_id:e.taxClass||e.tax_class||e.tax_class_id_detail||e.tax_class_id||null,tax_jurisdiction_id:e.taxJurisdiction||e.tax_jurisdiction||e.tax_jurisdiction_id_detail||e.tax_jurisdiction_id||null,tax_type:e.tax_type||`vat`,calculation_method:e.calculation_method||`single`,applies_on:e.applies_on||`both`,inclusive:!!e.inclusive,active:e.active!==!1,components:Array.isArray(e.components)?e.components:Array.isArray(e.tax_rate_components)?e.tax_rate_components:[]}),transformPayload:(e={})=>{let t=e.tax_class_id,n=e.tax_jurisdiction_id,r=Array.isArray(e.components)?e.components.filter(e=>e?.component_name||e?.component_type||S(e?.rate_percent)>0).map(t=>({...t.id?{id:t.id}:{},component_name:w(t.component_name),component_type:t.component_type||e.tax_type||`vat`,rate_percent:S(t.rate_percent),account_id:C(t.account_id),sort_order:S(t.sort_order)})):[];return{name:w(e.name),code:w(e.code),tax_class_id:C(t),tax_jurisdiction_id:C(n),country_code:n?.country_code||t?.country_code||e.country_code||`NP`,tax_type:e.tax_type||t?.tax_type||`vat`,rate_percent:S(e.rate_percent),inclusive:!!e.inclusive,calculation_method:e.calculation_method||`single`,applies_on:e.applies_on||`both`,effective_from:T(e.effective_from),effective_to:T(e.effective_to),report_code:w(e.report_code),active:e.active!==!1,components:r,deleted_component_ids:Array.isArray(e.deleted_component_ids)?e.deleted_component_ids.filter(Boolean):[]}},form_ui:`drawer`,drawerWidth:1040,drawerClassName:`tax-rate-drawer`,searchParam:`search`,pageParam:`page`,pageSizeParam:`page_size`,sortMode:`ordering`,orderingParam:`ordering`,enableServerPagination:!0,showSearch:!0,canAdd:!0,canEdit:!0,canDelete:!0,hasActions:!0,hasActionColumns:!0})]})}export{F as default};