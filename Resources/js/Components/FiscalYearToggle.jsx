import { CalendarOutlined } from '@ant-design/icons';
import { Badge, Button, Modal, Select, Space, Tooltip, message } from 'antd';
import { useMemo, useState } from 'react';

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
    const [open, setOpen] = useState(false);
    const [selected, setSelected] = useState(currentFiscalYearId);

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

    const current = options.find((option) => option.value === currentFiscalYearId) || options[0];
    const apply = async () => {
        await setFiscalYear(selected || current?.value);
        setOpen(false);
        message.success('Fiscal year changed successfully.');
    };

    const badge = fiscal_year_locked
        ? 'locked'
        : fiscal_year_expired
          ? 'expired'
          : currentFiscalYear?.status?.toLowerCase?.();

    return (
        <>
            <Space size={6} style={{ flexShrink: 0 }}>
                <Tooltip title={`Fiscal Year: ${current?.label || 'Fiscal Year'}`}>
                    <Button
                        type="text"
                        icon={<CalendarOutlined />}
                        className={className}
                        style={style}
                        onClick={() => {
                            setSelected(currentFiscalYearId || options[0]?.value);
                            setOpen(true);
                        }}
                        aria-label="Change fiscal year"
                    />
                </Tooltip>
                {(fiscal_year_locked || fiscal_year_expired) && (
                    <Badge
                        color={fiscal_year_locked ? 'red' : 'gold'}
                        text={badge}
                        className="app-navbar__fy-badge"
                    />
                )}
            </Space>
            <Modal
                title="Change Fiscal Year"
                open={open}
                onCancel={() => setOpen(false)}
                onOk={apply}
                okText="Apply"
                confirmLoading={loading}
            >
                <Select
                    value={selected || currentFiscalYearId || options[0]?.value}
                    onChange={setSelected}
                    options={options}
                    loading={loading}
                    style={{ width: '100%' }}
                />
            </Modal>
        </>
    );
}
