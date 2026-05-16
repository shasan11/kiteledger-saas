import { theme } from 'antd';

const DEFAULT_BRAND = {
  primary: '#16a34a',
  success: '#16a34a',
  warning: '#f59e0b',
  error: '#ef4444',
  info: '#0ea5e9',
};

const text = {
  main: '#0f172a',
  secondary: '#475569',
  tertiary: '#64748b',
  quaternary: '#94a3b8',
};

const surface = {
  body: '#eef3f8',
  layout: '#f4f7fb',
  card: '#ffffff',
  elevated: '#ffffff',
  muted: '#f8fafc',
  muted2: '#edf2f7',
  muted3: '#f6f9fc',
};

const border = {
  base: '#e2e8f0',
  soft: '#edf2f7',
  strong: '#dbe4ee',
};

const radius = {
  xs: 3,
  sm: 3,
  md: 3,
  lg: 3,
  xl: 3,
  pill: 999,
};

const shadow = {
  soft: '0 4px 14px rgba(15, 23, 42, 0.06)',
  card: '0 10px 30px rgba(15, 23, 42, 0.08)',
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

  // Strip alpha from 8-digit hex (e.g. #rrggbbaa from ColorPicker)
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

const createDynamicBrand = (settings = {}, mode = 'light') => {
  const primary = getBrandValue(
    settings,
    'brand_primary_color',
    DEFAULT_BRAND.primary
  );

  const primaryHover = darken(primary, 0.1);

  const primaryActive = getBrandValue(
    settings,
    'brand_secondary_color',
    darken(primary, 0.25)
  );

  const primarySoft = hexToRgba(primary, 0.08);
  const primarySoftHover = hexToRgba(primary, 0.14);
  const primaryBorder = hexToRgba(primary, 0.38);
  const primaryBorderHover = primary;

  const accent = getBrandValue(
    settings,
    'brand_accent_color',
    DEFAULT_BRAND.warning
  );

  const sidebar = getBrandValue(
    settings,
    'brand_sidebar_color',
    mode === 'dark' ? '#020617' : '#0b1220'
  );

  const header = getBrandValue(
    settings,
    'brand_header_color',
    mode === 'dark' ? '#111827' : '#ffffff'
  );

  const mainText = getBrandValue(settings, 'brand_text_color', text.main);

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

    focusShadow: `0 0 0 4px ${hexToRgba(primary, 0.1)}`,
    selectedBg: hexToRgba(primary, 0.08),
    selectedStrongBg: hexToRgba(primary, 0.18),
  };
};

const defaultBrand = createDynamicBrand();

