import { WebsiteContainer, WebsiteImage, WebsiteLink, menuHref } from "./WebsitePrimitives";

export default function WebsiteFooter({ menus = {}, site = {}, socialLinks = [] }) {
    const name = site["general.platform_name"] || "KiteLedger";
    const logo = site["branding.dark_logo"] || site["branding.logo"] || "/branding/dark_logo.png";
    const groups = ["product", "resources", "footer", "legal"];
    const populatedGroups = groups.filter((group) => (menus[group] || []).length);
    return <footer className="kl-footer">
        <WebsiteContainer>
            <div className="kl-footer-callout">
                <div><span>Already using {name}?</span><h2>Keep your organizations and finances moving.</h2></div>
                <WebsiteLink className="kl-footer-cta" href={typeof route === "function" ? route("central.account.login") : "/account/login"}>Open customer portal <span aria-hidden="true">→</span></WebsiteLink>
            </div>
            <div className="kl-footer-main">
                <div className="kl-footer-brand">
                    <WebsiteLink href="/" className="kl-brand" aria-label={`${name} home`}>
                        <WebsiteImage src={logo} alt={site["branding.logo_alt_text"] || name} />
                    </WebsiteLink>
                    <p>{site["branding.footer_text"] || "Simple, dependable accounting built for growing businesses."}</p>
                    {(site["contact.email"] || site["contact.phone"]) && <address>
                        {site["contact.email"] && <WebsiteLink href={`mailto:${site["contact.email"]}`}><span>Email</span>{site["contact.email"]}</WebsiteLink>}
                        {site["contact.phone"] && <WebsiteLink href={`tel:${site["contact.phone"]}`}><span>Phone</span>{site["contact.phone"]}</WebsiteLink>}
                    </address>}
                    {socialLinks.length > 0 && <div className="kl-social-links" aria-label="Social media">{socialLinks.map(link=><WebsiteLink key={link.id} href={link.url} newTab aria-label={link.platform}>{link.icon || link.platform}</WebsiteLink>)}</div>}
                </div>
                {populatedGroups.map((group) => <nav key={group} aria-label={`${group} links`}>
                    <h2>{group === "footer" ? "Company" : group}</h2>
                    {(menus[group] || []).map((item) => <WebsiteLink key={item.id || item.label} href={menuHref(item)} newTab={item.target === "new_tab"}>{item.label}</WebsiteLink>)}
                </nav>)}
            </div>
            <div className="kl-footer-bottom"><span>© {new Date().getFullYear()} {name}. All rights reserved.</span><span>Secure cloud accounting for growing teams.</span></div>
        </WebsiteContainer>
    </footer>;
}
