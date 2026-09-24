const fs = require('fs/promises');
const path = require('path');
const crypto = require('crypto');
const multer = require('multer');
const sharp = require('sharp');
const cloudinary = require('cloudinary').v2;

const UPLOAD_DIR = path.join(__dirname, '..', 'uploads');
const ALLOWED = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
const MAX_SIDE = 1600;

/**
 * With CLOUDINARY_URL set (cloudinary://<key>:<secret>@<cloud>), images go to Cloudinary, which
 * also serves resized/WebP versions on the fly. Without it they are shrunk and stored in ./uploads.
 */
const useCloudinary = () => !!process.env.CLOUDINARY_URL;

exports.uploadImages = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 8 },
  fileFilter: (req, file, cb) =>
    ALLOWED.has(file.mimetype)
      ? cb(null, true)
      : cb(new multer.MulterError('LIMIT_UNEXPECTED_FILE', 'Only JPG, PNG, WEBP or GIF images are allowed')),
}).array('images', 8);

const toCloudinary = (buffer) =>
  new Promise((resolve, reject) => {
    cloudinary.config({ secure: true });
    cloudinary.uploader
      .upload_stream(
        {
          folder: process.env.CLOUDINARY_FOLDER || 'dopeshope/products',
          resource_type: 'image',
          // Store a sensible master; delivery sizes/formats are chosen per request
          transformation: [{ width: MAX_SIDE, height: MAX_SIDE, crop: 'limit' }],
        },
        (error, result) => (error ? reject(error) : resolve(result.secure_url))
      )
      .end(buffer);
  });

const toLocalDisk = async (buffer, req) => {
  await fs.mkdir(UPLOAD_DIR, { recursive: true });
  const name = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}.webp`;
  await sharp(buffer)
    .rotate()
    .resize({ width: MAX_SIDE, height: MAX_SIDE, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 80 })
    .toFile(path.join(UPLOAD_DIR, name));
  const base = process.env.PUBLIC_URL || `${req.protocol}://${req.get('host')}`;
  return `${base}/uploads/${name}`;
};

/** Returns public URLs for the uploaded images */
exports.handleUpload = async (req, res) => {
  const files = req.files || [];
  if (files.length === 0) return res.status(400).json({ message: 'No image received' });
  try {
    const store = useCloudinary() ? toCloudinary : (buffer) => toLocalDisk(buffer, req);
    const urls = [];
    for (const file of files) urls.push(await store(file.buffer));
    res.status(201).json({ urls });
  } catch (error) {
    console.error('Upload failed:', error.message);
    res.status(502).json({ message: 'Could not save the image. Please try again.' });
  }
};

/** Turns multer errors into readable 400s */
exports.uploadErrors = (error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    const message = error.code === 'LIMIT_FILE_SIZE' ? 'Each image must be under 5 MB' : error.field || error.message;
    return res.status(400).json({ message });
  }
  next(error);
};

exports.UPLOAD_DIR = UPLOAD_DIR;
