import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        noir: {
          black: '#0a0a0a',
          dark: '#111111',
          charcoal: '#1a1a1a',
          gray: '#2a2a2a',
          smoke: '#3a3a3a',
          mist: '#888888',
          silver: '#c0c0c0',
          white: '#f5f0e8',
          cream: '#e8dcc8',
          gold: '#c9a84c',
          amber: '#d4820a',
          red: '#8b1a1a',
          blood: '#6b1010',
          sepia: '#5c4a2a',
        },
      },
      fontFamily: {
        noir: ['Playfair Display', 'Georgia', 'serif'],
        typewriter: ['Courier Prime', 'Courier New', 'monospace'],
        serif: ['Lora', 'Georgia', 'serif'],
      },
      backgroundImage: {
        'gradient-noir': 'linear-gradient(135deg, #1a1a1a 0%, #0a0a0a 100%)',
      },
      animation: {
        flicker: 'flicker 4s infinite',
        'fade-in-up': 'fadeInUp 0.6s ease-out forwards',
        'slide-in': 'slideIn 0.4s ease-out forwards',
      },
    },
  },
  plugins: [],
};
export default config;
