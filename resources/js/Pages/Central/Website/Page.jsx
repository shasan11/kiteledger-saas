import { Head, useForm } from '@inertiajs/react';
import { useEffect, useRef } from 'react';
import PublicSeo from './PublicSeo';
import WebsiteLayout from './components/WebsiteLayout';
import WebsiteFooter from './components/WebsiteFooter';
import WebsiteHeader from './components/WebsiteHeader';
import { PageHeader, WebsiteButton, WebsiteContainer, WebsiteImage, WebsiteLink } from './components/WebsitePrimitives';
import { PricingSection, WebsiteSectionRenderer } from './sections/WebsiteSections';

function FieldError({ id, message }) { return message ? <small id={id} className="kl-field-error" role="alert">{message}</small> : null; }
function ContactForm({ platformName }) {
    const successRef=useRef(null); const {data,setData,post,processing,recentlySuccessful,errors,reset}=useForm({type:'contact',name:'',email:'',company:'',company_size:'',message:'',privacy_consent:false,source:'contact-page',website:''});
    const submit=e=>{e.preventDefault();if(!processing)post(route('central.website-leads.store'),{preserveScroll:true,onSuccess:()=>reset()});};
    useEffect(()=>{if(recentlySuccessful)successRef.current?.focus();},[recentlySuccessful]);
    const errorProps=name=>({'aria-invalid':Boolean(errors[name]),'aria-describedby':errors[name]?`contact-${name}-error`:undefined});
    return <form className="kl-contact-form" onSubmit={submit} noValidate>{recentlySuccessful&&<div ref={successRef} tabIndex="-1" className="kl-form-success" role="status"><strong>Message sent successfully.</strong><span> Thank you—your message is safely with {platformName}.</span></div>}<div className="kl-form-grid">
        <div className="kl-field"><label htmlFor="contact-name">Full name *</label><input id="contact-name" autoComplete="name" value={data.name} onChange={e=>setData('name',e.target.value)} required {...errorProps('name')}/><FieldError id="contact-name-error" message={errors.name}/></div>
        <div className="kl-field"><label htmlFor="contact-email">Work email *</label><input id="contact-email" type="email" autoComplete="email" value={data.email} onChange={e=>setData('email',e.target.value)} required {...errorProps('email')}/><FieldError id="contact-email-error" message={errors.email}/></div>
        <div className="kl-field"><label htmlFor="contact-company">Company</label><input id="contact-company" autoComplete="organization" value={data.company} onChange={e=>setData('company',e.target.value)} {...errorProps('company')}/></div>
        <div className="kl-field"><label htmlFor="contact-size">Team size</label><select id="contact-size" value={data.company_size} onChange={e=>setData('company_size',e.target.value)}><option value="">Select a range</option><option value="1-10">1–10</option><option value="11-50">11–50</option><option value="51-200">51–200</option><option value="201+">201+</option></select></div>
    </div><div className="kl-field"><label htmlFor="contact-message">How can we help? *</label><textarea id="contact-message" rows="5" value={data.message} onChange={e=>setData('message',e.target.value)} required {...errorProps('message')}/><FieldError id="contact-message-error" message={errors.message}/></div><div className="kl-honeypot" aria-hidden="true"><input tabIndex="-1" autoComplete="off" value={data.website} onChange={e=>setData('website',e.target.value)}/></div><label className="kl-consent"><input type="checkbox" checked={data.privacy_consent} onChange={e=>setData('privacy_consent',e.target.checked)} required/> I agree that {platformName} may use these details to respond.</label><FieldError id="contact-privacy_consent-error" message={errors.privacy_consent}/><button className="kl-button kl-button--primary" type="submit" disabled={processing}>{processing?'Sending…':'Send message'}</button></form>;
}
function ContactLocations({locations=[],site={}}){
    const fallback=[{id:'primary-contact',name:'Talk to our team',address:site['contact.address']||'Share your question and we will route it to the right team.',email:site['contact.email'],phone:site['contact.phone'],business_hours:site['contact.business_hours']}].filter(location=>location.address||location.email||location.phone||location.business_hours);
    const cards=locations.length?locations:fallback;
    return <aside className="kl-contact-sidebar" aria-label="Contact details"><div className="kl-contact-sidebar__intro"><span>Contact details</span><h2>Reach the right team faster</h2><p>Use the form for new enquiries, or pick the most relevant contact card for direct details.</p></div><div className="kl-contact-layout">{cards.map(location=><article key={location.id}><h3>{location.name}</h3>{location.address&&<address>{location.address}</address>}{location.email&&<a href={`mailto:${location.email}`}>{location.email}</a>}{location.phone&&<a href={`tel:${location.phone}`}>{location.phone}</a>}{location.business_hours&&<p>{location.business_hours}</p>}{location.map_embed_url&&<iframe title={`${location.name} map`} src={location.map_embed_url} loading="lazy" referrerPolicy="no-referrer-when-downgrade"/>}</article>)}</div></aside>;
}
const FEATURE_GROUPS = [
    {
        id: 'finance',
        eyebrow: 'Core money workflows',
        title: 'Finance & reporting',
        description: 'See the numbers, send invoices, collect payments, and keep every balance connected.',
        matches: title => /financial|reports|invoicing|online payment|customer payments/.test(title),
    },
    {
        id: 'automation',
        eyebrow: 'Less manual work',
        title: 'Documents & controls',
        description: 'Turn incoming documents into reviewed transactions while business rules stay in force.',
        matches: title => /document|approval/.test(title),
    },
    {
        id: 'operations',
        eyebrow: 'Everyday execution',
        title: 'Sales & operations',
        description: 'Keep tills, receipts, returns, shifts, and stock-aware selling in one dependable flow.',
        matches: title => /point of sale|receipts and returns|cashier/.test(title),
    },
    {
        id: 'customers',
        eyebrow: 'Work that stays connected',
        title: 'Customers, projects & people',
        description: 'Carry context from the first enquiry through delivery, follow-up, and team operations.',
        matches: title => /lead capture|deals|project|hr and leave/.test(title),
    },
];

