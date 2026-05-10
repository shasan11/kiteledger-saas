import { useEffect, useState } from 'react';
import { Head } from '@inertiajs/react';
import {
  Button,
  Card,
  Col,
  ColorPicker,
  Divider,
  Form,
  Input,
  Radio,
  Row,
  Select,
  Space,
  Switch,
  Upload,
  message,
  theme,
  Typography,
} from 'antd';
import { DeleteOutlined, UploadOutlined } from '@ant-design/icons';
import axios from 'axios';
import { api, cleanPayload, fetchList } from './settingsApi';

const { Text } = Typography;

const DEFAULT_BRAND_COLORS = {
  brand_primary_color: '#1677ff',
  brand_secondary_color: '#0f172a',
  brand_accent_color: '#f97316',
  brand_sidebar_color: '#111827',
  brand_header_color: '#ffffff',
  brand_text_color: '#111827',
};

const MONTH_OPTIONS = [
  { value: 1, label: 'January' },
  { value: 2, label: 'February' },
  { value: 3, label: 'March' },
  { value: 4, label: 'April' },
  { value: 5, label: 'May' },
  { value: 6, label: 'June' },
  { value: 7, label: 'July' },
  { value: 8, label: 'August' },
  { value: 9, label: 'September' },
  { value: 10, label: 'October' },
  { value: 11, label: 'November' },
  { value: 12, label: 'December' },
];

