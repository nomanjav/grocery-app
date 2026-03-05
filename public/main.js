let allNotifications = [];
let groupedNotifications = {};
let currentFilter = 'all';
let currentSort = 'severity';
let currentCategory = 'all'; // Track which category is being viewed

document.addEventListener('DOMContentLoaded', () => {
  initializeApp();
});

function initializeApp() {
  setupFileUpload();
  setupCategoryTabs();
  setupFilterButtons();
  setupSearchBox();
  setupSortBox();
  setupExportButton();
}

function setupFileUpload() {
  const fileInput = document.getElementById('fileInput');
  const uploadBtn = document.getElementById('uploadBtn');
  const fileInfo = document.getElementById('fileInfo');

  fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
      fileInfo.innerHTML = `📄 ${file.name} (${(file.size / 1024).toFixed(2)} KB)`;
    }
  });

  uploadBtn.addEventListener('click', uploadFile);
}

function setupCategoryTabs() {
  const categoryTabs = document.querySelectorAll('.category-tab');
  
  categoryTabs.forEach(tab => {
    tab.addEventListener('click', (e) => {
      e.preventDefault();
      // Remove active from all tabs
      categoryTabs.forEach(t => t.classList.remove('active'));
      // Add active to clicked tab
      tab.classList.add('active');
      // Update current category
      currentCategory = tab.dataset.category;
      // Refresh display
      displayNotifications(filterAndSortNotifications());
    });
  });
}

function uploadFile() {
  const fileInput = document.getElementById('fileInput');
  const file = fileInput.files[0];
  const uploadStatus = document.getElementById('uploadStatus');
  const loadingSpinner = document.getElementById('loadingSpinner');

  if (!file) {
    showUploadStatus('Please select an Excel file', 'error');
    return;
  }

  if (!file.name.endsWith('.xlsx')) {
    showUploadStatus('Only .xlsx files are accepted', 'error');
    return;
  }

  // Show loading spinner
  loadingSpinner.classList.remove('hidden');

  const formData = new FormData();
  formData.append('file', file);

  fetch('/api/upload', {
    method: 'POST',
    body: formData
  })
    .then(response => response.json())
    .then(data => {
      loadingSpinner.classList.add('hidden');

      if (data.success) {
        allNotifications = data.data.notifications;
        groupedNotifications = data.data.grouped || groupNotifications(allNotifications);
        updateSummaryStats(data.data.summary);
        displayNotifications(allNotifications);
        showUploadStatus(`✓ Successfully processed ${data.data.fileName}`, 'success');
        fileInput.value = '';
        document.getElementById('fileInfo').innerHTML = '';
      } else {
        showUploadStatus(`Error: ${data.error}`, 'error');
      }
    })
    .catch(error => {
      loadingSpinner.classList.add('hidden');
      showUploadStatus(`Network error: ${error.message}`, 'error');
    });
}

function groupNotifications(notifications) {
  return {
    Stock: notifications.filter(n => n.category === 'Stock'),
    Sales: notifications.filter(n => n.category === 'Sales')
  };
}

function showUploadStatus(message, type) {
  const uploadStatus = document.getElementById('uploadStatus');
  uploadStatus.textContent = message;
  uploadStatus.className = `upload-status ${type}`;
}

function setupFilterButtons() {
  const filterBtns = document.querySelectorAll('.filter-btn');

  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentFilter = btn.dataset.filter;
      displayNotifications(filterAndSortNotifications());
    });
  });
}

function setupSearchBox() {
  const searchInput = document.getElementById('searchInput');

  searchInput.addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase();
    const filtered = allNotifications.filter(n => {
      return n.product.toLowerCase().includes(query) || n.store.toLowerCase().includes(query);
    });
    displayNotifications(filterAndSortNotifications(filtered));
  });
}

function setupSortBox() {
  const sortSelect = document.getElementById('sortSelect');

  sortSelect.addEventListener('change', (e) => {
    currentSort = e.target.value;
    displayNotifications(filterAndSortNotifications());
  });
}