function WebsiteFeatures({features=[]}){
    if(!features.length) return null;
    const groupedIds = new Set();
    const groups = FEATURE_GROUPS.map(group => {
        const entries = features.filter(feature => group.matches(String(feature.title || '').toLowerCase()));
        entries.forEach(feature => groupedIds.add(feature.id));
        return {...group, features: entries};
    }).filter(group => group.features.length);
    const remaining = features.filter(feature => !groupedIds.has(feature.id));
    if(remaining.length) groups.push({id:'more',eyebrow:'One connected platform',title:'More ways to work',description:'Additional capabilities that keep daily work and business data together.',features:remaining});

    return <section className="kl-features-page">
        <WebsiteContainer>
            <nav className="kl-feature-index" aria-label="Feature categories">
                <span className="kl-feature-index__label">Explore by workflow</span>
                <div>{groups.map((group,index)=><WebsiteLink key={group.id} href={`#feature-${group.id}`}>
                    <span>{String(index+1).padStart(2,'0')}</span>{group.title}<small>{group.features.length}</small>
                </WebsiteLink>)}</div>
            </nav>

            <div className="kl-feature-cms">{groups.map((group,groupIndex)=>{
                const [lead,...supporting]=group.features;
                return <section className="kl-feature-group" id={`feature-${group.id}`} key={group.id} aria-labelledby={`feature-${group.id}-title`}>
                    <header className="kl-feature-group__header">
                        <div><p className="kl-eyebrow">{String(groupIndex+1).padStart(2,'0')} · {group.eyebrow}</p><h2 id={`feature-${group.id}-title`}>{group.title}</h2></div>
                        <p>{group.description}</p>
                    </header>

                    <article className={`kl-feature-lead${groupIndex%2 ? ' kl-feature-lead--reverse' : ''}`}>
                        {lead.featured_media&&<div className="kl-feature-lead__media"><WebsiteImage src={lead.featured_media.url} alt={lead.featured_media.alt_text||lead.title} width={lead.featured_media.width} height={lead.featured_media.height} fit="contain" position="top"/></div>}
                        <div className="kl-feature-lead__body"><span>Featured workspace</span><h3>{lead.title}</h3><p>{lead.excerpt}</p><small>{String(groupIndex+1).padStart(2,'0')} / {String(groups.length).padStart(2,'0')}</small></div>
                    </article>

                    {supporting.length>0&&<div className="kl-feature-supporting">{supporting.map((feature,index)=><article key={feature.id} className="kl-feature-card">
                        {feature.featured_media&&<div className="kl-feature-card__media"><WebsiteImage src={feature.featured_media.url} alt={feature.featured_media.alt_text||feature.title} width={feature.featured_media.width} height={feature.featured_media.height} fit="contain" position="top"/></div>}
                        <div className="kl-feature-card__body"><span>{String(index+2).padStart(2,'0')}</span><h3>{feature.title}</h3><p>{feature.excerpt}</p></div>
                    </article>)}</div>}
                </section>;
            })}</div>

            <aside className="kl-feature-cta"><div><p className="kl-eyebrow">One source of truth</p><h2>Ready to connect the way your whole business works?</h2><p>Start with the workflows you need today and add more without rebuilding your data.</p></div><div><WebsiteButton href="/pricing">Start free</WebsiteButton><WebsiteButton href="/contact" variant="secondary">Talk to our team</WebsiteButton></div></aside>
        </WebsiteContainer>
    </section>;
}

