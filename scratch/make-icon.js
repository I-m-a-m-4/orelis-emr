const sharp = require('sharp');
const svg = `<svg width="512" height="512" viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="512" height="512" rx="102.4" fill="#f97316"/>
  <g transform="translate(64, 64) scale(16)" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M4.8 2.3A.3.3 0 1 0 5 2H4a2 2 0 0 0-2 2v5a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6V4a2 2 0 0 0-2-2h-1a.3.3 0 1 0 .2.3" />
    <path d="M8 15v1a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6v-4" />
    <circle cx="20" cy="10" r="2" />
  </g>
</svg>`;
sharp(Buffer.from(svg))
  .png()
  .toFile('public/icon.png')
  .then(() => console.log('Generated public/icon.png'))
  .catch(e => { console.error(e); process.exit(1); });
