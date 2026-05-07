import { useEffect, useMemo, useState } from 'react';
import { Head, router } from '@inertiajs/react';
import axios from 'axios';
import * as Yup from 'yup';
import {
  Alert,
  Avatar,
  Button,
  Card,
  Col,
  Dropdown,
  Empty,
  Row,
  Skeleton,
  Space,
  Statistic,
  Tabs,
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
  TeamOutlined,
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
  return value;
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
    <Card
      size="small"
      style={{
        borderRadius: token.borderRadiusLG,
        height: '100%',
        borderColor: token.colorBorderSecondary,
        background: token.colorBgContainer,
      }}
      styles={{
        body: {
          padding: token.padding,
        },
      }}
    >
      <Statistic
        title={
          <span style={{ fontSize: token.fontSizeSM, color: token.colorTextSecondary }}>
            {title}
          </span>
        }
        value={value}
        valueStyle={{
          fontSize: token.fontSizeHeading3,
          fontWeight: token.fontWeightStrong,
          color: colorMap[tone] || token.colorText,
          lineHeight: 1.2,
        }}
      />
    </Card>
  );
}

function InfoBlock({ label, value, token }) {
  return (
    <div>
      <div
        style={{
          fontSize: token.fontSizeSM,
          color: token.colorTextSecondary,
          marginBottom: token.marginXXS,
        }}
      >
        {label}
      </div>

      <div
        style={{
          fontSize: token.fontSize,
          fontWeight: token.fontWeightStrong,
          color: token.colorText,
          wordBreak: 'break-word',
        }}
      >
        <DisplayText value={value} />
      </div>
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
    router.visit(
      safeRoute(
        'crm.contact-groups.edit',
        id,
        `/crm/contact-groups/${id}/edit`
      )
    );
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
    clickableRow(
      safeRoute(
        'crm.contacts.show',
        record?.id,
        `/crm/contacts/${record?.id}`
      )
    );

  const groupTableRowFunction = (record) =>
    clickableRow(
      safeRoute(
        'crm.contact-groups.show',
        record?.id,
        `/crm/contact-groups/${record?.id}`
      )
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
      onClick: goEdit,
    },
    {
      key: 'toggle-status',
      icon: group?.active === false ? <CheckCircleOutlined /> : <StopOutlined />,
      label: group?.active === false ? 'Make Active' : 'Make Inactive',
      onClick: updateStatus,
    },
  ];

  return (
    <AuthenticatedLayout user={auth?.user}>
      {contextHolder}

      <Head title={groupName} />

      <div
        style={{
          minHeight: '100vh',
          background: token.colorBgLayout,
        }}
      >
        <div
          style={{
            height: token.controlHeightLG + token.paddingSM,
            background: token.colorBgContainer,
            borderBottom: `1px solid ${token.colorBorderSecondary}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingInline: token.paddingLG,
            position: 'sticky',
            top: 0,
            zIndex: 20,
          }}
        >
          <Space size={token.marginSM}>
            <Button
              type="text"
              icon={<ArrowLeftOutlined />}
              onClick={goBack}
              style={{
                fontWeight: token.fontWeightStrong,
                paddingLeft: 0,
              }}
            >
              Contact Groups
            </Button>

            <Text type="secondary">/</Text>

            <Text strong>{groupName}</Text>
          </Space>

          <Space>
            <Button icon={<EditOutlined />} onClick={goEdit}>
              Edit
            </Button>

            <Dropdown
              menu={{ items: actionItems }}
              placement="bottomRight"
              trigger={['click']}
            >
              <Button loading={saving} icon={<MoreOutlined />}>
                Options
              </Button>
            </Dropdown>
          </Space>
        </div>

        <div style={{ padding: token.paddingLG }}>
          {error && (
            <Alert
              type="error"
              message={error}
              showIcon
              closable
              onClose={() => setError('')}
              style={{ marginBottom: token.margin }}
            />
          )}

          {loading && (
            <Card
              style={{
                borderRadius: token.borderRadiusLG,
                borderColor: token.colorBorderSecondary,
              }}
            >
              <Skeleton active paragraph={{ rows: 8 }} />
            </Card>
          )}

          {!loading && !group && !error && (
            <Card
              style={{
                borderRadius: token.borderRadiusLG,
                borderColor: token.colorBorderSecondary,
              }}
            >
              <Empty description="Contact group not found" />
            </Card>
          )}

          {!loading && group && (
            <Space direction="vertical" size={token.margin} style={{ width: '100%' }}>
              <Card
                style={{
                  borderRadius: token.borderRadiusLG,
                  borderColor: token.colorBorderSecondary,
                  background: token.colorBgContainer,
                }}
                styles={{
                  body: {
                    padding: token.paddingLG,
                  },
                }}
              >
                <Row gutter={[token.marginLG, token.marginLG]} align="middle">
                  <Col xs={24} lg={10}>
                    <Space size={token.margin} align="start">
                      <Avatar
                        size={58}
                        icon={<FolderOpenOutlined />}
                        style={{
                          background: token.colorPrimaryBg,
                          color: token.colorPrimary,
                          fontSize: token.fontSizeHeading3,
                        }}
                      />

                      <div>
                        <Space size={token.marginXS} wrap>
                          <Title level={3} style={{ margin: 0, color: token.colorText }}>
                            {groupName}
                          </Title>

                          <StatusTag active={group?.active} />
                        </Space>

                        <Paragraph
                          type="secondary"
                          style={{
                            margin: `${token.marginXS}px 0 0`,
                            maxWidth: 680,
                          }}
                          ellipsis={{ rows: 2, expandable: true }}
                        >
                          {group?.description || 'No description has been added for this contact group.'}
                        </Paragraph>
                      </div>
                    </Space>
                  </Col>

                  <Col xs={24} lg={14}>
                    <Row gutter={[token.marginSM, token.marginSM]}>
                      <Col xs={24} sm={8}>
                        <StatCard
                          title="Contacts"
                          value={contactsCount}
                          tone="blue"
                          token={token}
                        />
                      </Col>

                      <Col xs={24} sm={8}>
                        <StatCard
                          title="Sub Groups"
                          value={childGroupsCount}
                          tone="green"
                          token={token}
                        />
                      </Col>

                      <Col xs={24} sm={8}>
                        <StatCard
                          title="Status"
                          value={group?.active === false ? 'Inactive' : 'Active'}
                          tone={group?.active === false ? 'red' : 'green'}
                          token={token}
                        />
                      </Col>
                    </Row>
                  </Col>
                </Row>
              </Card>

              <Row gutter={[token.margin, token.margin]}>
                <Col xs={24} lg={7} xl={6}>
                  <Card
                    title="Group Summary"
                    size="small"
                    style={{
                      borderRadius: token.borderRadiusLG,
                      borderColor: token.colorBorderSecondary,
                      background: token.colorBgContainer,
                    }}
                  >
                    <Space direction="vertical" size={token.margin} style={{ width: '100%' }}>
                      <InfoBlock label="Group Name" value={group?.name} token={token} />
                      <InfoBlock label="Parent Group" value={parentName} token={token} />
                      <InfoBlock label="Description" value={group?.description} token={token} />
                      <InfoBlock label="Created At" value={formatDateTime(group?.created_at)} token={token} />
                      <InfoBlock label="Updated At" value={formatDateTime(group?.updated_at)} token={token} />
                    </Space>
                  </Card>
                </Col>

                <Col xs={24} lg={17} xl={18}>
                  <Card
                    style={{
                      borderRadius: token.borderRadiusLG,
                      borderColor: token.colorBorderSecondary,
                      background: token.colorBgContainer,
                    }}
                    styles={{
                      body: {
                        padding: 0,
                      },
                    }}
                  >
                    <Tabs
                      defaultActiveKey="contacts"
                      size="large"
                      style={{
                        padding: `0 ${token.paddingLG}px ${token.paddingLG}px`,
                      }}
                      items={[
                        {
                          key: 'contacts',
                          label: (
                            <Space>
                              <ContactsOutlined />
                              Contacts
                            </Space>
                          ),
                          children: (
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
                          ),
                        },
                        {
                          key: 'groups',
                          label: (
                            <Space>
                              <TeamOutlined />
                              Sub Groups
                            </Space>
                          ),
                          children: (
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
                          ),
                        },
                      ]}
                    />
                  </Card>
                </Col>
              </Row>
            </Space>
          )}
        </div>
      </div>
    </AuthenticatedLayout>
  );
}