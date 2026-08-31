import { useEffect, useRef, useState } from "react";
import { WebsiteButton, WebsiteContainer, WebsiteImage, WebsiteLink, menuHref } from "./WebsitePrimitives";

function normalizePath(value) {
    if (!value || value === "#") return "#";
    try {
        const url = value.startsWith("http") ? new URL(value) : new URL(value, window.location.origin);
        return url.pathname.replace(/\/+$/, "") || "/";
    } catch {
        return String(value).split(/[?#]/)[0].replace(/\/+$/, "") || "/";
    }
}

function isActiveHref(href) {
    if (!href || href === "#" || typeof window === "undefined") return false;
    const current = normalizePath(window.location.pathname);
    const target = normalizePath(href);

    return target === "/" ? current === "/" : current === target || current.startsWith(`${target}/`);
}

function MenuItem({ item, onNavigate }) {
    const [open, setOpen] = useState(false);
    const wrapperRef = useRef(null);
    const buttonRef = useRef(null);
    const children = item.children || [];
    const href = menuHref(item);

    useEffect(() => {
        const closeOutside = (event) => {
            if (!wrapperRef.current?.contains(event.target)) setOpen(false);
        };
        document.addEventListener("pointerdown", closeOutside);
        return () => document.removeEventListener("pointerdown", closeOutside);
    }, []);

    const close = () => {
        setOpen(false);
        onNavigate?.();
    };

    if (!children.length) {
        return <div className="kl-menu-item"><WebsiteLink href={href} className={isActiveHref(href) ? "is-active" : undefined} newTab={item.target === "new_tab"} onClick={close}>{item.label}</WebsiteLink></div>;
    }

    return <div className="kl-menu-item kl-menu-item--dropdown" ref={wrapperRef} onKeyDown={(event) => {
        if (event.key === "Escape") { setOpen(false); buttonRef.current?.focus(); }
    }}>
        <div className="kl-menu-parent">
            {href !== "#" ? <WebsiteLink href={href} className={isActiveHref(href) ? "is-active" : undefined} newTab={item.target === "new_tab"} onClick={close}>{item.label}</WebsiteLink> : <span>{item.label}</span>}
            <button ref={buttonRef} type="button" className="kl-dropdown-toggle" aria-label={`Show ${item.label} menu`} aria-expanded={open} onClick={() => setOpen((value) => !value)}><svg viewBox="0 0 16 16" aria-hidden="true"><path d="m4 6 4 4 4-4" /></svg></button>
        </div>
        {open && <div className="kl-dropdown" role="menu">{children.map((child) => <WebsiteLink key={child.id || child.label} href={menuHref(child)} newTab={child.target === "new_tab"} onClick={close} role="menuitem">{child.label}</WebsiteLink>)}</div>}
    </div>;
}

export default function WebsiteHeader({ menus = {}, site = {} }) {
    const [mobileOpen, setMobileOpen] = useState(false);
    const menuButtonRef = useRef(null);
    const logo = site["branding.light_logo"] || site["branding.logo"] || "/branding/light_logo.png";
    const name = site["general.platform_name"] || "KiteLedger";

    useEffect(() => {
        if (!mobileOpen) return;
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        const close = (event) => {
            if (event.key === "Escape") {
                setMobileOpen(false);
                menuButtonRef.current?.focus();
            }
        };
        document.addEventListener("keydown", close);
        return () => {
            document.body.style.overflow = previousOverflow;
            document.removeEventListener("keydown", close);
        };
    }, [mobileOpen]);

    const closeMobile = () => setMobileOpen(false);
    return <header className="kl-header">
        <WebsiteContainer className="kl-nav">
            <WebsiteLink href="/" className="kl-brand" aria-label={`${name} home`} onClick={closeMobile}>
                <WebsiteImage src={logo} alt={site["branding.logo_alt_text"] || name} loading="eager" />
            </WebsiteLink>
            <button ref={menuButtonRef} className="kl-menu-button" type="button" onClick={() => setMobileOpen((value) => !value)} aria-expanded={mobileOpen} aria-controls="public-navigation" aria-label={mobileOpen ? "Close navigation" : "Open navigation"}><span /><span /><span /></button>
            <nav id="public-navigation" className={`kl-menu${mobileOpen ? " is-open" : ""}`} aria-label="Main navigation">
                {(menus.header || []).map((item) => <MenuItem item={item} key={item.id || item.label} onNavigate={closeMobile} />)}
                <div className="kl-menu-actions">
                    <WebsiteLink className="kl-signin" href={typeof route === "function" ? route("central.login") : "/login"} onClick={closeMobile}>Sign in</WebsiteLink>
                    <WebsiteButton size="small" href={site["branding.primary_cta_url"] || "/pricing"} onClick={closeMobile}>{site["branding.primary_cta_label"] || "View pricing"}</WebsiteButton>
                </div>
            </nav>
        </WebsiteContainer>
    </header>;
}
