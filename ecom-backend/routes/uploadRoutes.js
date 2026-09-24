const express = require('express');
const router = express.Router();
const { uploadImages, handleUpload, uploadErrors } = require('../controllers/uploadController');
const { requireAdmin } = require('../middleware/authMiddleware');

router.post('/', requireAdmin, uploadImages, handleUpload, uploadErrors);

module.exports = router;