function setupExportButton() {
  const exportBtn = document.getElementById('exportBtn');

  exportBtn.addEventListener('click', () => {
    if (allNotifications.length === 0) {
      alert('No notifications to export');
      return;
    }

    const dataStr = JSON.stringify(allNotifications, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `notifications-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  });
}

function filterAndSortNotifications(baseList = allNotifications) {
  let filtered = baseList;

  // Apply category filter
  if (currentCategory !== 'all') {
    filtered = filtered.filter(n => n.category === currentCategory);
  }

  // Apply severity filter
  if (currentFilter !== 'all') {
    filtered = filtered.filter(n => n.severity === currentFilter);
  }

  // Apply sorting
  const sorted = [...filtered].sort((a, b) => {
    switch (currentSort) {
      case 'severity':
        const severityOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
        return severityOrder[a.severity] - severityOrder[b.severity];
      case 'product':
        return a.product.localeCompare(b.product);
      case 'store':
        return a.store.localeCompare(b.store);
      case 'timestamp':
        return new Date(b.timestamp) - new Date(a.timestamp);
      default:
        return 0;
    }
  });

  return sorted;
}

function displayNotifications(notifications) {
  const container = document.getElementById('notificationsContainer');

  if (notifications.length === 0) {
    container.innerHTML = '<div class="empty-state"><p>📭 No notifications found.</p></div>';
    return;
  }

  // Group by category for display
  const grouped = {};
  notifications.forEach(n => {
    if (!grouped[n.category]) {
      grouped[n.category] = [];
    }
    grouped[n.category].push(n);
  });

  let html = '';

  // Display Stock notifications
  if (grouped['Stock'] && grouped['Stock'].length > 0) {
    html += '<div class="category-section"><h3 class="category-heading">📦 Stock Alerts</h3>';
    html += grouped['Stock'].map(n => createNotificationCard(n)).join('');
    html += '</div>';
  }

  // Display Sales notifications
  if (grouped['Sales'] && grouped['Sales'].length > 0) {
    html += '<div class="category-section"><h3 class="category-heading">💰 Sales Alerts</h3>';
    html += grouped['Sales'].map(n => createNotificationCard(n)).join('');
    html += '</div>';
  }

  container.innerHTML = html;
}

function createNotificationCard(notification) {
  const {
    id,
    alertType,
    product,
    store,
    currentValue,
    threshold,
    difference,
    percentageDifference,
    severity,
    timestamp,
    message,
    dropPercentage,
    unit
  } = notification;

  const severityClass = severity.toLowerCase();
  const timeStr = new Date(timestamp).toLocaleTimeString();

  let alertTypeDisplay = alertType;
  let valueDisplay = '';

  switch (alertType) {
    case 'LOW_STOCK':
      alertTypeDisplay = '📦 Low Stock';
      valueDisplay = `<div class="info-item"><span class="info-label">Current Stock</span><span class="info-value">${currentValue} ${unit}</span></div><div class="info-item"><span class="info-label">Threshold</span><span class="info-value">${threshold} ${unit}</span></div><div class="info-item"><span class="info-label">Below Threshold</span><span class="info-value">${percentageDifference}%</span></div>`;
      break;
    case 'LOW_UNITS_SOLD':
      alertTypeDisplay = '📊 Low Sales Volume';
      valueDisplay = `<div class="info-item"><span class="info-label">Units Sold</span><span class="info-value">${currentValue} ${unit}</span></div><div class="info-item"><span class="info-label">Threshold</span><span class="info-value">${threshold} ${unit}</span></div><div class="info-item"><span class="info-label">Below Threshold</span><span class="info-value">${percentageDifference}%</span></div>`;
      break;
    case 'LOW_SALES':
      alertTypeDisplay = '💰 Low Sales Amount';
      valueDisplay = `<div class="info-item"><span class="info-label">Sales (${unit})</span><span class="info-value">${currentValue}</span></div><div class="info-item"><span class="info-label">Threshold (${unit})</span><span class="info-value">${threshold}</span></div><div class="info-item"><span class="info-label">Below Threshold</span><span class="info-value">${percentageDifference}%</span></div>`;
      break;
    case 'SALES_DROP':
      alertTypeDisplay = '📉 Sales Drop';
      valueDisplay = `<div class="info-item"><span class="info-label">Current Sales (${unit})</span><span class="info-value">${currentValue}</span></div><div class="info-item"><span class="info-label">Drop Percentage</span><span class="info-value">${dropPercentage}%</span></div><div class="info-item"><span class="info-label">Threshold</span><span class="info-value">${threshold}%</span></div>`;
      break;
  }

  return `
    <div class="notification-card ${severityClass}" data-id="${id}">
      <div class="notification-header">
        <div>
          <div class="notification-title">
            <span class="alert-type">${alertTypeDisplay}</span>
            <span class="severity-badge ${severityClass}">${severity}</span>
          </div>
          <div style="margin-top: 10px; color: #6B7280; font-size: 0.9em;">
            ${product} • ${store} • ${timeStr}
          </div>
        </div>
      </div>
      <div class="notification-body">
        ${valueDisplay}
      </div>
      <div class="notification-message">
        ${message}
      </div>
    </div>
  `;
}

function updateSummaryStats(summary) {
  document.getElementById('statTotal').textContent = summary.total;
  document.getElementById('statCritical').textContent = summary.critical;
  document.getElementById('statHigh').textContent = summary.high;
  document.getElementById('statMedium').textContent = summary.medium;
  document.getElementById('statLow').textContent = summary.low;
  
  // Update category stats if available
  if (summary.byCategory) {
    document.getElementById('statStock').textContent = summary.byCategory.Stock || 0;
    document.getElementById('statSales').textContent = summary.byCategory.Sales || 0;
  }
}