export const themeMain = {
  algorithm: [theme.defaultAlgorithm],

  token: {
    fontFamily:
      "Inter, Manrope, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",

    colorPrimary: defaultBrand.primary,
    colorPrimaryHover: defaultBrand.primaryHover,
    colorPrimaryActive: defaultBrand.primaryActive,
    colorPrimaryBg: defaultBrand.primarySoft,
    colorPrimaryBgHover: defaultBrand.primarySoftHover,
    colorPrimaryBorder: defaultBrand.primaryBorder,
    colorPrimaryBorderHover: defaultBrand.primaryBorderHover,

    colorSuccess: defaultBrand.success,
    colorWarning: defaultBrand.warning,
    colorError: defaultBrand.error,
    colorInfo: defaultBrand.info,

    colorText: text.main,
    colorTextSecondary: text.secondary,
    colorTextTertiary: text.tertiary,
    colorTextQuaternary: text.quaternary,

    colorBgBase: surface.body,
    colorBgLayout: surface.layout,
    colorBgContainer: surface.card,
    colorBgElevated: surface.elevated,

    colorFillSecondary: surface.muted,
    colorFillTertiary: surface.muted2,
    colorFillQuaternary: surface.muted3,

    colorBorder: border.base,
    colorBorderSecondary: border.soft,

    borderRadius: radius.md,
    borderRadiusXS: radius.xs,
    borderRadiusSM: radius.sm,
    borderRadiusLG: radius.lg,
    borderRadiusOuter: radius.xl,

    lineWidth: 1,

    fontSize: 13,
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
      headerBg: '#ffffff',
      siderBg: '#0b1220',
      triggerBg: '#111827',
      triggerColor: '#e2e8f0',
      footerBg: surface.layout,
      lightSiderBg: '#ffffff',
    },

    Menu: {
      itemHeight: 42,
      itemBorderRadius: 10,
      itemMarginBlock: 6,
      itemMarginInline: 10,

      darkItemBg: '#0b1220',
      darkSubMenuItemBg: '#0f172a',
      darkPopupBg: '#0f172a',
      darkItemColor: 'rgba(226,232,240,0.76)',
      darkItemHoverColor: '#ffffff',
      darkItemSelectedColor: '#ffffff',
      darkItemHoverBg: 'rgba(255,255,255,0.06)',
      darkItemSelectedBg: defaultBrand.selectedStrongBg,

      itemColor: text.secondary,
      itemHoverColor: text.main,
      itemSelectedColor: defaultBrand.primaryActive,
      itemSelectedBg: defaultBrand.primarySoft,
      itemHoverBg: surface.muted,
      itemActiveBg: defaultBrand.primarySoft,
    },

    Button: {
      borderRadius: 5,
      fontWeight: 600,

      colorPrimary: defaultBrand.primary,
      colorPrimaryHover: defaultBrand.primaryHover,
      colorPrimaryActive: defaultBrand.primaryActive,

      defaultBg: '#ffffff',
      defaultBorderColor: border.strong,
      defaultColor: text.main,
      defaultHoverBg: surface.muted,
      defaultHoverBorderColor: defaultBrand.primary,
      defaultHoverColor: defaultBrand.primaryActive,
      defaultActiveBg: defaultBrand.primarySoft,
      defaultActiveBorderColor: defaultBrand.primaryHover,
      defaultActiveColor: defaultBrand.primaryActive,

      primaryColor: '#ffffff',
      contentFontSize: 14,
      contentFontSizeLG: 15,
      contentFontSizeSM: 13,
      paddingInline: 16,
      paddingInlineLG: 18,
      paddingInlineSM: 12,
    },

    Card: {
      borderRadius: 0,
      borderColor: '#e5eaf1',
      headerBg: 'transparent',
      bodyPadding: 20,
      bodyPaddingSM: 16,
      headerHeight: 56,
      headerFontSize: 15,
      headerFontSizeSM: 14,
      extraColor: text.secondary,
    },

    Collapse: {
      headerBg: surface.muted,
      contentBg: '#ffffff',
      borderRadiusLG: 14,
      headerPadding: '14px 16px',
      contentPadding: '16px 18px',
    },

    Alert: {
      borderRadiusLG: 14,
      withDescriptionPadding: '14px 16px',
    },

    Anchor: {
      colorPrimary: defaultBrand.primary,
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
      separatorColor: '#cbd5e1',
    },

    Calendar: {
      fullBg: '#ffffff',
      fullPanelBg: '#ffffff',
      itemActiveBg: defaultBrand.primarySoft,
      miniContentHeight: 260,
    },

    Checkbox: {
      colorPrimary: defaultBrand.primary,
      colorPrimaryHover: defaultBrand.primaryHover,
      colorBorder: '#cbd5e1',
      borderRadiusSM: 5,
    },

    DatePicker: {
      borderRadius: 10,
      activeBg: '#ffffff',
      hoverBg: '#ffffff',
      activeBorderColor: defaultBrand.primary,
      hoverBorderColor: defaultBrand.primary,
      activeShadow: defaultBrand.focusShadow,
      cellHoverBg: surface.muted,
      cellActiveWithRangeBg: defaultBrand.primarySoft,
      cellRangeBorderColor: defaultBrand.primaryBorder,
      cellRangeBg: defaultBrand.primarySoft,
      multipleItemBg: defaultBrand.primarySoft,
      multipleItemBorderColor: defaultBrand.primaryBorder,
    },

    Descriptions: {
      labelBg: surface.muted,
      titleColor: text.main,
      extraColor: text.secondary,
      itemPaddingBottom: 14,
    },

    Divider: {
      colorSplit: border.base,
      marginLG: 20,
      margin: 16,
    },

    Drawer: {
      colorBgElevated: '#ffffff',
      footerPaddingBlock: 14,
      footerPaddingInline: 18,
    },

    Dropdown: {
      paddingBlock: 8,
      controlItemBgHover: surface.muted,
      controlItemBgActive: defaultBrand.primarySoft,
    },

    Empty: {
      colorText: text.secondary,
      colorTextDescription: text.tertiary,
      fontSize: 14,
    },

    Form: {
      labelColor: '#334155',
      labelFontSize: 14,
      labelHeight: 30,
      itemMarginBottom: 18,
      verticalLabelPadding: '0 0 6px',
    },

    Input: {
      borderRadius: 10,
      activeBg: '#ffffff',
      hoverBg: '#ffffff',
      addonBg: surface.muted,
      activeBorderColor: defaultBrand.primary,
      hoverBorderColor: defaultBrand.primary,
      activeShadow: defaultBrand.focusShadow,
      paddingBlock: 9,
      paddingInline: 12,
    },

    InputNumber: {
      borderRadius: 10,
      activeBg: '#ffffff',
      handleBg: '#ffffff',
      activeBorderColor: defaultBrand.primary,
      hoverBorderColor: defaultBrand.primary,
      activeShadow: defaultBrand.focusShadow,
    },

    List: {
      itemPadding: '14px 0',
      headerBg: 'transparent',
      footerBg: 'transparent',
    },

    Mentions: {
      activeBorderColor: defaultBrand.primary,
      hoverBorderColor: defaultBrand.primary,
    },

    Modal: {
      borderRadiusLG: 3,
      contentBg: '#ffffff',
      headerBg: '#ffffff',
      footerBg: '#ffffff',
      titleFontSize: 18,
      titleLineHeight: 1.4,
    },

    Pagination: {
      itemBg: '#ffffff',
      itemActiveBg: defaultBrand.primarySoft,
      itemLinkBg: '#ffffff',
      itemSize: 34,
      borderRadius: 10,
      colorPrimary: defaultBrand.primary,
      colorPrimaryHover: defaultBrand.primaryHover,
      colorText: text.secondary,
      colorTextDisabled: '#cbd5e1',
    },

    Popconfirm: {
      zIndexPopup: 1060,
    },

    Popover: {
      titleMinWidth: 180,
      borderRadiusLG: 14,
    },

    Progress: {
      defaultColor: defaultBrand.primary,
      remainingColor: '#e5e7eb',
      lineBorderRadius: radius.pill,
      circleTextColor: text.main,
    },

    Radio: {
      colorPrimary: defaultBrand.primary,
      colorPrimaryHover: defaultBrand.primaryHover,
      buttonBg: '#ffffff',
      buttonCheckedBg: defaultBrand.primarySoft,
      buttonCheckedBgDisabled: '#f1f5f9',
      buttonColor: text.secondary,
      buttonCheckedColor: defaultBrand.primaryActive,
      buttonSolidCheckedBg: defaultBrand.primary,
      buttonSolidCheckedColor: '#ffffff',
      buttonSolidCheckedHoverBg: defaultBrand.primaryHover,
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
    },

    Segmented: {
      trackBg: '#eef2f7',
      itemColor: text.secondary,
      itemHoverColor: text.main,
      itemHoverBg: '#f8fafc',
      itemSelectedBg: '#ffffff',
      itemSelectedColor: defaultBrand.primaryActive,
      itemBorderRadius: 10,
    },

    Select: {
      borderRadius: 10,
      selectorBg: '#ffffff',
      clearBg: '#ffffff',
      activeBorderColor: defaultBrand.primary,
      hoverBorderColor: defaultBrand.primary,
      activeOutlineColor: hexToRgba(defaultBrand.primary, 0.1),
      optionSelectedBg: defaultBrand.primarySoft,
      optionActiveBg: surface.muted,
      multipleItemBg: defaultBrand.primarySoft,
      multipleItemBorderColor: defaultBrand.primaryBorder,
      multipleItemBorderColorDisabled: border.base,
      multipleItemColorDisabled: text.tertiary,
      showArrowPaddingInlineEnd: 30,
    },

    Skeleton: {
      gradientFromColor: '#f8fafc',
      gradientToColor: '#eef2f7',
      blockRadius: 10,
      paragraphLiHeight: 14,
    },

    Slider: {
      railBg: '#e5e7eb',
      railHoverBg: '#d1d5db',
      trackBg: defaultBrand.primary,
      trackHoverBg: defaultBrand.primaryHover,
      handleColor: defaultBrand.primary,
      handleActiveColor: defaultBrand.primaryHover,
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
      navArrowColor: '#cbd5e1',
      customIconSize: 30,
      customIconTop: 0,
      titleLineHeight: 1.4,
    },

    Switch: {
      colorPrimary: defaultBrand.primary,
      colorPrimaryHover: defaultBrand.primaryHover,
      handleBg: '#ffffff',
      trackHeight: 24,
      trackMinWidth: 46,
      trackPadding: 2,
      innerMinMargin: 20,
      innerMaxMargin: 24,
    },

    Table: {
      headerBg: '#f8fafc',
      headerColor: '#334155',
      headerSplitColor: '#e5eaf1',
      borderColor: '#e8edf4',
      rowHoverBg: '#f8fbff',
      cellPaddingBlock: 14,
      cellPaddingInline: 14,
      footerBg: '#ffffff',
      headerBorderRadius: 12,
    },

    Tabs: {
      cardBg: '#f8fafc',
      itemColor: text.tertiary,
      itemHoverColor: text.main,
      itemSelectedColor: defaultBrand.primaryActive,
      inkBarColor: defaultBrand.primary,
      horizontalItemGutter: 24,
      horizontalItemPadding: '12px 4px',
      cardHeight: 42,
      titleFontSize: 14,
      titleFontSizeLG: 15,
    },

    Tag: {
      defaultBg: defaultBrand.primarySoft,
      defaultColor: defaultBrand.primaryActive,
      borderRadiusSM: radius.pill,
      fontSizeSM: 12,
      lineHeightSM: 1.2,
    },

    Timeline: {
      dotBg: '#ffffff',
      tailColor: '#e2e8f0',
      itemPaddingBottom: 18,
    },

    Tooltip: {
      borderRadius: 10,
      colorBgSpotlight: '#0f172a',
      colorTextLightSolid: '#ffffff',
    },

    Tour: {
      borderRadiusLG: 16,
      closeBtnSize: 24,
      primaryNextBtnHoverBg: defaultBrand.primaryHover,
    },

    Tree: {
      nodeHoverBg: surface.muted,
      nodeSelectedBg: defaultBrand.primarySoft,
      directoryNodeSelectedBg: defaultBrand.primarySoft,
      directoryNodeSelectedColor: defaultBrand.primaryActive,
      titleHeight: 32,
      indentSize: 20,
    },

    TreeSelect: {
      borderRadius: 10,
    },

    Upload: {
      colorText: text.secondary,
      colorTextDescription: text.tertiary,
      actionsColor: text.tertiary,
    },

    Notification: {
      zIndexPopup: 2050,
    },

    Message: {
      contentBg: '#ffffff',
      zIndexPopup: 2010,
    },

    QRCode: {
      colorText: text.main,
    },

    App: {
      colorPrimary: defaultBrand.primary,
    },
  },
};

