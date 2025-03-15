require('dotenv/config');
const puppeteer = require('puppeteer');

const streamers = process.env.STREAMERS.split(',');
const AUTH_TOKEN = process.env.AUTH_TOKEN;

async function watchStream(browser, streamer) {
  try {
    console.log(`Opening stream for ${streamer}...`);
    const page = await browser.newPage();
    
    // Set auth token cookie before loading any Twitch page
    await page.setCookie({
      name: 'auth-token',
      value: AUTH_TOKEN,
      domain: '.twitch.tv',
      path: '/',
    });
    
    // Block video content but allow stream connection
    await page.setRequestInterception(true);
    page.on('request', request => {
      if (request.resourceType() === 'media' || 
          request.resourceType() === 'image' ||
          request.resourceType() === 'font' ||
          request.url().includes('.m3u8') ||
          request.url().includes('.ts')) {
        request.abort();
      } else {
        request.continue();
      }
    });

    // Optimize page settings
    await page.setViewport({ width: 400, height: 300 });
    
    // Emulate low-end device to minimize resource usage
    const client = await page.target().createCDPSession();
    await client.send('Network.enable');
    await client.send('Network.emulateNetworkConditions', {
      offline: false,
      latency: 100,
      downloadThroughput: 50 * 1024,
      uploadThroughput: 20 * 1024
    });

    // Navigate directly to streamer's page
    await page.goto(`https://www.twitch.tv/${streamer}`, {
      waitUntil: 'domcontentloaded',
      timeout: 60000,
    });

    // Handle mature content warning if present
    try {
      await page.waitForSelector('button[data-a-target="player-overlay-mature-accept"]', { timeout: 5000 });
      await page.click('button[data-a-target="player-overlay-mature-accept"]');
    } catch (e) {
      // No mature content warning, continue
    }

    console.log(`Successfully connected to ${streamer}'s channel`);
    
    // Periodic check for connection and points accumulation
    setInterval(async () => {
      try {
        const isConnected = await page.evaluate(() => document.visibilityState === 'visible');
        if (!isConnected) {
          console.log(`Refreshing connection to ${streamer}'s stream...`);
          await page.reload({ waitUntil: 'domcontentloaded' });
        }
      } catch (e) {
        console.error(`Error checking stream status for ${streamer}:`, e);
      }
    }, 5 * 60 * 1000);

  } catch (error) {
    console.error(`Error watching ${streamer}:`, error);
  }
}

async function main() {
  console.log('Starting Twitch Points Farming Bot...');
  
  if (!AUTH_TOKEN) {
    console.error('Error: AUTH_TOKEN is required in .env file');
    process.exit(1);
  }
  
  try {
    // Launch browser with additional optimization flags
    const browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu',
        '--disable-images',
        '--disable-media-source',
        '--disable-audio',
        '--disable-video',
        '--disable-notifications',
        '--window-size=400,300',
        '--mute-audio',
        '--js-flags="--max-old-space-size=128"'
      ]
    });

    // Watch all streams
    await Promise.all(streamers.map(streamer => watchStream(browser, streamer)));
    
    console.log('All channels are now being watched for points!');
    
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

// Handle process termination
process.on('SIGINT', async () => {
  console.log('Shutting down...');
  process.exit();
});

// Start the bot
main();
