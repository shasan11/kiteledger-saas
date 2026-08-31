import { DeleteOutlined, PictureOutlined, UploadOutlined } from "@ant-design/icons";
import axios from "axios";
import { Button, Empty, Image, Input, Modal, Progress, Space, Spin, Typography, Upload, message } from "antd";
import { useEffect, useState } from "react";

export default function MediaPicker({ value, media, alt = "", onChange, onAltChange, error, purpose = "website_screenshot", showAlt = true }) {
    const [open, setOpen] = useState(false);
    const [items, setItems] = useState([]);
    const [query, setQuery] = useState("");
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(0);
    const selected = items.find((item) => item.id === value) || (media?.id === value ? media : null);

    const load = async (search = query) => {
        setLoading(true);
        try {
            const { data } = await axios.get(route("central.media.index"), {
                params: { search, type: "image" },
                headers: { Accept: "application/json" },
            });
            setItems(data.data || []);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (open) load();
    }, [open]);

    const upload = async ({ file }) => {
        const body = new FormData();
        body.append("file", file);
        body.append("purpose", purpose);
        body.append("alt_text", alt || "");
        try {
            const { data } = await axios.post(route("central.media.store"), body, {
                headers: { Accept: "application/json", "Content-Type": "multipart/form-data" },
                onUploadProgress: (event) => setUploading(Math.round((event.loaded * 100) / (event.total || event.loaded))),
            });
            setItems((current) => [data.media, ...current]);
            onChange?.(data.media.id, data.media);
            setOpen(false);
            message.success("Image uploaded");
        } catch (exception) {
            message.error(exception.response?.data?.message || "Upload failed");
        } finally {
            setUploading(0);
        }
    };

    return <div>
        {selected ? <Space align="start">
            <Image width={148} height={92} style={{ objectFit: "cover", borderRadius: 8 }} src={selected.url} alt={alt || selected.alt_text || ""} />
            <Space direction="vertical" size={4}>
                <Typography.Text strong>{selected.original_filename || selected.title}</Typography.Text>
                <Typography.Text type="secondary">{selected.width && selected.height ? `${selected.width} × ${selected.height}` : "Image"}</Typography.Text>
                <Space>
                    <Button icon={<PictureOutlined />} onClick={() => setOpen(true)}>Change</Button>
                    <Button danger icon={<DeleteOutlined />} onClick={() => onChange?.(null, null)}>Clear</Button>
                </Space>
            </Space>
        </Space> : <Button icon={<PictureOutlined />} onClick={() => setOpen(true)}>Choose image</Button>}
        {showAlt && <Input
            value={alt}
            onChange={(event) => onAltChange?.(event.target.value)}
            placeholder="Describe this image for screen readers"
            style={{ marginTop: 10 }}
            status={error ? "error" : undefined}
        />}
        {error && <Typography.Text type="danger">{error}</Typography.Text>}
        <Modal open={open} onCancel={() => setOpen(false)} footer={null} title="Media library" width={820}>
            <Space.Compact style={{ width: "100%", marginBottom: 16 }}>
                <Input.Search value={query} onChange={(event) => setQuery(event.target.value)} onSearch={load} placeholder="Search images" />
                <Upload accept=".jpg,.jpeg,.png,.webp,.svg" showUploadList={false} customRequest={upload}>
                    <Button icon={<UploadOutlined />}>Upload</Button>
                </Upload>
            </Space.Compact>
            {uploading > 0 && <Progress percent={uploading} />}
            <Spin spinning={loading}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(150px,1fr))", gap: 12, minHeight: 180 }}>
                    {items.map((item) => <button
                        type="button"
                        key={item.id}
                        onClick={() => {
                            onChange?.(item.id, item);
                            setOpen(false);
                        }}
                        style={{ border: value === item.id ? "2px solid #1677ff" : "1px solid #ddd", borderRadius: 10, padding: 8, background: "white", cursor: "pointer", textAlign: "left" }}
                    >
                        <img src={item.url} alt={item.alt_text || ""} style={{ width: "100%", height: 92, objectFit: "cover", borderRadius: 6 }} />
                        <Typography.Text ellipsis style={{ display: "block" }}>{item.original_filename}</Typography.Text>
                    </button>)}
                    {!loading && !items.length && <Empty description="No images found" />}
                </div>
            </Spin>
        </Modal>
    </div>;
}
