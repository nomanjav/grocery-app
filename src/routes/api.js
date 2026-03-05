const express = require('express');
const multer = require('multer');
const path = require('path');
const {
  handleFileUpload,
  getNotifications,
  getNotificationsSummary,
  getConfig
} = require('../controllers/uploadController');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../../data'));
  },
  filename: (req, file, cb) => {
    cb(null, `upload-${Date.now()}.xlsx`);
  }
});

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext === '.xlsx') {
      cb(null, true);
    } else {
      cb(new Error('Only .xlsx files are allowed'));
    }
  }
});

// Routes
router.post('/upload', upload.single('file'), handleFileUpload);
router.get('/notifications', getNotifications);
router.get('/notifications/summary', getNotificationsSummary);
router.get('/config', getConfig);

module.exports = router;
