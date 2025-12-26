/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                primary: "#46ec13",
                "primary-dark": "#3bc910",
                "background-dark": "#0a0a0a",
                "surface-dark": "#131811",
                "surface-accent": "#1f291c",
                "accent-red": "#ff3b30",
                "text-secondary": "#9cabba",
                neon: {
                    blue: '#00f3ff',
                    green: '#00ff9d',
                    pink: '#ff00d4',
                    purple: '#bc13fe'
                }
            },
            fontFamily: {
                display: ['Space Grotesk', 'sans-serif'],
                body: ['Inter', 'sans-serif'],
            },
            animation: {
                'gradient-x': 'gradient-x 3s ease infinite',
                'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
            },
            keyframes: {
                'gradient-x': {
                    '0%, 100%': { 'background-position': 'left center' },
                    '50%': { 'background-position': 'right center' },
                },
                'pulse-glow': {
                    '0%, 100%': { 'box-shadow': '0 0 20px rgba(70, 236, 19, 0.3)' },
                    '50%': { 'box-shadow': '0 0 30px rgba(70, 236, 19, 0.5)' },
                },
            },
        },
    },
    plugins: [],
}
