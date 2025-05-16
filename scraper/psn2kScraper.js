const puppeteer = require('puppeteer');

async function fetchRecent2KMatch(psnId) {
  const url = `https://psnprofiles.com/${psnId}`; // Change if using 2K stats page
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();

  try {
    await page.goto(url, { waitUntil: 'networkidle2' });

    // EXAMPLE: look for recent game match info
    const data = await page.evaluate(() => {
      const rows = Array.from(document.querySelectorAll('.zebra tr'));
      const nba2kMatches = rows
        .filter(row => row.innerText.includes("NBA 2K"))
        .map(row => {
          const cells = row.querySelectorAll('td');
          return {
            title: cells[0]?.innerText.trim(),
            earnedAt: cells[2]?.innerText.trim(),
          };
        });
      return nba2kMatches;
    });

    await browser.close();
    return data;
  } catch (err) {
    console.error("❌ Error scraping:", err);
    await browser.close();
    return null;
  }
}

module.exports = { fetchRecent2KMatch };
 