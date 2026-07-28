import { useEffect, useState } from 'react';
import WebsiteFooter from './WebsiteFooter';
import WebsiteHeader from './WebsiteHeader';
import { WebsiteImage, WebsiteLink } from './WebsitePrimitives';

function Announcement({ item }) {
    const [hidden, setHidden] = useState(true);
    useEffect(() => {
        if (item) setHidden(window.localStorage.getItem(`kl-announcement-${item.id}`) === '1');
    }, [item?.id]);
    if (!item || hidden || !item.content) return null;
    const data = item.data || {};
    const url = item.link_url || data.url;
    const dismissible = item.is_dismissible ?? data.dismissible ?? true;
    const dismiss = () => {
        window.localStorage.setItem(`kl-announcement-${item.id}`, '1');
        setHidden(true);
    };
    return <aside className="kl-announcement" aria-label="Announcement">
        <span>{item.content}</span>
        {url && <WebsiteLink href={url} newTab={item.target === 'new_tab' || data.new_tab}>{item.link_label || data.link_label || 'Learn more'}</WebsiteLink>}
        {dismissible && <button type="button" onClick={dismiss} aria-label="Dismiss announcement">×</button>}
    </aside>;
}

function Popup({ item }) {
    const [open, setOpen] = useState(false);
    useEffect(() => {
        if (!item) return;
        const key = `kl-popup-${item.id}`;
        const hidden = (item.frequency === 'once' && localStorage.getItem(key)) || (item.frequency === 'session' && sessionStorage.getItem(key));
        setOpen(!hidden);
    }, [item?.id]);
    if (!item || !open) return null;
    const close = () => {
        const key = `kl-popup-${item.id}`;
        if (item.frequency === 'once') localStorage.setItem(key, '1');
        if (item.frequency === 'session') sessionStorage.setItem(key, '1');
        setOpen(false);
    };
    return <div className="kl-popup-backdrop" role="presentation"><section className="kl-popup" role="dialog" aria-modal="true" aria-labelledby="kl-popup-title">
        {item.is_dismissible && <button onClick={close} aria-label="Close">×</button>}
        {item.media && <WebsiteImage src={item.media.url} alt={item.media.alt_text || item.title} fit="cover"/>}
        <h2 id="kl-popup-title">{item.title}</h2><p>{item.content}</p>
        {item.cta_url && <WebsiteLink className="kl-button kl-button--primary" href={item.cta_url} newTab={item.target === 'new_tab'}>{item.cta_label || 'Learn more'}</WebsiteLink>}
    </section></div>;
}

function CookieConsent({ site }) {
    const [visible, setVisible] = useState(false);
    useEffect(() => setVisible(Boolean(site['website.cookie_consent_enabled']) && !localStorage.getItem('kl-cookie-consent')), [site]);
    if (!visible) return null;
    const decide = (value) => {
        localStorage.setItem('kl-cookie-consent', value);
        window.dispatchEvent(new CustomEvent('kiteledger:consent', { detail: value }));
        setVisible(false);
    };
    return <aside className="kl-cookie" role="dialog" aria-label="Cookie preferences"><p>
        {site['website.cookie_consent_content'] || 'We use necessary cookies and optional analytics to improve your experience.'} <WebsiteLink href="/cookie-policy">Cookie Policy</WebsiteLink> · <WebsiteLink href="/privacy-policy">Privacy Policy</WebsiteLink>
    </p><div><button onClick={() => decide('necessary')}>Necessary only</button><button className="kl-button kl-button--primary" onClick={() => decide('all')}>Accept all</button></div></aside>;
}

export default function WebsiteLayout({ children, menus = {}, site = {}, announcements = [], navbarNotifications = [], websitePopup = null, socialLinks = [], previewMessage }) {
    const primary = site['branding.primary_color'] || '#176b5b';
    const secondary = site['branding.secondary_color'] || '#10211d';
    const theme = {
        '--website-primary': primary,
        '--website-secondary': secondary,
        '--website-accent': site['branding.website_accent_color'] || '#d97706',
        '--website-background': site['branding.website_background_color'] || '#ffffff',
        '--website-surface-subtle': site['branding.website_surface_color'] || '#f6f8f7',
        '--website-text': site['branding.website_text_color'] || '#3d4d48',
        '--website-footer': site['branding.website_footer_color'] || secondary,
    };
    return <div className="kl-site" style={theme}>
        <a className="kl-skip-link" href="#main-content">Skip to main content</a>
        {previewMessage && <div className="kl-preview" role="status">{previewMessage}</div>}
        <Announcement item={navbarNotifications[0] || announcements[0]}/>
        <WebsiteHeader menus={menus} site={site}/>
        <main id="main-content">{children}</main>
        <WebsiteFooter menus={menus} site={site} socialLinks={socialLinks}/>
        <Popup item={websitePopup}/><CookieConsent site={site}/>
    </div>;
}
