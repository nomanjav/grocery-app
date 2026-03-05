const fs = require('fs');
const path = require('path');

/**
 * Load and parse the thresholds configuration file
 * @returns {Object} The parsed configuration object
 * @throws {Error} If config file not found or JSON is invalid
 */
function loadThresholdsConfig() {
  try {
    const configPath = path.join(__dirname, '../../data/config/thresholds_config.json');
    
    // Check if file exists
    if (!fs.existsSync(configPath)) {
      throw new Error(`Config file not found at: ${configPath}`);
    }
    
    // Read the file
    const configData = fs.readFileSync(configPath, 'utf8');
    
    // Parse JSON
    const config = JSON.parse(configData);
    
    console.log('✓ Thresholds config loaded successfully');
    return config;
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error(`Invalid JSON in thresholds_config.json: ${error.message}`);
    }
    throw error;
  }
}

module.exports = {
  loadThresholdsConfig
};