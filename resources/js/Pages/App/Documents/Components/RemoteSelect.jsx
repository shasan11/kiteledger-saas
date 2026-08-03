import { useEffect, useMemo, useState } from 'react';
import { Select } from 'antd';
import axios from 'axios';
import { asArray, optionLabel } from '../Upload/documentUtils';

/*
 * Searchable select backed by a paginated API endpoint.
 *
 * Keeps the currently selected record visible even when it falls outside the
 * latest search results, so an existing choice never silently disappears while
 * the user is typing.
 */
export default function RemoteSelect({ endpoint, value, onChange, placeholder, selectedLabel }) {
    const [options, setOptions] = useState([]);
    const [loading, setLoading] = useState(false);
    const [resolvedLabel, setResolvedLabel] = useState(selectedLabel || null);

    const load = async (search = '') => {
        setLoading(true);

        try {
            const { data } = await axios.get(endpoint, {
                params: { search, per_page: 20 },
            });

            const rows = asArray(data?.results ?? data?.data ?? data);

            setOptions(rows.map((row) => ({
                value: row.id ?? row.value,
                label: optionLabel(row),
            })));
        } catch {
            setOptions([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [endpoint]);

    useEffect(() => {
        setResolvedLabel(selectedLabel || null);
    }, [selectedLabel, value]);

    useEffect(() => {
        if (!value || selectedLabel || options.some((item) => String(item.value) === String(value))) {
            return;
        }

        let active = true;
        const loadSelected = async () => {
            try {
                const { data } = await axios.get(`${String(endpoint).replace(/\/+$/, '')}/${value}`);
                const record = data?.result || data?.data || data;
                const label = record && typeof record === 'object' ? optionLabel(record) : null;

                if (active && label && label !== 'Record') {
                    setResolvedLabel(label);
                }
            } catch {
                // The list endpoint may not expose a show route. Keep the safe label fallback.
            }
        };

        void loadSelected();

        return () => {
            active = false;
        };
    }, [endpoint, options, selectedLabel, value]);

    const displayOptions = useMemo(() => {
        const next = [...options];

        if (value && !next.some((item) => String(item.value) === String(value))) {
            next.unshift({
                value,
                label: resolvedLabel || (isUuidLike(value) ? 'Linked record' : safeDisplay(value)),
            });
        }

        return next;
    }, [options, resolvedLabel, value]);

    return (
        <Select
            showSearch
            allowClear
            value={value}
            onChange={onChange}
            onSearch={load}
            loading={loading}
            filterOption={false}
            placeholder={placeholder}
            options={displayOptions}
        />
    );
}
