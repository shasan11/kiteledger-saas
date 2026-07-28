import { Head } from '@inertiajs/react';
export default function Disabled({ site = {} }) {
    const name = site['general.platform_name'] || 'KiteLedger';
    return <main className="kl-disabled"><Head title={site['website.disabled_title'] || 'We will be back soon'}/><section><span className="kl-brandmark">K</span><h1>{site['website.disabled_title'] || 'We will be back soon'}</h1><p>{site['website.disabled_message'] || 'Our website is temporarily unavailable while we make improvements.'}</p><small>{name}</small></section></main>;
}
