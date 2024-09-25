import multer from 'multer';
import fs from 'fs';

// Multer setup to store files in the 'uploads' folder
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

export const upload = multer({ storage });

// Ensure the 'uploads' directory exists or create it
if (!fs.existsSync('uploads')) fs.mkdirSync('uploads');
