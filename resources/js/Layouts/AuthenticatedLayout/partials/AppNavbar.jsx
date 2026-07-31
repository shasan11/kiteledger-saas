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
import { Button, Grid, Layout, Popover, theme } from 'antd';
import { useEffect, useMemo, useState } from 'react';

const { Header } = Layout;
const { useBreakpoint } = Grid;

const isHexColor = (value) =>
    typeof value === 'string' && /^#(?:[0-9a-f]{3}){1,2}$/i.test(value.trim());

const hexToRgb = (hex) => {
    if (!isHexColor(hex)) return null;

    const value = hex.trim();
    const normalized =
        value.length === 4
            ? `#${value
                  .slice(1)
                  .split('')
                  .map((character) => `${character}${character}`)
                  .join('')}`
            : value;

    return {
        r: Number.parseInt(normalized.slice(1, 3), 16),
        g: Number.parseInt(normalized.slice(3, 5), 16),
        b: Number.parseInt(normalized.slice(5, 7), 16),
    };
};

const rgba = (hex, opacity) => {
    const rgb = hexToRgb(hex);
    return rgb ? `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${opacity})` : hex;
};

const getStoredThemeMode = () => {
    if (typeof window === 'undefined') return 'light';

    return (
        localStorage.getItem('themeMode') ||
        localStorage.getItem('theme_mode') ||
        'light'
    );
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
    const isCompactDesktop = screens.lg && !screens.xl;
    const isDarkMode = themeMode === 'dark';

    const controlHeight = isMobile ? 40 : 38;
    const logoWidth = isMobile ? 112 : isTablet ? 128 : isCompactDesktop ? 138 : 150;

    useEffect(() => {
        let mounted = true;

        fetchBrandSettings()
            .then((settings) => {
                if (mounted) setBrandSettings(settings);
            })
            .catch(() => {});

        const unsubscribe = subscribeToBrandSettings((settings) => {
            if (mounted) setBrandSettings(settings);
        });

        return () => {
            mounted = false;
            unsubscribe?.();
        };
    }, []);

    useEffect(() => {
        const handleThemeModeChange = (event) => {
            setThemeMode(event.detail?.mode || getStoredThemeMode());
        };

        const handleStorage = (event) => {
            if (event.key === 'themeMode' || event.key === 'theme_mode') {
                setThemeMode(event.newValue || getStoredThemeMode());
            }
        };

        window.addEventListener('kiteledger-theme-mode-change', handleThemeModeChange);
        window.addEventListener('storage', handleStorage);

        return () => {
            window.removeEventListener('kiteledger-theme-mode-change', handleThemeModeChange);
            window.removeEventListener('storage', handleStorage);
        };
    }, []);

    const palette = useMemo(() => {
        const primary = isHexColor(brandSettings?.brand_primary_color)
            ? brandSettings.brand_primary_color.trim()
            : token.colorPrimary;

        const shared = {
            primary,
            primaryHover: token.colorPrimaryHover || primary,
            primarySoft: rgba(primary, 0.16),
            primaryBorder: rgba(primary, 0.38),
        };

        return {
            ...shared,
            nav: 'rgba(8, 13, 24, 0.96)',
            navSoft: '#101827',
            navElevated: '#172234',
            surface: '#0d1524',
            border: 'rgba(148, 163, 184, 0.14)',
            borderStrong: 'rgba(148, 163, 184, 0.3)',
            text: '#f8fafc',
            textSecondary: '#cbd5e1',
            textMuted: '#94a3b8',
            shadow: '0 12px 36px rgba(2, 6, 23, 0.34)',
        };
    }, [
        brandSettings?.brand_primary_color,
        token.colorPrimary,
        token.colorPrimaryHover,
    ]);

    const resolveUrl = (routeName, fallback) => {
        if (typeof getUrl !== 'function') return fallback;
        return getUrl(routeName, fallback) || fallback;
    };

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

        const url = resolveUrl(action.routeName, action.fallback);

        if (url && url !== '#') {
            window.location.assign(url);
        }
    };

    const quickAddContent = quickAddSections.length ? (
        <div className="app-navbar-quick-add-panel">
            <div className="app-navbar-quick-add-panel__head">
                <div>
                    <div className="app-navbar-quick-add-panel__eyebrow">
                        {t('Workspace actions')}
                    </div>
                    <div className="app-navbar-quick-add-panel__title">
                        {t('Quick Add')}
                    </div>
                </div>
                <span className="app-navbar-quick-add-panel__hint">
                    {t('Create records by module')}
                </span>
            </div>

            <div className="app-navbar-quick-add-panel__grid">
                {quickAddSections.map((section) => (
                    <section key={section.key} className="app-navbar-quick-add-card">
                        <div className="app-navbar-quick-add-card__title">
                            <span className="app-navbar-quick-add-card__icon">
                                {section.icon}
                            </span>
                            <span className="app-navbar-quick-add-card__name">
                                {section.title}
                            </span>
                        </div>

                        <div className="app-navbar-quick-add-card__actions">
                            {(section.children || []).map((action) => (
                                <button
                                    key={action.key}
                                    type="button"
                                    className="app-navbar-quick-add-action"
                                    onClick={() => openQuickAction(action)}
                                >
                                    <span className="app-navbar-quick-add-action__icon">
                                        {action.icon}
                                    </span>
                                    <span className="app-navbar-quick-add-action__label">
                                        {action.label}
                                    </span>
                                </button>
                            ))}
                        </div>
                    </section>
                ))}
            </div>
        </div>
    ) : null;

    const cssVariables = {
        '--app-control-height': `${controlHeight}px`,
        '--app-radius': '11px',
        '--app-nav': palette.nav,
        '--app-nav-soft': palette.navSoft,
        '--app-nav-elevated': palette.navElevated,
        '--app-surface': palette.surface,
        '--app-border': palette.border,
        '--app-border-strong': palette.borderStrong,
        '--app-text': palette.text,
        '--app-text-secondary': palette.textSecondary,
        '--app-text-muted': palette.textMuted,
        '--app-primary': palette.primary,
        '--app-primary-hover': palette.primaryHover,
        '--app-primary-soft': palette.primarySoft,
        '--app-primary-border': palette.primaryBorder,
        '--app-shadow': palette.shadow,
    };

    return (
        <>
            <Header className="app-navbar" style={cssVariables}>
                <div className="app-navbar__main">
                    <div className="app-navbar__left">
                        {isMobile && (
                            <Button
                                type="text"
                                icon={<MenuOutlined />}
                                className="app-navbar__icon-button app-navbar__menu-button"
                                onClick={onSidebarToggle}
                                aria-label={t('Open navigation')}
                                title={t('Open navigation')}
                            />
                        )}

                        <Link
                            href={resolveUrl('dashboard', '/dashboard')}
                            className="app-navbar__brand-link"
                            aria-label={t('Go to dashboard')}
                        >
                            <ApplicationLogo
                                className="app-navbar__logo"
                                dark={false}
                                style={{ width: logoWidth, maxWidth: '100%' }}
                            />
                        </Link>

                        {!isMobile && (
                            <div className="app-navbar__desktop-context">
                                <BranchToggle
                                    className="app-navbar__icon-button app-navbar__context-button"
                                    style={{
                                        width: controlHeight,
                                        height: controlHeight,
                                    }}
                                />
                            </div>
                        )}
                    </div>

                    {!isMobile && (
                        <div className="app-navbar__center">
                            <GlobalSearch
                                branchContext={branchContext}
                                className="global-search-command__trigger app-navbar__search"
                                style={{ width: '100%', height: controlHeight }}
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
                                title={t('Open POS')}
                                aria-label={t('Open POS')}
                                onClick={() =>
                                    openQuickAction({
                                        routeName: 'pos.index',
                                        fallback: '/pos',
                                    })
                                }
                            >
                                {!isMobile && !isTablet && (
                                    <span className="app-navbar__button-label">{t('POS')}</span>
                                )}
                            </Button>
                        )}

                        {quickAddSections.length > 0 && (
                            <Popover
                                content={quickAddContent}
                                placement="bottomRight"
                                trigger="click"
                                arrow={false}
                                overlayClassName="app-navbar-quick-add-popover"
                                getPopupContainer={(triggerNode) =>
                                    triggerNode.closest('.app-navbar') || document.body
                                }
                            >
                                <Button
                                    type="primary"
                                    icon={<PlusOutlined />}
                                    className="app-navbar__quick-add"
                                    title={t('Quick Add')}
                                    aria-label={t('Quick Add')}
                                >
                                    {!isMobile && !isTablet && (
                                        <span className="app-navbar__button-label">
                                            {t('Quick Add')}
                                        </span>
                                    )}
                                </Button>
                            </Popover>
                        )}

                        <LanguageSwitcher
                            compact
                            className="app-navbar__language-switcher"
                            style={{ height: controlHeight }}
                        />

                        {!isMobile && (
                            <Button
                                type="text"
                                icon={isDarkMode ? <SunOutlined /> : <MoonOutlined />}
                                onClick={toggleThemeMode}
                                aria-label={
                                    isDarkMode
                                        ? t('Switch to light mode')
                                        : t('Switch to dark mode')
                                }
                                title={
                                    isDarkMode
                                        ? t('Switch to light mode')
                                        : t('Switch to dark mode')
                                }
                                className="app-navbar__icon-button app-navbar__theme-switch"
                            />
                        )}
                    </div>
                </div>

                {isMobile && (
                    <div className="app-navbar__mobile-search">
                        <GlobalSearch
                            branchContext={branchContext}
                            className="global-search-command__trigger app-navbar__search"
                            style={{ width: '100%', height: controlHeight }}
                        />
                    </div>
                )}
            </Header>

            <style>
                {`
                    .app-navbar {
                        position: sticky;
                        top: 0;
                        z-index: 100;
                        width: 100%;
                        height: auto;
                        min-height: 64px;
                        padding: 0 max(16px, env(safe-area-inset-right)) 0 max(16px, env(safe-area-inset-left));
                        line-height: 1;
                        color: var(--app-text);
                        background: var(--app-nav);
                        border-bottom: 1px solid var(--app-border);
                        box-shadow: 0 1px 0 rgba(255, 255, 255, 0.025);
                        backdrop-filter: blur(18px) saturate(150%);
                        -webkit-backdrop-filter: blur(18px) saturate(150%);
                        box-sizing: border-box;
                    }

                    .app-navbar *,
                    .app-navbar *::before,
                    .app-navbar *::after {
                        box-sizing: border-box;
                    }

                    .app-navbar__main {
                        min-height: 64px;
                        display: flex;
                        align-items: center;
                        gap: clamp(10px, 1.5vw, 22px);
                    }

                    .app-navbar__left,
                    .app-navbar__center,
                    .app-navbar__right {
                        min-width: 0;
                        display: flex;
                        align-items: center;
                    }

                    .app-navbar__left {
                        flex: 0 1 auto;
                        gap: 10px;
                    }

                    .app-navbar__center {
                        flex: 1 1 520px;
                        justify-content: center;
                    }

                    .app-navbar__right {
                        flex: 0 0 auto;
                        justify-content: flex-end;
                        gap: 8px;
                    }

                    .app-navbar__desktop-context {
                        display: inline-flex;
                    }

                    .app-navbar__brand-link {
                        min-width: 0;
                        display: inline-flex;
                        align-items: center;
                        overflow: hidden;
                        border-radius: 8px;
                        text-decoration: none;
                        flex: 0 1 auto;
                    }

                    .app-navbar__brand-link:focus-visible,
                    .app-navbar button:focus-visible,
                    .app-navbar-quick-add-action:focus-visible {
                        outline: 2px solid var(--app-primary);
                        outline-offset: 2px;
                    }

                    .app-navbar__logo {
                        display: block;
                        height: auto;
                        max-height: 34px;
                        object-fit: contain;
                        transition: opacity 160ms ease, transform 160ms ease;
                    }

                    .app-navbar__brand-link:hover .app-navbar__logo {
                        opacity: 0.92;
                        transform: translateY(-1px);
                    }

                    .app-navbar__search {
                        width: 100%;
                        max-width: 600px;
                        min-width: 160px;
                    }

                    .app-navbar__icon-button,
                    .app-navbar__quick-add,
                    .app-navbar__pos-button,
                    .app-navbar__language-switcher .ant-select-selector {
                        height: var(--app-control-height) !important;
                        min-height: var(--app-control-height) !important;
                        border-radius: var(--app-radius) !important;
                        display: inline-flex !important;
                        align-items: center !important;
                        justify-content: center !important;
                        flex: 0 0 auto;
                        transition:
                            color 160ms ease,
                            background-color 160ms ease,
                            border-color 160ms ease,
                            box-shadow 160ms ease,
                            transform 160ms ease !important;
                    }

                    .app-navbar__icon-button {
                        width: var(--app-control-height);
                        padding: 0 !important;
                        color: var(--app-text-secondary) !important;
                        background: transparent !important;
                        border: 1px solid transparent !important;
                        box-shadow: none !important;
                    }

                    .app-navbar__icon-button:hover,
                    .app-navbar__icon-button:focus-visible {
                        color: var(--app-text) !important;
                        background: var(--app-nav-elevated) !important;
                        border-color: var(--app-border-strong) !important;
                    }

                    .app-navbar__icon-button:active,
                    .app-navbar__pos-button:active,
                    .app-navbar__quick-add:active {
                        transform: translateY(1px);
                    }

                    .app-navbar__quick-add,
                    .app-navbar__pos-button {
                        min-width: var(--app-control-height);
                        padding-inline: 12px !important;
                        gap: 7px;
                        font-weight: 700;
                        letter-spacing: -0.01em;
                        box-shadow: none !important;
                    }

                    .app-navbar__quick-add {
                        color: #ffffff !important;
                        background: var(--app-primary) !important;
                        border-color: var(--app-primary) !important;
                    }

                    .app-navbar__quick-add:hover,
                    .app-navbar__quick-add:focus-visible {
                        background: var(--app-primary-hover) !important;
                        border-color: var(--app-primary-hover) !important;
                        box-shadow: 0 7px 18px var(--app-primary-soft) !important;
                    }

                    .app-navbar__pos-button {
                        color: var(--app-text-secondary) !important;
                        background: var(--app-nav-soft) !important;
                        border: 1px solid var(--app-border) !important;
                    }

                    .app-navbar__pos-button:hover,
                    .app-navbar__pos-button:focus-visible {
                        color: var(--app-text) !important;
                        background: var(--app-nav-elevated) !important;
                        border-color: var(--app-border-strong) !important;
                    }

                    .app-navbar__button-label {
                        white-space: nowrap;
                    }

                    .app-navbar__language-switcher {
                        flex: 0 0 auto;
                    }

                    .app-navbar__language-switcher .ant-select-selector {
                        min-width: var(--app-control-height);
                        color: var(--app-text-secondary) !important;
                        background: var(--app-nav-soft) !important;
                        border-color: var(--app-border) !important;
                        box-shadow: none !important;
                    }

                    .app-navbar__language-switcher:hover .ant-select-selector,
                    .app-navbar__language-switcher.ant-select-focused .ant-select-selector {
                        background: var(--app-nav-elevated) !important;
                        border-color: var(--app-border-strong) !important;
                    }

                    .app-navbar__language-switcher .ant-select-selection-item,
                    .app-navbar__language-switcher .ant-select-arrow {
                        color: var(--app-text-secondary) !important;
                    }

                    .app-navbar__search,
                    .app-navbar__search button,
                    .app-navbar__search .ant-btn,
                    .app-navbar__search .ant-input,
                    .app-navbar__search .ant-input-affix-wrapper {
                        height: var(--app-control-height) !important;
                        color: var(--app-text-secondary) !important;
                        background: var(--app-nav-soft) !important;
                        border-color: transparent !important;
                        border-radius: var(--app-radius) !important;
                        box-shadow: none !important;
                    }

                    .app-navbar__search:hover,
                    .app-navbar__search button:hover,
                    .app-navbar__search .ant-btn:hover,
                    .app-navbar__search .ant-input-affix-wrapper:hover,
                    .app-navbar__search .ant-input-affix-wrapper-focused {
                        color: var(--app-text) !important;
                        background: var(--app-nav-elevated) !important;
                        border-color: var(--app-border-strong) !important;
                    }

                    .app-navbar__search input::placeholder,
                    .app-navbar__search .ant-input::placeholder {
                        color: var(--app-text-muted) !important;
                    }

                    .app-navbar__mobile-search {
                        display: none;
                    }

                    .app-navbar-quick-add-popover {
                        max-width: calc(100vw - 24px);
                    }

                    .app-navbar-quick-add-popover .ant-popover-inner {
                        padding: 0 !important;
                        overflow: hidden;
                        color: var(--app-text-secondary) !important;
                        background: var(--app-surface) !important;
                        border: 1px solid var(--app-border) !important;
                        border-radius: 16px !important;
                        box-shadow: var(--app-shadow) !important;
                    }

                    .app-navbar-quick-add-popover .ant-popover-inner-content {
                        padding: 0 !important;
                    }

                    .app-navbar-quick-add-panel {
                        width: min(920px, calc(100vw - 32px));
                        max-height: min(72vh, 680px);
                        overflow: auto;
                        padding: 16px;
                        color: var(--app-text-secondary);
                        overscroll-behavior: contain;
                    }

                    .app-navbar-quick-add-panel__head {
                        display: flex;
                        align-items: flex-end;
                        justify-content: space-between;
                        gap: 16px;
                        padding: 2px 2px 14px;
                        margin-bottom: 12px;
                        border-bottom: 1px solid var(--app-border);
                    }

                    .app-navbar-quick-add-panel__eyebrow {
                        margin-bottom: 4px;
                        color: var(--app-primary);
                        font-size: 10px;
                        font-weight: 800;
                        line-height: 1.2;
                        letter-spacing: 0.12em;
                        text-transform: uppercase;
                    }

                    .app-navbar-quick-add-panel__title {
                        color: var(--app-text);
                        font-size: 17px;
                        font-weight: 800;
                        line-height: 1.25;
                        letter-spacing: -0.025em;
                    }

                    .app-navbar-quick-add-panel__hint {
                        max-width: 240px;
                        color: var(--app-text-muted);
                        font-size: 12px;
                        line-height: 1.45;
                        text-align: right;
                    }

                    .app-navbar-quick-add-panel__grid {
                        display: grid;
                        grid-template-columns: repeat(4, minmax(0, 1fr));
                        gap: 10px;
                    }

                    .app-navbar-quick-add-card {
                        min-width: 0;
                        padding: 10px;
                        background: var(--app-nav-soft);
                        border: 1px solid var(--app-border);
                        border-radius: 13px;
                    }

                    .app-navbar-quick-add-card__title {
                        min-width: 0;
                        display: flex;
                        align-items: center;
                        gap: 8px;
                        margin-bottom: 8px;
                        color: var(--app-text);
                    }

                    .app-navbar-quick-add-card__icon {
                        width: 28px;
                        height: 28px;
                        display: inline-flex;
                        align-items: center;
                        justify-content: center;
                        color: var(--app-primary);
                        background: var(--app-primary-soft);
                        border: 1px solid var(--app-primary-border);
                        border-radius: 9px;
                        flex: 0 0 auto;
                    }

                    .app-navbar-quick-add-card__name {
                        min-width: 0;
                        overflow: hidden;
                        color: var(--app-text);
                        font-size: 12px;
                        font-weight: 800;
                        line-height: 1.3;
                        text-overflow: ellipsis;
                        white-space: nowrap;
                    }

                    .app-navbar-quick-add-card__actions {
                        display: flex;
                        flex-direction: column;
                        gap: 3px;
                    }

                    .app-navbar-quick-add-action {
                        width: 100%;
                        min-height: 34px;
                        display: flex;
                        align-items: center;
                        gap: 8px;
                        padding: 7px 8px;
                        color: var(--app-text-secondary);
                        background: transparent;
                        border: 1px solid transparent;
                        border-radius: 9px;
                        cursor: pointer;
                        font: inherit;
                        text-align: left;
                        transition:
                            color 150ms ease,
                            background-color 150ms ease,
                            border-color 150ms ease,
                            transform 150ms ease;
                    }

                    .app-navbar-quick-add-action:hover,
                    .app-navbar-quick-add-action:focus-visible {
                        color: var(--app-text);
                        background: var(--app-nav-elevated);
                        border-color: var(--app-border);
                    }

                    .app-navbar-quick-add-action:active {
                        transform: translateY(1px);
                    }

                    .app-navbar-quick-add-action__icon {
                        width: 18px;
                        display: inline-flex;
                        align-items: center;
                        justify-content: center;
                        color: var(--app-text-muted);
                        flex: 0 0 auto;
                    }

                    .app-navbar-quick-add-action:hover .app-navbar-quick-add-action__icon,
                    .app-navbar-quick-add-action:focus-visible .app-navbar-quick-add-action__icon {
                        color: var(--app-primary);
                    }

                    .app-navbar-quick-add-action__label {
                        min-width: 0;
                        overflow: hidden;
                        font-size: 12px;
                        font-weight: 650;
                        line-height: 1.3;
                        text-overflow: ellipsis;
                        white-space: nowrap;
                    }

                    @media (max-width: 1199px) {
                        .app-navbar {
                            padding-inline: 14px;
                        }

                        .app-navbar__main {
                            gap: 10px;
                        }

                        .app-navbar__left,
                        .app-navbar__right {
                            gap: 7px;
                        }

                        .app-navbar__center {
                            flex-basis: 360px;
                        }

                        .app-navbar__search {
                            max-width: 460px;
                        }

                        .app-navbar-quick-add-panel__grid {
                            grid-template-columns: repeat(3, minmax(0, 1fr));
                        }
                    }

                    @media (max-width: 991px) {
                        .app-navbar__center {
                            flex-basis: 240px;
                        }

                        .app-navbar__search {
                            max-width: 340px;
                        }

                        .app-navbar__quick-add,
                        .app-navbar__pos-button {
                            width: var(--app-control-height);
                            padding-inline: 0 !important;
                        }

                        .app-navbar-quick-add-panel {
                            width: min(640px, calc(100vw - 28px));
                        }

                        .app-navbar-quick-add-panel__grid {
                            grid-template-columns: repeat(2, minmax(0, 1fr));
                        }
                    }

                    @media (max-width: 767px) {
                        .app-navbar {
                            min-height: 0;
                            padding:
                                0 max(10px, env(safe-area-inset-right))
                                10px max(10px, env(safe-area-inset-left));
                        }

                        .app-navbar__main {
                            min-height: 58px;
                            display: grid;
                            grid-template-columns: minmax(0, 1fr) auto;
                            gap: 8px;
                        }

                        .app-navbar__left {
                            min-width: 0;
                            gap: 7px;
                        }

                        .app-navbar__right {
                            min-width: 0;
                            gap: 6px;
                        }

                        .app-navbar__menu-button {
                            flex: 0 0 auto;
                        }

                        .app-navbar__brand-link {
                            max-width: min(116px, 31vw);
                        }

                        .app-navbar__logo {
                            max-height: 32px;
                        }

                        .app-navbar__language-switcher .ant-select-selector {
                            padding-inline: 7px !important;
                        }

                        .app-navbar__mobile-search {
                            display: flex;
                            width: 100%;
                        }

                        .app-navbar__mobile-search .app-navbar__search {
                            max-width: none;
                            min-width: 0;
                        }

                        .app-navbar-quick-add-panel {
                            width: min(390px, calc(100vw - 20px));
                            max-height: min(70vh, 620px);
                            padding: 12px;
                        }

                        .app-navbar-quick-add-panel__head {
                            align-items: flex-start;
                            flex-direction: column;
                            gap: 6px;
                            padding-bottom: 12px;
                        }

                        .app-navbar-quick-add-panel__hint {
                            max-width: none;
                            text-align: left;
                        }

                        .app-navbar-quick-add-panel__grid {
                            grid-template-columns: 1fr;
                        }
                    }

                    @media (max-width: 374px) {
                        .app-navbar__brand-link {
                            max-width: 88px;
                        }

                        .app-navbar__right {
                            gap: 4px;
                        }

                        .app-navbar__language-switcher .ant-select-selector {
                            padding-inline: 5px !important;
                        }
                    }

                    @media (min-width: 1536px) {
                        .app-navbar {
                            padding-inline: 24px;
                        }

                        .app-navbar__main {
                            gap: 24px;
                        }

                        .app-navbar__search {
                            max-width: 680px;
                        }
                    }

                    @media (prefers-reduced-motion: reduce) {
                        .app-navbar *,
                        .app-navbar *::before,
                        .app-navbar *::after {
                            scroll-behavior: auto !important;
                            transition-duration: 0.01ms !important;
                            animation-duration: 0.01ms !important;
                            animation-iteration-count: 1 !important;
                        }
                    }
                `}
            </style>
        </>
    );
}
