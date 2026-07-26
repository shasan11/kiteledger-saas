import { Head, Link, useForm } from "@inertiajs/react";
import { useEffect, useState } from "react";
import PublicSeo from "./PublicSeo";

const Arrow = () => (
    <svg viewBox="0 0 20 20" aria-hidden="true">
        <path d="M4 10h11m-4-4 4 4-4 4" />
    </svg>
);
const Tick = () => (
    <svg viewBox="0 0 20 20" aria-hidden="true">
        <path d="m4 10 4 4 8-9" />
    </svg>
);
const Icon = ({ name = "spark" }) => {
    const paths = {
        chart: "M4 16V9m6 7V4m6 12v-6",
        box: "M3 6.5 10 3l7 3.5v7L10 17l-7-3.5zM3 6.5l7 3.5m7-3.5L10 10m0 7v-7",
        people: "M7 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm6 1a2.5 2.5 0 1 0 0-5M2 17c.5-4 2-6 5-6s4.5 2 5 6m1-6c2.8 0 4.3 2 4.7 5",
        shield: "M10 2 17 5v5c0 4-2.6 6.7-7 8-4.4-1.3-7-4-7-8V5zM7 10l2 2 4-5",
        spark: "m10 2 1.5 4.5L16 8l-4.5 1.5L10 14l-1.5-4.5L4 8l4.5-1.5z",
    };
    return (
        <span className="kl-icon">
            <svg viewBox="0 0 20 20" aria-hidden="true">
                <path d={paths[name] || paths.spark} />
            </svg>
        </span>
    );
};

export default function Page({
    page,
    plans = [],
    menus = {},
    faqs = [],
    testimonials = [],
    announcements = [],
    content = {},
    site = {},
    isPreview = false,
}) {
    const brand = site["general.platform_name"] || "KiteLedger";
    return (
        <div
            className="kl-site"
            style={{
                "--kl-primary": site["branding.primary_color"] || "#176b5b",
                "--kl-ink": site["branding.secondary_color"] || "#10211d",
            }}
        >
            <PublicSeo record={page} site={site} isPreview={isPreview} />
            <Head>
                <meta
                    name="theme-color"
                    content={site["branding.primary_color"] || "#176b5b"}
                />
            </Head>
            {isPreview && (
                <div className="kl-preview">
                    Previewing {page.status} content. This private URL is
                    visible only to authorized administrators.
                </div>
            )}
            <Announcement item={announcements[0]} />
            <PublicHeader menus={menus} site={site} />
            <main>
                {page?.page_type !== "home" && (
                    <article className="kl-article">
                        <p className="kl-eyebrow">{page.page_type}</p>
                        <h1>{page.title}</h1>
                        {page.excerpt && (
                            <p className="kl-lead">{page.excerpt}</p>
                        )}
                        {page.body && (
                            <div
                                className="kl-prose"
                                dangerouslySetInnerHTML={{ __html: page.body }}
                            />
                        )}
                        {page.page_type === "contact" && <ContactForm />}
                    </article>
                )}
                {page?.sections?.map((section) => (
                    <Section
                        key={section.id}
                        section={section}
                        plans={plans}
                        content={content}
                        faqs={faqs}
                        testimonials={testimonials}
                    />
                ))}
                {page?.page_type === "pricing" &&
                    !page.sections?.some(
                        (s) => s.section_type === "pricing",
                    ) && <Pricing plans={plans} />}
            </main>
            <PublicFooter menus={menus} site={site} brand={brand} />
        </div>
    );
}

