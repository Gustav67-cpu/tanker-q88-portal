/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        navy: {
          50: "#EAF1FB",
          100: "#C7D8EF",
          200: "#92B0DD",
          300: "#5C88CB",
          400: "#2C63B8",
          500: "#0B3D91", // primary maritime blue
          600: "#093274",
          700: "#072657",
          800: "#04193A",
          900: "#020D1D",
        },
        sea: {
          500: "#1E88E5",
        },
        success: "#16A34A",
        warning: "#D97706",
        danger: "#DC2626",
        ink: "#0F172A",
        muted: "#64748B",
        line: "#E2E8F0",
        bg: "#F8FAFC",
      },
      fontFamily: {
        sans: ["System"],
      },
    },
  },
  plugins: [],
};
