const express = require('express');
const multer = require('multer');
const {
  handleFileUpload,
  getNotifications,
  getNotificationsSummary,
  getConfig
} = require('../controllers/uploadController');

const router = express.Router();

// Configure multer for memory storage (Vercel compatible)
const storage = multer.memoryStorage();

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    const fileName = file.originalname.toLowerCase();
    if (fileName.endsWith('.xlsx')) {
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