export default function Page({page,plans=[],menus={},faqs=[],testimonials=[],announcements=[],navbarNotifications=[],websitePopup,socialLinks=[],content={},site={},locations=[],websiteFeatures=[],isPreview=false}){
    const brand=site['general.platform_name']||'KiteLedger'; const isHome=page?.page_type==='home'; const sections=(page?.sections||[]).filter(section=>isHome||section.section_type!=='hero'); const hasHomeHero=isHome&&sections.some(section=>section.section_type==='hero'&&section.title); const hasPricing=sections.some(section=>section.section_type==='pricing');
    return <WebsiteLayout menus={menus} site={site} announcements={announcements} navbarNotifications={navbarNotifications} websitePopup={websitePopup} socialLinks={socialLinks} previewMessage={isPreview?`Previewing ${page.status} content. This private URL is visible only to authorized administrators.`:null}><PublicSeo record={page} site={site} isPreview={isPreview} pageType={page?.page_type}/><Head><meta name="theme-color" content={site['branding.primary_color']||'#176b5b'}/></Head>{!isHome&&<PageHeader eyebrow={page?.page_type?.replaceAll('_',' ')} title={page?.title} description={page?.excerpt} image={page?.featured_media} imageAlt={page?.featured_image_alt} breadcrumbs={[{label:'Home',href:'/'},{label:page?.title}]} compact={['privacy','terms','cookies','legal'].includes(page?.page_type)} className={page?.page_type==='features'?'kl-page-header--features':''}/>} {isHome&&!hasHomeHero&&<PageHeader title={page?.title||brand} description={page?.excerpt}/>} {!isHome&&page?.body&&<WebsiteContainer as="article" className={`kl-prose-wrap${['privacy','terms','cookies','legal'].includes(page?.page_type)?' kl-prose-wrap--legal':''}`}><div className="kl-prose" dangerouslySetInnerHTML={{__html:page.body}}/></WebsiteContainer>} {page?.page_type==='contact'&&<WebsiteContainer><div className="kl-contact-shell"><ContactForm platformName={brand}/><ContactLocations locations={locations} site={site}/></div></WebsiteContainer>} {page?.page_type==='features'&&<WebsiteFeatures features={websiteFeatures}/>}<WebsiteSectionRenderer sections={sections} plans={plans} content={content} faqs={faqs} testimonials={testimonials}/>{page?.page_type==='pricing'&&!hasPricing&&<PricingSection section={{title:page.title,subtitle:page.excerpt}} plans={plans}/>}</WebsiteLayout>;
}
export {WebsiteHeader as PublicHeader,WebsiteFooter as PublicFooter};
