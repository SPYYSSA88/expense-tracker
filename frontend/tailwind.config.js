/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                // Neo-Brutalism Color Palette
                brutal: {
                    yellow: '#FFEB00',
                    black: '#000000',
                    white: '#FFFEF0',
                    pink: '#FF3366',
                    green: '#00FF88',
                    blue: '#00BFFF',
                    orange: '#FF6B35',
                    purple: '#9B5DE5',
                    red: '#EF4444'
                },
                // Semantic colors
                primary: {
                    DEFAULT: '#FFEB00',
                    dark: '#E6D400'
                },
                secondary: '#000000',
                background: '#FFFEF0',
                surface: '#FFFFFF'
            },
            fontFamily: {
                display: ['Space Grotesk', 'Kanit', 'sans-serif'],
                body: ['Kanit', 'sans-serif']
            },
            borderWidth: {
                '3': '3px',
                '4': '4px'
            },
            boxShadow: {
                'brutal': '4px 4px 0 0 #000000',
                'brutal-sm': '2px 2px 0 0 #000000',
                'brutal-lg': '6px 6px 0 0 #000000',
                'brutal-xl': '8px 8px 0 0 #000000',
                'brutal-pink': '4px 4px 0 0 #FF3366',
                'brutal-green': '4px 4px 0 0 #00FF88',
                'brutal-blue': '4px 4px 0 0 #00BFFF',
                'brutal-yellow': '4px 4px 0 0 #FFEB00',
                'brutal-hover': '6px 6px 0 0 #000000',
                'brutal-active': '2px 2px 0 0 #000000'
            },
            animation: {
                'bounce-brutal': 'bounceBrutal 0.3s ease-out',
                'shake': 'shake 0.5s ease-in-out',
                'pop': 'pop 0.2s ease-out'
            },
            keyframes: {
                bounceBrutal: {
                    '0%': { transform: 'translate(4px, 4px)' },
                    '50%': { transform: 'translate(2px, 2px)' },
                    '100%': { transform: 'translate(0, 0)' }
                },
                shake: {
                    '0%, 100%': { transform: 'translateX(0)' },
                    '25%': { transform: 'translateX(-5px)' },
                    '75%': { transform: 'translateX(5px)' }
                },
                pop: {
                    '0%': { transform: 'scale(0.95)' },
                    '50%': { transform: 'scale(1.05)' },
                    '100%': { transform: 'scale(1)' }
                }
            }
        },
    },
    plugins: [],
}
