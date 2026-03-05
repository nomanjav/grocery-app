const { parseExcelFile } = require('../utils/excelParser');
const { generateNotifications } = require('../utils/notificationEngine');
const { loadThresholdsConfig } = require('../utils/configLoader');

let currentNotifications = null;
let currentConfig = null;

function handleFileUpload(req, res) {
  try {
    // Check if file was uploaded
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded'
      });
    }

    // Validate file extension
    const fileName = req.file.originalname.toLowerCase();
    if (!fileName.endsWith('.xlsx')) {
      return res.status(400).json({
        success: false,
        error: 'Invalid file type. Only .xlsx files are accepted'
      });
    }

    console.log(`\n📁 Processing file: ${req.file.originalname}`);

    // Parse the Excel file
    const parseResult = parseExcelFile(req.file.path);

    if (!parseResult.success) {
      console.error(`❌ Parsing failed: ${parseResult.error}`);
      return res.status(400).json({
        success: false,
        error: parseResult.error
      });
    }

    console.log(`✓ Parsed ${parseResult.data.productCount} products from ${parseResult.data.storeNames.length} stores`);

    // Load thresholds config
    if (!currentConfig) {
      try {
        currentConfig = loadThresholdsConfig();
      } catch (error) {
        console.error(`❌ Config loading failed: ${error.message}`);
        return res.status(500).json({
          success: false,
          error: `Failed to load thresholds config: ${error.message}`
        });
      }
    }

    // Generate notifications
    const notificationResult = generateNotifications(parseResult, currentConfig);

    if (!notificationResult.success) {
      console.error(`❌ Notification generation failed: ${notificationResult.error}`);
      return res.status(500).json({
        success: false,
        error: notificationResult.error
      });
    }

    // Store notifications in memory
    currentNotifications = notificationResult.notifications;

    console.log(`✓ Generated ${notificationResult.summary.total} notifications`);
    console.log(`  - CRITICAL: ${notificationResult.summary.critical}`);
    console.log(`  - HIGH: ${notificationResult.summary.high}`);
    console.log(`  - MEDIUM: ${notificationResult.summary.medium}`);
    console.log(`  - LOW: ${notificationResult.summary.low}\n`);

    // Return success response
    res.json({
      success: true,
      data: {
        fileName: req.file.originalname,
        uploadTime: new Date().toISOString(),
        parsedData: {
          products: parseResult.data.productCount,
          stores: parseResult.data.storeNames
        },
        notifications: currentNotifications,
        summary: notificationResult.summary
      }
    });
  } catch (error) {
    console.error(`❌ Server error: ${error.message}`);
    res.status(500).json({
      success: false,
      error: `Server error: ${error.message}`
    });
  }
}

function getNotifications(req, res) {
  try {
    if (!currentNotifications) {
      return res.json({
        success: true,
        notifications: [],
        message: 'No notifications yet. Please upload an Excel file.'
      });
    }

    res.json({
      success: true,
      notifications: currentNotifications
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: `Failed to get notifications: ${error.message}`
    });
  }
}

function getNotificationsSummary(req, res) {
  try {
    if (!currentNotifications) {
      return res.json({
        success: true,
        summary: {
          total: 0,
          critical: 0,
          high: 0,
          medium: 0,
          low: 0
        }
      });
    }

    const summary = {
      total: currentNotifications.length,
      critical: currentNotifications.filter(n => n.severity === 'CRITICAL').length,
      high: currentNotifications.filter(n => n.severity === 'HIGH').length,
      medium: currentNotifications.filter(n => n.severity === 'MEDIUM').length,
      low: currentNotifications.filter(n => n.severity === 'LOW').length
    };

    res.json({
      success: true,
      summary: summary
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: `Failed to get summary: ${error.message}`
    });
  }
}

function getConfig(req, res) {
  try {
    if (!currentConfig) {
      try {
        currentConfig = loadThresholdsConfig();
      } catch (error) {
        return res.status(500).json({
          success: false,
          error: `Failed to load config: ${error.message}`
        });
      }
    }

    res.json({
      success: true,
      config: currentConfig
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: `Failed to get config: ${error.message}`
    });
  }
}

module.exports = {
  handleFileUpload,
  getNotifications,
  getNotificationsSummary,
  getConfig
};
