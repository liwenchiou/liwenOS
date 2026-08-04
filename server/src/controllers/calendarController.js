const calendarService = require('../services/calendarService');
const { successResponse, errorResponse } = require('../utils/response');

class CalendarController {
  async getAuthUrl(req, res, next) {
    try {
      const authInfo = calendarService.getAuthUrl();
      return successResponse(res, authInfo, 'Auth URL status checked');
    } catch (err) {
      next(err);
    }
  }

  async handleOAuthCallback(req, res, next) {
    try {
      const { code } = req.query;
      if (!code) return errorResponse(res, 'Authorization code missing', 400);

      await calendarService.setTokensFromCode(code);
      return res.send(`
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
      next(err);
    }
  }

  async getEvents(req, res, next) {
    try {
      const { year, month } = req.query;
      const { isLive, events } = await calendarService.getEvents(year, month);
      return successResponse(res, { isLive, totalEvents: events.length, events }, 'Calendar events fetched');
    } catch (err) {
      next(err);
    }
  }

  async createEvent(req, res, next) {
    try {
      const { summary, startTime, endTime } = req.body;
      if (!summary) return errorResponse(res, 'Event summary is required', 400);

      const { isLive, event } = await calendarService.createEvent(req.body);
      return successResponse(res, { isLive, event }, 'Event created successfully', 201);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new CalendarController();
