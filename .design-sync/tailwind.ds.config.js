// Tailwind config for design-sync bundle CSS: repo theme + preview sources.
const base = require('../tailwind.config.js')

module.exports = {
  ...base,
  content: [
    './src/components/**/*.{js,ts,jsx,tsx}',
    './.design-sync/previews/**/*.{tsx,jsx}',
  ],
}
