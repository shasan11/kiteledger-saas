import { useCallback, useMemo, useRef, useState } from 'react';
import { Select, Space, Tag, Typography, message as antMessage } from 'antd';
import { CheckCircleFilled, PlusOutlined } from '@ant-design/icons';
import axios from 'axios';

const { Text } = Typography;

const CREATE_VALUE = '__create__';

/**
 * Links one extracted value to an ERP record, in a single control.
 *
 * The reviewer used to answer two questions in two places: "is this in the
 * catalogue?" in a matches table, and "create it?" behind a confirm dialog.
 * Here they search, or accept the name the document already gave, and the
 * server links an existing record or creates one — get-or-create — so the
 * same item on three lines cannot become three products.
 */
export default function EntityLinkSelect({
    publicId,
    match,
    type = 'product',
    canLink = true,
    canCreate = true,
    placeholder = 'Link a record',
    onLinked,
}) {
    const [options, setOptions] = useState([]);
    const [term, setTerm] = useState('');
    const [fetching, setFetching] = useState(false);
    const [saving, setSaving] = useState(false);
    const debounceRef = useRef(null);
    const requestRef = useRef(0);

    const suggestions = useMemo(
        () =>
            (match?.options?.suggestions || []).map((suggestion) => ({
                value: suggestion.id,
                label: suggestion.name || suggestion.code,
                hint: suggestion.reason,
            })),
        [match],
    );

    const search = useCallback(
        (value) => {
            setTerm(value);
            window.clearTimeout(debounceRef.current);

            debounceRef.current = window.setTimeout(async () => {
                const requestId = ++requestRef.current;
                setFetching(true);
                try {
                    const { data } = await axios.get(`/api/document-uploads/${publicId}/entity-search`, {
                        params: { type, q: value },
                    });
                    /* Ignore a slower earlier response so the list matches what was typed last. */
                    if (requestId !== requestRef.current) return;
                    setOptions((data.results || []).map((record) => ({
                        value: record.id,
                        label: record.name,
                        hint: record.code,
                    })));
                } catch {
                    if (requestId === requestRef.current) setOptions([]);
                } finally {
                    if (requestId === requestRef.current) setFetching(false);
                }
            }, 300);
        },
        [publicId, type],
    );

    const link = async (payload, successText) => {
        setSaving(true);
        try {
            const { data } = await axios.post(`/api/document-uploads/matches/${match.id}/link`, payload);
            antMessage.success(data.created ? `“${data.record?.label}” created and linked.` : successText);
            await onLinked?.();
        } catch (e) {
            antMessage.error(e.response?.data?.message || 'This record could not be linked.');
        } finally {
            setSaving(false);
        }
    };

    if (!match) return <Text type="secondary">—</Text>;

    if (match.linked) {
        return (
            <Space size={6}>
                <CheckCircleFilled style={{ color: '#52c41a' }} />
                <Text>{match.matched_label || 'Linked'}</Text>
                {match.match_status === 'created' && <Tag bordered={false}>New</Tag>}
            </Space>
        );
    }

    /* The document's own wording is the default name, so the common case is
       one click: open, press the create row, done. */
    const newName = (term || match.extracted_name || '').trim();
    const alreadyListed = [...options, ...suggestions].some(
        (option) => String(option.label || '').toLowerCase() === newName.toLowerCase(),
    );

    /* Suggestions stay on top with their reason ("Matched by SKU"), because a
       reason is something the reviewer can check; search results follow. */
    const listed = [
        ...suggestions,
        ...options.filter((option) => !suggestions.some((suggestion) => suggestion.value === option.value)),
    ];

    return (
        <Select
            value={null}
            placeholder={placeholder}
            style={{ width: '100%', minWidth: 180 }}
            showSearch
            allowClear={false}
            filterOption={false}
            disabled={!canLink || saving}
            loading={fetching || saving}
            onSearch={search}
            onFocus={() => { if (!options.length) search(''); }}
            onChange={(value) => {
                if (value === CREATE_VALUE) {
                    link({ name: newName }, `“${newName}” linked.`);
                    return;
                }
                const picked = listed.find((option) => option.value === value);
                link({ matched_id: value }, `${picked?.label || 'Record'} linked.`);
            }}
            notFoundContent={fetching ? 'Searching…' : 'No matching records'}
            options={[
                ...(canCreate && newName && !alreadyListed
                    ? [{
                        value: CREATE_VALUE,
                        label: (
                            <Space size={6}>
                                <PlusOutlined />
                                <Text>Create “{newName}”</Text>
                            </Space>
                        ),
                    }]
                    : []),
                ...listed.map((option) => ({
                    value: option.value,
                    label: (
                        <Space size={6}>
                            <Text>{option.label}</Text>
                            {option.hint && <Text type="secondary" style={{ fontSize: 11 }}>{option.hint}</Text>}
                        </Space>
                    ),
                })),
            ]}
        />
    );
}
