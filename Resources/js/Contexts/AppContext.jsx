import { router } from '@inertiajs/react';
import axios from 'axios';
import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
} from 'react';

const BACKEND_BASE = import.meta.env.VITE_APP_BACKEND_URL || '';
const AppContext = createContext(null);

const api = (path) => `${BACKEND_BASE}${path}`;

const normalizeInitial = (initialContext = {}) => ({
    current_branch: initialContext.current_branch || null,
    current_branch_id:
        initialContext.current_branch_id ||
        initialContext.selectedBranchId ||
        initialContext.current_branch?.id ||
        null,
    all_branches: Boolean(initialContext.all_branches),
    current_fiscal_year: initialContext.current_fiscal_year || null,
    current_fiscal_year_id:
        initialContext.current_fiscal_year_id ||
        initialContext.current_fiscal_year?.id ||
        null,
    accessible_branches:
        initialContext.accessible_branches || initialContext.branches || [],
    available_fiscal_years: initialContext.available_fiscal_years || [],
    fiscal_year_expired: Boolean(initialContext.fiscal_year_expired),
    fiscal_year_locked: Boolean(initialContext.fiscal_year_locked),
    app_settings: initialContext.app_settings || {},
    permissions: {
        view_all_branches: Boolean(
            initialContext.permissions?.view_all_branches ||
                initialContext.canViewAllBranches,
        ),
        override_fiscal_year_lock: Boolean(
            initialContext.permissions?.override_fiscal_year_lock,
        ),
    },
});

const publishContext = (context) => {
    if (typeof window === 'undefined') return;

    window.__KITELEDGER_APP_CONTEXT__ = {
        branchId: context?.all_branches
            ? 'all'
            : context?.current_branch_id || context?.current_branch?.id || null,
        fiscalYearId:
            context?.current_fiscal_year_id ||
            context?.current_fiscal_year?.id ||
            null,
    };
};

export function AppContextProvider({ initialContext = {}, children }) {
    const [context, setContext] = useState(() => normalizeInitial(initialContext));
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        publishContext(context);
    }, [context]);

    const applyContext = useCallback((nextContext) => {
        const normalized = normalizeInitial(nextContext);
        setContext(normalized);
        publishContext(normalized);
        return normalized;
    }, []);

    const refreshContext = useCallback(async () => {
        setLoading(true);

        try {
            const { data } = await axios.get(api('/api/app/context'));
            return applyContext(data);
        } finally {
            setLoading(false);
        }
    }, [applyContext]);

    useEffect(() => {
        void refreshContext().catch(() => {});
    }, [refreshContext]);

    const setBranch = useCallback(
        async (branchId) => {
            setLoading(true);

            try {
                const { data } = await axios.post(api('/api/app/context/branch'), {
                    branch_id: branchId,
                });
                const next = applyContext(data);
                router.reload({ preserveScroll: true });
                return next;
            } finally {
                setLoading(false);
            }
        },
        [applyContext],
    );

    const setFiscalYear = useCallback(
        async (fiscalYearId) => {
            setLoading(true);

            try {
                const { data } = await axios.post(
                    api('/api/app/context/fiscal-year'),
                    { fiscal_year_id: fiscalYearId },
                );
                const next = applyContext(data);
                router.reload({ preserveScroll: true });
                return next;
            } finally {
                setLoading(false);
            }
        },
        [applyContext],
    );

    const value = useMemo(
        () => ({
            ...context,
            loading,
            currentBranch: context.current_branch,
            currentBranchId: context.all_branches
                ? 'all'
                : context.current_branch_id || context.current_branch?.id || null,
            currentFiscalYear: context.current_fiscal_year,
            currentFiscalYearId:
                context.current_fiscal_year_id ||
                context.current_fiscal_year?.id ||
                null,
            accessibleBranches: context.accessible_branches,
            availableFiscalYears: context.available_fiscal_years,
            setBranch,
            setFiscalYear,
            refreshContext,
        }),
        [context, loading, refreshContext, setBranch, setFiscalYear],
    );

    return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppContext() {
    const context = useContext(AppContext);

    if (!context) {
        throw new Error('useAppContext must be used inside AppContextProvider.');
    }

    return context;
}
