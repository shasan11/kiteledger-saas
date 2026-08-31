import CentralLayout from "@/Layouts/CentralLayout";
import PageHeader from "@/Components/Central/PageHeader";
import RichTextEditor from "@/Components/Central/RichTextEditor";
import SectionCard from "@/Components/Central/SectionCard";
import MediaPicker from "@/Components/Central/MediaPicker";
import {
    AppstoreOutlined,
    ArrowDownOutlined,
    ArrowUpOutlined,
    CheckCircleFilled,
    CodeOutlined,
    CopyOutlined,
    DeleteOutlined,
    EditOutlined,
    EyeInvisibleOutlined,
    EyeOutlined,
    FileTextOutlined,
    LinkOutlined,
    PictureOutlined,
    PlusOutlined,
    SettingOutlined,
} from "@ant-design/icons";
import { router } from "@inertiajs/react";
import {
    Alert,
    Button,
    Col,
    Drawer,
    Empty,
    Form,
    Input,
    InputNumber,
    Modal,
    Row,
    Select,
    Space,
    Switch,
    Tabs,
    Tag,
    Tooltip,
    Typography,
} from "antd";
import { useMemo, useState } from "react";

const SECTION_TYPES = [
    { value: "hero", label: "Hero banner", description: "A bold opening message with actions and a product image.", tone: "blue" },
    { value: "logos", label: "Logo showcase", description: "A row of customer, partner, or integration logos.", tone: "purple" },
    { value: "features", label: "Feature cards", description: "Highlight benefits or capabilities in a card grid.", tone: "cyan" },
    { value: "content", label: "Text and image", description: "A flexible content block with supporting media.", tone: "geekblue" },
    { value: "product", label: "Product spotlight", description: "Explain a product area with benefits and a screenshot.", tone: "green" },
    { value: "statistics", label: "Key statistics", description: "Show important numbers, outcomes, or milestones.", tone: "gold" },
    { value: "steps", label: "Step-by-step", description: "Explain a process in a clear sequence.", tone: "lime" },
    { value: "solutions", label: "Solutions", description: "Present solutions for teams, industries, or use cases.", tone: "magenta" },
    { value: "integrations", label: "Integrations", description: "Show connected tools and integration benefits.", tone: "volcano" },
    { value: "security", label: "Security highlight", description: "Communicate trust, privacy, and security controls.", tone: "red" },
    { value: "pricing", label: "Pricing plans", description: "Display the active plans configured in billing.", tone: "green" },
    { value: "testimonials", label: "Testimonials", description: "Build trust with customer quotes and attribution.", tone: "purple" },
    { value: "faq", label: "Frequently asked questions", description: "Answer common questions in an expandable list.", tone: "orange" },
    { value: "cta", label: "Call to action", description: "End a page with one focused next step.", tone: "blue" },
    { value: "newsletter", label: "Newsletter signup", description: "Invite visitors to subscribe for updates.", tone: "cyan" },
    { value: "footer", label: "Footer content", description: "Add supporting content near the bottom of a page.", tone: "default" },
];

const ITEM_COPY = {
    faq: { singular: "question", title: "Question", content: "Answer", add: "Add question" },
    statistics: { singular: "statistic", title: "Value", content: "Label", add: "Add statistic" },
    testimonials: { singular: "testimonial", title: "Person or company", content: "Customer quote", add: "Add testimonial" },
    logos: { singular: "logo", title: "Brand name", content: "Supporting note", add: "Add logo" },
    steps: { singular: "step", title: "Step title", content: "Step description", add: "Add step" },
    integrations: { singular: "integration", title: "Integration name", content: "Description", add: "Add integration" },
    solutions: { singular: "solution", title: "Solution name", content: "Description", add: "Add solution" },
};

const LAYOUT_OPTIONS = {
    hero: [
        { value: "split", label: "Text left, image right" },
        { value: "reverse", label: "Image left, text right" },
        { value: "centered", label: "Centered" },
    ],
    features: [
        { value: "grid", label: "Card grid" },
        { value: "list", label: "Simple list" },
        { value: "image", label: "Image with cards" },
    ],
    solutions: [
        { value: "grid", label: "Card grid" },
        { value: "list", label: "Simple list" },
        { value: "image", label: "Image with cards" },
    ],
    integrations: [
        { value: "grid", label: "Card grid" },
        { value: "list", label: "Simple list" },
        { value: "image", label: "Image with cards" },
    ],
};

