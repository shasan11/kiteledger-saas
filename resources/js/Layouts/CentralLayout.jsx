import { Head, router, usePage } from "@inertiajs/react";
import {
    AlertOutlined,
    AppstoreOutlined,
    AuditOutlined,
    BankOutlined,
    BellOutlined,
    BookOutlined,
    CloudServerOutlined,
    CodeSandboxOutlined,
    CreditCardOutlined,
    DashboardOutlined,
    DatabaseOutlined,
    DownOutlined,
    FileImageOutlined,
    FileTextOutlined,
    GlobalOutlined,
    HeartOutlined,
    HomeOutlined,
    LogoutOutlined,
    MenuFoldOutlined,
    MenuOutlined,
    MenuUnfoldOutlined,
    MessageOutlined,
    NotificationOutlined,
    QuestionCircleOutlined,
    RiseOutlined,
    SafetyCertificateOutlined,
    SearchOutlined,
    SettingOutlined,
    ShopOutlined,
    TagsOutlined,
    TeamOutlined,
    UserOutlined,
} from "@ant-design/icons";
import axios from "axios";
import {
    Avatar,
    Badge,
    Breadcrumb,
    Button,
    Drawer,
    Dropdown,
    Empty,
    Input,
    Layout,
    Menu,
    Modal,
    Popover,
    Spin,
    Tag,
    Typography,
} from "antd";
import { memo, useEffect, useMemo, useState } from "react";
import ApplicationLogo from "@/Components/ApplicationLogo";
import { humanize, initials } from "@/Components/Central/formatters";

const { Header, Sider, Content } = Layout;
const entry = (
    routeName,
    label,
    icon,
    permission = null,
    params = undefined,
) => ({ routeName, label, icon, permission, params });
const menu = (label, icon, children = []) => ({ label, icon, children });
const navigation = [
    entry("central.dashboard", "Home", <HomeOutlined />, "dashboard.view"),
    menu("Customers", <TeamOutlined />, [
        entry(
            "central.tenants.index",
            "All Customers",
            <TeamOutlined />,
            "tenant.view",
        ),
        entry(
            "central.subscriptions.index",
            "Subscriptions",
            <CreditCardOutlined />,
            "subscription.view",
        ),
        entry(
            "central.usage.index",
            "Usage",
            <DashboardOutlined />,
            "tenant.view",
        ),
        entry(
            "central.tenant-feature-overrides.index",
            "Feature Overrides",
            <SettingOutlined />,
            "feature_override.manage",
        ),
    ]),
    entry("central.invoices.index", "Invoices", <FileTextOutlined />, "invoice.view"),
    entry("central.payments.index", "Payments", <BankOutlined />, "payment.view"),
    menu("Support", <MessageOutlined />, [
        entry(
            "central.support.tickets.index",
            "Tickets",
            <MessageOutlined />,
            "ticket.view",
        ),
        entry(
            "central.support-categories.index",
            "Support Categories",
            <TagsOutlined />,
            "support.manage",
        ),
        entry(
            "central.saved-replies.index",
            "Saved Replies",
            <MessageOutlined />,
            "support.manage",
        ),

    ]),
    menu("Communication", <NotificationOutlined />, [
        entry("central.communication.index", "Campaigns", <NotificationOutlined />, "communication.view", { section: "campaigns" }),
        entry("central.communication.index", "Delivery Logs", <MessageOutlined />, "communication.view", { section: "deliveries" }),
        entry("central.communication.index", "Suppression List", <SafetyCertificateOutlined />, "communication.view", { section: "suppressions" }),
    ]),
    menu("Infrastructure", <DatabaseOutlined />, [
        entry(
            "central.tenant-databases.index",
            "Customer Databases",
            <DatabaseOutlined />,
            "system_health.view",
        ),
        entry(
            "central.provisioning-logs.index",
            "Provisioning Logs",
            <CloudServerOutlined />,
            "system_health.view",
        ),
    ]),
    menu("Products", <AppstoreOutlined />, [
        entry(
            "central.plans.index",
            "Plans",
            <AppstoreOutlined />,
            "plan.view",
        ),
        entry(
            "central.features.index",
            "Features",
            <AppstoreOutlined />,
            "feature.view",
        ),
        entry(
            "central.default-templates.index",
            "Default Templates",
            <CodeSandboxOutlined />,
            "settings.view",
        ),
    ]),
    menu("Website", <GlobalOutlined />, [
        entry(
            "central.website.overview",
            "Website Overview",
            <HomeOutlined />,
            "cms.view",
        ),
        entry("central.settings.index", "Website Settings", <SettingOutlined />, "settings.view", { group: "website" }),
        entry(
            "central.website-pages.index",
            "Pages",
            <FileTextOutlined />,
            "cms.view",
        ),
        entry(
            "central.website-sections.index",
            "Sections",
            <AppstoreOutlined />,
            "cms.manage",
        ),
        entry(
            "central.website-menus.index",
            "Navigation Menus",
            <GlobalOutlined />,
            "cms.manage",
        ),
        entry(
            "central.website-leads.index",
            "Website Leads",
            <TeamOutlined />,
            "lead.view",
        ),
        entry("central.website-structured.index", "Website Features", <AppstoreOutlined />, "cms.manage", { resource: "features" }),
        entry("central.website-structured.index", "Resource Articles", <BookOutlined />, "cms.manage", { resource: "resource-articles" }),
        entry("central.website-structured.index", "Resource Categories", <TagsOutlined />, "cms.manage", { resource: "resource-categories" }),
        entry("central.website-structured.index", "Contact Locations", <GlobalOutlined />, "cms.manage", { resource: "contact-locations" }),
        entry("central.website-structured.index", "Social Media", <HeartOutlined />, "cms.manage", { resource: "social-links" }),
        entry("central.website-structured.index", "Homepage Popups", <NotificationOutlined />, "cms.manage", { resource: "popups" }),
        entry("central.website-structured.index", "Navbar Notices", <AlertOutlined />, "cms.manage", { resource: "navbar-notifications" }),
        menu("Content", <BookOutlined />, [
            entry(
                "central.blog.index",
                "Blog Posts",
                <BookOutlined />,
                "blog.view",
            ),
            entry(
                "central.blog-categories.index",
                "Blog Categories",
                <TagsOutlined />,
                "blog.manage",
            ),
            entry(
                "central.blog-tags.index",
                "Blog Tags",
                <TagsOutlined />,
                "blog.manage",
            ),
            entry(
                "central.website-faqs.index",
                "FAQs",
                <QuestionCircleOutlined />,
                "cms.manage",
            ),
            entry(
                "central.website-testimonials.index",
                "Testimonials",
                <TeamOutlined />,
                "cms.manage",
            ),
            entry(
                "central.website-announcements.index",
                "Announcements",
                <NotificationOutlined />,
                "cms.manage",
            ),
            entry(
                "central.website-logos.index",
                "Logo Strip",
                <FileImageOutlined />,
                "cms.manage",
            ),
            entry(
                "central.website-features.index",
                "Homepage Feature Blocks",
                <AppstoreOutlined />,
                "cms.manage",
            ),
            entry(
                "central.website-metrics.index",
                "Homepage Metrics",
                <RiseOutlined />,
                "cms.manage",
            ),
            entry(
                "central.website-integrations.index",
                "Integrations",
                <AppstoreOutlined />,
                "cms.manage",
            ),
            entry(
                "central.website-solutions.index",
                "Solutions",
                <ShopOutlined />,
                "cms.manage",
            ),
            entry(
                "central.seo.index",
                "SEO Settings",
                <SearchOutlined />,
                "seo.manage",
            ),
            entry(
                "central.settings.index",
                "Website Branding",
                <ShopOutlined />,
                "website.branding.manage",
                { group: "branding" },
            ),
            entry(
                "central.media.index",
                "Media Library",
                <FileImageOutlined />,
                "media.manage",
            ),
        ]),
    ]),
    menu("Settings", <SettingOutlined />, [
        entry(
            "central.settings.index",
            "Platform Settings",
            <SettingOutlined />,
            "settings.view",
        ),
        entry("central.settings.operations-guide", "Queue & Cron Guide", <BookOutlined />, "settings.view"),
        entry("central.gateways.index", "Payment Gateways", <CreditCardOutlined />, "gateway.view"),
        entry("central.invoice-customization.index", "Invoice Customization", <FileTextOutlined />, "invoice.customize"),
    ]),
    menu("Administration", <SafetyCertificateOutlined />, [
        entry(
            "central.notifications.index",
            "Notifications",
            <NotificationOutlined />,
        ),
        entry(
            "central.central-admins.index",
            "Admin Users",
            <UserOutlined />,
            "admin.manage",
        ),
        entry(
            "central.platform-users.index",
            "Platform Users",
            <TeamOutlined />,
            "platform-users.view",
        ),
        entry(
            "central.roles.index",
            "Roles and Permissions",
            <SafetyCertificateOutlined />,
            "role.manage",
        ),
        entry(
            "central.audit-logs.index",
            "Audit Logs",
            <AuditOutlined />,
            "audit.view",
        ),
    ]),
];

