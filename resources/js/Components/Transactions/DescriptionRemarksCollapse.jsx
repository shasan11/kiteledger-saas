import { Collapse, Form, Input } from 'antd';

/**
 * Collapsed Description + Remarks fields for transaction add/edit forms.
 * Designed to live inside an existing Ant Design <Form/> — uses Form.Item
 * with name props so values flow through the parent form automatically.
 *
 * Props:
 *   defaultActiveKey: which panel(s) start expanded. Default = none.
 *   descriptionName / remarksName: override field names if the model uses
 *     different keys (e.g. "notes" instead of "remarks").
 *   rows: textarea rows. Default 3.
 *   ghost: pass true for a borderless variant.
 */
export default function DescriptionRemarksCollapse({
    defaultActiveKey,
    descriptionName = 'description',
    remarksName = 'remarks',
    rows = 3,
    ghost = false,
    style,
    className,
}) {
    return (
        <Collapse
            ghost={ghost}
            defaultActiveKey={defaultActiveKey}
            className={className}
            style={style}
            items={[
                {
                    key: 'description',
                    label: 'Description',
                    children: (
                        <Form.Item name={descriptionName} noStyle>
                            <Input.TextArea
                                rows={rows}
                                placeholder="Description (optional)"
                                maxLength={2000}
                                showCount
                            />
                        </Form.Item>
                    ),
                },
                {
                    key: 'remarks',
                    label: 'Remarks',
                    children: (
                        <Form.Item name={remarksName} noStyle>
                            <Input.TextArea
                                rows={rows}
                                placeholder="Internal remarks (optional)"
                                maxLength={2000}
                                showCount
                            />
                        </Form.Item>
                    ),
                },
            ]}
        />
    );
}
