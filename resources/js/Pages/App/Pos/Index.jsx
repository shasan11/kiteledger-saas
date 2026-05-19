import { useEffect, useMemo, useRef, useState } from 'react';
import { Head, router, usePage } from '@inertiajs/react';
import {
    App,
    Alert,
    Badge,
    Button,
    Card,
    Col,
    Descriptions,
    Divider,
    Empty,
    Form,
    Input,
    InputNumber,
    List,
    Modal,
    Row,
    Select,
    Space,
    Spin,
    Switch,
    Table,
    Tag,
    theme,
    Typography,
} from 'antd';
import {
    ArrowDownOutlined,
    ArrowUpOutlined,
    ClockCircleOutlined,
    CreditCardOutlined,
    DeleteOutlined,
    DollarOutlined,
    MinusOutlined,
    PauseCircleOutlined,
    PlusOutlined,
    PrinterOutlined,
    SearchOutlined,
} from '@ant-design/icons';
import axios from 'axios';
import dayjs from 'dayjs';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout/index.jsx';
import { api, fetchList, money, saleStatusColor, showApiError } from './Shared/posHelpers';

const { Text, Title } = Typography;

const paymentOptions = [
    { value: 'cash', label: 'Cash' },
    { value: 'card', label: 'Card' },
    { value: 'online', label: 'Online' },
    { value: 'wallet', label: 'Wallet' },
    { value: 'bank_transfer', label: 'Bank Transfer' },
    { value: 'credit', label: 'Credit' },
];

const emptyPayment = {
    payment_method: 'cash',
    amount: 0,
    reference: '',
    transaction_no: '',
};

