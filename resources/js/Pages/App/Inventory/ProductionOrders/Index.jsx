import { useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout/index.jsx';
import { Head } from '@inertiajs/react';
import { Alert, Card, Empty, Tabs, Typography } from 'antd';

const { Text } = Typography;

export default function Index() {
    const [activeKey, setActiveKey] = useState('approved');

    return (
        <AuthenticatedLayout
            header={
                <h2 className="text-xl font-semibold leading-tight text-gray-800">
                    Production Orders
                </h2>
            }
        >
            <Head title="Production Orders" />

            <Card bodyStyle={{ padding: 0 }}>
                <Tabs
                    activeKey={activeKey}
                    onChange={setActiveKey}
                    items={[
                        {
                            key: 'approved',
                            label: 'Approved',
                            children: (
                                <div style={{ padding: 24 }}>
                                    <Alert
                                        showIcon
                                        type="info"
                                        message="Production Order backend resource is not present in the current Laravel workspace."
                                        description="The show route and customer-facing layout are prepared, but the actual model/controller/API needs to exist before an Approved or Draft listing can be wired safely without inventing fields."
                                    />

                                    <div style={{ marginTop: 24 }}>
                                        <Empty description="No production order records available from the current API" />
                                    </div>
                                </div>
                            ),
                        },
                        {
                            key: 'draft',
                            label: 'Draft',
                            children: (
                                <div style={{ padding: 24 }}>
                                    <Text type="secondary">
                                        Draft production orders will appear here once the production order API resource is added to this workspace.
                                    </Text>
                                </div>
                            ),
                        },
                    ]}
                />
            </Card>
        </AuthenticatedLayout>
    );
}