const darkThemeOverrides = {
  token: {
    colorBgBase: '#0b1220',
    colorBgLayout: '#060d19',
    colorBgContainer: '#111827',
    colorBgElevated: '#1f2937',
    colorText: '#e5e7eb',
    colorTextSecondary: '#cbd5e1',
    colorTextTertiary: '#94a3b8',
    colorTextQuaternary: '#64748b',
    colorBorder: '#334155',
    colorBorderSecondary: '#1f2937',
    boxShadow: '0 14px 32px rgba(2, 6, 23, 0.55)',
    boxShadowSecondary: '0 10px 22px rgba(2, 6, 23, 0.45)',
  },

  components: {
    Layout: {
      bodyBg: '#060d19',
      headerBg: '#111827',
      siderBg: '#020617',
      triggerBg: '#0f172a',
      triggerColor: '#e2e8f0',
      footerBg: '#060d19',
      lightSiderBg: '#0f172a',
    },

    Menu: {
      itemColor: '#cbd5e1',
      itemHoverColor: '#ffffff',
      itemHoverBg: 'rgba(148, 163, 184, 0.16)',
      itemSelectedColor: '#ffffff',
      itemSelectedBg: defaultBrand.selectedStrongBg,
    },

    Card: {
      borderColor: '#334155',
      extraColor: '#94a3b8',
    },

    Table: {
      headerBg: '#1e293b',
      headerColor: '#e2e8f0',
      borderColor: '#334155',
      rowHoverBg: '#0f172a',
      footerBg: '#111827',
    },
  },
};

