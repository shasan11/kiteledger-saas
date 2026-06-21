import { Button, Dropdown } from 'antd';
import { MoreOutlined } from '@ant-design/icons';

export default function ActionDropdown({ items = [], size = 'small' }) {
  const menuItems = items.filter(Boolean).map((item, index) => ({
    key: item.key || String(index),
    label: item.label,
    icon: item.icon,
    danger: item.danger,
    disabled: item.disabled,
    onClick: item.onClick,
  }));

  return (
    <Dropdown menu={{ items: menuItems }} trigger={['click']} placement="bottomRight">
      <Button size={size} type="text" icon={<MoreOutlined />} aria-label="More actions" />
    </Dropdown>
  );
}
