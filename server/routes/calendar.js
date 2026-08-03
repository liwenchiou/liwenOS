const express = require('express');
const router = express.Router();
const { google } = require('googleapis');

// Memory store for tokens in dev mode
let userTokens = null;

const getOAuthClient = () => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3001/api/calendar/auth/callback';

  if (!clientId || !clientSecret || clientId.includes('your_google_client_id')) {
    return null;
  }

  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
};

// 1. Get OAuth Auth URL
router.get('/auth-url', (req, res) => {
  const oauth2Client = getOAuthClient();
  if (!oauth2Client) {
    return res.json({
      configured: false,
      authUrl: null,
      message: 'Google Calendar API credentials not set in .env yet'
    });
  }

  const scopes = ['https://www.googleapis.com/auth/calendar'];
  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: scopes,
    prompt: 'consent'
  });

  res.json({ configured: true, authUrl: url, isConnected: !!userTokens });
});

// 2. OAuth Callback
router.get('/auth/callback', async (req, res) => {
  try {
    const { code } = req.query;
    const oauth2Client = getOAuthClient();

    if (!oauth2Client || !code) {
      return res.status(400).send('OAuth client or auth code missing');
    }

    const { tokens } = await oauth2Client.getToken(code);
    userTokens = tokens;

    res.send(`
      <html>
        <body style="background: #0f172a; color: #f8fafc; font-family: sans-serif; display: grid; place-content: center; height: 100vh;">
          <h2>✅ Google 行事曆授權成功！</h2>
          <p>您已順利連結 Google Calendar，視窗即將自動關閉...</p>
          <script>
            setTimeout(() => { window.close(); }, 2000);
          </script>
        </body>
      </html>
    `);
  } catch (err) {
    console.error('OAuth token error:', err);
    res.status(500).send('Authentication failed');
  }
});

// 3. Get Calendar Events (Real or Mock Fallback)
router.get('/events', async (req, res) => {
  const oauth2Client = getOAuthClient();

  // If OAuth client is configured & user has logged in
  if (oauth2Client && userTokens) {
    try {
      oauth2Client.setCredentials(userTokens);
      const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
      
      const now = new Date();
      const startOfDay = new Date(now.setHours(0, 0, 0, 0)).toISOString();
      const endOfDay = new Date(now.setHours(23, 59, 59, 999)).toISOString();

      const response = await calendar.events.list({
        calendarId: 'primary',
        timeMin: startOfDay,
        timeMax: endOfDay,
        singleEvents: true,
        orderBy: 'startTime',
      });

      const events = response.data.items.map(item => ({
        id: item.id,
        summary: item.summary || '無標題行程',
        start: item.start.dateTime || item.start.date,
        end: item.end.dateTime || item.end.date,
        location: item.location || '',
        description: item.description || ''
      }));

      return res.json({ success: true, isLive: true, events });
    } catch (err) {
      console.error('Failed to fetch real Google Calendar events:', err.message);
    }
  }

  // Fallback / Mock Data for instant demonstration before entering OAuth keys
  const todayStr = new Date().toISOString().split('T')[0];
  const mockEvents = [
    {
      id: 'evt-1',
      summary: '👥 團隊每日立會 (Team Daily Sync)',
      start: `${todayStr}T09:30:00.000Z`,
      end: `${todayStr}T10:00:00.000Z`,
      location: 'Google Meet',
      description: '對齊當日開發進度與卡關事項'
    },
    {
      id: 'evt-2',
      summary: '☕ 產品需求規劃討論 (Nexus Life OS Roadmap)',
      start: `${todayStr}T11:00:00.000Z`,
      end: `${todayStr}T12:00:00.000Z`,
      location: '線上視訊會議',
      description: '討論與整理產品願景'
    },
    {
      id: 'evt-3',
      summary: '🍱 兼顧營養的午餐休息時間',
      start: `${todayStr}T12:30:00.000Z`,
      end: `${todayStr}T13:30:00.000Z`,
      location: '休息區',
      description: '放鬆休息'
    },
    {
      id: 'evt-4',
      summary: '💻 核心 Code Review & 功能開發區塊',
      start: `${todayStr}T14:30:00.000Z`,
      end: `${todayStr}T16:30:00.000Z`,
      location: '工作桌',
      description: 'Focus Work Block'
    }
  ];

  res.json({
    success: true,
    isLive: false,
    message: '目前展示 Mock 行程數據。如欲同步真實 Google Calendar，請於 .env 設定 OAuth Client ID。',
    events: mockEvents
  });
});

// 4. Create Calendar Event
router.post('/events', async (req, res) => {
  const { summary, startTime, endTime, description, location } = req.body;
  const oauth2Client = getOAuthClient();

  if (oauth2Client && userTokens) {
    try {
      oauth2Client.setCredentials(userTokens);
      const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

      const created = await calendar.events.insert({
        calendarId: 'primary',
        requestBody: {
          summary,
          description,
          location,
          start: { dateTime: new Date(startTime).toISOString() },
          end: { dateTime: new Date(endTime).toISOString() }
        }
      });

      return res.json({ success: true, isLive: true, event: created.data });
    } catch (err) {
      console.error('Error creating real event:', err);
    }
  }

  // Fallback response for creation in demo mode
  const newEvent = {
    id: `mock-evt-${Date.now()}`,
    summary: summary || '新建立行程',
    start: startTime || new Date().toISOString(),
    end: endTime || new Date(Date.now() + 3600000).toISOString(),
    location: location || '',
    description: description || ''
  };

  res.json({
    success: true,
    isLive: false,
    message: '行程已模擬建立（目前未連線真實 Google API）',
    event: newEvent
  });
});

module.exports = router;
