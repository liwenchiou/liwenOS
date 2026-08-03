const { google } = require('googleapis');
const path = require('path');
const fs = require('fs');

let userTokens = null;

class CalendarService {
  // Dynamically load fresh .env values on demand
  loadFreshEnv() {
    try {
      require('dotenv').config();
      const rootEnvPath = path.resolve(__dirname, '../../../.env');
      const serverEnvPath = path.resolve(__dirname, '../../.env');

      if (fs.existsSync(rootEnvPath)) {
        require('dotenv').config({ path: rootEnvPath, override: true });
      }
      if (fs.existsSync(serverEnvPath)) {
        require('dotenv').config({ path: serverEnvPath, override: true });
      }
    } catch (e) {}
  }

  getOAuthClient() {
    this.loadFreshEnv();

    let clientId = process.env.GOOGLE_CLIENT_ID;
    let clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    let redirectUri = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3001/api/calendar/auth/callback';

    // Parse GOOGLE_CREDENTIALS JSON from .env if available
    if (process.env.GOOGLE_CREDENTIALS) {
      try {
        const creds = typeof process.env.GOOGLE_CREDENTIALS === 'string'
          ? JSON.parse(process.env.GOOGLE_CREDENTIALS)
          : process.env.GOOGLE_CREDENTIALS;
        const details = creds.installed || creds.web;
        if (details) {
          clientId = details.client_id;
          clientSecret = details.client_secret;
          redirectUri = (details.redirect_uris && details.redirect_uris[0]) || redirectUri;
        }
      } catch (e) {
        console.error('Failed to parse GOOGLE_CREDENTIALS JSON:', e.message);
      }
    }

    if (!clientId || !clientSecret || clientId.includes('your_google_client_id')) {
      return null;
    }

    const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);

    // Auto-load pre-authenticated GOOGLE_TOKEN if available
    if (process.env.GOOGLE_TOKEN) {
      try {
        const tokenData = typeof process.env.GOOGLE_TOKEN === 'string'
          ? JSON.parse(process.env.GOOGLE_TOKEN)
          : process.env.GOOGLE_TOKEN;
        userTokens = tokenData;
      } catch (e) {
        console.error('Failed to parse GOOGLE_TOKEN JSON:', e.message);
      }
    }

    if (userTokens) {
      oauth2Client.setCredentials(userTokens);
    }

