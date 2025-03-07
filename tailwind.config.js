/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
      './src/**/*.{html,js,astro}', // Adjust this to match your project structure
    ],
    plugins: [
      require('tailwindcss-animate'), // Add TailwindCSS Animate plugin
      // Add other plugins if needed
    ],
    darkMode: 'class', // Or 'media' depending on how you want dark mode to be handled
    theme: {
      extend: {
        colors: {
          // Your custom colors here, e.g.
          background: 'oklch(1 0 0)',
          foreground: 'oklch(0.129 0.042 264.695)',
        },
      },
    },
  }
  