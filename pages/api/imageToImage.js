// /pages/api/imageToImage.js

import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';
import multer from 'multer';
import mysql from 'mysql2/promise';
import { v4 as uuidv4 } from 'uuid';
import fetch from 'node-fetch';
const emailUser = process.env.EMAILUSER;
async function saveMessages(email, msgUser, msgBot) {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'gemini',
  });

  try {
    const [result] = await connection.execute(
      'INSERT INTO imagetoimage (email, msguser, msgbot) VALUES (?, ?, ?)',
      [email, msgUser, msgBot]
    );

    if (result.affectedRows > 0) {
      console.log('Mensagens inseridas com sucesso.');
      return { message: 'Mensagens inseridas com sucesso.' };
    } else {
      console.log('Falha ao inserir mensagens.');
      return { message: 'Falha ao inserir mensagens.' };
    }
  } catch (error) {
    console.error('Erro ao inserir mensagens:', error);
    throw error;
  } finally {
    await connection.end();
  }
}

async function salvarArquivo(imageUrl) {
  try {
    // Faz o download da imagem
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error('Erro ao fazer o download da imagem');
    }
    const buffer = await response.buffer();

    // Gera um nome único para o arquivo
    const uniqueName = `${uuidv4()}.png`;

    // Define o caminho para salvar a imagem
    const uploadPath = path.join(process.cwd(), '/public/imagens', uniqueName);

    // Cria a pasta se não existir
    if (!fs.existsSync(path.dirname(uploadPath))) {
      fs.mkdirSync(path.dirname(uploadPath), { recursive: true });
    }

    // Salva a imagem no sistema de arquivos
    fs.writeFileSync(uploadPath, buffer);

    // Retorna o caminho relativo da imagem
    const relativePath = `/imagens/${uniqueName}`;
    return relativePath;
  } catch (error) {
    throw new Error('Erro ao salvar o arquivo');
  }
}

// Configura a OpenAI com a chave de API
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Configura o multer para salvar as imagens no servidor
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(process.cwd(), 'public/photos');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

const upload = multer({ storage });

export const config = {
  api: {
    bodyParser: false, // Desativa o bodyParser para permitir o uso do multer
  },
};

// Middleware para tratar o upload das imagens
const uploadMiddleware = upload.fields([{ name: 'image', maxCount: 1 }]);

export default async function handler(req, res) {
  try {
    if (req.method === 'POST') {
      // Faz o upload das imagens
      await new Promise((resolve, reject) => {
        uploadMiddleware(req, res, (err) => {
          if (err) return reject(err);
          resolve();
        });
      });

      // Obtém os caminhos das imagens e o texto
      const imagePath = req.files['image'][0].path;
      const { text } = req.body;

      // Envia as imagens e o texto para a API da OpenAI
      const response = await openai.images.edit({
        image: fs.createReadStream(imagePath),
        prompt: text,
        n: 1,
        size: '1024x1024',
      });

      const imageUrl = response.data[0].url;
      console.log('URL da imagem gerada:', imageUrl);

      const imgSalvo = await salvarArquivo(imageUrl);
      await saveMessages(emailUser, text, imgSalvo);
      // Retorna a URL da imagem gerada para o frontend
      res.status(200).json({ imageUrl: imgSalvo });
    } else {
      res.status(405).json({ error: 'Método não permitido' });
    }
  } catch (error) {
    console.error('Erro ao processar imagens:', error);
    res.status(500).json({ error: 'Erro ao processar imagens.' });
  }
}



function formatText(text) {
  if (!text) return '';

  // Adiciona quebras de linha
  let formattedText = text.replace(/\n/g, '<br>');

  // Transforma texto entre ** em negrito
  formattedText = formattedText.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>');

  // Transforma texto entre * em itálico
  formattedText = formattedText.replace(/\*(.*?)\*/g, '<em>$1</em>');

  return formattedText;
}


