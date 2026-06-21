import { useMemo } from 'react';
import JoditEditor from 'jodit-react';

export default function RichHtmlEditor({ value, onChange, height = 420, placeholder = 'Write content...' }) {
  const config = useMemo(() => ({
    readonly: false,
    height,
    placeholder,
    toolbarAdaptive: false,
    toolbarSticky: false,
    buttons: [
      'undo', 'redo', '|',
      'bold', 'italic', 'underline', '|',
      'fontsize', 'paragraph', '|',
      'ul', 'ol', '|',
      'align', 'link', 'table', 'image', '|',
      'hr', 'eraser', 'source',
    ],
    askBeforePasteHTML: false,
    askBeforePasteFromWord: false,
    defaultActionOnPaste: 'insert_clear_html',
  }), [height, placeholder]);

  return (
    <JoditEditor
      value={value || ''}
      config={config}
      onBlur={(newContent) => onChange?.(newContent)}
      onChange={() => {}}
    />
  );
}
