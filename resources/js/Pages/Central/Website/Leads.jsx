import PageHeader from "@/Components/Central/PageHeader";
import SectionCard from "@/Components/Central/SectionCard";
import CentralLayout from "@/Layouts/CentralLayout";
import { DownloadOutlined, SearchOutlined } from "@ant-design/icons";
import { router } from "@inertiajs/react";
import { Button, Input, Select, Space, Table, Tag, Typography } from "antd";
import { useState } from "react";

const statuses = ["new", "contacted", "qualified", "won", "closed"];
export default function Leads({ leads, filters }) {
    const [search, setSearch] = useState(filters.search || "");
    const visit = (extra = {}) =>
        router.get(
            route("central.website-leads.index"),
            { ...filters, search: search || undefined, ...extra },
            { preserveState: true, replace: true },
        );
    const columns = [
        {
            title: "Contact",
            render: (_, lead) => (
                <>
                    <Typography.Text strong>{lead.name}</Typography.Text>
                    <br />
                    <a href={`mailto:${lead.email}`}>{lead.email}</a>
                </>
            ),
        },
        {
            title: "Company",
            dataIndex: "company",
            render: (value) => value || "—",
        },
        {
            title: "Request",
            dataIndex: "type",
            render: (value) => <Tag>{value}</Tag>,
        },
        { title: "Message", dataIndex: "message", ellipsis: true },
        {
            title: "Received",
            dataIndex: "created_at",
            render: (value) => new Date(value).toLocaleString(),
        },
        {
            title: "Status",
            render: (_, lead) => (
                <Select
                    size="small"
                    value={lead.status}
                    style={{ width: 125 }}
                    options={statuses.map((value) => ({ value, label: value }))}
                    onChange={(status) =>
                        router.patch(
                            route("central.website-leads.update", lead.id),
                            { status, notes: lead.notes },
                            { preserveScroll: true },
                        )
                    }
                />
            ),
        },
    ];
    return (
        <CentralLayout title="Website Leads">
            <PageHeader
                eyebrow="Website"
                title="Leads"
                description="Review contact, demo, and newsletter requests captured by the public website."
                actions={
                    <Button
                        href={route("central.website-leads.export")}
                        icon={<DownloadOutlined />}
                    >
                        Export CSV
                    </Button>
                }
            />
            <SectionCard>
                <Space wrap style={{ marginBottom: 18 }}>
                    <Input.Search
                        value={search}
                        prefix={<SearchOutlined />}
                        placeholder="Search name, email, or company"
                        onChange={(e) => setSearch(e.target.value)}
                        onSearch={() => visit({ page: undefined })}
                    />
                    <Select
                        allowClear
                        value={filters.status}
                        placeholder="Status"
                        options={statuses.map((value) => ({
                            value,
                            label: value,
                        }))}
                        onChange={(status) =>
                            visit({ status, page: undefined })
                        }
                    />
                </Space>
                <Table
                    rowKey="id"
                    dataSource={leads.data}
                    columns={columns}
                    pagination={{
                        current: leads.current_page,
                        total: leads.total,
                        pageSize: leads.per_page,
                        onChange: (page) => visit({ page }),
                        showSizeChanger: false,
                    }}
                />
            </SectionCard>
        </CentralLayout>
    );
}