const BACKGROUND_MODES = [
    { value: "theme", label: "Theme style" },
    { value: "color", label: "Solid color" },
    { value: "gradient", label: "Gradient" },
    { value: "image", label: "Picture" },
];

const BACKGROUND_PRESETS = [
    { value: "surface", label: "Default surface" },
    { value: "subtle", label: "Soft contrast" },
    { value: "dark", label: "Dark emphasis" },
];

const GRADIENT_DIRECTIONS = [
    { value: "135deg", label: "Soft diagonal" },
    { value: "90deg", label: "Left to right" },
    { value: "180deg", label: "Top to bottom" },
    { value: "45deg", label: "Rising diagonal" },
];

const typeMeta = (value) => SECTION_TYPES.find((item) => item.value === value) || {
    value,
    label: humanize(value || "section"),
    description: "A reusable website content section.",
    tone: "default",
};

const humanize = (value = "") => value
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

const plainText = (value = "") => String(value).replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
const cleanItems = (items = []) => items.map(({ media, ...item }) => item);
const hexColorRule = { pattern: /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/, message: "Use a hex color, for example #f8fafc." };

const backgroundPreviewStyle = (fields = {}) => {
    if (fields.background_type === "color" && fields.background_color) return { background: fields.background_color };
    if (fields.background_type === "gradient") {
        return { background: `linear-gradient(${fields.gradient_direction || "135deg"}, ${fields.gradient_from || "#f8fafc"}, ${fields.gradient_to || "#ecfeff"})` };
    }
    if (fields.background_type === "image" && fields.background_image_url) {
        const overlay = Number(fields.background_overlay ?? 42) / 100;
        return {
            backgroundImage: `linear-gradient(rgba(15, 23, 42, ${overlay}), rgba(15, 23, 42, ${overlay})), url("${String(fields.background_image_url).replace(/"/g, "%22")}")`,
            backgroundSize: fields.background_size || "cover",
            backgroundPosition: "center",
        };
    }
    return undefined;
};