    return oauth2Client;
  }

  // Get target Google Calendar ID (Defaults to primary or custom CALENDAR_IDS)
  getTargetCalendarId() {
    this.loadFreshEnv();
    const customId = process.env.CALENDAR_IDS;
    if (customId && customId.trim()) {
      return customId.split(',')[0].trim();
    }
    return 'primary';
  }

  getAuthUrl() {
    const oauth2Client = this.getOAuthClient();
    if (!oauth2Client) {
      return { configured: false, authUrl: null };
    }

    const scopes = [
      'https://www.googleapis.com/auth/calendar',
      'https://www.googleapis.com/auth/spreadsheets'
    ];
    const url = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      prompt: 'consent'
    });

    return { configured: true, authUrl: url, isConnected: !!userTokens };
  }

  async setTokensFromCode(code) {
    const oauth2Client = this.getOAuthClient();
    if (!oauth2Client) throw new Error('Google OAuth client not configured');
    
    const { tokens } = await oauth2Client.getToken(code);
    userTokens = tokens;

    // Persist fresh tokens back to .env files automatically
    const tokenJsonString = JSON.stringify(tokens);
    const envPaths = [
      path.resolve(__dirname, '../../../.env'),
      path.resolve(__dirname, '../../.env')
    ];

    for (const envPath of envPaths) {
      try {
        if (fs.existsSync(envPath)) {
          let content = fs.readFileSync(envPath, 'utf-8');
          if (content.includes('GOOGLE_TOKEN=')) {
            content = content.replace(/GOOGLE_TOKEN=.*/g, `GOOGLE_TOKEN='${tokenJsonString}'`);
          } else {
            content += `\nGOOGLE_TOKEN='${tokenJsonString}'\n`;
          }
          fs.writeFileSync(envPath, content, 'utf-8');
        }
      } catch (err) {}
    }

    return tokens;
  }

  // Helper: Fetch and parse iCloud webcal/ICS subscriptions
  async fetchICloudEvents(webcalUrl, ownerName) {
    if (!webcalUrl) return [];

    try {
      const httpsUrl = webcalUrl.replace(/^webcal:\/\//i, 'https://');
      const response = await fetch(httpsUrl);
      if (!response.ok) return [];

      const icsText = await response.text();
      return this.parseIcsEvents(icsText, ownerName);
    } catch (err) {
      console.error(`Failed to fetch iCloud calendar (${ownerName}):`, err.message);
      return [];
    }
  }

  // Robust ICS VEVENT Parser with 1970 Epoch filtering
  parseIcsEvents(icsContent, ownerName) {
    const events = [];
    const eventBlocks = icsContent.split('BEGIN:VEVENT');

    for (let i = 1; i < eventBlocks.length; i++) {
      const block = eventBlocks[i].split('END:VEVENT')[0];

      const getFieldValue = (fieldName) => {
        const regex = new RegExp(`(?:^|\\n)${fieldName}(?:;[^:]*)?:(.*)`, 'i');
        const match = block.match(regex);
        return match ? match[1].trim() : '';
      };

      const parseIcsDate = (dateStr) => {
        if (!dateStr) return null;
        const clean = dateStr.replace(/[^0-9T]/g, '');
        if (clean.length >= 8) {
          const y = parseInt(clean.substring(0, 4), 10);
          const m = parseInt(clean.substring(4, 6), 10) - 1;
          const d = parseInt(clean.substring(6, 8), 10);
          const timePart = clean.includes('T') ? clean.split('T')[1] : '000000';
          const hh = parseInt(timePart.substring(0, 2) || '00', 10);
          const mm = parseInt(timePart.substring(2, 4) || '00', 10);
          const ss = parseInt(timePart.substring(4, 6) || '00', 10);
          
          if (clean.endsWith('Z')) {
            return new Date(Date.UTC(y, m, d, hh, mm, ss));
          }
          return new Date(y, m, d, hh, mm, ss);
        }
        return null;
      };

      const summary = getFieldValue('SUMMARY');
      const dtStart = getFieldValue('DTSTART');
      const dtEnd = getFieldValue('DTEND');
      const location = getFieldValue('LOCATION');
      const description = getFieldValue('DESCRIPTION');

      if (summary && dtStart) {
        const startDate = parseIcsDate(dtStart);
        const endDate = dtEnd ? parseIcsDate(dtEnd) : startDate;

        if (startDate && startDate.getFullYear() >= 2000) {
          events.push({
            id: `icloud-${ownerName}-${i}-${Date.now()}`,
            summary: `☁️ [${ownerName}] ${summary}`,
            start: startDate.toISOString(),
            end: endDate ? endDate.toISOString() : startDate.toISOString(),
            location: location.replace(/\\,/g, ','),
            description: description.replace(/\\n/g, '\n'),
            source: `${ownerName}`
          });
        }
      }
    }

    return events;
  }

  async getEvents() {
    const targetCalendarId = this.getTargetCalendarId();
    const oauth2Client = this.getOAuthClient();
    let googleEvents = [];
    let isLive = false;

    // Full Current Month Boundaries (1st day 00:00:00 ~ Last day 23:59:59)
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const startOfMonth = new Date(year, month, 1, 0, 0, 0, 0);
    const endOfMonth = new Date(year, month + 1, 0, 23, 59, 59, 999);

    // 1. Fetch Google Calendar events for the ENTIRE current month
    if (oauth2Client) {
      try {
        const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

        const response = await calendar.events.list({
          calendarId: targetCalendarId,
          timeMin: startOfMonth.toISOString(),
          timeMax: endOfMonth.toISOString(),
          singleEvents: true,
          orderBy: 'startTime',
        });

        googleEvents = response.data.items.map(item => ({
          id: item.id,
          summary: item.summary || '無標題行程',
          start: item.start.dateTime || item.start.date,
          end: item.end.dateTime || item.end.date,
          location: item.location || '',
          description: item.description || '',
          source: 'AI 助理行事曆'
        }));
        isLive = true;
      } catch (err) {
        console.error(`Google Calendar fetch warning (${targetCalendarId}):`, err.message);
      }
    }

    // 2. Fetch REAL iCloud Webcal Subscriptions (安大 & 貝貝)
    const andalUrl = process.env.ANDAL_ICLOUD_URL;
    const beibeiUrl = process.env.BEIBEI_ICLOUD_URL;

    const [andalEvents, beibeiEvents] = await Promise.all([
      this.fetchICloudEvents(andalUrl, '安大'),
      this.fetchICloudEvents(beibeiUrl, '貝貝')
    ]);

    // Combine Google & Real iCloud events
    const combinedEvents = [...googleEvents, ...andalEvents, ...beibeiEvents].sort(
      (a, b) => new Date(a.start) - new Date(b.start)
    );

    return { isLive, targetCalendarId, events: combinedEvents };
  }

  async createEvent(eventData) {
    const { summary, startTime, endTime, description, location } = eventData;
    const targetCalendarId = this.getTargetCalendarId();
    const oauth2Client = this.getOAuthClient();

    if (oauth2Client) {
      try {
        const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

        const created = await calendar.events.insert({
          calendarId: targetCalendarId,
          requestBody: {
            summary,
            description,
            location,
            start: { dateTime: new Date(startTime).toISOString() },
            end: { dateTime: new Date(endTime).toISOString() }
          }
        });

        return { isLive: true, targetCalendarId, event: created.data };
      } catch (err) {
        console.error(`Google Calendar create event error (${targetCalendarId}):`, err.message);
      }
    }

    return {
      isLive: false,
      targetCalendarId,
      message: '無法連結 Google Calendar，請檢查授權金鑰狀態。'
    };
  }
}

module.exports = new CalendarService();
