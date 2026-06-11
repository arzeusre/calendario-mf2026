/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require('fs');
const path = require('path');
const https = require('https');

const files = {
  matches: 'https://raw.githubusercontent.com/rezarahiminia/worldcup2026/main/football.matches.json',
  teams: 'https://raw.githubusercontent.com/rezarahiminia/worldcup2026/main/football.teams.json',
  stadiums: 'https://raw.githubusercontent.com/rezarahiminia/worldcup2026/main/football.stadiums.json'
};

const outputDir = path.join(__dirname, '..', 'src', 'data');

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode !== 200) {
        reject(new Error(`Failed to download ${url}: status code ${res.statusCode}`));
        return;
      }
      const fileStream = fs.createWriteStream(dest);
      res.pipe(fileStream);
      fileStream.on('finish', () => {
        fileStream.close();
        console.log(`Downloaded: ${path.basename(dest)}`);
        resolve();
      });
    }).on('error', (err) => {
      reject(err);
    });
  });
}

async function main() {
  try {
    for (const [key, url] of Object.entries(files)) {
      const dest = path.join(outputDir, `${key}.json`);
      await downloadFile(url, dest);
    }
    console.log('All World Cup 2026 data downloaded successfully!');
  } catch (error) {
    console.error('Error downloading data:', error);
    process.exit(1);
  }
}

main();
