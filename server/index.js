require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const noteRoutes = require('./src/routes/noteRoutes');
const calendarRoutes = require('./src/routes/calendarRoutes');
const todoRoutes = require('./src/routes/todoRoutes');
const errorHandler = require('./src/middlewares/errorHandler');
const { successResponse } = require('./src/utils/response');

const app = express();
const PORT = process.env.PORT || 3001;

// Global Security & Body Parsing Middlewares
app.use(cors());
app.use(express.json());

// API Routes
app.use('/api/notes', noteRoutes);
app.use('/api/calendar', calendarRoutes);
app.use('/api/todos', todoRoutes);

// Serve static frontend build if available
const publicPath = path.join(__dirname, 'public');
const clientDistPath = path.join(__dirname, '../client/dist');

if (fs.existsSync(publicPath)) {
  app.use(express.static(publicPath));
}
if (fs.existsSync(clientDistPath)) {
  app.use(express.static(clientDistPath));
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  return successResponse(res, { time: new Date().toISOString() }, 'Nexus Backend Server Active & Healthy');
});

// Fallback for SPA routing: Serve React index.html directly on Port 3001
app.get('*', (req, res) => {
  const publicIndex = path.join(publicPath, 'index.html');
  const clientIndex = path.join(clientDistPath, 'index.html');

  if (fs.existsSync(publicIndex)) {
    return res.sendFile(publicIndex);
  }
  if (fs.existsSync(clientIndex)) {
    return res.sendFile(clientIndex);
  }
  
  res.json({ message: 'Nexus Backend API Server Active (3-Tier Architecture).' });
});

// Global Error Handler Middleware (CWE-200)
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`🚀 Nexus Life OS Server running in 3-Tier Architecture on http://localhost:${PORT}`);
});
