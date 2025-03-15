require('dotenv/config');
const axios = require('axios');
const fs = require('fs');
const { exec } = require('child_process');

const OS = process.env.CURRENT_OS;
const streamers = process.env.STREAMERS.split(',');

// Your Twitch client credentials
const clientId = process.env.CLIENT_ID;
const clientSecret = process.env.CLIENT_SECRET;

// Function to get the OAuth access token
async function getAccessToken() {
  try {
    const response = await axios.post(`https://id.twitch.tv/oauth2/token`, null, {
      params: {
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'client_credentials',
      },
    });

    return response.data.access_token;  // The Bearer token
  } catch (error) {
    console.error('Error getting access token:', error);
    process.exit(1);  // Exit if unable to get token
  }
}

// Function to open Twitch streams in a browser
function openBrowserOnStreams() {
  streamers.forEach(async (streamer) => {
    const statusFile = `${streamer}.txt`;
    let previousStatus = fs.existsSync(statusFile) ? fs.readFileSync(statusFile, 'utf8') : '';

    if (previousStatus !== 'opened') {
      console.log(`Opening stream for ${streamer}...`);

      const token = await getAccessToken();  // Get Bearer token

      // For now, we don't need to check if the streamer is live since you wanted to always keep streams open
      const command = OS === 'linux'
        ? `DISPLAY=:99 google-chrome-stable --new-window --disable-gpu --no-sandbox --mute-audio "https://www.twitch.tv/${streamer}?token=${token}"`
        : `start chrome "https://www.twitch.tv/${streamer}?token=${token}"`; // Windows command

      exec(command, (err) => {
        if (err) {
          console.error(`Failed to open ${streamer}:`, err);
        } else {
          fs.writeFileSync(statusFile, 'opened');
        }
      });
    }
  });
}

// Run script at startup and repeat every 15 minutes
(() => {
  console.log('Starting Twitch Farming Bot...');
  openBrowserOnStreams();
})();
