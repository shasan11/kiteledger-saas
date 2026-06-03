import { useMemo, useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout/index.jsx';
import { Head } from '@inertiajs/react';
import { AppstoreOutlined, BranchesOutlined, ProfileOutlined } from '@ant-design/icons';
import { Card, Space, Tabs, Typography, theme } from 'antd';
import Products from '@/Pages/App/Inventory/Products/Index.jsx';
import Services from '@/Pages/App/Inventory/Services/Index.jsx';

const { Text, Title } = Typography;

const validTabs = ['products', 'services', 'variant-products'];

export default function ProductCatalog({ auth, initialTab = 'products' }) {
  const { token } = theme.useToken();
  const urlTab = typeof window !== 'undefined'
    ? new URLSearchParams(window.location.search).get('tab')
    : null;
  const [activeTab, setActiveTab] = useState(
    validTabs.includes(urlTab) ? urlTab : validTabs.includes(initialTab) ? initialTab : 'products',
  );

  const tabItems = useMemo(
    () => [
      {
        key: 'products',
        label: (
          <Space size={6}>
            <AppstoreOutlined />
            <span>Products</span>
          </Space>
        ),
      },
      {
        key: 'services',
        label: (
          <Space size={6}>
            <ProfileOutlined />
            <span>Services</span>
          </Space>
        ),
      },
      {
        key: 'variant-products',
        label: (
          <Space size={6}>
            <BranchesOutlined />
            <span>Variant Products</span>
          </Space>
        ),
      },
    ],
    [],
  );

  const changeTab = (key) => {
    setActiveTab(key);

    const url = new URL(window.location.href);
    url.pathname = key === 'services' ? '/inventory/services' : key === 'variant-products' ? '/inventory/variant-products' : '/inventory/products';
    url.searchParams.set('tab', key);
    window.history.replaceState({}, '', url.toString());
  };

  return (
    <AuthenticatedLayout auth={auth}>
      <Head title="Products" />

      <div style={{ background: token.colorBgLayout, minHeight: '100vh', padding: 16 }}>
        <Space direction="vertical" size={12} style={{ width: '100%' }}>
          <Card bordered={false} style={{ borderRadius: token.borderRadiusLG }} bodyStyle={{ padding: 16 }}>
            <Space direction="vertical" size={4} style={{ width: '100%' }}>
              <Title level={4} style={{ margin: 0 }}>Products</Title>
              <Text type="secondary">
                Manage products, services, and variant products from one catalog area.
              </Text>
              <Tabs activeKey={activeTab} onChange={changeTab} items={tabItems} />
            </Space>
          </Card>

          {activeTab === 'products' ? <Products auth={auth} embedded catalogMode="simple" /> : null}
          {activeTab === 'services' ? <Services auth={auth} embedded /> : null}
          {activeTab === 'variant-products' ? <Products auth={auth} embedded catalogMode="variant" /> : null}
        </Space>
      </div>
    </AuthenticatedLayout>
  );
}
