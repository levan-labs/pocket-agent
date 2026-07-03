/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Simple dark palette that's easy on the eyes on a phone at night.
        ink: '#0b0f14',
        panel: '#131a22',
        line: '#243040',
        accent: '#4f9dff'
      }
    }
  },
  plugins: []
};