const navKey = (parents, label) => [...parents, label].join(">");

const getRouteInfo = (url) => {
    const origin =
        typeof window !== "undefined" ? window.location.origin : "http://localhost";

    try {
        const parsed = new URL(url, origin);
        return {
            pathname: parsed.pathname,
            searchParams: parsed.searchParams,
        };
    } catch {
        return {
            pathname: url,
            searchParams: new URLSearchParams(),
        };
    }
};

const CentralSidebarContent = memo(function CentralSidebarContent({
    activeKey,
    activeOpenKeys,
    isCollapsed,
    menuItems,
}) {
    const [openKeys, setOpenKeys] = useState(activeOpenKeys);

    useEffect(() => {
        if (!isCollapsed) {
            setOpenKeys(activeOpenKeys);
        }
    }, [activeOpenKeys, isCollapsed]);

    return (
        <div className="central-sidebar-inner">
            <div
                className={`central-sider__brand${
                    isCollapsed ? " central-sider__brand--collapsed" : ""
                }`}
            >
                <ApplicationLogo
                    dark
                    className="central-sider__logo"
                    alt="KiteLedger"
                />
            </div>

            <div className="central-sider__menu" aria-label="Primary navigation">
                <Menu
                    theme="dark"
                    mode="inline"
                    inlineCollapsed={isCollapsed}
                    selectedKeys={activeKey ? [activeKey] : []}
                    openKeys={isCollapsed ? [] : openKeys}
                    onOpenChange={setOpenKeys}
                    items={menuItems}
                />
            </div>

            {!isCollapsed && (
                <div className="central-sider__footer">
                    <span className="central-sider__status-dot" />
                    <span>Platform operational</span>
                </div>
            )}
        </div>
    );
});

