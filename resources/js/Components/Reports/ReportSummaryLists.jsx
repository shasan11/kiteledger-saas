import { List, Typography } from 'antd';

const { Text } = Typography;

export default function ReportSummaryLists({ title, items = [] }) {
  if (!items.length) return null;

  return (
    <div>
      <Text strong style={{ display: 'block', marginBottom: 8 }}>
        {title}
      </Text>
      <List
        size="small"
        dataSource={items}
        renderItem={(item) => (
          <List.Item style={{ paddingLeft: 0, paddingRight: 0 }}>
            <Text>{item}</Text>
          </List.Item>
        )}
      />
    </div>
  );
}
