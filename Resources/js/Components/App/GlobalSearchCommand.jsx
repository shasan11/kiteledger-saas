import { router, usePage } from '@inertiajs/react';
import {
    BankOutlined,
    BarcodeOutlined,
    CalendarOutlined,
    FileSearchOutlined,
    SearchOutlined,
    ShopOutlined,
    TagsOutlined,
} from '@ant-design/icons';
import {
    Empty,
    Input,
    Modal,
    Space,
    Spin,
    Tag,
    Typography,
    theme,
} from 'antd';
import axios from 'axios';
import dayjs from 'dayjs';
import { useEffect, useMemo, useRef, useState } from 'react';

const { Text, Title } = Typography;
const STORAGE_KEY = 'kiteledger.global-search.branch';
const BACKEND_BASE = import.meta.env.VITE_APP_BACKEND_URL || '';

const GROUP_ICONS = {
    master: <BankOutlined />,
    crm: <ShopOutlined />,
    accounting: <BankOutlined />,
    sales: <FileSearchOutlined />,
    purchase: <FileSearchOutlined />,
    inventory: <BarcodeOutlined />,
    pos: <ShopOutlined />,
    hrm: <TagsOutlined />,
    project: <CalendarOutlined />,
    reports: <FileSearchOutlined />,
};

const flattenGroups = (groups = []) =>
    groups.flatMap((group) =>
        (group.items || []).map((item) => ({
            ...item,
            groupKey: group.key,
            groupLabel: group.module,
        })),
    );

const formatDate = (value) => {
    if (!value) return null;

    const parsed = dayjs(value);

    return parsed.isValid() ? parsed.format('DD MMM YYYY') : value;
};

const shortcutLabel = () =>
    typeof navigator !== 'undefined' && /mac/i.test(navigator.platform)
        ? 'Cmd K'
        : 'Ctrl K';

const api = (path) => `${BACKEND_BASE}${path}`;

