import { Head, router, usePage } from '@inertiajs/react';
import {
    AlertOutlined, AppstoreOutlined, AuditOutlined, BankOutlined, BellOutlined, BookOutlined,
    CloudServerOutlined, CodeSandboxOutlined, CreditCardOutlined, DashboardOutlined,
    DatabaseOutlined, FileImageOutlined, FileTextOutlined, GlobalOutlined, HeartOutlined, HomeOutlined,
    LogoutOutlined, MenuFoldOutlined, MenuOutlined, MenuUnfoldOutlined, MessageOutlined, NotificationOutlined,
    PlusOutlined, QuestionCircleOutlined, SafetyCertificateOutlined, SearchOutlined, SettingOutlined,
    ShopOutlined, TagsOutlined, TeamOutlined, UserOutlined,
} from '@ant-design/icons';
import axios from 'axios';
import { Avatar, Badge, Breadcrumb, Button, Drawer, Dropdown, Empty, Input, Layout, Menu, Modal, Popover, Spin, Tag, Typography } from 'antd';
import { useEffect, useMemo, useState } from 'react';
import ApplicationLogo from '@/Components/ApplicationLogo';
import { humanize, initials } from '@/Components/Central/formatters';

const { Header, Sider, Content } = Layout;
const entry = (routeName, label, icon, permission = null, params = undefined) => ({ routeName, label, icon, permission, params });
const navigation = [
    ['Overview', [entry('central.dashboard','Home',<DashboardOutlined/>,'dashboard.view')]],
    ['Customers', [entry('central.tenants.index','Customers',<TeamOutlined/>,'tenant.view'),entry('central.subscriptions.index','Subscriptions',<CreditCardOutlined/>,'subscription.view'),entry('central.usage.index','Usage',<DashboardOutlined/>,'tenant.view'),entry('central.tenant-feature-overrides.index','Feature Overrides',<SettingOutlined/>,'feature_override.manage')]],
    ['Revenue', [entry('central.dashboard','Revenue Overview',<BankOutlined/>,'dashboard.view'),entry('central.invoices.index','Invoices',<FileTextOutlined/>,'invoice.view'),entry('central.payments.index','Payments',<BankOutlined/>,'payment.view'),entry('central.gateways.index','Payment Gateways',<CreditCardOutlined/>,'gateway.view'),entry('central.invoice-customization.index','Invoice Customization',<FileTextOutlined/>,'invoice.customize')]],
    ['Support', [entry('central.support.tickets.index','Tickets',<MessageOutlined/>,'ticket.view'),entry('central.support-categories.index','Support Categories',<TagsOutlined/>,'support.manage'),entry('central.saved-replies.index','Saved Replies',<MessageOutlined/>,'support.manage'),entry('central.settings.index','Support Settings',<SettingOutlined/>,'settings.view',{group:'support'})]],
    ['Infrastructure', [entry('central.tenant-databases.index','Customer Databases',<DatabaseOutlined/>,'system_health.view'),entry('central.provisioning-logs.index','Provisioning Logs',<CloudServerOutlined/>,'system_health.view'),entry('central.backups.index','Backups',<CodeSandboxOutlined/>,'system_health.view'),entry('central.dashboard','System Health',<HeartOutlined/>,'system_health.view')]],
    ['Product', [entry('central.plans.index','Plans',<AppstoreOutlined/>,'plan.view'),entry('central.features.index','Features',<AppstoreOutlined/>,'feature.view'),entry('central.default-templates.index','Default Templates',<CodeSandboxOutlined/>,'settings.view')]],
    ['Website', [entry('central.website.overview','Website Overview',<HomeOutlined/>,'cms.view'),entry('central.website-pages.index','Pages',<FileTextOutlined/>,'cms.view'),entry('central.website-sections.index','Sections',<AppstoreOutlined/>,'cms.manage'),entry('central.website-menus.index','Navigation Menus',<GlobalOutlined/>,'cms.manage'),entry('central.blog.index','Blog Posts',<BookOutlined/>,'blog.view'),entry('central.blog-categories.index','Blog Categories',<TagsOutlined/>,'blog.manage'),entry('central.blog-tags.index','Blog Tags',<TagsOutlined/>,'blog.manage'),entry('central.website-faqs.index','FAQs',<QuestionCircleOutlined/>,'cms.manage'),entry('central.website-testimonials.index','Testimonials',<TeamOutlined/>,'cms.manage'),entry('central.seo.index','SEO Settings',<SearchOutlined/>,'seo.manage'),entry('central.settings.index','Website Branding',<ShopOutlined/>,'website.branding.manage',{group:'branding'}),entry('central.media.index','Media Library',<FileImageOutlined/>,'cms.manage')]],
    ['Administration', [entry('central.settings.index','Platform Settings',<SettingOutlined/>,'settings.view'),entry('central.notifications.index','Notifications',<NotificationOutlined/>),entry('central.central-admins.index','Admin Users',<UserOutlined/>,'admin.manage'),entry('central.roles.index','Roles and Permissions',<SafetyCertificateOutlined/>,'role.manage'),entry('central.audit-logs.index','Audit Logs',<AuditOutlined/>,'audit.view')]],
];

