/** @type {import('tailwindcss').Config} */
export default {
    darkMode: 'class',
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            fontFamily: {
                sans: ['"DM Sans"', 'system-ui', '-apple-system', 'sans-serif'],
            },
            colors: {
                civic: {
                    50:  '#eef5f2',
                    100: '#d5e8e0',
                    200: '#a8d0bf',
                    300: '#73b399',
                    400: '#3e8f72',
                    500: '#1B4D3E',  // Primary
                    600: '#164032',
                    700: '#113226',
                    800: '#0c251b',
                    900: '#071810',
                },
                surface: '#F7F6F3',
                border: '#E5E2DB',
            },
            borderRadius: {
                DEFAULT: '8px',
            },
        },
    },
    plugins: [],
}
