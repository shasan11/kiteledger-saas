import { useMemo } from 'react';
import JoditEditor from 'jodit-react';
import 'jodit/es2021/jodit.min.css';

export default function RichTextEditor({ value = '', onChange, placeholder = 'Write here...' }) {
  const config = useMemo(() => ({
    readonly: false,
    height: 180,
    minHeight: 140,
    toolbarAdaptive: false,
    toolbarSticky: false,
    askBeforePasteHTML: false,
    askBeforePasteFromWord: false,
    buttons: [
      'bold',
      'italic',
      'underline',
      'ul',
      'ol',
      'link',
      'table',
      'hr',
      'eraser',
    ],
    placeholder,
  }), [placeholder]);

  return (
    <div className="kite-rich-text-editor">
      <JoditEditor
        value={value || ''}
        config={config}
        onBlur={(nextValue) => onChange?.(nextValue || '')}
      />
    </div>
  );
}
