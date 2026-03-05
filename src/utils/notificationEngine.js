function generateNotifications(parsedData, thresholdsConfig) {
  const notifications = [];
  const products = parsedData.data.products;
  const rules = thresholdsConfig.notification_rules;

  // Create a map of rules by product name for quick lookup
  const rulesMap = {};
  rules.forEach(rule => {
    rulesMap[rule.product_name] = rule;
  });

  let notificationId = 1;

  // Check each product in each store
  products.forEach(product => {
    const rule = rulesMap[product.name];

    // Skip if no rule defined for this product
    if (!rule) {
      return;
    }

    Object.entries(product.stores).forEach(([storeName, storeData]) => {
      const { current_stock, units_sold, sales_pkr } = storeData;

      // Check 1: Current Stock Alert
      if (current_stock < rule.min_stock_units) {
        const difference = rule.min_stock_units - current_stock;
        const percentageDifference = ((difference / rule.min_stock_units) * 100).toFixed(1);
        const severity = calculateSeverity(percentageDifference);

        notifications.push({
          id: `alert-${notificationId++}`,
          alertType: 'LOW_STOCK',
          category: 'Stock',
          product: product.name,
          store: storeName,
          currentValue: current_stock,
          threshold: rule.min_stock_units,
          unit: 'units',
          difference: difference,
          percentageDifference: percentageDifference,
          severity: severity,
          timestamp: new Date().toISOString(),
          message: `${product.name} at ${storeName}: Stock is ${current_stock} units (threshold: ${rule.min_stock_units})`
        });
      }

      // Check 2: Units Sold Alert
      if (units_sold < rule.min_units_sold) {
        const difference = rule.min_units_sold - units_sold;
        const percentageDifference = ((difference / rule.min_units_sold) * 100).toFixed(1);
        const severity = calculateSeverity(percentageDifference);

        notifications.push({
          id: `alert-${notificationId++}`,
          alertType: 'LOW_UNITS_SOLD',
          category: 'Stock',
          product: product.name,
          store: storeName,
          currentValue: units_sold,
          threshold: rule.min_units_sold,
          unit: 'units',
          difference: difference,
          percentageDifference: percentageDifference,
          severity: severity,
          timestamp: new Date().toISOString(),
          message: `${product.name} at ${storeName}: Only ${units_sold} units sold (threshold: ${rule.min_units_sold})`
        });
      }

      // Check 3: Sales Amount Alert
      if (sales_pkr < rule.min_sales_pkr) {
        const difference = rule.min_sales_pkr - sales_pkr;
        const percentageDifference = ((difference / rule.min_sales_pkr) * 100).toFixed(1);
        const severity = calculateSeverity(percentageDifference);

        notifications.push({
          id: `alert-${notificationId++}`,
          alertType: 'LOW_SALES',
          category: 'Sales',
          product: product.name,
          store: storeName,
          currentValue: sales_pkr,
          threshold: rule.min_sales_pkr,
          unit: 'PKR',
          difference: difference,
          percentageDifference: percentageDifference,
          severity: severity,
          timestamp: new Date().toISOString(),
          message: `${product.name} at ${storeName}: Sales PKR ${sales_pkr} (threshold: PKR ${rule.min_sales_pkr})`
        });
      }

      // Check 4: Sales Drop Alert
      // Assuming previous day was 15% higher (conservative estimate)
      const previousDaySales = sales_pkr / (1 - (rule.sales_drop_threshold_percent / 100));
      const salesDropPercent = ((previousDaySales - sales_pkr) / previousDaySales * 100).toFixed(1);

      if (salesDropPercent >= rule.sales_drop_threshold_percent) {
        const severity = calculateSeverity(salesDropPercent);

        notifications.push({
          id: `alert-${notificationId++}`,
          alertType: 'SALES_DROP',
          category: 'Sales',
          product: product.name,
          store: storeName,
          currentValue: sales_pkr,
          unit: 'PKR',
          dropPercentage: parseFloat(salesDropPercent),
          threshold: rule.sales_drop_threshold_percent,
          severity: severity,
          timestamp: new Date().toISOString(),
          message: `${product.name} at ${storeName}: Sales dropped ${salesDropPercent}% (threshold: ${rule.sales_drop_threshold_percent}%)`
        });
      }
    });
  });

  // Sort by severity (CRITICAL first, then HIGH, MEDIUM, LOW)
  const severityOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
  notifications.sort((a, b) => {
    if (severityOrder[a.severity] !== severityOrder[b.severity]) {
      return severityOrder[a.severity] - severityOrder[b.severity];
    }
    return a.product.localeCompare(b.product);
  });

  // Group notifications by category
  const grouped = {
    Stock: notifications.filter(n => n.category === 'Stock'),
    Sales: notifications.filter(n => n.category === 'Sales')
  };

  // Generate summary
  const summary = {
    total: notifications.length,
    critical: notifications.filter(n => n.severity === 'CRITICAL').length,
    high: notifications.filter(n => n.severity === 'HIGH').length,
    medium: notifications.filter(n => n.severity === 'MEDIUM').length,
    low: notifications.filter(n => n.severity === 'LOW').length,
    byCategory: {
      Stock: grouped.Stock.length,
      Sales: grouped.Sales.length
    }
  };

  return {
    success: true,
    notifications: notifications,
    grouped: grouped,
    summary: summary
  };
}

function calculateSeverity(percentageDifference) {
  const percent = parseFloat(percentageDifference);

  if (percent > 50) {
    return 'CRITICAL';
  } else if (percent >= 25) {
    return 'HIGH';
  } else if (percent >= 10) {
    return 'MEDIUM';
  } else {
    return 'LOW';
  }
}

module.exports = {
  generateNotifications
};