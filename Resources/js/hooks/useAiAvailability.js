import { usePage } from '@inertiajs/react';
import axios from 'axios';
import { useCallback, useEffect, useState } from 'react';

const CACHE_KEY = 'kl_ai_settings';
const CACHE_TTL = 60_000; // 1 minute

let _cache = null;
let _cacheTime = 0;

export function useAiAvailability() {
    const page = usePage();
    const permissions = page.props.auth?.permissions || [];

    const [settings, setSettings] = useState(null);
    const [loading, setLoading] = useState(true);

    const hasPermission = useCallback(
        (perm) => permissions.includes(perm),
        [permissions],
    );

    useEffect(() => {
        const now = Date.now();

        if (_cache && now - _cacheTime < CACHE_TTL) {
            setSettings(_cache);
            setLoading(false);
            return;
        }

        axios
            .get('/api/ai/settings')
            .then(({ data }) => {
                _cache = data;
                _cacheTime = Date.now();
                setSettings(data);
            })
            .catch(() => {
                setSettings({ enabled: false, enabled_modules: {} });
            })
            .finally(() => setLoading(false));
    }, []);

    const aiEnabled = settings?.enabled ?? false;
    const modules = settings?.enabled_modules ?? {};

    const canUseAiModule = useCallback(
        (moduleKey) => {
            if (!aiEnabled) return false;
            if (!modules[moduleKey]) return false;
            return true;
        },
        [aiEnabled, modules],
    );

    return {
        aiEnabled,
        modules,
        settings,
        loading,
        canUseAiModule,
        hasPermission,
    };
}