export default function CompanyProfile() {
  const [form] = Form.useForm();
  const { token } = theme.useToken();

  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);

  const [currencies, setCurrencies] = useState([]);
  const [fiscalYears, setFiscalYears] = useState([]);

  const [logoFileList, setLogoFileList] = useState([]);
  const [darkLogoFileList, setDarkLogoFileList] = useState([]);
  const [faviconFileList, setFaviconFileList] = useState([]);

  const sectionStyle = {
    padding: 16,
    marginBottom: 16,
    border: `1px solid ${token.colorBorderSecondary}`,
    borderRadius: token.borderRadiusLG,
    background: token.colorFillAlter,
  };

  const sectionHeaderStyle = {
    marginBottom: 14,
  };

  const sectionTitleStyle = {
    margin: 0,
    fontSize: token.fontSizeLG,
    fontWeight: 600,
    color: token.colorText,
  };

  const sectionSubTextStyle = {
    color: token.colorTextSecondary,
    fontSize: token.fontSizeSM,
  };

  const uploadHintStyle = {
    color: token.colorTextTertiary,
    fontSize: token.fontSizeSM,
    marginTop: 4,
    maxWidth: 240,
  };

  const colorPickerFormProps = {
    getValueFromEvent: (color, hex) => hex,
  };

  const getMediaUrl = (url) => {
    if (!url) return null;

    if (
      typeof url === 'string' &&
      (url.startsWith('http://') ||
        url.startsWith('https://') ||
        url.startsWith('data:'))
    ) {
      return url;
    }

    return api(url.startsWith('/') ? url : `/${url}`);
  };

  const makeCurrentFile = (uid, name, url) => ({
    uid,
    name,
    status: 'done',
    url: getMediaUrl(url),
  });

  const setUploadPreviews = (data) => {
    if (data.logo_url || data.logo) {
      setLogoFileList([
        makeCurrentFile(
          'current-light-logo',
          'Current Light Logo',
          data.logo_url || data.logo
        ),
      ]);
    } else {
      setLogoFileList([]);
    }

    if (data.dark_logo_url || data.dark_logo) {
      setDarkLogoFileList([
        makeCurrentFile(
          'current-dark-logo',
          'Current Dark Logo',
          data.dark_logo_url || data.dark_logo
        ),
      ]);
    } else {
      setDarkLogoFileList([]);
    }

    if (data.favicon_url || data.favicon) {
      setFaviconFileList([
        makeCurrentFile(
          'current-favicon',
          'Current Favicon',
          data.favicon_url || data.favicon
        ),
      ]);
    } else {
      setFaviconFileList([]);
    }
  };

  const loadData = async () => {
    setLoading(true);

    try {
      const [settings, currencyRows, fiscalRows] = await Promise.all([
        axios.get(api('/api/app-settings/current')),
        fetchList('/api/currencies/', { page_size: 100 }),
        fetchList('/api/fiscal-years', { page_size: 100 }),
      ]);

      const data = settings.data || {};

      form.setFieldsValue({
        company_name: data.company_name || '',
        legal_name: data.legal_name || '',
        registration_number: data.registration_number || '',
        tax_number: data.tax_number || '',
        vat_number: data.vat_number || '',
        tag_line: data.tag_line || '',

        address: data.address || '',
        phone: data.phone || '',
        email: data.email || '',
        website: data.website || '',

        address_line_1: data.address_line_1 || '',
        address_line_2: data.address_line_2 || '',
        city: data.city || '',
        state: data.state || '',
        postal_code: data.postal_code || '',
        country: data.country || '',

        default_currency_id: data.default_currency_id || null,
        fiscal_year_id: data.fiscal_year_id || null,

        timezone: data.timezone || 'Asia/Kathmandu',
        date_format: data.date_format || 'DD-MM-YYYY',
        time_format: data.time_format || 'HH:mm',
        number_format: data.number_format || '1,234.56',
        language: data.language || 'en',
        week_start_day: data.week_start_day || 'Sunday',
        financial_year_start_month: data.financial_year_start_month || 4,
        use_nepali_calendar: Boolean(data.use_nepali_calendar),

        suggest_selling: data.suggest_selling || 'recent',
        negative_cash_balance: data.negative_cash_balance || 'warn',
        negative_item_balance: data.negative_item_balance || 'warn',
        credit_limit_exceed: data.credit_limit_exceed || 'warn',

        brand_primary_color:
          data.brand_primary_color || DEFAULT_BRAND_COLORS.brand_primary_color,
        brand_secondary_color:
          data.brand_secondary_color || DEFAULT_BRAND_COLORS.brand_secondary_color,
        brand_accent_color:
          data.brand_accent_color || DEFAULT_BRAND_COLORS.brand_accent_color,
        brand_sidebar_color:
          data.brand_sidebar_color || DEFAULT_BRAND_COLORS.brand_sidebar_color,
        brand_header_color:
          data.brand_header_color || DEFAULT_BRAND_COLORS.brand_header_color,
        brand_text_color:
          data.brand_text_color || DEFAULT_BRAND_COLORS.brand_text_color,

        footer: data.footer || '',
        active: data.active !== false,

        remove_logo: false,
        remove_dark_logo: false,
        remove_favicon: false,
      });

      setUploadPreviews(data);

      setCurrencies(
        currencyRows.map((item) => ({
          value: item.id,
          label: `${item.code} - ${item.name}`,
        }))
      );

      setFiscalYears(
        fiscalRows.map((item) => ({
          value: item.id,
          label: item.name,
        }))
      );
    } catch (error) {
      message.error(
        error?.response?.data?.message ||
          error?.response?.data?.detail ||
          'Failed to load company settings'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const beforeImageUpload = (file, maxSizeMb = 2) => {
    const fileName = String(file.name || '').toLowerCase();
    const isSvg = fileName.endsWith('.svg');
    const isIco = fileName.endsWith('.ico');
    const isImage = file.type?.startsWith('image/') || isSvg || isIco;
    const isAllowedSize = file.size / 1024 / 1024 < maxSizeMb;

    if (!isImage) {
      message.error('Only image files are allowed');
      return Upload.LIST_IGNORE;
    }

    if (!isAllowedSize) {
      message.error(`File must be smaller than ${maxSizeMb}MB`);
      return Upload.LIST_IGNORE;
    }

    return false;
  };

  const handlePreview = (file) => {
    const previewUrl =
      file.url ||
      file.thumbUrl ||
      (file.originFileObj ? URL.createObjectURL(file.originFileObj) : null);

    if (previewUrl) {
      window.open(previewUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const clearUpload = (field) => {
    if (field === 'logo') {
      setLogoFileList([]);
      form.setFieldsValue({ remove_logo: true });
    }

    if (field === 'dark_logo') {
      setDarkLogoFileList([]);
      form.setFieldsValue({ remove_dark_logo: true });
    }

    if (field === 'favicon') {
      setFaviconFileList([]);
      form.setFieldsValue({ remove_favicon: true });
    }
  };

  const appendFormValue = (formData, key, value) => {
    if (value === undefined || value === null) return;

    if (typeof value === 'boolean') {
      formData.append(key, value ? 'true' : 'false');
      return;
    }

    formData.append(key, value);
  };

  const save = async () => {
    setSaving(true);

    try {
      const values = await form.validateFields();
      const payload = cleanPayload(values);

      const formData = new FormData();

      Object.entries(payload).forEach(([key, value]) => {
        appendFormValue(formData, key, value);
      });

      const lightLogoFile = logoFileList?.[0]?.originFileObj;
      const darkLogoFile = darkLogoFileList?.[0]?.originFileObj;
      const faviconFile = faviconFileList?.[0]?.originFileObj;

      if (lightLogoFile) {
        formData.append('logo', lightLogoFile);
        formData.delete('remove_logo');
      }

      if (darkLogoFile) {
        formData.append('dark_logo', darkLogoFile);
        formData.delete('remove_dark_logo');
      }

      if (faviconFile) {
        formData.append('favicon', faviconFile);
        formData.delete('remove_favicon');
      }

      if (!lightLogoFile && logoFileList.length === 0) {
        formData.set('remove_logo', 'true');
      }

      if (!darkLogoFile && darkLogoFileList.length === 0) {
        formData.set('remove_dark_logo', 'true');
      }

      if (!faviconFile && faviconFileList.length === 0) {
        formData.set('remove_favicon', 'true');
      }

      const response = await axios.put(api('/api/app-settings/current'), formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      const data = response.data || {};

      setUploadPreviews(data);

      form.setFieldsValue({
        remove_logo: false,
        remove_dark_logo: false,
        remove_favicon: false,
      });

      message.success('Company settings saved');
    } catch (error) {
      if (error?.errorFields) return;

      message.error(
        error?.response?.data?.logo?.[0] ||
          error?.response?.data?.dark_logo?.[0] ||
          error?.response?.data?.favicon?.[0] ||
          error?.response?.data?.company_name?.[0] ||
          error?.response?.data?.email?.[0] ||
          error?.response?.data?.message ||
          error?.response?.data?.detail ||
          'Failed to save company settings'
      );
    } finally {
      setSaving(false);
    }
  };

  const Section = ({ title, description, children }) => (
    <div style={sectionStyle}>
      <div style={sectionHeaderStyle}>
        <h3 style={sectionTitleStyle}>{title}</h3>
        {description ? <Text style={sectionSubTextStyle}>{description}</Text> : null}
      </div>

      <Divider style={{ margin: '0 0 16px' }} />

      {children}
    </div>
  );

  const UploadBox = ({
    label,
    hint,
    fileList,
    setFileList,
    removeField,
    uploadText,
    accept = 'image/*',
    maxSizeMb = 2,
  }) => (
    <Form.Item label={label}>
      <Space direction="vertical" size={10}>
        <Upload
          accept={accept}
          listType="picture-card"
          maxCount={1}
          fileList={fileList}
          beforeUpload={(file) => beforeImageUpload(file, maxSizeMb)}
          onChange={({ fileList: nextFileList }) => {
            form.setFieldsValue({ [removeField]: false });
            setFileList(nextFileList.slice(-1));
          }}
          onRemove={() => {
            form.setFieldsValue({ [removeField]: true });
            return true;
          }}
          onPreview={handlePreview}
        >
          {fileList.length >= 1 ? null : (
            <div>
              <UploadOutlined />
              <div style={{ marginTop: 8 }}>{uploadText}</div>
            </div>
          )}
        </Upload>

        {hint ? <Text style={uploadHintStyle}>{hint}</Text> : null}
      </Space>
    </Form.Item>
  );

  const ColorField = ({ name, label }) => (
    <Col xs={24} md={8}>
      <Form.Item name={name} label={label} {...colorPickerFormProps}>
        <ColorPicker
          showText
          format="hex"
          style={{
            width: '100%',
          }}
        />
      </Form.Item>
    </Col>
  );

  return (
    <>
      <Head title="Company Profile" />

      <div
        style={{
          padding: 18,
          background: token.colorBgLayout,
          minHeight: '100vh',
        }}
      >
        <Card
          title="Company Profile"
          loading={loading}
          extra={
            <Button type="primary" loading={saving} onClick={save}>
              Save
            </Button>
          }
          style={{
            borderRadius: token.borderRadiusLG,
            borderColor: token.colorBorderSecondary,
            boxShadow: token.boxShadowTertiary,
          }}
          styles={{
            body: {
              padding: 18,
            },
          }}
        >
          <Form form={form} layout="vertical">
            <Form.Item name="remove_logo" hidden>
              <Input />
            </Form.Item>

            <Form.Item name="remove_dark_logo" hidden>
              <Input />
            </Form.Item>

            <Form.Item name="remove_favicon" hidden>
              <Input />
            </Form.Item>

            <Section
              title="Company Identity & Branding"
              description="Legal identity, logos, favicon, and brand colors used across the application and documents."
            >
              <Row gutter={[16, 16]}>
                <Col xs={24} md={8}>
                  <Form.Item
                    name="company_name"
                    label="Company Name"
                    rules={[
                      {
                        required: true,
                        message: 'Company name is required',
                      },
                    ]}
                  >
                    <Input placeholder="Company name" />
                  </Form.Item>
                </Col>

                <Col xs={24} md={8}>
                  <Form.Item name="legal_name" label="Legal Name">
                    <Input placeholder="Registered legal name" />
                  </Form.Item>
                </Col>

                <Col xs={24} md={8}>
                  <Form.Item name="tag_line" label="Tag Line">
                    <Input placeholder="Example: Smart Accounting for Modern Businesses" />
                  </Form.Item>
                </Col>

                <Col xs={24} md={8}>
                  <Form.Item name="registration_number" label="Registration Number">
                    <Input />
                  </Form.Item>
                </Col>

                <Col xs={24} md={8}>
                  <Form.Item name="tax_number" label="PAN / Tax Number">
                    <Input />
                  </Form.Item>
                </Col>

                <Col xs={24} md={8}>
                  <Form.Item name="vat_number" label="VAT Number">
                    <Input />
                  </Form.Item>
                </Col>

                <Col xs={24} md={8}>
                  <UploadBox
                    label="Light Logo"
                    hint="Used on light backgrounds, invoices, reports, and headers."
                    fileList={logoFileList}
                    setFileList={setLogoFileList}
                    removeField="remove_logo"
                    uploadText="Light Logo"
                  />

                  {logoFileList.length > 0 ? (
                    <Button
                      danger
                      size="small"
                      icon={<DeleteOutlined />}
                      onClick={() => clearUpload('logo')}
                    >
                      Remove Light Logo
                    </Button>
                  ) : null}
                </Col>

                <Col xs={24} md={8}>
                  <UploadBox
                    label="Dark Logo"
                    hint="Used on dark sidebar, dark navbar, or dark document headers."
                    fileList={darkLogoFileList}
                    setFileList={setDarkLogoFileList}
                    removeField="remove_dark_logo"
                    uploadText="Dark Logo"
                  />

                  {darkLogoFileList.length > 0 ? (
                    <Button
                      danger
                      size="small"
                      icon={<DeleteOutlined />}
                      onClick={() => clearUpload('dark_logo')}
                    >
                      Remove Dark Logo
                    </Button>
                  ) : null}
                </Col>

                <Col xs={24} md={8}>
                  <UploadBox
                    label="Favicon"
                    hint="Browser tab icon. PNG, SVG, ICO, JPG, or WEBP."
                    fileList={faviconFileList}
                    setFileList={setFaviconFileList}
                    removeField="remove_favicon"
                    uploadText="Favicon"
                    accept="image/*,.ico,.svg"
                    maxSizeMb={1}
                  />

                  {faviconFileList.length > 0 ? (
                    <Button
                      danger
                      size="small"
                      icon={<DeleteOutlined />}
                      onClick={() => clearUpload('favicon')}
                    >
                      Remove Favicon
                    </Button>
                  ) : null}
                </Col>

                <ColorField name="brand_primary_color" label="Primary Color" />
                <ColorField name="brand_secondary_color" label="Secondary Color" />
                <ColorField name="brand_accent_color" label="Accent Color" />
                <ColorField name="brand_sidebar_color" label="Sidebar Color" />
                <ColorField name="brand_header_color" label="Header Color" />
                <ColorField name="brand_text_color" label="Text Color" />

                <Col xs={24} md={8}>
                  <Form.Item
                    name="active"
                    label="Company Profile Active"
                    valuePropName="checked"
                  >
                    <Switch />
                  </Form.Item>
                </Col>
              </Row>
            </Section>

            <Section
              title="Contact Details"
              description="Public company contact details shown on reports and documents."
            >
              <Row gutter={[16, 16]}>
                <Col xs={24} md={8}>
                  <Form.Item name="phone" label="Phone">
                    <Input />
                  </Form.Item>
                </Col>

                <Col xs={24} md={8}>
                  <Form.Item
                    name="email"
                    label="Email"
                    rules={[
                      {
                        type: 'email',
                        message: 'Enter a valid email',
                      },
                    ]}
                  >
                    <Input />
                  </Form.Item>
                </Col>

                <Col xs={24} md={8}>
                  <Form.Item name="website" label="Website">
                    <Input />
                  </Form.Item>
                </Col>
              </Row>
            </Section>

            <Section
              title="Address"
              description="Registered or operating address of the company."
            >
              <Row gutter={[16, 16]}>
                <Col xs={24}>
                  <Form.Item name="address" label="Short Address">
                    <Input placeholder="Example: Kathmandu, Nepal" />
                  </Form.Item>
                </Col>

                <Col xs={24} md={12}>
                  <Form.Item name="address_line_1" label="Address Line 1">
                    <Input />
                  </Form.Item>
                </Col>

                <Col xs={24} md={12}>
                  <Form.Item name="address_line_2" label="Address Line 2">
                    <Input />
                  </Form.Item>
                </Col>

                <Col xs={24} md={6}>
                  <Form.Item name="city" label="City">
                    <Input />
                  </Form.Item>
                </Col>

                <Col xs={24} md={6}>
                  <Form.Item name="state" label="State">
                    <Input />
                  </Form.Item>
                </Col>

                <Col xs={24} md={6}>
                  <Form.Item name="postal_code" label="Postal Code">
                    <Input />
                  </Form.Item>
                </Col>

                <Col xs={24} md={6}>
                  <Form.Item name="country" label="Country">
                    <Input />
                  </Form.Item>
                </Col>
              </Row>
            </Section>

            <Section
              title="Localization"
              description="Currency, fiscal year, timezone, date, and language preferences."
            >
              <Row gutter={[16, 16]}>
                <Col xs={24} md={8}>
                  <Form.Item name="default_currency_id" label="Default Currency">
                    <Select allowClear options={currencies} />
                  </Form.Item>
                </Col>

                <Col xs={24} md={8}>
                  <Form.Item name="fiscal_year_id" label="Fiscal Year">
                    <Select allowClear options={fiscalYears} />
                  </Form.Item>
                </Col>

                <Col xs={24} md={8}>
                  <Form.Item name="timezone" label="Timezone">
                    <Select
                      showSearch
                      options={[
                        { value: 'Asia/Kathmandu', label: 'Asia/Kathmandu' },
                        { value: 'Asia/Katmandu', label: 'Asia/Katmandu' },
                        { value: 'UTC', label: 'UTC' },
                        { value: 'Asia/Kolkata', label: 'Asia/Kolkata' },
                      ]}
                    />
                  </Form.Item>
                </Col>

                <Col xs={24} md={6}>
                  <Form.Item name="date_format" label="Date Format">
                    <Select
                      options={[
                        { value: 'DD-MM-YYYY', label: 'DD-MM-YYYY' },
                        { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD' },
                        { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY' },
                      ]}
                    />
                  </Form.Item>
                </Col>

                <Col xs={24} md={6}>
                  <Form.Item name="time_format" label="Time Format">
                    <Select
                      options={[
                        { value: 'HH:mm', label: '24 Hour - HH:mm' },
                        { value: 'hh:mm A', label: '12 Hour - hh:mm A' },
                      ]}
                    />
                  </Form.Item>
                </Col>

                <Col xs={24} md={6}>
                  <Form.Item name="number_format" label="Number Format">
                    <Select
                      allowClear
                      options={[
                        { value: '1,234.56', label: '1,234.56' },
                        { value: '1.234,56', label: '1.234,56' },
                        { value: '1234.56', label: '1234.56' },
                      ]}
                    />
                  </Form.Item>
                </Col>

                <Col xs={24} md={6}>
                  <Form.Item name="language" label="Language">
                    <Select
                      options={[
                        { value: 'en', label: 'English' },
                        { value: 'ne', label: 'Nepali' },
                        { value: 'hi', label: 'Hindi' },
                      ]}
                    />
                  </Form.Item>
                </Col>

                <Col xs={24} md={6}>
                  <Form.Item name="week_start_day" label="Week Start">
                    <Select
                      options={[
                        { value: 'Sunday', label: 'Sunday' },
                        { value: 'Monday', label: 'Monday' },
                        { value: 'Saturday', label: 'Saturday' },
                      ]}
                    />
                  </Form.Item>
                </Col>

                <Col xs={24} md={6}>
                  <Form.Item name="financial_year_start_month" label="FY Start Month">
                    <Select options={MONTH_OPTIONS} />
                  </Form.Item>
                </Col>

                <Col xs={24} md={6}>
                  <Form.Item
                    name="use_nepali_calendar"
                    label="Nepali Calendar"
                    valuePropName="checked"
                  >
                    <Switch />
                  </Form.Item>
                </Col>
              </Row>
            </Section>

            <Section
              title="Business Rules"
              description="Default warning and blocking behavior used by sales, inventory, and cash workflows."
            >
              <Row gutter={[16, 18]}>
                <Col xs={24} md={12}>
                  <Form.Item name="suggest_selling" label="Suggest Selling">
                    <Radio.Group optionType="button" buttonStyle="solid">
                      <Radio.Button value="recent">Recent Price</Radio.Button>
                      <Radio.Button value="fixed">Fixed Price</Radio.Button>
                    </Radio.Group>
                  </Form.Item>
                </Col>

                <Col xs={24} md={12}>
                  <Form.Item name="negative_cash_balance" label="Negative Cash Balance">
                    <Radio.Group optionType="button" buttonStyle="solid">
                      <Radio.Button value="reject">Reject</Radio.Button>
                      <Radio.Button value="warn">Warn</Radio.Button>
                      <Radio.Button value="do_nothing">Do Nothing</Radio.Button>
                    </Radio.Group>
                  </Form.Item>
                </Col>

                <Col xs={24} md={12}>
                  <Form.Item name="negative_item_balance" label="Negative Item Balance">
                    <Radio.Group optionType="button" buttonStyle="solid">
                      <Radio.Button value="reject">Reject</Radio.Button>
                      <Radio.Button value="warn">Warn</Radio.Button>
                      <Radio.Button value="do_nothing">Do Nothing</Radio.Button>
                    </Radio.Group>
                  </Form.Item>
                </Col>

                <Col xs={24} md={12}>
                  <Form.Item name="credit_limit_exceed" label="Credit Limit Exceed">
                    <Radio.Group optionType="button" buttonStyle="solid">
                      <Radio.Button value="reject">Reject</Radio.Button>
                      <Radio.Button value="warn">Warn</Radio.Button>
                      <Radio.Button value="do_nothing">Do Nothing</Radio.Button>
                    </Radio.Group>
                  </Form.Item>
                </Col>
              </Row>
            </Section>

            <Section
              title="Document Footer"
              description="Footer text used in invoices, bills, reports, and printed documents."
            >
              <Row gutter={[16, 16]}>
                <Col span={24}>
                  <Form.Item name="footer" label="Footer Text">
                    <Input.TextArea rows={3} />
                  </Form.Item>
                </Col>
              </Row>
            </Section>

            <Space>
              <Button type="primary" loading={saving} onClick={save}>
                Save
              </Button>

              <Button onClick={loadData}>Reset</Button>
            </Space>
          </Form>
        </Card>
      </div>
    </>
  );
}