const mergeDarkTheme = () => {
  return {
    ...themeMain,

    algorithm: [theme.darkAlgorithm],

    token: {
      ...themeMain.token,
      ...darkThemeOverrides.token,
    },

    components: {
      ...themeMain.components,
      ...Object.fromEntries(
        Object.entries(darkThemeOverrides.components).map(([name, values]) => [
          name,
          {
            ...(themeMain.components?.[name] || {}),
            ...values,
          },
        ])
      ),
    },
  };
};

const applyBrandSettings = (config, settings = null, mode = 'light') => {
  const brand = createDynamicBrand(settings || {}, mode);

  return {
    ...config,

    token: {
      ...config.token,

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
    },

    components: {
      ...config.components,

      Layout: {
        ...(config.components?.Layout || {}),
        headerBg: brand.header,
        siderBg: brand.sidebar,
        triggerBg: brand.sidebar,
      },

      Menu: {
        ...(config.components?.Menu || {}),

        darkItemBg: brand.sidebar,
        darkSubMenuItemBg: brand.sidebar,
        darkPopupBg: brand.sidebar,

        darkItemSelectedBg: brand.selectedStrongBg,
        darkItemSelectedColor: '#ffffff',

        itemSelectedColor: brand.primaryActive,
        itemSelectedBg: brand.primarySoft,
        itemActiveBg: brand.primarySoft,
      },

      Anchor: {
        ...(config.components?.Anchor || {}),
        colorPrimary: brand.primary,
      },

      Button: {
        ...(config.components?.Button || {}),

        colorPrimary: brand.primary,
        colorPrimaryHover: brand.primaryHover,
        colorPrimaryActive: brand.primaryActive,

        defaultHoverBorderColor: brand.primary,
        defaultHoverColor: brand.primaryActive,
        defaultActiveBg: brand.primarySoft,
        defaultActiveBorderColor: brand.primaryHover,
        defaultActiveColor: brand.primaryActive,

        primaryColor: '#ffffff',
      },

      Checkbox: {
        ...(config.components?.Checkbox || {}),
        colorPrimary: brand.primary,
        colorPrimaryHover: brand.primaryHover,
      },

      DatePicker: {
        ...(config.components?.DatePicker || {}),
        activeBorderColor: brand.primary,
        hoverBorderColor: brand.primary,
        activeShadow: brand.focusShadow,
        cellActiveWithRangeBg: brand.primarySoft,
        cellRangeBorderColor: brand.primaryBorder,
        cellRangeBg: brand.primarySoft,
        multipleItemBg: brand.primarySoft,
        multipleItemBorderColor: brand.primaryBorder,
      },

      Dropdown: {
        ...(config.components?.Dropdown || {}),
        controlItemBgActive: brand.primarySoft,
      },

      Input: {
        ...(config.components?.Input || {}),
        activeBorderColor: brand.primary,
        hoverBorderColor: brand.primary,
        activeShadow: brand.focusShadow,
      },

      InputNumber: {
        ...(config.components?.InputNumber || {}),
        activeBorderColor: brand.primary,
        hoverBorderColor: brand.primary,
        activeShadow: brand.focusShadow,
      },

      Mentions: {
        ...(config.components?.Mentions || {}),
        activeBorderColor: brand.primary,
        hoverBorderColor: brand.primary,
      },

      Pagination: {
        ...(config.components?.Pagination || {}),
        itemActiveBg: brand.primarySoft,
        colorPrimary: brand.primary,
        colorPrimaryHover: brand.primaryHover,
      },

      Progress: {
        ...(config.components?.Progress || {}),
        defaultColor: brand.primary,
      },

      Radio: {
        ...(config.components?.Radio || {}),
        colorPrimary: brand.primary,
        colorPrimaryHover: brand.primaryHover,
        buttonCheckedBg: brand.primarySoft,
        buttonCheckedColor: brand.primaryActive,
        buttonSolidCheckedBg: brand.primary,
        buttonSolidCheckedHoverBg: brand.primaryHover,
      },

      Segmented: {
        ...(config.components?.Segmented || {}),
        itemSelectedColor: brand.primaryActive,
      },

      Select: {
        ...(config.components?.Select || {}),
        activeBorderColor: brand.primary,
        hoverBorderColor: brand.primary,
        activeOutlineColor: hexToRgba(brand.primary, 0.1),
        optionSelectedBg: brand.primarySoft,
        multipleItemBg: brand.primarySoft,
        multipleItemBorderColor: brand.primaryBorder,
      },

      Slider: {
        ...(config.components?.Slider || {}),
        trackBg: brand.primary,
        trackHoverBg: brand.primaryHover,
        handleColor: brand.primary,
        handleActiveColor: brand.primaryHover,
      },

      Switch: {
        ...(config.components?.Switch || {}),
        colorPrimary: brand.primary,
        colorPrimaryHover: brand.primaryHover,
      },

      Tabs: {
        ...(config.components?.Tabs || {}),
        itemSelectedColor: brand.primaryActive,
        inkBarColor: brand.primary,
      },

      Tag: {
        ...(config.components?.Tag || {}),
        defaultBg: brand.primarySoft,
        defaultColor: brand.primaryActive,
      },

      Tour: {
        ...(config.components?.Tour || {}),
        primaryNextBtnHoverBg: brand.primaryHover,
      },

      Tree: {
        ...(config.components?.Tree || {}),
        nodeSelectedBg: brand.primarySoft,
        directoryNodeSelectedBg: brand.primarySoft,
        directoryNodeSelectedColor: brand.primaryActive,
      },

      App: {
        ...(config.components?.App || {}),
        colorPrimary: brand.primary,
      },
    },
  };
};

export const createThemeConfig = (mode = 'light', settings = null) => {
  const baseConfig = mode === 'dark' ? mergeDarkTheme() : themeMain;

  return applyBrandSettings(baseConfig, settings, mode);
};

export default createThemeConfig;