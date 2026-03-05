const xlsx = require('xlsx');
const path = require('path');

function parseExcelFile(filePath) {
  try {
    const workbook = xlsx.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    // Get all data as array of arrays
    const data = xlsx.utils.sheet_to_json(worksheet, { header: 1 });

    if (data.length < 6) {
      return {
        success: false,
        error: 'Excel file must have at least 6 rows (headers + data)'
      };
    }

    // Extract store names from row 4 (index 3)
    // Skip column A (product name), get B-S
    const storeNamesRaw = data[3].slice(1);
    const storeNames = storeNamesRaw.filter(name => name && name.trim());

    // Extract products from row 6 onwards (index 5+)
    const products = [];

    for (let rowIndex = 5; rowIndex < data.length; rowIndex++) {
      const row = data[rowIndex];

      // Product name is in column A
      const productName = row[0];
      if (!productName || !productName.toString().trim()) {
        continue;
      }

      const stores = {};
      let colIndex = 1;

      // Process 3 columns per store (Current Stock, Units Sold, Sales)
      for (let storeIndex = 0; storeIndex < storeNames.length; storeIndex++) {
        const storeName = storeNames[storeIndex];

        const currentStock = parseInt(row[colIndex]) || 0;
        const unitsSold = parseInt(row[colIndex + 1]) || 0;
        const salesPkr = parseInt(row[colIndex + 2]) || 0;

        stores[storeName] = {
          current_stock: currentStock,
          units_sold: unitsSold,
          sales_pkr: salesPkr
        };

        colIndex += 3;
      }

      products.push({
        name: productName.toString().trim(),
        stores: stores
      });
    }

    return {
      success: true,
      data: {
        products: products,
        uploadDate: new Date().toISOString(),
        storeNames: storeNames,
        productCount: products.length
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
  parseExcelFile
};
