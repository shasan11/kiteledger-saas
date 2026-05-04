import { useCallback, useEffect, useMemo, useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout/index.jsx';
import ReusableCrud from '@/Components/ResuableCrud';
import { Head } from '@inertiajs/react';
import * as Yup from 'yup';
import {
  Button,
  Card,
  Empty,
  Segmented,
  Space,
  Spin,
  Tag,
  Tooltip,
  Tree,
  Typography,
  message,
} from 'antd';
import {
  ApartmentOutlined,
  AppstoreOutlined,
  ReloadOutlined,
  UnorderedListOutlined,
} from '@ant-design/icons';

const { Text } = Typography;

const BACKEND_BASE = import.meta.env.VITE_APP_BACKEND_URL || '';
const api = (path) => `${BACKEND_BASE}${path}`;

const NO_TABLE_TREE_CHILDREN_KEY = '__no_table_tree_children__';

const normalizeApiRows = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.results)) return payload.results;
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
};

const getParentId = (row) => {
  if (row?.parent_id && typeof row.parent_id === 'object') {
    return row.parent_id?.id || row.parent_id?.value || null;
  }

  return row?.parent_id || row?.parent?.id || null;
};

const buildCategoryTree = (rows = []) => {
  const nodeMap = new Map();
  const roots = [];

  rows.forEach((row) => {
    nodeMap.set(String(row.id), {
      key: String(row.id),
      category: row,
      children: [],
      title: (
        <div className="flex items-center justify-between gap-3 py-1">
          <div className="min-w-0">
            <Text strong>{row.name}</Text>

            {row.description ? (
              <div className="truncate text-xs text-gray-500">
                {row.description}
              </div>
            ) : null}
          </div>

          <Tag color={row.active ? 'green' : 'red'} className="m-0">
            {row.active ? 'Active' : 'Inactive'}
          </Tag>
        </div>
      ),
    });
  });

  rows.forEach((row) => {
    const node = nodeMap.get(String(row.id));
    const parentId = getParentId(row);

    if (
      parentId &&
      String(parentId) !== String(row.id) &&
      nodeMap.has(String(parentId))
    ) {
      nodeMap.get(String(parentId)).children.push(node);
    } else {
      roots.push(node);
    }
  });

  const sortTree = (nodes) => {
    nodes.sort((a, b) =>
      String(a.category?.name || '').localeCompare(String(b.category?.name || ''))
    );

    nodes.forEach((node) => {
      if (node.children?.length) {
        sortTree(node.children);
      }
    });

    return nodes;
  };

  return sortTree(roots);
};

