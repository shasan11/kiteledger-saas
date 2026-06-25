import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Modal, Skeleton, notification } from 'antd';
import BusinessRuleSummary from './BusinessRuleSummary';
import { stripUuids } from '../Transactions/entityDisplay';

const BACKEND = import.meta.env.VITE_APP_BACKEND_URL || '';
const api = (path) => `${BACKEND}${path}`;

const GENERIC_ERROR = 'Unable to preview business rules.';

// Backend messages can embed raw ids; never surface those to the user.
const safeError = (message) => {
  const cleaned = stripUuids(message);
  return cleaned && cleaned.length > 2 ? cleaned : GENERIC_ERROR;
};

export default function BusinessRuleApprovalModal({
  open,
  module,
  transactionId,
  onCancel,
  onApprove,
  confirmLoading = false,
}) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    if (!open || !module || !transactionId) return;

    let active = true;
    setLoading(true);

    axios
      .post(api('/api/business-rules/validate'), {
        module,
        action: 'approval',
        transaction_id: transactionId,
      })
      .then(({ data }) => {
        if (!active) return;
        setResult(data);
        if (data?.has_warnings) {
          notification.warning({
            message: 'Transaction has warnings but can be approved.',
          });
        }
      })
      .catch((error) => {
        if (!active) return;
        notification.error({
          message: safeError(error?.response?.data?.message),
        });
        setResult({ can_proceed: false, has_errors: true, checks: [] });
      })
      .finally(() => active && setLoading(false));

    return () => {
      active = false;
    };
  }, [open, module, transactionId]);

  const blocked = loading || !result || result?.has_errors || result?.can_proceed === false;

  return (
    <Modal
      title="Approve Transaction"
      open={open}
      onCancel={onCancel}
      onOk={() => onApprove?.(result)}
      okText={result?.has_warnings ? 'Approve Anyway' : 'Approve'}
      okButtonProps={{ disabled: blocked, type: 'primary' }}
      confirmLoading={confirmLoading}
      width={920}
      destroyOnClose
    >
      {loading ? <Skeleton active paragraph={{ rows: 8 }} /> : <BusinessRuleSummary result={result} />}
    </Modal>
  );
}
