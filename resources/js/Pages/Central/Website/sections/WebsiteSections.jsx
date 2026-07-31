import React, { useState } from "react";
import { ArrowIcon, CheckIcon, FeatureIcon, isSafeHref, SectionActions, SectionHeader, WebsiteButton, WebsiteContainer, WebsiteImage, WebsiteLink } from "../components/WebsitePrimitives";

const mediaFor = (value = {}) => value.media?.url || value.image || value.image_url || value.settings?.image_url || value.data?.image;
const itemsFor = (section, fallback) => section.items?.length ? section.items : fallback || [];
const isHexColor = (value) => /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(String(value || ""));
const sectionClass = (section, name) => {
    const settings = section.settings || {};
    return [
        "kl-section",
        name,
        `kl-section--${section.background_style || "surface"}`,
        settings.background_type ? `kl-section--background-${settings.background_type}` : null,
        settings.background_text && settings.background_text !== "default" ? `kl-section--text-${settings.background_text}` : null,
    ].filter(Boolean).join(" ");
};
const sectionStyle = (section) => {
    const settings = section.settings || {};
    if (settings.background_type === "color" && isHexColor(settings.background_color)) {
        return { backgroundColor: settings.background_color };
    }
    if (settings.background_type === "gradient") {
        const from = isHexColor(settings.gradient_from) ? settings.gradient_from : "#f8fafc";
        const to = isHexColor(settings.gradient_to) ? settings.gradient_to : "#ecfeff";
        const direction = /^(45|90|135|180)deg$/.test(String(settings.gradient_direction || "")) ? settings.gradient_direction : "135deg";
        return { backgroundImage: `linear-gradient(${direction}, ${from}, ${to})` };
    }
    if (settings.background_type === "image" && isSafeHref(settings.background_image_url)) {
        const overlay = Math.min(Math.max(Number(settings.background_overlay ?? 42), 0), 85) / 100;
        const size = ["cover", "contain", "auto"].includes(settings.background_size) ? settings.background_size : "cover";
        const imageUrl = String(settings.background_image_url).replace(/"/g, "%22");
        return {
            backgroundImage: `linear-gradient(rgba(15, 23, 42, ${overlay}), rgba(15, 23, 42, ${overlay})), url("${imageUrl}")`,
            backgroundPosition: "center",
            backgroundRepeat: "no-repeat",
            backgroundSize: size,
        };
    }
    return undefined;
};

function HeroSection({ section }) {
    if (!section.title) return null;
    const image = mediaFor(section);
    const layout = ["centered", "reverse", "split"].includes(section.settings?.layout) ? section.settings.layout : section.alignment === "center" ? "centered" : section.settings?.image_position === "left" ? "reverse" : "split";
    const trustPoints = section.settings?.trust_points || section.items || [];
    return <section className={sectionClass(section, `kl-hero kl-hero--${layout}`)} style={sectionStyle(section)}>
        <WebsiteContainer className="kl-hero-grid">
            <div className="kl-hero-copy">
                {section.eyebrow && <p className="kl-eyebrow">{section.eyebrow}</p>}
                <h1>{section.title}</h1>
                {(section.subtitle || section.content) && <p className="kl-lead">{section.subtitle || section.content}</p>}
                <SectionActions section={section} />
                {trustPoints.length > 0 && <ul className="kl-trust-list">{trustPoints.slice(0, 4).map((item, index) => <li key={item.id || index}><CheckIcon />{item.title || item.label || item.content}</li>)}</ul>}
            </div>
            {image && <div className="kl-hero-media"><WebsiteImage className="kl-product-image" src={image} alt={section.image_alt || section.media?.alt_text || section.title} width={section.media?.width} height={section.media?.height} loading="eager" fetchPriority="high" fit="contain" caption={section.settings?.caption} /></div>}
        </WebsiteContainer>
    </section>;
}

function FeatureSection({ section, items = [] }) {
    if (!section.title && !items.length) return null;
    const style = ["list", "image", "grid"].includes(section.settings?.layout) ? section.settings.layout : "grid";
    const image = mediaFor(section);
    return <section className={sectionClass(section, `kl-features kl-features--${style}`)} style={sectionStyle(section)}>
        <WebsiteContainer>
            <SectionHeader eyebrow={section.eyebrow} title={section.title} description={section.subtitle || section.content} alignment={section.alignment || "start"} />
            <div className="kl-feature-layout">
                {image && <WebsiteImage className="kl-product-image" src={image} alt={section.image_alt || section.media?.alt_text || section.title} width={section.media?.width} height={section.media?.height} fit="contain" />}
                <div className="kl-feature-grid">{items.map((item, index) => {
                    const itemImage = mediaFor(item);
                    return <article key={item.id || index}>
                        {itemImage ? <WebsiteImage className="kl-card-image" src={itemImage} alt={item.image_alt || item.media?.alt_text || item.title} width={item.media?.width} height={item.media?.height} fit={item.data?.image_fit || "cover"} /> : item.icon || item.data?.icon ? <FeatureIcon name={item.icon || item.data?.icon} /> : null}
                        {item.title && <h3>{item.title}</h3>}
                        {(item.content || item.description) && <p>{item.content || item.description}</p>}
                        {(item.url || item.data?.url) && <WebsiteLink className="kl-text-link" href={item.url || item.data.url}>{item.cta_label || item.data?.cta_label || "Learn more"}<ArrowIcon /></WebsiteLink>}
                    </article>;
                })}</div>
            </div>
            <SectionActions section={section} />
        </WebsiteContainer>
    </section>;
}

function ProductSection({ section }) {
    const items = section.items || [];
    const image = mediaFor(section);
    if (!section.title && !section.content && !image) return null;
    const reverse = section.settings?.image_position === "left" || section.alignment === "right";
    return <section className={sectionClass(section, `kl-product${reverse ? " kl-product--reverse" : ""}`)} style={sectionStyle(section)}>
        <WebsiteContainer className="kl-product-grid">
            <div className="kl-product-copy">
                <SectionHeader eyebrow={section.eyebrow} title={section.title} description={section.subtitle || section.content} />
                {items.length > 0 && <ul className="kl-check-list">{items.slice(0, 6).map((item, index) => <li key={item.id || index}><CheckIcon /><span>{item.title && <strong>{item.title}</strong>}{item.content && <small>{item.content}</small>}</span></li>)}</ul>}
                <SectionActions section={section} />
            </div>
            {image && <div className="kl-product-media"><WebsiteImage className="kl-product-image" src={image} alt={section.image_alt || section.media?.alt_text || section.title} width={section.media?.width} height={section.media?.height} fit="contain" caption={section.settings?.caption} /></div>}
        </WebsiteContainer>
    </section>;
}

function ScreenshotSection({ section }) {
    const images = section.items?.filter((item) => mediaFor(item)) || [];
    const mainImage = mediaFor(section);
    if (!mainImage && !images.length) return null;
    return <section className={sectionClass(section, "kl-screenshots")} style={sectionStyle(section)}><WebsiteContainer>
        <SectionHeader eyebrow={section.eyebrow} title={section.title} description={section.subtitle || section.content} alignment={section.alignment || "center"} />
        <div className={`kl-screenshot-grid${images.length > 1 ? " kl-screenshot-grid--two" : ""}`}>
            {mainImage && <WebsiteImage className="kl-product-image" src={mainImage} alt={section.image_alt || section.media?.alt_text || section.title} width={section.media?.width} height={section.media?.height} fit="contain" caption={section.settings?.caption} />}
            {images.slice(0, 2).map((item, index) => <WebsiteImage key={item.id || index} className="kl-product-image" src={mediaFor(item)} alt={item.image_alt || item.media?.alt_text || item.title} width={item.media?.width} height={item.media?.height} fit="contain" caption={item.content} />)}
        </div>
        <SectionActions section={section} />
    </WebsiteContainer></section>;
}

function LogoSection({ section, items }) {
    const visible = items.filter((item) => mediaFor(item));
    if (!visible.length) return null;
    return <section className={sectionClass(section, "kl-logo-section")} style={sectionStyle(section)}><WebsiteContainer><SectionHeader title={section.title} description={section.subtitle} alignment="center" />
        <div className="kl-logo-grid">{visible.map((item, index) => <WebsiteImage key={item.id || index} src={mediaFor(item)} alt={item.image_alt || item.media?.alt_text || item.title || ""} width={item.media?.width} height={item.media?.height} fit="contain" decorative={!item.title && !item.image_alt && !item.media?.alt_text} />)}</div>
    </WebsiteContainer></section>;
}

function StatisticsSection({ section, items }) {
    const visible = items.filter((item) => item.data?.value || item.value || item.title);
    if (!visible.length) return null;
    return <section className={sectionClass(section, "kl-statistics")} style={sectionStyle(section)}><WebsiteContainer><SectionHeader eyebrow={section.eyebrow} title={section.title} description={section.subtitle} />
        <div className="kl-stat-grid">{visible.map((item, index) => <article key={item.id || index}><strong>{item.data?.value || item.value || item.title}</strong><span>{item.data?.label || item.content}</span>{item.data?.note && <small>{item.data.note}</small>}</article>)}</div>
    </WebsiteContainer></section>;
}

function TestimonialSection({ section, items }) {
    const visible = items.filter((item) => item.content);
    if (!visible.length) return null;
    return <section className={sectionClass(section, "kl-testimonials")} style={sectionStyle(section)}><WebsiteContainer><SectionHeader eyebrow={section.eyebrow} title={section.title} description={section.subtitle} />
        <div className={`kl-testimonial-grid kl-testimonial-grid--${Math.min(visible.length, 3)}`}>{visible.slice(0, 6).map((item, index) => <figure key={item.id || index}>
            <blockquote>“{item.content}”</blockquote>
            <figcaption>{mediaFor(item) && <WebsiteImage src={mediaFor(item)} alt="" width={48} height={48} fit="cover" decorative />}<span><strong>{item.data?.attribution || item.title}</strong>{(item.data?.role || item.data?.company) && <small>{[item.data?.role, item.data?.company].filter(Boolean).join(" · ")}</small>}</span></figcaption>
        </figure>)}</div>
    </WebsiteContainer></section>;
}

function PricingSection({ section, plans }) {
    const visible = (plans || []).filter((plan) => plan.is_active !== false);
    if (!visible.length) return null;
    return <section className={sectionClass(section, "kl-pricing")} style={sectionStyle(section)}><WebsiteContainer><SectionHeader eyebrow={section.eyebrow} title={section.title || "Pricing"} description={section.subtitle || section.content} alignment={section.alignment || "center"} />
        <div className="kl-price-grid">{visible.map((plan) => {
            const monthly = plan.price_monthly ?? plan.price;
            return <article className={plan.is_featured ? "is-recommended" : ""} key={plan.id || plan.name}>
                {plan.is_featured && <span className="kl-plan-label">Recommended</span>}
                <h3>{plan.name}</h3>{plan.description && <p>{plan.description}</p>}
                {monthly !== null && monthly !== undefined && <div className="kl-price"><span>{plan.currency}</span><strong>{Number(monthly).toLocaleString()}</strong><small>/ month</small></div>}
                <WebsiteButton href={plan.cta_url || section.button_url || "/contact"} variant={plan.is_featured ? "primary" : "secondary"}>{plan.cta_label || `Choose ${plan.name}`}</WebsiteButton>
                {(plan.features || []).filter((feature) => feature.is_visible_on_pricing_page !== false).length > 0 && <ul>{plan.features.filter((feature) => feature.is_visible_on_pricing_page !== false).map((feature) => <li key={feature.id || feature.feature_name}><CheckIcon />{feature.feature_name || feature.name}</li>)}</ul>}
            </article>;
        })}</div>
    </WebsiteContainer></section>;
}

function FaqSection({ section, items }) {
    const [openItems, setOpenItems] = useState(() => new Set([0]));
    const visible = items.filter((item) => item.title && item.content);
    if (!visible.length) return null;
    const toggle = (index) => setOpenItems((current) => { const next = new Set(current); next.has(index) ? next.delete(index) : next.add(index); return next; });
    return <section className={sectionClass(section, "kl-faq")} style={sectionStyle(section)}><WebsiteContainer className="kl-faq-layout"><SectionHeader eyebrow={section.eyebrow} title={section.title} description={section.subtitle} />
        <div className="kl-accordion">{visible.map((item, index) => { const open = openItems.has(index); const id = `faq-${section.id || "section"}-${index}`; return <article key={item.id || index}>
            <h3><button type="button" aria-expanded={open} aria-controls={id} onClick={() => toggle(index)}><span>{item.title}</span><span aria-hidden="true">{open ? "−" : "+"}</span></button></h3>
            <div id={id} className="kl-accordion-panel" hidden={!open}><p>{item.content}</p></div>
        </article>; })}</div>
    </WebsiteContainer></section>;
}

function CtaSection({ section }) {
    if (!section.title) return null;
    return <section className={sectionClass(section, "kl-cta")} style={sectionStyle(section)}><WebsiteContainer><div><p className="kl-eyebrow">{section.eyebrow}</p><h2>{section.title}</h2>{(section.subtitle || section.content) && <p>{section.subtitle || section.content}</p>}</div><SectionActions section={section} /></WebsiteContainer></section>;
}

function SecuritySection({ section }) {
    return <ProductSection section={{ ...section, background_style: section.background_style || "subtle" }} />;
}

const registry = {
    hero: HeroSection,
    features: FeatureSection,
    feature: FeatureSection,
    solutions: FeatureSection,
    integrations: FeatureSection,
    integration: FeatureSection,
    use_cases: FeatureSection,
    product: ProductSection,
    content: ProductSection,
    security: SecuritySection,
    screenshot: ScreenshotSection,
    screenshots: ScreenshotSection,
    logos: LogoSection,
    statistics: StatisticsSection,
    steps: FeatureSection,
    testimonials: TestimonialSection,
    pricing: PricingSection,
    faq: FaqSection,
    cta: CtaSection,
    newsletter: CtaSection,
    footer: ProductSection,
};

const fallbackKeys = { features: "feature", feature: "feature", solutions: "solution", integrations: "integration", integration: "integration", logos: "logo", statistics: "metric", testimonials: "testimonial", faq: "faq" };

class SectionBoundary extends React.Component {
    constructor(props) { super(props); this.state = { failed: false }; }
    static getDerivedStateFromError() { return { failed: true }; }
    render() { return this.state.failed ? null : this.props.children; }
}

export function WebsiteSectionRenderer({ sections = [], content = {}, plans = [], faqs = [], testimonials = [] }) {
    return sections.filter((section) => section && section.is_active !== false).map((section, index) => {
        const type = section.section_type;
        const Component = registry[type];
        if (!Component) return null;
        let fallback = content[fallbackKeys[type]] || [];
        if (type === "faq" && !fallback.length) fallback = faqs;
        if (type === "testimonials" && !fallback.length) fallback = testimonials;
        return <SectionBoundary key={section.id || `${type}-${index}`}><Component section={section} items={itemsFor(section, fallback)} plans={plans} /></SectionBoundary>;
    });
}

export { PricingSection };
