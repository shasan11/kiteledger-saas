import React from 'react';
import { Button, Space, Tag, Typography } from 'antd';

const { Text } = Typography;

export default function SuggestedSellingPriceBox({ suggestion, onUse }) {
  if (!suggestion?.suggested_price) return null;

  return (
    <Space size={8} wrap>
      <Text type="secondary">Suggested</Text>
      <Tag color="processing">{Number(suggestion.suggested_price).toLocaleString('en-NP')}</Tag>
      <Button size="small" onClick={() => onUse?.(suggestion.suggested_price)}>
        Use Suggested Price
      </Button>
    </Space>
  );
}
