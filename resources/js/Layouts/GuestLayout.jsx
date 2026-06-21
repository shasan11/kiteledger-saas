import ApplicationLogo from '@/Components/ApplicationLogo';
import LanguageSwitcher from '@/Components/LanguageSwitcher';
import { getLocale, useTrans } from '@/lib/i18n';
import { Link } from '@inertiajs/react';

export default function GuestLayout({ children }) {
    useTrans();
    const locale = getLocale();

    return (
        <div
            dir={locale.dir}
            className="flex min-h-screen flex-col items-center bg-gray-100 pt-6 sm:justify-center sm:pt-0"
        >
            <div className="flex w-full max-w-md items-center justify-between px-2 sm:max-w-md">
                <Link href="/">
                    <ApplicationLogo className="h-20 w-20 fill-current text-gray-500" style={{
                                    width: '200px',
                                    padding: '3px',
                                }} />
                </Link>
                <LanguageSwitcher compact />
            </div>

            <div className="mt-6 w-full overflow-hidden bg-white px-6 py-4 shadow-md sm:max-w-md sm:rounded-lg">
                {children}
            </div>
        </div>
    );
}
