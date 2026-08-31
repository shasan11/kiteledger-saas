import { theme } from 'antd';

const DEFAULT_BRAND = {
  primary: '#0f766e',
  success: '#16a34a',
  warning: '#d97706',
  error: '#dc2626',
  info: '#2563eb',
};

const lightText = {
  main: '#0f172a',
  secondary: '#475569',
  tertiary: '#64748b',
  quaternary: '#94a3b8',
};

const darkText = {
  main: '#e5e7eb',
  secondary: '#cbd5e1',
  tertiary: '#94a3b8',
  quaternary: '#64748b',
};

const lightSurface = {
  body: '#f6f7f9',
  layout: '#f6f7f9',
  card: '#ffffff',
  elevated: '#ffffff',
  muted: '#f8fafc',
  muted2: '#edf2f7',
  muted3: '#f6f9fc',
  input: '#ffffff',
};

const darkSurface = {
  body: '#0b1220',
  layout: '#060d19',
  card: '#111827',
  elevated: '#1f2937',
  muted: '#1e293b',
  muted2: '#0f172a',
  muted3: '#020617',
  input: '#0f172a',
};

const lightBorder = {
  base: '#e2e8f0',
  soft: '#edf2f7',
  strong: '#dbe4ee',
};

const darkBorder = {
  base: '#334155',
  soft: '#1f2937',
  strong: '#475569',
};

const radius = {
  xs: 6,
  sm: 8,
  md: 10,
  lg: 14,
  xl: 16,
  pill: 999,
};

const lightShadow = {
  soft: '0 4px 14px rgba(15, 23, 42, 0.06)',
  card: '0 10px 30px rgba(15, 23, 42, 0.08)',
};

const darkShadow = {
  soft: '0 10px 22px rgba(2, 6, 23, 0.45)',
  card: '0 14px 32px rgba(2, 6, 23, 0.55)',
};

