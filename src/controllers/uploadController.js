const fs = require('fs');
const path = require('path');

// Load modules with error checking
let parseExcelFileFromBuffer;
let generateNotifications;
let loadThresholdsConfig;

try {
  const excelParserModule = require('../utils/excelParser');
  parseExcelFileFromBuffer = excelParserModule.parseExcelFileFromBuffer;
  console.log('✓ excelParser loaded');
} catch (err) {
  console.error('Failed to load excelParser:', err.message);
  throw err;
}

try {
  const notificationEngineModule = require('../utils/notificationEngine');
  generateNotifications = notificationEngineModule.generateNotifications;
  console.log('✓ notificationEngine loaded');
} catch (err) {
  console.error('Failed to load notificationEngine:', err.message);
  throw err;
}

try {
  const configLoaderModule = require('../utils/configLoader');
  loadThresholdsConfig = configLoaderModule.loadThresholdsConfig;
  console.log('✓ configLoader loaded');
} catch (err) {
  console.error('Failed to load configLoader:', err.message);
  throw err;
}

let currentNotifications = null;
let currentConfig = null;

function handleFileUpload(req, res) {
  try {
    console.log('\n=== FILE UPLOAD STARTED ===');
    
    // Check if file was uploaded
    if (!req.file) {
      console.error('No file in request');
      return res.status(400).json({
        success: false,
        error: 'No file uploaded'
      });
    }

    console.log(`File received: ${req.file.originalname}`);
    console.log(`File size: ${req.file.size} bytes`);
    console.log(`File buffer type: ${typeof req.file.buffer}`);

    // Validate file extension
    const fileName = req.file.originalname.toLowerCase();
    if (!fileName.endsWith('.xlsx')) {
      console.error(`Invalid file type: ${fileName}`);
      return res.status(400).json({
        success: false,
        error: 'Invalid file type. Only .xlsx files are accepted'
      });
    }

    console.log('✓ File validation passed');

    // Parse the Excel file
    console.log('Calling parseExcelFileFromBuffer...');
    console.log(`Buffer is: ${req.file.buffer ? 'present' : 'missing'}`);
    
    const parseResult = parseExcelFileFromBuffer(req.file.buffer);
    
    console.log('Parse result:', {
      success: parseResult.success,
      error: parseResult.error,
      dataSources: parseResult.data?.dataSources
    });

    if (!parseResult.success) {
      console.error(`❌ Parsing failed: ${parseResult.error}`);
      return res.status(400).json({
        success: false,
        error: parseResult.error
      });
    }

    console.log('✓ Excel file parsed successfully');
    console.log(`  - Sales products: ${parseResult.data.dataSources.salesData}`);
    console.log(`  - Stock products: ${parseResult.data.dataSources.stockData}`);
    console.log(`  - Store names: ${parseResult.data.storeNames.join(', ')}`);

    // Load thresholds config
    if (!currentConfig) {
      try {
        console.log('Loading thresholds config...');
        currentConfig = loadThresholdsConfig();
        console.log('✓ Config loaded successfully');
      } catch (error) {
        console.error(`❌ Config loading failed: ${error.message}`);
        return res.status(500).json({
          success: false,
          error: `Failed to load thresholds config: ${error.message}`
        });
      }
    }

    // Generate notifications
    console.log('Generating notifications...');
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
    console.log(`  - LOW: ${notificationResult.summary.low}`);
    console.log(`  - Stock: ${notificationResult.summary.byCategory.Stock}`);
    console.log(`  - Sales: ${notificationResult.summary.byCategory.Sales}`);

    console.log('=== FILE UPLOAD COMPLETED SUCCESSFULLY ===\n');

    // Return success response
    res.json({
      success: true,
      data: {
        fileName: req.file.originalname,
        uploadTime: new Date().toISOString(),
        parsedData: {
          salesProducts: parseResult.data.dataSources.salesData,
          stockProducts: parseResult.data.dataSources.stockData,
          storeNames: parseResult.data.storeNames
        },
        notifications: currentNotifications,
        summary: notificationResult.summary
      }
    });
  } catch (error) {
    console.error(`❌ FATAL SERVER ERROR: ${error.message}`);
    console.error('Stack trace:', error.stack);
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