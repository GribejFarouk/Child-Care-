/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#e5f0ff',
          100: '#cce0ff',
          500: '#007AFF', // Apple iOS Blue
          600: '#0062cc',
          700: '#004999',
          800: '#003366',
          900: '#001a33',
        },
        gray: {
          50: '#F0F7FF',
          100: '#E0EFFF',
          200: '#B8D8FF',
          300: '#8ABFFF',
          400: '#5CA6FF',
          500: '#2E8CFF',
          600: '#007AFF', // Same as primary-500
          700: '#0062cc',
          800: '#004999',
          900: '#003366',
        },
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', '"SF Pro Display"', '"SF Pro Text"', '"Segoe UI"', 'Roboto', 'Helvetica', 'Arial', 'sans-serif'],
        serif: ['-apple-system', 'BlinkMacSystemFont', '"SF Pro Display"', 'sans-serif'],
      },
      boxShadow: {
        'apple': '0 4px 24px rgba(0, 122, 255, 0.06)',
        'apple-hover': '0 12px 40px rgba(0, 122, 255, 0.12)',
        'apple-float': '0 20px 40px rgba(0, 122, 255, 0.16)',
      },
      backgroundImage: {
        'premium-gradient': 'linear-gradient(180deg, #F0F7FF 0%, #FFFFFF 100%)',
        'mesh-gradient': 'radial-gradient(at 0% 0%, hsla(210,100%,93%,1) 0, transparent 50%), radial-gradient(at 50% 0%, hsla(210,100%,95%,1) 0, transparent 50%), radial-gradient(at 100% 0%, hsla(210,100%,96%,1) 0, transparent 50%)',
      }
    },
  },
  plugins: [],
}