export default function PosIndex() {
    const { message } = App.useApp();
    const { token } = theme.useToken();
    const { props } = usePage();

    const auth = props.auth || {};
    const branchContext = props.branchContext || {};
    const permissions = auth.permissions || [];

    const can = (permission) => permissions.includes(permission);

    const canViewAllBranches = !!branchContext.canViewAllBranches;

    const userDefaultBranchId =
        branchContext.selectedBranchId ||
        auth.currentBranchId ||
        auth.user?.current_branch_id ||
        auth.user?.branch_id ||
        null;

    const barcodeRef = useRef(null);
    const beepContextRef = useRef(null);

    const [loading, setLoading] = useState(true);
    const [shiftLoading, setShiftLoading] = useState(false);
    const [terminalLoading, setTerminalLoading] = useState(false);

    const [branches, setBranches] = useState([]);
    const [activeBranchId, setActiveBranchId] = useState(userDefaultBranchId);

    const [terminals, setTerminals] = useState([]);
    const [contacts, setContacts] = useState([]);
    const [heldSales, setHeldSales] = useState([]);
    const [dashboard, setDashboard] = useState(null);

    const [currentShift, setCurrentShift] = useState(null);
    const [activeSaleId, setActiveSaleId] = useState(null);
    const [terminalId, setTerminalId] = useState(null);
    const [customerId, setCustomerId] = useState(null);
    const [searchText, setSearchText] = useState('');
    const [products, setProducts] = useState([]);
    const [cart, setCart] = useState([]);
    const [payments, setPayments] = useState([{ ...emptyPayment }]);

    const [summary, setSummary] = useState({
        subtotal: 0,
        discount_total: 0,
        tax_total: 0,
        grand_total: 0,
        paid_total: 0,
        balance_due: 0,
        change_amount: 0,
    });

    const [checkoutOpen, setCheckoutOpen] = useState(false);
    const [heldOpen, setHeldOpen] = useState(false);
    const [receiptOpen, setReceiptOpen] = useState(false);
    const [saleReceipt, setSaleReceipt] = useState(null);
    const [processing, setProcessing] = useState(false);

    const [shiftForm] = Form.useForm();

    const [addTerminalOpen, setAddTerminalOpen] = useState(false);
    const [addTerminalForm] = Form.useForm();
    const [addTerminalLoading, setAddTerminalLoading] = useState(false);

    const [cashMovementOpen, setCashMovementOpen] = useState(false);
    const [cashMovementType, setCashMovementType] = useState('cash_in');
    const [cashMovementForm] = Form.useForm();
    const [cashMovementLoading, setCashMovementLoading] = useState(false);
    const [closeShiftOpen, setCloseShiftOpen] = useState(false);
    const [closeShiftForm] = Form.useForm();
    const [closeShiftLoading, setCloseShiftLoading] = useState(false);

    const selectedTerminal = useMemo(() => {
        return terminals.find((terminal) => terminal.id === terminalId) || null;
    }, [terminalId, terminals]);

    const selectedBranch = useMemo(() => {
        return branches.find((branch) => String(branch.id) === String(activeBranchId)) || null;
    }, [branches, activeBranchId]);

    const terminalOptions = useMemo(() => {
        return terminals.map((terminal) => ({
            value: terminal.id,
            label: `${terminal.name} (${terminal.code})`,
        }));
    }, [terminals]);

    const branchOptions = useMemo(() => {
        return branches.map((branch) => ({
            value: branch.id,
            label: `${branch.name}${branch.code ? ` (${branch.code})` : ''}`,
        }));
    }, [branches]);

    const customerOptions = useMemo(() => {
        return contacts.map((contact) => ({
            value: contact.id,
            label: contact.name,
        }));
    }, [contacts]);

    const terminalWarnings = useMemo(() => {
        if (!selectedTerminal) return ['No terminal selected.'];

        const warnings = [];
        if (!selectedTerminal.warehouse_id) warnings.push('Terminal missing warehouse.');
        if (!selectedTerminal.cash_account_id) warnings.push('Terminal missing cash account.');
        if (!selectedTerminal.card_account_id) warnings.push('Terminal missing card account.');
        if (!selectedTerminal.online_account_id) warnings.push('Terminal missing online/wallet/bank account.');

        return warnings;
    }, [selectedTerminal]);

    const checkoutError = useMemo(() => {
        if (!can('pos.sale.create')) return 'No permission to create POS sales.';
        if (!selectedTerminal) return 'No terminal selected.';
        if (!currentShift?.id) return 'No open shift.';
        if (cart.length < 1) return 'Cart is empty.';

        const hasTrackedItem = cart.some((item) => item.track_inventory);
        if (hasTrackedItem && !selectedTerminal?.warehouse_id) return 'Warehouse is required for inventory-tracked products.';

        const missingStock = cart.find((item) => item.track_inventory && item.available_stock !== null && item.available_stock !== undefined && Number(item.qty || 0) > Number(item.available_stock || 0));
        if (missingStock) return `${missingStock.product_name} has only ${missingStock.available_stock} available.`;

        const moneyPayments = payments.filter((payment) => payment.payment_method !== 'credit' && Number(payment.amount || 0) > 0);
        const hasCredit = payments.some((payment) => payment.payment_method === 'credit') || summary.balance_due > 0;
        const hasNonCash = moneyPayments.some((payment) => payment.payment_method !== 'cash');

        if (moneyPayments.some((payment) => payment.payment_method === 'cash' && !selectedTerminal?.cash_account_id)) return 'Terminal account is missing for selected payment method.';
        if (moneyPayments.some((payment) => payment.payment_method === 'card' && !selectedTerminal?.card_account_id)) return 'Terminal account is missing for selected payment method.';
        if (moneyPayments.some((payment) => ['online', 'wallet', 'bank_transfer'].includes(payment.payment_method) && !selectedTerminal?.online_account_id)) return 'Terminal account is missing for selected payment method.';
        if (hasCredit && !customerId) return 'Customer is required for credit sale.';
        if (hasCredit && !can('pos.sale.credit')) return 'No permission to complete credit sales.';
        if (!hasCredit && summary.paid_total + 0.009 < summary.grand_total) return 'Amount received is less than grand total.';
        if (summary.change_amount > 0.009 && hasNonCash) return 'Overpayment is allowed only for cash sales.';

        return null;
    }, [cart, currentShift, customerId, payments, selectedTerminal, summary, permissions]);

    const pageStyle = {
        padding: 16,
        background: token.colorBgLayout,
        minHeight: 'calc(100vh - 120px)',
    };

    const centerShellStyle = {
        minHeight: 520,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
    };

    const cardStyle = {
        borderRadius: token.borderRadiusLG,
        border: `1px solid ${token.colorBorderSecondary}`,
        background: token.colorBgContainer,
    };

    const mutedBoxStyle = {
        padding: 12,
        borderRadius: token.borderRadiusLG,
        background: token.colorFillAlter,
        border: `1px solid ${token.colorBorderSecondary}`,
    };

    useEffect(() => {
        void bootstrap();
    }, []);

    useEffect(() => {
        calculateCart();
    }, [cart, payments]);

    useEffect(() => {
        if (!terminalId) {
            setCurrentShift(null);
            setProducts([]);
            setHeldSales([]);
            return;
        }

        void loadCurrentShift();
        void loadHeldSales();
    }, [terminalId]);

    useEffect(() => {
        if (!terminalId || !currentShift?.id) return;

        void loadProducts();
    }, [terminalId, currentShift?.id]);

    useEffect(() => {
        const timer = setTimeout(() => {
            if (terminalId && currentShift?.id) {
                void loadProducts(searchText);
            }
        }, 250);

        return () => clearTimeout(timer);
    }, [searchText, terminalId, currentShift?.id]);

    async function bootstrap() {
        setLoading(true);

        try {
            const resolvedBranchId = userDefaultBranchId;

            const [contactPayload, dashboardPayload, branchPayload] = await Promise.all([
                fetchList('/api/contacts', {
                    page_size: 100,
                }),
                axios.get(api('/api/pos/dashboard')),
                fetchList('/api/branches', {
                    page_size: 100,
                    active: true,
                }),
            ]);

            const branchRows = canViewAllBranches
                ? branchPayload.results || []
                : (branchPayload.results || []).filter((branch) => {
                      return String(branch.id) === String(resolvedBranchId);
                  });

            const fallbackBranchId =
                resolvedBranchId ||
                branchRows.find((branch) => branch.active)?.id ||
                branchRows[0]?.id ||
                null;

            setBranches(branchRows);
            setActiveBranchId(fallbackBranchId);
            setContacts(contactPayload.results || []);
            setDashboard(dashboardPayload.data || null);
            setCustomerId(null);

            await loadTerminalsForBranch(fallbackBranchId, {
                silent: true,
            });
        } catch (error) {
            showApiError(message, error, 'Failed to load POS screen.');
        } finally {
            setLoading(false);
        }
    }

    async function loadTerminalsForBranch(branchId, options = {}) {
        setTerminalLoading(true);

        try {
            const terminalParams = {
                page_size: 100,
                active: true,
            };

            if (branchId) {
                terminalParams.branch_id = branchId;
            }

            const terminalPayload = await fetchList('/api/pos-terminals', terminalParams);

            const terminalRows = terminalPayload.results || [];

            const scopedTerminals = branchId
                ? terminalRows.filter((terminal) => String(terminal.branch_id) === String(branchId))
                : terminalRows;

            const defaultTerminal =
                scopedTerminals.find((terminal) => terminal.is_default) ||
                scopedTerminals[0] ||
                null;

            setTerminals(scopedTerminals);
            setTerminalId(defaultTerminal?.id ?? null);
            setCurrentShift(null);
            setProducts([]);
            setHeldSales([]);
            clearSale();

            return defaultTerminal;
        } catch (error) {
            if (!options.silent) {
                showApiError(message, error, 'Failed to load POS terminals.');
            }

            setTerminals([]);
            setTerminalId(null);
            setCurrentShift(null);
            setProducts([]);
            setHeldSales([]);

            return null;
        } finally {
            setTerminalLoading(false);
        }
    }

    async function handleBranchChange(branchId) {
        if (!canViewAllBranches) return;

        setActiveBranchId(branchId);
        setTerminalId(null);
        setCurrentShift(null);
        setProducts([]);
        setHeldSales([]);
        clearSale();

        await loadTerminalsForBranch(branchId);
    }

    async function loadProducts(query = '') {
        if (!terminalId || !currentShift?.id) return;

        try {
            const response = await axios.get(api('/api/pos/products/search'), {
                params: {
                    q: query || undefined,
                    warehouse_id: selectedTerminal?.warehouse_id,
                    branch_id: selectedTerminal?.branch_id || activeBranchId,
                    limit: 40,
                },
            });

            setProducts(response.data || []);
        } catch (error) {
            setProducts([]);
            showApiError(message, error, 'Failed to load POS products.');
        }
    }

    async function loadCurrentShift(targetTerminalId = terminalId) {
        if (!targetTerminalId) {
            setCurrentShift(null);
            return null;
        }

        setShiftLoading(true);

        try {
            const targetTerminal = terminals.find((terminal) => terminal.id === targetTerminalId);

            const response = await axios.get(api('/api/pos-shifts/current'), {
                params: {
                    pos_terminal_id: targetTerminalId,
                    branch_id: targetTerminal?.branch_id || activeBranchId,
                },
            });

            setCurrentShift(response.data || null);

            if (!response.data) {
                shiftForm.setFieldsValue({
                    terminal_id: targetTerminalId,
                    branch_id: targetTerminal?.branch_id || activeBranchId,
                    opening_cash: 0,
                    notes: '',
                });
            }

            return response.data || null;
        } catch (error) {
            setCurrentShift(null);
            showApiError(message, error, 'Failed to load current shift.');
            return null;
        } finally {
            setShiftLoading(false);
        }
    }

    async function loadHeldSales() {
        if (!terminalId) return;

        try {
            const payload = await fetchList('/api/pos-sales', {
                pos_terminal_id: terminalId,
                branch_id: selectedTerminal?.branch_id || activeBranchId,
                status: 'held',
                page_size: 50,
            });

            setHeldSales(payload.results || []);
        } catch (error) {
            setHeldSales([]);
            showApiError(message, error, 'Failed to load held POS sales.');
        }
    }

    function calculateCart() {
        const subtotal = cart.reduce((sum, item) => {
            return sum + Number(item.qty || 0) * Number(item.unit_price || 0);
        }, 0);

        const discountTotal = cart.reduce((sum, item) => {
            const base = Number(item.qty || 0) * Number(item.unit_price || 0);

            if (item.is_complimentary) {
                return sum + base;
            }

            const percentAmount = base * (Number(item.discount_percent || 0) / 100);

            return sum + Math.min(percentAmount, base);
        }, 0);

        const taxTotal = cart.reduce((sum, item) => {
            if (item.is_complimentary) {
                return sum;
            }

            const rate = Number(item.tax_rate?.rate_percent || item.tax_rate_percent || 0);
            const base = Number(item.qty || 0) * Number(item.unit_price || 0);
            const discount = base * (Number(item.discount_percent || 0) / 100);

            return sum + Math.max(base - discount, 0) * (rate / 100);
        }, 0);

        const grandTotal = subtotal - discountTotal + taxTotal;

        const paidTotal = payments.reduce((sum, payment) => {
            if (payment.payment_method === 'credit') {
                return sum;
            }

            return sum + Number(payment.amount || 0);
        }, 0);

        setSummary({
            subtotal,
            discount_total: discountTotal,
            tax_total: taxTotal,
            grand_total: grandTotal,
            paid_total: paidTotal,
            balance_due: Math.max(grandTotal - paidTotal, 0),
            change_amount: Math.max(paidTotal - grandTotal, 0),
        });
    }

    function addProduct(product) {
        if (!currentShift?.id) {
            message.warning('Open a shift before adding products.');
            return;
        }

        playPosBeep();

        setCart((current) => {
            const existing = current.find((item) => item.product_id === product.id);

            if (existing) {
                if (product.track_inventory && product.available_stock !== null && product.available_stock !== undefined && Number(existing.qty || 0) + 1 > Number(product.available_stock || 0)) {
                    message.warning(`${product.name} has only ${product.available_stock} available.`);
                    return current;
                }

                return current.map((item) =>
                    item.product_id === product.id
                        ? {
                              ...item,
                              qty: Number(item.qty || 0) + 1,
                          }
                        : item,
                );
            }

            return [
                ...current,
                {
                    product_id: product.id,
                    product_name: product.name,
                    product_code: product.code,
                    barcode: product.barcode,
                    qty: 1,
                    unit_price: Number(product.selling_price || 0),
                    discount_percent: 0,
                    tax_rate_id: product.tax_rate?.id ?? null,
                    tax_rate: product.tax_rate ?? null,
                    is_complimentary: false,
                    complimentary_reason: '',
                    available_stock: product.available_stock,
                    track_inventory: product.track_inventory,
                },
            ];
        });

        barcodeRef.current?.focus();
    }

    function playPosBeep() {
        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;

            if (!AudioContext) return;

            const audioContext = beepContextRef.current || new AudioContext();
            beepContextRef.current = audioContext;

            const oscillator = audioContext.createOscillator();
            const gain = audioContext.createGain();
            const start = audioContext.currentTime;

            oscillator.type = 'square';
            oscillator.frequency.setValueAtTime(880, start);

            gain.gain.setValueAtTime(0.0001, start);
            gain.gain.exponentialRampToValueAtTime(0.08, start + 0.01);
            gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.08);

            oscillator.connect(gain);
            gain.connect(audioContext.destination);
            oscillator.start(start);
            oscillator.stop(start + 0.09);
        } catch (error) {
            // Sound is best-effort.
        }
    }

    function updateCartLine(index, key, value) {
        setCart((current) =>
            current.map((item, itemIndex) =>
                itemIndex === index
                    ? {
                          ...item,
                          [key]:
                              key === 'qty' && item.track_inventory && item.available_stock !== null && item.available_stock !== undefined
                                  ? Math.min(Number(value || 1), Number(item.available_stock || 0))
                                  : value,
                      }
                    : item,
            ),
        );
    }

    function removeLine(index) {
        setCart((current) => current.filter((_, itemIndex) => itemIndex !== index));
    }

    function removePaymentRow(index) {
        setPayments((current) => {
            if (current.length <= 1) {
                message.warning('At least one payment method is required.');
                return current;
            }

            return current.filter((_, rowIndex) => rowIndex !== index);
        });
    }

    function clearSale(options = {}) {
        setCart([]);
        setPayments([{ ...emptyPayment }]);
        setActiveSaleId(null);

        if (!options.keepReceipt) {
            setSaleReceipt(null);
        }

        barcodeRef.current?.focus();
    }

    async function submitOpenShift(values) {
        if (!terminalId) {
            message.warning('Select a terminal before opening shift.');
            return;
        }

        if (!can('pos.shift.open')) {
            message.error('You do not have permission to open POS shift.');
            return;
        }

        setProcessing(true);

        try {
            const terminalBranchId = selectedTerminal?.branch_id || activeBranchId;

            const response = await axios.post(api('/api/pos-shifts/open'), {
                pos_terminal_id: terminalId,
                branch_id: terminalBranchId,
                opening_cash: values.opening_cash || 0,
                notes: values.notes || null,
            });

            setCurrentShift(response.data);
            shiftForm.resetFields();

            await loadHeldSales();

            message.success('Shift opened.');

            setTimeout(() => {
                barcodeRef.current?.focus();
            }, 80);
        } catch (error) {
            showApiError(message, error, 'Failed to open shift.');
        } finally {
            setProcessing(false);
        }
    }

    async function ensureActiveShift() {
        if (!terminalId) {
            message.warning('Select a terminal before continuing.');
            return null;
        }

        if (currentShift?.id) {
            return currentShift;
        }

        const shift = await loadCurrentShift(terminalId);

        if (shift?.id) {
            return shift;
        }

        message.warning('Open a shift before continuing.');
        return null;
    }

    async function holdSale() {
        const shift = await ensureActiveShift();

        if (!shift?.id) return;

        if (cart.length < 1) {
            message.warning('Add products before holding the cart.');
            return;
        }

        setProcessing(true);

        try {
            let saleId = activeSaleId;
            const payload = buildSalePayload('draft', shift.id);

            if (saleId) {
                await axios.patch(api(`/api/pos-sales/${saleId}`), payload);
            } else {
                const draftResponse = await axios.post(api('/api/pos-sales'), payload);
                saleId = draftResponse.data?.id;
            }

            await axios.post(api(`/api/pos-sales/${saleId}/hold`), buildSalePayload('held', shift.id));

            await loadHeldSales();

            clearSale();
            message.success('Sale held successfully.');
        } catch (error) {
            showApiError(message, error, 'Unable to hold sale.');
        } finally {
            setProcessing(false);
        }
    }

    async function completeSale() {
        const shift = await ensureActiveShift();

        if (!shift?.id) return;

        if (cart.length < 1) {
            message.warning('Cart is empty.');
            return;
        }

        if (checkoutError) {
            message.error(checkoutError);
            return;
        }

        setProcessing(true);

        try {
            let saleId = activeSaleId;
            const payload = buildSalePayload('draft', shift.id);

            if (saleId) {
                await axios.patch(api(`/api/pos-sales/${saleId}`), payload);
            } else {
                const draftResponse = await axios.post(api('/api/pos-sales'), payload);
                saleId = draftResponse.data?.id;
            }

            const response = await axios.post(api(`/api/pos-sales/${saleId}/complete`), {
                ...payload,
                approved: true,
                allow_credit_sale: payments.some((payment) => payment.payment_method === 'credit') || summary.balance_due > 0,
            });

            setSaleReceipt(response.data);
            setCheckoutOpen(false);
            setReceiptOpen(true);

            await loadCurrentShift();
            await loadHeldSales();

            clearSale({
                keepReceipt: true,
            });

            message.success('Sale completed.');
        } catch (error) {
            showApiError(message, error, 'Unable to complete sale.');
        } finally {
            setProcessing(false);
        }
    }

    function buildSalePayload(status = 'draft', shiftId = currentShift?.id) {
        return {
            branch_id: selectedTerminal?.branch_id || activeBranchId,
            pos_terminal_id: terminalId,
            pos_shift_id: shiftId || null,
            warehouse_id: selectedTerminal?.warehouse_id,
            contact_id: customerId || null,
            status,
            sale_date: dayjs().format('YYYY-MM-DD HH:mm:ss'),
            items: cart.map((item) => ({
                product_id: item.product_id,
                product_name: item.product_name,
                product_code: item.product_code,
                barcode: item.barcode,
                qty: Number(item.qty || 0),
                unit_price: Number(item.unit_price || 0),
                discount_percent: Number(item.discount_percent || 0),
                tax_rate_id: item.tax_rate_id || null,
                is_complimentary: !!item.is_complimentary,
                complimentary_reason: item.complimentary_reason || null,
                remarks: item.remarks || null,
            })),
            payments: payments
                .filter((payment) => payment.payment_method === 'credit' || Number(payment.amount || 0) > 0)
                .map((payment) => ({
                    payment_method: payment.payment_method,
                    amount: payment.payment_method === 'credit' ? 0 : Number(payment.amount || 0),
                    payment_date: dayjs().format('YYYY-MM-DD HH:mm:ss'),
                    reference: payment.reference || null,
                    transaction_no: payment.transaction_no || null,
                })),
        };
    }

    function resumeHeldSale(sale) {
        setActiveSaleId(sale.id);
        setCustomerId(sale.contact_id || null);

        setCart(
            (sale.pos_sale_lines || []).map((line) => ({
                product_id: line.product_id,
                product_name: line.product_name,
                product_code: line.product_code,
                barcode: line.barcode,
                qty: Number(line.qty || 0),
                unit_price: Number(line.unit_price || 0),
                discount_percent: Number(line.discount_percent || 0),
                tax_rate_id: line.tax_rate_id || null,
                tax_rate: line.tax_rate || null,
                is_complimentary: !!line.is_complimentary,
                complimentary_reason: line.complimentary_reason || '',
                remarks: line.remarks || null,
            })),
        );

        setPayments((sale.pos_payments || []).length > 0 ? sale.pos_payments : [{ ...emptyPayment }]);
        setHeldOpen(false);

        message.success(`Resumed ${sale.sale_no}.`);
    }

    async function submitAddTerminal(values) {
        setAddTerminalLoading(true);

        try {
            const branchId = canViewAllBranches
                ? values.branch_id || activeBranchId
                : activeBranchId;

            const response = await axios.post(api('/api/pos-terminals/'), {
                name: values.name,
                branch_id: branchId,
                warehouse_id: values.warehouse_id || null,
                active: true,
            });

            const newTerminal = response.data;

            if (String(newTerminal.branch_id) !== String(activeBranchId)) {
                setActiveBranchId(newTerminal.branch_id);
            }

            await loadTerminalsForBranch(newTerminal.branch_id);

            setTerminalId(newTerminal.id);
            setAddTerminalOpen(false);
            addTerminalForm.resetFields();

            message.success(`Terminal "${newTerminal.name}" created and selected.`);
        } catch (error) {
            showApiError(message, error, 'Failed to create terminal.');
        } finally {
            setAddTerminalLoading(false);
        }
    }

    function openCashMovement(type) {
        if (!currentShift?.id) {
            message.warning('Open a shift before recording cash movement.');
            return;
        }

        setCashMovementType(type);
        cashMovementForm.setFieldsValue({
            type,
            amount: 0,
            reason: '',
            notes: '',
        });
        setCashMovementOpen(true);
    }

    async function submitCashMovement(values) {
        if (!currentShift?.id) return;

        setCashMovementLoading(true);

        try {
            await axios.post(api('/api/pos-cash-movements/'), {
                pos_terminal_id: terminalId,
                pos_shift_id: currentShift.id,
                branch_id: selectedTerminal?.branch_id || activeBranchId,
                type: values.type,
                amount: values.amount,
                reason: values.reason || null,
                notes: values.notes || null,
                approved: true,
            });

            setCashMovementOpen(false);
            cashMovementForm.resetFields();

            await loadCurrentShift();

            message.success('Cash movement recorded.');
        } catch (error) {
            showApiError(message, error, 'Failed to record cash movement.');
        } finally {
            setCashMovementLoading(false);
        }
    }

    async function closeShift() {
        if (!currentShift) return;

        closeShiftForm.setFieldsValue({
            counted_cash: null,
            closing_notes: '',
        });
        setCloseShiftOpen(true);
    }

    async function submitCloseShift(values) {
        if (!currentShift) return;

        const expectedCash = Number(currentShift.expected_cash || 0);
        const countedCash = Number(values.counted_cash || 0);
        const difference = Number((countedCash - expectedCash).toFixed(2));

        if (difference !== 0 && !values.closing_notes) {
            message.error('Closing note is required when cash difference is not zero.');
            return;
        }

        setCloseShiftLoading(true);

        try {
            await axios.post(api(`/api/pos-shifts/${currentShift.id}/close`), {
                counted_cash: countedCash,
                closing_notes: values.closing_notes || null,
                has_cash_difference: difference !== 0,
            });

            setCurrentShift(null);
            setProducts([]);
            setCloseShiftOpen(false);
            closeShiftForm.resetFields();
            clearSale();

            message.success('Shift closed.');
        } catch (error) {
            showApiError(message, error, 'Unable to close shift.');
        } finally {
            setCloseShiftLoading(false);
        }
    }

    const cartColumns = [
        {
            title: 'Item',
            key: 'item',
            width: 170,
            render: (_, record) => (
                <div style={{ minWidth: 0 }}>
                    <Text
                        strong
                        ellipsis
                        style={{
                            display: 'block',
                            maxWidth: 150,
                            fontSize: 12,
                        }}
                    >
                        {record.product_name}
                    </Text>

                    <br />

                    <Text type="secondary" style={{ fontSize: 11 }}>
                        {record.product_code || record.barcode || 'POS Item'}
                    </Text>

                    {record.is_complimentary && (
                        <div style={{ marginTop: 4 }}>
                            <Tag color="blue">Complimentary</Tag>
                        </div>
                    )}
                </div>
            ),
        },
        {
            title: 'Qty',
            key: 'qty',
            width: 104,
            render: (_, record, index) => (
                <Space.Compact size="small">
                    <Button
                        size="small"
                        icon={<MinusOutlined />}
                        onClick={() => updateCartLine(index, 'qty', Math.max(Number(record.qty || 1) - 1, 1))}
                    />

                    <InputNumber
                        size="small"
                        controls={false}
                        min={1}
                        value={record.qty}
                        style={{ width: 42 }}
                        onChange={(value) => updateCartLine(index, 'qty', value || 1)}
                    />

                    <Button
                        size="small"
                        icon={<PlusOutlined />}
                        onClick={() => updateCartLine(index, 'qty', Number(record.qty || 0) + 1)}
                    />
                </Space.Compact>
            ),
        },
        {
            title: 'Price',
            key: 'price',
            width: 76,
            render: (_, record, index) => (
                <InputNumber
                    size="small"
                    controls={false}
                    min={0}
                    value={record.unit_price}
                    style={{ width: 68 }}
                    onChange={(value) => updateCartLine(index, 'unit_price', value || 0)}
                />
            ),
        },
        {
            title: 'Disc %',
            key: 'discount',
            width: 62,
            render: (_, record, index) => (
                <InputNumber
                    size="small"
                    controls={false}
                    min={0}
                    max={100}
                    value={record.discount_percent}
                    style={{ width: 54 }}
                    onChange={(value) => updateCartLine(index, 'discount_percent', value || 0)}
                />
            ),
        },
        {
            title: 'Free',
            key: 'complimentary',
            width: 68,
            align: 'center',
            render: (_, record, index) => (
                <Switch
                    size="small"
                    checked={!!record.is_complimentary}
                    onChange={(checked) => updateCartLine(index, 'is_complimentary', checked)}
                />
            ),
        },
        {
            title: 'Total',
            key: 'line_total',
            width: 88,
            align: 'right',
            render: (_, record) => {
                const base = Number(record.qty || 0) * Number(record.unit_price || 0);

                if (record.is_complimentary) {
                    return (
                        <Space direction="vertical" size={0} align="end">
                            <Text strong style={{ fontSize: 12 }}>
                                {money(0)}
                            </Text>
                            <Text type="secondary" style={{ fontSize: 11 }}>
                                free
                            </Text>
                        </Space>
                    );
                }

                const discount = base * (Number(record.discount_percent || 0) / 100);
                const taxRate = Number(record.tax_rate?.rate_percent || 0);
                const tax = Math.max(base - discount, 0) * (taxRate / 100);

                return (
                    <Text strong style={{ fontSize: 12 }}>
                        {money(base - discount + tax)}
                    </Text>
                );
            },
        },
        {
            title: '',
            key: 'actions',
            width: 38,
            render: (_, __, index) => (
                <Button
                    danger
                    size="small"
                    type="text"
                    icon={<DeleteOutlined />}
                    onClick={() => removeLine(index)}
                />
            ),
        },
    ];

    const headerNode = (
        <div
            style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
                flexWrap: 'wrap',
            }}
        >
            <Space size={12} wrap>
                <Title level={4} style={{ margin: 0 }}>
                    Point of Sale
                </Title>

                {canViewAllBranches && (
                    <Select
                        style={{ width: 220 }}
                        value={activeBranchId}
                        options={branchOptions}
                        onChange={handleBranchChange}
                        placeholder="Select branch"
                    />
                )}

                <Space.Compact>
                    <Select
                        style={{ width: 220 }}
                        value={terminalId}
                        options={terminalOptions}
                        loading={terminalLoading}
                        onChange={(value) => {
                            setTerminalId(value);
                            setCurrentShift(null);
                            setProducts([]);
                            clearSale();
                        }}
                        placeholder="Select terminal"
                    />

                    {can('pos.terminal.create') && (
                        <Button
                            icon={<PlusOutlined />}
                            title="Create new terminal"
                            onClick={() => setAddTerminalOpen(true)}
                        />
                    )}
                </Space.Compact>

                <Tag>
                    {selectedTerminal?.branch?.name ||
                        selectedTerminal?.branch_name ||
                        selectedBranch?.name ||
                        'Branch'}
                </Tag>

                <Tag icon={<ClockCircleOutlined />} color={currentShift ? 'green' : 'red'}>
                    {currentShift ? currentShift.shift_no : 'No open shift'}
                </Tag>

                <Tag>
                    {currentShift?.cashier?.display_name || currentShift?.cashier?.name || 'Cashier'}
                </Tag>
            </Space>

            <Space wrap>
                {currentShift && can('pos.cash_movement.create') && (
                    <>
                        <Button icon={<ArrowUpOutlined />} onClick={() => openCashMovement('cash_in')}>
                            Cash In
                        </Button>

                        <Button icon={<ArrowDownOutlined />} onClick={() => openCashMovement('cash_out')}>
                            Cash Out
                        </Button>
                    </>
                )}

                {currentShift && can('pos.sale.update') && (
                    <Button onClick={() => setHeldOpen(true)} icon={<PauseCircleOutlined />}>
                        Held
                    </Button>
                )}

                {can('pos.sale.view') && (
                    <Button onClick={() => router.visit(route('pos.sales.index'))}>
                        Sales History
                    </Button>
                )}

                {currentShift && can('pos.shift.close') && (
                    <Button danger onClick={closeShift}>
                        Close Shift
                    </Button>
                )}
            </Space>
        </div>
    );

    const noTerminalView = (
        <div style={centerShellStyle}>
            <Card bordered={false} style={{ ...cardStyle, width: '100%', maxWidth: 560 }}>
                <Empty
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                    description={
                        <Space direction="vertical" size={4}>
                            <Text strong>No POS terminal found for this branch.</Text>
                            <Text type="secondary">
                                {can('pos.terminal.create')
                                    ? 'Create a terminal first to start selling.'
                                    : 'Contact administrator to create a POS terminal for your branch.'}
                            </Text>
                        </Space>
                    }
                />

                {can('pos.terminal.create') && (
                    <Button
                        type="primary"
                        icon={<PlusOutlined />}
                        block
                        onClick={() => setAddTerminalOpen(true)}
                    >
                        Create Terminal
                    </Button>
                )}
            </Card>
        </div>
    );

    return (
        <AuthenticatedLayout header={headerNode}>
            <Head title="POS" />

            <div style={pageStyle}>
                {loading || shiftLoading || terminalLoading ? (
                    <div
                        style={{
                            minHeight: 420,
                            display: 'grid',
                            placeItems: 'center',
                        }}
                    >
                        <Spin />
                    </div>
                ) : terminals.length < 1 ? (
                    noTerminalView
                ) : !currentShift ? (
                    <div style={centerShellStyle}>
                        <Space direction="vertical" size={12} style={{ width: '100%', maxWidth: 620 }}>
                            {terminalWarnings.length > 0 && (
                                <Alert
                                    type="warning"
                                    showIcon
                                    message="Terminal setup needs attention"
                                    description={terminalWarnings.join(' ')}
                                />
                            )}

                            <Empty
                                image={Empty.PRESENTED_IMAGE_SIMPLE}
                                description="Open a POS shift to start selling."
                            />
                        </Space>
                    </div>
                ) : (
                    <Space direction="vertical" size={12} style={{ width: '100%' }}>
                        {(terminalWarnings.length > 0 || checkoutError) && (
                            <Alert
                                type={checkoutError ? 'warning' : 'info'}
                                showIcon
                                message={checkoutError || 'Terminal setup warning'}
                                description={terminalWarnings.join(' ')}
                            />
                        )}

                        <Row gutter={12} align="stretch">
                            <Col xs={24} xl={15}>
                            <Card bordered={false} style={cardStyle} bodyStyle={{ padding: 14 }}>
                                <Space direction="vertical" size={12} style={{ width: '100%' }}>
                                    <Space.Compact style={{ width: '100%' }}>
                                        <Input
                                            ref={barcodeRef}
                                            prefix={<SearchOutlined />}
                                            placeholder="Search or scan barcode"
                                            value={searchText}
                                            onChange={(event) => setSearchText(event.target.value)}
                                        />

                                        <Button onClick={() => loadProducts(searchText)}>
                                            Search
                                        </Button>
                                    </Space.Compact>

                                    {products.length < 1 ? (
                                        <Empty description="No saleable products found" />
                                    ) : (
                                        <Row gutter={[10, 10]}>
                                            {products.map((product) => (
                                                <Col xs={24} sm={12} lg={8} xxl={6} key={product.id}>
                                                    <Card
                                                        hoverable
                                                        size="small"
                                                        onClick={() => addProduct(product)}
                                                        style={{
                                                            borderRadius: token.borderRadiusLG,
                                                            border: `1px solid ${token.colorBorderSecondary}`,
                                                        }}
                                                        bodyStyle={{ padding: 12 }}
                                                    >
                                                        <Space direction="vertical" size={4} style={{ width: '100%' }}>
                                                            <Text strong>{product.name}</Text>

                                                            <Text type="secondary">
                                                                {product.code || product.barcode || product.sku}
                                                            </Text>

                                                            <Space
                                                                style={{
                                                                    justifyContent: 'space-between',
                                                                    width: '100%',
                                                                }}
                                                            >
                                                                <Text strong>
                                                                    Rs. {money(product.selling_price)}
                                                                </Text>

                                                                <Badge
                                                                    count={
                                                                        product.track_inventory
                                                                            ? `Stock ${product.available_stock ?? 0}`
                                                                            : 'Service'
                                                                    }
                                                                    style={{
                                                                        backgroundColor: token.colorPrimary,
                                                                    }}
                                                                />
                                                            </Space>
                                                        </Space>
                                                    </Card>
                                                </Col>
                                            ))}
                                        </Row>
                                    )}
                                </Space>
                            </Card>
                            </Col>

                            <Col xs={24} xl={9}>
                            <Card bordered={false} style={cardStyle} bodyStyle={{ padding: 14 }}>
                                <Space direction="vertical" size={12} style={{ width: '100%' }}>
                                    <Select
                                        showSearch
                                        allowClear
                                        placeholder="Select customer"
                                        value={customerId}
                                        options={customerOptions}
                                        onChange={setCustomerId}
                                        style={{ width: '100%' }}
                                        optionFilterProp="label"
                                    />

                                    <Table
                                        className="pos-cart-table"
                                        size="small"
                                        rowKey={(record, index) => `${record.product_id}-${index}`}
                                        columns={cartColumns}
                                        dataSource={cart}
                                        pagination={false}
                                        locale={{ emptyText: 'No items in cart' }}
                                        scroll={{ x: 540, y: 320 }}
                                    />

                                    <Descriptions
                                        size="small"
                                        column={1}
                                        items={[
                                            {
                                                key: 'subtotal',
                                                label: 'Subtotal',
                                                children: `Rs. ${money(summary.subtotal)}`,
                                            },
                                            {
                                                key: 'discount',
                                                label: 'Discount',
                                                children: `Rs. ${money(summary.discount_total)}`,
                                            },
                                            {
                                                key: 'tax',
                                                label: 'Tax',
                                                children: `Rs. ${money(summary.tax_total)}`,
                                            },
                                            {
                                                key: 'total',
                                                label: 'Grand Total',
                                                children: (
                                                    <Text strong>
                                                        Rs. {money(summary.grand_total)}
                                                    </Text>
                                                ),
                                            },
                                            {
                                                key: 'paid',
                                                label: 'Paid',
                                                children: `Rs. ${money(summary.paid_total)}`,
                                            },
                                            {
                                                key: 'change',
                                                label: 'Change',
                                                children: `Rs. ${money(summary.change_amount)}`,
                                            },
                                        ]}
                                    />

                                    <Space
                                        style={{
                                            width: '100%',
                                            justifyContent: 'space-between',
                                        }}
                                    >
                                        <Button icon={<DeleteOutlined />} onClick={() => clearSale()}>
                                            Clear
                                        </Button>

                                        <Button
                                            icon={<PauseCircleOutlined />}
                                            onClick={holdSale}
                                            loading={processing}
                                        >
                                            Hold
                                        </Button>

                                        <Button
                                            type="primary"
                                            icon={<CreditCardOutlined />}
                                            onClick={() => setCheckoutOpen(true)}
                                            disabled={!!checkoutError}
                                        >
                                            Checkout
                                        </Button>
                                    </Space>
                                </Space>
                            </Card>

                            {dashboard && (
                                <Card
                                    bordered={false}
                                    style={{
                                        ...cardStyle,
                                        marginTop: 12,
                                    }}
                                >
                                    <Row gutter={10}>
                                        <Col span={12}>
                                            <Text type="secondary">Today Sales</Text>
                                            <div>
                                                <Text strong>
                                                    Rs. {money(dashboard.today_sales)}
                                                </Text>
                                            </div>
                                        </Col>

                                        <Col span={12}>
                                            <Text type="secondary">Open Shifts</Text>
                                            <div>
                                                <Text strong>
                                                    {dashboard.open_shift_count}
                                                </Text>
                                            </div>
                                        </Col>
                                    </Row>
                                </Card>
                            )}
                            </Col>
                        </Row>
                    </Space>
                )}
            </div>

            <Modal
                title="Open POS Shift"
                open={!loading && !shiftLoading && !terminalLoading && terminals.length > 0 && !currentShift}
                closable={false}
                maskClosable={false}
                keyboard={false}
                footer={null}
                destroyOnClose={false}
                width={560}
            >
                <Space direction="vertical" size={14} style={{ width: '100%' }}>
                    <Text type="secondary">
                        Select the terminal and count the opening cash before using POS.
                    </Text>

                    <div style={mutedBoxStyle}>
                        <Descriptions
                            size="small"
                            column={1}
                            items={[
                                {
                                    key: 'branch',
                                    label: 'Branch',
                                    children:
                                        selectedTerminal?.branch?.name ||
                                        selectedTerminal?.branch_name ||
                                        selectedBranch?.name ||
                                        '-',
                                },
                                {
                                    key: 'terminal',
                                    label: 'Terminal',
                                    children: selectedTerminal
                                        ? `${selectedTerminal.name} (${selectedTerminal.code})`
                                        : '-',
                                },
                                {
                                    key: 'warehouse',
                                    label: 'Warehouse',
                                    children:
                                        selectedTerminal?.warehouse?.name ||
                                        selectedTerminal?.warehouse_name ||
                                        '-',
                                },
                            ]}
                        />
                    </div>

                    <Form
                        form={shiftForm}
                        layout="vertical"
                        onFinish={submitOpenShift}
                        initialValues={{ opening_cash: 0 }}
                    >
                        {canViewAllBranches && (
                            <Form.Item label="Branch">
                                <Select
                                    value={activeBranchId}
                                    options={branchOptions}
                                    onChange={handleBranchChange}
                                    placeholder="Select branch"
                                />
                            </Form.Item>
                        )}

                        <Form.Item label="Terminal" required>
                            <Space.Compact style={{ width: '100%' }}>
                                <Select
                                    style={{ flex: 1 }}
                                    value={terminalId}
                                    options={terminalOptions}
                                    loading={terminalLoading}
                                    onChange={(value) => {
                                        setTerminalId(value);
                                        setCurrentShift(null);
                                        setProducts([]);
                                        clearSale();
                                    }}
                                    placeholder="Select terminal"
                                />

                                {can('pos.terminal.create') && (
                                    <Button
                                        icon={<PlusOutlined />}
                                        title="Create new terminal"
                                        onClick={() => setAddTerminalOpen(true)}
                                    />
                                )}
                            </Space.Compact>
                        </Form.Item>

                        <Form.Item
                            name="opening_cash"
                            label="Opening Cash"
                            rules={[
                                {
                                    required: true,
                                    message: 'Opening cash is required.',
                                },
                            ]}
                        >
                            <InputNumber
                                style={{ width: '100%' }}
                                min={0}
                                prefix="Rs."
                                placeholder="0.00"
                            />
                        </Form.Item>

                        <Form.Item name="notes" label="Notes">
                            <Input.TextArea rows={3} placeholder="Optional shift note" />
                        </Form.Item>

                        <Button
                            type="primary"
                            htmlType="submit"
                            loading={processing}
                            disabled={!terminalId || !can('pos.shift.open')}
                            block
                        >
                            Open Shift
                        </Button>
                    </Form>
                </Space>
            </Modal>

            <Modal
                title="Checkout"
                open={checkoutOpen}
                onCancel={() => setCheckoutOpen(false)}
                width={460}
                destroyOnClose
                footer={null}
            >
                <Space direction="vertical" size={12} style={{ width: '100%' }}>
                    {checkoutError && (
                        <Alert type="warning" showIcon message={checkoutError} />
                    )}

                    {payments.map((payment, index) => (
                        <Card key={index} size="small">
                            <Space direction="vertical" style={{ width: '100%' }}>
                                <Space.Compact style={{ width: '100%' }}>
                                    <Select
                                        style={{ flex: 1 }}
                                        value={payment.payment_method}
                                        options={paymentOptions}
                                        onChange={(value) =>
                                            setPayments((current) =>
                                                current.map((row, rowIndex) =>
                                                    rowIndex === index
                                                        ? {
                                                              ...row,
                                                              payment_method: value,
                                                          }
                                                        : row,
                                                ),
                                            )
                                        }
                                    />

                                    <Button
                                        danger
                                        icon={<DeleteOutlined />}
                                        disabled={payments.length <= 1}
                                        onClick={() => removePaymentRow(index)}
                                    />
                                </Space.Compact>

                                <InputNumber
                                    style={{ width: '100%' }}
                                    min={0}
                                    value={payment.amount}
                                    disabled={payment.payment_method === 'credit'}
                                    onChange={(value) =>
                                        setPayments((current) =>
                                            current.map((row, rowIndex) =>
                                                rowIndex === index
                                                    ? {
                                                          ...row,
                                                          amount: value || 0,
                                                      }
                                                    : row,
                                            ),
                                        )
                                    }
                                    prefix="Rs."
                                />

                                <Input
                                    placeholder="Reference"
                                    value={payment.reference}
                                    onChange={(event) =>
                                        setPayments((current) =>
                                            current.map((row, rowIndex) =>
                                                rowIndex === index
                                                    ? {
                                                          ...row,
                                                          reference: event.target.value,
                                                      }
                                                    : row,
                                            ),
                                        )
                                    }
                                />

                                <Input
                                    placeholder="Transaction no"
                                    value={payment.transaction_no}
                                    onChange={(event) =>
                                        setPayments((current) =>
                                            current.map((row, rowIndex) =>
                                                rowIndex === index
                                                    ? {
                                                          ...row,
                                                          transaction_no: event.target.value,
                                                      }
                                                    : row,
                                            ),
                                        )
                                    }
                                />
                            </Space>
                        </Card>
                    ))}

                    <Button
                        onClick={() =>
                            setPayments((current) => [
                                ...current,
                                {
                                    ...emptyPayment,
                                },
                            ])
                        }
                        icon={<PlusOutlined />}
                    >
                        Add Payment Method
                    </Button>

                    <Divider />

                    <Descriptions
                        column={1}
                        items={[
                            {
                                key: 'grand_total',
                                label: 'Grand Total',
                                children: `Rs. ${money(summary.grand_total)}`,
                            },
                            {
                                key: 'paid_total',
                                label: 'Amount Received',
                                children: `Rs. ${money(summary.paid_total)}`,
                            },
                            {
                                key: 'change_amount',
                                label: 'Change Due',
                                children: `Rs. ${money(summary.change_amount)}`,
                            },
                        ]}
                    />

                    <Button
                        type="primary"
                        icon={<DollarOutlined />}
                        onClick={completeSale}
                        loading={processing}
                        disabled={
                            !!checkoutError
                        }
                        block
                    >
                        Complete Sale
                    </Button>
                </Space>
            </Modal>

            <Modal
                title="Held Sales"
                open={heldOpen}
                onCancel={() => setHeldOpen(false)}
                footer={null}
                width={520}
            >
                <List
                    dataSource={heldSales}
                    renderItem={(sale) => (
                        <List.Item
                            actions={[
                                <Button key="resume" type="link" onClick={() => resumeHeldSale(sale)}>
                                    Resume
                                </Button>,
                            ]}
                        >
                            <List.Item.Meta
                                title={
                                    <Space>
                                        <Text strong>{sale.sale_no}</Text>
                                        <Tag color={saleStatusColor(sale.status)}>
                                            {sale.status}
                                        </Tag>
                                    </Space>
                                }
                                description={`${sale.customer_name || sale.contact?.name || 'Walk-in'} • Rs. ${money(
                                    sale.grand_total,
                                )}`}
                            />
                        </List.Item>
                    )}
                    locale={{
                        emptyText: 'No held carts',
                    }}
                />
            </Modal>

            <Modal
                title="Receipt Preview"
                open={receiptOpen}
                onCancel={() => setReceiptOpen(false)}
                width={520}
                footer={null}
            >
                {saleReceipt ? (
                    <Space direction="vertical" style={{ width: '100%' }} size={10}>
                        <Title level={4} style={{ margin: 0 }}>
                            {saleReceipt.sale_no}
                        </Title>

                        <Text>
                            {saleReceipt.customer_name || saleReceipt.contact?.name || 'Walk-in Customer'}
                        </Text>

                        <Divider />

                        <List
                            dataSource={saleReceipt.pos_sale_lines || []}
                            renderItem={(line) => (
                                <List.Item>
                                    <Space
                                        style={{
                                            width: '100%',
                                            justifyContent: 'space-between',
                                        }}
                                    >
                                        <Space>
                                            <Text>{line.product_name}</Text>
                                            {line.is_complimentary && <Tag color="blue">Complimentary</Tag>}
                                        </Space>

                                        <Text strong>{money(line.line_total)}</Text>
                                    </Space>
                                </List.Item>
                            )}
                        />

                        <Descriptions
                            column={1}
                            items={[
                                {
                                    key: 'grand_total',
                                    label: 'Grand Total',
                                    children: `Rs. ${money(saleReceipt.grand_total)}`,
                                },
                                {
                                    key: 'paid',
                                    label: 'Paid',
                                    children: `Rs. ${money(saleReceipt.paid_total)}`,
                                },
                                {
                                    key: 'change',
                                    label: 'Change',
                                    children: `Rs. ${money(saleReceipt.change_amount)}`,
                                },
                            ]}
                        />

                        <Button icon={<PrinterOutlined />}>
                            Print Receipt
                        </Button>
                    </Space>
                ) : (
                    <Empty description="No receipt loaded" />
                )}
            </Modal>

            <Modal
                title="Create POS Terminal"
                open={addTerminalOpen}
                onCancel={() => {
                    setAddTerminalOpen(false);
                    addTerminalForm.resetFields();
                }}
                onOk={() => addTerminalForm.submit()}
                confirmLoading={addTerminalLoading}
                destroyOnClose
            >
                <Form
                    form={addTerminalForm}
                    layout="vertical"
                    onFinish={submitAddTerminal}
                    initialValues={{
                        branch_id: activeBranchId,
                    }}
                >
                    <Form.Item
                        name="name"
                        label="Terminal Name"
                        rules={[
                            {
                                required: true,
                                message: 'Terminal name is required.',
                            },
                        ]}
                    >
                        <Input placeholder="e.g. Counter 1" />
                    </Form.Item>

                    {canViewAllBranches ? (
                        <Form.Item name="branch_id" label="Branch">
                            <Select
                                allowClear
                                placeholder="Select branch"
                                options={branchOptions}
                            />
                        </Form.Item>
                    ) : (
                        <Form.Item label="Branch">
                            <Input readOnly value={selectedBranch?.name || '-'} />
                        </Form.Item>
                    )}
                </Form>
            </Modal>

            <Modal
                title={cashMovementType === 'cash_in' ? 'Cash In' : 'Cash Out'}
                open={cashMovementOpen}
                onCancel={() => {
                    setCashMovementOpen(false);
                    cashMovementForm.resetFields();
                }}
                onOk={() => cashMovementForm.submit()}
                confirmLoading={cashMovementLoading}
                destroyOnClose
            >
                <Form
                    form={cashMovementForm}
                    layout="vertical"
                    onFinish={submitCashMovement}
                    initialValues={{
                        type: cashMovementType,
                        amount: 0,
                    }}
                >
                    <Form.Item name="type" label="Movement Type" rules={[{ required: true }]}>
                        <Select
                            options={[
                                { value: 'cash_in', label: 'Cash In' },
                                { value: 'cash_out', label: 'Cash Out' },
                                { value: 'expense', label: 'Expense' },
                                { value: 'drop', label: 'Cash Drop' },
                            ]}
                        />
                    </Form.Item>

                    <Form.Item
                        name="amount"
                        label="Amount"
                        rules={[
                            {
                                required: true,
                                message: 'Amount is required.',
                            },
                            {
                                type: 'number',
                                min: 0.01,
                                message: 'Amount must be greater than 0.',
                            },
                        ]}
                    >
                        <InputNumber style={{ width: '100%' }} min={0} prefix="Rs." placeholder="0.00" />
                    </Form.Item>

                    <Form.Item name="reason" label="Reason / Category">
                        <Input placeholder="e.g. Opening float, Petty cash expense" />
                    </Form.Item>

                    <Form.Item name="notes" label="Notes">
                        <Input.TextArea rows={2} placeholder="Optional notes" />
                    </Form.Item>

                    {currentShift && (
                        <div
                            style={{
                                padding: 10,
                                background: token.colorFillAlter,
                                borderRadius: token.borderRadius,
                                border: `1px solid ${token.colorBorderSecondary}`,
                                fontSize: 12,
                            }}
                        >
                            <Space>
                                <ClockCircleOutlined />
                                <span>
                                    Shift: <strong>{currentShift.shift_no}</strong>
                                    {' · '}Terminal: <strong>{selectedTerminal?.name || '-'}</strong>
                                    {' · '}Branch:{' '}
                                    <strong>
                                        {selectedTerminal?.branch?.name ||
                                            selectedTerminal?.branch_name ||
                                            selectedBranch?.name ||
                                            '-'}
                                    </strong>
                                </span>
                            </Space>
                        </div>
                    )}
                </Form>
            </Modal>

            <Modal
                title="Close POS Shift"
                open={closeShiftOpen}
                onCancel={() => {
                    setCloseShiftOpen(false);
                    closeShiftForm.resetFields();
                }}
                onOk={() => closeShiftForm.submit()}
                confirmLoading={closeShiftLoading}
                okText="Close Shift"
                destroyOnClose
            >
                <Form form={closeShiftForm} layout="vertical" onFinish={submitCloseShift}>
                    <Descriptions
                        size="small"
                        column={1}
                        items={[
                            { key: 'opening', label: 'Opening Cash', children: `Rs. ${money(currentShift?.opening_cash)}` },
                            { key: 'cashSales', label: 'Cash Sales', children: `Rs. ${money(currentShift?.total_cash_sales)}` },
                            { key: 'refunds', label: 'Refunds', children: `Rs. ${money(currentShift?.total_refunds)}` },
                            { key: 'expenses', label: 'Cash Out / Expenses / Drop', children: `Rs. ${money(currentShift?.total_expenses)}` },
                            { key: 'expected', label: 'Expected Cash', children: <Text strong>Rs. {money(currentShift?.expected_cash)}</Text> },
                        ]}
                    />

                    <Form.Item
                        name="counted_cash"
                        label="Counted Cash"
                        rules={[
                            { required: true, message: 'Counted cash is required.' },
                            { type: 'number', min: 0, message: 'Counted cash cannot be negative.' },
                        ]}
                    >
                        <InputNumber style={{ width: '100%' }} min={0} prefix="Rs." placeholder="0.00" />
                    </Form.Item>

                    <Form.Item shouldUpdate noStyle>
                        {({ getFieldValue }) => {
                            const difference = Number(Number(getFieldValue('counted_cash') || 0) - Number(currentShift?.expected_cash || 0));

                            return (
                                <Alert
                                    type={Math.abs(difference) < 0.01 ? 'success' : 'warning'}
                                    showIcon
                                    message={`Difference: Rs. ${money(difference)}`}
                                    style={{ marginBottom: 12 }}
                                />
                            );
                        }}
                    </Form.Item>

                    <Form.Item name="closing_notes" label="Closing Note">
                        <Input.TextArea rows={3} placeholder="Required if cash difference is not zero" />
                    </Form.Item>
                </Form>
            </Modal>

            <style>
                {`
                    .pos-cart-table .ant-table-thead > tr > th {
                        background: ${token.colorFillAlter};
                        color: ${token.colorTextSecondary};
                        font-size: 11px;
                        padding: 6px 4px;
                        white-space: nowrap;
                    }

                    .pos-cart-table .ant-table-tbody > tr > td {
                        padding: 5px 4px;
                        vertical-align: middle;
                    }

                    .pos-cart-table .ant-input-number-input {
                        padding-inline: 5px;
                        text-align: center;
                    }

                    .pos-cart-table .ant-btn-sm {
                        width: 24px;
                        padding-inline: 0;
                    }
                `}
            </style>
        </AuthenticatedLayout>
    );
}
