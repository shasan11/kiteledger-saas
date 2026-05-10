import { useEffect, useMemo, useState } from 'react';
import { Head, router } from '@inertiajs/react';
import axios from 'axios';
import * as Yup from 'yup';
import {
  Alert,
  Avatar,
  Button,
  Card,
  Dropdown,
  Empty,
  Skeleton,
  Space,
  Tag,
  Typography,
  message,
  theme,
} from 'antd';
import {
  ArrowLeftOutlined,
  CheckCircleOutlined,
  ContactsOutlined,
  EditOutlined,
  FolderOpenOutlined,
  MailOutlined,
  MoreOutlined,
  PhoneOutlined,
  StopOutlined,
  UsergroupAddOutlined,
} from '@ant-design/icons';

import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import ReusableCrud from '@/Components/ReusableCrud';

const { Title, Text, Paragraph } = Typography;

const BACKEND = import.meta.env.VITE_APP_BACKEND_URL || '';
const api = (path) => `${BACKEND}${path}`;

const clean = (value) => {
  if (value === '' || value === undefined || value === null) return null;
  return typeof value === 'string' ? value.trim() || null : value;
};

const hasRoute = () => typeof route !== 'undefined' && typeof route === 'function';

const safeRoute = (name, params = null, fallback = '#') => {
  try {
    if (hasRoute()) return params ? route(name, params) : route(name);
    return fallback;
  } catch {
    return fallback;
  }
};

const authHeaders = () => {
  const token = localStorage.getItem('accessToken');

  return {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

const isBlank = (value) => value === null || value === undefined || value === '';

const titleCase = (value = '') =>
  String(value)
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());

const initials = (name = '') => {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);

  if (!parts.length) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();

  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
};

const formatDateTime = (value) => {
  if (!value) return '-';

  try {
    return new Date(value).toLocaleString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return value;
  }
};

