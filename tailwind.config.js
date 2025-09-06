/** @type {import('tailwindcss').Config} */
module.exports = {
	content: [
		'./src/pages/**/*.{js,ts,jsx,tsx,mdx}',
		'./src/components/**/*.{js,ts,jsx,tsx,mdx}',
		'./src/app/**/*.{js,ts,jsx,tsx,mdx}',
	],
	theme: {
		extend: {
			colors: {
				background: '#120006',
				primary: '#F0E6CE',
				secondary: '#FFFFFF',
				accent: '#D4AF37',
				accentHover: '#E6C85B',
				border: '#2A2A2A',
				inputBg: '#1A1A1A',
				placeholder: '#8C7F6A',
				chipBg: 'rgba(42, 42, 42, 0.3)',
				cardBg: 'rgba(26, 26, 26, 0.8)',
			},
			fontFamily: {
				inter: ['Inter', 'Roboto', 'SF Pro Display', 'sans-serif'],
			},
			borderRadius: {
				sm: '4px',
				DEFAULT: '6px',
				md: '8px',
			},
			boxShadow: {
				subtle: '0 2px 8px rgba(0,0,0,0.3)',
			},
			spacing: {
				btnY: '12px',
				btnX: '20px',
			},
			fontSize: {
				h1: ['24px', { fontWeight: '600' }],
				h2: ['20px', { fontWeight: '500' }],
				h3: ['18px', { fontWeight: '500' }],
				base: ['16px', { fontWeight: '400' }],
				label: ['12px', { fontWeight: '500', letterSpacing: '0.05em', textTransform: 'uppercase' }],
			},
		},
	},
	plugins: [],
}
