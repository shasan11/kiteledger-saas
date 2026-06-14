import { GlobalOutlined } from '@ant-design/icons';
import { router, usePage } from '@inertiajs/react';
import { Select } from 'antd';

import { useTrans } from '@/lib/i18n';

export default function LanguageSwitcher({ compact = false, className, style }) {
    const page = usePage();
    const t = useTrans();
    const locale = page.props.locale || {};
    const supported = Array.isArray(locale.supported) ? locale.supported : [];

    const handleChange = (value) => {
        router.post(
            route('locale.change'),
            { locale: value, persist: true },
            {
                preserveScroll: true,
                preserveState: false,
                onSuccess: (page) => {
                    window.dispatchEvent(
                        new CustomEvent('kiteledger-locale-change', {
                            detail: {
                                locale: page.props.locale,
                                translations: page.props.translations,
                            },
                        }),
                    );
                },
            },
        );
    };

    return (
        <Select
            aria-label={t('Language')}
            className={className}
            value={locale.current || 'en'}
            onChange={handleChange}
            options={supported.map((item) => ({
                value: item.code,
                label: item.native,
            }))}
            suffixIcon={<GlobalOutlined />}
            popupMatchSelectWidth={false}
            style={{
                minWidth: compact ? 92 : 140,
                ...style,
            }}
        />
    );
}
