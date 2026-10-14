export const lightColors = {
  background: "#FFF8EF",
  surface: "#FFFDF9",
  surfaceMuted: "#F7EFE5",
  ink: "#12162F",
  muted: "#777381",
  line: "#EEE4D9",
  green: "#FF5A2A",
  greenDark: "#171A38",
  greenSoft: "#FFF0E8",
  orange: "#FF5A2A",
  orangeSoft: "#FFF0E8",
  red: "#C73B3B",
  redSoft: "#FCEBEC",
  yellow: "#F5A623",
  yellowSoft: "#FFF6D8",
  glass: "rgba(255,255,255,0.96)",
  glassStrong: "#FFFFFF",
  glassDark: "rgba(18,22,47,0.82)",
  glassRim: "#EEE4D9",
  glassShade: "rgba(255,90,42,0.02)",
  input: "#F7EFE5",
  inputTranslucent: "rgba(255,255,255,0.50)",
  inputBorder: "rgba(255,255,255,0.82)",
  placeholder: "#8D8790",
  floatingSurface: "rgba(255,255,255,0.94)",
  metricGreen: "rgba(255,240,232,0.72)",
  metricOrange: "rgba(255,240,233,0.52)",
  aqua: "#86D8D0",
  white: "#FFFFFF"
} as const;

export const darkColors: ThemeColors = {
  background: "#101329",
  surface: "#1A1E3A",
  surfaceMuted: "#222644",
  ink: "#F2F7F4",
  muted: "#AAA8B7",
  line: "#303451",
  green: "#FF7045",
  greenDark: "#0E1026",
  greenSoft: "#3B2728",
  orange: "#FF8B5A",
  orangeSoft: "#3A261E",
  red: "#FF7C7C",
  redSoft: "#3A2023",
  yellow: "#F8CF6A",
  yellowSoft: "#382F1B",
  glass: "rgba(26,30,58,0.96)",
  glassStrong: "#1C203E",
  glassDark: "rgba(10,12,31,0.90)",
  glassRim: "#353956",
  glassShade: "rgba(255,112,69,0.04)",
  input: "#222644",
  inputTranslucent: "rgba(34,38,68,0.90)",
  inputBorder: "rgba(255,255,255,0.10)",
  placeholder: "#8F8DA0",
  floatingSurface: "rgba(28,32,62,0.96)",
  metricGreen: "rgba(99,53,51,0.46)",
  metricOrange: "rgba(91,53,35,0.46)",
  aqua: "#72D4CB",
  white: "#FFFFFF"
};

export type ThemeColors = { [Key in keyof typeof lightColors]: string };

let activeColors: ThemeColors = lightColors;

export const colors = new Proxy({} as ThemeColors, {
  get: (_target, property: keyof ThemeColors) => activeColors[property]
});

export function setActiveColors(next: ThemeColors) {
  activeColors = next;
}
