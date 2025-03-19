import fs from 'fs';
import path from 'path';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let uploadPath = '';

    switch (file.mimetype) {
      case 'image/jpeg':
      case 'image/png':
        uploadPath = path.join(process.cwd(), 'public/photos');
        break;
      case 'audio/mpeg':
        uploadPath = path.join(process.cwd(), 'public/audios');
        break;
      case 'video/mp4':
        uploadPath = path.join(process.cwd(), 'public/videos');
        break;
      case 'application/pdf':
        uploadPath = path.join(process.cwd(), 'public/pdf');
        break;
      default:
        return cb(new Error('Tipo de arquivo não suportado'), '');
    }

    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }

    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}-${file.originalname}`;
    cb(null, uniqueName);
  },
});

const upload = multer({ storage });

export const config = {
  api: {
    bodyParser: false, // Desativa o bodyParser para permitir o uso do multer
  },
};

export default function handler(req, res) {
  if (req.method === 'POST') {
    upload.single('file')(req, res, (err) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      let filePath = req.file.path.replace(process.cwd(), '');

      filePath = filePath.replace(/\\/g, '/').replace('/public', '');

      res.status(200).json({ filePath });
    });
  } else {
    res.status(405).json({ error: 'Método não permitido' });
  }
}