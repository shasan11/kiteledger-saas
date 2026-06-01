import React from 'react';
import { Drawer } from 'antd';
import BusinessRuleSummary from './BusinessRuleSummary';

export default function BusinessRuleWarningDrawer({ open, onClose, result }) {
  return (
    <Drawer title="Business Rule Validation" open={open} onClose={onClose} width={760}>
      <BusinessRuleSummary result={result} />
    </Drawer>
  );
}
