import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout/index.jsx';
import { Head } from '@inertiajs/react';
import {
    Button,
    Card,
    Col,
    DatePicker,
    Divider,
    Form,
    Input,
    InputNumber,
    Row,
    Space,
    Typography,
} from 'antd';
import dayjs from 'dayjs';
import { FieldArray, FormikProvider, useFormik } from 'formik';
import * as Yup from 'yup';

const lineSchema = Yup.object({
    to_bank_account_id: Yup.string().required('To bank account is required'),
    amount: Yup.number().typeError('Amount must be numeric').min(0.01).required('Amount is required'),
    exchange_rate_to_default: Yup.number().typeError('Exchange rate must be numeric').min(0).required('Exchange rate is required'),
    description: Yup.string().nullable(),
});

const validationSchema = Yup.object({
    transfer_date: Yup.string().required('Transfer date is required'),
    from_bank_account_id: Yup.string().required('From bank account is required'),
    currency_id: Yup.string().required('Currency is required'),
    transfer_no: Yup.string().nullable(),
    reference: Yup.string().nullable(),
    notes: Yup.string().nullable(),
    items: Yup.array().of(lineSchema).min(1, 'At least one line item is required'),
});

export default function Index() {
    const formik = useFormik({
        initialValues: {
            transfer_date: dayjs().format('YYYY-MM-DD'),
            transfer_no: '',
            from_bank_account_id: '',
            currency_id: '',
            reference: '',
            notes: '',
            items: [
                {
                    to_bank_account_id: '',
                    amount: 0,
                    exchange_rate_to_default: 1,
                    description: '',
                },
            ],
        },
        validationSchema,
        onSubmit: (values) => {
            const payload = {
                ...values,
                total_amount: values.items.reduce(
                    (sum, item) => sum + Number(item.amount || 0),
                    0,
                ),
            };

            // Ready for API integration: POST /api/cash-transfers
            // eslint-disable-next-line no-console
            console.log('Cash Transfer Payload', payload);
        },
    });

    const getError = (path) =>
        formik.touched[path] && formik.errors[path] ? formik.errors[path] : null;

    return (
        <AuthenticatedLayout
            header={
                <h2 className="text-xl font-semibold leading-tight text-gray-800">
                    Cash Transfer
                </h2>
            }
        >
            <Head title="Cash Transfer" />

            <Card className="!rounded-lg">
                <Typography.Title level={4}>Create Cash Transfer</Typography.Title>

                <FormikProvider value={formik}>
                    <Form layout="vertical" onFinish={formik.handleSubmit}>
                        <Row gutter={16}>
                            <Col xs={24} md={8}>
                                <Form.Item label="Transfer Date" help={getError('transfer_date')} validateStatus={getError('transfer_date') ? 'error' : ''}>
                                    <DatePicker
                                        className="!w-full"
                                        value={formik.values.transfer_date ? dayjs(formik.values.transfer_date) : null}
                                        onChange={(date) =>
                                            formik.setFieldValue(
                                                'transfer_date',
                                                date ? date.format('YYYY-MM-DD') : '',
                                            )
                                        }
                                    />
                                </Form.Item>
                            </Col>
                            <Col xs={24} md={8}>
                                <Form.Item label="Transfer No">
                                    <Input
                                        name="transfer_no"
                                        value={formik.values.transfer_no}
                                        onChange={formik.handleChange}
                                        placeholder="CT-0001"
                                    />
                                </Form.Item>
                            </Col>
                            <Col xs={24} md={8}>
                                <Form.Item label="Reference">
                                    <Input
                                        name="reference"
                                        value={formik.values.reference}
                                        onChange={formik.handleChange}
                                        placeholder="Reference"
                                    />
                                </Form.Item>
                            </Col>
                        </Row>

                        <Row gutter={16}>
                            <Col xs={24} md={12}>
                                <Form.Item label="From Bank Account ID" help={getError('from_bank_account_id')} validateStatus={getError('from_bank_account_id') ? 'error' : ''}>
                                    <Input
                                        name="from_bank_account_id"
                                        value={formik.values.from_bank_account_id}
                                        onChange={formik.handleChange}
                                        placeholder="UUID"
                                    />
                                </Form.Item>
                            </Col>
                            <Col xs={24} md={12}>
                                <Form.Item label="Currency ID" help={getError('currency_id')} validateStatus={getError('currency_id') ? 'error' : ''}>
                                    <Input
                                        name="currency_id"
                                        value={formik.values.currency_id}
                                        onChange={formik.handleChange}
                                        placeholder="UUID"
                                    />
                                </Form.Item>
                            </Col>
                        </Row>

                        <Form.Item label="Notes">
                            <Input.TextArea
                                name="notes"
                                value={formik.values.notes}
                                onChange={formik.handleChange}
                                rows={3}
                            />
                        </Form.Item>

                        <Divider orientation="left">Transfer Items</Divider>

                        <FieldArray
                            name="items"
                            render={(arrayHelpers) => (
                                <Space direction="vertical" className="w-full" size="middle">
                                    {formik.values.items.map((item, index) => (
                                        <Card
                                            key={index}
                                            size="small"
                                            title={`Item #${index + 1}`}
                                            extra={
                                                formik.values.items.length > 1 ? (
                                                    <Button
                                                        danger
                                                        type="link"
                                                        onClick={() => arrayHelpers.remove(index)}
                                                    >
                                                        Remove
                                                    </Button>
                                                ) : null
                                            }
                                        >
                                            <Row gutter={16}>
                                                <Col xs={24} md={8}>
                                                    <Form.Item label="To Bank Account ID">
                                                        <Input
                                                            value={item.to_bank_account_id}
                                                            onChange={(event) =>
                                                                formik.setFieldValue(
                                                                    `items.${index}.to_bank_account_id`,
                                                                    event.target.value,
                                                                )
                                                            }
                                                            placeholder="UUID"
                                                        />
                                                    </Form.Item>
                                                </Col>
                                                <Col xs={24} md={5}>
                                                    <Form.Item label="Amount">
                                                        <InputNumber
                                                            className="!w-full"
                                                            min={0}
                                                            precision={2}
                                                            value={item.amount}
                                                            onChange={(value) =>
                                                                formik.setFieldValue(
                                                                    `items.${index}.amount`,
                                                                    value ?? 0,
                                                                )
                                                            }
                                                        />
                                                    </Form.Item>
                                                </Col>
                                                <Col xs={24} md={5}>
                                                    <Form.Item label="Exchange Rate">
                                                        <InputNumber
                                                            className="!w-full"
                                                            min={0}
                                                            precision={6}
                                                            value={item.exchange_rate_to_default}
                                                            onChange={(value) =>
                                                                formik.setFieldValue(
                                                                    `items.${index}.exchange_rate_to_default`,
                                                                    value ?? 0,
                                                                )
                                                            }
                                                        />
                                                    </Form.Item>
                                                </Col>
                                                <Col xs={24} md={6}>
                                                    <Form.Item label="Description">
                                                        <Input
                                                            value={item.description}
                                                            onChange={(event) =>
                                                                formik.setFieldValue(
                                                                    `items.${index}.description`,
                                                                    event.target.value,
                                                                )
                                                            }
                                                        />
                                                    </Form.Item>
                                                </Col>
                                            </Row>
                                        </Card>
                                    ))}

                                    <Button
                                        type="dashed"
                                        onClick={() =>
                                            arrayHelpers.push({
                                                to_bank_account_id: '',
                                                amount: 0,
                                                exchange_rate_to_default: 1,
                                                description: '',
                                            })
                                        }
                                    >
                                        Add Item
                                    </Button>
                                </Space>
                            )}
                        />

                        <Divider />

                        <Space>
                            <Button type="primary" htmlType="submit">
                                Save Cash Transfer
                            </Button>
                            <Button htmlType="button" onClick={formik.handleReset}>
                                Reset
                            </Button>
                        </Space>
                    </Form>
                </FormikProvider>
            </Card>
        </AuthenticatedLayout>
    );
}
