import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { Button, Checkbox, Collapse, Empty, Input, Space, Spin, Tag } from 'antd';

const ACTION_ORDER = [
  'view',
  'create',
  'update',
  'delete',
  'manage',
  'approve',
  'void',
];

const ALLOWED_ACTIONS = new Set(ACTION_ORDER);

const titleize = (value) =>
  String(value || '')
    .replace(/[_-]/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());

const permissionId = (item) => {
  if (item == null) return null;
  if (typeof item === 'object') return item.id ?? item.value ?? null;
  return item;
};

const parsePermission = (permission) => {
  const parts = String(permission.name || '').split('.').filter(Boolean);
  const action = parts.length > 1 ? parts[parts.length - 1] : 'manage';
  const module = parts[0] || 'general';
  const resource = parts.length > 2 ? parts.slice(1, -1).join('.') : 'general';

  return { ...permission, action, module, resource };
};

export default function PermissionAccordionMatrix({ value, setFieldValue, readOnly, field }) {
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const selectedIds = useMemo(
    () => new Set((Array.isArray(value) ? value : []).map(permissionId).filter(Boolean).map(String)),
    [value]
  );

  useEffect(() => {
    let cancelled = false;

    const loadPermissions = async () => {
      setLoading(true);

      try {
        const rows = [];
        let page = 1;
        let total = null;
        const pageSize = 100;

        while (page <= 100) {
          const { data } = await axios.get(field.fkUrl, {
            params: { page, page_size: pageSize },
          });

          const pageRows = Array.isArray(data?.results) ? data.results : Array.isArray(data) ? data : [];
          rows.push(...pageRows);

          total = typeof data?.count === 'number' ? data.count : total;

          if (!data?.next && (total == null || rows.length >= total || pageRows.length < pageSize)) break;
          page += 1;
        }

        if (!cancelled) setPermissions(rows);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadPermissions();

    return () => {
      cancelled = true;
    };
  }, [field.fkUrl]);

  const parsedPermissions = useMemo(
    () => permissions.map(parsePermission).filter((permission) => ALLOWED_ACTIONS.has(permission.action)),
    [permissions]
  );

  const visibleActions = useMemo(() => {
    const actions = new Set(parsedPermissions.map((permission) => permission.action));

    return Array.from(actions).sort(
      (a, b) => ACTION_ORDER.indexOf(a) - ACTION_ORDER.indexOf(b) || a.localeCompare(b)
    );
  }, [parsedPermissions]);

  const grouped = useMemo(() => {
    const query = search.trim().toLowerCase();
    const rows = parsedPermissions.filter((permission) => {
      if (!query) return true;

      return [permission.name, permission.description, permission.module, permission.resource, permission.action]
        .filter(Boolean)
        .some((part) => String(part).toLowerCase().includes(query));
    });

    const modules = new Map();

    rows.forEach((permission) => {
      if (!modules.has(permission.module)) modules.set(permission.module, new Map());

      const resources = modules.get(permission.module);
      if (!resources.has(permission.resource)) resources.set(permission.resource, []);

      resources.get(permission.resource).push(permission);
    });

    return Array.from(modules.entries()).map(([module, resources]) => ({
      module,
      resources: Array.from(resources.entries()).map(([resource, resourcePermissions]) => ({
        resource,
        permissions: resourcePermissions.sort(
          (a, b) => ACTION_ORDER.indexOf(a.action) - ACTION_ORDER.indexOf(b.action) || a.action.localeCompare(b.action)
        ),
      })),
    }));
  }, [parsedPermissions, search]);

  const setSelected = (nextIds) => setFieldValue(field.name, Array.from(nextIds));

  const togglePermission = (id, checked) => {
    const next = new Set(selectedIds);
    if (checked) next.add(String(id));
    else next.delete(String(id));
    setSelected(next);
  };

  const toggleMany = (ids, checked) => {
    const next = new Set(selectedIds);

    ids.forEach((id) => {
      if (checked) next.add(String(id));
      else next.delete(String(id));
    });

    setSelected(next);
  };

  const allIds = permissions.map((permission) => permission.id).filter(Boolean);
  const selectedCount = allIds.filter((id) => selectedIds.has(String(id))).length;

  if (loading) {
    return (
      <div style={{ padding: 24, textAlign: 'center' }}>
        <Spin />
      </div>
    );
  }

  if (!permissions.length) return <Empty description="No permissions found" />;

  return (
    <div className="permission-matrix">
      <Space style={{ width: '100%', justifyContent: 'space-between', marginBottom: 12 }} wrap>
        <Input.Search
          allowClear
          placeholder="Search permissions"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          style={{ width: 280 }}
        />
        <Space wrap>
          <Tag color="blue">{selectedCount} selected</Tag>
          <Button size="small" disabled={readOnly} onClick={() => toggleMany(allIds, true)}>
            Select all
          </Button>
          <Button size="small" disabled={readOnly} onClick={() => toggleMany(allIds, false)}>
            Clear
          </Button>
        </Space>
      </Space>

      <Collapse
        bordered={false}
        defaultActiveKey={grouped.slice(0, 2).map((group) => group.module)}
        items={grouped.map((group) => {
          const moduleIds = group.resources.flatMap((row) => row.permissions.map((permission) => permission.id));
          const moduleSelected = moduleIds.filter((id) => selectedIds.has(String(id))).length;

          return {
            key: group.module,
            label: (
              <Space>
                <strong>{titleize(group.module)}</strong>
                <Tag>{moduleSelected}/{moduleIds.length}</Tag>
              </Space>
            ),
            children: (
              <div className="permission-matrix__table">
                <div
                  className="permission-matrix__row permission-matrix__row--head"
                  style={{ gridTemplateColumns: `minmax(180px, 1fr) repeat(${visibleActions.length}, 92px)` }}
                >
                  <div>Permission</div>
                  {visibleActions.map((action) => (
                    <div key={action}>{titleize(action)}</div>
                  ))}
                </div>

                {group.resources.map((row) => {
                  const rowIds = row.permissions.map((permission) => permission.id);
                  const checkedInRow = rowIds.filter((id) => selectedIds.has(String(id))).length;

                  return (
                    <div
                      key={row.resource}
                      className="permission-matrix__row"
                      style={{ gridTemplateColumns: `minmax(180px, 1fr) repeat(${visibleActions.length}, 92px)` }}
                    >
                      <div>
                        <Checkbox
                          disabled={readOnly}
                          checked={checkedInRow === rowIds.length}
                          indeterminate={checkedInRow > 0 && checkedInRow < rowIds.length}
                          onChange={(event) => toggleMany(rowIds, event.target.checked)}
                        >
                          <strong>{titleize(row.resource)}</strong>
                        </Checkbox>
                      </div>

                      {visibleActions.map((action) => {
                        const permission = row.permissions.find((item) => item.action === action);

                        if (!permission) return <div key={action} className="permission-matrix__empty" />;

                        return (
                          <div key={action}>
                            <Checkbox
                              disabled={readOnly}
                              checked={selectedIds.has(String(permission.id))}
                              title={permission.name}
                              onChange={(event) => togglePermission(permission.id, event.target.checked)}
                            />
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            ),
          };
        })}
      />

      <style>{`
        .permission-matrix .ant-collapse {
          background: #fff;
        }

        .permission-matrix .ant-collapse-item {
          border: 1px solid #e5e7eb;
          border-radius: 6px;
          margin-bottom: 10px;
          overflow: hidden;
        }

        .permission-matrix .ant-collapse-header {
          background: #f8fafc;
          align-items: center !important;
        }

        .permission-matrix__table {
          overflow-x: auto;
          border: 1px solid #edf0f4;
        }

        .permission-matrix__row {
          display: grid;
          min-width: max-content;
          align-items: center;
          border-bottom: 1px solid #edf0f4;
        }

        .permission-matrix__row:last-child {
          border-bottom: 0;
        }

        .permission-matrix__row > div {
          min-height: 42px;
          padding: 9px 12px;
          display: flex;
          align-items: center;
          border-right: 1px solid #edf0f4;
        }

        .permission-matrix__row > div:not(:first-child) {
          justify-content: center;
        }

        .permission-matrix__row > div:last-child {
          border-right: 0;
        }

        .permission-matrix__row--head {
          background: #fbfcfe;
          color: #111827;
          font-size: 11px;
          font-weight: 750;
          text-transform: uppercase;
        }

        .permission-matrix__empty {
          background: #fcfcfd;
        }
      `}</style>
    </div>
  );
}
