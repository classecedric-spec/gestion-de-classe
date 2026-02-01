
// PDF Theme Token definition
export const PDF_THEME = {
    colors: {
        primary: '#E0E0E0', // Was hardcoded in Modern PDF
        secondary: '#A0A8AD',
        accent: '#D9B981', // Gold from AvancementPDF
        text: {
            main: '#1a1a1a',
            secondary: '#444444',
            light: '#666666',
            muted: '#999999'
        },
        status: {
            success: '#22c55e',
            warning: '#D9B981',
            danger: '#ef4444',
            info: '#244154', // Navy from Modern PDF
            grey: '#A0A8AD'
        },
        background: {
            white: '#FFFFFF',
            light: '#fafafa',
            grey: '#f5f5f5'
        },
        border: '#cccccc'
    },
    fonts: {
        main: 'Helvetica',
        bold: 'Helvetica-Bold'
    },
    sizes: {
        text: {
            xs: 6,
            sm: 8,
            base: 10,
            lg: 14,
            xl: 18
        },
        spacing: {
            xs: 2,
            sm: 4,
            md: 8,
            lg: 12,
            xl: 20
        }
    }
} as const;
