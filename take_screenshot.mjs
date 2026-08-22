import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  
  console.log('Navigating to http://localhost:5173/');
  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle0' });
  
  console.log('Waiting for initial data load...');
  try {
    await page.waitForSelector('.loading-spinner', { hidden: true, timeout: 30000 });
  } catch (e) {
    console.log("Loading spinner didn't disappear within 30s");
  }

  console.log('Waiting an extra 3 seconds for charts to render...');
  await new Promise(r => setTimeout(r, 3000));
  
  console.log('Taking full page screenshot...');
  await page.screenshot({ path: '/Users/seansimpson/.gemini/antigravity-ide/brain/5e9f890c-fec2-4446-8b30-9737137e6c2d/screenshot.png', fullPage: true });
  
  await browser.close();
  console.log('Done!');
})();
