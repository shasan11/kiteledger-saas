import { Badge, Select, Space, Tooltip } from 'antd';
import { useMemo } from 'react';

import { useAppContext } from '@/Contexts/AppContext';

export default function FiscalYearToggle({ className, style }) {
    const {
        availableFiscalYears,
        currentFiscalYear,
        currentFiscalYearId,
        fiscal_year_expired,
        fiscal_year_locked,
        loading,
        setFiscalYear,
    } = useAppContext();

    const options = useMemo(
        () =>
            (availableFiscalYears || []).map((year) => ({
                value: year.id,
                label: year.code || year.name,
            })),
        [availableFiscalYears],
    );

    if (!options.length) {
        return null;
    }

    const badge = fiscal_year_locked
        ? 'locked'
        : fiscal_year_expired
          ? 'expired'
          : currentFiscalYear?.status?.toLowerCase?.();

    return (
        <Tooltip title="Financial year context">
            <Space size={6} style={{ flexShrink: 0 }}>
                <Select
                    size="middle"
                    value={currentFiscalYearId || options[0]?.value}
                    onChange={setFiscalYear}
                    colorBgContainer
                    options={options}
                    loading={loading}
                    className={className}
                    popupClassName="app-dark-select-dropdown"
                    classNames="app-dark-select app-navbar__mobile-context-select"
                    popupMatchSelectWidth={190}
                    style={style}
                />
                {(fiscal_year_locked || fiscal_year_expired) && (
                    <Badge
                        color={fiscal_year_locked ? 'red' : 'gold'}
                        text={badge}
                        className="app-navbar__fy-badge"
                    />
                )}
            </Space>
        </Tooltip>
    );
}
