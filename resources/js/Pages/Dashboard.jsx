import React from "react";
import {
  Avatar,
  Button,
  Card,
  Col,
  List,
  Progress,
  Row,
  Space,
  Statistic,
  Table,
  Tag,
  Typography,
  theme,
} from "antd";
import {
  BankOutlined,
  CreditCardOutlined,
  DollarOutlined,
  EyeOutlined,
  FallOutlined,
  FileTextOutlined,
  PlusOutlined,
  RiseOutlined,
  WalletOutlined,
} from "@ant-design/icons";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";

const { Title, Text } = Typography;

const formatMoney = (amount) =>
  new Intl.NumberFormat("en-NP", {
    style: "currency",
    currency: "NPR",
    maximumFractionDigits: 0,
  }).format(amount);

const summaryCards = [
  {
    title: "Total Revenue",
    value: 2450000,
    icon: <RiseOutlined />,
    tone: "success",
    change: "+12.5%",
  },
  {
    title: "Total Expense",
    value: 875000,
    icon: <FallOutlined />,
    tone: "error",
    change: "+4.2%",
  },
  {
    title: "Net Profit",
    value: 1575000,
    icon: <DollarOutlined />,
    tone: "primary",
    change: "+18.3%",
  },
  {
    title: "Cash & Bank",
    value: 980000,
    icon: <BankOutlined />,
    tone: "purple",
    change: "+9.1%",
  },
];

const monthlyData = [
  { month: "Jan", income: 450000, expense: 210000, profit: 240000 },
  { month: "Feb", income: 520000, expense: 260000, profit: 260000 },
  { month: "Mar", income: 610000, expense: 300000, profit: 310000 },
  { month: "Apr", income: 780000, expense: 340000, profit: 440000 },
  { month: "May", income: 690000, expense: 280000, profit: 410000 },
  { month: "Jun", income: 850000, expense: 390000, profit: 460000 },
];

const expenseBreakdown = [
  { name: "Rent", value: 180000 },
  { name: "Salary", value: 390000 },
  { name: "Utilities", value: 75000 },
  { name: "Marketing", value: 120000 },
  { name: "Other", value: 110000 },
];

const transactions = [
  {
    key: 1,
    date: "2026-05-04",
    voucher: "JV-00045",
    account: "Sales Revenue",
    type: "Income",
    amount: 125000,
    status: "Approved",
  },
  {
    key: 2,
    date: "2026-05-03",
    voucher: "PV-00018",
    account: "Office Rent",
    type: "Expense",
    amount: 45000,
    status: "Pending",
  },
  {
    key: 3,
    date: "2026-05-02",
    voucher: "RV-00031",
    account: "Customer Receipt",
    type: "Receipt",
    amount: 80000,
    status: "Approved",
  },
  {
    key: 4,
    date: "2026-05-01",
    voucher: "BP-00012",
    account: "Supplier Payment",
    type: "Payment",
    amount: 65000,
    status: "Approved",
  },
];

const cashBankAccounts = [
  { name: "Cash in Hand", balance: 180000, icon: <WalletOutlined /> },
  { name: "Nabil Bank", balance: 520000, icon: <BankOutlined /> },
  { name: "Global IME Bank", balance: 280000, icon: <CreditCardOutlined /> },
];

