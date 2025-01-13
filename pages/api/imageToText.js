import { GoogleGenerativeAI } from '@google/generative-ai';
import { GoogleAIFileManager } from '@google/generative-ai/server';
import fs from 'fs';
import path from 'path';
import formidable from 'formidable';
import mysql from 'mysql2/promise';

async function saveMessages(email, msgUser, msgBot) {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'gemini',
  });

  try {
    const [result] = await connection.execute(
      'INSERT INTO ImageToText (email, msguser, msgbot) VALUES (?, ?, ?)',
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

export const config = {
  api: {
    bodyParser: false, // Desabilita o parsing automático do body para lidar com multipart/form-data
  },
};

// Função para parse do formulário utilizando Promise
const parseForm = (req) => {
  return new Promise((resolve, reject) => {
    const form = formidable({ multiples: false, keepExtensions: true }); // Mantém a extensão do arquivo
    form.parse(req, (err, fields, files) => {
      if (err) reject(err);
      resolve({ fields, files });
    });
  });
};

// Função auxiliar para criar uma pasta temporária
const createTempDir = () => {
  const tempDir = path.join(process.cwd(), 'temp');
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir);
  }
  return tempDir;
};

// Função auxiliar para remover o arquivo temporário após o upload
const deleteTempFile = (filePath) => {
  fs.unlink(filePath, (err) => {
    if (err) console.error('Erro ao deletar arquivo temporário:', err);
  });
};

export default async function handler(req, res) {
  if (req.method === 'POST') {
    try {
      // Configura o formidable para salvar o arquivo diretamente na pasta public/photos
      const form = formidable({
        uploadDir: path.join(process.cwd(), 'public/photos'),
        keepExtensions: true,
        filename: (name, ext, part, form) => {
          return `${Date.now()}-${part.originalFilename}`;
        },
      });

      // Parse do formulário
      form.parse(req, async (err, fields, files) => {
        if (err) {
          console.error('Error parsing form:', err);
          return res.status(400).json({ error: 'Erro ao processar o formulário' });
        }

        const prompt = fields.prompt && Array.isArray(fields.prompt) ? fields.prompt[0] : fields.prompt; // Trata o prompt corretamente
        const imageFile = files.image && Array.isArray(files.image) ? files.image[0] : files.image; // Trata o arquivo de imagem

        // Verifique se o arquivo de imagem foi enviado corretamente
        if (!imageFile || !imageFile.filepath) {
          return res.status(400).json({ error: 'Arquivo de imagem não encontrado.' });
        }

        const imageUser = `http://localhost:3000/photos/${path.basename(imageFile.filepath)}`; // Caminho relativo da imagem salva

        // Continue com sua lógica existente para processar o arquivo com a API do Google AI
        const fileManager = new GoogleAIFileManager(process.env.API_KEY);

        // Upload do arquivo para o Google AI
        const uploadResponse = await fileManager.uploadFile(imageFile.filepath, {
          mimeType: imageFile.mimetype,
          displayName: 'Imagem do usuário',
        });

        const fileUri = uploadResponse.file.uri;

        const genAI = new GoogleGenerativeAI(process.env.API_KEY);

        const model = genAI.getGenerativeModel({
          model: 'gemini-2.0-flash-exp',
        });

        const result = await model.generateContent([
          {
            fileData: {
              mimeType: imageFile.mimetype,
              fileUri: fileUri,
            },
          },
          { text: prompt },
        ]);

        // Enviar resposta ao cliente
        await saveMessages("flavioleone8383@gmail.com", `${prompt} \n ${imageUser}`, result.response.text());
        return res.status(200).json({ response: result.response.text(), imagePath: imageUser });
      });
    } catch (error) {
      console.error('Error:', error);
      return res.status(500).json({ error: 'Erro ao processar a imagem' });
    }
  } else {
    return res.status(405).json({ error: 'Método não permitido' });
  }
}

