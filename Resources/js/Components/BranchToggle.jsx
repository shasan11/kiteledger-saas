import { BranchesOutlined } from '@ant-design/icons';
import { Button, Modal, Select, Tooltip, message } from 'antd';
import { useMemo, useState } from 'react';

import { useAppContext } from '@/Contexts/AppContext';

export default function BranchToggle({ className, style }) {
    const {
        accessibleBranches,
        currentBranchId,
        permissions,
        loading,
        setBranch,
    } = useAppContext();
    const [open, setOpen] = useState(false);
    const [selected, setSelected] = useState(currentBranchId);

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

    const current = options.find((option) => option.value === currentBranchId) || options[0];
    const apply = async () => {
        await setBranch(selected || current?.value);
        setOpen(false);
        message.success('Branch changed successfully.');
    };

    return (
        <>
            <Tooltip title={`Current Branch: ${current?.label || 'Branch'}`}>
                <Button
                    type="text"
                    icon={<BranchesOutlined />}
                    className={className}
                    style={style}
                    onClick={() => {
                        setSelected(currentBranchId || options[0]?.value);
                        setOpen(true);
                    }}
                    aria-label="Change branch"
                />
            </Tooltip>
            <Modal
                title="Change Branch"
                open={open}
                onCancel={() => setOpen(false)}
                onOk={apply}
                okText="Apply"
                confirmLoading={loading}
            >
                <Select
                    value={selected || currentBranchId || options[0]?.value}
                    onChange={setSelected}
                    options={options}
                    loading={loading}
                    style={{ width: '100%' }}
                    showSearch
                    optionFilterProp="label"
                />
            </Modal>
        </>
    );
}
