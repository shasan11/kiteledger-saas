import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import TextAlign from '@tiptap/extension-text-align';
import Youtube from '@tiptap/extension-youtube';
import Blockquote from '@tiptap/extension-blockquote';
import { Table, TableRow, TableHeader, TableCell } from '@tiptap/extension-table';
import { Button, Input, Modal, Select, Space, Typography } from 'antd';
import { useEffect, useMemo, useState } from 'react';

const AlignedImage = Image.extend({
    addAttributes() {
        return { ...this.parent?.(), align: { default: 'center', parseHTML: (element) => element.getAttribute('data-align') || 'center', renderHTML: ({ align }) => ({ 'data-align': align, style: `display:block;max-width:100%;height:auto;${align === 'left' ? 'margin:1rem auto 1rem 0' : align === 'right' ? 'margin:1rem 0 1rem auto' : 'margin:1rem auto'}` }) } };
    },
});
const StyledBlockquote = Blockquote.extend({
    addAttributes() { return { variant: { default: 'quote', parseHTML: (element) => element.getAttribute('data-variant') || 'quote', renderHTML: ({ variant }) => ({ 'data-variant': variant, class: variant === 'callout' ? 'editor-callout' : null }) } }; },
});

export default function RichTextEditor({ value = '', onChange, autosaveKey = 'editor', media = [] }) {
    const [fullscreen, setFullscreen] = useState(false);
    const [insert, setInsert] = useState(null);
    const [url, setUrl] = useState('');
    const [alt, setAlt] = useState('');
    const [align, setAlign] = useState('center');
    const editor = useEditor({
        extensions: [StarterKit.configure({ blockquote: false, heading: { levels: [2, 3, 4, 5, 6] } }), StyledBlockquote, Underline, Link.configure({ openOnClick: false, protocols: ['http', 'https', 'mailto'] }), AlignedImage.configure({ allowBase64: false }), Youtube.configure({ nocookie: true, controls: true }), TextAlign.configure({ types: ['heading', 'paragraph'] }), Table.configure({ resizable: true }), TableRow, TableHeader, TableCell],
        content: value || '',
        editorProps: { attributes: { class: 'central-rich-editor__canvas' }, transformPastedHTML: sanitizePastedHtml },
        onUpdate: ({ editor: instance }) => onChange?.(instance.getHTML()),
    });
    useEffect(() => { if (editor && value !== editor.getHTML()) editor.commands.setContent(value || ''); }, [value]);
    useEffect(() => { if (!editor) return; const timer = setInterval(() => localStorage.setItem(`central.autosave.${autosaveKey}`, editor.getHTML()), 5000); return () => clearInterval(timer); }, [editor, autosaveKey]);
    const words = useMemo(() => editor?.getText().trim().split(/\s+/).filter(Boolean).length || 0, [value, editor?.state]);
    if (!editor) return null;
    const openInsert = (type) => { setInsert(type); setUrl(type === 'link' ? (editor.getAttributes('link').href || 'https://') : (type === 'image' ? (media[0]?.url || '') : 'https://www.youtube.com/watch?v=')); setAlt(''); setAlign('center'); };
    const applyInsert = () => { if (insert === 'link') editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run(); if (insert === 'image') editor.chain().focus().setImage({ src: url, alt, align }).run(); if (insert === 'video') editor.commands.setYoutubeVideo({ src: url, width: 720, height: 405 }); setInsert(null); };
    const quote = (variant) => editor.chain().focus().toggleBlockquote().updateAttributes('blockquote', { variant }).run();
    const controls = [
        ['Undo', () => editor.chain().focus().undo().run()], ['Redo', () => editor.chain().focus().redo().run()], ...[2, 3, 4, 5, 6].map((level) => [`H${level}`, () => editor.chain().focus().toggleHeading({ level }).run()]),
        ['Bold', () => editor.chain().focus().toggleBold().run()], ['Italic', () => editor.chain().focus().toggleItalic().run()], ['Underline', () => editor.chain().focus().toggleUnderline().run()], ['Strike', () => editor.chain().focus().toggleStrike().run()],
        ['Bullets', () => editor.chain().focus().toggleBulletList().run()], ['Numbers', () => editor.chain().focus().toggleOrderedList().run()], ['Quote', () => quote('quote')], ['Callout', () => quote('callout')], ['Inline code', () => editor.chain().focus().toggleCode().run()], ['Code block', () => editor.chain().focus().toggleCodeBlock().run()], ['Rule', () => editor.chain().focus().setHorizontalRule().run()],
        ['Link', () => openInsert('link')], ['Image', () => openInsert('image')], ['Video', () => openInsert('video')], ['Table', () => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()], ['Left', () => editor.chain().focus().setTextAlign('left').run()], ['Center', () => editor.chain().focus().setTextAlign('center').run()], ['Right', () => editor.chain().focus().setTextAlign('right').run()], ['Clear', () => editor.chain().focus().clearNodes().unsetAllMarks().run()],
    ];
    return <div className={`central-rich-editor${fullscreen ? ' central-rich-editor--fullscreen' : ''}`}><div className="central-rich-editor__toolbar"><Space wrap>{controls.map(([label, action]) => <Button key={label} size="small" onClick={action}>{label}</Button>)}<Button size="small" onClick={() => setFullscreen(!fullscreen)}>{fullscreen ? 'Exit focus' : 'Focus mode'}</Button></Space></div><EditorContent editor={editor}/><div className="central-rich-editor__status"><Typography.Text type="secondary">{words} words · {Math.max(1, Math.ceil(words / 220))} min read · autosaved locally</Typography.Text></div><Modal open={Boolean(insert)} title={insert === 'link' ? 'Insert link' : insert === 'image' ? 'Insert media image' : 'Embed YouTube video'} onCancel={() => setInsert(null)} onOk={applyInsert} okButtonProps={{ disabled: !url }}><Space direction="vertical" style={{ width: '100%' }}><Input autoFocus value={url} onChange={(event) => setUrl(event.target.value)} placeholder="https://…"/>{insert === 'image' && <><Input value={alt} onChange={(event) => setAlt(event.target.value)} placeholder="Alternative text"/><Select value={align} onChange={setAlign} style={{ width: '100%' }} options={['left', 'center', 'right'].map((item) => ({ value: item, label: `${item[0].toUpperCase()}${item.slice(1)}` }))}/>{media.length > 0 && <Select showSearch optionFilterProp="label" value={url || undefined} onChange={setUrl} style={{ width: '100%' }} placeholder="Choose from media library" options={media.map((item) => ({ value: item.url, label: item.title || item.original_filename }))}/>}</>}</Space></Modal></div>;
}

function sanitizePastedHtml(html) {
    const document = new DOMParser().parseFromString(html, 'text/html');
    document.querySelectorAll('script,style,iframe,object,embed,form,input,button').forEach((node) => node.remove());
    document.querySelectorAll('*').forEach((node) => [...node.attributes].forEach((attribute) => { if (attribute.name.startsWith('on') || ['style', 'srcdoc'].includes(attribute.name)) node.removeAttribute(attribute.name); }));
    return document.body.innerHTML;
}
