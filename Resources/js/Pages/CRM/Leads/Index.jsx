import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import ReusableCrud from "@/Components/ResuableCrud";
import { Head } from "@inertiajs/react";
import { Tag, Typography } from "antd";
import {
  UserOutlined,
  PhoneOutlined,
  MailOutlined,
  BankOutlined,
} from "@ant-design/icons";
import * as Yup from "yup";

const { Text } = Typography;

const statusOptions = [
  { value: "new", label: "New" },
  { value: "contacted", label: "Contacted" },
  { value: "qualified", label: "Qualified" },
  { value: "unqualified", label: "Unqualified" },
  { value: "converted", label: "Converted" },
  { value: "lost", label: "Lost" },
];

const priorityOptions = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "urgent", label: "Urgent" },
];

const leadSourceOptions = [
  { value: "website", label: "Website" },
  { value: "referral", label: "Referral" },
  { value: "facebook", label: "Facebook" },
  { value: "instagram", label: "Instagram" },
  { value: "linkedin", label: "LinkedIn" },
  { value: "google", label: "Google" },
  { value: "email", label: "Email" },
  { value: "phone", label: "Phone" },
  { value: "walk_in", label: "Walk In" },
  { value: "other", label: "Other" },
];

const industryOptions = [
  { value: "trading", label: "Trading" },
  { value: "manufacturing", label: "Manufacturing" },
  { value: "retail", label: "Retail" },
  { value: "wholesale", label: "Wholesale" },
  { value: "service", label: "Service" },
  { value: "logistics", label: "Logistics" },
  { value: "construction", label: "Construction" },
  { value: "hospitality", label: "Hospitality" },
  { value: "education", label: "Education" },
  { value: "healthcare", label: "Healthcare" },
  { value: "it", label: "IT" },
  { value: "other", label: "Other" },
];

const statusColor = {
  new: "blue",
  contacted: "cyan",
  qualified: "green",
  unqualified: "orange",
  converted: "purple",
  lost: "red",
};

const priorityColor = {
  low: "default",
  medium: "blue",
  high: "orange",
  urgent: "red",
};

const validationSchema = Yup.object().shape({
  lead_no: Yup.string().nullable().max(40, "Max 40 characters"),
  contact_id: Yup.string().nullable(),
  assigned_to_id: Yup.number().nullable(),
  converted_contact_id: Yup.string().nullable(),
  converted_deal_id: Yup.string().nullable(),

  name: Yup.string().required("Name is required").max(180, "Max 180 characters"),
  company_name: Yup.string().nullable().max(180, "Max 180 characters"),
  email: Yup.string().nullable().email("Invalid email").max(120, "Max 120 characters"),
  phone: Yup.string().nullable().max(40, "Max 40 characters"),
  mobile: Yup.string().nullable().max(40, "Max 40 characters"),
  website: Yup.string().nullable().max(180, "Max 180 characters"),

  address: Yup.string().nullable(),
  city: Yup.string().nullable().max(80, "Max 80 characters"),
  state: Yup.string().nullable().max(80, "Max 80 characters"),
  country: Yup.string().nullable().max(80, "Max 80 characters"),

  lead_source: Yup.string().nullable().max(80, "Max 80 characters"),
  industry: Yup.string().nullable().max(120, "Max 120 characters"),
  expected_value: Yup.number().nullable().min(0, "Must be 0 or more"),

  status: Yup.string()
    .nullable()
    .oneOf(["new", "contacted", "qualified", "unqualified", "converted", "lost", null]),
  priority: Yup.string()
    .nullable()
    .oneOf(["low", "medium", "high", "urgent", null]),

  next_follow_up_date: Yup.string().nullable(),
  last_contacted_at: Yup.string().nullable(),
  converted_at: Yup.string().nullable(),

  notes: Yup.string().nullable(),
  active: Yup.boolean().nullable(),
  is_system_generated: Yup.boolean().nullable(),
});

