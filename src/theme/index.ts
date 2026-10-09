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
  hero: { fontSize: 38, lineHeight: 43, fontWeight: "900" as const, letterSpacing: -1.2 },
  title: { fontSize: 27, lineHeight: 33, fontWeight: "800" as const, letterSpacing: -0.55 },
  heading: { fontSize: 19, lineHeight: 25, fontWeight: "800" as const, letterSpacing: -0.2 },
  body: { fontSize: 16, lineHeight: 23, fontWeight: "500" as const },
  caption: { fontSize: 13, lineHeight: 18, fontWeight: "600" as const }
} as const;

export function money(value: number) {
  return `${new Intl.NumberFormat("uz-UZ").format(value)} so‘m`;
}
