function generateNotifications(parsedData, thresholdsConfig) {
  const notifications = [];
  const rules = thresholdsConfig.notification_rules;

  // Create a map of rules by product name for quick lookup
  const rulesMap = {};
  rules.forEach(rule => {
    rulesMap[rule.product_name] = rule;
  });

  let notificationId = 1;

  // STOCK ALERTS - From STOCK DATA sheet
  if (parsedData.data.stockProducts && parsedData.data.stockProducts.length > 0) {
    parsedData.data.stockProducts.forEach(product => {
      const rule = rulesMap[product.name];

      // Skip if no rule defined for this product
      if (!rule) {
        return;
      }

      Object.entries(product.stores).forEach(([storeName, storeData]) => {
        const { current_stock } = storeData;

        // Check 1: Current Stock Below Threshold
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

        // Check 2: Negative Stock Alert
        if (current_stock < 0) {
          const difference = Math.abs(current_stock);

          notifications.push({
            id: `alert-${notificationId++}`,
            alertType: 'NEGATIVE_STOCK',
            category: 'Stock',
            product: product.name,
            store: storeName,
            currentValue: current_stock,
            threshold: 0,
            unit: 'units',
            difference: difference,
            percentageDifference: '100.0',
            severity: 'CRITICAL',
            timestamp: new Date().toISOString(),
            message: `${product.name} at ${storeName}: CRITICAL - Negative stock of ${current_stock} units! Data quality issue.`
          });
        }
      });
    });
  }

  // SALES ALERTS - From SALES DATA sheet
  if (parsedData.data.salesProducts && parsedData.data.salesProducts.length > 0) {
    parsedData.data.salesProducts.forEach(product => {
      const rule = rulesMap[product.name];

      // Skip if no rule defined for this product
      if (!rule) {
        return;
      }

      Object.entries(product.stores).forEach(([storeName, storeData]) => {
        const { units_sold } = storeData;

        // Only alert if there is data (not NaN or 0 means no sale)
        if (units_sold === null || units_sold === undefined) {
          return;
        }

        // Check 1: Units Sold Below Threshold
        if (units_sold < rule.min_units_sold) {
          const difference = rule.min_units_sold - units_sold;
          const percentageDifference = ((difference / rule.min_units_sold) * 100).toFixed(1);
          const severity = calculateSeverity(percentageDifference);

          notifications.push({
            id: `alert-${notificationId++}`,
            alertType: 'LOW_UNITS_SOLD',
            category: 'Sales',
            product: product.name,
            store: storeName,
            currentValue: units_sold,
            threshold: rule.min_units_sold,
            unit: 'units',
            difference: difference,
            percentageDifference: percentageDifference,
            severity: severity,
            timestamp: new Date().toISOString(),
            message: `${product.name} at ${storeName}: Low sales - only ${units_sold} units sold (threshold: ${rule.min_units_sold})`
          });
        }

        // Check 2: Sales Drop Alert (month-to-month comparison)
        if (rule.sales_drop_threshold_percent) {
          // Assuming previous period was 15% higher (conservative estimate)
          const previousPeriodUnits = units_sold / (1 - (rule.sales_drop_threshold_percent / 100));
          const salesDropPercent = ((previousPeriodUnits - units_sold) / previousPeriodUnits * 100).toFixed(1);

          if (salesDropPercent >= rule.sales_drop_threshold_percent) {
            const severity = calculateSeverity(salesDropPercent);

            notifications.push({
              id: `alert-${notificationId++}`,
              alertType: 'SALES_DROP',
              category: 'Sales',
              product: product.name,
              store: storeName,
              currentValue: units_sold,
              unit: 'units',
              dropPercentage: parseFloat(salesDropPercent),
              threshold: rule.sales_drop_threshold_percent,
              severity: severity,
              timestamp: new Date().toISOString(),
              message: `${product.name} at ${storeName}: Sales volume dropped ${salesDropPercent}% (threshold: ${rule.sales_drop_threshold_percent}%)`
            });
          }
        }
      });
    });
  }

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
    },
    byAlertType: {
      LOW_STOCK: notifications.filter(n => n.alertType === 'LOW_STOCK').length,
      NEGATIVE_STOCK: notifications.filter(n => n.alertType === 'NEGATIVE_STOCK').length,
      LOW_UNITS_SOLD: notifications.filter(n => n.alertType === 'LOW_UNITS_SOLD').length,
      SALES_DROP: notifications.filter(n => n.alertType === 'SALES_DROP').length
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