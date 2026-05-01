import GuestLayout from '@/Layouts/GuestLayout';
import { Head, Link, router } from '@inertiajs/react';
import { Button, Form, Input } from 'antd';
import { LockOutlined, MailOutlined, UserOutlined } from '@ant-design/icons';
import { Formik } from 'formik';
import * as Yup from 'yup';
import { useState } from 'react';

const RegisterSchema = Yup.object().shape({
    name: Yup.string()
        .min(2, 'Name must be at least 2 characters')
        .max(255, 'Name must not exceed 255 characters')
        .required('Name is required'),
    email: Yup.string()
        .email('Please enter a valid email address')
        .required('Email is required'),
    password: Yup.string()
        .min(8, 'Password must be at least 8 characters')
        .required('Password is required'),
    password_confirmation: Yup.string()
        .oneOf([Yup.ref('password'), null], 'Passwords must match')
        .required('Please confirm your password'),
});

export default function Register() {
    const [processing, setProcessing] = useState(false);
    const [serverErrors, setServerErrors] = useState({});

    const handleSubmit = (values, { setSubmitting, resetForm }) => {
        setProcessing(true);
        setServerErrors({});

        router.post(route('register'), values, {
            onError: (errors) => {
                setServerErrors(errors);
            },
            onFinish: () => {
                setProcessing(false);
                setSubmitting(false);
                resetForm({
                    values: {
                        ...values,
                        password: '',
                        password_confirmation: '',
                    },
                });
            },
        });
    };

    return (
        <GuestLayout>
            <Head title="Register" />

            <Formik
                initialValues={{
                    name: '',
                    email: '',
                    password: '',
                    password_confirmation: '',
                }}
                validationSchema={RegisterSchema}
                onSubmit={handleSubmit}
            >
                {({
                    values,
                    errors,
                    touched,
                    handleChange,
                    handleBlur,
                    handleSubmit,
                }) => (
                    <Form
                        layout="vertical"
                        onFinish={handleSubmit}
                        autoComplete="off"
                    >
                        <Form.Item
                            label="Name"
                            validateStatus={
                                (touched.name && errors.name) ||
                                serverErrors.name
                                    ? 'error'
                                    : ''
                            }
                            help={
                                (touched.name && errors.name) ||
                                serverErrors.name
                            }
                        >
                            <Input
                                id="name"
                                name="name"
                                size="large"
                                prefix={<UserOutlined />}
                                placeholder="Enter your name"
                                value={values.name}
                                onChange={handleChange}
                                onBlur={handleBlur}
                                autoComplete="name"
                                autoFocus
                            />
                        </Form.Item>

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
                                autoComplete="new-password"
                            />
                        </Form.Item>

                        <Form.Item
                            label="Confirm Password"
                            validateStatus={
                                (touched.password_confirmation &&
                                    errors.password_confirmation) ||
                                serverErrors.password_confirmation
                                    ? 'error'
                                    : ''
                            }
                            help={
                                (touched.password_confirmation &&
                                    errors.password_confirmation) ||
                                serverErrors.password_confirmation
                            }
                        >
                            <Input.Password
                                id="password_confirmation"
                                name="password_confirmation"
                                size="large"
                                prefix={<LockOutlined />}
                                placeholder="Confirm your password"
                                value={values.password_confirmation}
                                onChange={handleChange}
                                onBlur={handleBlur}
                                autoComplete="new-password"
                            />
                        </Form.Item>

                        <Form.Item className="mb-0">
                            <div className="flex items-center justify-end">
                                <Link
                                    href={route('login')}
                                    className="rounded-md text-sm text-gray-600 underline hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                                >
                                    Already registered?
                                </Link>

                                <Button
                                    type="primary"
                                    htmlType="submit"
                                    size="large"
                                    loading={processing}
                                    className="ms-4"
                                >
                                    Register
                                </Button>
                            </div>
                        </Form.Item>
                    </Form>
                )}
            </Formik>
        </GuestLayout>
    );
}