export default function CentralLayout({
    title,
    subtitle,
    breadcrumbs = [],
    children,
}) {
    const page = usePage();
    const user = page.props?.auth?.user || page.props?.centralAdmin || {};
    const permissions = page.props?.auth?.permissions || [];
    const bypass = page.props?.auth?.canBypassPermissions;
    const notificationData = page.props?.centralNotifications || {
        unread: 0,
        recent: [],
    };

    const [collapsed, setCollapsed] = useState(() => {
        if (typeof window === "undefined") return false;
        return localStorage.getItem("central.sidebar.collapsed") === "1";
    });
    const [mobileOpen, setMobileOpen] = useState(false);
    const [searchOpen, setSearchOpen] = useState(false);
    const [query, setQuery] = useState("");
    const [searching, setSearching] = useState(false);
    const [results, setResults] = useState([]);

    const visibleNavigation = useMemo(() => {
        const allowed = (item) =>
            !item.permission || bypass || permissions.includes(item.permission);
        const filterItems = (items) =>
            items
                .map((item) => {
                    if (item.children) {
                        const children = filterItems(item.children);
                        return children.length ? { ...item, children } : null;
                    }

                    return allowed(item) && route().has(item.routeName)
                        ? item
                        : null;
                })
                .filter(Boolean);

        return filterItems(navigation);
    }, [permissions, bypass]);

    const allNav = useMemo(() => {
        const items = [];
        const flattenItems = (navItems, parents = []) => {
            navItems.forEach((item) => {
                if (item.children) {
                    flattenItems(item.children, [...parents, item.label]);
                    return;
                }

                items.push({
                    ...item,
                    parents,
                    key: navKey(parents, item.label),
                    url: route(item.routeName, item.params),
                });
            });
        };

        flattenItems(visibleNavigation);
        return items;
    }, [visibleNavigation]);

    const active = useMemo(() => {
        const current = getRouteInfo(page.url);

        return [...allNav]
            .map((item) => ({
                ...item,
                routeInfo: getRouteInfo(item.url),
            }))
            .sort((a, b) => {
                const pathDifference =
                    b.routeInfo.pathname.length - a.routeInfo.pathname.length;

                if (pathDifference !== 0) return pathDifference;

                return (
                    [...b.routeInfo.searchParams].length -
                    [...a.routeInfo.searchParams].length
                );
            })
            .find((item) => {
                const pathMatches = current.pathname.startsWith(
                    item.routeInfo.pathname,
                );
                const paramsMatch = [...item.routeInfo.searchParams].every(
                    ([key, value]) => current.searchParams.get(key) === value,
                );

                return pathMatches && paramsMatch;
            });
    }, [allNav, page.url]);

    const activeOpenKeys = useMemo(
        () =>
            active?.parents?.map((label, index) =>
                navKey(active.parents.slice(0, index), label),
            ) || [],
        [active],
    );

    useEffect(() => {
        if (typeof window !== "undefined") {
            localStorage.setItem(
                "central.sidebar.collapsed",
                collapsed ? "1" : "0",
            );
        }
    }, [collapsed]);

    useEffect(() => {
        const handleShortcut = (event) => {
            const isSearchShortcut =
                (event.ctrlKey || event.metaKey) &&
                event.key.toLowerCase() === "k";

            if (isSearchShortcut) {
                event.preventDefault();
                setSearchOpen(true);
            }

            if (event.key === "Escape" && searchOpen) {
                setSearchOpen(false);
            }
        };

        window.addEventListener("keydown", handleShortcut);
        return () => window.removeEventListener("keydown", handleShortcut);
    }, [searchOpen]);

    useEffect(() => {
        const normalizedQuery = query.trim();

        if (!searchOpen || normalizedQuery.length < 2) {
            setResults([]);
            setSearching(false);
            return;
        }

        const timer = setTimeout(async () => {
            setSearching(true);
            try {
                const { data } = await axios.get(route("central.search"), {
                    params: { q: normalizedQuery },
                });
                setResults(data.data || []);
            } finally {
                setSearching(false);
            }
        }, 250);

        return () => clearTimeout(timer);
    }, [query, searchOpen]);

    const menuItems = useMemo(() => {
        const toMenuItems = (items, parents = []) =>
            items.map((item) => {
                const key = navKey(parents, item.label);

                if (item.children) {
                    return {
                        key,
                        label: item.label,
                        icon: item.icon,
                        children: toMenuItems(item.children, [
                            ...parents,
                            item.label,
                        ]),
                    };
                }

                return {
                    key,
                    label: item.label,
                    icon: item.icon,
                    onClick: () => {
                        setMobileOpen(false);
                        router.visit(route(item.routeName, item.params));
                    },
                };
            });

        return toMenuItems(visibleNavigation);
    }, [visibleNavigation]);

    const trail = [
        { title: "Home" },
        ...(breadcrumbs.length
            ? breadcrumbs
            : active && active.label !== title
              ? [{ title: active.label }]
              : []),
        { title },
    ].filter(
        (item, index, array) =>
            item.title &&
            array.findIndex((x) => x.title === item.title) === index,
    );

    const profileItems = [
        {
            key: "profile",
            label: "Profile",
            icon: <UserOutlined />,
            onClick: () => router.visit(route("central.profile.edit")),
        },
        {
            key: "activity",
            label: "Activity",
            icon: <AuditOutlined />,
            onClick: () => router.visit(route("central.audit-logs.index")),
        },
        { type: "divider" },
        {
            key: "site",
            label: "View public website",
            icon: <ShopOutlined />,
            onClick: () => router.visit(route("central.home")),
        },
        { type: "divider" },
        {
            key: "logout",
            label: "Logout",
            danger: true,
            icon: <LogoutOutlined />,
            onClick: () => router.post(route("central.logout")),
        },
    ];

    const closeSearch = () => {
        setSearchOpen(false);
        setQuery("");
        setResults([]);
    };

    const notifications = (
        <div className="central-notifications">
            <div className="central-notifications__header">
                <div>
                    <Typography.Text strong>Notifications</Typography.Text>
                    <Typography.Text type="secondary" className="central-notifications__hint">
                        Recent platform activity
                    </Typography.Text>
                </div>

                {notificationData.unread > 0 && (
                    <Button
                        type="link"
                        size="small"
                        onClick={() =>
                            router.post(route("central.notifications.read-all"))
                        }
                    >
                        Mark all read
                    </Button>
                )}
            </div>

            <div className="central-notifications__list">
                {notificationData.recent?.length ? (
                    notificationData.recent.map((item) => (
                        <button
                            className="central-notification"
                            key={item.id}
                            onClick={() =>
                                item.action_url && router.visit(item.action_url)
                            }
                        >
                            <div className="central-notification__meta">
                                <Tag
                                    color={
                                        item.severity === "critical" ||
                                        item.severity === "error"
                                            ? "red"
                                            : item.severity === "warning"
                                              ? "orange"
                                              : item.severity === "success"
                                                ? "green"
                                                : "blue"
                                    }
                                >
                                    {humanize(item.severity)}
                                </Tag>
                            </div>
                            <Typography.Text strong className="central-notification__title">
                                {item.title}
                            </Typography.Text>
                            <Typography.Paragraph
                                type="secondary"
                                ellipsis={{ rows: 2 }}
                                className="central-notification__message"
                            >
                                {item.message}
                            </Typography.Paragraph>
                        </button>
                    ))
                ) : (
                    <div className="central-notifications__empty">
                        <Empty
                            image={Empty.PRESENTED_IMAGE_SIMPLE}
                            description="You're all caught up"
                        />
                    </div>
                )}
            </div>

            <div className="central-notifications__footer">
                <Button
                    type="text"
                    block
                    onClick={() =>
                        router.visit(route("central.notifications.index"))
                    }
                >
                    View all notifications
                </Button>
            </div>
        </div>
    );

    return (
        <Layout className="central-shell">
            <Head title={title} />

            <Sider
                className="central-sider"
                width={264}
                collapsedWidth={76}
                collapsed={collapsed}
                trigger={null}
            >
                <CentralSidebarContent
                    activeKey={active?.key}
                    activeOpenKeys={activeOpenKeys}
                    isCollapsed={collapsed}
                    menuItems={menuItems}
                />
            </Sider>

            <Drawer
                rootClassName="central-mobile-drawer"
                open={mobileOpen}
                onClose={() => setMobileOpen(false)}
                placement="left"
                width={288}
                closable={false}
                styles={{ body: { padding: 0 } }}
            >
                <CentralSidebarContent
                    activeKey={active?.key}
                    activeOpenKeys={activeOpenKeys}
                    isCollapsed={false}
                    menuItems={menuItems}
                />
            </Drawer>

            <Layout className="central-main">
                <Header className="central-topbar">
                    <div className="central-topbar__left">
                        <Button
                            className="central-desktop-toggle central-topbar__icon-button"
                            type="text"
                            icon={
                                collapsed ? (
                                    <MenuUnfoldOutlined />
                                ) : (
                                    <MenuFoldOutlined />
                                )
                            }
                            onClick={() => setCollapsed((value) => !value)}
                            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
                        />

                        <Button
                            className="central-mobile-toggle central-topbar__icon-button"
                            type="text"
                            icon={<MenuOutlined />}
                            onClick={() => setMobileOpen(true)}
                            aria-label="Open navigation"
                        />

                        <Breadcrumb
                            className="central-topbar__crumbs"
                            items={trail}
                        />
                    </div>

                    <button
                        className="central-topbar__search"
                        onClick={() => setSearchOpen(true)}
                        aria-label="Open global search"
                    >
                        <SearchOutlined />
                        <span className="central-topbar__search-copy">
                            Search across KiteLedger
                        </span>
                        <kbd className="central-topbar__shortcut">Ctrl K</kbd>
                    </button>

                    <div className="central-topbar__actions">
                        <Button
                            className="central-topbar__action central-mobile-search"
                            type="text"
                            icon={<SearchOutlined />}
                            aria-label="Open search"
                            onClick={() => setSearchOpen(true)}
                        />

                        <Button
                            className="central-topbar__action central-secondary-action"
                            type="text"
                            icon={<HeartOutlined />}
                            aria-label="System health"
                            onClick={() => router.visit(route("central.dashboard"))}
                        />

                        <Button
                            className="central-topbar__action central-secondary-action"
                            type="text"
                            icon={<QuestionCircleOutlined />}
                            aria-label="Support"
                            onClick={() =>
                                router.visit(route("central.support.tickets.index"))
                            }
                        />

                        <Popover
                            placement="bottomRight"
                            trigger="click"
                            content={notifications}
                            overlayClassName="central-notifications-popover"
                        >
                            <Badge
                                count={notificationData.unread}
                                overflowCount={99}
                                size="small"
                            >
                                <Button
                                    className="central-topbar__action"
                                    type="text"
                                    icon={<BellOutlined />}
                                    aria-label="Notifications"
                                />
                            </Badge>
                        </Popover>

                        <Dropdown
                            menu={{ items: profileItems }}
                            trigger={["click"]}
                            placement="bottomRight"
                        >
                            <button
                                className="central-profile"
                                aria-label="Open account menu"
                            >
                                <Avatar size={32} className="central-profile__avatar">
                                    {initials(user.name || user.email)}
                                </Avatar>
                                <span className="central-profile__copy">
                                    <strong>{user.name || "Administrator"}</strong>
                                    <span>{humanize(user.role || "super admin")}</span>
                                </span>
                                <DownOutlined className="central-profile__chevron" />
                            </button>
                        </Dropdown>
                    </div>
                </Header>

                <Content className="central-content">
                    <div className="central-content__inner">
                        {subtitle && (
                            <div className="central-page-header central-page-header--shell">
                                <div className="central-page-header__copy">
                                    <h1>{title}</h1>
                                    <p>{subtitle}</p>
                                </div>
                            </div>
                        )}

                        <main className="central-page-body">{children}</main>
                    </div>
                </Content>
            </Layout>

            <Modal
                rootClassName="central-search-modal"
                open={searchOpen}
                onCancel={closeSearch}
                footer={null}
                title={null}
                width={680}
                centered={false}
            >
                <div className="central-search">
                    <div className="central-search__heading">
                        <div>
                            <Typography.Title level={4}>Search KiteLedger</Typography.Title>
                            <Typography.Text type="secondary">
                                Customers, billing, support, content and settings
                            </Typography.Text>
                        </div>
                        <kbd>Esc</kbd>
                    </div>

                    <Input
                        autoFocus
                        size="large"
                        prefix={<SearchOutlined />}
                        placeholder="Type at least two characters..."
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        allowClear
                    />

                    <div className="central-search__results">
                        {searching ? (
                            <div className="central-search__state">
                                <Spin size="small" />
                                <span>Searching...</span>
                            </div>
                        ) : query.trim().length < 2 ? (
                            <div className="central-search__state central-search__state--empty">
                                <SearchOutlined />
                                <span>Start typing to search the platform</span>
                            </div>
                        ) : results.length ? (
                            results.map((item, index) => (
                                <button
                                    className="central-search-result"
                                    key={`${item.type}-${index}`}
                                    onClick={() => {
                                        closeSearch();
                                        router.visit(item.url);
                                    }}
                                >
                                    <Tag className="central-search-result__type">
                                        {item.type}
                                    </Tag>
                                    <span className="central-search-result__copy">
                                        <strong>{item.title}</strong>
                                        <span>{item.subtitle}</span>
                                    </span>
                                </button>
                            ))
                        ) : (
                            <div className="central-search__state central-search__state--empty">
                                <Empty
                                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                                    description="No matching records"
                                />
                            </div>
                        )}
                    </div>
                </div>
            </Modal>

            <style>{`
                :root {
                    --central-bg: #f4f7fb;
                    --central-surface: #ffffff;
                    --central-surface-muted: #f8fafc;
                    --central-border: #e2e8f0;
                    --central-border-strong: #cbd5e1;
                    --central-text: #111827;
                    --central-text-muted: #64748b;
                    --central-sidebar: #111827;
                    --central-sidebar-hover: rgba(255, 255, 255, 0.075);
                    --central-sidebar-active: rgba(20, 184, 166, 0.16);
                    --central-accent: #0f766e;
                    --central-accent-strong: #0d9488;
                    --central-accent-soft: #ecfdf5;
                    --central-radius: 10px;
                    --central-shadow: 0 14px 34px rgba(15, 23, 42, 0.075);
                    --central-shadow-soft: 0 1px 2px rgba(15, 23, 42, 0.04), 0 10px 24px rgba(15, 23, 42, 0.045);
                }

                .central-shell {
                    min-height: 100vh;
                    background:
                        linear-gradient(180deg, #f8fbff 0, var(--central-bg) 260px),
                        var(--central-bg);
                    color: var(--central-text);
                }

                .central-sider {
                    position: sticky !important;
                    top: 0;
                    height: 100vh;
                    overflow: hidden;
                    background:
                        linear-gradient(180deg, #172033 0%, #101827 46%, #0d1320 100%) !important;
                    border-right: 1px solid rgba(255, 255, 255, 0.07);
                    box-shadow: 18px 0 45px rgba(15, 23, 42, 0.12);
                    z-index: 30;
                }

                .central-sidebar-inner {
                    display: flex;
                    min-height: 100%;
                    height: 100vh;
                    flex-direction: column;
                    background:
                        radial-gradient(circle at 24px 22px, rgba(20, 184, 166, 0.15), transparent 180px),
                        transparent;
                }

                .central-sider__brand {
                    display: flex;
                    flex: 0 0 68px;
                    align-items: center;
                    justify-content: center;
                    padding: 0 20px;
                    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
                }

                .central-sider__brand--collapsed {
                    justify-content: center;
                    padding-inline: 10px;
                }

                .central-sider__logo {
                    display: block;
                    width: 160px;
                    max-width: 100%;
                    max-height: 38px;
                    object-fit: contain;
                }

                .central-sider__brand--collapsed .central-sider__logo {
                    max-width: 42px;
                }

                .central-sider__menu {
                    flex: 1;
                    min-height: 0;
                    overflow-y: auto;
                    overflow-x: hidden;
                    padding: 12px 10px 18px;
                    scrollbar-width: thin;
                    scrollbar-color: rgba(255, 255, 255, 0.12) transparent;
                }

                .central-sider__menu::-webkit-scrollbar {
                    width: 5px;
                }

                .central-sider__menu::-webkit-scrollbar-thumb {
                    background: rgba(255, 255, 255, 0.12);
                    border-radius: 999px;
                }

                .central-sider .ant-menu,
                .central-mobile-drawer .ant-menu {
                    background: transparent !important;
                    border-inline-end: 0 !important;
                    font-size: 13px;
                }

                .central-sider .ant-menu-item,
                .central-sider .ant-menu-submenu-title,
                .central-mobile-drawer .ant-menu-item,
                .central-mobile-drawer .ant-menu-submenu-title {
                    min-height: 40px;
                    height: 40px;
                    line-height: 40px;
                    margin: 3px 0 !important;
                    width: 100% !important;
                    border-radius: 9px;
                    color: #b7c0cf !important;
                    transition: background 160ms ease, color 160ms ease, transform 160ms ease;
                }

                .central-sider .ant-menu-item .anticon,
                .central-sider .ant-menu-submenu-title .anticon,
                .central-mobile-drawer .ant-menu-item .anticon,
                .central-mobile-drawer .ant-menu-submenu-title .anticon {
                    font-size: 15px;
                    color: #8996aa;
                }

                .central-sider .ant-menu-item:hover,
                .central-sider .ant-menu-submenu-title:hover,
                .central-mobile-drawer .ant-menu-item:hover,
                .central-mobile-drawer .ant-menu-submenu-title:hover {
                    background: var(--central-sidebar-hover) !important;
                    color: #ffffff !important;
                    transform: translateX(1px);
                }

                .central-sider .ant-menu-item-selected,
                .central-mobile-drawer .ant-menu-item-selected {
                    background: var(--central-sidebar-active) !important;
                    color: #ffffff !important;
                    font-weight: 600;
                    box-shadow: inset 3px 0 0 var(--central-accent-strong);
                }

                .central-sider .ant-menu-item-selected .anticon,
                .central-mobile-drawer .ant-menu-item-selected .anticon {
                    color: #ffffff !important;
                }

                .central-sider .ant-menu-sub.ant-menu-inline,
                .central-mobile-drawer .ant-menu-sub.ant-menu-inline {
                    margin: 2px 0 6px;
                    padding: 3px 0 3px 10px;
                    background: rgba(255, 255, 255, 0.035) !important;
                    border-radius: 10px;
                }

                .central-sider__footer {
                    display: flex;
                    flex: 0 0 48px;
                    align-items: center;
                    gap: 8px;
                    margin: 0 10px 10px;
                    padding: 0 12px;
                    border-top: 1px solid rgba(255, 255, 255, 0.07);
                    border-radius: 10px;
                    background: rgba(255, 255, 255, 0.04);
                    color: #a8b3c5;
                    font-size: 12px;
                }

                .central-sider__status-dot {
                    width: 7px;
                    height: 7px;
                    border-radius: 50%;
                    background: #22c55e;
                    box-shadow: 0 0 0 3px rgba(34, 197, 94, 0.14);
                }

                .central-main {
                    min-width: 0;
                    background: var(--central-bg);
                }

                .central-topbar {
                    position: sticky;
                    top: 0;
                    z-index: 20;
                    display: grid;
                    grid-template-columns: minmax(190px, 1fr) minmax(300px, 520px) minmax(220px, 1fr);
                    align-items: center;
                    height: 68px;
                    padding: 0 24px;
                    background: rgba(255, 255, 255, 0.9) !important;
                    border-bottom: 1px solid var(--central-border);
                    line-height: normal;
                    backdrop-filter: blur(18px);
                    box-shadow: 0 1px 0 rgba(255, 255, 255, 0.72), 0 10px 28px rgba(15, 23, 42, 0.035);
                }

                .central-topbar__left,
                .central-topbar__actions {
                    display: flex;
                    align-items: center;
                    min-width: 0;
                }

                .central-topbar__left {
                    gap: 10px;
                }

                .central-topbar__actions {
                    justify-content: flex-end;
                    gap: 6px;
                }

                .central-topbar__icon-button,
                .central-topbar__action {
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    width: 38px;
                    min-width: 38px;
                    height: 38px;
                    padding: 0;
                    border-radius: 10px;
                    color: #475569;
                    transition: background 160ms ease, color 160ms ease, box-shadow 160ms ease;
                }

                .central-topbar__icon-button:hover,
                .central-topbar__action:hover {
                    background: var(--central-accent-soft) !important;
                    color: var(--central-accent) !important;
                    box-shadow: inset 0 0 0 1px rgba(15, 118, 110, 0.1);
                }

                .central-topbar__crumbs {
                    min-width: 0;
                    overflow: hidden;
                    white-space: nowrap;
                }

                .central-topbar__crumbs ol {
                    flex-wrap: nowrap;
                }

                .central-topbar__crumbs li:last-child {
                    min-width: 0;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }

                .central-topbar__crumbs .ant-breadcrumb-link {
                    color: var(--central-text-muted);
                    font-size: 12px;
                }

                .central-topbar__search {
                    display: flex;
                    align-items: center;
                    gap: 9px;
                    width: 100%;
                    height: 40px;
                    padding: 0 10px 0 14px;
                    border: 1px solid var(--central-border-strong);
                    border-radius: 10px;
                    background: rgba(255, 255, 255, 0.92);
                    color: var(--central-text-muted);
                    cursor: text;
                    text-align: left;
                    box-shadow: 0 1px 2px rgba(15, 23, 42, 0.035);
                    transition: border-color 160ms ease, box-shadow 160ms ease, background 160ms ease;
                }

                .central-topbar__search:hover {
                    border-color: #99f6e4;
                    background: #ffffff;
                    box-shadow: 0 8px 20px rgba(15, 118, 110, 0.07);
                }

                .central-topbar__search:focus-visible {
                    outline: none;
                    border-color: #5eead4;
                    box-shadow: 0 0 0 3px rgba(20, 184, 166, 0.12);
                }

                .central-topbar__search > .anticon {
                    color: var(--central-accent);
                }

                .central-topbar__search-copy {
                    flex: 1;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                    font-size: 13px;
                }

                .central-topbar__shortcut,
                .central-search__heading kbd {
                    display: inline-flex;
                    align-items: center;
                    height: 22px;
                    padding: 0 7px;
                    border: 1px solid #dbe3ea;
                    border-bottom-color: #cbd5e1;
                    border-radius: 6px;
                    background: linear-gradient(180deg, #ffffff, #f8fafc);
                    color: var(--central-text-muted);
                    font: 500 11px/1 system-ui, sans-serif;
                    box-shadow: 0 1px 0 rgba(16, 24, 40, 0.04);
                }

                .central-profile {
                    display: flex;
                    align-items: center;
                    gap: 9px;
                    min-width: 0;
                    height: 42px;
                    margin-left: 4px;
                    padding: 4px 8px 4px 5px;
                    border: 1px solid var(--central-border);
                    border-radius: 10px;
                    background: rgba(255, 255, 255, 0.74);
                    cursor: pointer;
                    text-align: left;
                    box-shadow: 0 1px 2px rgba(15, 23, 42, 0.035);
                    transition: background 160ms ease, border-color 160ms ease, box-shadow 160ms ease;
                }

                .central-profile:hover {
                    background: #ffffff;
                    border-color: #99f6e4;
                    box-shadow: 0 8px 18px rgba(15, 118, 110, 0.07);
                }

                .central-profile__avatar {
                    flex: 0 0 auto;
                    background: linear-gradient(145deg, #14b8a6, #0f766e);
                    font-size: 12px;
                    font-weight: 700;
                }

                .central-profile__copy {
                    display: flex;
                    min-width: 0;
                    max-width: 150px;
                    flex-direction: column;
                    line-height: 1.25;
                }

                .central-profile__copy strong,
                .central-profile__copy span {
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                }

                .central-profile__copy strong {
                    color: #1f2937;
                    font-size: 12px;
                    font-weight: 600;
                }

                .central-profile__copy span {
                    margin-top: 2px;
                    color: #94a3b8;
                    font-size: 11px;
                }

                .central-profile__chevron {
                    color: #98a2b3;
                    font-size: 10px;
                }

                .central-content {
                    min-height: calc(100vh - 68px);
                    background: transparent;
                }

                .central-content__inner {
                    width: 100%;
                    max-width: 1680px;
                    margin: 0 auto;
                    padding: 28px 30px 42px;
                }

                .central-page-header {
                    display: flex;
                    align-items: flex-start;
                    justify-content: space-between;
                    gap: 20px;
                    margin-bottom: 20px;
                    padding-bottom: 2px;
                }

                .central-page-header--shell {
                    padding: 2px 0 4px;
                }

                .central-page-header__copy {
                    display: flex;
                    flex-direction: column;
                    min-width: 0;
                }

                .central-page-header__eyebrow {
                    width: fit-content;
                    margin-bottom: 7px;
                    padding: 4px 9px;
                    border: 1px solid rgba(15, 118, 110, 0.18);
                    border-radius: 999px;
                    background: #ecfdf5;
                    color: #0f766e;
                    font-size: 11px;
                    font-weight: 700;
                    line-height: 1;
                    text-transform: uppercase;
                }

                .central-page-header h1 {
                    margin: 0;
                    color: var(--central-text);
                    font-size: 24px;
                    font-weight: 700;
                    letter-spacing: 0;
                    line-height: 1.3;
                }

                .central-page-header h2.ant-typography {
                    margin: 0 0 6px !important;
                    color: var(--central-text);
                    font-size: 27px !important;
                    font-weight: 750 !important;
                    letter-spacing: 0 !important;
                    line-height: 1.18 !important;
                }

                .central-page-header p,
                .central-page-header .ant-typography-secondary {
                    max-width: 760px;
                    margin: 6px 0 0;
                    color: var(--central-text-muted);
                    font-size: 13px;
                    line-height: 1.5;
                }

                .central-page-header .ant-typography-secondary {
                    margin-top: 0 !important;
                }

                .central-page-header__actions {
                    display: flex;
                    flex: 0 0 auto;
                    align-items: center;
                    justify-content: flex-end;
                    gap: 8px;
                    flex-wrap: wrap;
                }

                .central-page-body {
                    min-width: 0;
                }

                .central-page-body > .ant-card,
                .central-page-body > div > .ant-card {
                    border-color: var(--central-border);
                    box-shadow: var(--central-shadow-soft);
                }

                .central-page-body .ant-card {
                    border-radius: var(--central-radius);
                    border-color: var(--central-border);
                    overflow: hidden;
                    box-shadow: var(--central-shadow-soft);
                    transition: border-color 160ms ease, box-shadow 160ms ease, transform 160ms ease;
                }

                .central-page-body .ant-card:hover {
                    border-color: #d5dde8;
                    box-shadow: var(--central-shadow);
                }

                .central-page-body .ant-card-head {
                    border-bottom-color: #eef2f7;
                    background: linear-gradient(180deg, #ffffff, #fbfdff);
                }

                .central-page-body .ant-card-body {
                    min-width: 0;
                }

                .central-page-body .central-section-card,
                .central-page-body .central-metric-card,
                .central-page-body .central-card {
                    border: 1px solid var(--central-border);
                    border-radius: var(--central-radius);
                    background: var(--central-surface);
                    box-shadow: var(--central-shadow-soft);
                }

                .central-page-body .central-section-card .ant-card-head-title,
                .central-page-body .ant-card-head-title {
                    color: #1f2937;
                    font-size: 14px;
                    font-weight: 700;
                }

                .central-page-body .central-metric-card .ant-statistic-title,
                .central-page-body .ant-statistic-title {
                    color: var(--central-text-muted);
                    font-size: 12px;
                    font-weight: 650;
                }

                .central-page-body .central-metric-card .ant-statistic-content,
                .central-page-body .ant-statistic-content {
                    color: var(--central-text);
                    font-size: 26px;
                    font-weight: 750;
                }

                .central-page-body .ant-table-wrapper .ant-table {
                    border: 1px solid var(--central-border);
                    border-radius: var(--central-radius);
                    color: #1f2937;
                    overflow: hidden;
                }

                .central-page-body .ant-table-wrapper .ant-table-thead > tr > th {
                    border-bottom-color: #e5eaf2;
                    background: #f8fafc;
                    color: #475569;
                    font-size: 11px;
                    font-weight: 700;
                    letter-spacing: 0.02em;
                    text-transform: uppercase;
                }

                .central-page-body .ant-table-wrapper .ant-table-tbody > tr > td {
                    border-bottom-color: #eef2f7;
                }

                .central-page-body .ant-table-wrapper .ant-table-tbody > tr:hover > td {
                    background: #f8fffd !important;
                }

                .central-page-body .ant-btn {
                    border-radius: 9px;
                    font-weight: 600;
                }

                .central-page-body .ant-btn-primary {
                    border-color: var(--central-accent) !important;
                    background: var(--central-accent) !important;
                    box-shadow: 0 9px 18px rgba(15, 118, 110, 0.16);
                }

                .central-page-body .ant-btn-primary:not(:disabled):hover {
                    border-color: var(--central-accent-strong) !important;
                    background: var(--central-accent-strong) !important;
                    box-shadow: 0 12px 24px rgba(15, 118, 110, 0.2);
                }

                .central-page-body .ant-input,
                .central-page-body .ant-input-affix-wrapper,
                .central-page-body .ant-input-number,
                .central-page-body .ant-picker,
                .central-page-body .ant-select-selector {
                    border-color: var(--central-border) !important;
                    border-radius: 9px !important;
                }

                .central-page-body .ant-input:hover,
                .central-page-body .ant-input-affix-wrapper:hover,
                .central-page-body .ant-input-number:hover,
                .central-page-body .ant-picker:hover,
                .central-page-body .ant-select-selector:hover {
                    border-color: #99d7d0 !important;
                }

                .central-page-body .ant-input:focus,
                .central-page-body .ant-input-affix-wrapper-focused,
                .central-page-body .ant-picker-focused,
                .central-page-body .ant-select-focused .ant-select-selector {
                    border-color: #5eead4 !important;
                    box-shadow: 0 0 0 3px rgba(20, 184, 166, 0.13) !important;
                }

                .central-page-body .ant-tag {
                    border-radius: 999px;
                    font-weight: 650;
                }

                .central-page-body .central-toolbar {
                    gap: 10px;
                    padding: 2px;
                }

                .central-page-body .central-toolbar .ant-input-search,
                .central-page-body .central-toolbar .ant-input-affix-wrapper,
                .central-page-body .central-toolbar .ant-select-selector {
                    border-radius: 9px !important;
                }

                .central-page-body .central-filter-summary {
                    display: inline-flex;
                    align-items: center;
                    min-height: 32px;
                    padding: 0 10px;
                    border: 1px solid var(--central-border);
                    border-radius: 999px;
                    background: #f8fafc;
                    color: var(--central-text-muted);
                    font-size: 12px;
                    font-weight: 600;
                }

                .central-notifications {
                    width: 360px;
                    max-width: calc(100vw - 32px);
                }

                .central-notifications__header {
                    display: flex;
                    align-items: flex-start;
                    justify-content: space-between;
                    gap: 12px;
                    padding: 4px 4px 10px;
                    border-bottom: 1px solid var(--central-border);
                }

                .central-notifications__header > div:first-child {
                    display: flex;
                    flex-direction: column;
                }

                .central-notifications__hint {
                    margin-top: 2px;
                    font-size: 11px;
                }

                .central-notifications__list {
                    max-height: 390px;
                    overflow-y: auto;
                }

                .central-notification {
                    display: block;
                    width: 100%;
                    padding: 11px 5px;
                    border: 0;
                    border-bottom: 1px solid #eef1f5;
                    background: transparent;
                    cursor: pointer;
                    text-align: left;
                }

                .central-notification:hover {
                    background: #f8fafc;
                }

                .central-notification__meta {
                    margin-bottom: 5px;
                }

                .central-notification__meta .ant-tag {
                    margin: 0;
                    font-size: 10px;
                    line-height: 18px;
                }

                .central-notification__title {
                    display: block;
                    color: #344054;
                    font-size: 12px;
                }

                .central-notification__message {
                    margin: 3px 0 0 !important;
                    font-size: 12px;
                    line-height: 1.45;
                }

                .central-notifications__empty {
                    padding: 18px 0;
                }

                .central-notifications__footer {
                    padding-top: 6px;
                }

                .central-notifications__footer .ant-btn {
                    height: 34px;
                    color: #475467;
                    font-size: 12px;
                }

                .central-search-modal .ant-modal {
                    top: 9vh;
                    padding-bottom: 0;
                }

                .central-search-modal .ant-modal-content {
                    overflow: hidden;
                    padding: 0;
                    border: 1px solid var(--central-border);
                    border-radius: 12px;
                    box-shadow: 0 20px 60px rgba(16, 24, 40, 0.16);
                }

                .central-search__heading {
                    display: flex;
                    align-items: flex-start;
                    justify-content: space-between;
                    gap: 16px;
                    padding: 18px 20px 14px;
                }

                .central-search__heading .ant-typography {
                    margin: 0;
                }

                .central-search__heading h4.ant-typography {
                    color: var(--central-text);
                    font-size: 16px;
                    font-weight: 650;
                }

                .central-search__heading .ant-typography-secondary {
                    display: block;
                    margin-top: 3px;
                    font-size: 12px;
                }

                .central-search > .ant-input-affix-wrapper {
                    width: calc(100% - 40px);
                    margin: 0 20px 14px;
                    min-height: 42px;
                    border-radius: 8px;
                    box-shadow: none;
                }

                .central-search__results {
                    max-height: min(52vh, 430px);
                    overflow-y: auto;
                    border-top: 1px solid var(--central-border);
                }

                .central-search-result {
                    display: flex;
                    align-items: flex-start;
                    gap: 12px;
                    width: 100%;
                    padding: 11px 20px;
                    border: 0;
                    border-bottom: 1px solid #eef1f5;
                    background: #fff;
                    cursor: pointer;
                    text-align: left;
                }

                .central-search-result:hover {
                    background: #f8fafc;
                }

                .central-search-result__type {
                    flex: 0 0 auto;
                    margin: 1px 0 0;
                    font-size: 10px;
                    text-transform: capitalize;
                }

                .central-search-result__copy {
                    display: flex;
                    min-width: 0;
                    flex-direction: column;
                }

                .central-search-result__copy strong {
                    color: #344054;
                    font-size: 12px;
                    font-weight: 600;
                }

                .central-search-result__copy span {
                    margin-top: 2px;
                    overflow: hidden;
                    color: #667085;
                    font-size: 11px;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                }

                .central-search__state {
                    display: flex;
                    min-height: 150px;
                    align-items: center;
                    justify-content: center;
                    gap: 9px;
                    padding: 28px;
                    color: #667085;
                    font-size: 12px;
                }

                .central-search__state--empty {
                    flex-direction: column;
                }

                .central-search__state--empty > .anticon {
                    color: #98a2b3;
                    font-size: 22px;
                }

                .central-mobile-toggle,
                .central-mobile-search {
                    display: none;
                }

                .central-mobile-drawer .ant-drawer-content {
                    background: var(--central-sidebar);
                }

                .central-mobile-drawer .ant-drawer-body {
                    background: var(--central-sidebar);
                }

                @media (max-width: 1180px) {
                    .central-topbar {
                        grid-template-columns: minmax(160px, 1fr) minmax(240px, 360px) auto;
                        padding-inline: 16px;
                    }

                    .central-profile__copy {
                        display: none;
                    }

                    .central-profile {
                        gap: 5px;
                    }
                }

                @media (max-width: 991px) {
                    .central-sider {
                        display: none;
                    }

                    .central-desktop-toggle {
                        display: none;
                    }

                    .central-mobile-toggle,
                    .central-mobile-search {
                        display: inline-flex;
                    }

                    .central-topbar {
                        grid-template-columns: minmax(0, 1fr) auto;
                        height: 60px;
                        padding-inline: 12px;
                    }

                    .central-topbar__search {
                        grid-column: 1 / -1;
                        display: none;
                    }

                    .central-secondary-action {
                        display: none;
                    }

                    .central-content {
                        min-height: calc(100vh - 60px);
                    }

                    .central-content__inner {
                        padding: 18px 18px 28px;
                    }

                    .central-page-header {
                        flex-direction: column;
                        gap: 12px;
                    }

                    .central-page-header__actions {
                        width: 100%;
                        justify-content: flex-start;
                    }
                }

                @media (max-width: 680px) {
                    .central-topbar__crumbs {
                        max-width: 42vw;
                    }

                    .central-topbar__crumbs li:not(:last-child) {
                        display: none;
                    }

                    .central-profile__chevron {
                        display: none;
                    }

                    .central-profile {
                        margin-left: 0;
                        padding-inline: 2px;
                    }

                    .central-content__inner {
                        padding: 15px 12px 24px;
                    }

                    .central-page-header {
                        margin-bottom: 14px;
                    }

                    .central-page-header h1 {
                        font-size: 20px;
                    }

                    .central-page-header h2.ant-typography {
                        font-size: 22px !important;
                    }

                    .central-page-header p {
                        font-size: 12px;
                    }

                    .central-search-modal .ant-modal {
                        top: 10px;
                        width: calc(100vw - 20px) !important;
                        max-width: none;
                        margin: 0 auto;
                    }

                    .central-search__heading {
                        padding: 16px 16px 12px;
                    }

                    .central-search > .ant-input-affix-wrapper {
                        width: calc(100% - 32px);
                        margin-inline: 16px;
                    }

                    .central-search-result {
                        padding-inline: 16px;
                    }
                }

                @media (max-width: 420px) {
                    .central-topbar__crumbs {
                        display: none;
                    }

                    .central-topbar__actions {
                        gap: 1px;
                    }
                }
            `}</style>
        </Layout>
    );
}
