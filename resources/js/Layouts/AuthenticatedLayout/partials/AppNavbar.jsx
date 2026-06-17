import ApplicationLogo from '@/Components/ApplicationLogo';
import BranchToggle from '@/Components/BranchToggle';
import FiscalYearToggle from '@/Components/FiscalYearToggle';
import GlobalSearch from '@/Components/GlobalSearch';
import LanguageSwitcher from '@/Components/LanguageSwitcher';
import { fetchBrandSettings, subscribeToBrandSettings } from '@/brandSettings';
import { useTrans } from '@/lib/i18n';
import { Link } from '@inertiajs/react';
import {
    MenuOutlined,
    MoonOutlined,
    PlusOutlined,
    ShopOutlined,
    SunOutlined,
} from '@ant-design/icons';
import {
    Button,
    Grid,
    Layout,
    Popover,
    theme,
} from 'antd';
import { useEffect, useMemo, useState } from 'react';

const { Header } = Layout;
const { useBreakpoint } = Grid;

const isHexColor = (value) =>
    typeof value === 'string' && /^#(?:[0-9a-f]{3}){1,2}$/i.test(value.trim());

const hexToRgb = (hex) => {
    if (!isHexColor(hex)) return null;

    const normalized =
        hex.trim().length === 4
            ? `#${hex
                  .trim()
                  .slice(1)
                  .split('')
                  .map((char) => `${char}${char}`)
                  .join('')}`
            : hex.trim();

    return {
        r: parseInt(normalized.slice(1, 3), 16),
        g: parseInt(normalized.slice(3, 5), 16),
        b: parseInt(normalized.slice(5, 7), 16),
    };
};

