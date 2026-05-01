import GuestLayout from '@/Layouts/GuestLayout';
import { Head, Link, router } from '@inertiajs/react';
import { Button, Checkbox, Form, Input, Alert } from 'antd';
import { LockOutlined, MailOutlined } from '@ant-design/icons';
import { Formik } from 'formik';
import * as Yup from 'yup';
import { useState } from 'react';

const LoginSchema = Yup.object().shape({
    email: Yup.string()
        .email('Please enter a valid email address')
        .required('Email is required'),
    password: Yup.string()
        .min(6, 'Password must be at least 6 characters')
        .required('Password is required'),
    remember: Yup.boolean(),
});

export default function Login({ status, canResetPassword }) {
    const [processing, setProcessing] = useState(false);
    const [serverErrors, setServerErrors] = useState({});

    const handleSubmit = (values, { setSubmitting, resetForm }) => {
        setProcessing(true);
        setServerErrors({});

        router.post(route('login'), values, {
            onError: (errors) => {
                setServerErrors(errors);
            },
            onFinish: () => {
                setProcessing(false);
                setSubmitting(false);
                resetForm({
                    values: { ...values, password: '' },
                });
            },
        });
    };

    return (
        <GuestLayout>
            <Head title="Log in" />

            {status && (
                <Alert
                    message={status}
                    type="success"
                    showIcon
                    className="mb-4"
                />
            )}

            <Formik
                initialValues={{
                    email: '',
                    password: '',
                    remember: false,
                }}
                validationSchema={LoginSchema}
                onSubmit={handleSubmit}
            >
                {({
                    values,
                    errors,
                    touched,
                    handleChange,
                    handleBlur,
                    handleSubmit,
                    setFieldValue,
                }) => (
                    <Form
                        layout="vertical"
                        onFinish={handleSubmit}
                        autoComplete="off"
                    >
                        <Form.Item
                            label="Email"
                            validateStatus={
                                (touched.email && errors.email) ||
                                serverErrors.email
                                    ? 'error'
                                    : ''
                            }
                            help={
                                (touched.email && errors.email) ||
                                serverErrors.email
                            }
                        >
                            <Input
                                id="email"
                                name="email"
                                type="email"
                                size="large"
                                prefix={<MailOutlined />}
                                placeholder="Enter your email"
                                value={values.email}
                                onChange={handleChange}
                                onBlur={handleBlur}
                                autoComplete="username"
                                autoFocus
                            />
                        </Form.Item>

                        <Form.Item
                            label="Password"
                            validateStatus={
                                (touched.password && errors.password) ||
                                serverErrors.password
                                    ? 'error'
                                    : ''
                            }
                            help={
                                (touched.password && errors.password) ||
                                serverErrors.password
                            }
                        >
                            <Input.Password
                                id="password"
                                name="password"
                                size="large"
                                prefix={<LockOutlined />}
                                placeholder="Enter your password"
                                value={values.password}
                                onChange={handleChange}
                                onBlur={handleBlur}
                                autoComplete="current-password"
                            />
                        </Form.Item>

                        <Form.Item>
                            <Checkbox
                                name="remember"
                                checked={values.remember}
                                onChange={(e) =>
                                    setFieldValue('remember', e.target.checked)
                                }
                            >
                                Remember me
                            </Checkbox>
                        </Form.Item>

                        <Form.Item className="mb-0">
                            <div className="flex items-center justify-end">
                                {canResetPassword && (
                                    <Link
                                        href={route('password.request')}
                                        className="rounded-md text-sm text-gray-600 underline hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                                    >
                                        Forgot your password?
                                    </Link>
                                )}

                                <Button
                                    type="primary"
                                    htmlType="submit"
                                    size="large"
                                    loading={processing}
                                    className="ms-4"
                                >
                                    Log in
                                </Button>
                            </div>
                        </Form.Item>
                    </Form>
                )}
            </Formik>
        </GuestLayout>
    );
}
