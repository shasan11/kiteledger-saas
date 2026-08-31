import { router } from "@inertiajs/react";
import { Alert, Modal, Typography, message } from "antd";

export default function DeleteCustomerModal({ open, onClose, tenant }) {
    const submit = () => {
        if (!tenant) {
            return;
        }

        router.delete(route("central.tenants.destroy", tenant.id), {
            preserveScroll: true,
            onSuccess: () => {
                message.success("Tenant deleted.");
                onClose();
            },
            onError: (errors) => {
                message.error(
                    Object.values(errors)[0] || "Could not delete the tenant.",
                );
            },
        });
    };

    return (
        <Modal
            open={open}
            title="Delete tenant now?"
            okText="Delete tenant"
            okButtonProps={{ danger: true }}
            onCancel={onClose}
            onOk={submit}
            destroyOnHidden
        >
            <Alert
                type="error"
                showIcon
                message="This action takes effect immediately."
                description="The tenant will lose access now. Application-owned database resources and tenant files will be removed. This cannot be undone."
                style={{ marginBottom: 16 }}
            />
            {tenant && (
                <Typography.Paragraph>
                    Delete <strong>{tenant.company_name}</strong>?
                </Typography.Paragraph>
            )}
        </Modal>
    );
}