export default function Leads(props) {
  const columns = [
    {
      title: "Lead",
      dataIndex: "name",
      key: "name",
      sorter: true,
      width: 260,
      render: (_, record) => (
        <div style={{ lineHeight: 1.35 }}>
          <div style={{ fontWeight: 650, color: "#0f172a" }}>
            <UserOutlined style={{ marginRight: 6 }} />
            {record.name || "-"}
          </div>

          <div style={{ fontSize: 12, color: "#64748b", marginTop: 3 }}>
            {record.lead_no ? `${record.lead_no} · ` : ""}
            {record.company_name || "No company"}
          </div>
        </div>
      ),
    },
    {
      title: "Contact",
      key: "contact_info",
      width: 240,
      render: (_, record) => (
        <div style={{ lineHeight: 1.45 }}>
          <div>
            <PhoneOutlined style={{ marginRight: 6, color: "#64748b" }} />
            <Text>{record.mobile || record.phone || "-"}</Text>
          </div>

          <div style={{ fontSize: 12, color: "#64748b" }}>
            <MailOutlined style={{ marginRight: 6 }} />
            {record.email || "-"}
          </div>
        </div>
      ),
    },
    {
      title: "Company",
      dataIndex: "company_name",
      key: "company_name",
      sorter: true,
      width: 220,
      render: (value, record) => (
        <div style={{ lineHeight: 1.4 }}>
          <div>
            <BankOutlined style={{ marginRight: 6, color: "#64748b" }} />
            {value || "-"}
          </div>
          <div style={{ fontSize: 12, color: "#64748b" }}>
            {[record.city, record.state, record.country].filter(Boolean).join(", ") || "-"}
          </div>
        </div>
      ),
    },
    {
      title: "Source",
      dataIndex: "lead_source",
      key: "lead_source",
      sorter: true,
      width: 130,
      render: (value) => value ? <Tag>{String(value).replaceAll("_", " ")}</Tag> : "-",
    },
    {
      title: "Industry",
      dataIndex: "industry",
      key: "industry",
      sorter: true,
      width: 150,
      render: (value) => value ? <Tag>{String(value).replaceAll("_", " ")}</Tag> : "-",
    },
    {
      title: "Expected Value",
      dataIndex: "expected_value",
      key: "expected_value",
      sorter: true,
      align: "right",
      width: 150,
      render: (value) =>
        value !== null && value !== undefined
          ? Number(value).toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })
          : "0.00",
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      sorter: true,
      width: 130,
      render: (value) => (
        <Tag color={statusColor[value] || "default"}>
          {value ? String(value).replaceAll("_", " ").toUpperCase() : "NEW"}
        </Tag>
      ),
    },
    {
      title: "Priority",
      dataIndex: "priority",
      key: "priority",
      sorter: true,
      width: 120,
      render: (value) => (
        <Tag color={priorityColor[value] || "default"}>
          {value ? String(value).toUpperCase() : "MEDIUM"}
        </Tag>
      ),
    },
    {
      title: "Next Follow Up",
      dataIndex: "next_follow_up_date",
      key: "next_follow_up_date",
      sorter: true,
      width: 150,
      render: (value) => value || "-",
    },
    {
      title: "Active",
      dataIndex: "active",
      key: "active",
      sorter: true,
      width: 100,
      render: (active) => (
        <Tag color={active === false ? "red" : "green"}>
          {active === false ? "Inactive" : "Active"}
        </Tag>
      ),
    },
  ];

  const fields = [
    {
      type: "group",
      label: "Basic Information",
      col: 24,
      children: [
        {
          name: "lead_no",
          label: "Lead No",
          type: "text",
          placeholder: "Auto or manual lead number",
          col: 8,
        },
        {
          name: "name",
          label: "Lead Name",
          type: "text",
          required: true,
          placeholder: "Enter lead name",
          col: 8,
        },
        {
          name: "company_name",
          label: "Company Name",
          type: "text",
          placeholder: "Enter company name",
          col: 8,
        },
        {
          name: "contact_id",
          label: "Existing Contact",
          type: "fkSelect",
          fkUrl: "/api/contacts",
          fkValueKey: "id",
          fkLabelKey: "name",
          placeholder: "Search existing contact",
          col: 8,
        },
        {
          name: "assigned_to_id",
          label: "Assigned To",
          type: "fkSelect",
          fkUrl: "/api/hrm/users",
          fkValueKey: "id",
          fkLabelKey: "name",
          placeholder: "Assign user",
          col: 8,
        },
        {
          name: "expected_value",
          label: "Expected Value",
          type: "number",
          min: 0,
          placeholder: "0.00",
          col: 8,
        },
      ],
    },

    {
      type: "group",
      label: "Contact Details",
      col: 24,
      children: [
        {
          name: "email",
          label: "Email",
          type: "text",
          placeholder: "email@example.com",
          col: 8,
        },
        {
          name: "phone",
          label: "Phone",
          type: "text",
          placeholder: "Phone number",
          col: 8,
        },
        {
          name: "mobile",
          label: "Mobile",
          type: "text",
          placeholder: "Mobile number",
          col: 8,
        },
        {
          name: "website",
          label: "Website",
          type: "text",
          placeholder: "https://example.com",
          col: 8,
        },
        {
          name: "address",
          label: "Address",
          type: "textarea",
          rows: 2,
          placeholder: "Full address",
          col: 16,
        },
      ],
    },

    {
      type: "group",
      label: "Location",
      col: 24,
      children: [
        {
          name: "city",
          label: "City",
          type: "text",
          placeholder: "City",
          col: 8,
        },
        {
          name: "state",
          label: "State",
          type: "text",
          placeholder: "State",
          col: 8,
        },
        {
          name: "country",
          label: "Country",
          type: "text",
          placeholder: "Country",
          col: 8,
        },
      ],
    },

    {
      type: "group",
      label: "Lead Classification",
      col: 24,
      children: [
        {
          name: "lead_source",
          label: "Lead Source",
          type: "select",
          options: leadSourceOptions,
          placeholder: "Select source",
          col: 8,
        },
        {
          name: "industry",
          label: "Industry",
          type: "select",
          options: industryOptions,
          placeholder: "Select industry",
          col: 8,
        },
        {
          name: "status",
          label: "Status",
          type: "select",
          options: statusOptions,
          placeholder: "Select status",
          defaultValue: "new",
          col: 4,
        },
        {
          name: "priority",
          label: "Priority",
          type: "select",
          options: priorityOptions,
          placeholder: "Select priority",
          defaultValue: "medium",
          col: 4,
        },
      ],
    },

    {
      type: "group",
      label: "Follow Up",
      col: 24,
      children: [
        {
          name: "next_follow_up_date",
          label: "Next Follow Up Date",
          type: "datePicker",
          col: 8,
        },
        {
          name: "last_contacted_at",
          label: "Last Contacted At",
          type: "datePicker",
          col: 8,
        },
        {
          name: "converted_at",
          label: "Converted At",
          type: "datePicker",
          col: 8,
        },
        {
          name: "notes",
          label: "Notes",
          type: "textarea",
          rows: 3,
          placeholder: "Lead notes, conversation summary, follow-up details...",
          col: 24,
        },
      ],
    },

    {
      type: "group",
      label: "Conversion",
      col: 24,
      children: [
        {
          name: "converted_contact_id",
          label: "Converted Contact",
          type: "fkSelect",
          fkUrl: "/api/contacts",
          fkValueKey: "id",
          fkLabelKey: "name",
          placeholder: "Select converted contact",
          col: 12,
        },
        {
          name: "converted_deal_id",
          label: "Converted Deal",
          type: "fkSelect",
          fkUrl: "/api/deals",
          fkValueKey: "id",
          fkLabelKey: "name",
          placeholder: "Select converted deal",
          col: 12,
        },
      ],
    },

    {
      type: "group",
      label: "System",
      col: 24,
      children: [
        {
          name: "active",
          label: "Active",
          type: "switch",
          col: 6,
        },
        {
          name: "is_system_generated",
          label: "System Generated",
          type: "switch",
          col: 6,
        },
      ],
    },
  ];

  const crudInitialValues = {
    lead_no: "",
    contact_id: null,
    assigned_to_id: null,
    converted_contact_id: null,
    converted_deal_id: null,

    name: "",
    company_name: "",
    email: "",
    phone: "",
    mobile: "",
    website: "",
    address: "",
    city: "",
    state: "",
    country: "",

    lead_source: null,
    industry: null,
    expected_value: 0.00,
    status: "new",
    priority: "medium",

    next_follow_up_date: null,
    last_contacted_at: null,
    converted_at: null,
    notes: "",

    active: true,
    is_system_generated: false,
  };

  const anchorFilters = [
    {
      key: "active",
      label: "Active Leads",
      title: "Active Leads",
      params: { active: true },
    },
    {
      key: "new",
      label: "New",
      title: "New Leads",
      params: { status: "new", active: true },
    },
    {
      key: "contacted",
      label: "Contacted",
      title: "Contacted Leads",
      params: { status: "contacted", active: true },
    },
    {
      key: "qualified",
      label: "Qualified",
      title: "Qualified Leads",
      params: { status: "qualified", active: true },
    },
    {
      key: "converted",
      label: "Converted",
      title: "Converted Leads",
      params: { status: "converted", active: true },
    },
    {
      key: "lost",
      label: "Lost",
      title: "Lost Leads",
      params: { status: "lost", active: true },
    },
  ];

  return (
    <AuthenticatedLayout user={props.auth?.user}>
      <Head title="Leads" />

      <ReusableCrud
        title="Leads"
        apiUrl="/api/leads"
        columns={columns}
        fields={fields}
        validationSchema={validationSchema}
        crudInitialValues={crudInitialValues}
        form_ui="drawer"
        drawerWidth={1200}
        modalWidth={1100}
        showSearch={true}
        enableServerPagination={true}
        enableInactiveDrawer={true}
        pageParam="page"
        pageSizeParam="page_size"
        searchParam="search"
        activeParam="active"
        sortMode="ordering"
        orderingParam="ordering"
        defaultSortField="created_at"
        defaultSortOrder="descend"
        anchorFilters={anchorFilters}
        defaultAnchorKey="active"
        anchorSyncWithHash={true}
        canView={true}
        canAdd={true}
        canEdit={true}
        canDelete={true}
        hasActions={true}
        hasActionColumns={true}
        showRowActionMenu={true}
      />
    </AuthenticatedLayout>
  );
}