export default function CentralLayout({ title, subtitle, breadcrumbs = [], children }) {
    const page = usePage();
    const user = page.props?.auth?.user || page.props?.centralAdmin || {};
    const permissions = page.props?.auth?.permissions || [];
    const bypass = page.props?.auth?.canBypassPermissions;
    const notificationData = page.props?.centralNotifications || { unread:0, recent:[] };
    const [collapsed, setCollapsed] = useState(() => localStorage.getItem('central.sidebar.collapsed') === '1');
    const [mobileOpen, setMobileOpen] = useState(false);
    const [searchOpen, setSearchOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [searching, setSearching] = useState(false);
    const [results, setResults] = useState([]);
    const can = (permission) => !permission || bypass || permissions.includes(permission);
    const groups = useMemo(() => navigation.map(([group, entries]) => [group, entries.filter((item) => can(item.permission) && route().has(item.routeName))]).filter(([,items]) => items.length), [permissions, bypass]);
    const allNav = useMemo(() => groups.flatMap(([group, entries]) => entries.map((item) => ({...item, group, key:`${group}-${item.label}`, url:route(item.routeName,item.params)}))), [groups]);
    const currentPath = page.url.split('?')[0];
    const active = [...allNav].sort((a,b) => new URL(b.url,location.origin).pathname.length-new URL(a.url,location.origin).pathname.length).find((item) => currentPath.startsWith(new URL(item.url,location.origin).pathname));

    useEffect(() => { localStorage.setItem('central.sidebar.collapsed', collapsed ? '1' : '0'); }, [collapsed]);
    useEffect(() => {
        if (!searchOpen || query.trim().length < 2) { setResults([]); return; }
        const timer = setTimeout(async () => { setSearching(true); try { const {data} = await axios.get(route('central.search'),{params:{q:query}}); setResults(data.data||[]); } finally { setSearching(false); } }, 250);
        return () => clearTimeout(timer);
    }, [query, searchOpen]);

    const menuItems = groups.flatMap(([label, entries]) => entries.map((item) => ({ key:`${label}-${item.label}`, label:item.label, icon:item.icon, onClick:()=>{setMobileOpen(false);router.visit(route(item.routeName,item.params));} })));
    const trail = [{title:'Home'}, ...(breadcrumbs.length?breadcrumbs:active&&active.label!==title?[{title:active.label}]:[]), {title}].filter((item,index,array)=>item.title&&array.findIndex((x)=>x.title===item.title)===index);
    const profileItems = [
        {key:'profile',label:'Profile',icon:<UserOutlined/>,onClick:()=>router.visit(route('central.central-admins.index'))},
        {key:'security',label:'Security and MFA',icon:<SafetyCertificateOutlined/>,onClick:()=>router.visit(route('central.settings.index',{group:'security'}))},
        {key:'activity',label:'Activity',icon:<AuditOutlined/>,onClick:()=>router.visit(route('central.audit-logs.index'))},
        {type:'divider'}, {key:'site',label:'View public website',icon:<ShopOutlined/>,onClick:()=>router.visit(route('central.home'))},
        {type:'divider'}, {key:'logout',label:'Logout',danger:true,icon:<LogoutOutlined/>,onClick:()=>router.post(route('central.logout'))},
    ];
    const renderMenu = (isCollapsed) => <><div className="central-sider__brand"><ApplicationLogo dark className="central-sider__logo" alt="KiteLedger"/></div><div className="central-sider__menu"><Menu theme="dark" mode="inline" inlineCollapsed={isCollapsed} selectedKeys={[active?.key]} items={menuItems}/></div></>;
    const notifications = <div style={{width:360,maxWidth:'82vw'}}><div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}><Typography.Text strong>Notifications</Typography.Text>{notificationData.unread>0&&<Button type="link" size="small" onClick={()=>router.post(route('central.notifications.read-all'))}>Mark all read</Button>}</div>{notificationData.recent?.length?notificationData.recent.map((item)=><button key={item.id} onClick={()=>item.action_url&&router.visit(item.action_url)} style={{display:'block',width:'100%',textAlign:'left',padding:'10px 4px',border:0,borderBottom:'1px solid #eef2f7',background:'transparent',cursor:'pointer'}}><Tag color={item.severity==='critical'||item.severity==='error'?'red':item.severity==='warning'?'orange':item.severity==='success'?'green':'blue'}>{humanize(item.severity)}</Tag><Typography.Text strong>{item.title}</Typography.Text><Typography.Paragraph type="secondary" ellipsis={{rows:2}} style={{margin:'5px 0 0'}}>{item.message}</Typography.Paragraph></button>):<Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No notifications"/>}<Button type="link" block onClick={()=>router.visit(route('central.notifications.index'))}>View all notifications</Button></div>;

    return <Layout className="central-shell"><Head title={title}/><Sider className="central-sider" width={270} collapsedWidth={80} collapsed={collapsed} trigger={null}>{renderMenu(collapsed)}</Sider><Drawer open={mobileOpen} onClose={()=>setMobileOpen(false)} placement="left" width={290} closable={false} styles={{body:{padding:0,background:'#101827'}}}><div style={{width:290,minHeight:'100vh'}}>{renderMenu(false)}</div></Drawer><Layout className={`central-main${collapsed?' central-main--collapsed':''}`}><Header className="central-topbar"><div className="central-topbar__left"><Button className="central-desktop-toggle" type="text" icon={collapsed?<MenuUnfoldOutlined/>:<MenuFoldOutlined/>} onClick={()=>setCollapsed((value)=>!value)}/><Button className="central-mobile-toggle" type="text" icon={<MenuOutlined/>} onClick={()=>setMobileOpen(true)}/><Breadcrumb className="central-topbar__crumbs" items={trail}/></div><div className="central-topbar__spacer"/><button className="central-topbar__search" onClick={()=>setSearchOpen(true)}><SearchOutlined/><span>Search customers, invoices, tickets, content...</span></button><Button type="text" shape="circle" icon={<HeartOutlined style={{color:'#059669'}}/>} aria-label="System health" onClick={()=>router.visit(route('central.dashboard'))}/><Button type="text" shape="circle" icon={<QuestionCircleOutlined/>} aria-label="Support" onClick={()=>router.visit(route('central.support.tickets.index'))}/><Popover placement="bottomRight" trigger="click" content={notifications}><Badge count={notificationData.unread} overflowCount={99}><Button type="text" shape="circle" icon={<BellOutlined/>} aria-label="Notifications"/></Badge></Popover><Dropdown menu={{items:profileItems}} trigger={['click']} placement="bottomRight"><button className="central-profile"><Avatar size={34}>{initials(user.name||user.email)}</Avatar><span className="central-profile__copy"><strong>{user.name||'Administrator'}</strong><span>{humanize(user.role||'super admin')}</span></span></button></Dropdown></Header><Content className="central-content"><div className="central-content__inner">{subtitle&&<Typography.Text type="secondary">{subtitle}</Typography.Text>}{children}</div></Content></Layout><Modal open={searchOpen} onCancel={()=>{setSearchOpen(false);setQuery('');setResults([]);}} footer={null} title="Search Home" width={680}><Input autoFocus size="large" prefix={<SearchOutlined/>} placeholder="Search customers, owners, domains, invoices, payments, tickets, posts, pages, and settings" value={query} onChange={(event)=>setQuery(event.target.value)}/><div style={{marginTop:14,maxHeight:430,overflowY:'auto'}}>{searching?<div style={{padding:40,textAlign:'center'}}><Spin/></div>:query.length<2?<Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Enter at least two characters"/>:results.length?results.map((item,index)=><button key={`${item.type}-${index}`} onClick={()=>{setSearchOpen(false);router.visit(item.url);}} style={{width:'100%',display:'flex',gap:12,padding:12,border:0,borderBottom:'1px solid #eef2f7',background:'transparent',cursor:'pointer',textAlign:'left'}}><Tag>{item.type}</Tag><span><strong style={{display:'block'}}>{item.title}</strong><Typography.Text type="secondary">{item.subtitle}</Typography.Text></span></button>):<Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No matching records"/>}</div></Modal><style>{`.central-mobile-toggle{display:none}@media(max-width:991px){.central-desktop-toggle{display:none}.central-mobile-toggle{display:inline-flex}}`}</style></Layout>;
}
