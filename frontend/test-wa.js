const fs = require('fs');
console.log(fs.readFileSync('src/pages/caller/leadManagement/components/WhatsAppModal.jsx', 'utf8').split('\n').filter((_, i) => i > 140 && i < 170).join('\n'));