const formatMoney = (value) => {
  const num = Number(value || 0);

  return `NPR ${num.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

const getApiCount = (payload) => {
  if (typeof payload?.count === 'number') return payload.count;
  if (Array.isArray(payload?.results)) return payload.results.length;
  if (Array.isArray(payload?.data)) return payload.data.length;
  if (Array.isArray(payload)) return payload.length;
  return 0;
};

const rowClickBlockSelector = [
  'button',
  'a',
  'input',
  'textarea',
  'select',
  '.ant-checkbox-wrapper',
  '.ant-switch',
  '.ant-dropdown-trigger',
  '.ant-btn',
  '.ant-tag',
  '.ant-select',
  '.ant-pagination',
  '.ant-table-selection-column',
].join(',');

function StatusTag({ active }) {
  if (active !== false) {
    return (
      <Tag color="success" icon={<CheckCircleOutlined />} className="contact-group-show__tag">
        Active
      </Tag>
    );
  }

  return (
    <Tag color="error" icon={<StopOutlined />} className="contact-group-show__tag">
      Inactive
    </Tag>
  );
}

function ContactTypeTag({ value }) {
  if (value === 'customer') {
    return (
      <Tag color="blue" className="contact-group-show__tag">
        Customer
      </Tag>
    );
  }

  if (value === 'supplier') {
    return (
      <Tag color="purple" className="contact-group-show__tag">
        Supplier
      </Tag>
    );
  }

  if (value === 'lead') {
    return (
      <Tag color="gold" className="contact-group-show__tag">
        Lead
      </Tag>
    );
  }

  return <Tag className="contact-group-show__tag">{titleCase(value || 'Unknown')}</Tag>;
}

function DisplayText({ value }) {
  if (isBlank(value)) return <Text type="secondary">Not Available</Text>;
  return <span>{value}</span>;
}

function DetailsCard({ title, extra, children }) {
  return (
    <Card className="contact-group-show__card" title={title} extra={extra}>
      {children}
    </Card>
  );
}

function StatCard({ title, value, tone = 'default', icon }) {
  return (
    <Card className={`contact-group-show__metric contact-group-show__metric--${tone}`}>
      <div className="contact-group-show__metric-inner">
        <div className="contact-group-show__metric-icon">{icon}</div>

        <div className="contact-group-show__metric-content">
          <Text type="secondary">{title}</Text>
          <strong>{value}</strong>
        </div>
      </div>
    </Card>
  );
}

function InfoGrid({ rows = [] }) {
  const validRows = rows.filter(Boolean);

  if (!validRows.length) {
    return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No details available" />;
  }

  return (
    <div className="contact-group-show__info-grid">
      {validRows.map((row) => (
        <div className="contact-group-show__info-item" key={row.label}>
          <div className="contact-group-show__info-label">{row.label}</div>
          <div className="contact-group-show__info-value">{row.value ?? '-'}</div>
        </div>
      ))}
    </div>
  );
}

function RailGrid({ rows = [] }) {
  const validRows = rows.filter(Boolean);

  if (!validRows.length) return null;

  return (
    <div className="contact-group-show__rail-grid">
      {validRows.map((row) => (
        <div className="contact-group-show__rail-row" key={row.label}>
          <div className="contact-group-show__rail-label">{row.label}</div>
          <div className="contact-group-show__rail-value">{row.value ?? '-'}</div>
        </div>
      ))}
    </div>
  );
}

export default function ContactGroupShow({ auth, id }) {
  const { token } = theme.useToken();
  const [messageApi, contextHolder] = message.useMessage();

  const [group, setGroup] = useState(null);
  const [counts, setCounts] = useState({
    contacts: 0,
    subGroups: 0,
  });

  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [countLoading, setCountLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const loadGroup = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await axios.get(api(`/api/contact-groups/${id}/`), {
        headers: authHeaders(),
      });

      setGroup(response.data?.data ?? response.data);
    } catch (err) {
      const msg = err?.response?.data?.message || 'Failed to load contact group.';
      setError(msg);
      messageApi.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const loadCounts = async () => {
    setCountLoading(true);

    try {
      const [contactsResponse, subGroupsResponse] = await Promise.all([
        axios.get(api('/api/contacts/'), {
          headers: authHeaders(),
          params: {
            contact_group_id: id,
            page_size: 1,
          },
        }),
        axios.get(api('/api/contact-groups/'), {
          headers: authHeaders(),
          params: {
            parent_id: id,
            page_size: 1,
          },
        }),
      ]);

      setCounts({
        contacts: getApiCount(contactsResponse.data),
        subGroups: getApiCount(subGroupsResponse.data),
      });
    } catch {
      setCounts({
        contacts: 0,
        subGroups: 0,
      });
    } finally {
      setCountLoading(false);
    }
  };

  const refreshPageData = async () => {
    await Promise.all([loadGroup(), loadCounts()]);
  };

  useEffect(() => {
    refreshPageData();
  }, [id]);

  const groupName = group?.name || 'Contact Group';
  const parentName = group?.parent?.name || group?.parent_name || null;

  const contactsCount =
    typeof counts.contacts === 'number'
      ? counts.contacts
      : group?.contacts_count ?? group?.contacts?.length ?? 0;

  const childGroupsCount =
    typeof counts.subGroups === 'number'
      ? counts.subGroups
      : group?.children_count ?? group?.children?.length ?? 0;

  const goBack = () => {
    router.visit(safeRoute('crm.contact-groups.index', null, '/crm/contact-groups'));
  };

  const goEdit = () => {
    router.visit(safeRoute('crm.contact-groups.edit', id, `/crm/contact-groups/${id}/edit`));
  };

  const updateStatus = async () => {
    setSaving(true);
    setError('');

    try {
      const response = await axios.patch(
        api(`/api/contact-groups/${id}/`),
        { active: group?.active === false },
        { headers: authHeaders() }
      );

      setGroup(response.data?.data ?? response.data);
      messageApi.success('Contact group updated.');
    } catch (err) {
      const msg = err?.response?.data?.message || 'Failed to update contact group.';
      setError(msg);
      messageApi.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const clickableRow = (url) => ({
    onClick: (event) => {
      if (event.target.closest(rowClickBlockSelector)) return;
      if (url) router.visit(url);
    },
    style: {
      cursor: url ? 'pointer' : 'default',
    },
  });

  const contactTableRowFunction = (record) =>
    clickableRow(safeRoute('crm.contacts.show', record?.id, `/crm/contacts/${record?.id}`));

  const groupTableRowFunction = (record) =>
    clickableRow(
      safeRoute('crm.contact-groups.show', record?.id, `/crm/contact-groups/${record?.id}`)
    );

  const groupColumns = useMemo(
    () => [
      {
        title: 'Group',
        dataIndex: 'name',
        key: 'name',
        backendSort: true,
        sortField: 'name',
        width: 300,
        render: (value, record) => (
          <Space size={token.marginSM}>
            <Avatar
              size={36}
              icon={<FolderOpenOutlined />}
              style={{
                background: token.colorPrimaryBg,
                color: token.colorPrimary,
              }}
            />

            <div style={{ minWidth: 0 }}>
              <Text strong ellipsis style={{ display: 'block', maxWidth: 210 }}>
                {value || '-'}
              </Text>

              <Text type="secondary" style={{ fontSize: token.fontSizeSM }}>
                {record?.description || 'No description'}
              </Text>
            </div>
          </Space>
        ),
      },
      {
        title: 'Status',
        dataIndex: 'active',
        key: 'active',
        width: 130,
        render: (value) => <StatusTag active={value} />,
      },
    ],
    [token]
  );

  const groupFields = useMemo(
    () => [
      {
        name: 'name',
        label: 'Group Name',
        type: 'text',
        required: true,
        col: 24,
        placeholder: 'Example: Suppliers, Customers, Corporate Clients',
      },
      {
        name: 'parent_id',
        label: 'Parent Group',
        type: 'fkSelect',
        col: 24,
        readOnly: true,
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
        rows: 3,
        col: 24,
        placeholder: 'Short note about this group',
      },
      {
        name: 'active',
        label: 'Active',
        type: 'switch',
        col: 12,
      },
    ],
    []
  );

  const contactColumns = useMemo(
    () => [
      {
        title: 'Contact',
        dataIndex: 'name',
        key: 'name',
        backendSort: true,
        sortField: 'name',
        render: (value, record) => (
          <Space size={token.marginSM}>
            <Avatar
              size={36}
              style={{
                background: token.colorPrimaryBg,
                color: token.colorPrimary,
                fontWeight: token.fontWeightStrong,
              }}
            >
              {initials(value)}
            </Avatar>

            <div style={{ minWidth: 0 }}>
              <Text strong ellipsis style={{ display: 'block', maxWidth: 260 }}>
                {value || '-'}
              </Text>

              <Space size={token.marginXS} wrap style={{ marginTop: token.marginXXS }}>
                <Text type="secondary" style={{ fontSize: token.fontSizeSM }}>
                  {record?.code || 'No code'}
                </Text>

                {record?.phone ? (
                  <Text type="secondary" style={{ fontSize: token.fontSizeSM }}>
                    <PhoneOutlined /> {record.phone}
                  </Text>
                ) : null}

                {record?.email ? (
                  <Text type="secondary" style={{ fontSize: token.fontSizeSM }}>
                    <MailOutlined /> {record.email}
                  </Text>
                ) : null}
              </Space>
            </div>
          </Space>
        ),
      },
      {
        title: 'Type',
        dataIndex: 'contact_type',
        key: 'contact_type',
        width: 130,
        render: (value) => <ContactTypeTag value={value} />,
      },
      {
        title: 'Credit Limit',
        dataIndex: 'credit_limit',
        key: 'credit_limit',
        width: 150,
        align: 'right',
        render: (value) => formatMoney(value),
      },
      {
        title: 'Status',
        dataIndex: 'active',
        key: 'active',
        width: 120,
        render: (value) => <StatusTag active={value} />,
      },
    ],
    [token]
  );

  const contactFields = useMemo(
    () => [
      {
        name: 'name',
        label: 'Contact Name',
        type: 'text',
        required: true,
        col: 12,
      },
      {
        name: 'code',
        label: 'Code',
        type: 'text',
        col: 6,
      },
      {
        name: 'contact_type',
        label: 'Contact Type',
        type: 'select',
        required: true,
        col: 6,
        options: [
          { value: 'customer', label: 'Customer' },
          { value: 'supplier', label: 'Supplier' },
          { value: 'lead', label: 'Lead' },
        ],
      },
      {
        name: 'phone',
        label: 'Phone',
        type: 'text',
        col: 8,
      },
      {
        name: 'email',
        label: 'Email',
        type: 'text',
        col: 8,
      },
      {
        name: 'pan',
        label: 'PAN',
        type: 'text',
        col: 8,
      },
      {
        name: 'tax_registration_no',
        label: 'Tax Registration No',
        type: 'text',
        col: 8,
      },
      {
        name: 'tax_registration_type',
        label: 'Tax Type',
        type: 'select',
        col: 8,
        options: [
          { value: 'none', label: 'None' },
          { value: 'pan', label: 'PAN' },
          { value: 'vat', label: 'VAT' },
          { value: 'gstin', label: 'GSTIN' },
          { value: 'tan', label: 'TAN' },
          { value: 'ein', label: 'EIN' },
          { value: 'sales_tax_permit', label: 'Sales Tax Permit' },
          { value: 'state_tax_id', label: 'State Tax ID' },
        ],
      },
      {
        name: 'credit_limit',
        label: 'Credit Limit',
        type: 'number',
        col: 8,
      },
      {
        name: 'contact_group_id',
        label: 'Contact Group',
        type: 'fkSelect',
        readOnly: true,
        col: 12,
        fkUrl: api('/api/contact-groups/'),
        fkSearchParam: 'search',
        fkPageSize: 20,
        fkValueKey: 'id',
        fkLabelKey: 'name',
      },
      {
        name: 'accept_purchase',
        label: 'Accept Purchase',
        type: 'switch',
        col: 6,
      },
      {
        name: 'active',
        label: 'Active',
        type: 'switch',
        col: 6,
      },
      {
        name: 'address',
        label: 'Address',
        type: 'textarea',
        rows: 2,
        col: 24,
      },
    ],
    []
  );

  const groupInitialValues = {
    name: '',
    parent_id: id,
    description: '',
    active: true,
  };

  const contactInitialValues = {
    name: '',
    code: '',
    contact_type: 'customer',
    phone: '',
    email: '',
    pan: '',
    tax_registration_no: '',
    tax_registration_type: 'none',
    contact_group_id: id,
    credit_limit: 0,
    accept_purchase: false,
    active: true,
    address: '',
  };

  const actionItems = [
    {
      key: 'edit',
      icon: <EditOutlined />,
      label: 'Edit Group',
    },
    {
      key: 'toggle-status',
      icon: group?.active === false ? <CheckCircleOutlined /> : <StopOutlined />,
      label: group?.active === false ? 'Make Active' : 'Make Inactive',
    },
  ];

  const overviewContent = (
    <Space direction="vertical" size={14} style={{ width: '100%' }}>
      <div className="contact-group-show__stats">
        <StatCard
          title="Contacts"
          value={countLoading ? '-' : contactsCount}
          tone="blue"
          icon={<ContactsOutlined />}
        />

        <StatCard
          title="Sub Groups"
          value={countLoading ? '-' : childGroupsCount}
          tone="green"
          icon={<UsergroupAddOutlined />}
        />

        <StatCard
          title="Status"
          value={group?.active === false ? 'Inactive' : 'Active'}
          tone={group?.active === false ? 'red' : 'green'}
          icon={group?.active === false ? <StopOutlined /> : <CheckCircleOutlined />}
        />
      </div>

      <DetailsCard title="Overview">
        <InfoGrid
          rows={[
            { label: 'Group Name', value: group?.name },
            { label: 'Parent Group', value: parentName || '-' },
            { label: 'Status', value: <StatusTag active={group?.active} /> },
            { label: 'Contacts', value: contactsCount },
            { label: 'Sub Groups', value: childGroupsCount },
            { label: 'Created At', value: formatDateTime(group?.created_at) },
            { label: 'Updated At', value: formatDateTime(group?.updated_at) },
          ]}
        />
      </DetailsCard>

      <DetailsCard title="Description">
        <Paragraph style={{ margin: 0 }}>
          <DisplayText value={group?.description} />
        </Paragraph>
      </DetailsCard>
    </Space>
  );

  const contactsContent = (
    <DetailsCard title="Contacts">
      <ReusableCrud
        key={`contacts-${id}`}
        icon={<ContactsOutlined />}
        title="Contacts"
        apiUrl={api('/api/contacts/')}
        baseFilters={{ contact_group_id: id }}
        columns={contactColumns}
        fields={contactFields}
        validationSchema={Yup.object({
          name: Yup.string().required('Name is required'),
          contact_type: Yup.string().required('Contact type is required'),
          email: Yup.string().nullable().email('Invalid email'),
        })}
        crudInitialValues={contactInitialValues}
        transformPayload={(values) => ({
          ...values,
          name: clean(values.name),
          code: clean(values.code),
          phone: clean(values.phone),
          email: clean(values.email),
          pan: clean(values.pan),
          tax_registration_no: clean(values.tax_registration_no),
          tax_registration_type: clean(values.tax_registration_type) || 'none',
          address: clean(values.address),
          contact_group_id: id,
          credit_limit:
            values.credit_limit !== null &&
            values.credit_limit !== undefined &&
            values.credit_limit !== ''
              ? Number(values.credit_limit)
              : 0,
          accept_purchase: Boolean(values.accept_purchase),
          active: values.active !== false,
        })}
        form_ui="drawer"
        drawerWidth={860}
        enableServerPagination
        showSearch
        canView
        canAdd
        canEdit
        canDelete
        hasActions
        hasActionColumns
        activeTableRowFunction={contactTableRowFunction}
      />
    </DetailsCard>
  );

  const subGroupsContent = (
    <DetailsCard title="Sub Groups">
      <ReusableCrud
        key={`child-groups-${id}`}
        icon={<UsergroupAddOutlined />}
        title="Sub Groups"
        apiUrl={api('/api/contact-groups/')}
        baseFilters={{ parent_id: id }}
        columns={groupColumns}
        fields={groupFields}
        validationSchema={Yup.object({
          name: Yup.string().required('Name is required'),
        })}
        crudInitialValues={groupInitialValues}
        transformPayload={(values) => ({
          ...values,
          name: clean(values.name),
          parent_id: id,
          description: clean(values.description),
          active: values.active !== false,
        })}
        form_ui="modal"
        modalWidth={640}
        enableServerPagination
        showSearch
        canView
        canAdd
        canEdit
        canDelete
        hasActions
        hasActionColumns
        activeTableRowFunction={groupTableRowFunction}
      />
    </DetailsCard>
  );

  const tabs = [
    {
      key: 'overview',
      label: 'Overview',
      count: null,
      content: overviewContent,
    },
    {
      key: 'contacts',
      label: 'Contacts',
      count: contactsCount,
      content: contactsContent,
    },
    {
      key: 'groups',
      label: 'Sub Groups',
      count: childGroupsCount,
      content: subGroupsContent,
    },
  ];

  const activeContent = tabs.find((tab) => tab.key === activeTab)?.content || overviewContent;

  const uiVars = {
    '--cgs-bg': token.colorBgLayout,
    '--cgs-surface': token.colorBgContainer,
    '--cgs-elevated': token.colorBgElevated,
    '--cgs-soft': token.colorFillAlter,
    '--cgs-muted': token.colorFillQuaternary,
    '--cgs-border': token.colorBorderSecondary,
    '--cgs-border-strong': token.colorBorder,
    '--cgs-text': token.colorText,
    '--cgs-text-secondary': token.colorTextSecondary,
    '--cgs-text-tertiary': token.colorTextTertiary,
    '--cgs-primary': token.colorPrimary,
    '--cgs-primary-bg': token.colorPrimaryBg,
    '--cgs-primary-border': token.colorPrimaryBorder,
    '--cgs-success': token.colorSuccess,
    '--cgs-success-bg': token.colorSuccessBg,
    '--cgs-warning': token.colorWarning,
    '--cgs-warning-bg': token.colorWarningBg,
    '--cgs-error': token.colorError,
    '--cgs-error-bg': token.colorErrorBg,
    '--cgs-radius': `${token.borderRadiusLG}px`,
    '--cgs-radius-sm': `${token.borderRadius}px`,
    '--cgs-padding': `${token.padding}px`,
    '--cgs-padding-lg': `${token.paddingLG}px`,
    '--cgs-padding-sm': `${token.paddingSM}px`,
    '--cgs-padding-xs': `${token.paddingXS}px`,
    '--cgs-font-sm': `${token.fontSizeSM}px`,
    '--cgs-font': `${token.fontSize}px`,
    '--cgs-font-lg': `${token.fontSizeLG}px`,
    '--cgs-shadow': token.boxShadowTertiary,
  };

  return (
    <AuthenticatedLayout user={auth?.user}>
      {contextHolder}

      <Head title={groupName} />

      <style>{`
        .contact-group-show {
          min-height: calc(100vh - 64px);
          background: var(--cgs-bg);
          color: var(--cgs-text);
          padding: var(--cgs-padding);
        }

        .contact-group-show__shell {
          max-width: 1600px;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          gap: var(--cgs-padding);
        }

        .contact-group-show__bar-card.ant-card,
        .contact-group-show__rail-card.ant-card,
        .contact-group-show__card.ant-card,
        .contact-group-show__metric.ant-card {
          border-color: var(--cgs-border);
          border-radius: var(--cgs-radius);
          box-shadow: var(--cgs-shadow);
          overflow: hidden;
        }

        .contact-group-show__bar-card .ant-card-body {
          padding: var(--cgs-padding-sm) var(--cgs-padding);
        }

        .contact-group-show__bar {
          min-height: 50px;
          background: var(--cgs-surface);
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: var(--cgs-padding);
        }

        .contact-group-show__crumb {
          display: flex;
          align-items: center;
          gap: var(--cgs-padding-sm);
          min-width: 0;
        }

        .contact-group-show__title-wrap {
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .contact-group-show__title-wrap h4 {
          margin: 0 !important;
          line-height: 1.2 !important;
        }

        .contact-group-show__body {
          display: grid;
          grid-template-columns: 310px minmax(0, 1fr);
          gap: var(--cgs-padding);
          align-items: start;
        }

        .contact-group-show__rail {
          position: sticky;
          top: var(--cgs-padding);
          min-width: 0;
        }

        .contact-group-show__rail-card .ant-card-body {
          padding: var(--cgs-padding);
          display: flex;
          flex-direction: column;
          gap: var(--cgs-padding-sm);
        }

        .contact-group-show__entity {
          display: flex;
          align-items: flex-start;
          gap: var(--cgs-padding-sm);
          padding-bottom: var(--cgs-padding-sm);
          border-bottom: 1px solid var(--cgs-border);
        }

        .contact-group-show__entity-title {
          margin: 0 !important;
          font-size: 18px !important;
          line-height: 1.25 !important;
          color: var(--cgs-text);
          word-break: break-word;
        }

        .contact-group-show__entity-subtitle {
          display: block;
          margin-top: 3px;
          font-size: var(--cgs-font-sm);
        }

        .contact-group-show__tags {
          display: flex;
          flex-wrap: wrap;
          gap: 5px;
          margin-top: 8px;
        }

        .contact-group-show__tag {
          margin-inline-end: 0 !important;
          font-size: 11px;
          line-height: 18px;
          padding-inline: 7px;
          border-radius: 999px;
        }

        .contact-group-show__rail-summary {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: var(--cgs-padding-sm);
        }

        .contact-group-show__mini-stat {
          border: 1px solid var(--cgs-border);
          background: var(--cgs-muted);
          border-radius: var(--cgs-radius-sm);
          padding: 10px;
        }

        .contact-group-show__mini-stat span {
          display: block;
          font-size: 11px;
          color: var(--cgs-text-secondary);
          margin-bottom: 4px;
        }

        .contact-group-show__mini-stat strong {
          font-size: 20px;
          line-height: 1.15;
          color: var(--cgs-text);
        }

        .contact-group-show__rail-grid {
          border: 1px solid var(--cgs-border);
          border-radius: var(--cgs-radius-sm);
          overflow: hidden;
          background: var(--cgs-surface);
        }

        .contact-group-show__rail-row {
          display: grid;
          grid-template-columns: 96px minmax(0, 1fr);
          border-bottom: 1px solid var(--cgs-border);
          font-size: var(--cgs-font-sm);
        }

        .contact-group-show__rail-row:last-child {
          border-bottom: 0;
        }

        .contact-group-show__rail-label {
          padding: 8px 10px;
          background: var(--cgs-muted);
          color: var(--cgs-text-secondary);
          font-weight: 700;
          border-right: 1px solid var(--cgs-border);
        }

        .contact-group-show__rail-value {
          padding: 8px 10px;
          color: var(--cgs-text);
          word-break: break-word;
        }

        .contact-group-show__tabs {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .contact-group-show__tab {
          width: 100%;
          min-height: 38px;
          border: 1px solid transparent;
          border-radius: var(--cgs-radius-sm);
          background: transparent;
          color: var(--cgs-text-secondary);
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          padding: 0 11px;
          cursor: pointer;
          font-size: var(--cgs-font-sm);
          font-weight: 800;
          text-align: left;
          transition: 0.16s ease;
        }

        .contact-group-show__tab:hover {
          background: var(--cgs-muted);
          color: var(--cgs-text);
        }

        .contact-group-show__tab--active {
          background: var(--cgs-primary-bg);
          color: var(--cgs-primary);
          border-color: var(--cgs-primary-border);
        }

        .contact-group-show__tab-count {
          min-width: 22px;
          height: 20px;
          padding: 0 7px;
          border-radius: 999px;
          background: var(--cgs-surface);
          border: 1px solid var(--cgs-border);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: 11px;
        }

        .contact-group-show__main {
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: var(--cgs-padding);
          overflow: hidden;
        }

        .contact-group-show__stats {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: var(--cgs-padding-sm);
        }

        .contact-group-show__metric {
          position: relative;
        }

        .contact-group-show__metric::before {
          content: '';
          position: absolute;
          inset-inline: 0;
          top: 0;
          height: 3px;
          background: var(--cgs-border-strong);
        }

        .contact-group-show__metric--blue::before {
          background: var(--cgs-primary);
        }

        .contact-group-show__metric--green::before {
          background: var(--cgs-success);
        }

        .contact-group-show__metric--red::before {
          background: var(--cgs-error);
        }

        .contact-group-show__metric .ant-card-body {
          padding: var(--cgs-padding);
        }

        .contact-group-show__metric-inner {
          display: flex;
          align-items: flex-start;
          gap: var(--cgs-padding-sm);
        }

        .contact-group-show__metric-icon {
          width: 38px;
          height: 38px;
          border-radius: 999px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          color: var(--cgs-primary);
          background: var(--cgs-primary-bg);
          flex: none;
          font-size: 17px;
        }

        .contact-group-show__metric--green .contact-group-show__metric-icon {
          color: var(--cgs-success);
          background: var(--cgs-success-bg);
        }

        .contact-group-show__metric--red .contact-group-show__metric-icon {
          color: var(--cgs-error);
          background: var(--cgs-error-bg);
        }

        .contact-group-show__metric-content {
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .contact-group-show__metric-content strong {
          font-size: 22px;
          line-height: 1.15;
          color: var(--cgs-text);
          word-break: break-word;
        }

        .contact-group-show__card.ant-card {
          background: var(--cgs-surface);
        }

        .contact-group-show__card .ant-card-head {
          min-height: 46px;
          padding: 0 var(--cgs-padding);
          border-bottom: 1px solid var(--cgs-border);
          background: var(--cgs-elevated);
        }

        .contact-group-show__card .ant-card-head-title {
          font-size: var(--cgs-font);
          font-weight: 800;
          color: var(--cgs-text);
        }

        .contact-group-show__card .ant-card-body {
          padding: var(--cgs-padding);
          min-width: 0;
        }

        .contact-group-show__info-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          border: 1px solid var(--cgs-border);
          border-radius: var(--cgs-radius-sm);
          overflow: hidden;
          font-size: var(--cgs-font-sm);
          background: var(--cgs-surface);
        }

        .contact-group-show__info-item {
          display: grid;
          grid-template-columns: 150px minmax(0, 1fr);
          border-right: 1px solid var(--cgs-border);
          border-bottom: 1px solid var(--cgs-border);
          min-width: 0;
        }

        .contact-group-show__info-item:nth-child(2n) {
          border-right: 0;
        }

        .contact-group-show__info-item:nth-last-child(-n + 2) {
          border-bottom: 0;
        }

        .contact-group-show__info-label {
          padding: 9px 11px;
          background: var(--cgs-muted);
          color: var(--cgs-text-secondary);
          font-weight: 700;
          border-right: 1px solid var(--cgs-border);
          white-space: nowrap;
        }

        .contact-group-show__info-value {
          padding: 9px 11px;
          background: var(--cgs-surface);
          color: var(--cgs-text);
          word-break: break-word;
          min-width: 0;
        }

        .contact-group-show .ant-table {
          font-size: var(--cgs-font-sm);
        }

        .contact-group-show .ant-table-wrapper .ant-table-container {
          border-radius: var(--cgs-radius-sm);
          overflow: hidden;
        }

        .contact-group-show .ant-table-thead > tr > th {
          padding: 9px 11px !important;
          background: var(--cgs-muted) !important;
          font-weight: 800;
          color: var(--cgs-text-secondary) !important;
          border-color: var(--cgs-border) !important;
          white-space: nowrap;
        }

        .contact-group-show .ant-table-tbody > tr > td {
          padding: 8px 11px !important;
          vertical-align: middle;
          border-color: var(--cgs-border) !important;
        }

        .contact-group-show .ant-table-tbody > tr:hover > td {
          background: var(--cgs-muted) !important;
        }

        .contact-group-show__state {
          padding: var(--cgs-padding-lg);
          background: var(--cgs-surface);
          border: 1px solid var(--cgs-border);
          border-radius: var(--cgs-radius);
          box-shadow: var(--cgs-shadow);
        }

        @media (max-width: 1100px) {
          .contact-group-show__body {
            grid-template-columns: 1fr;
          }

          .contact-group-show__rail {
            position: static;
          }

          .contact-group-show__rail-card .ant-card-body {
            display: grid;
            grid-template-columns: auto minmax(0, 1fr);
            align-items: start;
          }

          .contact-group-show__entity,
          .contact-group-show__rail-summary,
          .contact-group-show__rail-grid,
          .contact-group-show__tabs {
            grid-column: 1 / -1;
          }

          .contact-group-show__tabs {
            flex-direction: row;
            overflow-x: auto;
          }

          .contact-group-show__tab {
            width: auto;
            min-width: 132px;
            white-space: nowrap;
            flex: none;
          }
        }

        @media (max-width: 768px) {
          .contact-group-show {
            padding: var(--cgs-padding-sm);
          }

          .contact-group-show__bar {
            align-items: stretch;
            flex-direction: column;
          }

          .contact-group-show__crumb {
            align-items: flex-start;
          }

          .contact-group-show__stats,
          .contact-group-show__info-grid,
          .contact-group-show__rail-summary {
            grid-template-columns: 1fr;
          }

          .contact-group-show__info-item {
            grid-template-columns: 1fr;
            border-right: 0;
          }

          .contact-group-show__info-item:nth-last-child(-n + 2) {
            border-bottom: 1px solid var(--cgs-border);
          }

          .contact-group-show__info-item:last-child {
            border-bottom: 0;
          }

          .contact-group-show__info-label {
            border-right: 0;
            border-bottom: 1px solid var(--cgs-border);
          }

          .contact-group-show__rail-row {
            grid-template-columns: 1fr;
          }

          .contact-group-show__rail-label {
            border-right: 0;
            border-bottom: 1px solid var(--cgs-border);
          }

          .contact-group-show__card .ant-card-body {
            overflow-x: auto;
          }
        }
      `}</style>

      <div className="contact-group-show" style={uiVars}>
        <div className="contact-group-show__shell">
          <Card className="contact-group-show__bar-card">
            <div className="contact-group-show__bar">
              <div className="contact-group-show__crumb">
                <Button type="text" icon={<ArrowLeftOutlined />} onClick={goBack}>
                  Contact Groups
                </Button>

                <div className="contact-group-show__title-wrap">
                  <Title level={4}>{groupName}</Title>
                  <Text type="secondary" ellipsis style={{ maxWidth: 640 }}>
                    {parentName ? `Under ${parentName}` : 'Root contact group'}
                  </Text>
                </div>
              </div>

              <Space size={8} wrap>
                <Button icon={<EditOutlined />} onClick={goEdit}>
                  Edit
                </Button>

                <Dropdown
                  menu={{
                    items: actionItems,
                    onClick: ({ key }) => {
                      if (key === 'edit') goEdit();
                      if (key === 'toggle-status') updateStatus();
                    },
                  }}
                  placement="bottomRight"
                  trigger={['click']}
                >
                  <Button loading={saving}>
                    Options <MoreOutlined />
                  </Button>
                </Dropdown>
              </Space>
            </div>
          </Card>

          {error ? (
            <div className="contact-group-show__state">
              <Alert
                type="error"
                message={error}
                showIcon
                closable
                onClose={() => setError('')}
              />
            </div>
          ) : null}

          {loading ? (
            <div className="contact-group-show__state">
              <Skeleton active paragraph={{ rows: 8 }} />
            </div>
          ) : null}

          {!loading && !group && !error ? (
            <div className="contact-group-show__state">
              <Empty description="Contact group not found" />
            </div>
          ) : null}

          {!loading && group ? (
            <div className="contact-group-show__body">
              <aside className="contact-group-show__rail">
                <Card className="contact-group-show__rail-card">
                  <div className="contact-group-show__entity">
                    <Avatar
                      size={48}
                      icon={<FolderOpenOutlined />}
                      style={{
                        background: token.colorPrimaryBg,
                        color: token.colorPrimary,
                        flex: 'none',
                      }}
                    />

                    <div style={{ minWidth: 0 }}>
                      <Title level={4} className="contact-group-show__entity-title">
                        {groupName}
                      </Title>

                      <Text type="secondary" className="contact-group-show__entity-subtitle">
                        {parentName ? `Under ${parentName}` : 'Root contact group'}
                      </Text>

                      <div className="contact-group-show__tags">
                        <StatusTag active={group?.active} />
                      </div>
                    </div>
                  </div>

                  <div className="contact-group-show__rail-summary">
                    <div className="contact-group-show__mini-stat">
                      <span>Contacts</span>
                      <strong>{countLoading ? '-' : contactsCount}</strong>
                    </div>

                    <div className="contact-group-show__mini-stat">
                      <span>Sub Groups</span>
                      <strong>{countLoading ? '-' : childGroupsCount}</strong>
                    </div>
                  </div>

                  <RailGrid
                    rows={[
                      { label: 'Parent', value: parentName || '-' },
                      { label: 'Status', value: <StatusTag active={group?.active} /> },
                      { label: 'Created', value: formatDateTime(group?.created_at) },
                      { label: 'Updated', value: formatDateTime(group?.updated_at) },
                    ]}
                  />

                  <div className="contact-group-show__tabs">
                    {tabs.map((tab) => (
                      <button
                        key={tab.key}
                        type="button"
                        className={`contact-group-show__tab ${
                          activeTab === tab.key ? 'contact-group-show__tab--active' : ''
                        }`}
                        onClick={() => setActiveTab(tab.key)}
                      >
                        <span>{tab.label}</span>
                        {tab.count !== null && tab.count !== undefined ? (
                          <span className="contact-group-show__tab-count">{tab.count}</span>
                        ) : null}
                      </button>
                    ))}
                  </div>
                </Card>
              </aside>

              <main className="contact-group-show__main">{activeContent}</main>
            </div>
          ) : null}
        </div>
      </div>
    </AuthenticatedLayout>
  );
}