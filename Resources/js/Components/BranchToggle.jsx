import { BranchesOutlined } from '@ant-design/icons';
import { Select, Tooltip } from 'antd';
import { useMemo } from 'react';

import { useAppContext } from '@/Contexts/AppContext';

export default function BranchToggle({ className, style }) {
    const {
        accessibleBranches,
        currentBranchId,
        permissions,
        loading,
        setBranch,
    } = useAppContext();

    const options = useMemo(() => {
        const branches = (accessibleBranches || []).map((branch) => ({
            value: branch.id,
            label: branch.code ? `${branch.name} (${branch.code})` : branch.name,
        }));

        if (permissions?.view_all_branches) {
            return [{ value: 'all', label: 'All Branches' }, ...branches];
        }

        return branches;
    }, [accessibleBranches, permissions?.view_all_branches]);

    if (!options.length) {
        return null;
    }

    return (
        <Tooltip title="Branch context">
            <Select
                size="middle"
                value={currentBranchId || options[0]?.value}
                onChange={setBranch}
                options={options}
                loading={loading}
                suffixIcon={<BranchesOutlined />}
                className={className}
                popupClassName="app-dark-select-dropdown"
                popupMatchSelectWidth={230}
                style={style}
            />
        </Tooltip>
    );
}
