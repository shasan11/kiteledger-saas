# Package Cleanup

This cleanup removes frontend dependencies that were present in `package.json` but not referenced in the application source.

## Removed from `package.json`

- `@lexical/code`
- `@lexical/html`
- `@lexical/link`
- `@lexical/list`
- `@lexical/react`
- `@lexical/rich-text`
- `@lexical/selection`
- `@lexical/table`
- `@lexical/utils`
- `lexical`
- `@tinymce/tinymce-react`
- `tinymce`
- `@tiptap/core`
- `@tiptap/extension-color`
- `@tiptap/extension-highlight`
- `@tiptap/extension-link`
- `@tiptap/extension-placeholder`
- `@tiptap/extension-table`
- `@tiptap/extension-table-cell`
- `@tiptap/extension-table-header`
- `@tiptap/extension-table-row`
- `@tiptap/extension-task-item`
- `@tiptap/extension-task-list`
- `@tiptap/extension-text-align`
- `@tiptap/extension-text-style`
- `@tiptap/extension-underline`
- `@tiptap/react`
- `@tiptap/starter-kit`
- `react-qr-code`

## Kept intentionally

These packages look removable at first glance, but they are referenced in source files and should not be removed without replacing the related feature:

- `jodit` and `jodit-react` are used by rich text editor components.
- `@dnd-kit/*` is used in the HRM project/task interface.
- `file-saver` and `xlsx` are used for export flows.
- `react-to-pdf` and `react-to-print` are used by printable/PDF components.
- `recharts` is used by dashboard/reporting/CRM pages.
- `jsbarcode` is used by barcode label components.
- `qrcode.react` is used by label/payment display components.
- `moment` and `dayjs` are both currently referenced; they can be consolidated later, but not removed blindly.

## Required after this change

Run the following locally before merging:

```bash
npm install
npm run build
```

`npm install` is needed to regenerate `package-lock.json` after removing dependencies.

Then commit the regenerated lockfile:

```bash
git add package-lock.json
git commit -m "Regenerate package lock after dependency cleanup"
```

Do not merge this cleanup until the build passes.
