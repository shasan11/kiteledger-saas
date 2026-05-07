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
  Statistic,
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
import ReusableCrud from '@/Components/ResuableCrud';

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
      <Tag color="success" icon={<CheckCircleOutlined />}>
        Active
      </Tag>
    );
  }

  return (
    <Tag color="error" icon={<StopOutlined />}>
      Inactive
    </Tag>
  );
}

function ContactTypeTag({ value }) {
  if (value === 'customer') return <Tag color="blue">Customer</Tag>;
  if (value === 'supplier') return <Tag color="purple">Supplier</Tag>;
  if (value === 'lead') return <Tag color="gold">Lead</Tag>;

  return <Tag>{titleCase(value || 'Unknown')}</Tag>;
}

function DisplayText({ value }) {
  if (isBlank(value)) return <Text type="secondary">Not Available</Text>;
  return <span>{value}</span>;
}

function DetailsCard({ title, extra, children }) {
  return (
    <Card className="contact-group-show__card" title={title} extra={extra} bordered={false}>
      {children}
    </Card>
  );
}

function StatCard({ title, value, tone = 'default', token }) {
  const colorMap = {
    default: token.colorText,
    blue: token.colorPrimary,
    green: token.colorSuccess,
    orange: token.colorWarning,
    red: token.colorError,
  };

  return (
    <Card className="contact-group-show__metric" bordered={false}>
      <Statistic
        title={
          <span style={{ fontSize: token.fontSizeSM, color: token.colorTextSecondary }}>
            {title}
          </span>
        }
        value={value}
        valueStyle={{
          fontSize: 19,
          fontWeight: 700,
          color: colorMap[tone] || token.colorText,
          lineHeight: 1.2,
        }}
      />
    </Card>
  );
}

function InfoGrid({ rows = [] }) {
  return (
    <div className="contact-group-show__info-grid">
      {rows.filter(Boolean).map((row) => (
        <div className="contact-group-show__info-item" key={row.label}>
          <div className="contact-group-show__info-label">{row.label}</div>
          <div className="contact-group-show__info-value">{row.value ?? '-'}</div>
        </div>
      ))}
    </div>
  );
}