const authHeaders = () => {
    if (typeof window === 'undefined') {
        return {
            Accept: 'application/json',
            'Content-Type': 'application/json',
        };
    }

    const token = window.localStorage.getItem('accessToken');

    return {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
};

export default function GlobalSearchCommand({
    branchContext = {},
    compact = false,
    className,
    style,
}) {
    const { token } = theme.useToken();
    const page = usePage();
    const inputRef = useRef(null);
    const requestRef = useRef(null);
    const debounceRef = useRef(null);

    const canViewAllBranches = Boolean(branchContext?.canViewAllBranches);
    const branchOptions = Array.isArray(branchContext?.branches)
        ? branchContext.branches
        : [];
    const defaultBranchId = branchContext?.selectedBranchId || branchOptions[0]?.id || null;
    const allBranchOption = canViewAllBranches
        ? [{ id: 'all', name: 'All Branches', code: 'ALL', active: true }]
        : [];

    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [loading, setLoading] = useState(false);
    const [groups, setGroups] = useState([]);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [error, setError] = useState('');
    const [selectedBranchId, setSelectedBranchId] = useState(() => {
        if (typeof window === 'undefined') {
            return canViewAllBranches ? defaultBranchId || 'all' : defaultBranchId;
        }

        const saved = window.localStorage.getItem(STORAGE_KEY);

        if (saved === 'all' && canViewAllBranches) {
            return 'all';
        }

        if (saved && branchOptions.some((branch) => branch.id === saved)) {
            return saved;
        }

        return canViewAllBranches ? defaultBranchId || 'all' : defaultBranchId;
    });

    const flatItems = useMemo(() => flattenGroups(groups), [groups]);
    const selectedItem = flatItems[selectedIndex] || null;
    const searchHint = shortcutLabel();

    useEffect(() => {
        if (typeof window === 'undefined' || !selectedBranchId) {
            return;
        }

        window.localStorage.setItem(STORAGE_KEY, selectedBranchId);
    }, [selectedBranchId]);

    useEffect(() => {
        const onKeyDown = (event) => {
            const isShortcut =
                (event.ctrlKey || event.metaKey) &&
                event.key.toLowerCase() === 'k';

            if (!isShortcut) {
                return;
            }

            event.preventDefault();
            setOpen(true);
        };

        window.addEventListener('keydown', onKeyDown);

        return () => window.removeEventListener('keydown', onKeyDown);
    }, []);

    useEffect(() => {
        if (!open) {
            return;
        }

        const focusTimer = window.setTimeout(() => {
            inputRef.current?.focus?.({ cursor: 'end' });
        }, 30);

        return () => window.clearTimeout(focusTimer);
    }, [open]);

    useEffect(() => {
        setSelectedIndex(0);
    }, [groups]);

    useEffect(() => {
        if (!open) {
            return;
        }

        if (debounceRef.current) {
            window.clearTimeout(debounceRef.current);
        }

        if (requestRef.current) {
            requestRef.current.abort();
            requestRef.current = null;
        }

        const trimmed = query.trim();

        if (trimmed.length < 2) {
            setLoading(false);
            setError('');
            setGroups([]);
            return;
        }

        debounceRef.current = window.setTimeout(async () => {
            const controller = new AbortController();
            requestRef.current = controller;
            setLoading(true);
            setError('');

            try {
                const params = {
                    q: trimmed,
                    limit: 5,
                };

                if (selectedBranchId) {
                    params.branch_id = selectedBranchId;
                }

                const response = await axios.get(api('/api/global-search'), {
                    headers: authHeaders(),
                    params,
                    signal: controller.signal,
                });

                setGroups(Array.isArray(response.data?.groups) ? response.data.groups : []);
            } catch (requestError) {
                if (
                    axios.isCancel?.(requestError) ||
                    requestError?.name === 'CanceledError' ||
                    requestError?.code === 'ERR_CANCELED'
                ) {
                    return;
                }

                setGroups([]);
                setError(
                    requestError?.response?.data?.message ||
                        'Search is temporarily unavailable.',
                );
            } finally {
                if (requestRef.current === controller) {
                    requestRef.current = null;
                }

                setLoading(false);
            }
        }, 250);

        return () => {
            if (debounceRef.current) {
                window.clearTimeout(debounceRef.current);
            }
        };
    }, [open, query, selectedBranchId]);

    useEffect(() => {
        return () => {
            if (debounceRef.current) {
                window.clearTimeout(debounceRef.current);
            }

            if (requestRef.current) {
                requestRef.current.abort();
            }
        };
    }, []);

    const closePalette = () => {
        setOpen(false);
        setLoading(false);
        setError('');
    };

    const openSelected = (item) => {
        if (!item?.url) {
            return;
        }

        closePalette();
        router.visit(item.url, {
            preserveScroll: false,
            onFinish: () => {
                setQuery('');
                setGroups([]);
            },
        });
    };

    const onPaletteKeyDown = (event) => {
        if (event.key === 'ArrowDown') {
            event.preventDefault();

            if (!flatItems.length) {
                return;
            }

            setSelectedIndex((current) => (current + 1) % flatItems.length);
            return;
        }

        if (event.key === 'ArrowUp') {
            event.preventDefault();

            if (!flatItems.length) {
                return;
            }

            setSelectedIndex((current) =>
                current === 0 ? flatItems.length - 1 : current - 1,
            );
            return;
        }

        if (event.key === 'Enter' && selectedItem) {
            event.preventDefault();
            openSelected(selectedItem);
        }
    };

    const trigger = compact ? (
        <button
            type="button"
            onClick={() => setOpen(true)}
            className={className}
            style={style}
        >
            <SearchOutlined />
        </button>
    ) : (
        <button
            type="button"
            onClick={() => setOpen(true)}
            className={className}
            style={style}
        >
            <span className="global-search-command__trigger-icon">
                <SearchOutlined />
            </span>
            <span className="global-search-command__trigger-copy">
                <span className="global-search-command__trigger-placeholder">
                    Search invoices, customers, products...
                </span>
                <span className="global-search-command__trigger-shortcut">
                    {searchHint}
                </span>
            </span>
        </button>
    );

    return (
        <>
            {trigger}

            <Modal
                open={open}
                onCancel={closePalette}
                footer={null}
                width={860}
                destroyOnClose={false}
                centered
                styles={{
                    body: {
                        padding: 0,
                        background: token.colorBgElevated,
                        borderRadius: token.borderRadiusLG,
                        overflow: 'hidden',
                    },
                }}
            >
                <div
                    className="global-search-command"
                    onKeyDown={onPaletteKeyDown}
                >
                    <div className="global-search-command__toolbar">
                        <Input
                            ref={inputRef}
                            value={query}
                            onChange={(event) => setQuery(event.target.value)}
                            size="large"
                            allowClear
                            prefix={<SearchOutlined style={{ color: token.colorTextTertiary }} />}
                            placeholder="Search invoices, customers, products, vouchers..."
                            variant="borderless"
                            className="global-search-command__input"
                        />

                        {canViewAllBranches && (
                            <select
                                value={selectedBranchId || 'all'}
                                onChange={(event) => setSelectedBranchId(event.target.value)}
                                className="global-search-command__branch-select"
                            >
                                {allBranchOption.concat(branchOptions).map((branch) => (
                                    <option key={branch.id} value={branch.id}>
                                        {branch.name}
                                    </option>
                                ))}
                            </select>
                        )}
                    </div>

                    <div className="global-search-command__status">
                        <Text type="secondary">
                            {query.trim().length < 2
                                ? 'Type at least 2 characters'
                                : loading
                                  ? 'Searching across your ERP modules...'
                                  : `${flatItems.length} result${flatItems.length === 1 ? '' : 's'} found`}
                        </Text>

                        <Text type="secondary">{searchHint}</Text>
                    </div>

                    <div className="global-search-command__results">
                        {loading && (
                            <div className="global-search-command__centered">
                                <Spin />
                            </div>
                        )}

                        {!loading && error && (
                            <div className="global-search-command__centered">
                                <Empty
                                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                                    description={error}
                                />
                            </div>
                        )}

                        {!loading && !error && query.trim().length >= 2 && !groups.length && (
                            <div className="global-search-command__centered">
                                <Empty
                                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                                    description="No results found"
                                />
                            </div>
                        )}

                        {!loading &&
                            !error &&
                            groups.map((group) => (
                                <div key={group.key} className="global-search-command__group">
                                    <div className="global-search-command__group-header">
                                        <Space size={8}>
                                            <span className="global-search-command__group-icon">
                                                {GROUP_ICONS[group.key] || <FileSearchOutlined />}
                                            </span>
                                            <Title level={5} style={{ margin: 0 }}>
                                                {group.module}
                                            </Title>
                                        </Space>
                                    </div>

                                    <div className="global-search-command__group-items">
                                        {(group.items || []).map((item) => {
                                            const flatIndex = flatItems.findIndex(
                                                (flatItem) =>
                                                    flatItem.url === item.url &&
                                                    flatItem.title === item.title,
                                            );
                                            const active = flatIndex === selectedIndex;

                                            return (
                                                <button
                                                    key={`${group.key}-${item.type}-${item.url}`}
                                                    type="button"
                                                    className={`global-search-command__item${active ? ' global-search-command__item--active' : ''}`}
                                                    onMouseEnter={() => setSelectedIndex(flatIndex)}
                                                    onClick={() => openSelected(item)}
                                                >
                                                    <div className="global-search-command__item-main">
                                                        <Space direction="vertical" size={4} style={{ width: '100%' }}>
                                                            <Space size={8} wrap>
                                                                <Text strong>{item.title}</Text>
                                                                {item.status && (
                                                                    <Tag color="blue">
                                                                        {String(item.status)
                                                                            .replace(/_/g, ' ')
                                                                            .replace(/\b\w/g, (char) => char.toUpperCase())}
                                                                    </Tag>
                                                                )}
                                                                {item.branch && selectedBranchId === 'all' && (
                                                                    <Tag>{item.branch}</Tag>
                                                                )}
                                                            </Space>

                                                            {item.subtitle && (
                                                                <Text type="secondary">
                                                                    {item.subtitle}
                                                                </Text>
                                                            )}
                                                        </Space>
                                                    </div>

                                                    <div className="global-search-command__item-meta">
                                                        <Text type="secondary">
                                                            {item.date ? formatDate(item.date) : item.type}
                                                        </Text>
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}
                    </div>
                </div>
            </Modal>

            <style>{`
                .global-search-command__trigger {
                    width: 100%;
                    max-width: 540px;
                    height: 40px;
                    display: inline-flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 12px;
                    padding: 0 13px;
                    background: #eaeaea;
                    color: #ffffff;
                    border: 1px solid rgba(255,255,255,0.12);
                    border-radius: 10px;
                    transition: all 0.2s ease;
                }

                .global-search-command__trigger:hover {
                    border-color: ${token.colorPrimary};
                    background: #eaeaea;
                }

                .global-search-command__trigger-placeholder {
                    color: #d1d5db;
                    font-size: 14px;
                    text-align: left;
                    flex: 1;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                }

                .global-search-command__trigger-copy {
                    width: 100%;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 12px;
                }

                .global-search-command__trigger-icon {
                    color: #9ca3af;
                }

                .global-search-command__trigger-shortcut {
                    padding: 2px 8px;
                    border-radius: 999px;
                    background: rgba(255,255,255,0.08);
                    color: #9ca3af;
                    font-size: 12px;
                    font-weight: 600;
                    white-space: nowrap;
                }

                .global-search-command {
                    display: flex;
                    flex-direction: column;
                    max-height: 72vh;
                }

                .global-search-command__toolbar {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    padding: 14px 16px 12px;
                    border-bottom: 1px solid ${token.colorBorderSecondary};
                }

                .global-search-command__input {
                    height: 52px;
                    background: ${token.colorBgLayout};
                    border-radius: 12px;
                    border: 1px solid ${token.colorBorderSecondary};
                    padding: 0 14px;
                }

                .global-search-command__input.ant-input-affix-wrapper-focused,
                .global-search-command__input:hover {
                    border-color: ${token.colorPrimary};
                }

                .global-search-command__branch-select {
                    height: 44px;
                    min-width: 180px;
                    border-radius: 10px;
                    border: 1px solid ${token.colorBorderSecondary};
                    background: ${token.colorBgLayout};
                    color: ${token.colorText};
                    padding: 0 12px;
                    outline: none;
                }

                .global-search-command__status {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 12px;
                    padding: 0 18px 12px;
                }

                .global-search-command__results {
                    overflow: auto;
                    padding: 0 8px 12px;
                }

                .global-search-command__group {
                    padding: 6px 8px 0;
                }

                .global-search-command__group-header {
                    padding: 6px 8px 10px;
                }

                .global-search-command__group-icon {
                    width: 28px;
                    height: 28px;
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    border-radius: 8px;
                    background: ${token.colorPrimaryBg};
                    color: ${token.colorPrimary};
                }

                .global-search-command__group-items {
                    display: flex;
                    flex-direction: column;
                    gap: 6px;
                }

                .global-search-command__item {
                    width: 100%;
                    text-align: left;
                    display: flex;
                    align-items: flex-start;
                    justify-content: space-between;
                    gap: 12px;
                    padding: 12px;
                    border: 1px solid transparent;
                    border-radius: 12px;
                    background: transparent;
                    transition: all 0.16s ease;
                }

                .global-search-command__item:hover,
                .global-search-command__item--active {
                    background: ${token.colorPrimaryBg};
                    border-color: ${token.colorPrimaryBorder};
                }

                .global-search-command__item-main {
                    flex: 1;
                    min-width: 0;
                }

                .global-search-command__item-meta {
                    min-width: 96px;
                    text-align: right;
                    padding-top: 2px;
                }

                .global-search-command__centered {
                    min-height: 220px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }

                @media (max-width: 767px) {
                    .global-search-command__toolbar {
                        flex-direction: column;
                        align-items: stretch;
                    }

                    .global-search-command__branch-select {
                        min-width: 0;
                        width: 100%;
                    }

                    .global-search-command__status {
                        flex-direction: column;
                        align-items: flex-start;
                    }

                    .global-search-command__item {
                        flex-direction: column;
                    }

                    .global-search-command__item-meta {
                        min-width: 0;
                        text-align: left;
                    }
                }
            `}</style>
        </>
    );
}