export default function Dashboard() {
  const { token } = theme.useToken();

  const colors = {
    primary: token.colorPrimary,
    success: token.colorSuccess,
    error: token.colorError,
    warning: token.colorWarning,
    purple: token.purple || "#722ed1",
    text: token.colorText,
    textSecondary: token.colorTextSecondary,
    border: token.colorBorderSecondary,
    bg: token.colorBgLayout,
    card: token.colorBgContainer,
  };

  const getToneColor = (tone) => {
    if (tone === "success") return colors.success;
    if (tone === "error") return colors.error;
    if (tone === "purple") return colors.purple;
    return colors.primary;
  };

  const columns = [
    {
      title: "Date",
      dataIndex: "date",
      width: 120,
    },
    {
      title: "Voucher No",
      dataIndex: "voucher",
      render: (value) => <Text strong>{value}</Text>,
    },
    {
      title: "Account",
      dataIndex: "account",
    },
    {
      title: "Type",
      dataIndex: "type",
      render: (type) => {
        const colorMap = {
          Income: "green",
          Expense: "red",
          Receipt: "blue",
          Payment: "orange",
        };

        return <Tag color={colorMap[type]}>{type}</Tag>;
      },
    },
    {
      title: "Amount",
      dataIndex: "amount",
      align: "right",
      render: (amount) => <Text strong>{formatMoney(amount)}</Text>,
    },
    {
      title: "Status",
      dataIndex: "status",
      render: (status) => (
        <Tag color={status === "Approved" ? "green" : "gold"}>{status}</Tag>
      ),
    },
  ];

  const cardStyle = {
    borderRadius: token.borderRadiusLG,
    border: `1px solid ${token.colorBorderSecondary}`,
    boxShadow: token.boxShadowTertiary,
  };

  return (
    <AuthenticatedLayout>
      <div
        style={{
          padding: token.paddingLG,
          background: token.colorBgLayout,
          minHeight: "100vh",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: token.marginLG,
            gap: token.margin,
            flexWrap: "wrap",
          }}
        >
          <div>
            <Title level={3} style={{ margin: 0 }}>
              Accounting Dashboard
            </Title>
            <Text type="secondary">
              Financial overview, cash position and recent accounting activity
            </Text>
          </div>

          <Space>
            <Button icon={<EyeOutlined />}>View Reports</Button>
            <Button type="primary" icon={<PlusOutlined />}>
              New Voucher
            </Button>
          </Space>
        </div>

        <Row gutter={[token.margin, token.margin]}>
          {summaryCards.map((item) => {
            const color = getToneColor(item.tone);

            return (
              <Col xs={24} sm={12} lg={6} key={item.title}>
                <Card style={cardStyle} styles={{ body: { padding: 18 } }}>
                  <Space
                    align="start"
                    style={{
                      width: "100%",
                      justifyContent: "space-between",
                    }}
                  >
                    <div>
                      <Text type="secondary">{item.title}</Text>

                      <Statistic
                        value={item.value}
                        formatter={(value) => formatMoney(value)}
                        valueStyle={{
                          fontSize: 22,
                          fontWeight: 700,
                          marginTop: 4,
                          color: token.colorText,
                        }}
                      />

                      <Text style={{ color, fontWeight: 600 }}>
                        {item.change} this month
                      </Text>
                    </div>

                    <Avatar
                      size={42}
                      icon={item.icon}
                      style={{
                        background: token.colorFillSecondary,
                        color,
                      }}
                    />
                  </Space>
                </Card>
              </Col>
            );
          })}
        </Row>

        <Row gutter={[token.margin, token.margin]} style={{ marginTop: token.margin }}>
          <Col xs={24} lg={16}>
            <Card title="Income vs Expense" style={cardStyle}>
              <div style={{ height: 310 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke={colors.border} />
                    <XAxis dataKey="month" stroke={colors.textSecondary} />
                    <YAxis
                      stroke={colors.textSecondary}
                      tickFormatter={(value) => `${value / 1000}k`}
                    />
                    <Tooltip formatter={(value) => formatMoney(value)} />
                    <Legend />
                    <Bar
                      dataKey="income"
                      name="Income"
                      fill={colors.success}
                      radius={[6, 6, 0, 0]}
                    />
                    <Bar
                      dataKey="expense"
                      name="Expense"
                      fill={colors.error}
                      radius={[6, 6, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </Col>

          <Col xs={24} lg={8}>
            <Card title="Receivables & Payables" style={cardStyle}>
              <Space direction="vertical" size={18} style={{ width: "100%" }}>
                <div>
                  <Space style={{ justifyContent: "space-between", width: "100%" }}>
                    <Text strong>Receivables</Text>
                    <Text strong>{formatMoney(640000)}</Text>
                  </Space>
                  <Progress
                    percent={72}
                    strokeColor={colors.success}
                    trailColor={token.colorFillSecondary}
                  />
                </div>

                <div>
                  <Space style={{ justifyContent: "space-between", width: "100%" }}>
                    <Text strong>Payables</Text>
                    <Text strong>{formatMoney(390000)}</Text>
                  </Space>
                  <Progress
                    percent={43}
                    strokeColor={colors.error}
                    trailColor={token.colorFillSecondary}
                  />
                </div>

                <div style={{ height: 165 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={monthlyData}>
                      <defs>
                        <linearGradient id="profitGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop
                            offset="5%"
                            stopColor={colors.primary}
                            stopOpacity={0.28}
                          />
                          <stop
                            offset="95%"
                            stopColor={colors.primary}
                            stopOpacity={0}
                          />
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="month" hide />
                      <YAxis hide />
                      <Tooltip formatter={(value) => formatMoney(value)} />
                      <Area
                        type="monotone"
                        dataKey="profit"
                        name="Profit"
                        stroke={colors.primary}
                        fill="url(#profitGradient)"
                        strokeWidth={2}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </Space>
            </Card>
          </Col>
        </Row>

        <Row gutter={[token.margin, token.margin]} style={{ marginTop: token.margin }}>
          <Col xs={24} lg={8}>
            <Card title="Cash & Bank" style={cardStyle}>
              <List
                dataSource={cashBankAccounts}
                renderItem={(item) => (
                  <List.Item>
                    <List.Item.Meta
                      avatar={
                        <Avatar
                          icon={item.icon}
                          style={{
                            background: token.colorFillSecondary,
                            color: colors.primary,
                          }}
                        />
                      }
                      title={<Text strong>{item.name}</Text>}
                      description={formatMoney(item.balance)}
                    />
                  </List.Item>
                )}
              />
            </Card>
          </Col>

          <Col xs={24} lg={8}>
            <Card title="Expense Breakdown" style={cardStyle}>
              <div style={{ height: 260 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={expenseBreakdown}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={58}
                      outerRadius={88}
                      paddingAngle={3}
                    >
                      {expenseBreakdown.map((_, index) => (
                        <Cell
                          key={index}
                          fill={
                            [
                              colors.primary,
                              colors.success,
                              colors.warning,
                              colors.error,
                              colors.purple,
                            ][index]
                          }
                        />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => formatMoney(value)} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </Col>

          <Col xs={24} lg={8}>
            <Card title="Quick Summary" style={cardStyle}>
              <Space direction="vertical" size={14} style={{ width: "100%" }}>
                <SummaryLine label="Gross Margin" value="64.2%" color={colors.success} />
                <SummaryLine label="Expense Ratio" value="35.7%" color={colors.error} />
                <SummaryLine label="Collection Rate" value="72%" color={colors.primary} />
                <SummaryLine label="Pending Vouchers" value="8" color={colors.warning} />
              </Space>
            </Card>
          </Col>
        </Row>

        <Card
          title={
            <Space>
              <FileTextOutlined />
              Recent Transactions
            </Space>
          }
          extra={<Button type="link">View All</Button>}
          style={{
            ...cardStyle,
            marginTop: token.margin,
          }}
        >
          <Table
            columns={columns}
            dataSource={transactions}
            pagination={false}
            size="middle"
            scroll={{ x: 760 }}
          />
        </Card>
      </div>
    </AuthenticatedLayout>
  );
}

function SummaryLine({ label, value, color }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
      }}
    >
      <Text type="secondary">{label}</Text>
      <Text strong style={{ color }}>
        {value}
      </Text>
    </div>
  );
}