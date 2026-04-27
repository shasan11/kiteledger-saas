import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout/index.jsx';
import { Head } from '@inertiajs/react';
import { Button, Card, Checkbox, Col, Form, Input, Row, Space, Typography } from 'antd';
import { useFormik } from 'formik';
import * as Yup from 'yup';

const validationSchema = Yup.object({
    name: Yup.string().max(120, 'Max 120 characters').required('Group name is required'),
    parent_id: Yup.string().nullable(),
    description: Yup.string().nullable(),
    active: Yup.boolean(),
});

export default function Index() {
    const formik = useFormik({
        initialValues: {
            name: '',
            parent_id: '',
            description: '',
            active: true,
        },
        validationSchema,
        onSubmit: (values) => {
            // Ready for API integration: POST /api/contact-groups
            // eslint-disable-next-line no-console
            console.log('Contact Group Payload', values);
        },
    });

    const getError = (field) =>
        formik.touched[field] && formik.errors[field] ? formik.errors[field] : null;

    return (
        <AuthenticatedLayout
            header={
                <h2 className="text-xl font-semibold leading-tight text-gray-800">
                    Contact Group
                </h2>
            }
        >
            <Head title="Contact Group" />

            <Card className="!rounded-lg">
                <Typography.Title level={4}>Create Contact Group</Typography.Title>
                <Form layout="vertical" onFinish={formik.handleSubmit}>
                    <Row gutter={16}>
                        <Col xs={24} md={12}>
                            <Form.Item
                                label="Group Name"
                                validateStatus={getError('name') ? 'error' : ''}
                                help={getError('name')}
                            >
                                <Input
                                    name="name"
                                    value={formik.values.name}
                                    onChange={formik.handleChange}
                                    onBlur={formik.handleBlur}
                                    placeholder="Retail Customers"
                                />
                            </Form.Item>
                        </Col>
                        <Col xs={24} md={12}>
                            <Form.Item
                                label="Parent Group ID"
                                validateStatus={getError('parent_id') ? 'error' : ''}
                                help={getError('parent_id')}
                            >
                                <Input
                                    name="parent_id"
                                    value={formik.values.parent_id}
                                    onChange={formik.handleChange}
                                    onBlur={formik.handleBlur}
                                    placeholder="Optional UUID"
                                />
                            </Form.Item>
                        </Col>
                    </Row>

                    <Form.Item
                        label="Description"
                        validateStatus={getError('description') ? 'error' : ''}
                        help={getError('description')}
                    >
                        <Input.TextArea
                            name="description"
                            value={formik.values.description}
                            onChange={formik.handleChange}
                            onBlur={formik.handleBlur}
                            rows={4}
                            placeholder="Description for this group"
                        />
                    </Form.Item>

                    <Form.Item>
                        <Checkbox
                            checked={formik.values.active}
                            onChange={(event) =>
                                formik.setFieldValue('active', event.target.checked)
                            }
                        >
                            Active
                        </Checkbox>
                    </Form.Item>

                    <Space>
                        <Button type="primary" htmlType="submit">
                            Save Contact Group
                        </Button>
                        <Button htmlType="button" onClick={formik.handleReset}>
                            Reset
                        </Button>
                    </Space>
                </Form>
            </Card>
        </AuthenticatedLayout>
    );
}
