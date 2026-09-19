const fs = require('fs');
const https = require('https');
const path = require('path');

const fonts = {
  'Syne-Regular.ttf': 'https://raw.githubusercontent.com/google/fonts/main/ofl/syne/Syne%5Bwght%5D.ttf',
  'Syne-Bold.ttf': 'https://raw.githubusercontent.com/google/fonts/main/ofl/syne/Syne%5Bwght%5D.ttf',
  'Syne-ExtraBold.ttf': 'https://raw.githubusercontent.com/google/fonts/main/ofl/syne/Syne%5Bwght%5D.ttf',
  'DMMono-Regular.ttf': 'https://raw.githubusercontent.com/google/fonts/main/ofl/dmmono/DMMono-Regular.ttf',
  'DMMono-Medium.ttf': 'https://raw.githubusercontent.com/google/fonts/main/ofl/dmmono/DMMono-Medium.ttf'
};

const fontDir = path.join(__dirname, 'assets', 'fonts');

Object.entries(fonts).forEach(([filename, url]) => {
  const dest = path.join(fontDir, filename);
  const file = fs.createWriteStream(dest);
  https.get(url, (response) => {
    if (response.statusCode === 200) {
      response.pipe(file);
      file.on('finish', () => file.close());
    } else {
      console.error(`Failed to download ${filename}, status: ${response.statusCode}`);
      file.close();
    }
  }).on('error', (err) => {
    fs.unlink(dest, () => {});
    console.error(`Error downloading ${filename}: ${err.message}`);
  });
});
