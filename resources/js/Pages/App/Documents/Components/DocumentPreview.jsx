import { useState } from 'react';
import { Button, Empty, Space, Tooltip, Typography, theme } from 'antd';
import {
    ExportOutlined,
    FileTextOutlined,
    RotateRightOutlined,
    ZoomInOutlined,
    ZoomOutOutlined,
} from '@ant-design/icons';
import { getDocumentStatusIconColor } from './DocumentStatusTag';

const { Text } = Typography;

const INLINE_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];

/**
 * Source document preview.
 *
 * Always renders through the authorized preview endpoint - never a direct
 * storage path, so tenant and branch checks still apply to every byte served.
 * DOCX has no safe in-browser renderer here, so it offers a download instead of
 * an iframe that would either fail or trigger a download anyway.
 */
export default function DocumentPreview({ document: doc, onDownload }) {
    const { token } = theme.useToken();
    const [zoom, setZoom] = useState(1);
    const [rotation, setRotation] = useState(0);

    if (!doc) return null;

    const previewUrl = `/api/document-uploads/${doc.public_id}/preview`;
    const mime = doc.mime_type || '';
    const canRenderInline = INLINE_TYPES.includes(mime);
    const isImage = mime.startsWith('image/');

    const toolbar = (
        <div className="document-preview__toolbar" style={{ width: '100%', padding: 6, borderBottom: `1px solid ${token.colorBorderSecondary}` }}>
            <Space size={7} className="document-preview__identity">
                <span className="document-preview__identity-icon"><FileTextOutlined /></span>
                <Text strong className="document-preview__identity-label">Original document</Text>
            </Space>

            <div style={{ flex: 1 }} />

            {isImage && (
                <Space size={2}>
                    <Tooltip title="Zoom out">
                        <Button
                            size="small"
                            type="text"
                            icon={<ZoomOutOutlined />}
                            aria-label="Zoom out"
                            disabled={zoom <= 0.5}
                            onClick={() => setZoom((z) => Math.max(0.5, z - 0.25))}
                        />
                    </Tooltip>
                    <Button
                        size="small"
                        type="text"
                        className="document-preview__zoom-value"
                        onClick={() => setZoom(1)}
                        title="Reset zoom"
                    >
                        {Math.round(zoom * 100)}%
                    </Button>
                    <Tooltip title="Zoom in">
                        <Button
                            size="small"
                            type="text"
                            icon={<ZoomInOutlined />}
                            aria-label="Zoom in"
                            disabled={zoom >= 3}
                            onClick={() => setZoom((z) => Math.min(3, z + 0.25))}
                        />
                    </Tooltip>
                    <Tooltip title="Rotate clockwise">
                        <Button
                            size="small"
                            type="text"
                            icon={<RotateRightOutlined />}
                            aria-label="Rotate clockwise"
                            onClick={() => setRotation((r) => (r + 90) % 360)}
                        />
                    </Tooltip>
                </Space>
            )}

            <Tooltip title="Open original in a new tab">
                <Button
                    size="small"
                    type="text"
                    icon={<ExportOutlined />}
                    aria-label="Open original in a new tab"
                    onClick={() => onDownload?.(doc)}
                />
            </Tooltip>
        </div>
    );

    return (
        <div
            className="document-preview"
            style={{
                border: `1px solid ${token.colorBorderSecondary}`,
                borderRadius: 0,
                background: token.colorBgContainer,
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                height: '100%',
                minHeight: 420,
            }}
        >
            {toolbar}

            <div className="document-preview__canvas" style={{ flex: 1, overflow: 'auto', background: token.colorFillQuaternary }}>
                {!canRenderInline && (
                    <div style={{ padding: 32 }}>
                        <Empty
                            image={<FileTextOutlined style={{ fontSize: 40, color: getDocumentStatusIconColor(doc.status, token) }} />}
                            description={<Text>This file type cannot be shown here</Text>}
                        >
                            <Button icon={<ExportOutlined />} onClick={() => onDownload?.(doc)}>
                                Open original
                            </Button>
                        </Empty>
                    </div>
                )}

                {canRenderInline && isImage && (
                    <div style={{ padding: 16, textAlign: 'center' }}>
                        <img
                            src={previewUrl}
                            alt={doc.label || 'Document preview'}
                            style={{
                                maxWidth: '100%',
                                transform: `scale(${zoom}) rotate(${rotation}deg)`,
                                transformOrigin: 'top center',
                                transition: 'transform 0.2s',
                            }}
                        />
                    </div>
                )}

                {canRenderInline && !isImage && (
                    <iframe
                        src={previewUrl}
                        title={doc.label || 'Document preview'}
                        style={{ width: '100%', height: '100%', minHeight: 480, border: 'none' }}
                    />
                )}
            </div>
        </div>
    );
}
