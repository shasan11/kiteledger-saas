import { Collapse, Form, Input } from 'antd';

export default function DescriptionRemarksCollapse({
  descriptionName = 'description',
  remarksName = 'remarks',
}) {
  return (
    <Collapse
      bordered={false}
      defaultActiveKey={['description']}
      items={[
        {
          key: 'description',
          label: 'Description',
          children: (
            <Form.Item name={descriptionName} noStyle>
              <Input.TextArea rows={3} placeholder="Description" />
            </Form.Item>
          ),
        },
        {
          key: 'remarks',
          label: 'Remarks',
          children: (
            <Form.Item name={remarksName} noStyle>
              <Input.TextArea rows={3} placeholder="Remarks" />
            </Form.Item>
          ),
        },
      ]}
    />
  );
}
