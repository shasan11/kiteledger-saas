import { useEffect, useMemo, useState } from 'react';
import { Head, router, usePage } from '@inertiajs/react';
import {
  App,
  Badge,
  Button,
  Card,
  Col,
  Empty,
  Input,
  Result,
  Row,
  Space,
  Spin,
  Statistic,
  Tag,
  theme,
  Typography,
} from 'antd';
import {
  PlusOutlined,
  ReloadOutlined,
  SearchOutlined,
  ShopOutlined,
} from '@ant-design/icons';
import axios from 'axios';
import dayjs from 'dayjs';

import PosLayout from '@/Layouts/PosLayout.jsx';
import AddTerminalModal from '@/Components/Pos/AddTerminalModal';
import OpenShiftModal from '@/Components/Pos/OpenShiftModal';
import { api, money, showApiError } from './Shared/posHelpers';

const { Text, Title } = Typography;

const hasPermission = (permissions = [], permission) =>
  Array.isArray(permissions) && permissions.includes(permission);

const statusIndicator = {
  open: 'success',
  closed: 'default',
  attention: 'warning',
  risk: 'error',
};

const getAuthHeaders = () => {
  const token = localStorage.getItem('accessToken');

  return token
    ? {
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      }
    : {
        Accept: 'application/json',
      };
};

const safeRoute = (name, params = {}, fallback = '/') => {
  if (typeof route === 'function') {
    return route(name, params);
  }

  return fallback;
};

function CompactTerminalCard({
  terminal,
  locked,
  token,
  onClick,
  onOpenPos,
  onViewShifts,
}) {
  const shift = terminal?.current_shift;
  const isOpen = terminal?.status === 'open';
  const disabled = locked && !shift;

  const borderColor = isOpen ? token.colorSuccess : token.colorBorderSecondary;

  const stop = (handler) => (event) => {
    event.stopPropagation();
    handler?.();
  };

  return (
    <Card
      hoverable={!disabled}
      onClick={disabled ? undefined : onClick}
      size="small"
      style={{
        height: '100%',
        borderRadius: token.borderRadiusLG,
        border: `1px solid ${borderColor}`,
        background: token.colorBgContainer,
        boxShadow: isOpen ? token.boxShadowSecondary : 'none',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.55 : 1,
      }}
      styles={{
        body: {
          padding: 14,
        },
      }}
    >
      <Space direction="vertical" size={10} style={{ width: '100%' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: 10,
          }}
        >
          <div style={{ minWidth: 0 }}>
            <Space size={6} style={{ maxWidth: '100%' }}>
              <Badge status={statusIndicator[terminal?.status] || 'default'} />
              <Text strong ellipsis style={{ fontSize: 14, maxWidth: 190 }}>
                {terminal?.name || 'Unnamed terminal'}
              </Text>
            </Space>

            <div>
              <Text type="secondary" style={{ fontSize: 12 }}>
                {terminal?.code || 'No code'}
              </Text>
            </div>
          </div>

          {isOpen && shift ? (
            <Tag color="success" style={{ margin: 0 }}>
              Active
            </Tag>
          ) : (
            <Tag style={{ margin: 0 }}>
              {terminal?.active === false ? 'Inactive' : 'Idle'}
            </Tag>
          )}
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr auto',
            gap: '6px 12px',
            fontSize: 12,
          }}
        >
          <Text type="secondary">Branch</Text>
          <Text>{terminal?.branch?.name || '-'}</Text>

          <Text type="secondary">Warehouse</Text>
          <Text>{terminal?.warehouse?.name || '-'}</Text>

          {shift ? (
            <>
              <Text type="secondary">Cashier</Text>
              <Text>{shift?.cashier?.name || '-'}</Text>

              <Text type="secondary">Opened</Text>
              <Text>
                {shift?.opened_at ? dayjs(shift.opened_at).format('HH:mm') : '-'}
              </Text>

              <Text type="secondary">Cash</Text>
              <Text strong>Rs. {money(shift?.expected_cash ?? shift?.opening_cash)}</Text>
            </>
          ) : (
            <>
              <Text type="secondary">Last Shift</Text>
              <Text>
                {terminal?.last_shift?.shift_no ||
                  terminal?.lastShift?.shift_no ||
                  '-'}
              </Text>
            </>
          )}

          <Text type="secondary">Today</Text>
          <Text strong>Rs. {money(terminal?.today_sales)}</Text>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <Button
            size="small"
            type="primary"
            disabled={disabled}
            onClick={stop(onOpenPos || onClick)}
            block
          >
            {shift ? 'Sell' : 'Open Shift'}
          </Button>

          <Button size="small" onClick={stop(onViewShifts)}>
            Shifts
          </Button>
        </div>
      </Space>
    </Card>
  );
}

