export const lightColors = {
  background: "#F7F8F7",
  surface: "#FFFFFF",
  surfaceMuted: "#F1F3F2",
  ink: "#17211B",
  muted: "#6E7772",
  line: "#E8ECE9",
  green: "#079447",
  greenDark: "#056B35",
  greenSoft: "#E7F7ED",
  orange: "#F36D32",
  orangeSoft: "#FFF0E9",
  red: "#C73B3B",
  redSoft: "#FCEBEC",
  yellow: "#F6C453",
  yellowSoft: "#FFF6D8",
  glass: "rgba(255,255,255,0.96)",
  glassStrong: "#FFFFFF",
  glassDark: "rgba(4,68,43,0.72)",
  glassRim: "#E8ECE9",
  glassShade: "rgba(7,148,71,0.02)",
  input: "#F0F2F1",
  inputTranslucent: "rgba(255,255,255,0.50)",
  inputBorder: "rgba(255,255,255,0.82)",
  placeholder: "#74827B",
  floatingSurface: "rgba(255,255,255,0.94)",
  metricGreen: "rgba(226,242,233,0.52)",
  metricOrange: "rgba(255,240,233,0.52)",
  aqua: "#86D8D0",
  white: "#FFFFFF"
} as const;

export const darkColors: ThemeColors = {
  background: "#0D1511",
  surface: "#152019",
  surfaceMuted: "#1C2921",
  ink: "#F2F7F4",
  muted: "#A9B7AE",
  line: "#29372F",
  green: "#35C76F",
  greenDark: "#06492B",
  greenSoft: "#183A26",
  orange: "#FF8B5A",
  orangeSoft: "#3A261E",
  red: "#FF7C7C",
  redSoft: "#3A2023",
  yellow: "#F8CF6A",
  yellowSoft: "#382F1B",
  glass: "rgba(21,32,25,0.96)",
  glassStrong: "#18251D",
  glassDark: "rgba(4,55,33,0.88)",
  glassRim: "#304238",
  glassShade: "rgba(53,199,111,0.04)",
  input: "#1C2921",
  inputTranslucent: "rgba(28,41,33,0.90)",
  inputBorder: "rgba(255,255,255,0.10)",
  placeholder: "#87978D",
  floatingSurface: "rgba(24,37,29,0.96)",
  metricGreen: "rgba(35,92,55,0.46)",
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
