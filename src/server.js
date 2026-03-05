const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const apiRoutes = require('./routes/api');
const { loadThresholdsConfig } = require('./utils/configLoader');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '../public')));

// Load config on startup
try {
  const config = loadThresholdsConfig();
  console.log('✓ Thresholds configuration loaded');
} catch (error) {
  console.warn(`⚠ Warning: Could not load thresholds config at startup: ${error.message}`);
}

// API Routes
app.use('/api', apiRoutes);

// Root route - serve index.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found'
  });
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Error:', error.message);
  res.status(500).json({
    success: false,
    error: error.message || 'Internal server error'
  });
});

// Start server
app.listen(PORT, () => {
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('🍔 Grocery Chain Notification System');
  console.log('═══════════════════════════════════════════════════════');
  console.log(`✓ Server running on http://localhost:${PORT}`);
  console.log(`✓ Open your browser and go to http://localhost:${PORT}`);
  console.log('═══════════════════════════════════════════════════════\n');
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\nShutting down gracefully...');
  process.exit(0);
});
