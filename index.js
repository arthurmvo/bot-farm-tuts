require('dotenv/config');
const axios = require('axios');
const fs = require('fs');
const { exec } = require('child_process');

const OS = process.env.CURRENT_OS;
const streamers = process.env.STREAMERS.split(',');

// Twitch API Credentials
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

    return response.data.access_token; // The Bearer token
  } catch (error) {
    console.error('Error getting access token:', error);
    process.exit(1); // Exit if unable to get token
  }
}

// Function to open Twitch streams in a browser
async function openBrowserOnStreams() {
  const token = await getAccessToken(); // Get OAuth token

  streamers.forEach((streamer) => {
    console.log(`Opening stream for ${streamer}...`);

    const command =`xvfb-run --auto-servernum chromium --new-window --disable-gpu --no-sandbox --mute-audio "https://www.twitch.tv/${streamer}?token=${token}"`
    
    exec(command, (err) => {
      if (err) {
        console.error(`Failed to open ${streamer}:`, err);
      } else {
        console.log(`Stream opened: ${streamer}`);
      }
    });
  });
}

// Run script at startup
(async () => {
  console.log('Starting Twitch Farming Bot...');
  await openBrowserOnStreams();
})();