const rgba = (hex, opacity) => {
    const rgb = hexToRgb(hex);
    if (!rgb) return hex;

    return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${opacity})`;
};

const getStoredThemeMode = () => {
    if (typeof window === 'undefined') return 'light';

    return localStorage.getItem('themeMode') || 'light';
};

export default function AppNavbar({
    branchContext,
    quickAddSections = [],
    getUrl,
    visit,
    canAccessPos = false,
    onSidebarToggle,
}) {
    const t = useTrans();
    const { token } = theme.useToken();
    const screens = useBreakpoint();

    const [brandSettings, setBrandSettings] = useState(null);
    const [themeMode, setThemeMode] = useState(() => getStoredThemeMode());
    const isMobile = !screens.md;
    const isTablet = screens.md && !screens.lg;
    const isLaptop = screens.lg && !screens.xl;
    const isDarkMode = themeMode === 'dark';

    const controlHeight = isMobile ? 40 : 38;
    const radius = 12;

    const logoWidth = isMobile ? 118 : isTablet ? 132 : isLaptop ? 140 : 152;

    useEffect(() => {
        let mounted = true;

        fetchBrandSettings()
            .then((settings) => {
                if (mounted) setBrandSettings(settings);
            })
            .catch(() => {});

        const unsubscribeBrandSettings = subscribeToBrandSettings(setBrandSettings);

        return () => {
            mounted = false;
            unsubscribeBrandSettings();
        };
    }, []);

    useEffect(() => {
        const handleThemeModeChange = (event) => {
            setThemeMode(event.detail?.mode || getStoredThemeMode());
        };

        const handleStorage = (event) => {
            if (event.key === 'themeMode') {
                setThemeMode(event.newValue || 'light');
            }
        };

        window.addEventListener('kiteledger-theme-mode-change', handleThemeModeChange);
        window.addEventListener('storage', handleStorage);

        return () => {
            window.removeEventListener('kiteledger-theme-mode-change', handleThemeModeChange);
            window.removeEventListener('storage', handleStorage);
        };
    }, []);

    const dark = useMemo(() => {
        const primary = isHexColor(brandSettings?.brand_primary_color)
            ? brandSettings.brand_primary_color.trim()
            : token.colorPrimary;

        return {
            nav: '#080d18',
            navSoft: '#101827',
            navElevated: '#172234',
            border: 'rgba(148, 163, 184, 0.14)',
            borderStrong: 'rgba(148, 163, 184, 0.28)',
            text: '#f8fafc',
            textSecondary: '#cbd5e1',
            textMuted: '#94a3b8',
            primarySoft: rgba(primary, 0.16),
            primaryBorder: rgba(primary, 0.35),
        };
    }, [brandSettings?.brand_primary_color, token.colorPrimary]);

    const toggleThemeMode = () => {
        const nextMode = isDarkMode ? 'light' : 'dark';

        setThemeMode(nextMode);
        localStorage.setItem('themeMode', nextMode);
        localStorage.setItem('theme_mode', nextMode);

        window.dispatchEvent(
            new CustomEvent('kiteledger-theme-mode-change', {
                detail: { mode: nextMode },
            }),
        );
    };

    const openQuickAction = (action) => {
        if (typeof visit === 'function') {
            visit(action.routeName, action.fallback);
            return;
        }

        const url = getUrl(action.routeName, action.fallback);

        if (url && url !== '#') {
            window.location.href = url;
        }
    };

    const quickAddContent = quickAddSections.length ? (
        <div className="app-navbar-quick-add-panel">
            <div className="app-navbar-quick-add-panel__head">
                <span className="app-navbar-quick-add-panel__title">{t('Quick Add')}</span>
                <span className="app-navbar-quick-add-panel__hint">{t('Create records by module')}</span>
            </div>

            <div className="app-navbar-quick-add-panel__grid">
                {quickAddSections.map((section) => (
                    <section key={section.key} className="app-navbar-quick-add-card">
                        <div className="app-navbar-quick-add-card__title">
                            <span className="app-navbar-quick-add-card__icon">{section.icon}</span>
                            <span>{section.title}</span>
                        </div>

                        <div className="app-navbar-quick-add-card__actions">
                            {section.children.map((action) => (
                                <button
                                    key={action.key}
                                    type="button"
                                    className="app-navbar-quick-add-action"
                                    onClick={() => openQuickAction(action)}
                                >
                                    <span className="app-navbar-quick-add-action__icon">{action.icon}</span>
                                    <span className="app-navbar-quick-add-action__label">{action.label}</span>
                                </button>
                            ))}
                        </div>
                    </section>
                ))}
            </div>
        </div>
    ) : null;

    return (
        <>
            <Header
                className="app-navbar"
                style={{
                    '--app-control-height': `${controlHeight}px`,
                    '--app-radius': `${radius}px`,
                    '--app-nav': dark.nav,
                    '--app-nav-soft': dark.navSoft,
                    '--app-nav-elevated': dark.navElevated,
                    '--app-border': dark.border,
                    '--app-border-strong': dark.borderStrong,
                    '--app-text': dark.text,
                    '--app-text-secondary': dark.textSecondary,
                    '--app-text-muted': dark.textMuted,
                    '--app-primary-soft': dark.primarySoft,
                    '--app-primary-border': dark.primaryBorder,
                    '--app-primary': token.colorPrimary,
                }}
            >
                <div className="app-navbar__main">
                    <div className="app-navbar__left">
                        {isMobile && (
                            <Button
                                type="text"
                                icon={<MenuOutlined />}
                                className="app-navbar__icon-button"
                                onClick={onSidebarToggle}
                                aria-label={t('Open navigation')}
                            />
                        )}

                        <Link
                            href={getUrl('dashboard', '/dashboard')}
                            className="app-navbar__brand-link"
                        >
                            <ApplicationLogo
                                className="app-navbar__logo"
                                dark
                                style={{
                                    width: logoWidth,
                                    maxWidth: '100%',
                                }}
                            />
                        </Link>

                        {!isMobile && (
                            <BranchToggle
                                className="app-navbar__icon-button app-navbar__context-button"
                                style={{
                                    width: controlHeight,
                                    height: controlHeight,
                                }}
                            />
                        )}
                    </div>

                    {!isMobile && (
                        <div className="app-navbar__center">
                            <GlobalSearch
                                branchContext={branchContext}
                                className="global-search-command__trigger app-navbar__search"
                                style={{
                                    width: '100%',
                                    height: controlHeight,
                                }}
                            />
                        </div>
                    )}

                    <div className="app-navbar__right">
                        {!isMobile && (
                            <FiscalYearToggle
                                className="app-navbar__icon-button app-navbar__context-button"
                                style={{
                                    width: controlHeight,
                                    height: controlHeight,
                                }}
                            />
                        )}

                        {canAccessPos && (
                            <Button
                                type="text"
                                icon={<ShopOutlined />}
                                className="app-navbar__pos-button"
                                title={t('POS')}
                                onClick={() => openQuickAction({ routeName: 'pos.index', fallback: '/pos' })}
                            >
                                {!isMobile && !isTablet && t('POS')}
                            </Button>
                        )}

                        {quickAddSections.length > 0 && (
                            <Popover
                                content={quickAddContent}
                                placement="bottomRight"
                                trigger="click"
                                arrow={false}
                                overlayClassName="app-navbar-quick-add-popover"
                            >
                                <Button
                                    type="primary"
                                    icon={<PlusOutlined />}
                                    className="app-navbar__quick-add"
                                    title={t('Quick Add')}
                                >
                                    {!isMobile && !isTablet && t('Quick Add')}
                                </Button>
                            </Popover>
                        )}

                        <LanguageSwitcher
                            compact
                            className="app-navbar__language-switcher"
                            style={{ height: controlHeight }}
                        />

                        {!isMobile && (
                            <>
                                <Button
                                    type="text"
                                    icon={isDarkMode ? <MoonOutlined /> : <SunOutlined />}
                                    onClick={toggleThemeMode}
                                    aria-label={t('Toggle between light and dark mode')}
                                    className="app-navbar__icon-button app-navbar__theme-switch"
                                />

                            </>
                        )}
                    </div>
                </div>
            </Header>

            <style>
                {`
                    .app-navbar {
                        position: sticky;
                        top: 0;
                        z-index: 100;
                        width: 100%;
                        min-height: 64px;
                        height: auto;
                        padding: 0 20px;
                        line-height: 1;
                        background: var(--app-nav);
                        border-bottom: 1px solid var(--app-border);
                        box-sizing: border-box;
                    }

                    .app-navbar__main {
                        min-height: 64px;
                        display: grid;
                        grid-template-columns: minmax(260px, auto) minmax(240px, 1fr) minmax(280px, auto);
                        align-items: center;
                        gap: 16px;
                    }

                    .app-navbar__left,
                    .app-navbar__center,
                    .app-navbar__right {
                        min-width: 0;
                        display: flex;
                        align-items: center;
                    }

                    .app-navbar__left {
                        justify-content: flex-start;
                        gap: 12px;
                    }

                    .app-navbar__center {
                        justify-content: center;
                    }

                    .app-navbar__right {
                        justify-content: flex-end;
                        gap: 8px;
                    }

                    .app-navbar__brand-link {
                        display: inline-flex;
                        align-items: center;
                        justify-content: center;
                        min-width: 0;
                        flex: 0 1 auto;
                        overflow: hidden;
                        text-decoration: none;
                    }

                    .app-navbar__logo {
                        display: block;
                        height: auto;
                        max-height: 36px;
                        object-fit: contain;
                    }

                    .app-navbar__search {
                        max-width: 520px;
                    }

                    .app-navbar__icon-button,
                    .app-navbar__quick-add,
                    .app-navbar__pos-button,
                    .app-navbar__language-switcher .ant-select-selector {
                        height: var(--app-control-height);
                        border-radius: var(--app-radius);
                        display: inline-flex;
                        align-items: center;
                        justify-content: center;
                        flex: 0 0 auto;
                    }

                    .app-navbar__icon-button {
                        width: var(--app-control-height);
                        padding: 0;
                        color: var(--app-text-secondary) !important;
                        background: transparent !important;
                        border: 1px solid transparent !important;
                    }

                    .app-navbar__icon-button:hover {
                        color: var(--app-text) !important;
                        background: var(--app-nav-elevated) !important;
                        border-color: var(--app-border-strong) !important;
                    }

                    .app-navbar__ai-button {
                        color: var(--app-primary) !important;
                    }

                    .app-navbar__quick-add {
                        min-width: var(--app-control-height);
                        padding-inline: 12px;
                        font-weight: 700;
                        box-shadow: none;
                    }

                    .app-navbar__pos-button {
                        min-width: var(--app-control-height);
                        padding-inline: 11px;
                        font-weight: 700;
                        color: var(--app-text-secondary) !important;
                        background: var(--app-nav-soft) !important;
                        border: 1px solid var(--app-border) !important;
                        box-shadow: none;
                    }

                    .app-navbar__pos-button:hover {
                        color: var(--app-text) !important;
                        background: var(--app-nav-elevated) !important;
                        border-color: var(--app-border-strong) !important;
                    }

                    .app-navbar__context-button,
                    .app-navbar__theme-switch {
                        color: var(--app-text-secondary) !important;
                    }

                    .app-navbar__language-switcher .ant-select-selector {
                        color: var(--app-text-secondary) !important;
                        background: var(--app-nav-soft) !important;
                        border-color: var(--app-border) !important;
                    }

                    .app-navbar__language-switcher .ant-select-selection-item,
                    .app-navbar__language-switcher .ant-select-arrow {
                        color: var(--app-text-secondary) !important;
                    }

                    .app-navbar__context-button:hover,
                    .app-navbar__theme-switch:hover {
                        color: var(--app-text) !important;
                        background: var(--app-nav-elevated) !important;
                        border-color: var(--app-border-strong) !important;
                    }

                    .app-navbar__search,
                    .app-navbar__search button,
                    .app-navbar__search .ant-btn,
                    .app-navbar__search .ant-input,
                    .app-navbar__search .ant-input-affix-wrapper {
                        height: var(--app-control-height) !important;
                        background: var(--app-nav-soft) !important;
                        color: var(--app-text-secondary) !important;
                        border-color: transparent !important;
                        border-radius: var(--app-radius) !important;
                        box-shadow: none !important;
                    }

                    .app-navbar__search:hover,
                    .app-navbar__search button:hover,
                    .app-navbar__search .ant-btn:hover,
                    .app-navbar__search .ant-input-affix-wrapper:hover {
                        background: var(--app-nav-elevated) !important;
                        color: var(--app-text) !important;
                        border-color: var(--app-border-strong) !important;
                    }

                    .app-navbar__search input::placeholder,
                    .app-navbar__search .ant-input::placeholder {
                        color: var(--app-text-muted) !important;
                    }

                    .app-navbar-quick-add-popover .ant-popover-inner {
                        background: var(--app-nav-soft) !important;
                        border: 1px solid var(--app-border) !important;
                        border-radius: var(--app-radius) !important;
                        box-shadow: 0 18px 45px rgba(2, 6, 23, 0.45) !important;
                        padding: 0 !important;
                        overflow: hidden;
                    }

                    .app-navbar-quick-add-popover .ant-popover-inner-content {
                        padding: 0 !important;
                    }

                    .app-navbar-quick-add-panel {
                        width: min(940px, calc(100vw - 24px));
                        padding: 12px;
                        color: var(--app-text-secondary);
                    }

                    .app-navbar-quick-add-panel__head {
                        display: flex;
                        align-items: baseline;
                        justify-content: space-between;
                        gap: 12px;
                        padding: 0 2px 10px;
                        border-bottom: 1px solid var(--app-border);
                        margin-bottom: 10px;
                    }

                    .app-navbar-quick-add-panel__title {
                        color: var(--app-text);
                        font-weight: 800;
                        font-size: 14px;
                    }

                    .app-navbar-quick-add-panel__hint {
                        color: var(--app-text-muted);
                        font-size: 12px;
                    }

                    .app-navbar-quick-add-panel__grid {
                        display: grid;
                        grid-template-columns: repeat(7, minmax(116px, 1fr));
                        gap: 8px;
                    }

                    .app-navbar-quick-add-card {
                        min-width: 0;
                        border: 1px solid var(--app-border);
                        border-radius: var(--app-radius);
                        background: var(--app-nav);
                        padding: 8px;
                    }

                    .app-navbar-quick-add-card__title {
                        display: flex;
                        align-items: center;
                        gap: 7px;
                        color: var(--app-text);
                        font-size: 12px;
                        font-weight: 800;
                        line-height: 16px;
                        margin-bottom: 7px;
                    }

                    .app-navbar-quick-add-card__icon {
                        width: 22px;
                        height: 22px;
                        border-radius: 7px;
                        display: inline-flex;
                        align-items: center;
                        justify-content: center;
                        color: var(--app-primary);
                        background: var(--app-primary-soft);
                        border: 1px solid var(--app-primary-border);
                        flex: 0 0 auto;
                    }

                    .app-navbar-quick-add-card__actions {
                        display: flex;
                        flex-direction: column;
                        gap: 3px;
                    }

                    .app-navbar-quick-add-action {
                        width: 100%;
                        min-height: 28px;
                        border: 0;
                        border-radius: 8px;
                        background: transparent;
                        color: var(--app-text-secondary);
                        display: flex;
                        align-items: center;
                        gap: 7px;
                        padding: 5px 6px;
                        cursor: pointer;
                        text-align: left;
                        font: inherit;
                    }

                    .app-navbar-quick-add-action:hover {
                        color: var(--app-text);
                        background: var(--app-nav-elevated);
                    }

                    .app-navbar-quick-add-action__icon {
                        width: 18px;
                        display: inline-flex;
                        align-items: center;
                        justify-content: center;
                        color: var(--app-text-muted);
                        flex: 0 0 auto;
                    }

                    .app-navbar-quick-add-action:hover .app-navbar-quick-add-action__icon {
                        color: var(--app-primary);
                    }

                    .app-navbar-quick-add-action__label {
                        min-width: 0;
                        overflow: hidden;
                        text-overflow: ellipsis;
                        white-space: nowrap;
                        font-size: 12px;
                        font-weight: 650;
                    }

                    @media (max-width: 767px) {
                        .app-navbar {
                            min-height: 56px;
                            padding: 0 10px;
                        }

                        .app-navbar__main {
                            min-height: 56px;
                            grid-template-columns: minmax(0, 1fr) auto;
                            gap: 8px;
                        }

                        .app-navbar__center {
                            display: none;
                        }

                        .app-navbar__left {
                            gap: 7px;
                        }

                        .app-navbar__right {
                            gap: 6px;
                        }

                        .app-navbar__logo {
                            max-height: 35px;
                        }

                        .app-navbar__quick-add {
                            width: var(--app-control-height);
                            padding-inline: 0;
                        }

                        .app-navbar__pos-button {
                            width: var(--app-control-height);
                            padding-inline: 0;
                        }

                        .app-navbar-quick-add-panel {
                            width: min(360px, calc(100vw - 16px));
                        }

                        .app-navbar-quick-add-panel__head {
                            align-items: flex-start;
                            flex-direction: column;
                            gap: 2px;
                        }

                        .app-navbar-quick-add-panel__grid {
                            grid-template-columns: 1fr;
                        }
                    }

                    @media (min-width: 768px) and (max-width: 991px) {
                        .app-navbar {
                            padding: 0 14px;
                        }

                        .app-navbar__main {
                            grid-template-columns: minmax(250px, auto) minmax(180px, 1fr) minmax(220px, auto);
                            gap: 10px;
                        }

                        .app-navbar__left {
                            gap: 8px;
                        }

                        .app-navbar__right {
                            gap: 6px;
                        }

                        .app-navbar__search {
                            max-width: 340px;
                        }

                        .app-navbar__quick-add {
                            width: var(--app-control-height);
                            padding-inline: 0;
                        }

                        .app-navbar__pos-button {
                            width: var(--app-control-height);
                            padding-inline: 0;
                        }

                        .app-navbar-quick-add-panel {
                            width: min(620px, calc(100vw - 24px));
                        }

                        .app-navbar-quick-add-panel__grid {
                            grid-template-columns: repeat(2, minmax(0, 1fr));
                        }
                    }

                    @media (min-width: 992px) and (max-width: 1199px) {
                        .app-navbar {
                            padding: 0 16px;
                        }

                        .app-navbar__main {
                            grid-template-columns: minmax(300px, auto) minmax(240px, 1fr) minmax(320px, auto);
                            gap: 12px;
                        }

                        .app-navbar__search {
                            max-width: 400px;
                        }

                        .app-navbar__right {
                            gap: 7px;
                        }

                        .app-navbar__quick-add {
                            width: var(--app-control-height);
                            padding-inline: 0;
                        }
                    }

                    @media (min-width: 1200px) and (max-width: 1535px) {
                        .app-navbar__main {
                            grid-template-columns: minmax(350px, auto) minmax(320px, 1fr) minmax(410px, auto);
                        }

                        .app-navbar__search {
                            max-width: 480px;
                        }
                    }

                    @media (min-width: 1536px) {
                        .app-navbar {
                            padding: 0 24px;
                        }

                        .app-navbar__main {
                            grid-template-columns: minmax(380px, auto) minmax(440px, 1fr) minmax(460px, auto);
                            gap: 20px;
                        }

                        .app-navbar__search {
                            max-width: 620px;
                        }
                    }
                `}
            </style>
        </>
    );
}
