import { Col, Form, Row, Switch, Tooltip } from 'antd';

export const PERMISSION_LABELS = {
    can_access_tenant: 'Can access company',
    can_manage_users: 'Manage users',
    can_manage_billing: 'Manage billing',
    can_manage_plan: 'Change plan',
    can_view_invoices: 'View invoices',
    can_make_payments: 'Make payments',
    can_manage_company: 'Manage company',
    can_manage_integrations: 'Manage integrations',
};

export const PERMISSION_HINTS = {
    can_manage_billing: 'View subscription, invoices, payment history and billing details.',
    can_manage_plan: 'Upgrade, downgrade, schedule, cancel or resume the subscription.',
    can_make_payments: 'Pay invoices and start allowed payment operations.',
};

/**
 * Permission grid used everywhere a membership is created or edited, so an
 * administrator never has to hand-edit raw JSON.
 */
export default function PermissionSwitches({ keys = Object.keys(PERMISSION_LABELS), namePrefix = ['permissions'], disabled = false }) {
    return (
        <Row gutter={[12, 0]}>
            {keys.map((key) => (
                <Col xs={24} sm={12} key={key}>
                    <Form.Item name={[...namePrefix, key]} valuePropName="checked" label={
                        PERMISSION_HINTS[key]
                            ? <Tooltip title={PERMISSION_HINTS[key]}>{PERMISSION_LABELS[key] || key}</Tooltip>
                            : (PERMISSION_LABELS[key] || key)
                    } layout="horizontal" colon={false} style={{ marginBottom: 8 }}>
                        <Switch size="small" disabled={disabled} />
                    </Form.Item>
                </Col>
            ))}
        </Row>
    );
}
