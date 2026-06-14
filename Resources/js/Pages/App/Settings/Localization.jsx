import {
    DeleteOutlined,
    DownloadOutlined,
    EditOutlined,
    PlusOutlined,
    SaveOutlined,
    UploadOutlined,
} from '@ant-design/icons';
import { router, usePage } from '@inertiajs/react';
import axios from 'axios';
import {
    Alert,
    Button,
    Card,
    Checkbox,
    Col,
    Form,
    Input,
    InputNumber,
    Modal,
    Popconfirm,
    Progress,
    Row,
    Select,
    Space,
    Switch,
    Table,
    Tag,
    Typography,
    Upload,
    message,
} from 'antd';
import { useEffect, useMemo, useState } from 'react';

import { useTrans } from '@/lib/i18n';

const { Paragraph, Text, Title } = Typography;

const apiRoute = (name, params) => route(name, params);

export default function Localization() {
    const page = usePage();
    const t = useTrans();
    const currentLocale = page.props.locale?.current || 'en';
    const [languages, setLanguages] = useState([]);
    const [keyCount, setKeyCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [editorLoading, setEditorLoading] = useState(false);
    const [savingTranslations, setSavingTranslations] = useState(false);
    const [selectedLanguage, setSelectedLanguage] = useState(null);
    const [translationRows, setTranslationRows] = useState([]);
    const [translatedCount, setTranslatedCount] = useState(0);
    const [dirtyTranslations, setDirtyTranslations] = useState({});
    const [search, setSearch] = useState('');
    const [missingOnly, setMissingOnly] = useState(false);
    const [languageModalOpen, setLanguageModalOpen] = useState(false);
    const [editingLanguage, setEditingLanguage] = useState(null);
    const [form] = Form.useForm();

    const loadLanguages = async () => {
        setLoading(true);

        try {
            const { data } = await axios.get(
                apiRoute('localization.languages.index'),
            );
            const items = Array.isArray(data?.languages) ? data.languages : [];

            setLanguages(items);
            setKeyCount(Number(data?.key_count || 0));

            setSelectedLanguage((current) => {
                if (current) {
                    return items.find((item) => item.id === current.id) || null;
                }

                return (
                    items.find((item) => item.code === currentLocale) ||
                    items[0] ||
                    null
                );
            });
        } catch (error) {
            message.error(
                error?.response?.data?.message ||
                    t('Unable to load language settings.'),
            );
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadLanguages();
    }, []);

    useEffect(() => {
        if (!selectedLanguage?.id) {
            setTranslationRows([]);
            return;
        }

        const loadTranslations = async () => {
            setEditorLoading(true);

            try {
                const { data } = await axios.get(
                    apiRoute('localization.translations.index', {
                        language: selectedLanguage.id,
                    }),
                );

                setTranslationRows(Array.isArray(data?.rows) ? data.rows : []);
                setTranslatedCount(Number(data?.translated || 0));
                setDirtyTranslations({});
            } catch (error) {
                message.error(
                    error?.response?.data?.message ||
                        t('Unable to load translations.'),
                );
            } finally {
                setEditorLoading(false);
            }
        };

        loadTranslations();
    }, [selectedLanguage?.id, selectedLanguage?.reload]);

    const filteredRows = useMemo(() => {
        const query = search.trim().toLowerCase();

        return translationRows.filter((row) => {
            const value = dirtyTranslations[row.key] ?? row.value ?? '';
            const matchesSearch =
                !query ||
                row.key.toLowerCase().includes(query) ||
                String(value).toLowerCase().includes(query);
            const isMissing = String(value).trim() === '';

            return matchesSearch && (!missingOnly || isMissing);
        });
    }, [dirtyTranslations, missingOnly, search, translationRows]);

    const openCreateModal = () => {
        setEditingLanguage(null);
        form.resetFields();
        form.setFieldsValue({
            direction: 'ltr',
            is_active: true,
            is_default: false,
            sort_order: 100,
        });
        setLanguageModalOpen(true);
    };

    const openEditModal = (language) => {
        setEditingLanguage(language);
        form.setFieldsValue({
            code: language.code,
            name: language.name,
            native_name: language.native_name || language.native,
            direction: language.direction || language.dir,
            date_locale: language.date_locale,
            is_active: language.is_active,
            is_default: language.is_default,
            sort_order: language.sort_order,
        });
        setLanguageModalOpen(true);
    };

    const saveLanguage = async () => {
        const values = await form.validateFields();

        try {
            if (editingLanguage) {
                await axios.put(
                    apiRoute('localization.languages.update', {
                        language: editingLanguage.id,
                    }),
                    values,
                );
                message.success(t('Language updated successfully.'));
            } else {
                await axios.post(
                    apiRoute('localization.languages.store'),
                    values,
                );
                message.success(t('Language added successfully.'));
            }

            setLanguageModalOpen(false);
            await loadLanguages();
        } catch (error) {
            message.error(
                error?.response?.data?.message || t('Unable to save language.'),
            );
        }
    };

    const updateLanguage = async (language, values) => {
        try {
            await axios.put(
                apiRoute('localization.languages.update', {
                    language: language.id,
                }),
                values,
            );
            await loadLanguages();
        } catch (error) {
            message.error(
                error?.response?.data?.message || t('Unable to update language.'),
            );
        }
    };

    const deleteLanguage = async (language) => {
        try {
            await axios.delete(
                apiRoute('localization.languages.destroy', {
                    language: language.id,
                }),
            );
            message.success(t('Language deleted successfully.'));
            setSelectedLanguage(null);
            await loadLanguages();
        } catch (error) {
            message.error(
                error?.response?.data?.message || t('Unable to delete language.'),
            );
        }
    };

    const saveTranslations = async () => {
        if (!selectedLanguage?.id || !Object.keys(dirtyTranslations).length) {
            return;
        }

        setSavingTranslations(true);

        try {
            const { data } = await axios.put(
                apiRoute('localization.translations.update', {
                    language: selectedLanguage.id,
                }),
                { translations: dirtyTranslations },
            );
            setTranslationRows((rows) =>
                rows.map((row) =>
                    Object.hasOwn(dirtyTranslations, row.key)
                        ? { ...row, value: dirtyTranslations[row.key] }
                        : row,
                ),
            );
            setTranslatedCount(Number(data?.translated || translatedCount));
            setDirtyTranslations({});
            message.success(t('Translations saved successfully.'));
        } catch (error) {
            message.error(
                error?.response?.data?.message ||
                    t('Unable to save translations.'),
            );
        } finally {
            setSavingTranslations(false);
        }
    };

    const exportTranslations = () => {
        if (!selectedLanguage) return;

        const output = Object.fromEntries(
            translationRows.map((row) => [
                row.key,
                dirtyTranslations[row.key] ?? row.value ?? '',
            ]),
        );
        const blob = new Blob([`${JSON.stringify(output, null, 4)}\n`], {
            type: 'application/json;charset=utf-8',
        });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');

        link.href = url;
        link.download = `${selectedLanguage.code}.json`;
        link.click();
        URL.revokeObjectURL(url);
    };

    const importTranslations = async (file) => {
        if (!selectedLanguage?.id) return false;

        try {
            const translations = JSON.parse(await file.text());

            await axios.post(
                apiRoute('localization.translations.import', {
                    language: selectedLanguage.id,
                }),
                { translations },
            );
            message.success(t('Translations imported successfully.'));
            setSelectedLanguage({ ...selectedLanguage, reload: Date.now() });
        } catch (error) {
            message.error(
                error?.response?.data?.message ||
                    t('The translation file is not valid JSON.'),
            );
        }

        return false;
    };

    const switchLanguage = (code) => {
        router.post(
            route('locale.change'),
            { locale: code, persist: true },
            {
                preserveScroll: true,
                preserveState: false,
                onSuccess: (page) => {
                    window.dispatchEvent(
                        new CustomEvent('kiteledger-locale-change', {
                            detail: {
                                locale: page.props.locale,
                                translations: page.props.translations,
                            },
                        }),
                    );
                },
            },
        );
    };

    const languageColumns = [
        {
            title: t('Language'),
            key: 'language',
            render: (_, language) => (
                <Space direction="vertical" size={0}>
                    <Space>
                        <Text strong>{language.native_name || language.native}</Text>
                        {language.is_default && <Tag color="blue">{t('Default')}</Tag>}
                        {language.code === currentLocale && (
                            <Tag color="green">{t('Current')}</Tag>
                        )}
                    </Space>
                    <Text type="secondary">
                        {language.name} ({language.code})
                    </Text>
                </Space>
            ),
        },
        {
            title: t('Direction'),
            dataIndex: 'direction',
            width: 100,
            render: (value, row) => (
                <Tag>{String(value || row.dir || 'ltr').toUpperCase()}</Tag>
            ),
        },
        {
            title: t('Active'),
            dataIndex: 'is_active',
            width: 90,
            render: (active, language) => (
                <Switch
                    size="small"
                    checked={active}
                    disabled={language.is_default || !language.id}
                    onChange={(checked) =>
                        updateLanguage(language, { is_active: checked })
                    }
                />
            ),
        },
        {
            title: t('Actions'),
            key: 'actions',
            width: 300,
            render: (_, language) => (
                <Space wrap>
                    <Button
                        size="small"
                        onClick={() => switchLanguage(language.code)}
                    >
                        {t('Use')}
                    </Button>
                    {!language.is_default && language.id && (
                        <Button
                            size="small"
                            onClick={() =>
                                updateLanguage(language, { is_default: true })
                            }
                        >
                            {t('Set default')}
                        </Button>
                    )}
                    <Button
                        size="small"
                        icon={<EditOutlined />}
                        disabled={!language.id}
                        onClick={() => openEditModal(language)}
                    />
                    {!language.is_system && !language.is_default && (
                        <Popconfirm
                            title={t('Delete this language?')}
                            onConfirm={() => deleteLanguage(language)}
                        >
                            <Button
                                danger
                                size="small"
                                icon={<DeleteOutlined />}
                            />
                        </Popconfirm>
                    )}
                </Space>
            ),
        },
    ];

    const translationColumns = [
        {
            title: t('English key'),
            dataIndex: 'key',
            width: '42%',
            render: (value) => (
                <Paragraph
                    copyable={{ text: value }}
                    style={{ marginBottom: 0, wordBreak: 'break-word' }}
                >
                    {value}
                </Paragraph>
            ),
        },
        {
            title: selectedLanguage?.native_name || selectedLanguage?.native || t('Translation'),
            key: 'translation',
            render: (_, row) => (
                <Input.TextArea
                    autoSize={{ minRows: 1, maxRows: 4 }}
                    value={dirtyTranslations[row.key] ?? row.value ?? ''}
                    placeholder={row.english}
                    onChange={(event) =>
                        setDirtyTranslations((current) => ({
                            ...current,
                            [row.key]: event.target.value,
                        }))
                    }
                />
            ),
        },
    ];

    const completion = keyCount
        ? Math.min(100, Math.round((translatedCount / keyCount) * 100))
        : 0;

    return (
        <div style={{ padding: 16 }}>
            <Space direction="vertical" size="large" style={{ width: '100%' }}>
                <div>
                    <Title level={4} style={{ marginBottom: 4 }}>
                        {t('Language & Localization')}
                    </Title>
                    <Text type="secondary">
                        {t('Add languages, choose the default language, and translate every visible interface string.')}
                    </Text>
                </div>

                {!languages.every((language) => language.id) && (
                    <Alert
                        type="warning"
                        showIcon
                        message={t('Run the latest database migrations to enable language management.')}
                    />
                )}

                <Card
                    title={t('Installed languages')}
                    extra={
                        <Button
                            type="primary"
                            icon={<PlusOutlined />}
                            onClick={openCreateModal}
                        >
                            {t('Add language')}
                        </Button>
                    }
                >
                    <Table
                        rowKey={(row) => row.id || row.code}
                        loading={loading}
                        columns={languageColumns}
                        dataSource={languages}
                        pagination={false}
                        scroll={{ x: 760 }}
                    />
                </Card>

                <Card
                    title={t('Translation editor')}
                    extra={
                        <Space wrap>
                            <Select
                                value={selectedLanguage?.id}
                                placeholder={t('Select language')}
                                style={{ minWidth: 180 }}
                                options={languages
                                    .filter((language) => language.id)
                                    .map((language) => ({
                                        value: language.id,
                                        label: `${language.native_name || language.native} (${language.code})`,
                                    }))}
                                onChange={(id) =>
                                    setSelectedLanguage(
                                        languages.find((item) => item.id === id),
                                    )
                                }
                            />
                            <Upload
                                accept=".json,application/json"
                                showUploadList={false}
                                beforeUpload={importTranslations}
                                disabled={!selectedLanguage?.id}
                            >
                                <Button icon={<UploadOutlined />}>
                                    {t('Import JSON')}
                                </Button>
                            </Upload>
                            <Button
                                icon={<DownloadOutlined />}
                                disabled={!selectedLanguage}
                                onClick={exportTranslations}
                            >
                                {t('Export JSON')}
                            </Button>
                            <Button
                                type="primary"
                                icon={<SaveOutlined />}
                                loading={savingTranslations}
                                disabled={!Object.keys(dirtyTranslations).length}
                                onClick={saveTranslations}
                            >
                                {t('Save changes')}
                            </Button>
                        </Space>
                    }
                >
                    {selectedLanguage ? (
                        <Space
                            direction="vertical"
                            size="middle"
                            style={{ width: '100%' }}
                        >
                            <Row gutter={[12, 12]} align="middle">
                                <Col flex="auto">
                                    <Input.Search
                                        allowClear
                                        value={search}
                                        placeholder={t('Search translation keys')}
                                        onChange={(event) => setSearch(event.target.value)}
                                    />
                                </Col>
                                <Col>
                                    <Checkbox
                                        checked={missingOnly}
                                        onChange={(event) =>
                                            setMissingOnly(event.target.checked)
                                        }
                                    >
                                        {t('Missing only')}
                                    </Checkbox>
                                </Col>
                                <Col flex="260px">
                                    <Progress
                                        percent={completion}
                                        format={() =>
                                            `${translatedCount}/${keyCount}`
                                        }
                                    />
                                </Col>
                            </Row>

                            <Table
                                rowKey="key"
                                loading={editorLoading}
                                columns={translationColumns}
                                dataSource={filteredRows}
                                pagination={{
                                    defaultPageSize: 25,
                                    showSizeChanger: true,
                                    pageSizeOptions: [25, 50, 100],
                                    showTotal: (total) =>
                                        t(':count translation keys', {
                                            count: total,
                                        }),
                                }}
                                scroll={{ x: 900 }}
                            />
                        </Space>
                    ) : (
                        <Alert
                            type="info"
                            showIcon
                            message={t('Select a language to edit its translations.')}
                        />
                    )}
                </Card>
            </Space>

            <Modal
                open={languageModalOpen}
                title={editingLanguage ? t('Edit language') : t('Add language')}
                okText={t('Save')}
                cancelText={t('Cancel')}
                onOk={saveLanguage}
                onCancel={() => setLanguageModalOpen(false)}
                destroyOnHidden
            >
                <Form form={form} layout="vertical">
                    <Row gutter={12}>
                        <Col span={8}>
                            <Form.Item
                                name="code"
                                label={t('Locale code')}
                                rules={[
                                    { required: true },
                                    {
                                        pattern: /^[a-z]{2,3}(?:-[A-Z]{2})?$/,
                                        message: t('Use a code such as en, fr, or pt-BR.'),
                                    },
                                ]}
                            >
                                <Input
                                    placeholder="fr"
                                    disabled={editingLanguage?.is_system}
                                />
                            </Form.Item>
                        </Col>
                        <Col span={16}>
                            <Form.Item
                                name="name"
                                label={t('Language name')}
                                rules={[{ required: true }]}
                            >
                                <Input placeholder="French" />
                            </Form.Item>
                        </Col>
                    </Row>

                    <Form.Item
                        name="native_name"
                        label={t('Native name')}
                        rules={[{ required: true }]}
                    >
                        <Input placeholder="Français" />
                    </Form.Item>

                    <Row gutter={12}>
                        <Col span={12}>
                            <Form.Item
                                name="direction"
                                label={t('Text direction')}
                                rules={[{ required: true }]}
                            >
                                <Select
                                    options={[
                                        { value: 'ltr', label: 'LTR' },
                                        { value: 'rtl', label: 'RTL' },
                                    ]}
                                />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item
                                name="date_locale"
                                label={t('Date locale')}
                            >
                                <Input placeholder="fr" />
                            </Form.Item>
                        </Col>
                    </Row>

                    {!editingLanguage && (
                        <Form.Item name="copy_from" label={t('Copy translations from')}>
                            <Select
                                allowClear
                                options={languages
                                    .filter((language) => language.id)
                                    .map((language) => ({
                                        value: language.code,
                                        label: `${language.native_name || language.native} (${language.code})`,
                                    }))}
                            />
                        </Form.Item>
                    )}

                    <Row gutter={12}>
                        <Col span={8}>
                            <Form.Item name="is_active" label={t('Active')} valuePropName="checked">
                                <Switch />
                            </Form.Item>
                        </Col>
                        <Col span={8}>
                            <Form.Item name="is_default" label={t('Default')} valuePropName="checked">
                                <Switch />
                            </Form.Item>
                        </Col>
                        <Col span={8}>
                            <Form.Item name="sort_order" label={t('Sort order')}>
                                <InputNumber min={0} style={{ width: '100%' }} />
                            </Form.Item>
                        </Col>
                    </Row>
                </Form>
            </Modal>
        </div>
    );
}
