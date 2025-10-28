// [71-UI.STANDARD.G] SympoHub Design Token Registry
export const sympoTheme = {
  colors: {
    primary: {
      50: "#EEF5FF",
      100: "#D8E8FF",
      200: "#B3D2FF",
      300: "#85B5FF",
      400: "#5898FF",
      500: "#337EFF", // SympoBlue Main
      600: "#2668E0",
      700: "#1C53B8",
      800: "#183F8C",
      900: "#122D66",
    },
    gray: {
      50: "#F9FAFB",
      100: "#F3F4F6",
      200: "#E5E7EB",
      300: "#D1D5DB",
      400: "#9CA3AF",
      500: "#6B7280",
      600: "#4B5563",
      700: "#374151",
      800: "#1F2937",
      900: "#111827",
    },
  },
  font: {
    family: "'Pretendard', 'Noto Sans KR', sans-serif",
    size: {
      base: "14px",
      sm: "13px",
      lg: "15px",
      title: "18px",
    },
    weight: {
      regular: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
    },
  },
  radius: {
    sm: "6px",
    md: "10px",
    lg: "16px",
    xl: "20px",
  },
  shadow: {
    sm: "0 1px 3px rgba(0, 0, 0, 0.05)",
    md: "0 4px 10px rgba(0, 0, 0, 0.1)",
    lg: "0 6px 20px rgba(0, 0, 0, 0.15)",
  },
  transition: {
    default: "all 0.15s ease-in-out",
  },
} as const;

export type SympoTheme = typeof sympoTheme;
