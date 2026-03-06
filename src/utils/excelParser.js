const xlsx = require('xlsx');

function safeString(value) {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  return String(value);
}

function safeTrim(value) {
  const str = safeString(value);
  if (typeof str.trim === 'function') {
    return str.trim();
  }
  return str;
}

function safeInt(value) {
  if (value === null || value === undefined || value === '') return 0;
  const num = Number(value);
  return isNaN(num) ? 0 : Math.round(num);
}

function parseExcelFileFromBuffer(buffer) {
  try {
    console.log('Starting Excel parsing...');
    
    const workbook = xlsx.read(buffer, { type: 'buffer' });
    console.log('Workbook loaded. Sheets:', workbook.SheetNames);

    const hasSalesData = workbook.SheetNames.includes('SALES DATA');
    const hasStockData = workbook.SheetNames.includes('STOCK DATA');

    if (!hasSalesData && !hasStockData) {
      return {
        success: false,
        error: 'Excel file must contain "SALES DATA" and/or "STOCK DATA" sheets'
      };
    }

    let salesProducts = [];
    let stockProducts = [];
    let storeNames = [];

    // Parse SALES DATA sheet
    if (hasSalesData) {
      console.log('Parsing SALES DATA sheet...');
      try {
        const salesWorksheet = workbook.Sheets['SALES DATA'];
        const salesData = xlsx.utils.sheet_to_json(salesWorksheet, { header: 1 });
        
        console.log(`SALES DATA has ${salesData.length} rows`);

        if (salesData.length < 2) {
          throw new Error('SALES DATA sheet must have headers and data');
        }

        // Extract store names
        console.log('Extracting store names...');
        const rawHeaders = salesData[0];
        console.log('Raw headers count:', rawHeaders ? rawHeaders.length : 0);
        
        if (rawHeaders && rawHeaders.length > 5) {
          storeNames = [];
          for (let i = 5; i < rawHeaders.length; i++) {
            const headerVal = rawHeaders[i];
            if (headerVal !== undefined && headerVal !== null && headerVal !== '') {
              const headerStr = safeTrim(headerVal);
              if (headerStr.length > 0) {
                storeNames.push(headerStr);
              }
            }
          }
        }
        
        console.log('Store names extracted:', storeNames);

        // Parse sales rows
        console.log('Parsing sales data rows...');
        for (let rowIndex = 1; rowIndex < salesData.length; rowIndex++) {
          const row = salesData[rowIndex];
          
          if (!row || !Array.isArray(row) || row.length < 3) {
            continue;
          }

          const productName = safeTrim(row[2]);
          if (!productName) {
            continue;
          }

          const category1 = safeTrim(row[0]);
          const category2 = safeTrim(row[1]);
          const fullCategory = category2 ? `${category1} / ${category2}` : category1;

          const stores = {};
          for (let storeIndex = 0; storeIndex < storeNames.length; storeIndex++) {
            const storeName = storeNames[storeIndex];
            const unitsSold = safeInt(row[5 + storeIndex]);
            stores[storeName] = { units_sold: unitsSold };
          }

          salesProducts.push({
            name: productName,
            category: fullCategory,
            stores: stores
          });
        }
        
        console.log(`Parsed ${salesProducts.length} products from SALES DATA`);
      } catch (err) {
        console.error('Error parsing SALES DATA:', err.message);
        throw err;
      }
    }

    // Parse STOCK DATA sheet
    if (hasStockData) {
      console.log('Parsing STOCK DATA sheet...');
      try {
        const stockWorksheet = workbook.Sheets['STOCK DATA'];
        const stockData = xlsx.utils.sheet_to_json(stockWorksheet, { header: 1 });
        
        console.log(`STOCK DATA has ${stockData.length} rows`);

        if (stockData.length < 2) {
          throw new Error('STOCK DATA sheet must have headers and data');
        }

        // Extract store names from stock if not already extracted
        console.log('Extracting stock store names...');
        const rawHeaders = stockData[0];
        console.log('Raw stock headers count:', rawHeaders ? rawHeaders.length : 0);
        
        let stockStoreNames = [];
        if (rawHeaders && rawHeaders.length > 4) {
          for (let i = 4; i < rawHeaders.length; i++) {
            const headerVal = rawHeaders[i];
            if (headerVal !== undefined && headerVal !== null && headerVal !== '') {
              const headerStr = safeTrim(headerVal);
              if (headerStr.length > 0) {
                stockStoreNames.push(headerStr);
              }
            }
          }
        }
        
        console.log('Stock store names extracted:', stockStoreNames);

        if (storeNames.length === 0) {
          storeNames = stockStoreNames;
        }

        // Parse stock rows
        console.log('Parsing stock data rows...');
        for (let rowIndex = 1; rowIndex < stockData.length; rowIndex++) {
          const row = stockData[rowIndex];
          
          if (!row || !Array.isArray(row) || row.length < 3) {
            continue;
          }

          const productName = safeTrim(row[2]);
          if (!productName) {
            continue;
          }

          const category1 = safeTrim(row[0]);
          const category2 = safeTrim(row[1]);
          const fullCategory = category2 ? `${category1} / ${category2}` : category1;

          const stores = {};
          for (let storeIndex = 0; storeIndex < stockStoreNames.length; storeIndex++) {
            const storeName = stockStoreNames[storeIndex];
            const currentStock = safeInt(row[4 + storeIndex]);
            stores[storeName] = { current_stock: currentStock };
          }

          stockProducts.push({
            name: productName,
            category: fullCategory,
            stores: stores
          });
        }
        
        console.log(`Parsed ${stockProducts.length} products from STOCK DATA`);
      } catch (err) {
        console.error('Error parsing STOCK DATA:', err.message);
        throw err;
      }
    }

    console.log('Excel parsing completed successfully');
    return {
      success: true,
      data: {
        salesProducts: salesProducts,
        stockProducts: stockProducts,
        storeNames: storeNames,
        uploadDate: new Date().toISOString(),
        dataSources: {
          salesData: salesProducts.length,
          stockData: stockProducts.length
        }
      }
    };
  } catch (error) {
    console.error('Fatal error in parseExcelFileFromBuffer:', error.message);
    console.error('Error stack:', error.stack);
    return {
      success: false,
      error: `Failed to parse Excel file: ${error.message}`
    };
  }
}

module.exports = {
  parseExcelFileFromBuffer
};