const normalizeHexColor = (value) => {
  if (typeof value !== 'string') return null;

  const trimmed = value.trim();

  if (/^#[0-9a-f]{6}$/i.test(trimmed)) return trimmed;

  if (/^#[0-9a-f]{3}$/i.test(trimmed)) {
    return `#${trimmed
      .slice(1)
      .split('')
      .map((char) => `${char}${char}`)
      .join('')}`;
  }

  if (/^#[0-9a-f]{8}$/i.test(trimmed)) return trimmed.slice(0, 7);

  return null;
};

const hexToRgb = (hex) => {
  const normalized = normalizeHexColor(hex);

  if (!normalized) return null;

  return {
    r: parseInt(normalized.slice(1, 3), 16),
    g: parseInt(normalized.slice(3, 5), 16),
    b: parseInt(normalized.slice(5, 7), 16),
  };
};

const hexToRgba = (hex, alpha = 1) => {
  const rgb = hexToRgb(hex);

  if (!rgb) return `rgba(22, 163, 74, ${alpha})`;

  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
};

const mixColor = (hex, mixWith = '#ffffff', amount = 0.2) => {
  const color = hexToRgb(hex);
  const mix = hexToRgb(mixWith);

  if (!color || !mix) return hex;

  const r = Math.round(color.r * (1 - amount) + mix.r * amount);
  const g = Math.round(color.g * (1 - amount) + mix.g * amount);
  const b = Math.round(color.b * (1 - amount) + mix.b * amount);

  return `#${[r, g, b]
    .map((value) => value.toString(16).padStart(2, '0'))
    .join('')}`;
};

const lighten = (hex, amount = 0.2) => mixColor(hex, '#ffffff', amount);
const darken = (hex, amount = 0.2) => mixColor(hex, '#000000', amount);

const getBrandValue = (settings, key, fallback) => {
  return normalizeHexColor(settings?.[key]) || fallback;
};

const getModeTokens = (mode = 'light') => {
  const isDark = mode === 'dark';

  return {
    isDark,
    text: isDark ? darkText : lightText,
    surface: isDark ? darkSurface : lightSurface,
    border: isDark ? darkBorder : lightBorder,
    shadow: isDark ? darkShadow : lightShadow,
  };
};

const createDynamicBrand = (settings = {}, mode = 'light') => {
  const isDark = mode === 'dark';

  const primary = getBrandValue(
    settings,
    'brand_primary_color',
    DEFAULT_BRAND.primary
  );

  const primaryHover = isDark ? lighten(primary, 0.12) : darken(primary, 0.1);

  const primaryActive = getBrandValue(
    settings,
    'brand_secondary_color',
    isDark ? lighten(primary, 0.22) : darken(primary, 0.25)
  );

  const primarySoft = hexToRgba(primary, isDark ? 0.16 : 0.08);
  const primarySoftHover = hexToRgba(primary, isDark ? 0.22 : 0.14);
  const primaryBorder = hexToRgba(primary, isDark ? 0.5 : 0.38);
  const primaryBorderHover = primary;

  const accent = getBrandValue(
    settings,
    'brand_accent_color',
    DEFAULT_BRAND.warning
  );

  const sidebar = getBrandValue(
    settings,
    'brand_sidebar_color',
    isDark ? '#020617' : '#0b1220'
  );

  const header = getBrandValue(
    settings,
    'brand_header_color',
    isDark ? '#111827' : '#ffffff'
  );

  const mainText = getBrandValue(
    settings,
    isDark ? 'brand_dark_text_color' : 'brand_text_color',
    isDark ? darkText.main : lightText.main
  );

  return {
    primary,
    primaryHover,
    primaryActive,
    primarySoft,
    primarySoftHover,
    primaryBorder,
    primaryBorderHover,

    success: primary,
    warning: accent,
    error: DEFAULT_BRAND.error,
    info: accent,

    accent,
    sidebar,
    header,
    mainText,

    focusShadow: `0 0 0 4px ${hexToRgba(primary, isDark ? 0.18 : 0.1)}`,
    selectedBg: hexToRgba(primary, isDark ? 0.16 : 0.08),
    selectedStrongBg: hexToRgba(primary, isDark ? 0.3 : 0.18),
  };
};

const createTheme = (mode = 'light', settings = null) => {
  const { isDark, text, surface, border, shadow } = getModeTokens(mode);
  const brand = createDynamicBrand(settings || {}, mode);

  return {
    algorithm: [isDark ? theme.darkAlgorithm : theme.defaultAlgorithm],

    token: {
      fontFamily:
        "Inter, Manrope, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",

      colorPrimary: brand.primary,
      colorPrimaryHover: brand.primaryHover,
      colorPrimaryActive: brand.primaryActive,
      colorPrimaryBg: brand.primarySoft,
      colorPrimaryBgHover: brand.primarySoftHover,
      colorPrimaryBorder: brand.primaryBorder,
      colorPrimaryBorderHover: brand.primaryBorderHover,

      colorSuccess: brand.success,
      colorWarning: brand.warning,
      colorError: brand.error,
      colorInfo: brand.info,

      colorText: brand.mainText,
      colorTextSecondary: text.secondary,
      colorTextTertiary: text.tertiary,
      colorTextQuaternary: text.quaternary,
      colorTextLightSolid: '#ffffff',

      colorBgBase: surface.body,
      colorBgLayout: surface.layout,
      colorBgContainer: surface.card,
      colorBgElevated: surface.elevated,

      colorFillSecondary: surface.muted,
      colorFillTertiary: surface.muted2,
      colorFillQuaternary: surface.muted3,

      colorBorder: border.base,
      colorBorderSecondary: border.soft,

      colorSplit: border.base,

      borderRadius: radius.md,
      borderRadiusXS: radius.xs,
      borderRadiusSM: radius.sm,
      borderRadiusLG: radius.lg,
      borderRadiusOuter: radius.xl,

      lineWidth: 1,

      fontSize: 14,
      fontSizeSM: 13,
      fontSizeLG: 16,
      fontWeightStrong: 600,

      controlHeight: 40,
      controlHeightSM: 34,
      controlHeightLG: 46,

      boxShadow: shadow.card,
      boxShadowSecondary: shadow.soft,

      wireframe: false,
      motionDurationFast: '0.15s',
      motionDurationMid: '0.2s',
      motionDurationSlow: '0.28s',
    },

    components: {
      Layout: {
        bodyBg: surface.layout,
        headerBg: brand.header,
        siderBg: brand.sidebar,
        triggerBg: brand.sidebar,
        triggerColor: '#e2e8f0',
        footerBg: surface.layout,
        lightSiderBg: surface.card,
      },

      Menu: {
        itemHeight: 42,
        itemBorderRadius: 10,
        itemMarginBlock: 6,
        itemMarginInline: 10,

        darkItemBg: brand.sidebar,
        darkSubMenuItemBg: brand.sidebar,
        darkPopupBg: brand.sidebar,
        darkItemColor: 'rgba(226,232,240,0.76)',
        darkItemHoverColor: '#ffffff',
        darkItemSelectedColor: '#ffffff',
        darkItemHoverBg: 'rgba(255,255,255,0.08)',
        darkItemSelectedBg: brand.selectedStrongBg,

        itemColor: text.secondary,
        itemHoverColor: text.main,
        itemSelectedColor: isDark ? '#ffffff' : brand.primaryActive,
        itemSelectedBg: brand.primarySoft,
        itemHoverBg: isDark ? 'rgba(148, 163, 184, 0.16)' : surface.muted,
        itemActiveBg: brand.primarySoft,
      },

      Button: {
        borderRadius: 10,
        fontWeight: 600,

        colorPrimary: brand.primary,
        colorPrimaryHover: brand.primaryHover,
        colorPrimaryActive: brand.primaryActive,

        defaultBg: surface.input,
        defaultBorderColor: border.strong,
        defaultColor: text.main,
        defaultHoverBg: surface.muted,
        defaultHoverBorderColor: brand.primary,
        defaultHoverColor: brand.primaryActive,
        defaultActiveBg: brand.primarySoft,
        defaultActiveBorderColor: brand.primaryHover,
        defaultActiveColor: brand.primaryActive,

        primaryColor: '#ffffff',
        contentFontSize: 14,
        contentFontSizeLG: 15,
        contentFontSizeSM: 13,
        paddingInline: 16,
        paddingInlineLG: 18,
        paddingInlineSM: 12,
      },

      Card: {
        borderRadius: 14,
        borderColor: border.base,
        headerBg: 'transparent',
        colorTextHeading: text.main,
        colorTextDescription: text.secondary,
        bodyPadding: 20,
        bodyPaddingSM: 16,
        headerHeight: 56,
        headerFontSize: 15,
        headerFontSizeSM: 14,
        extraColor: text.secondary,
      },

      Collapse: {
        headerBg: surface.muted,
        contentBg: surface.card,
        colorTextHeading: text.main,
        colorText: text.main,
        borderRadiusLG: 14,
        headerPadding: '14px 16px',
        contentPadding: '16px 18px',
      },

      Alert: {
        borderRadiusLG: 14,
        withDescriptionPadding: '14px 16px',
      },

      Anchor: {
        colorPrimary: brand.primary,
      },

      Avatar: {
        containerSize: 36,
        containerSizeLG: 44,
        containerSizeSM: 28,
        textFontSize: 14,
        groupSpace: 4,
      },

      Badge: {
        textFontSize: 12,
        textFontWeight: 600,
      },

      Breadcrumb: {
        itemColor: text.tertiary,
        lastItemColor: text.secondary,
        linkColor: text.tertiary,
        linkHoverColor: text.main,
        separatorColor: isDark ? '#475569' : '#cbd5e1',
      },

      Calendar: {
        fullBg: surface.card,
        fullPanelBg: surface.card,
        itemActiveBg: brand.primarySoft,
        colorText: text.main,
        colorTextHeading: text.main,
        miniContentHeight: 260,
      },

      Checkbox: {
        colorPrimary: brand.primary,
        colorPrimaryHover: brand.primaryHover,
        colorBorder: isDark ? '#475569' : '#cbd5e1',
        borderRadiusSM: 5,
      },

      DatePicker: {
        borderRadius: 10,
        activeBg: surface.input,
        hoverBg: surface.input,
        activeBorderColor: brand.primary,
        hoverBorderColor: brand.primary,
        activeShadow: brand.focusShadow,
        cellHoverBg: surface.muted,
        cellActiveWithRangeBg: brand.primarySoft,
        cellRangeBorderColor: brand.primaryBorder,
        cellRangeBg: brand.primarySoft,
        multipleItemBg: brand.primarySoft,
        multipleItemBorderColor: brand.primaryBorder,
      },

      Descriptions: {
        labelBg: surface.muted,
        titleColor: text.main,
        extraColor: text.secondary,
        colorText: text.main,
        colorTextSecondary: text.secondary,
        itemPaddingBottom: 14,
      },

      Divider: {
        colorSplit: border.base,
        marginLG: 20,
        margin: 16,
      },

      Drawer: {
        colorBgElevated: surface.card,
        colorText: text.main,
        colorTextHeading: text.main,
        footerPaddingBlock: 14,
        footerPaddingInline: 18,
      },

      Dropdown: {
        paddingBlock: 8,
        colorBgElevated: surface.elevated,
        controlItemBgHover: surface.muted,
        controlItemBgActive: brand.primarySoft,
        colorText: text.main,
      },

      Empty: {
        colorText: text.secondary,
        colorTextDescription: text.tertiary,
        fontSize: 14,
      },

      Form: {
        labelColor: text.secondary,
        labelFontSize: 14,
        labelHeight: 30,
        itemMarginBottom: 18,
        verticalLabelPadding: '0 0 6px',
      },

      Input: {
        borderRadius: 10,
        activeBg: surface.input,
        hoverBg: surface.input,
        addonBg: surface.muted,
        colorBgContainer: surface.input,
        colorText: text.main,
        colorTextPlaceholder: text.quaternary,
        activeBorderColor: brand.primary,
        hoverBorderColor: brand.primary,
        activeShadow: brand.focusShadow,
        paddingBlock: 9,
        paddingInline: 12,
      },

      InputNumber: {
        borderRadius: 10,
        activeBg: surface.input,
        handleBg: surface.input,
        colorBgContainer: surface.input,
        colorText: text.main,
        activeBorderColor: brand.primary,
        hoverBorderColor: brand.primary,
        activeShadow: brand.focusShadow,
      },

      List: {
        itemPadding: '14px 0',
        headerBg: 'transparent',
        footerBg: 'transparent',
        colorText: text.main,
      },

      Mentions: {
        activeBorderColor: brand.primary,
        hoverBorderColor: brand.primary,
        colorBgContainer: surface.input,
        colorText: text.main,
      },

      Modal: {
        borderRadiusLG: 14,
        contentBg: surface.card,
        headerBg: surface.card,
        footerBg: surface.card,
        titleColor: text.main,
        colorText: text.main,
        titleFontSize: 18,
        titleLineHeight: 1.4,
      },

      Pagination: {
        itemBg: surface.input,
        itemActiveBg: brand.primarySoft,
        itemLinkBg: surface.input,
        itemSize: 34,
        borderRadius: 10,
        colorPrimary: brand.primary,
        colorPrimaryHover: brand.primaryHover,
        colorText: text.secondary,
        colorTextDisabled: isDark ? '#475569' : '#cbd5e1',
      },

      Popconfirm: {
        zIndexPopup: 1060,
      },

      Popover: {
        titleMinWidth: 180,
        borderRadiusLG: 14,
        colorBgElevated: surface.elevated,
        colorText: text.main,
        colorTextHeading: text.main,
      },

      Progress: {
        defaultColor: brand.primary,
        remainingColor: isDark ? '#334155' : '#e5e7eb',
        lineBorderRadius: radius.pill,
        circleTextColor: text.main,
      },

      Radio: {
        colorPrimary: brand.primary,
        colorPrimaryHover: brand.primaryHover,
        buttonBg: surface.input,
        buttonCheckedBg: brand.primarySoft,
        buttonCheckedBgDisabled: surface.muted,
        buttonColor: text.secondary,
        buttonCheckedColor: brand.primaryActive,
        buttonSolidCheckedBg: brand.primary,
        buttonSolidCheckedColor: '#ffffff',
        buttonSolidCheckedHoverBg: brand.primaryHover,
        dotSize: 8,
        radioSize: 16,
      },

      Rate: {
        starColor: '#f59e0b',
        starHoverScale: 'scale(1.08)',
      },

      Result: {
        titleFontSize: 22,
        subtitleFontSize: 14,
        iconFontSize: 60,
        extraMargin: '20px 0 0 0',
        colorText: text.main,
        colorTextDescription: text.secondary,
      },

      Segmented: {
        trackBg: isDark ? '#020617' : '#eef2f7',
        itemColor: text.secondary,
        itemHoverColor: text.main,
        itemHoverBg: surface.muted,
        itemSelectedBg: surface.card,
        itemSelectedColor: brand.primaryActive,
        itemBorderRadius: 10,
      },

      Select: {
        borderRadius: 10,
        selectorBg: surface.input,
        clearBg: surface.input,
        colorBgContainer: surface.input,
        colorBgElevated: surface.elevated,
        colorText: text.main,
        colorTextPlaceholder: text.quaternary,
        activeBorderColor: brand.primary,
        hoverBorderColor: brand.primary,
        activeOutlineColor: hexToRgba(brand.primary, isDark ? 0.18 : 0.1),
        optionSelectedBg: brand.primarySoft,
        optionActiveBg: surface.muted,
        optionSelectedColor: text.main,
        multipleItemBg: brand.primarySoft,
        multipleItemBorderColor: brand.primaryBorder,
        multipleItemBorderColorDisabled: border.base,
        multipleItemColorDisabled: text.tertiary,
        showArrowPaddingInlineEnd: 30,
      },

      Skeleton: {
        gradientFromColor: isDark ? '#1e293b' : '#f8fafc',
        gradientToColor: isDark ? '#334155' : '#eef2f7',
        blockRadius: 10,
        paragraphLiHeight: 14,
      },

      Slider: {
        railBg: isDark ? '#334155' : '#e5e7eb',
        railHoverBg: isDark ? '#475569' : '#d1d5db',
        trackBg: brand.primary,
        trackHoverBg: brand.primaryHover,
        handleColor: brand.primary,
        handleActiveColor: brand.primaryHover,
        handleSize: 14,
        handleSizeHover: 16,
      },

      Spin: {
        dotSize: 22,
        dotSizeLG: 30,
        dotSizeSM: 16,
        contentHeight: 400,
      },

      Statistic: {
        titleFontSize: 13,
        contentFontSize: 24,
        colorText: text.main,
        colorTextDescription: text.secondary,
        fontFamily:
          "Inter, Manrope, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      },

      Steps: {
        colorTextDescription: text.tertiary,
        colorTextLabel: text.secondary,
        colorText: text.main,
        iconSize: 30,
        iconSizeSM: 24,
        dotSize: 10,
        dotCurrentSize: 12,
        navArrowColor: isDark ? '#475569' : '#cbd5e1',
        customIconSize: 30,
        customIconTop: 0,
        titleLineHeight: 1.4,
      },

      Switch: {
        colorPrimary: brand.primary,
        colorPrimaryHover: brand.primaryHover,
        handleBg: '#ffffff',
        trackHeight: 24,
        trackMinWidth: 46,
        trackPadding: 2,
        innerMinMargin: 20,
        innerMaxMargin: 24,
      },

      Table: {
        headerBg: isDark ? '#1e293b' : '#f8fafc',
        headerColor: isDark ? '#e2e8f0' : '#334155',
        headerSplitColor: border.base,
        borderColor: border.base,
        rowHoverBg: isDark ? '#0f172a' : '#f8fbff',
        colorBgContainer: surface.card,
        colorText: text.main,
        colorTextHeading: text.main,
        cellPaddingBlock: 14,
        cellPaddingInline: 14,
        footerBg: surface.card,
        headerBorderRadius: 12,
      },

      Tabs: {
        cardBg: surface.muted,
        itemColor: text.tertiary,
        itemHoverColor: text.main,
        itemSelectedColor: brand.primaryActive,
        inkBarColor: brand.primary,
        horizontalItemGutter: 24,
        horizontalItemPadding: '12px 4px',
        cardHeight: 42,
        titleFontSize: 14,
        titleFontSizeLG: 15,
      },

      Tag: {
        defaultBg: brand.primarySoft,
        defaultColor: brand.primaryActive,
        borderRadiusSM: radius.pill,
        fontSizeSM: 12,
        lineHeightSM: 1.2,
      },

      Timeline: {
        dotBg: surface.card,
        tailColor: border.base,
        itemPaddingBottom: 18,
        colorText: text.main,
      },

      Tooltip: {
        borderRadius: 10,
        colorBgSpotlight: isDark ? '#020617' : '#0f172a',
        colorTextLightSolid: '#ffffff',
      },

      Tour: {
        borderRadiusLG: 16,
        closeBtnSize: 24,
        primaryNextBtnHoverBg: brand.primaryHover,
        colorBgElevated: surface.elevated,
        colorText: text.main,
      },

      Tree: {
        nodeHoverBg: surface.muted,
        nodeSelectedBg: brand.primarySoft,
        directoryNodeSelectedBg: brand.primarySoft,
        directoryNodeSelectedColor: brand.primaryActive,
        colorText: text.main,
        titleHeight: 32,
        indentSize: 20,
      },

      TreeSelect: {
        borderRadius: 10,
        colorBgContainer: surface.input,
        colorBgElevated: surface.elevated,
        colorText: text.main,
      },

      Upload: {
        colorText: text.secondary,
        colorTextDescription: text.tertiary,
        actionsColor: text.tertiary,
      },

      Notification: {
        zIndexPopup: 2050,
        colorBgElevated: surface.elevated,
        colorText: text.main,
        colorTextHeading: text.main,
      },

      Message: {
        contentBg: surface.elevated,
        colorText: text.main,
        zIndexPopup: 2010,
      },

      QRCode: {
        colorText: text.main,
      },

      App: {
        colorPrimary: brand.primary,
      },
    },
  };
};

export const themeMain = createTheme('light');

export const createThemeConfig = (mode = 'light', settings = null) => {
  return createTheme(mode, settings);
};

export default createThemeConfig;
