/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                'grey-medium': 'rgb(var(--color-grey-medium) / <alpha-value>)',
                'grey-light': 'rgb(var(--color-grey-light) / <alpha-value>)',
                border: 'rgb(var(--color-border) / <alpha-value>)',
            },
        },
    },
    plugins: [],
}