function RailGrid({ rows = [] }) {
  return (
    <div className="contact-group-show__rail-grid">
      {rows.filter(Boolean).map((row) => (
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
    onMouseEnter: (event) => {
      event.currentTarget.style.background = token.colorFillQuaternary;
    },
    onMouseLeave: (event) => {
      event.currentTarget.style.background = '';
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
        width: 280,
        render: (value, record) => (
          <Space size={token.marginSM}>
            <Avatar
              size={34}
              icon={<FolderOpenOutlined />}
              style={{
                background: token.colorPrimaryBg,
                color: token.colorPrimary,
              }}
            />

            <div style={{ minWidth: 0 }}>
              <Text strong ellipsis style={{ display: 'block', maxWidth: 190 }}>
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
              size={34}
              style={{
                background: token.colorPrimaryBg,
                color: token.colorPrimary,
                fontWeight: token.fontWeightStrong,
              }}
            >
              {initials(value)}
            </Avatar>

            <div style={{ minWidth: 0 }}>
              <Text strong ellipsis style={{ display: 'block', maxWidth: 240 }}>
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
    <Space direction="vertical" size={10} style={{ width: '100%' }}>
      <div className="contact-group-show__stats">
        <StatCard
          title="Contacts"
          value={countLoading ? '-' : contactsCount}
          tone="blue"
          token={token}
        />

        <StatCard
          title="Sub Groups"
          value={countLoading ? '-' : childGroupsCount}
          tone="green"
          token={token}
        />

        <StatCard
          title="Status"
          value={group?.active === false ? 'Inactive' : 'Active'}
          tone={group?.active === false ? 'red' : 'green'}
          token={token}
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

  return (
    <AuthenticatedLayout user={auth?.user}>
      {contextHolder}

      <Head title={groupName} />

      <style>{`
        .contact-group-show {
          min-height: calc(100vh - 64px);
          background: ${token.colorBgLayout};
        }

        .contact-group-show__bar {
          height: 44px;
          background: ${token.colorBgContainer};
          border-bottom: 1px solid ${token.colorBorderSecondary};
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 12px;
          position: sticky;
          top: 0;
          z-index: 20;
        }

        .contact-group-show__crumb {
          display: flex;
          align-items: center;
          gap: 8px;
          min-width: 0;
        }

        .contact-group-show__body {
          display: grid;
          grid-template-columns: 250px minmax(0, 1fr);
          gap: 8px;
        }

        .contact-group-show__rail {
          background: ${token.colorBgContainer};
          border-right: 1px solid ${token.colorBorderSecondary};
          min-height: calc(100vh - 108px);
          padding: 12px;
        }

        .contact-group-show__entity {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          padding-bottom: 12px;
          border-bottom: 1px solid ${token.colorBorderSecondary};
        }

        .contact-group-show__entity-title {
          margin: 0 !important;
          font-size: 15px !important;
          line-height: 1.25 !important;
          color: ${token.colorText};
          word-break: break-word;
        }

        .contact-group-show__entity-subtitle {
          display: block;
          margin-top: 2px;
          font-size: 12px;
        }

        .contact-group-show__tags {
          display: flex;
          flex-wrap: wrap;
          gap: 4px;
          margin-top: 6px;
        }

        .contact-group-show__rail-summary {
          padding: 10px 0;
          border-bottom: 1px solid ${token.colorBorderSecondary};
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
        }

        .contact-group-show__mini-stat {
          border: 1px solid ${token.colorBorderSecondary};
          background: ${token.colorFillQuaternary};
          border-radius: ${token.borderRadius}px;
          padding: 8px;
        }

        .contact-group-show__mini-stat span {
          display: block;
          font-size: 11px;
          color: ${token.colorTextSecondary};
          margin-bottom: 2px;
        }

        .contact-group-show__mini-stat strong {
          font-size: 15px;
          color: ${token.colorText};
        }

        .contact-group-show__rail-grid {
          margin-top: 10px;
          border: 1px solid ${token.colorBorderSecondary};
          border-bottom: 0;
        }

        .contact-group-show__rail-row {
          display: grid;
          grid-template-columns: 78px minmax(0, 1fr);
          border-bottom: 1px solid ${token.colorBorderSecondary};
          font-size: 12px;
        }

        .contact-group-show__rail-label {
          padding: 6px;
          background: ${token.colorFillAlter};
          color: ${token.colorTextSecondary};
          font-weight: 600;
          border-right: 1px solid ${token.colorBorderSecondary};
        }

        .contact-group-show__rail-value {
          padding: 6px;
          color: ${token.colorText};
          word-break: break-word;
        }

        .contact-group-show__tabs {
          padding-top: 10px;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .contact-group-show__tab {
          width: 100%;
          height: 34px;
          border: 0;
          border-radius: ${token.borderRadius}px;
          background: transparent;
          color: ${token.colorTextSecondary};
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 9px;
          cursor: pointer;
          font-size: 12px;
          font-weight: 600;
          text-align: left;
        }

        .contact-group-show__tab:hover {
          background: ${token.colorFillAlter};
          color: ${token.colorText};
        }

        .contact-group-show__tab--active {
          background: ${token.colorPrimaryBg};
          color: ${token.colorPrimary};
        }

        .contact-group-show__main {
          padding: 8px;
          display: flex;
          flex-direction: column;
          gap: 10px;
          min-width: 0;
          overflow: hidden;
        }

        .contact-group-show__stats {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 10px;
        }

        .contact-group-show__card.ant-card,
        .contact-group-show__metric.ant-card {
          border-radius: ${token.borderRadius}px;
          box-shadow: none;
          border: 0;
        }

        .contact-group-show__card .ant-card-head {
          min-height: 38px;
          padding: 0 10px;
          border-bottom: 1px solid ${token.colorBorderSecondary};
        }

        .contact-group-show__card .ant-card-head-title {
          font-size: 13px;
          font-weight: 700;
          color: ${token.colorText};
        }

        .contact-group-show__card .ant-card-body {
          padding: 10px;
          min-width: 0;
        }

        .contact-group-show__metric .ant-card-body {
          padding: 10px;
          min-height: 76px;
        }

        .contact-group-show__info-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          border: 1px solid ${token.colorBorderSecondary};
          border-right: 0;
          border-bottom: 0;
          font-size: 12px;
        }

        .contact-group-show__info-item {
          display: grid;
          grid-template-columns: 150px minmax(0, 1fr);
          border-right: 1px solid ${token.colorBorderSecondary};
          border-bottom: 1px solid ${token.colorBorderSecondary};
          min-width: 0;
        }

        .contact-group-show__info-label {
          padding: 7px 8px;
          background: ${token.colorFillAlter};
          color: ${token.colorTextSecondary};
          font-weight: 600;
          border-right: 1px solid ${token.colorBorderSecondary};
          white-space: nowrap;
        }

        .contact-group-show__info-value {
          padding: 7px 8px;
          background: ${token.colorBgContainer};
          color: ${token.colorText};
          word-break: break-word;
          min-width: 0;
        }

        .contact-group-show .ant-table {
          font-size: 12px;
        }

        .contact-group-show .ant-table-thead > tr > th {
          padding: 7px 8px !important;
          background: ${token.colorFillAlter} !important;
          font-weight: 700;
          color: ${token.colorTextSecondary};
          white-space: nowrap;
        }

        .contact-group-show .ant-table-tbody > tr > td {
          padding: 6px 8px !important;
          vertical-align: middle;
        }

        .contact-group-show .ant-tag {
          margin-inline-end: 0;
          font-size: 11px;
          line-height: 18px;
          padding-inline: 6px;
        }

        .contact-group-show .ant-card .ant-card {
          border: 1px solid ${token.colorBorderSecondary};
        }

        @media (max-width: 992px) {
          .contact-group-show__body {
            grid-template-columns: 1fr;
          }

          .contact-group-show__rail {
            min-height: auto;
            border-right: 0;
            border-bottom: 1px solid ${token.colorBorderSecondary};
          }

          .contact-group-show__tabs {
            flex-direction: row;
            overflow-x: auto;
          }

          .contact-group-show__tab {
            width: auto;
            white-space: nowrap;
            flex: none;
          }

          .contact-group-show__stats,
          .contact-group-show__info-grid {
            grid-template-columns: 1fr;
          }

          .contact-group-show__info-item {
            grid-template-columns: 130px minmax(0, 1fr);
          }

          .contact-group-show__card .ant-card-body {
            overflow-x: auto;
          }
        }
      `}</style>

      <div className="contact-group-show">
        <div className="contact-group-show__bar">
          <div className="contact-group-show__crumb">
            <Button type="text" size="small" icon={<ArrowLeftOutlined />} onClick={goBack}>
              Contact Groups
            </Button>

            <Text type="secondary">/</Text>

            <Text strong ellipsis style={{ maxWidth: 420 }}>
              {groupName}
            </Text>
          </div>

          <Space size={6}>
            <Button size="small" icon={<EditOutlined />} onClick={goEdit}>
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
              <Button size="small" loading={saving}>
                Options <MoreOutlined />
              </Button>
            </Dropdown>
          </Space>
        </div>

        {error ? (
          <div style={{ padding: 12 }}>
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
          <div style={{ padding: 18 }}>
            <Skeleton active paragraph={{ rows: 8 }} />
          </div>
        ) : null}

        {!loading && !group && !error ? (
          <div style={{ padding: 18 }}>
            <Empty description="Contact group not found" />
          </div>
        ) : null}

        {!loading && group ? (
          <div className="contact-group-show__body">
            <aside className="contact-group-show__rail">
              <div className="contact-group-show__entity">
                <Avatar
                  size={42}
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
                      <span>{tab.count}</span>
                    ) : null}
                  </button>
                ))}
              </div>
            </aside>

            <main className="contact-group-show__main">{activeContent}</main>
          </div>
        ) : null}
      </div>
    </AuthenticatedLayout>
  );
}