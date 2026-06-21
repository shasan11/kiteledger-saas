// Thin re-export so transaction pages can import from a single namespace.
// The underlying implementation lives in Components/Accounting/BackendSelect.jsx and
// already handles auth headers (Bearer accessToken), search, paging, label hydration,
// allowClear, and full-object storage via the onChange (value, raw) signature.
export { default } from '@/Components/Accounting/BackendSelect.jsx';
export { default as FkSelect } from '@/Components/Accounting/BackendSelect.jsx';
