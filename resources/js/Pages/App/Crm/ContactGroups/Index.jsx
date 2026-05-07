import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout/index.jsx';
import ReusableCrud from '@/Components/ResuableCrud';
import { Head, router } from '@inertiajs/react';
import { useEffect, useMemo, useState } from 'react';
import * as Yup from 'yup';
import {
  Alert,
  Button,
  Card,
  Empty,
  Segmented,
  Skeleton,
  Space,
  Tree,
  Typography,
} from 'antd';
import {
  ApartmentOutlined,
  ReloadOutlined,
  TeamOutlined,
  UnorderedListOutlined,
} from '@ant-design/icons';

const { Text } = Typography;

const BACKEND_BASE = import.meta.env.VITE_APP_BACKEND_URL || 'http://localhost:8000';
const api = (path) => `${BACKEND_BASE}${path}`;

const extractRows = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.results)) return payload.results;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.data?.data)) return payload.data.data;
  return [];
};

function buildTree(rows = []) {
  const map = new Map();
  const roots = [];

  rows.forEach((item) => {
    map.set(String(item.id), {
      key: String(item.id),
      record: item,
      title: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Text strong style={{ color: '#0f172a' }}>
            {item.name || 'Unnamed Group'}
          </Text>

          {item.description ? (
            <Text type="secondary" style={{ fontSize: 12 }}>
              {item.description}
            </Text>
          ) : null}
        </div>
      ),
      children: [],
    });
  });

  rows.forEach((item) => {
    const id = String(item.id);
    const parentId = item.parent_id || item.parent?.id;

    if (parentId && map.has(String(parentId))) {
      map.get(String(parentId)).children.push(map.get(id));
    } else {
      roots.push(map.get(id));
    }
  });

  return roots;
}

function ContactGroupTreeView() {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);
  const [error, setError] = useState(null);

  const fetchGroups = async () => {
    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('accessToken');

      const response = await fetch(api('/api/contact-groups/?page_size=500'), {
        method: 'GET',
        credentials: 'include',
        headers: {
          Accept: 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to load contact groups. Status: ${response.status}`);
      }

      const data = await response.json();
      setRows(extractRows(data));
    } catch (err) {
      setError(err.message || 'Failed to load contact groups.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGroups();
  }, []);

  const treeData = useMemo(() => buildTree(rows), [rows]);

  const openRecord = (id) => {
    router.visit(route('crm.contact-groups.show', id));
  };

  return (
    <Card
      style={{
         
         boxShadow: 'none',
      }}
      styles={{
        body: {
          padding: 18,
        },
      }}
      title={
        <Space size={10}>
          <ApartmentOutlined style={{ color: '#0f172a' }} />
          <span style={{ fontWeight: 650, color: '#0f172a' }}>Group Hierarchy</span>
        </Space>
      }
      extra={
        <Button icon={<ReloadOutlined />} onClick={fetchGroups}>
          Refresh
        </Button>
      }
    >
      {error ? (
        <Alert
          type="error"
          showIcon
          message="Unable to load tree view"
          description={error}
          style={{ marginBottom: 14 }}
        />
      ) : null}

      {loading ? (
        <Skeleton active paragraph={{ rows: 8 }} />
      ) : treeData.length ? (
        <Tree
          blockNode
          showLine
          defaultExpandAll
          treeData={treeData}
          onSelect={(selectedKeys) => {
            const id = selectedKeys?.[0];
            if (id) openRecord(id);
          }}
          style={{
            background: 'transparent',
            fontSize: 14,
          }}
        />
      ) : (
        <Empty description="No contact groups found" />
      )}
    </Card>
  );
}

export default function ContactGroups(props) {
  const [viewMode, setViewMode] = useState('list');

  const columns = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      sorter: true,
      render: (val) => <Text strong>{val || '-'}</Text>,
    },
    {
      title: 'Parent Group',
      dataIndex: 'parent',
      key: 'parent',
      render: (_, record) => record?.parent?.name || '-',
    },
  ];

  const fields = [
    {
      name: 'name',
      label: 'Group Name',
      type: 'text',
      required: true,
      col: 24,
      placeholder: 'e.g. Customers - Retail',
    },
    {
      name: 'parent_id',
      label: 'Parent Group',
      type: 'fkSelect',
      col: 24,
      placeholder: 'Select parent group',
      fkUrl: api('/api/contact-groups/'),
      fkSearchParam: 'search',
      fkPageSize: 20,
      fkValueKey: 'id',
      fkLabelKey: 'name',
    },
    {
      name: 'description',
      label: 'Description',
      type: 'textarea',
      col: 24,
      rows: 3,
      placeholder: 'Optional description',
    },
  ];

  const validationSchema = Yup.object().shape({
    name: Yup.string().required('Name is required').max(120),
    parent_id: Yup.string().nullable(),
    description: Yup.string().nullable(),
  });

  const crudInitialValues = {
    name: '',
    parent_id: null,
    description: '',
  };

  const transformPayload = (values) => {
    const p = { ...values };

    p.name = p.name?.trim() || null;
    p.description = p.description?.trim() || null;
    p.parent_id = p.parent_id || null;

    Object.keys(p).forEach((k) => {
      if (p[k] === '') p[k] = null;
    });

    return p;
  };

  const headerNode = (
    <div
      style={{
        minHeight: 34,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 16,
      }}
    >
      <Space size={10}>
        <TeamOutlined style={{ color: '#0f172a', fontSize: 17 }} />

        <div>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#0f172a', lineHeight: 1.15 }}>
            Contact Groups
          </div>

          <Text type="secondary" style={{ fontSize: 12 }}>
            Manage customer, supplier, vendor and internal contact classifications
          </Text>
        </div>
      </Space>

      <Segmented
        size="middle"
        value={viewMode}
        onChange={setViewMode}
        options={[
          {
            label: (
              <Space size={6}>
                <UnorderedListOutlined />
                <span>List View</span>
              </Space>
            ),
            value: 'list',
          },
          {
            label: (
              <Space size={6}>
                <ApartmentOutlined />
                <span>Tree View</span>
              </Space>
            ),
            value: 'tree',
          },
        ]}
      />
    </div>
  );

  return (
    <AuthenticatedLayout user={props.auth?.user} header={headerNode}>
      <Head title="Contact Groups" />

      <div className='border-0'>
        {viewMode === 'list' ? (
          <ReusableCrud
            icon={<TeamOutlined />}
            title="Contact Groups"
            apiUrl={api('/api/contact-groups/')}
            columns={columns}
            fields={fields}
            validationSchema={validationSchema}
            crudInitialValues={crudInitialValues}
            transformPayload={transformPayload}
            form_ui="drawer"
            drawerWidth={600}
            searchParam="search"
            pageParam="page"
            pageSizeParam="page_size"
            sortMode="ordering"
            orderingParam="ordering"
            enableServerPagination={true}
            showSearch={true}
            canView={true}
            activeTableRowFunction={(record) => ({
              onClick: (event) => {
                if (
                  event.target.closest(
                    'button,a,input,textarea,.ant-checkbox-wrapper,.ant-dropdown-trigger'
                  )
                ) {
                  return;
                }

                router.visit(route('crm.contact-groups.show', record.id));
              },
              style: { cursor: 'pointer' },
            })}
            canAdd={true}
            canEdit={true}
            canDelete={true}
            hasActions={true}
            hasActionColumns={true}
          />
        ) : (
          <ContactGroupTreeView />
        )}
      </div>
    </AuthenticatedLayout>
  );
}