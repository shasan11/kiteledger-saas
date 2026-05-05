import { useEffect, useMemo, useState } from 'react';
import { Head, Link } from '@inertiajs/react';
import { Alert, Button, Card, Col, Descriptions, Empty, Row, Skeleton, Space, Tag, Typography } from 'antd';
import { ArrowLeftOutlined, MailOutlined, PhoneOutlined } from '@ant-design/icons';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';

const { Title, Text } = Typography;
const BACKEND = import.meta.env.VITE_APP_BACKEND_URL || '';
const api = (p) => `${BACKEND}${p}`;

const humanize = (k = '') => k.replace(/_/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase());
const isNil = (v) => v === null || v === undefined || v === '';

function pretty(v) {
  if (isNil(v)) return '-';
  if (typeof v === 'boolean') return <Tag color={v ? 'green' : 'red'}>{v ? 'Yes' : 'No'}</Tag>;
  if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}(T.*)?$/.test(v)) return new Date(v).toLocaleString();
  return String(v);
}

export default function Show({ id }) {
    return (
        <AuthenticatedLayout
            header={
                <h2 className="text-xl font-semibold leading-tight text-gray-800">
                    Contact Details
                </h2>
            }
        >
            <Head title="Contact Details" />

            <div className="rounded-lg border border-dashed border-gray-300 bg-white p-8 text-gray-700">
                Viewing contact: {id}
            </div>
    </AuthenticatedLayout>
  );
}