function ContactForm() {
    const {
        data,
        setData,
        post,
        processing,
        recentlySuccessful,
        errors,
        reset,
    } = useForm({
        type: "contact",
        name: "",
        email: "",
        company: "",
        company_size: "",
        message: "",
        privacy_consent: false,
        source: "contact-page",
        website: "",
    });
    const submit = (event) => {
        event.preventDefault();
        post(route("central.website-leads.store"), {
            preserveScroll: true,
            onSuccess: () => reset("message"),
        });
    };
    return (
        <form className="kl-contact-form" onSubmit={submit}>
            {recentlySuccessful && (
                <div className="kl-form-success" role="status">
                    Thanks — your message is safely with our team.
                </div>
            )}
            <div className="kl-form-grid">
                <label>
                    Full name
                    <input
                        value={data.name}
                        onChange={(e) => setData("name", e.target.value)}
                        required
                    />
                    <small>{errors.name}</small>
                </label>
                <label>
                    Work email
                    <input
                        type="email"
                        value={data.email}
                        onChange={(e) => setData("email", e.target.value)}
                        required
                    />
                    <small>{errors.email}</small>
                </label>
                <label>
                    Company
                    <input
                        value={data.company}
                        onChange={(e) => setData("company", e.target.value)}
                    />
                </label>
                <label>
                    Team size
                    <select
                        value={data.company_size}
                        onChange={(e) =>
                            setData("company_size", e.target.value)
                        }
                    >
                        <option value="">Select</option>
                        <option>1–10</option>
                        <option>11–50</option>
                        <option>51–200</option>
                        <option>201+</option>
                    </select>
                </label>
            </div>
            <label>
                How can we help?
                <textarea
                    rows="5"
                    value={data.message}
                    onChange={(e) => setData("message", e.target.value)}
                    placeholder="Tell us about your current tools, team, and goals."
                />
                <small>{errors.message}</small>
            </label>
            <input
                className="kl-honeypot"
                tabIndex="-1"
                autoComplete="off"
                value={data.website}
                onChange={(e) => setData("website", e.target.value)}
            />
            <label className="kl-consent">
                <input
                    type="checkbox"
                    checked={data.privacy_consent}
                    onChange={(e) =>
                        setData("privacy_consent", e.target.checked)
                    }
                    required
                />{" "}
                I agree that KiteLedger may use these details to respond to my
                request.
            </label>
            <button className="kl-button" disabled={processing}>
                {processing ? "Sending…" : "Send message"} <Arrow />
            </button>
        </form>
    );
}

function Announcement({ item }) {
    const [hidden, setHidden] = useState(false);
    useEffect(() => {
        if (item)
            setHidden(
                localStorage.getItem(`kl-announcement-${item.id}`) === "1",
            );
    }, [item?.id]);
    if (!item || hidden) return null;
    const data = item.data || {};
    const dismiss = () => {
        localStorage.setItem(`kl-announcement-${item.id}`, "1");
        setHidden(true);
    };
    return (
        <div
            className={`kl-announcement kl-announcement--${data.style || "green"}`}
        >
            <span>{item.content}</span>
            {data.url && (
                <a
                    href={data.url}
                    target={data.new_tab ? "_blank" : undefined}
                    rel={data.new_tab ? "noreferrer" : undefined}
                >
                    {data.link_label || "Learn more"} <Arrow />
                </a>
            )}
            {data.dismissible !== false && (
                <button onClick={dismiss} aria-label="Dismiss announcement">
                    ×
                </button>
            )}
        </div>
    );
}

