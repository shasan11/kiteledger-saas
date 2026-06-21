import { Tag } from 'antd';

const colorMap = {
    open: 'green',
    closed: 'default',
    attention: 'gold',
    risk: 'red',
};

const labelMap = {
    open: 'Open Shift',
    closed: 'No Shift',
    attention: 'Needs Attention',
    risk: 'Needs Review',
};

export default function ShiftStatusTag({ status, label, color }) {
    const resolvedStatus = status || 'closed';

    return (
        <Tag color={color || colorMap[resolvedStatus] || 'default'}>
            {label || labelMap[resolvedStatus] || resolvedStatus}
        </Tag>
    );
}
