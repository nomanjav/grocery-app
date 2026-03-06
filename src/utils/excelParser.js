const xlsx = require('xlsx');

function parseExcelFileFromBuffer(buffer) {
  try {
    const workbook = xlsx.read(buffer, { type: 'buffer' });

    // Check which sheets exist
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

    // Parse SALES DATA sheet if it exists
    if (hasSalesData) {
      const salesWorksheet = workbook.Sheets['SALES DATA'];
      const salesData = xlsx.utils.sheet_to_json(salesWorksheet, { header: 1 });

      if (salesData.length < 2) {
        return {
          success: false,
          error: 'SALES DATA sheet must have headers and data'
        };
      }

      // Extract store names from sales data headers (columns F onwards, skipping first 5 columns)
      // Row 0: ['1st Level Category', 'Last Level Category', 'ARTICLE NAME', 'MONTH', 'month2', 'WT', 'DFNR', 'BTL', ...]
      storeNames = salesData[0]
        .slice(5)
        .filter(name => name !== undefined && name !== null)
        .map(name => String(name).trim())
        .filter(name => name.length > 0);

      // Parse sales data (rows 1 onwards)
      for (let rowIndex = 1; rowIndex < salesData.length; rowIndex++) {
        const row = salesData[rowIndex];
        const productName = row[2]; // Column C is product name

        if (!productName) {
          continue;
        }

        const productNameStr = String(productName).trim();
        if (!productNameStr) {
          continue;
        }

        const category1 = row[0] ? String(row[0]).trim() : '';
        const category2 = row[1] ? String(row[1]).trim() : '';
        const fullCategory = category2 ? `${category1} / ${category2}` : category1;

        const stores = {};
        for (let storeIndex = 0; storeIndex < storeNames.length; storeIndex++) {
          const storeName = storeNames[storeIndex];
          const value = row[5 + storeIndex];
          
          // Handle NaN or undefined values
          let unitsSold = 0;
          if (value !== undefined && value !== null && !isNaN(value)) {
            unitsSold = parseInt(value) || 0;
          }

          stores[storeName] = {
            units_sold: unitsSold
          };
        }

        salesProducts.push({
          name: productNameStr,
          category: fullCategory,
          stores: stores
        });
      }
    }

    // Parse STOCK DATA sheet if it exists
    if (hasStockData) {
      const stockWorksheet = workbook.Sheets['STOCK DATA'];
      const stockData = xlsx.utils.sheet_to_json(stockWorksheet, { header: 1 });

      if (stockData.length < 2) {
        return {
          success: false,
          error: 'STOCK DATA sheet must have headers and data'
        };
      }

      // Extract store names from stock data headers (columns E onwards, skipping first 4 columns)
      // Row 0: ['1st Level Category', 'Last Level Category', 'ARTICLE NAME', 'month2', 'WT', 'DFNR', 'BTL', ...]
      const stockStoreNames = stockData[0]
        .slice(4)
        .filter(name => name !== undefined && name !== null)
        .map(name => String(name).trim())
        .filter(name => name.length > 0);
      
      // Use stock store names if sales store names weren't found
      if (storeNames.length === 0) {
        storeNames = stockStoreNames;
      }

      // Parse stock data (rows 1 onwards)
      for (let rowIndex = 1; rowIndex < stockData.length; rowIndex++) {
        const row = stockData[rowIndex];
        const productName = row[2]; // Column C is product name

        if (!productName) {
          continue;
        }

        const productNameStr = String(productName).trim();
        if (!productNameStr) {
          continue;
        }

        const category1 = row[0] ? String(row[0]).trim() : '';
        const category2 = row[1] ? String(row[1]).trim() : '';
        const fullCategory = category2 ? `${category1} / ${category2}` : category1;

        const stores = {};
        for (let storeIndex = 0; storeIndex < stockStoreNames.length; storeIndex++) {
          const storeName = stockStoreNames[storeIndex];
          const value = row[4 + storeIndex];
          
          // Handle NaN or undefined values
          let currentStock = 0;
          if (value !== undefined && value !== null && !isNaN(value)) {
            currentStock = parseInt(value) || 0;
          }

          stores[storeName] = {
            current_stock: currentStock
          };
        }

        stockProducts.push({
          name: productNameStr,
          category: fullCategory,
          stores: stores
        });
      }
    }

    return {
      success: true,
      data: {
        salesProducts: salesProducts,
        stockProducts: stockProducts,
        storeNames: storeNames,
        uploadDate: new Date().toISOString(),
        dataSources: {
          salesData: hasSalesData ? salesProducts.length : 0,
          stockData: hasStockData ? stockProducts.length : 0
        }
      }
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to parse Excel file: ${error.message}`
    };
  }
}

module.exports = {
  parseExcelFileFromBuffer
};