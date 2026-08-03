import { useState } from 'react';
import { Button, Empty, Space, Tooltip, Typography, theme } from 'antd';
import {
    DownloadOutlined,
    FileTextOutlined,
    RotateRightOutlined,
    ZoomInOutlined,
    ZoomOutOutlined,
} from '@ant-design/icons';

const { Text } = Typography;

const INLINE_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];

/**
 * Source document preview.
 *
 * Always renders through the authorized preview endpoint — never a direct
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
        <Space size={4} style={{ padding: 8, borderBottom: `1px solid ${token.colorBorderSecondary}` }}>
            <Tooltip title="Zoom out">
                <Button
                    size="small"
                    type="text"
                    icon={<ZoomOutOutlined />}
                    disabled={zoom <= 0.5}
                    onClick={() => setZoom((z) => Math.max(0.5, z - 0.25))}
                />
            </Tooltip>
            <Text type="secondary" style={{ fontSize: 12, minWidth: 42, textAlign: 'center' }}>
                {Math.round(zoom * 100)}%
            </Text>
            <Tooltip title="Zoom in">
                <Button
                    size="small"
                    type="text"
                    icon={<ZoomInOutlined />}
                    disabled={zoom >= 3}
                    onClick={() => setZoom((z) => Math.min(3, z + 0.25))}
                />
            </Tooltip>

            {isImage && (
                <Tooltip title="Rotate">
                    <Button
                        size="small"
                        type="text"
                        icon={<RotateRightOutlined />}
                        onClick={() => setRotation((r) => (r + 90) % 360)}
                    />
                </Tooltip>
            )}

            <div style={{ flex: 1 }} />

            <Tooltip title="Download original">
                <Button
                    size="small"
                    type="text"
                    icon={<DownloadOutlined />}
                    onClick={() => onDownload?.(doc)}
                />
            </Tooltip>
        </Space>
    );

    return (
        <div
            style={{
                border: `1px solid ${token.colorBorderSecondary}`,
                borderRadius: token.borderRadiusLG,
                background: token.colorBgContainer,
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                height: '100%',
                minHeight: 420,
            }}
        >
            {canRenderInline && toolbar}

            <div style={{ flex: 1, overflow: 'auto', background: token.colorFillQuaternary }}>
                {!canRenderInline && (
                    <div style={{ padding: 32 }}>
                        <Empty
                            image={<FileTextOutlined style={{ fontSize: 40, color: token.colorTextTertiary }} />}
                            description={
                                <Space direction="vertical" size={4}>
                                    <Text>This file type cannot be shown here</Text>
                                    <Text type="secondary" style={{ fontSize: 12 }}>
                                        {doc.original_file_name}
                                    </Text>
                                </Space>
                            }
                        >
                            <Button icon={<DownloadOutlined />} onClick={() => onDownload?.(doc)}>
                                Download original
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
