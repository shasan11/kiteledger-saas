import { theme } from "antd";

const brand = {
  primary: "#16a34a",
  primaryHover: "#15803d",
  primaryActive: "#166534",
  primarySoft: "#f0fdf4",
  primarySoftHover: "#dcfce7",
  primaryBorder: "#86efac",
  primaryBorderHover: "#4ade80",

  success: "#16a34a",
  warning: "#f59e0b",
  error: "#ef4444",
  info: "#0ea5e9",
};

const text = {
  main: "#0f172a",
  secondary: "#475569",
  tertiary: "#64748b",
  quaternary: "#94a3b8",
};

const surface = {
  body: "#f6f8fb",
  layout: "#f3f6fb",
  card: "#ffffff",
  elevated: "#ffffff",
  muted: "#f8fafc",
  muted2: "#f1f5f9",
  muted3: "#e2e8f0",
};

const border = {
  base: "#e2e8f0",
  soft: "#edf2f7",
  strong: "#dbe4ee",
};

const radius = {
  xs: 3,
  sm: 3,
  md: 3,
  lg: 3,
  xl:3,
  pill: 999,
};

const shadow = {
  soft: "0 4px 14px rgba(15, 23, 42, 0.06)",
  card: "0 10px 30px rgba(15, 23, 42, 0.08)",
  primary: "0 10px 20px rgba(22, 163, 74, 0.18)",
};