export default function ProductCategories(props) {
  const [viewMode, setViewMode] = useState('list');
  const [treeLoading, setTreeLoading] = useState(false);
  const [treeRows, setTreeRows] = useState([]);

  const columns = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      sorter: true,
       render: (val) => <Text strong>{val}</Text>,
    },
    {
      title: 'Parent',
      dataIndex: 'parent',
      key: 'parent',
      width: '30%',
      render: (_, record) => record?.parent?.name || '-',
    },
    
  ];

  const fields = [
    {
      name: 'name',
      label: 'Name',
      type: 'text',
      required: true,
      col: 24,
      placeholder: 'e.g. Electronics',
    },
    {
      name: 'parent_id',
      label: 'Parent Category',
      type: 'fkSelect',
      col: 24,
      placeholder: 'Select parent category',
      fkUrl: api('/api/product-categories'),
      fkSearchParam: 'search',
      fkPageSize: 20,
      fkValueKey: 'id',
      fkLabelKey: 'name',
      fkLabel: (row) => row?.name || '',
      fkExtraParams: { active: true },
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
    name: Yup.string().required('Name is required').max(150),
    parent_id: Yup.string().nullable(),
    description: Yup.string().nullable(),
    active: Yup.boolean().nullable(),
  });

  const crudInitialValues = {
    name: '',
    parent_id: null,
    description: '',
    active: true,
    deleted_item_ids: [],
  };

  const transformPayload = (values) => {
    const p = { ...values };

    p.name = p.name?.trim() || null;
    p.description = p.description?.trim() || null;
    p.parent_id = p.parent_id || null;
    p.active = Boolean(p.active);

    Object.keys(p).forEach((key) => {
      if (p[key] === '') {
        p[key] = null;
      }
    });

    return p;
  };

  const fetchTreeRows = useCallback(async () => {
    setTreeLoading(true);

    try {
      const allRows = [];
      let page = 1;
      let hasNext = true;

      while (hasNext) {
        const params = new URLSearchParams({
          page: String(page),
          page_size: '100',
          ordering: 'name',
        });

        const response = await fetch(
          `${api('/api/product-categories')}?${params.toString()}`,
          {
            headers: {
              Accept: 'application/json',
            },
          }
        );

        if (!response.ok) {
          throw new Error('Failed to load category tree.');
        }

        const payload = await response.json();
        const rows = normalizeApiRows(payload);

        allRows.push(...rows);

        hasNext = Boolean(payload?.next);
        page += 1;
      }

      setTreeRows(allRows);
    } catch (error) {
      message.error(error?.message || 'Failed to load category tree.');
    } finally {
      setTreeLoading(false);
    }
  }, []);

  useEffect(() => {
    if (viewMode === 'tree') {
      fetchTreeRows();
    }
  }, [viewMode, fetchTreeRows]);

  const treeData = useMemo(() => buildCategoryTree(treeRows), [treeRows]);

  return (
    <AuthenticatedLayout
      user={props.auth?.user}
      header={
        <h2 className="text-xl font-semibold leading-tight text-gray-800">
          Product Categories
        </h2>
      }
    >
      <Head title="Product Categories" />

      <div className="mb-3 flex items-center justify-between gap-3">
        <Segmented
          value={viewMode}
          onChange={setViewMode}
          options={[
            {
              label: 'List View',
              value: 'list',
              icon: <UnorderedListOutlined />,
            },
            {
              label: 'Tree View',
              value: 'tree',
              icon: <ApartmentOutlined />,
            },
          ]}
        />

        {viewMode === 'tree' ? (
          <Tooltip title="Refresh tree">
            <Button
              icon={<ReloadOutlined />}
              onClick={fetchTreeRows}
              loading={treeLoading}
            >
              Refresh
            </Button>
          </Tooltip>
        ) : null}
      </div>

      {viewMode === 'list' ? (
        <ReusableCrud
          icon={<AppstoreOutlined />}
          title="Product Categories"
          apiUrl={api('/api/product-categories/')}
          columns={columns}
          fields={fields}
          validationSchema={validationSchema}
          crudInitialValues={crudInitialValues}
          transformPayload={transformPayload}
          form_ui="modal"
          modalWidth={500}
          searchParam="search"
          pageParam="page"
          pageSizeParam="page_size"
          sortMode="ordering"
          orderingParam="ordering"
          activeParam="active"
          enableServerPagination={true}
          enableInactiveDrawer={true}
          showSearch={true}
          canAdd={true}
          canEdit={true}
          canDelete={true}
          hasActions={true}
          hasActionColumns={true}

          // Important:
          // AntD Table uses "children" automatically for tree rows.
          // This disables tree/collapse inside list view.
          childrenColumnName={NO_TABLE_TREE_CHILDREN_KEY}
        />
      ) : (
        <Card
          title={
            <Space>
              <ApartmentOutlined />
              <span>Product Category</span>
            </Space>
          }
          className="bg-white"
        >
          <Spin spinning={treeLoading}>
            {treeData.length ? (
              <Tree treeData={treeData} defaultExpandAll blockNode showLine />
            ) : (
              <Empty description="No product categories found" />
            )}
          </Spin>
        </Card>
      )}
    </AuthenticatedLayout>
  );
}