const { google } = require('googleapis');
const calendarService = require('./calendarService');

class TodoService {
  getSpreadsheetId() {
    return process.env.SPREADSHEET_ID || process.env.TODO_SPREADSHEET_ID || '1VMHoGReOtWN-TB9N38U-QXowb7Xiiyna-AHclq2kO_o';
  }

  getSheetsClient() {
    const oauth2Client = calendarService.getOAuthClient();
    if (!oauth2Client) {
      throw new Error('Google OAuth 尚未授權或金鑰未配置');
    }
    return google.sheets({ version: 'v4', auth: oauth2Client });
  }

  // Helper to find the target sheet tab name ('To-Dos' or fallback)
  async getTargetTabName(sheets, spreadsheetId) {
    const meta = await sheets.spreadsheets.get({ spreadsheetId });
    const tabs = meta.data.sheets.map(s => s.properties.title);
    
    // Prioritize 'To-Dos' tab
    const toDosTab = tabs.find(t => t.toLowerCase().replace(/[^a-z]/g, '') === 'todos' || t === 'To-Dos');
    if (toDosTab) return toDosTab;

    return tabs[0];
  }

  // GET /api/todos: Fetch all To-Do items from Google Sheet ('To-Dos' tab)
  async getTodos() {
    const spreadsheetId = this.getSpreadsheetId();

    try {
      const sheets = this.getSheetsClient();
      const tabName = await this.getTargetTabName(sheets, spreadsheetId);

      const response = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: `'${tabName}'!A1:Z2000`,
      });

      const rows = response.data.values || [];
      if (rows.length === 0) return [];

      const tasks = [];
      const isCustomStructure = rows[0] && (rows[0][0] === 'ID' || rows[0][2] === 'Content');
      const startRowIndex = isCustomStructure ? 1 : 0;

      for (let i = startRowIndex; i < rows.length; i++) {
        const row = rows[i];
        if (!row || row.length === 0 || !row.join('').trim()) continue;

        if (isCustomStructure) {
          // Columns: ID, User ID, Content, Target Date, Is Done, Created At, Completed At
          const id = row[0] || `${i + 1}`;
          const content = row[2] || row[0] || '';
          const isDone = (row[4] || '').toUpperCase() === 'TRUE';
          const targetDate = row[3] || '';

          if (content) {
            tasks.push({
              id,
              rowNumber: i + 1,
              text: content,
              completed: isDone,
              targetDate,
              createdAt: row[5] || '',
              tabName
            });
          }
        } else {
          // Fallback legacy row structure
          const col0 = (row[0] || '').trim();
          const col1 = (row[1] || '').trim();
          const col2 = (row[2] || '').trim();

          const isCompleted = col0.includes('[x]') || col1.includes('已完成') || col1.includes('TRUE') || col1.includes('true') || col2.includes('已完成');
          let text = col0.replace(/^-\s*\[[ xX]\]\s*/, '').replace(/^已完成:?\s*/, '').trim();
          if (!text && col1) text = col1;

          tasks.push({
            id: i + 1,
            rowNumber: i + 1,
            text: text || col0,
            completed: isCompleted,
            tabName
          });
        }
      }

      return tasks;
    } catch (err) {
      if (err.message.includes('Insufficient Permission') || (err.response && err.response.status === 403)) {
        console.warn('Google Sheets API 權限不足');
        return [];
      }
      console.error('Failed to fetch todos from Google Sheet:', err.message);
      return [];
    }
  }

  // POST /api/todos: Add new To-Do item to Google Sheet ('To-Dos' tab format)
  async addTodo(text) {
    if (!text || !text.trim()) throw new Error('待辦事項內容不能為空');

    const spreadsheetId = this.getSpreadsheetId();
    const sheets = this.getSheetsClient();
    const tabName = await this.getTargetTabName(sheets, spreadsheetId);

    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');

    const newRow = [
      Date.now().toString(),                                    // ID
      process.env.MY_DISCORD_ID || '422392321812725770',        // User ID
      text.trim(),                                              // Content
      `${yyyy}-${mm}-${dd}`,                                    // Target Date
      'FALSE',                                                  // Is Done
      now.toLocaleString('zh-TW'),                              // Created At
      ''                                                        // Completed At
    ];

    const response = await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `'${tabName}'!A1`,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [newRow]
      }
    });

    return { success: true, updatedRange: response.data.updates?.updatedRange, newRow };
  }

  // PATCH /api/todos/:id: Toggle completed status of a row in Google Sheet ('To-Dos' tab format)
  async toggleTodo(rowNumber, completed) {
    const spreadsheetId = this.getSpreadsheetId();
    const sheets = this.getSheetsClient();
    const tabName = await this.getTargetTabName(sheets, spreadsheetId);

    const isDoneStr = completed ? 'TRUE' : 'FALSE';
    const completedAtStr = completed ? new Date().toLocaleString('zh-TW') : '';

    // Update E (Is Done) and G (Completed At)
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `'${tabName}'!E${rowNumber}:G${rowNumber}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [[isDoneStr, '', completedAtStr]]
      }
    });

    return { success: true, rowNumber, completed };
  }

  // DELETE /api/todos/:id: Clear a row in Google Sheet
  async deleteTodo(rowNumber) {
    const spreadsheetId = this.getSpreadsheetId();
    const sheets = this.getSheetsClient();
    const tabName = await this.getTargetTabName(sheets, spreadsheetId);

    await sheets.spreadsheets.values.clear({
      spreadsheetId,
      range: `'${tabName}'!A${rowNumber}:Z${rowNumber}`
    });

    return { success: true, rowNumber };
  }
}

module.exports = new TodoService();