export const themeMain = {
  algorithm: [theme.defaultAlgorithm],

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
    motionDurationFast: "0.15s",
    motionDurationMid: "0.2s",
    motionDurationSlow: "0.28s",
  },

  components: {
    Layout: {
      bodyBg: surface.layout,
      headerBg: "rgba(255,255,255,0.88)",
      siderBg: "#0b1220",
      triggerBg: "#111827",
      triggerColor: "#e2e8f0",
      footerBg: surface.layout,
      lightSiderBg: "#ffffff",
    },

    Menu: {
      itemHeight: 42,
      itemBorderRadius: 10,
      itemMarginBlock: 6,
      itemMarginInline: 10,

      darkItemBg: "#0b1220",
      darkSubMenuItemBg: "#0f172a",
      darkPopupBg: "#0f172a",
      darkItemColor: "rgba(226,232,240,0.76)",
      darkItemHoverColor: "#ffffff",
      darkItemSelectedColor: "#ffffff",
      darkItemHoverBg: "rgba(255,255,255,0.06)",
      darkItemSelectedBg: "rgba(22,163,74,0.16)",

      itemColor: text.secondary,
      itemHoverColor: text.main,
      itemSelectedColor: brand.primaryActive,
      itemSelectedBg: brand.primarySoft,
      itemHoverBg: surface.muted,
      itemActiveBg: brand.primarySoft,
    },

    Button: {
      borderRadius: 5,
      fontWeight: 600,

      defaultBg: "#ffffff",
      defaultBorderColor: border.strong,
      defaultColor: text.main,
      defaultHoverBg: surface.muted,
      defaultHoverBorderColor: brand.primary,
      defaultHoverColor: brand.primaryActive,
      defaultActiveBg: brand.primarySoft,
      defaultActiveBorderColor: brand.primaryHover,
      defaultActiveColor: brand.primaryActive,

       contentFontSize: 14,
      contentFontSizeLG: 15,
      contentFontSizeSM: 13,
      paddingInline: 16,
      paddingInlineLG: 18,
      paddingInlineSM: 12,
    },

    Card: {
      borderRadius:0,
      borderColor: "#e5eaf1",
      headerBg: "transparent",
      bodyPadding: 20,
      bodyPaddingSM: 16,
      headerHeight: 56,
      headerFontSize: 15,
      headerFontSizeSM: 14,
      extraColor: text.secondary,
    },

    Collapse: {
      headerBg: surface.muted,
      contentBg: "#ffffff",
      borderRadiusLG: 14,
      headerPadding: "14px 16px",
      contentPadding: "16px 18px",
    },

    Alert: {
      borderRadiusLG: 14,
      withDescriptionPadding: "14px 16px",
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
      separatorColor: "#cbd5e1",
    },

    Calendar: {
      fullBg: "#ffffff",
      fullPanelBg: "#ffffff",
      itemActiveBg: brand.primarySoft,
      miniContentHeight: 260,
    },

    Checkbox: {
      colorPrimary: brand.primary,
      colorPrimaryHover: brand.primaryHover,
      colorBorder: "#cbd5e1",
      borderRadiusSM: 5,
    },

    DatePicker: {
      borderRadius: 10,
      activeBg: "#ffffff",
      hoverBg: "#ffffff",
      activeBorderColor: brand.primary,
      hoverBorderColor: brand.primary,
      activeShadow: "0 0 0 4px rgba(22,163,74,0.10)",
      cellHoverBg: surface.muted,
      cellActiveWithRangeBg: brand.primarySoft,
      cellRangeBorderColor: brand.primaryBorder,
      cellRangeBg: "#f7fee7",
      multipleItemBg: brand.primarySoft,
      multipleItemBorderColor: brand.primaryBorder,
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
      colorBgElevated: "#ffffff",
      footerPaddingBlock: 14,
      footerPaddingInline: 18,
    },

    Dropdown: {
      paddingBlock: 8,
      controlItemBgHover: surface.muted,
      controlItemBgActive: brand.primarySoft,
    },

    Empty: {
      colorText: text.secondary,
      colorTextDescription: text.tertiary,
      fontSize: 14,
    },

    Form: {
      labelColor: "#334155",
      labelFontSize: 14,
      labelHeight: 30,
      itemMarginBottom: 18,
      verticalLabelPadding: "0 0 6px",
    },

    Input: {
      borderRadius: 10,
      activeBg: "#ffffff",
      hoverBg: "#ffffff",
      addonBg: surface.muted,
      activeBorderColor: brand.primary,
      hoverBorderColor: brand.primary,
      activeShadow: "0 0 0 4px rgba(22,163,74,0.10)",
      paddingBlock: 9,
      paddingInline: 12,
    },

    InputNumber: {
      borderRadius: 10,
      activeBg: "#ffffff",
      handleBg: "#ffffff",
      activeBorderColor: brand.primary,
      hoverBorderColor: brand.primary,
      activeShadow: "0 0 0 4px rgba(22,163,74,0.10)",
    },

    List: {
      itemPadding: "14px 0",
      headerBg: "transparent",
      footerBg: "transparent",
    },

    Mentions: {
      activeBorderColor: brand.primary,
      hoverBorderColor: brand.primary,
    },

    Modal: {
      borderRadiusLG: 18,
      contentBg: "#ffffff",
      headerBg: "#ffffff",
      footerBg: "#ffffff",
      titleFontSize: 18,
      titleLineHeight: 1.4,
    },

    Pagination: {
      itemBg: "#ffffff",
      itemActiveBg: brand.primarySoft,
      itemLinkBg: "#ffffff",
      itemSize: 34,
      borderRadius: 10,
      colorPrimary: brand.primary,
      colorPrimaryHover: brand.primaryHover,
      colorText: text.secondary,
      colorTextDisabled: "#cbd5e1",
    },

    Popconfirm: {
      zIndexPopup: 1060,
    },

    Popover: {
      titleMinWidth: 180,
      borderRadiusLG: 14,
    },

    Progress: {
      defaultColor: brand.primary,
      remainingColor: "#e5e7eb",
      lineBorderRadius: radius.pill,
      circleTextColor: text.main,
    },

    Radio: {
      colorPrimary: brand.primary,
      colorPrimaryHover: brand.primaryHover,
      buttonBg: "#ffffff",
      buttonCheckedBg: brand.primarySoft,
      buttonCheckedBgDisabled: "#f1f5f9",
      buttonColor: text.secondary,
      buttonCheckedColor: brand.primaryActive,
      buttonSolidCheckedBg: brand.primary,
      buttonSolidCheckedColor: "#ffffff",
      buttonSolidCheckedHoverBg: brand.primaryHover,
      dotSize: 8,
      radioSize: 16,
    },

    Rate: {
      starColor: "#f59e0b",
      starHoverScale: "scale(1.08)",
    },

    Result: {
      titleFontSize: 22,
      subtitleFontSize: 14,
      iconFontSize: 60,
      extraMargin: "20px 0 0 0",
    },

    Segmented: {
      trackBg: "#eef2f7",
      itemColor: text.secondary,
      itemHoverColor: text.main,
      itemHoverBg: "#f8fafc",
      itemSelectedBg: "#ffffff",
      itemSelectedColor: brand.primaryActive,
      itemBorderRadius: 10,
    },

    Select: {
      borderRadius: 10,
      selectorBg: "#ffffff",
      clearBg: "#ffffff",
      activeBorderColor: brand.primary,
      hoverBorderColor: brand.primary,
      activeOutlineColor: "rgba(22,163,74,0.10)",
      optionSelectedBg: brand.primarySoft,
      optionActiveBg: surface.muted,
      multipleItemBg: brand.primarySoft,
      multipleItemBorderColor: brand.primaryBorder,
      multipleItemBorderColorDisabled: border.base,
      multipleItemColorDisabled: text.tertiary,
      showArrowPaddingInlineEnd: 30,
    },

    Skeleton: {
      gradientFromColor: "#f8fafc",
      gradientToColor: "#eef2f7",
      blockRadius: 10,
      paragraphLiHeight: 14,
    },

    Slider: {
      railBg: "#e5e7eb",
      railHoverBg: "#d1d5db",
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
      navArrowColor: "#cbd5e1",
      customIconSize: 30,
      customIconTop: 0,
      titleLineHeight: 1.4,
    },

    Switch: {
      colorPrimary: brand.primary,
      colorPrimaryHover: brand.primaryHover,
      handleBg: "#ffffff",
      trackHeight: 24,
      trackMinWidth: 46,
      trackPadding: 2,
      innerMinMargin: 20,
      innerMaxMargin: 24,
    },

    Table: {
      headerBg: "#f8fafc",
      headerColor: "#334155",
      headerSplitColor: "#e5eaf1",
      borderColor: "#e8edf4",
      rowHoverBg: "#f8fbff",
      cellPaddingBlock: 14,
      cellPaddingInline: 14,
      footerBg: "#ffffff",
      headerBorderRadius: 12,
    },

    Tabs: {
      cardBg: "#f8fafc",
      itemColor: text.tertiary,
      itemHoverColor: text.main,
      itemSelectedColor: brand.primaryActive,
      inkBarColor: brand.primary,
      horizontalItemGutter: 24,
      horizontalItemPadding: "12px 4px",
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
      dotBg: "#ffffff",
      tailColor: "#e2e8f0",
      itemPaddingBottom: 18,
    },

    Tooltip: {
      borderRadius: 10,
      colorBgSpotlight: "#0f172a",
      colorTextLightSolid: "#ffffff",
    },

    Tour: {
      borderRadiusLG: 16,
      closeBtnSize: 24,
      primaryNextBtnHoverBg: brand.primaryHover,
    },

    Tree: {
      nodeHoverBg: surface.muted,
      nodeSelectedBg: brand.primarySoft,
      directoryNodeSelectedBg: brand.primarySoft,
      directoryNodeSelectedColor: brand.primaryActive,
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
      contentBg: "#ffffff",
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
const darkThemeOverrides = {
  token: {
    colorBgBase: "#0b1220",
    colorBgLayout: "#060d19",
    colorBgContainer: "#111827",
    colorBgElevated: "#1f2937",
    colorText: "#e5e7eb",
    colorTextSecondary: "#cbd5e1",
    colorTextTertiary: "#94a3b8",
    colorTextQuaternary: "#64748b",
    colorBorder: "#334155",
    colorBorderSecondary: "#1f2937",
    boxShadow: "0 14px 32px rgba(2, 6, 23, 0.55)",
    boxShadowSecondary: "0 10px 22px rgba(2, 6, 23, 0.45)",
  },
  components: {
    Layout: {
      bodyBg: "#060d19",
      headerBg: "#111827",
      siderBg: "#020617",
      triggerBg: "#0f172a",
      triggerColor: "#e2e8f0",
      footerBg: "#060d19",
      lightSiderBg: "#0f172a",
    },
    Menu: {
      itemColor: "#cbd5e1",
      itemHoverColor: "#ffffff",
      itemHoverBg: "rgba(148, 163, 184, 0.16)",
      itemSelectedColor: "#ffffff",
      itemSelectedBg: "rgba(22, 163, 74, 0.25)",
    },
    Card: {
      borderColor: "#334155",
      extraColor: "#94a3b8",
    },
    Table: {
      headerBg: "#1e293b",
      headerColor: "#e2e8f0",
      borderColor: "#334155",
      rowHoverBg: "#0f172a",
      footerBg: "#111827",
    },
  },
};

export const createThemeConfig = (mode = "light") => {
  if (mode !== "dark") return themeMain;

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