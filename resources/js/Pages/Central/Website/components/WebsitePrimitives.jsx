import { Link } from "@inertiajs/react";
import { useState } from "react";

export function ArrowIcon({ direction = "forward" }) {
    return (
        <svg className={`kl-arrow kl-arrow--${direction}`} viewBox="0 0 20 20" aria-hidden="true">
            <path d="M4 10h11m-4-4 4 4-4 4" />
        </svg>
    );
}

export function CheckIcon() {
    return <svg className="kl-check-icon" viewBox="0 0 20 20" aria-hidden="true"><path d="m4 10 4 4 8-9" /></svg>;
}

export function FeatureIcon({ name = "check" }) {
    const paths = {
        chart: "M4 16V9m6 7V4m6 12v-6",
        box: "M3 6.5 10 3l7 3.5v7L10 17l-7-3.5zM3 6.5l7 3.5m7-3.5L10 10m0 7v-7",
        people: "M7 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm6 1a2.5 2.5 0 1 0 0-5M2 17c.5-4 2-6 5-6s4.5 2 5 6m1-6c2.8 0 4.3 2 4.7 5",
        shield: "M10 2 17 5v5c0 4-2.6 6.7-7 8-4.4-1.3-7-4-7-8V5zM7 10l2 2 4-5",
        check: "m5 10 3 3 7-7",
    };
    return <span className="kl-feature-icon"><svg viewBox="0 0 20 20" aria-hidden="true"><path d={paths[name] || paths.check} /></svg></span>;
}

export function isSafeHref(value) {
    if (!value) return false;
    const href = String(value).trim();
    return href.startsWith("/") || href.startsWith("#") || /^(https?:|mailto:|tel:)/i.test(href);
}

export function isInternalHref(value) {
    return typeof value === "string" && value.startsWith("/") && !value.startsWith("//");
}

export function menuHref(item) {
    if (item?.page?.slug) return item.page.slug === "home" ? "/" : `/${item.page.slug}`;
    return isSafeHref(item?.url) ? item.url : "#";
}

export function WebsiteLink({ href, children, className, newTab = false, onClick, ...props }) {
    if (!isSafeHref(href)) return null;
    const external = newTab || /^(https?:)?\/\//i.test(href);
    if (isInternalHref(href)) {
        return <Link href={href} className={className} onClick={onClick} {...props}>{children}</Link>;
    }
    return <a href={href} className={className} onClick={onClick} target={external ? "_blank" : undefined} rel={external ? "noopener noreferrer" : undefined} {...props}>{children}</a>;
}

export function WebsiteButton({ href, children, variant = "primary", size = "regular", newTab = false, onClick }) {
    if (!href || !children) return null;
    return <WebsiteLink href={href} newTab={newTab} onClick={onClick} className={`kl-button kl-button--${variant} kl-button--${size}`}>{children}{variant !== "text" && <ArrowIcon />}</WebsiteLink>;
}

export function WebsiteContainer({ as: Tag = "div", className = "", children }) {
    return <Tag className={`kl-container ${className}`.trim()}>{children}</Tag>;
}

export function WebsiteImage({ src, alt = "", width, height, aspectRatio, fit = "contain", position = "center", loading = "lazy", fetchPriority, caption, href, decorative = false, className = "" }) {
    const [failed, setFailed] = useState(false);
    if (!src || failed || !isSafeHref(src)) return null;
    const image = <img className={className} src={src} alt={decorative ? "" : alt} width={width || undefined} height={height || undefined} loading={loading} fetchpriority={fetchPriority} decoding="async" onError={() => setFailed(true)} style={{ aspectRatio: aspectRatio || undefined, objectFit: fit, objectPosition: position }} />;
    const content = href ? <WebsiteLink href={href}>{image}</WebsiteLink> : image;
    return caption ? <figure className="kl-image-figure">{content}<figcaption>{caption}</figcaption></figure> : content;
}

export function SectionHeader({ eyebrow, title, description, alignment = "start", headingLevel = 2 }) {
    if (!eyebrow && !title && !description) return null;
    const Heading = `h${headingLevel}`;
    return <header className={`kl-section-header kl-section-header--${alignment}`}>
        {eyebrow && <p className="kl-eyebrow">{eyebrow}</p>}
        {title && <Heading>{title}</Heading>}
        {description && <p>{description}</p>}
    </header>;
}

export function SectionActions({ section }) {
    const primaryHref = section?.button_url;
    const secondaryHref = section?.secondary_button_url;
    if ((!section?.button_text || !primaryHref) && (!section?.secondary_button_text || !secondaryHref)) return null;
    return <div className="kl-actions">
        <WebsiteButton href={primaryHref}>{section.button_text}</WebsiteButton>
        <WebsiteButton href={secondaryHref} variant="secondary">{section.secondary_button_text}</WebsiteButton>
    </div>;
}

export function Breadcrumbs({ items = [] }) {
    const visible = items.filter((item) => item?.label);
    if (visible.length < 2) return null;
    return <nav className="kl-breadcrumbs" aria-label="Breadcrumb"><ol>{visible.map((item, index) => <li key={`${item.label}-${index}`}>{item.href && index < visible.length - 1 ? <WebsiteLink href={item.href}>{item.label}</WebsiteLink> : <span aria-current={index === visible.length - 1 ? "page" : undefined}>{item.label}</span>}</li>)}</ol></nav>;
}

export function PageHeader({ eyebrow, title, description, image, imageAlt, breadcrumbs = [], compact = false }) {
    return <section className={`kl-page-header${compact ? " kl-page-header--compact" : ""}`}>
        <WebsiteContainer>
            <Breadcrumbs items={breadcrumbs} />
            <div className="kl-page-header__grid">
                <div><SectionHeader eyebrow={eyebrow} title={title} description={description} headingLevel={1} /></div>
                {image && <WebsiteImage className="kl-page-header__image" src={image.url || image} alt={imageAlt || image.alt_text || title} width={image.width} height={image.height} fit="cover" loading="eager" />}
            </div>
        </WebsiteContainer>
    </section>;
}

export function formatDate(value) {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return new Intl.DateTimeFormat(undefined, { year: "numeric", month: "short", day: "numeric" }).format(date);
}
