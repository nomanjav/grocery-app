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
      storeNames = salesData[0].slice(5).filter(name => name && name.toString().trim());

      // Parse sales data (rows 1 onwards)
      for (let rowIndex = 1; rowIndex < salesData.length; rowIndex++) {
        const row = salesData[rowIndex];
        const productName = row[2]; // Column C is product name

        if (!productName || !productName.toString().trim()) {
          continue;
        }

        const category1 = row[0] || '';
        const category2 = row[1] || '';
        const fullCategory = `${category1}${category2 ? ' / ' + category2 : ''}`;

        const stores = {};
        for (let storeIndex = 0; storeIndex < storeNames.length; storeIndex++) {
          const storeName = storeNames[storeIndex];
          const unitsSold = parseInt(row[5 + storeIndex]) || 0;

          stores[storeName] = {
            units_sold: unitsSold
          };
        }

        salesProducts.push({
          name: productName.toString().trim(),
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
      const stockStoreNames = stockData[0].slice(4).filter(name => name && name.toString().trim());
      
      // Use stock store names if sales store names weren't found
      if (storeNames.length === 0) {
        storeNames = stockStoreNames;
      }

      // Parse stock data (rows 1 onwards)
      for (let rowIndex = 1; rowIndex < stockData.length; rowIndex++) {
        const row = stockData[rowIndex];
        const productName = row[2]; // Column C is product name

        if (!productName || !productName.toString().trim()) {
          continue;
        }

        const category1 = row[0] || '';
        const category2 = row[1] || '';
        const fullCategory = `${category1}${category2 ? ' / ' + category2 : ''}`;

        const stores = {};
        for (let storeIndex = 0; storeIndex < stockStoreNames.length; storeIndex++) {
          const storeName = stockStoreNames[storeIndex];
          const currentStock = parseInt(row[4 + storeIndex]) || 0;

          stores[storeName] = {
            current_stock: currentStock
          };
        }

        stockProducts.push({
          name: productName.toString().trim(),
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