import{i as e}from"./rolldown-runtime-aKtaBQYM.js";import{i as t}from"./index.esm-CtIVDvdE.js";import{r as n,t as r}from"./jsx-runtime-RbF_zoRI.js";import{g as i}from"./useSize-Ua8SufHv.js";import{t as a}from"./alert-CXVdfG0X.js";import{t as o}from"./typography-BTjN9rxU.js";import{t as s}from"./select-DeUO9qHS.js";import{t as c}from"./empty-BOJtdRz7.js";import{t as l}from"./CheckOutlined-Cbi5nZA2.js";import{t as u}from"./SearchOutlined-obcpVUK3.js";import{i as d,t as f}from"./CentralLayout-BW-3i3Hw.js";import{t as p}from"./button-Bfjna4Nq.js";import{t as m}from"./color-picker-D_-oUpPa.js";import{t as h}from"./input-number-BgrxG3C5.js";import{t as g}from"./space-_4B_xOOu.js";import{t as _}from"./form-Byn7cRgH.js";import{t as v}from"./input-8WaApqsR.js";import{t as y}from"./modal-BqX7z5FQ.js";import{t as b}from"./ReloadOutlined-CMtviqc6.js";import{t as x}from"./switch-u3iqpXdf.js";import{t as S}from"./tag-u7YJ7gTQ.js";import{t as C}from"./DeleteOutlined-CjnT_w1K.js";import{t as w}from"./upload-BaSsT--P.js";import{a as T,i as E}from"./app-D7oZCFYk.js";import{t as D}from"./PageHeader-94cFdgGD.js";import{t as O}from"./SectionCard-DpSAdGSm.js";import{t as k}from"./RichTextEditor-hTTCVQvg.js";var A={icon:{tag:`svg`,attrs:{viewBox:`64 64 896 896`,focusable:`false`},children:[{tag:`path`,attrs:{d:`M518.3 459a8 8 0 00-12.6 0l-112 141.7a7.98 7.98 0 006.3 12.9h73.9V856c0 4.4 3.6 8 8 8h60c4.4 0 8-3.6 8-8V613.7H624c6.7 0 10.4-7.7 6.3-12.9L518.3 459z`}},{tag:`path`,attrs:{d:`M811.4 366.7C765.6 245.9 648.9 160 512.2 160S258.8 245.8 213 366.6C127.3 389.1 64 467.2 64 560c0 110.5 89.5 200 199.9 200H304c4.4 0 8-3.6 8-8v-60c0-4.4-3.6-8-8-8h-40.1c-33.7 0-65.4-13.4-89-37.7-23.5-24.2-36-56.8-34.9-90.6.9-26.4 9.9-51.2 26.2-72.1 16.7-21.3 40.1-36.8 66.1-43.7l37.9-9.9 13.9-36.6c8.6-22.8 20.6-44.1 35.7-63.4a245.6 245.6 0 0152.4-49.9c41.1-28.9 89.5-44.2 140-44.2s98.9 15.3 140 44.2c19.9 14 37.5 30.8 52.4 49.9 15.1 19.3 27.1 40.7 35.7 63.4l13.8 36.5 37.8 10C846.1 454.5 884 503.8 884 560c0 33.1-12.9 64.3-36.3 87.7a123.07 123.07 0 01-87.6 36.3H720c-4.4 0-8 3.6-8 8v60c0 4.4 3.6 8 8 8h40.1C870.5 760 960 670.5 960 560c0-92.7-63.1-170.7-148.6-193.3z`}}]},name:`cloud-upload`,theme:`outlined`},j=e(n());function M(){return M=Object.assign?Object.assign.bind():function(e){for(var t=1;t<arguments.length;t++){var n=arguments[t];for(var r in n)Object.prototype.hasOwnProperty.call(n,r)&&(e[r]=n[r])}return e},M.apply(this,arguments)}var N=j.forwardRef((e,t)=>j.createElement(i,M({},e,{ref:t,icon:A}))),P=r(),{Text:F}=o,I={currency_position:[`before`,`after`],default_billing_cycle:[`monthly`,`yearly`],default_scheme:[`https`,`http`],default_priority:[`low`,`normal`,`high`,`urgent`],mode:[`sandbox`,`live`]},L=new Set([`textarea`,`code editor`,`key-value editor`,`rich-text editor`,`image`]),R={general:`Core defaults used across the platform.`,branding:`Control how your product and organization appear.`,email:`Configure outbound email delivery and sender details.`,storage:`Choose where files are stored and how they are handled.`,notifications:`Manage system notifications and delivery behavior.`,security:`Review authentication and security-related preferences.`,billing:`Set billing defaults, currencies, and invoice behavior.`};function z({groups:e,activeGroup:n}){let[r,i]=(0,j.useState)(n),[s,m]=(0,j.useState)(``),[h,x]=(0,j.useState)(!1),[S,C]=(0,j.useState)(null),[w,k]=(0,j.useState)(``),[A]=_.useForm(),M=e[r]||[];(0,j.useEffect)(()=>{A.setFieldsValue(Object.fromEntries(M.map(e=>[e.key,W(e)]))),x(!1)},[r]),(0,j.useEffect)(()=>{let e=e=>{h&&(e.preventDefault(),e.returnValue=``)};return window.addEventListener(`beforeunload`,e),()=>window.removeEventListener(`beforeunload`,e)},[h]);let N=(0,j.useMemo)(()=>{let e=s.trim().toLowerCase();return e?M.filter(t=>`${t.label} ${t.key}`.toLowerCase().includes(e)):M},[M,s]),I=(0,j.useMemo)(()=>G(N),[N]),L=d(r),z=()=>{C(null),k(``)},V=()=>{A.setFieldsValue(Object.fromEntries(M.map(e=>[e.key,W(e)]))),x(!1)},H=e=>{let t={...e};return M.filter(e=>e.input_type===`key-value editor`).forEach(e=>{try{t[e.key]=JSON.parse(t[e.key]||`{}`)}catch{throw A.setFields([{name:e.key,errors:[`Enter valid JSON.`]}]),Error(`invalid-json`)}}),t},U=(e,n)=>{let i={values:e,confirmation_password:n||void 0},a={preserveScroll:!0,forceFormData:q(e),onSuccess:()=>{x(!1),z(),r===`branding`&&E().then(T).catch(()=>{})}};if(q(e)){t.post(route(`central.settings.update`,r),{...i,_method:`put`},a);return}t.put(route(`central.settings.update`,r),i,a)},K=()=>A.validateFields().then(e=>{try{let t=H(e);M.some(e=>e.requires_confirmation)?C({type:`save`,values:t}):U(t)}catch{}}),J=e=>{let n=()=>{i(e),t.get(route(`central.settings.index`),{group:e},{preserveState:!0,replace:!0})};if(!h)return n();y.confirm({title:`Discard unsaved changes?`,content:`Changes in the current section have not been saved.`,okText:`Discard`,okButtonProps:{danger:!0},onOk:n})},Y=()=>M.some(e=>e.requires_confirmation)?C({type:`reset`}):y.confirm({title:`Reset ${L}?`,content:`Every value in this section will return to its installation default.`,okText:`Reset section`,okButtonProps:{danger:!0},onOk:()=>t.post(route(`central.settings.reset`,r),{},{onSuccess:()=>x(!1)})}),X=()=>S?.type===`reset`?t.post(route(`central.settings.reset`,r),{confirmation_password:w},{preserveScroll:!0,onSuccess:()=>{x(!1),z()}}):U(S.values,w);return(0,P.jsxs)(f,{title:`Platform Settings`,children:[(0,P.jsx)(D,{eyebrow:`Administration`,title:`Platform Settings`,actions:(0,P.jsxs)(g,{wrap:!0,children:[[`email`,`storage`,`notifications`].includes(r)&&(0,P.jsx)(p,{onClick:()=>t.post(route(`central.settings.test`,r)),children:`Test configuration`}),(0,P.jsx)(p,{icon:(0,P.jsx)(b,{}),onClick:Y,children:`Reset to defaults`})]})}),(0,P.jsxs)(`div`,{className:`platform-settings-shell`,children:[(0,P.jsxs)(`aside`,{className:`platform-settings-nav`,children:[(0,P.jsx)(v,{prefix:(0,P.jsx)(u,{}),placeholder:`Search settings`,value:s,onChange:e=>m(e.target.value)}),(0,P.jsx)(`div`,{className:`platform-settings-nav__list`,children:Object.keys(e).map(e=>(0,P.jsx)(`button`,{type:`button`,className:r===e?`is-active`:``,"aria-current":r===e?`page`:void 0,onClick:()=>J(e),children:(0,P.jsx)(`span`,{children:d(e)})},e))})]}),(0,P.jsxs)(`main`,{className:`platform-settings-main`,children:[(0,P.jsxs)(O,{title:L,description:R[r]||`Manage ${L.toLowerCase()} preferences for your organization.`,children:[(0,P.jsx)(_,{form:A,layout:`vertical`,onValuesChange:()=>x(!0),children:I.map(e=>(0,P.jsxs)(`section`,{className:`platform-settings-panel`,children:[(0,P.jsx)(`div`,{className:`platform-settings-panel__header`,children:(0,P.jsx)(o.Title,{level:5,children:e.title})}),(0,P.jsx)(`div`,{className:`platform-settings-list`,children:e.items.map(e=>(0,P.jsx)(B,{item:e},e.key))})]},e.title))}),!N.length&&(0,P.jsx)(c,{description:`No settings match your search.`})]}),h&&(0,P.jsxs)(`div`,{className:`platform-settings-savebar`,role:`status`,children:[(0,P.jsx)(F,{children:`You have unsaved changes.`}),(0,P.jsxs)(g,{children:[(0,P.jsx)(p,{onClick:V,children:`Discard`}),(0,P.jsx)(p,{type:`primary`,icon:(0,P.jsx)(l,{}),onClick:K,children:`Save changes`})]})]})]})]}),(0,P.jsxs)(y,{open:!!S,title:S?.type===`reset`?`Confirm reset of ${L}`:`Confirm sensitive settings change`,okText:S?.type===`reset`?`Confirm reset`:`Confirm and save`,onCancel:z,onOk:X,okButtonProps:{disabled:!w,danger:S?.type===`reset`},children:[(0,P.jsx)(a,{type:`warning`,showIcon:!0,message:`This section contains security-sensitive values. Enter your current administrator password to continue.`,style:{marginBottom:16}}),(0,P.jsx)(v.Password,{autoComplete:`current-password`,value:w,onChange:e=>k(e.target.value),onPressEnter:()=>w&&X()})]}),(0,P.jsx)(`style`,{children:`
                .platform-settings-shell {
                    display: grid;
                    grid-template-columns: 240px minmax(0, 1fr);
                    gap: 24px;
                    align-items: start;
                }
                .platform-settings-nav {
                    position: sticky;
                    top: 88px;
                    display: grid;
                    gap: 10px;
                    padding: 10px;
                    border: 1px solid #e8edf3;
                    border-radius: 12px;
                    background: #fff;
                }
                .platform-settings-nav__list {
                    display: grid;
                    gap: 2px;
                    max-height: calc(100vh - 190px);
                    overflow: auto;
                }
                .platform-settings-nav button {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 12px;
                    width: 100%;
                    border: 0;
                    border-radius: 8px;
                    background: transparent;
                    cursor: pointer;
                    padding: 10px 11px;
                    color: #334155;
                    text-align: left;
                    transition: background 120ms ease, color 120ms ease;
                }
                .platform-settings-nav button:hover {
                    background: #f8fafc;
                }
                .platform-settings-nav button.is-active {
                    background: rgba(15, 118, 110, 0.1);
                    color: #0f766e;
                    font-weight: 600;
                }
                .platform-settings-main {
                    min-width: 0;
                    width: 100%;
                    max-width: 1040px;
                }
                .platform-settings-panel {
                    overflow: hidden;
                    margin-top: 22px;
                    border: 1px solid #e8edf3;
                    border-radius: 12px;
                    background: #fff;
                }
                .platform-settings-panel:first-child {
                    margin-top: 0;
                }
                .platform-settings-panel__header {
                    padding: 16px 20px;
                    border-bottom: 1px solid #e8edf3;
                    background: #fafbfc;
                }
                .platform-settings-panel__header h5 {
                    margin: 0;
                    font-size: 15px;
                }
                .platform-settings-list {
                    display: grid;
                }
                .platform-setting-field {
                    display: grid;
                    grid-template-columns: minmax(220px, 1fr) minmax(280px, 440px);
                    gap: 24px;
                    align-items: center;
                    min-width: 0;
                    padding: 18px 20px;
                    border-bottom: 1px solid #eef2f6;
                }
                .platform-setting-field:last-child {
                    border-bottom: 0;
                }
                .platform-setting-field:hover {
                    background: #fcfdfe;
                }
                .platform-setting-field.is-wide {
                    grid-template-columns: minmax(0, 1fr);
                    align-items: start;
                }
                .platform-setting-field.is-wide .platform-setting-field__control {
                    grid-column: 1 / -1;
                    grid-row: 2;
                }
                .platform-setting-field__copy {
                    min-width: 0;
                }
                .platform-setting-field__label-text {
                    display: flex;
                    align-items: center;
                    flex-wrap: wrap;
                    gap: 7px;
                    min-width: 0;
                }
                .platform-setting-field__required {
                    color: #dc2626;
                }
                .platform-setting-field__control {
                    min-width: 0;
                }
                .platform-setting-field .ant-form-item {
                    margin-bottom: 0;
                }
                .platform-setting-field .ant-select,
                .platform-setting-field .ant-input-number {
                    width: 100%;
                }
                .platform-setting-image {
                    display: grid;
                    grid-template-columns: minmax(140px, 210px) minmax(0, 1fr);
                    gap: 16px;
                    align-items: center;
                }
                .platform-setting-image__preview {
                    display: grid;
                    place-items: center;
                    min-height: 112px;
                    border: 1px dashed #cbd5e1;
                    border-radius: 10px;
                    background: #f8fafc;
                    overflow: hidden;
                }
                .platform-setting-image__preview img {
                    display: block;
                    max-width: 100%;
                    max-height: 130px;
                    object-fit: contain;
                }
                .platform-setting-color {
                    display: grid;
                    grid-template-columns: auto minmax(0, 1fr);
                    gap: 10px;
                    align-items: center;
                }
                .platform-settings-savebar {
                    position: sticky;
                    bottom: 16px;
                    z-index: 20;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 16px;
                    margin: 18px auto 0;
                    padding: 12px 14px 12px 18px;
                    border: 1px solid #dbe3ea;
                    border-radius: 12px;
                    background: rgba(255, 255, 255, 0.96);
                    box-shadow: 0 12px 34px rgba(15, 23, 42, 0.14);
                    backdrop-filter: blur(10px);
                }
                @media (max-width: 1100px) {
                    .platform-settings-shell {
                        grid-template-columns: 1fr;
                    }
                    .platform-settings-nav {
                        position: static;
                    }
                    .platform-settings-nav__list {
                        grid-template-columns: repeat(2, minmax(0, 1fr));
                        max-height: none;
                    }
                    .platform-settings-main {
                        max-width: none;
                    }
                }
                @media (max-width: 760px) {
                    .platform-settings-nav__list,
                    .platform-setting-image {
                        grid-template-columns: 1fr;
                    }
                    .platform-setting-field,
                    .platform-setting-field.is-wide {
                        grid-template-columns: minmax(0, 1fr);
                        gap: 14px;
                    }
                    .platform-setting-field__control {
                        grid-column: 1 / -1;
                    }
                    .platform-settings-savebar {
                        align-items: flex-start;
                        flex-direction: column;
                    }
                }
            `})]})}function B({item:e}){return(0,P.jsxs)(`div`,{className:`platform-setting-field ${L.has(e.input_type)?`is-wide`:``}`,children:[(0,P.jsx)(`div`,{className:`platform-setting-field__copy`,children:(0,P.jsxs)(`div`,{className:`platform-setting-field__label-text`,children:[(0,P.jsxs)(F,{strong:!0,children:[e.label,e.is_required&&(0,P.jsx)(`span`,{className:`platform-setting-field__required`,children:` *`})]}),e.requires_restart&&(0,P.jsx)(S,{color:`gold`,children:`Restart required`}),e.is_readonly&&(0,P.jsx)(S,{children:`Read-only`})]})}),(0,P.jsx)(`div`,{className:`platform-setting-field__control`,children:(0,P.jsx)(_.Item,{name:e.key,rules:[...e.is_required?[{required:!0,message:`${e.label} is required.`}]:[],...e.input_type===`key-value editor`?[{validator:(e,t)=>{try{return JSON.parse(t||`{}`),Promise.resolve()}catch{return Promise.reject(Error(`Enter valid JSON.`))}}}]:[]],valuePropName:e.input_type===`switch`?`checked`:`value`,children:U(e)})})]})}function V({value:e,onChange:t,disabled:n}){return(0,P.jsxs)(`div`,{className:`platform-setting-color`,children:[(0,P.jsx)(m,{disabled:n,value:/^#[0-9a-fA-F]{6}$/.test(e||``)?e:`#0f766e`,showText:!0,onChangeComplete:e=>t?.(e.toHexString())}),(0,P.jsx)(v,{disabled:n,value:e||``,placeholder:`#0f766e`,onChange:e=>t?.(e.target.value)})]})}function H({value:e,onChange:t,item:n}){let[r,i]=(0,j.useState)(null),a=r||(typeof e==`string`?n.preview_url||e:n.preview_url);return(0,j.useEffect)(()=>{if(!(e instanceof File))return;let t=URL.createObjectURL(e);return i(t),()=>URL.revokeObjectURL(t)},[e]),(0,P.jsxs)(`div`,{className:`platform-setting-image`,children:[(0,P.jsx)(`div`,{className:`platform-setting-image__preview`,children:a?(0,P.jsx)(`img`,{src:a,alt:n.label}):(0,P.jsx)(F,{type:`secondary`,children:`No image`})}),(0,P.jsxs)(g,{direction:`vertical`,size:8,style:{width:`100%`},children:[(0,P.jsx)(w,{accept:`image/*,.ico`,maxCount:1,showUploadList:!1,beforeUpload:e=>(t?.(e),!1),disabled:n.is_readonly,children:(0,P.jsx)(p,{icon:(0,P.jsx)(N,{}),disabled:n.is_readonly,children:`Choose image`})}),(0,P.jsx)(v,{value:e instanceof File?e.name:e||``,onChange:e=>t?.(e.target.value),placeholder:`Paste image URL or upload a file`,disabled:n.is_readonly}),(e||n.preview_url)&&(0,P.jsx)(p,{icon:(0,P.jsx)(C,{}),onClick:()=>t?.(``),disabled:n.is_readonly,children:`Clear image`})]})]})}function U(e){let t={disabled:e.is_readonly},n=e.input_type;return n===`switch`?(0,P.jsx)(x,{...t}):n===`number`||n===`decimal`?(0,P.jsx)(h,{...t,precision:n===`decimal`?2:0,style:{width:`100%`}}):n===`rich-text editor`?(0,P.jsx)(k,{autosaveKey:`setting.${e.key}`}):[`textarea`,`code editor`,`key-value editor`].includes(n)?(0,P.jsx)(v.TextArea,{...t,rows:n===`code editor`||n===`key-value editor`?8:4,className:n===`textarea`?void 0:`central-code`}):[`select`,`timezone`,`currency`,`country`].includes(n)?(0,P.jsx)(s,{...t,showSearch:!0,allowClear:!0,options:(I[e.key.split(`.`).pop()]||e.options||[]).map(e=>typeof e==`object`?e:{value:e,label:d(e)})}):n===`multiselect`?(0,P.jsx)(s,{...t,mode:`tags`,tokenSeparators:[`,`],options:(e.options||[]).map(e=>({value:e,label:String(e)}))}):n===`secret`||n===`password`?(0,P.jsx)(v.Password,{...t,autoComplete:`new-password`,placeholder:e.has_secret?`Stored securely - enter a replacement`:`Enter secret`}):n===`color`?(0,P.jsx)(V,{disabled:e.is_readonly}):n===`image`?(0,P.jsx)(H,{item:e}):(0,P.jsx)(v,{...t,type:n===`email`?`email`:n===`url`?`url`:n===`date`?`date`:n===`date and time`?`datetime-local`:`text`,placeholder:e.has_secret?`Stored securely`:``})}function W(e){return e.input_type===`key-value editor`?JSON.stringify(e.value||{},null,2):e.value}function G(e){if(!e.length)return[];let t=[{title:`Identity`,test:e=>K(e,[`name`,`logo`,`favicon`,`color`,`tagline`,`description`,`company`,`address`,`phone`,`email`,`website`,`footer`,`signatory`]),items:[]},{title:`Access & Defaults`,test:e=>K(e,[`default`,`allow`,`require`,`enabled`,`mode`,`timezone`,`locale`,`currency`,`country`,`format`,`cycle`,`trial`]),items:[]},{title:`Delivery & Operations`,test:e=>K(e,[`driver`,`host`,`port`,`queue`,`schedule`,`retry`,`timeout`,`notification`,`webhook`,`storage`,`backup`,`provider`,`ssl`,`domain`]),items:[]},{title:`Rules & Limits`,test:e=>K(e,[`limit`,`maximum`,`minimum`,`retention`,`period`,`attempts`,`threshold`,`expiration`,`days`,`size`,`rate`,`tax`,`grace`]),items:[]},{title:`Content`,test:e=>K(e,[`message`,`notes`,`template`,`schema`,`robots`,`meta`,`title`,`label`,`url`,`text`]),items:[]}],n={title:`Other`,items:[]};return e.forEach(e=>{(t.find(t=>t.test(e))||n).items.push(e)}),[...t,n].filter(e=>e.items.length)}function K(e,t){let n=`${e.key} ${e.label}`.toLowerCase();return t.some(e=>n.includes(e))}function q(e){return Object.values(e).some(e=>e instanceof File)}export{z as default};