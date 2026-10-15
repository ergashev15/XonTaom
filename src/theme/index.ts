export { colors, darkColors, lightColors, type ThemeColors } from "@/theme/colors";
export { AppThemeProvider, useAppTheme, type ThemeMode } from "@/theme/theme-provider";

export const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48 } as const;
export const breakpoints = { tablet: 700, desktop: 1100, wide: 1400 } as const;
export const layout = { phoneMax: 680, contentMax: 1180, readingMax: 760, desktopRail: 232 } as const;
export const radius = { sm: 8, md: 12, lg: 18, xl: 22, full: 999 } as const;
export const shadow = {
  subtle: "0 1px 2px rgba(12, 43, 28, 0.05)",
  card: "0 4px 16px rgba(23, 33, 27, 0.08)",
  raised: "0 10px 30px rgba(23, 33, 27, 0.13)",
  glass: "0 3px 14px rgba(23, 33, 27, 0.07)"
} as const;

export const motion = {
  press: 120,
  state: 180,
  enter: 250
} as const;

export const type = {
  hero: { fontSize: 34, lineHeight: 40, fontWeight: "800" as const, letterSpacing: -0.9 },
  title: { fontSize: 23, lineHeight: 29, fontWeight: "800" as const, letterSpacing: -0.4 },
  heading: { fontSize: 18, lineHeight: 24, fontWeight: "800" as const, letterSpacing: -0.15 },
  body: { fontSize: 15, lineHeight: 21, fontWeight: "500" as const },
  caption: { fontSize: 12, lineHeight: 16, fontWeight: "600" as const }
} as const;

export function money(value: number) {
  return `${new Intl.NumberFormat("uz-UZ").format(value)} so‘m`;
}
