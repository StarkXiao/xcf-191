import { UPLOADS_DIR, SERVER_DIR, DATA_DIR } from './src/config.js';

console.log('SERVER_DIR:', SERVER_DIR);
console.log('UPLOADS_DIR:', UPLOADS_DIR);
console.log('DATA_DIR:', DATA_DIR);
console.log('UPLOADS_DIR exists:', await import('fs').then(fs => fs.default.existsSync(UPLOADS_DIR)));
