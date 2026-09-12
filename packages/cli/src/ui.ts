const ESC = "\u001B[";
const reset = `${ESC}0m`;

const colors = {
  blue: `${ESC}38;5;111m`,
  bold: `${ESC}1m`,
  cyan: `${ESC}36m`,
  dim: `${ESC}2m`,
  green: `${ESC}32m`,
  red: `${ESC}31m`,
  white: `${ESC}37m`,
  yellow: `${ESC}33m`,
} as const;

const paint = (color: keyof typeof colors, value: string): string =>
  `${colors[color]}${value}${reset}`;

export const ui = {
  bold: (value: string): string => paint("bold", value),
  brand: (value = "nooh"): string => paint("bold", paint("cyan", value)),

  changed: (value: string): string => `${paint("yellow", "↻")} ${value}`,
  cyan: (value: string): string => paint("cyan", value),

  dim: (value: string): string => paint("dim", value),

  duration: (milliseconds: number): string => {
    if (milliseconds < 1) {
      return "<1ms";
    }

    if (milliseconds < 1000) {
      return `${Math.round(milliseconds)}ms`;
    }

    return `${(milliseconds / 1000).toFixed(2)}s`;
  },

  error: (message: string): void => {
    console.error(`${paint("red", "✗")} ${message}`);
  },

  info: (value: string): string => `${paint("blue", "→")} ${value}`,

  line: (value = ""): void => {
    console.log(value);
  },

  success: (value: string): string => `${paint("green", "✓")} ${value}`,

  timestamp: (): string =>
    new Date().toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }),

  title: (value: string): void => {
    console.log(`${ui.brand()}  ${ui.bold(value)}`);
    console.log();
  },

  warning: (value: string): string => `${paint("yellow", "!")} ${value}`,
};

export const printDivider = (): void => {
  console.log(ui.dim("  ─────────────────────────────"));
};