function hrefFor(item) {
    return item.page
        ? item.page.slug === "home"
            ? "/"
            : `/${item.page.slug}`
        : item.url || "#";
}
function MenuLink({ item }) {
    return (
        <a
            href={hrefFor(item)}
            target={item.target === "new_tab" ? "_blank" : undefined}
            rel={item.target === "new_tab" ? "noopener noreferrer" : undefined}
        >
            {item.label}
        </a>
    );
}
export function PublicHeader({ menus = {}, site = {} }) {
    const [open, setOpen] = useState(false);
    const logo = site["branding.light_logo"] || site["branding.logo"];
    const name = site["general.platform_name"] || "KiteLedger";
    return (
        <header className="kl-header">
            <div className="kl-container kl-nav">
                <Link
                    href={route("central.home")}
                    className="kl-brand"
                    aria-label={`${name} home`}
                >
                    {logo ? (
                        <img
                            src={logo}
                            alt={site["branding.logo_alt_text"] || name}
                        />
                    ) : (
                        <>
                            <span className="kl-brandmark">K</span>
                            <span>{name}</span>
                        </>
                    )}
                </Link>
                <button
                    className="kl-menu-button"
                    onClick={() => setOpen(!open)}
                    aria-expanded={open}
                    aria-label="Toggle navigation"
                >
                    <span />
                    <span />
                    <span />
                </button>
                <nav
                    className={open ? "kl-menu is-open" : "kl-menu"}
                    aria-label="Main navigation"
                >
                    {(menus.header || []).map((item) => (
                        <div className="kl-menu-item" key={item.id}>
                            <MenuLink item={item} />
                            {item.children?.length > 0 && (
                                <div className="kl-dropdown">
                                    {item.children.map((child) => (
                                        <MenuLink key={child.id} item={child} />
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}
                    <Link className="kl-signin" href={route("central.login")}>
                        Sign in
                    </Link>
                    <a
                        className="kl-button kl-button--small"
                        href={site["branding.primary_cta_url"] || "/pricing"}
                    >
                        {site["branding.primary_cta_label"] || "Start free"}{" "}
                        <Arrow />
                    </a>
                </nav>
            </div>
        </header>
    );
}

function Section({ section, plans, content, faqs, testimonials }) {
    const type = section.section_type;
    if (type === "hero") return <Hero section={section} />;
    if (type === "pricing") return <Pricing section={section} plans={plans} />;
    if (type === "faq")
        return (
            <Faq
                section={section}
                items={section.items?.length ? section.items : faqs}
            />
        );
    if (type === "testimonials")
        return (
            <Testimonials
                section={section}
                items={section.items?.length ? section.items : testimonials}
            />
        );
    if (type === "logos")
        return (
            <LogoCloud
                section={section}
                items={
                    section.items?.length ? section.items : content.logo || []
                }
            />
        );
    if (type === "statistics")
        return (
            <Metrics
                section={section}
                items={
                    section.items?.length ? section.items : content.metric || []
                }
            />
        );
    if (type === "cta") return <Cta section={section} />;
    if (["product", "security", "content"].includes(type))
        return <Product section={section} />;
    const fallback =
        type === "solutions"
            ? content.solution
            : type === "integrations"
              ? content.integration
              : type === "features"
                ? content.feature
                : [];
    return (
        <Grid
            section={section}
            items={section.items?.length ? section.items : fallback || []}
        />
    );
}

function Intro({ section }) {
    return (
        <div className={`kl-intro kl-intro--${section.alignment || "left"}`}>
            {section.eyebrow && <p className="kl-eyebrow">{section.eyebrow}</p>}
            <h2>{section.title}</h2>
            {section.subtitle && <p>{section.subtitle}</p>}
        </div>
    );
}
function Actions({ section }) {
    return (
        <div className="kl-actions">
            {section.button_text && (
                <a className="kl-button" href={section.button_url || "#"}>
                    {section.button_text} <Arrow />
                </a>
            )}
            {section.secondary_button_text && (
                <a
                    className="kl-button kl-button--ghost"
                    href={section.secondary_button_url || "#"}
                >
                    {section.secondary_button_text}
                </a>
            )}
        </div>
    );
}

function Hero({ section }) {
    const image = section.media?.url || section.image || section.settings?.image_url;
    return (
        <section className="kl-hero">
            <div className="kl-hero-glow" />
            <div className="kl-container kl-hero-grid">
                <div className="kl-hero-copy">
                    {section.eyebrow && (
                        <div className="kl-pill">
                            <span /> {section.eyebrow}
                        </div>
                    )}
                    <h1>{section.title}</h1>
                    <p>{section.subtitle || section.content}</p>
                    <Actions section={section} />
                    <div className="kl-trust">
                        <span>
                            <Tick /> No credit card required
                        </span>
                        <span>
                            <Tick /> Guided setup
                        </span>
                        <span>
                            <Tick /> Cancel anytime
                        </span>
                    </div>
                </div>
                {image ? (
                    <img
                        className="kl-hero-screenshot"
                        src={image}
                        alt={section.image_alt || section.media?.alt_text || section.title || "Product dashboard"}
                        width={section.media?.width || undefined}
                        height={section.media?.height || undefined}
                        fetchPriority="high"
                        loading="eager"
                        style={{ width: "100%", height: "auto", objectFit: "contain", borderRadius: 20, boxShadow: "0 28px 70px rgba(16,51,42,.18)" }}
                    />
                ) : <Dashboard />}
            </div>
        </section>
    );
}
function Dashboard() {
    return (
        <div
            className="kl-dashboard-wrap"
            aria-label="KiteLedger dashboard preview"
        >
            <div className="kl-dashboard">
                <aside>
                    <div className="kl-dash-logo">K</div>
                    {[
                        "Overview",
                        "Sales",
                        "Accounting",
                        "Inventory",
                        "People",
                    ].map((x, i) => (
                        <span className={i === 0 ? "active" : ""} key={x}>
                            <i />
                            {x}
                        </span>
                    ))}
                </aside>
                <div className="kl-dash-main">
                    <div className="kl-dash-head">
                        <div>
                            <small>Good morning, Maya</small>
                            <b>Business overview</b>
                        </div>
                        <button>+ New invoice</button>
                    </div>
                    <div className="kl-kpis">
                        <DashKpi
                            label="Revenue"
                            value="$128,450"
                            delta="+12.8%"
                        />
                        <DashKpi
                            label="Outstanding"
                            value="$18,290"
                            delta="8 invoices"
                        />
                        <DashKpi
                            label="Cash balance"
                            value="$84,920"
                            delta="Healthy"
                        />
                    </div>
                    <div className="kl-chart-card">
                        <div>
                            <b>Cash flow</b>
                            <small>Last 6 months</small>
                        </div>
                        <div className="kl-chart">
                            <i />
                            <i />
                            <i />
                            <i />
                            <i />
                            <i />
                            <svg
                                viewBox="0 0 400 100"
                                preserveAspectRatio="none"
                            >
                                <path d="M0 83 C65 66 75 77 130 48 S220 69 270 33 S350 42 400 9" />
                            </svg>
                        </div>
                    </div>
                    <div className="kl-dash-bottom">
                        <div>
                            <b>Recent payments</b>
                            <p>
                                <span>Northstar Studio</span>
                                <strong>$4,800</strong>
                            </p>
                            <p>
                                <span>Atlas Retail</span>
                                <strong>$2,250</strong>
                            </p>
                        </div>
                        <div className="kl-ai">
                            <Icon />
                            <b>Kite AI insight</b>
                            <p>
                                Collections improved 14%. Three invoices need
                                attention.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
            <div className="kl-floating kl-floating--stock">
                <Icon name="box" />
                <span>
                    <small>Inventory alert</small>
                    <b>12 items running low</b>
                </span>
            </div>
            <div className="kl-floating kl-floating--branch">
                <Icon name="chart" />
                <span>
                    <small>Top branch</small>
                    <b>Pokhara · +18.4%</b>
                </span>
            </div>
        </div>
    );
}
function DashKpi({ label, value, delta }) {
    return (
        <div>
            <small>{label}</small>
            <b>{value}</b>
            <em>{delta}</em>
        </div>
    );
}

function LogoCloud({ section, items }) {
    return (
        <section className="kl-logos">
            <div className="kl-container">
                <p>
                    {section.title ||
                        "Trusted by ambitious teams building what comes next"}
                </p>
                <div>
                    {items.map((item, i) => (
                        <span key={item.id || i}>
                            {item.data?.image ? (
                                <img src={item.data.image} alt={item.title} />
                            ) : (
                                item.title
                            )}
                        </span>
                    ))}
                </div>
            </div>
        </section>
    );
}
function Grid({ section, items }) {
    return (
        <section
            className={`kl-section kl-section--${section.background_style || "light"}`}
        >
            <div className="kl-container">
                <Intro section={section} />
                <div className="kl-feature-grid">
                    {items.map((item, i) => (
                        <article className={item.display_style || item.data?.display_style || ""} key={item.id || i}>
                            {(item.media?.url || item.data?.image || item.image) ? (
                                <img
                                    className="kl-feature-screenshot"
                                    src={item.media?.url || item.data?.image || item.image}
                                    alt={item.image_alt || item.media?.alt_text || item.title || ""}
                                    width={item.media?.width || undefined}
                                    height={item.media?.height || undefined}
                                    loading="lazy"
                                    style={{ width: "100%", height: "auto", maxHeight: 220, objectFit: "cover", borderRadius: 12, marginBottom: 22 }}
                                />
                            ) : <Icon name={item.icon || item.data?.icon} />}
                            <h3>{item.title}</h3>
                            <p>{item.content || item.description}</p>
                            {(item.url || item.data?.url) && (
                                <a href={item.url || item.data.url}>
                                    {item.cta_label || item.data?.cta_label || "Explore"} <Arrow />
                                </a>
                            )}
                        </article>
                    ))}
                </div>
                <Actions section={section} />
            </div>
        </section>
    );
}
function Product({ section }) {
    const items = section.items || [];
    return (
        <section
            className={`kl-section kl-product kl-section--${section.background_style || "mist"}`}
        >
            <div className="kl-container kl-product-grid">
                <div>
                    <Intro section={section} />
                    <div className="kl-checks">
                        {items.map((item, i) => (
                            <div key={i}>
                                <Tick />
                                <span>
                                    <b>{item.title}</b>
                                    {item.content && (
                                        <small>{item.content}</small>
                                    )}
                                </span>
                            </div>
                        ))}
                    </div>
                    <Actions section={section} />
                </div>
                <div className="kl-product-visual">
                    {(section.media?.url || section.image || section.settings?.image_url) ? (
                        <img
                            src={section.media?.url || section.image || section.settings?.image_url}
                            alt={section.image_alt || section.media?.alt_text || section.title || ""}
                            width={section.media?.width || undefined}
                            height={section.media?.height || undefined}
                            loading="lazy"
                        />
                    ) : (
                        <MiniProduct />
                    )}
                </div>
            </div>
        </section>
    );
}
function MiniProduct() {
    return (
        <div className="kl-mini-product">
            <div className="kl-mini-top">
                <span />
                <b>Invoice #KL-2048</b>
                <em>Paid</em>
            </div>
            <div className="kl-mini-client">
                <div>
                    <small>BILLED TO</small>
                    <b>Northstar Creative</b>
                </div>
                <strong>$12,480.00</strong>
            </div>
            {[
                "Platform implementation",
                "Team onboarding",
                "Data migration",
            ].map((x, i) => (
                <p key={x}>
                    <span>{x}</span>
                    <b>${[7200, 2880, 2400][i].toLocaleString()}</b>
                </p>
            ))}
            <div className="kl-mini-total">
                <span>Total received</span>
                <b>$12,480.00</b>
            </div>
        </div>
    );
}
function Metrics({ section, items }) {
    return (
        <section className="kl-metrics">
            <div className="kl-container">
                <Intro section={section} />
                <div>
                    {items.map((item, i) => (
                        <article key={item.id || i}>
                            <b>
                                {item.data?.value || item.value || item.title}
                            </b>
                            <span>{item.content || item.data?.label}</span>
                        </article>
                    ))}
                </div>
            </div>
        </section>
    );
}
function Testimonials({ section, items }) {
    return (
        <section className="kl-section kl-testimonials">
            <div className="kl-container">
                <Intro section={section} />
                <div className="kl-testimonial-grid">
                    {items.map((item, i) => (
                        <figure key={item.id || i}>
                            <div className="kl-stars">★★★★★</div>
                            <blockquote>“{item.content}”</blockquote>
                            <figcaption>
                                <span>
                                    {(
                                        item.data?.attribution ||
                                        item.title ||
                                        "K"
                                    ).charAt(0)}
                                </span>
                                <div>
                                    <b>
                                        {item.data?.attribution || item.title}
                                    </b>
                                    <small>
                                        {[item.data?.role, item.data?.company]
                                            .filter(Boolean)
                                            .join(" · ")}
                                    </small>
                                </div>
                            </figcaption>
                        </figure>
                    ))}
                </div>
            </div>
        </section>
    );
}
function Pricing({
    section = {
        title: "Plans that grow with your business",
        subtitle:
            "Start with the tools you need today. Scale without moving your data tomorrow.",
    },
    plans,
}) {
    return (
        <section className="kl-section kl-pricing">
            <div className="kl-container">
                <Intro section={section} />
                <div className="kl-price-grid">
                    {plans.map((plan) => (
                        <article
                            className={plan.is_featured ? "featured" : ""}
                            key={plan.id}
                        >
                            {plan.is_featured && (
                                <span className="kl-popular">Most popular</span>
                            )}
                            <h3>{plan.name}</h3>
                            <p>{plan.description}</p>
                            <div className="kl-price">
                                <small>{plan.currency}</small>
                                {Number(plan.price_monthly).toLocaleString()}
                                <span>/ month</span>
                            </div>
                            <a
                                className={
                                    plan.is_featured
                                        ? "kl-button"
                                        : "kl-button kl-button--ghost"
                                }
                                href="/contact"
                            >
                                Choose {plan.name}
                            </a>
                            <ul>
                                {(plan.features || [])
                                    .filter(
                                        (f) =>
                                            f.is_visible_on_pricing_page !==
                                            false,
                                    )
                                    .slice(0, 7)
                                    .map((f) => (
                                        <li key={f.id}>
                                            <Tick />
                                            {f.feature_name}
                                        </li>
                                    ))}
                            </ul>
                        </article>
                    ))}
                </div>
            </div>
        </section>
    );
}
function Faq({ section, items }) {
    const [active, setActive] = useState(0);
    return (
        <section className="kl-section kl-faq">
            <div className="kl-container kl-faq-grid">
                <Intro section={section} />
                <div>
                    {items.map((item, i) => (
                        <article
                            className={active === i ? "open" : ""}
                            key={item.id || i}
                        >
                            <button
                                onClick={() => setActive(active === i ? -1 : i)}
                            >
                                <span>{item.title}</span>
                                <b>{active === i ? "−" : "+"}</b>
                            </button>
                            {active === i && <p>{item.content}</p>}
                        </article>
                    ))}
                </div>
            </div>
        </section>
    );
}
function Cta({ section }) {
    return (
        <section className="kl-cta">
            <div className="kl-container">
                <div>
                    <p className="kl-eyebrow">
                        {section.eyebrow || "Ready when you are"}
                    </p>
                    <h2>{section.title}</h2>
                    <p>{section.subtitle || section.content}</p>
                </div>
                <Actions section={section} />
            </div>
        </section>
    );
}

export function PublicFooter({ menus = {}, site = {}, brand }) {
    const groups = ["product", "resources", "footer", "legal"];
    return (
        <footer className="kl-footer">
            <div className="kl-container">
                <div className="kl-footer-main">
                    <div className="kl-footer-brand">
                        <div className="kl-brand">
                            <span className="kl-brandmark">K</span>
                            <span>{brand}</span>
                        </div>
                        <p>
                            {site["branding.footer_text"] ||
                                "One intelligent workspace for finance, operations, customers, inventory, and people."}
                        </p>
                    </div>
                    {groups.map((group) => (
                        <nav key={group} aria-label={`${group} links`}>
                            <b>{group === "footer" ? "Company" : group}</b>
                            {(menus[group] || []).map((item) => (
                                <MenuLink key={item.id} item={item} />
                            ))}
                        </nav>
                    ))}
                </div>
                <div className="kl-footer-bottom">
                    <span>
                        © {new Date().getFullYear()} {brand}. All rights
                        reserved.
                    </span>
                    <span>Secure by design · Built for growing teams</span>
                </div>
            </div>
        </footer>
    );
}