export default function TerminalSelection() {
  const { message } = App.useApp();
  const { props } = usePage();
  const { token } = theme.useToken();

  const permissions = props?.auth?.permissions || [];
  const branchContext = props?.branchContext || {};

  const canViewAllBranches = !!branchContext?.canViewAllBranches;

  const defaultBranchId =
    branchContext?.selectedBranchId ||
    props?.auth?.currentBranchId ||
    props?.auth?.user?.current_branch_id ||
    props?.auth?.user?.branch_id ||
    null;

  const canViewTerminals = hasPermission(permissions, 'pos.terminal.view');
  const canCreateTerminal = hasPermission(permissions, 'pos.terminal.create');
  const canOpenShift = hasPermission(permissions, 'pos.shift.open');
  const canSell = hasPermission(permissions, 'pos.sale.create');

  const [terminals, setTerminals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const [openingTerminal, setOpeningTerminal] = useState(null);
  const [openShiftLoading, setOpenShiftLoading] = useState(false);

  const [addTerminalOpen, setAddTerminalOpen] = useState(false);
  const [addTerminalLoading, setAddTerminalLoading] = useState(false);

  async function loadOverview() {
    setLoading(true);

    try {
      const params = {};

      if (!canViewAllBranches && defaultBranchId) {
        params.branch_id = defaultBranchId;
      }

      const response = await axios.get(api('/api/pos/terminals/overview'), {
        params,
        headers: getAuthHeaders(),
      });

      const list =
        response?.data?.terminals ||
        response?.data?.results ||
        response?.data?.data ||
        [];

      setTerminals(Array.isArray(list) ? list : []);
    } catch (error) {
      setTerminals([]);
      showApiError(message, error, 'Failed to load POS terminals.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (canViewTerminals) {
      void loadOverview();
      return;
    }

    setLoading(false);
  }, [canViewTerminals, canViewAllBranches, defaultBranchId]);

  const filteredTerminals = useMemo(() => {
    const q = search.trim().toLowerCase();

    if (!q) return terminals;

    return terminals.filter((terminal) =>
      [
        terminal?.name,
        terminal?.code,
        terminal?.branch?.name,
        terminal?.warehouse?.name,
        terminal?.location,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q))
    );
  }, [terminals, search]);

  const stats = useMemo(() => {
    const active = terminals.filter((terminal) => terminal?.status === 'open');
    const todaySales = terminals.reduce(
      (sum, terminal) => sum + Number(terminal?.today_sales || 0),
      0
    );

    return {
      total: terminals.length,
      active: active.length,
      todaySales,
    };
  }, [terminals]);

  function openSellingScreen(terminal, shift) {
    if (!canSell) {
      message.error('You can view terminals, but you do not have permission to sell.');
      return;
    }

    if (!terminal?.id || !shift?.id) {
      message.error('Terminal or shift information is missing.');
      return;
    }

    router.visit(
      safeRoute(
        'pos.screen',
        {
          pos_terminal_id: terminal.id,
          pos_shift_id: shift.id,
        },
        `/pos/screen?pos_terminal_id=${terminal.id}&pos_shift_id=${shift.id}`
      )
    );
  }

  function handleTerminalClick(terminal) {
    if (terminal?.current_shift?.id) {
      openSellingScreen(terminal, terminal.current_shift);
      return;
    }

    if (!canOpenShift) {
      message.warning('You do not have permission to open a POS shift.');
      return;
    }

    setOpeningTerminal(terminal);
  }

  async function submitOpenShift(values, form) {
    if (!openingTerminal?.id) return;

    setOpenShiftLoading(true);

    try {
      const response = await axios.post(
        api('/api/pos-shifts/open'),
        {
          pos_terminal_id: openingTerminal.id,
          branch_id: openingTerminal.branch_id || defaultBranchId,
          opening_cash: Number(values?.opening_cash || 0),
          notes: values?.notes?.trim() || null,
        },
        {
          headers: getAuthHeaders(),
        }
      );

      const shift =
        response?.data?.shift ||
        response?.data?.data ||
        response?.data;

      if (!shift?.id) {
        message.error('Shift opened, but the server did not return a shift ID.');
        await loadOverview();
        return;
      }

      form?.resetFields?.();
      setOpeningTerminal(null);
      message.success('Shift opened.');
      openSellingScreen(openingTerminal, shift);
    } catch (error) {
      showApiError(message, error, 'Failed to open shift.');
    } finally {
      setOpenShiftLoading(false);
    }
  }

  async function submitAddTerminal(values, form) {
    setAddTerminalLoading(true);

    try {
      await axios.post(
        api('/api/pos-terminals'),
        {
          ...values,
          branch_id: canViewAllBranches
            ? values?.branch_id || defaultBranchId
            : defaultBranchId,
          code: values?.code?.trim() || null,
          warehouse_id: values?.warehouse_id || null,
          cash_account_id: values?.cash_account_id || null,
          card_account_id: values?.card_account_id || null,
          online_account_id: values?.online_account_id || null,
          default_customer_id: values?.default_customer_id || null,
        },
        {
          headers: getAuthHeaders(),
        }
      );

      form?.resetFields?.();
      setAddTerminalOpen(false);
      message.success('Terminal created.');
      await loadOverview();
    } catch (error) {
      showApiError(message, error, 'Failed to create terminal.');
    } finally {
      setAddTerminalLoading(false);
    }
  }

  if (!canViewTerminals) {
    return (
      <PosLayout>
        <Head title="POS Control Center" />
        <div style={{ padding: '18px 24px' }}>
          <Result
            status="403"
            title="No terminal access"
            subTitle="You do not have permission to view POS terminals."
          />
        </div>
      </PosLayout>
    );
  }

  return (
    <PosLayout>
      <Head title="POS Control Center" />

      <div
        style={{
          minHeight: 'calc(100vh - 72px)',
          padding: '18px 24px',
          background: token.colorBgLayout,
        }}
      >
        <Space direction="vertical" size={12} style={{ width: '100%' }}>
          {/* Action bar */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
            <Space size={8} align="center">
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: token.borderRadiusLG,
                  display: 'grid',
                  placeItems: 'center',
                  background: token.colorPrimaryBg,
                  color: token.colorPrimary,
                }}
              >
                <ShopOutlined />
              </div>
              <Text strong style={{ fontSize: 14 }}>POS Control Center</Text>
              <Text type="secondary" style={{ fontSize: 12 }}>Select a terminal to start selling</Text>
            </Space>
            <Space size={8}>
              <Button size="small" icon={<ReloadOutlined />} onClick={loadOverview} loading={loading}>
                Refresh
              </Button>
              {canCreateTerminal && (
                <Button size="small" type="primary" icon={<PlusOutlined />} onClick={() => setAddTerminalOpen(true)}>
                  Add Terminal
                </Button>
              )}
            </Space>
          </div>

          <Row gutter={[12, 12]}>
            <Col xs={24} sm={8}>
              <Card
                size="small"
                style={{
                  border: `1px solid ${token.colorBorderSecondary}`,
                  borderRadius: token.borderRadiusLG,
                  background: token.colorBgContainer,
                }}
                styles={{
                  body: {
                    padding: '12px 14px',
                  },
                }}
              >
                <Statistic title="Terminals" value={stats.total} valueStyle={{ fontSize: 20 }} />
              </Card>
            </Col>

            <Col xs={24} sm={8}>
              <Card
                size="small"
                style={{
                  border: `1px solid ${token.colorBorderSecondary}`,
                  borderRadius: token.borderRadiusLG,
                  background: token.colorBgContainer,
                }}
                styles={{
                  body: {
                    padding: '12px 14px',
                  },
                }}
              >
                <Statistic
                  title="Active Shifts"
                  value={stats.active}
                  valueStyle={{
                    fontSize: 20,
                    color: token.colorSuccess,
                  }}
                />
              </Card>
            </Col>

            <Col xs={24} sm={8}>
              <Card
                size="small"
                style={{
                  border: `1px solid ${token.colorBorderSecondary}`,
                  borderRadius: token.borderRadiusLG,
                  background: token.colorBgContainer,
                }}
                styles={{
                  body: {
                    padding: '12px 14px',
                  },
                }}
              >
                <Statistic
                  title="Today's Sales"
                  value={stats.todaySales}
                  prefix="Rs."
                  precision={2}
                  valueStyle={{ fontSize: 20 }}
                />
              </Card>
            </Col>
          </Row>

          <Card
            size="small"
            style={{
              border: `1px solid ${token.colorBorderSecondary}`,
              borderRadius: token.borderRadiusLG,
              background: token.colorBgContainer,
            }}
            styles={{
              body: {
                padding: token.paddingSM,
              },
            }}
          >
            <Input
              allowClear
              prefix={<SearchOutlined />}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search terminal, code, branch, warehouse"
              style={{
                maxWidth: 420,
              }}
            />
          </Card>

          {loading ? (
            <div
              style={{
                minHeight: 240,
                display: 'grid',
                placeItems: 'center',
                background: token.colorBgContainer,
                border: `1px solid ${token.colorBorderSecondary}`,
                borderRadius: token.borderRadiusLG,
              }}
            >
              <Spin />
            </div>
          ) : filteredTerminals.length < 1 ? (
            <Card
              style={{
                border: `1px solid ${token.colorBorderSecondary}`,
                borderRadius: token.borderRadiusLG,
                background: token.colorBgContainer,
              }}
            >
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={
                  search
                    ? 'No terminals match your search.'
                    : 'No active POS terminals found.'
                }
              />
            </Card>
          ) : (
            <Row gutter={[12, 12]}>
              {filteredTerminals.map((terminal) => (
                <Col xs={24} sm={12} md={8} xl={6} key={terminal.id}>
                  <CompactTerminalCard
                    terminal={terminal}
                    locked={!canOpenShift}
                    token={token}
                    onClick={() => handleTerminalClick(terminal)}
                    onOpenPos={() => handleTerminalClick(terminal)}
                    onViewShifts={() =>
                      router.visit(
                        safeRoute(
                          'pos.shifts.index',
                          { pos_terminal_id: terminal.id },
                          `/pos/shifts?pos_terminal_id=${terminal.id}`
                        )
                      )
                    }
                  />
                </Col>
              ))}
            </Row>
          )}
        </Space>
      </div>

      <OpenShiftModal
        open={!!openingTerminal}
        terminal={openingTerminal}
        loading={openShiftLoading}
        onCancel={() => setOpeningTerminal(null)}
        onSubmit={submitOpenShift}
      />

      <AddTerminalModal
        open={addTerminalOpen}
        loading={addTerminalLoading}
        messageApi={message}
        defaultBranchId={defaultBranchId}
        canViewAllBranches={canViewAllBranches}
        onCancel={() => setAddTerminalOpen(false)}
        onSubmit={submitAddTerminal}
      />
    </PosLayout>
  );
}