export default function Sections({ pages = [], selectedPage, sections = [] }) {
    const [record, setRecord] = useState(null);
    const [open, setOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [selectedMedia, setSelectedMedia] = useState(null);
    const [selectedBackgroundMedia, setSelectedBackgroundMedia] = useState(null);
    const [form] = Form.useForm();

    const sectionType = Form.useWatch("section_type", form) || "content";
    const title = Form.useWatch("title", form);
    const eyebrow = Form.useWatch("eyebrow", form);
    const subtitle = Form.useWatch("subtitle", form);
    const buttonText = Form.useWatch("button_text", form);
    const secondaryButtonText = Form.useWatch("secondary_button_text", form);
    const imageAlt = Form.useWatch("image_alt", form);
    const mediaId = Form.useWatch("media_id", form);
    const backgroundFields = Form.useWatch("settings_fields", form) || {};
    const isActive = Form.useWatch("is_active", form);
    const currentType = typeMeta(sectionType);
    const itemCopy = ITEM_COPY[sectionType] || {
        singular: "item",
        title: "Title",
        content: "Description",
        add: "Add item",
    };

    const selectedPageRecord = useMemo(
        () => pages.find((page) => page.id === selectedPage),
        [pages, selectedPage],
    );
    const activeCount = sections.filter((section) => section.is_active).length;

    const uniqueKey = (candidate) => {
        const base = String(candidate || "section")
            .toLowerCase()
            .trim()
            .replace(/[^a-z0-9_-]+/g, "-")
            .replace(/^-+|-+$/g, "") || "section";
        const used = new Set(sections.filter((item) => item.id !== record?.id).map((item) => item.section_key));
        if (!used.has(base)) return base;
        let suffix = 2;
        while (used.has(`${base}-${suffix}`)) suffix += 1;
        return `${base}-${suffix}`;
    };

    const openEditor = (section = null, duplicate = false) => {
        const source = section || null;
        const editing = source && !duplicate ? source : null;
        const settings = source?.settings || {};
        const legacyItems = cleanItems(source?.items || []);
        setRecord(editing);
        setSelectedMedia(source?.media || null);
        setSelectedBackgroundMedia(settings.background_media_id && settings.background_image_url ? {
            id: settings.background_media_id,
            url: settings.background_image_url,
            original_filename: settings.background_image_name || "Background image",
        } : null);
        form.resetFields();
        form.setFieldsValue(source ? {
            ...source,
            section_key: duplicate ? uniqueKey(`${source.section_key}-copy`) : source.section_key,
            title: duplicate && source.title ? `${source.title} copy` : source.title,
            sort_order: duplicate ? sections.length : source.sort_order,
            item_fields: (source.items || []).map((item, index) => ({ ...item, _legacy_index: index })),
            items_json: JSON.stringify(legacyItems, null, 2),
            settings_fields: {
                layout: settings.layout,
                image_position: settings.image_position,
                caption: settings.caption,
                background_type: settings.background_type || (settings.background_image_url ? "image" : settings.background_color ? "color" : settings.gradient_from || settings.gradient_to ? "gradient" : "theme"),
                background_color: settings.background_color,
                gradient_from: settings.gradient_from,
                gradient_to: settings.gradient_to,
                gradient_direction: settings.gradient_direction,
                background_image_url: settings.background_image_url,
                background_media_id: settings.background_media_id,
                background_image_name: settings.background_image_name,
                background_overlay: settings.background_overlay,
                background_size: settings.background_size,
                background_text: settings.background_text,
            },
            settings_json: JSON.stringify(settings, null, 2),
        } : {
            page_id: selectedPage,
            section_key: uniqueKey("content"),
            section_type: "content",
            alignment: "left",
            background_style: "surface",
            is_active: true,
            sort_order: sections.length,
            items_json: "[]",
            item_fields: [],
            settings_fields: {
                background_type: "theme",
                gradient_direction: "135deg",
                gradient_from: "#f8fafc",
                gradient_to: "#ecfeff",
                background_overlay: 42,
                background_size: "cover",
                background_text: "default",
            },
            settings_json: "{}",
        });
        setOpen(true);
    };

    const closeEditor = () => {
        setOpen(false);
        setRecord(null);
        setSelectedMedia(null);
        setSelectedBackgroundMedia(null);
    };

    const changeType = (value) => {
        form.setFieldValue("section_type", value);
        if (!record) form.setFieldValue("section_key", uniqueKey(value));
        const availableLayouts = LAYOUT_OPTIONS[value] || [];
        const currentLayout = form.getFieldValue(["settings_fields", "layout"]);
        if (currentLayout && !availableLayouts.some((option) => option.value === currentLayout)) {
            form.setFieldValue(["settings_fields", "layout"], undefined);
        }
    };

    const save = (values) => {
        let legacyItems;
        let settings;
        let invalid = false;
        try {
            legacyItems = JSON.parse(values.items_json || "[]");
            if (!Array.isArray(legacyItems)) throw new Error();
        } catch {
            invalid = true;
            form.setFields([{ name: "items_json", errors: ["Item data must be a valid JSON array."] }]);
        }
        try {
            settings = JSON.parse(values.settings_json || "{}");
            if (!settings || Array.isArray(settings) || typeof settings !== "object") throw new Error();
        } catch {
            invalid = true;
            form.setFields([{ name: "settings_json", errors: ["Settings must be a valid JSON object."] }]);
        }
        if (invalid) return;

        const items = (values.item_fields || []).map((item) => {
            const source = Number.isInteger(item._legacy_index) ? legacyItems[item._legacy_index] || {} : {};
            const legacy = { ...source };
            delete legacy.media;
            const { _legacy_index, media, ...editable } = item;
            return { ...legacy, ...editable };
        });
        Object.entries(values.settings_fields || {}).forEach(([key, value]) => {
            if (value === undefined || value === null || value === "") delete settings[key];
            else settings[key] = value;
        });
        const backgroundType = settings.background_type || "theme";
        if (backgroundType === "theme") {
            ["background_color", "gradient_from", "gradient_to", "gradient_direction", "background_image_url", "background_media_id", "background_image_name", "background_overlay", "background_size", "background_text"].forEach((key) => delete settings[key]);
        }
        if (backgroundType === "color") {
            ["gradient_from", "gradient_to", "gradient_direction", "background_image_url", "background_media_id", "background_image_name", "background_overlay", "background_size"].forEach((key) => delete settings[key]);
        }
        if (backgroundType === "gradient") {
            ["background_color", "background_image_url", "background_media_id", "background_image_name", "background_overlay", "background_size"].forEach((key) => delete settings[key]);
        }
        if (backgroundType === "image") {
            ["background_color", "gradient_from", "gradient_to", "gradient_direction"].forEach((key) => delete settings[key]);
        }

        const payload = { ...values, items, settings };
        delete payload.items_json;
        delete payload.item_fields;
        delete payload.settings_json;
        delete payload.settings_fields;

        setSaving(true);
        const options = {
            preserveScroll: true,
            onSuccess: closeEditor,
            onFinish: () => setSaving(false),
        };
        record
            ? router.put(route("central.website-sections.update", record.id), payload, options)
            : router.post(route("central.website-sections.store"), payload, options);
    };

    const move = (index, direction) => {
        const ids = sections.map((section) => section.id);
        const target = index + direction;
        if (target < 0 || target >= ids.length) return;
        [ids[index], ids[target]] = [ids[target], ids[index]];
        router.put(
            route("central.website-sections.reorder"),
            { page_id: selectedPage, ids },
            { preserveScroll: true },
        );
    };

    const removeSection = (section) => Modal.confirm({
        title: `Delete “${section.title || typeMeta(section.section_type).label}”?`,
        content: "This removes the section from the page. This action cannot be undone.",
        okText: "Delete section",
        cancelText: "Keep section",
        okButtonProps: { danger: true },
        onOk: () => router.delete(route("central.website-sections.destroy", section.id)),
    });

    const supportsItemLinks = ["features", "content", "product", "solutions", "integrations", "security", "steps"].includes(sectionType);
    const supportsItemMedia = !["faq", "statistics"].includes(sectionType);
    const supportsIcons = ["features", "solutions", "integrations", "security", "steps"].includes(sectionType);
    const layoutOptions = LAYOUT_OPTIONS[sectionType] || [];

    const editorTabs = [
        {
            key: "content",
            label: <span><FileTextOutlined /> Content</span>,
            children: <div className="section-builder-tab">
                <div className="section-builder-preview">
                    <div className="section-builder-preview__topline">
                        <span>Content preview</span>
                        <Tag icon={isActive ? <EyeOutlined /> : <EyeInvisibleOutlined />} color={isActive ? "success" : "default"}>
                            {isActive ? "Visible" : "Hidden"}
                        </Tag>
                    </div>
                    <div className={`section-builder-preview__body${backgroundFields.background_text === "light" ? " is-light" : ""}`} style={backgroundPreviewStyle(backgroundFields)}>
                        {eyebrow && <span className="section-builder-preview__eyebrow">{eyebrow}</span>}
                        <Typography.Title level={3}>{title || currentType.label}</Typography.Title>
                        <Typography.Paragraph>{subtitle || currentType.description}</Typography.Paragraph>
                        {(buttonText || secondaryButtonText) && <Space wrap>
                            {buttonText && <Button type="primary" size="small">{buttonText}</Button>}
                            {secondaryButtonText && <Button size="small">{secondaryButtonText}</Button>}
                        </Space>}
                    </div>
                </div>

                <SectionCard title="Message" description="Write for visitors. Keep the heading specific and the supporting text easy to scan.">
                    <div className="central-two-column">
                        <Form.Item name="eyebrow" label="Small heading" extra="Optional label shown above the main heading.">
                            <Input placeholder="Built for growing finance teams" maxLength={100} showCount />
                        </Form.Item>
                        <Form.Item name="title" label="Main heading">
                            <Input placeholder="A clear, benefit-led headline" maxLength={255} showCount />
                        </Form.Item>
                    </div>
                    <Form.Item name="subtitle" label="Supporting text">
                        <Input.TextArea rows={3} placeholder="Explain the value in one or two short sentences." maxLength={500} showCount />
                    </Form.Item>
                    <Form.Item name="content" label="Detailed content" extra="Use this when the section needs more than a short introduction.">
                        <RichTextEditor autosaveKey={`section.${record?.id || `new.${selectedPage}`}`} />
                    </Form.Item>
                </SectionCard>
            </div>,
        },
        {
            key: "media-actions",
            label: <span><PictureOutlined /> Media & links</span>,
            children: <div className="section-builder-tab">
                <SectionCard title="Section image" description="Choose an optimized image from the media library and describe it for accessibility.">
                    <Form.Item name="media_id" hidden><Input /></Form.Item>
                    <MediaPicker
                        value={mediaId}
                        media={selectedMedia}
                        alt={imageAlt}
                        onChange={(value, media) => {
                            form.setFieldValue("media_id", value);
                            setSelectedMedia(media);
                        }}
                        onAltChange={(value) => form.setFieldValue("image_alt", value)}
                    />
                    <Form.Item name="image_alt" hidden><Input /></Form.Item>
                    <Form.Item name="image" label="External image URL" extra="Optional fallback for images that are not stored in the media library." style={{ marginTop: 20 }}>
                        <Input prefix={<LinkOutlined />} placeholder="https://example.com/image.webp" />
                    </Form.Item>
                    <Form.Item name="video_url" label="Video URL" extra="Optional. Use a full HTTPS URL.">
                        <Input prefix={<LinkOutlined />} type="url" placeholder="https://youtube.com/watch?v=…" />
                    </Form.Item>
                </SectionCard>

                <SectionCard title="Calls to action" description="Give each button a clear action label and destination.">
                    <div className="central-two-column">
                        <Form.Item name="button_text" label="Primary button label">
                            <Input placeholder="Start free trial" maxLength={100} />
                        </Form.Item>
                        <Form.Item name="button_url" label="Primary button link">
                            <Input prefix={<LinkOutlined />} placeholder="/register or https://…" />
                        </Form.Item>
                        <Form.Item name="secondary_button_text" label="Secondary button label">
                            <Input placeholder="Book a demo" maxLength={100} />
                        </Form.Item>
                        <Form.Item name="secondary_button_url" label="Secondary button link">
                            <Input prefix={<LinkOutlined />} placeholder="/contact or https://…" />
                        </Form.Item>
                    </div>
                </SectionCard>
            </div>,
        },
        {
            key: "items",
            label: <span><AppstoreOutlined /> Items</span>,
            children: <div className="section-builder-tab">
                <Alert
                    type="info"
                    showIcon
                    message={`${humanize(itemCopy.singular)}s are optional`}
                    description={`Use repeatable ${itemCopy.singular}s when this section needs a list, grid, or sequence. Drag-free ordering follows the order shown below.`}
                />
                <Form.List name="item_fields">
                    {(fields, { add, remove }) => <Space direction="vertical" className="section-builder-items" size={14}>
                        {fields.map(({ key, name, ...rest }, index) => {
                            const itemMedia = form.getFieldValue(["item_fields", name, "media"]);
                            return <SectionCard
                                key={key}
                                className="section-builder-item"
                                title={`${humanize(itemCopy.singular)} ${index + 1}`}
                                extra={<Tooltip title={`Remove ${itemCopy.singular}`}><Button type="text" danger icon={<DeleteOutlined />} onClick={() => remove(name)} /></Tooltip>}
                            >
                                <Form.Item {...rest} name={[name, "_legacy_index"]} hidden><InputNumber /></Form.Item>
                                <Row gutter={14}>
                                    <Col xs={24} md={12}>
                                        <Form.Item {...rest} name={[name, "title"]} label={itemCopy.title}>
                                            <Input placeholder={itemCopy.title} />
                                        </Form.Item>
                                    </Col>
                                    {supportsIcons && <Col xs={24} md={12}>
                                        <Form.Item {...rest} name={[name, "icon"]} label="Icon name" extra="Optional fallback when no image is selected.">
                                            <Input placeholder="check, shield, chart…" />
                                        </Form.Item>
                                    </Col>}
                                    <Col xs={24}>
                                        <Form.Item {...rest} name={[name, "content"]} label={itemCopy.content}>
                                            <Input.TextArea rows={3} placeholder={itemCopy.content} maxLength={5000} showCount />
                                        </Form.Item>
                                    </Col>
                                    {supportsItemLinks && <>
                                        <Col xs={24} md={12}>
                                            <Form.Item {...rest} name={[name, "cta_label"]} label="Link label">
                                                <Input placeholder="Learn more" />
                                            </Form.Item>
                                        </Col>
                                        <Col xs={24} md={12}>
                                            <Form.Item {...rest} name={[name, "url"]} label="Link destination">
                                                <Input prefix={<LinkOutlined />} placeholder="/features or https://…" />
                                            </Form.Item>
                                        </Col>
                                    </>}
                                    {supportsItemMedia && <Col xs={24}>
                                        <Form.Item {...rest} name={[name, "media_id"]} label="Image">
                                            <MediaPicker media={itemMedia} showAlt={false} />
                                        </Form.Item>
                                        <Form.Item {...rest} name={[name, "image_alt"]} label="Image description" extra="Describe the image for visitors using screen readers.">
                                            <Input placeholder="A concise description of the image" />
                                        </Form.Item>
                                    </Col>}
                                </Row>
                            </SectionCard>;
                        })}
                        {!fields.length && <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={`No ${itemCopy.singular}s added yet`} />}
                        <Button type="dashed" block icon={<PlusOutlined />} onClick={() => add({ title: "", content: "" })}>
                            {itemCopy.add}
                        </Button>
                    </Space>}
                </Form.List>
            </div>,
        },
        {
            key: "design",
            label: <span><SettingOutlined /> Design</span>,
            children: <div className="section-builder-tab">
                <SectionCard title="Presentation" description="Choose a supported layout and keep styling consistent with the website theme.">
                    <div className="central-two-column">
                        <Form.Item name="alignment" label="Text alignment" rules={[{ required: true, message: "Choose a text alignment." }]}>
                            <Select options={[
                                { value: "left", label: "Left aligned" },
                                { value: "center", label: "Centered" },
                                { value: "right", label: "Right aligned" },
                            ]} />
                        </Form.Item>
                        {layoutOptions.length > 0 && <Form.Item name={["settings_fields", "layout"]} label="Layout">
                            <Select allowClear placeholder="Recommended layout" options={layoutOptions} />
                        </Form.Item>}
                        {["content", "product", "security"].includes(sectionType) && <Form.Item name={["settings_fields", "image_position"]} label="Image position">
                            <Select allowClear placeholder="Right side" options={[
                                { value: "right", label: "Right side" },
                                { value: "left", label: "Left side" },
                            ]} />
                        </Form.Item>}
                    </div>
                    <Form.Item name={["settings_fields", "caption"]} label="Image caption">
                        <Input placeholder="Optional caption shown with the main image" />
                    </Form.Item>
                </SectionCard>

                <SectionCard title="Background" description="Give this section its own backdrop. Use a theme style, solid color, gradient, or picture.">
                    <div className="central-two-column">
                        <Form.Item name={["settings_fields", "background_type"]} label="Background type">
                            <Select options={BACKGROUND_MODES} />
                        </Form.Item>
                        <Form.Item name="background_style" label="Theme style" extra="Used when the background type is set to theme style.">
                            <Select allowClear placeholder="Default surface" options={BACKGROUND_PRESETS} />
                        </Form.Item>
                    </div>

                    {backgroundFields.background_type === "color" && <div className="section-builder-color-row">
                        <Form.Item name={["settings_fields", "background_color"]} label="Color" rules={[hexColorRule]}>
                            <Input type="color" />
                        </Form.Item>
                        <Form.Item name={["settings_fields", "background_color"]} label="Hex value" rules={[hexColorRule]}>
                            <Input placeholder="#f8fafc" />
                        </Form.Item>
                    </div>}

                    {backgroundFields.background_type === "gradient" && <>
                        <div className="central-two-column">
                            <Form.Item name={["settings_fields", "gradient_from"]} label="Gradient start" rules={[hexColorRule]}>
                                <Input type="color" />
                            </Form.Item>
                            <Form.Item name={["settings_fields", "gradient_to"]} label="Gradient end" rules={[hexColorRule]}>
                                <Input type="color" />
                            </Form.Item>
                            <Form.Item name={["settings_fields", "gradient_direction"]} label="Direction">
                                <Select options={GRADIENT_DIRECTIONS} />
                            </Form.Item>
                        </div>
                    </>}

                    {backgroundFields.background_type === "image" && <>
                        <Form.Item name={["settings_fields", "background_media_id"]} hidden><Input /></Form.Item>
                        <MediaPicker
                            value={backgroundFields.background_media_id}
                            media={selectedBackgroundMedia}
                            showAlt={false}
                            purpose="website_background"
                            onChange={(value, media) => {
                                form.setFieldValue(["settings_fields", "background_media_id"], value);
                                form.setFieldValue(["settings_fields", "background_image_url"], media?.url || "");
                                form.setFieldValue(["settings_fields", "background_image_name"], media?.original_filename || media?.title || "");
                                setSelectedBackgroundMedia(media);
                            }}
                        />
                        <Form.Item name={["settings_fields", "background_image_url"]} label="Background image URL" extra="Choose from media library above, or paste an HTTPS image URL." style={{ marginTop: 16 }}>
                            <Input prefix={<LinkOutlined />} placeholder="https://example.com/background.webp" />
                        </Form.Item>
                        <div className="central-two-column">
                            <Form.Item name={["settings_fields", "background_overlay"]} label="Overlay strength" extra="Higher values make text easier to read.">
                                <InputNumber min={0} max={85} addonAfter="%" style={{ width: "100%" }} />
                            </Form.Item>
                            <Form.Item name={["settings_fields", "background_size"]} label="Image fit">
                                <Select options={[
                                    { value: "cover", label: "Cover section" },
                                    { value: "contain", label: "Fit whole image" },
                                    { value: "auto", label: "Original size" },
                                ]} />
                            </Form.Item>
                        </div>
                    </>}

                    <Form.Item name={["settings_fields", "background_text"]} label="Text color">
                        <Select options={[
                            { value: "default", label: "Use theme text" },
                            { value: "light", label: "Light text" },
                            { value: "dark", label: "Dark text" },
                        ]} />
                    </Form.Item>
                    <div className="section-builder-background-preview" style={backgroundPreviewStyle(backgroundFields)}>
                        <span>{currentType.label}</span>
                        <strong>{title || "Section background preview"}</strong>
                    </div>
                </SectionCard>

                <SectionCard title="Visibility" description="Hidden sections stay saved in the builder but are not shown to website visitors.">
                    <Form.Item name="is_active" valuePropName="checked" className="section-builder-switch-row">
                        <Switch checkedChildren="Visible" unCheckedChildren="Hidden" />
                    </Form.Item>
                </SectionCard>
            </div>,
        },
        {
            key: "advanced",
            label: <span><CodeOutlined /> Advanced</span>,
            children: <div className="section-builder-tab">
                <Alert
                    type="warning"
                    showIcon
                    message="Advanced settings"
                    description="These fields are intended for developers and migrations. Invalid JSON will not be saved. Use the guided tabs for normal content editing."
                />
                <SectionCard title="Technical details">
                    <div className="central-two-column">
                        <Form.Item name="section_key" label="Internal key" extra="Unique within this page. Lowercase letters, numbers, dashes, and underscores only." rules={[
                            { required: true, message: "Enter an internal key." },
                            { pattern: /^[A-Za-z0-9_-]+$/, message: "Use only letters, numbers, dashes, and underscores." },
                        ]}>
                            <Input placeholder="features" />
                        </Form.Item>
                        <Form.Item name="sort_order" label="Sort position" extra="Use the arrow buttons on the section list for normal reordering.">
                            <InputNumber min={0} style={{ width: "100%" }} />
                        </Form.Item>
                    </div>
                    <Form.Item name="items_json" label="Complete item data (JSON)" rules={[{ validator: jsonArrayValidator }]}>
                        <Input.TextArea rows={9} className="central-code section-builder-code" spellCheck={false} />
                    </Form.Item>
                    <Form.Item name="settings_json" label="Complete section settings (JSON)" rules={[{ validator: jsonObjectValidator }]}>
                        <Input.TextArea rows={7} className="central-code section-builder-code" spellCheck={false} />
                    </Form.Item>
                </SectionCard>
            </div>,
        },
    ];

    return <CentralLayout title="Section Builder">
        <PageHeader
            eyebrow="Website"
            title="Section Builder"
            description="Build each page from clear, reusable content blocks. Arrange sections, add content, and control what visitors see."
            actions={<Button type="primary" icon={<PlusOutlined />} onClick={() => openEditor()}>Add section</Button>}
        />

        <div className="section-builder-summary">
            <div>
                <span className="section-builder-summary__label">Editing page</span>
                <Typography.Title level={4}>{selectedPageRecord?.title || "Select a page"}</Typography.Title>
                {selectedPageRecord?.slug && <Typography.Text type="secondary">/{selectedPageRecord.slug}</Typography.Text>}
            </div>
            <div className="section-builder-summary__stats">
                <span><strong>{sections.length}</strong> total sections</span>
                <span><strong>{activeCount}</strong> visible</span>
                <span><strong>{sections.length - activeCount}</strong> hidden</span>
            </div>
        </div>

        <SectionCard>
            <div className="central-toolbar section-builder-toolbar">
                <div>
                    <Typography.Text strong>Page</Typography.Text>
                    <Select
                        value={selectedPage}
                        showSearch
                        optionFilterProp="label"
                        style={{ minWidth: 280 }}
                        options={pages.map((page) => ({ value: page.id, label: page.title }))}
                        onChange={(page_id) => router.get(route("central.website-sections.index"), { page_id })}
                    />
                </div>
                <Typography.Text type="secondary">Use the arrows to control the order visitors see.</Typography.Text>
            </div>

            <div className="section-builder-list">
                {sections.map((section, index) => {
                    const meta = typeMeta(section.section_type);
                    const rowItemCopy = ITEM_COPY[section.section_type] || { singular: "item" };
                    const summary = plainText(section.subtitle || section.content);
                    return <article className={`section-builder-row${section.is_active ? "" : " is-hidden"}`} key={section.id}>
                        <div className="section-builder-row__position">
                            <span>{index + 1}</span>
                            <Space.Compact direction="vertical">
                                <Tooltip title="Move up"><Button size="small" icon={<ArrowUpOutlined />} disabled={index === 0} aria-label="Move section up" onClick={() => move(index, -1)} /></Tooltip>
                                <Tooltip title="Move down"><Button size="small" icon={<ArrowDownOutlined />} disabled={index === sections.length - 1} aria-label="Move section down" onClick={() => move(index, 1)} /></Tooltip>
                            </Space.Compact>
                        </div>
                        <div className={`section-builder-row__icon section-builder-row__icon--${meta.tone}`}><AppstoreOutlined /></div>
                        <button type="button" className="section-builder-row__content" onClick={() => openEditor(section)}>
                            <span className="section-builder-row__heading">
                                <Typography.Text strong>{section.title || meta.label}</Typography.Text>
                                <Tag color={meta.tone}>{meta.label}</Tag>
                                <Tag icon={section.is_active ? <CheckCircleFilled /> : <EyeInvisibleOutlined />} color={section.is_active ? "success" : "default"}>
                                    {section.is_active ? "Visible" : "Hidden"}
                                </Tag>
                            </span>
                            <Typography.Text type="secondary" ellipsis>{summary || meta.description}</Typography.Text>
                            <span className="section-builder-row__meta">
                                <span>{section.items?.length || 0} {section.items?.length === 1 ? rowItemCopy.singular : `${rowItemCopy.singular}s`}</span>
                                <span>Internal key: {section.section_key}</span>
                            </span>
                        </button>
                        <Space className="section-builder-row__actions">
                            <Tooltip title="Duplicate"><Button icon={<CopyOutlined />} aria-label="Duplicate section" onClick={() => openEditor(section, true)} /></Tooltip>
                            <Button icon={<EditOutlined />} onClick={() => openEditor(section)}>Edit</Button>
                            <Tooltip title="Delete"><Button danger type="text" icon={<DeleteOutlined />} aria-label="Delete section" onClick={() => removeSection(section)} /></Tooltip>
                        </Space>
                    </article>;
                })}
                {!sections.length && <Empty
                    className="section-builder-empty"
                    description={<div><Typography.Title level={5}>This page has no sections yet</Typography.Title><Typography.Paragraph type="secondary">Add a hero, feature grid, FAQ, call to action, or another reusable block.</Typography.Paragraph></div>}
                >
                    <Button type="primary" icon={<PlusOutlined />} onClick={() => openEditor()}>Add the first section</Button>
                </Empty>}
            </div>
        </SectionCard>

        <Drawer
            open={open}
            onClose={closeEditor}
            width={900}
            title={<div className="section-builder-drawer-title">
                <span>{record ? "Edit section" : "Add section"}</span>
                <Typography.Text type="secondary">{currentType.description}</Typography.Text>
            </div>}
            styles={{ body: { padding: 0 } }}
            footer={<div className="section-builder-drawer-footer">
                <Typography.Text type="secondary">Changes appear after you save.</Typography.Text>
                <Space>
                    <Button onClick={closeEditor}>Cancel</Button>
                    <Button type="primary" loading={saving} onClick={() => form.submit()}>Save section</Button>
                </Space>
            </div>}
        >
            <Form form={form} layout="vertical" onFinish={save} requiredMark="optional">
                <Form.Item name="page_id" hidden><Input /></Form.Item>
                <div className="section-builder-type-picker">
                    <Form.Item name="section_type" label="What kind of section are you adding?" rules={[{ required: true }]}>
                        <Select
                            size="large"
                            showSearch
                            optionFilterProp="label"
                            onChange={changeType}
                            options={SECTION_TYPES.map((item) => ({
                                value: item.value,
                                label: item.label,
                                title: item.description,
                            }))}
                            optionRender={(option) => {
                                const meta = typeMeta(option.value);
                                return <div className="section-builder-type-option"><strong>{meta.label}</strong><span>{meta.description}</span></div>;
                            }}
                        />
                    </Form.Item>
                </div>
                <Tabs className="section-builder-tabs" items={editorTabs} destroyOnHidden={false} />
            </Form>
        </Drawer>
    </CentralLayout>;
}

const jsonArrayValidator = (_, value) => {
    try {
        if (!Array.isArray(JSON.parse(value || "[]"))) throw new Error();
        return Promise.resolve();
    } catch {
        return Promise.reject(new Error("Enter a valid JSON array."));
    }
};

const jsonObjectValidator = (_, value) => {
    try {
        const parsed = JSON.parse(value || "{}");
        if (!parsed || Array.isArray(parsed) || typeof parsed !== "object") throw new Error();
        return Promise.resolve();
    } catch {
        return Promise.reject(new Error("Enter a valid JSON object."));
    }
};
