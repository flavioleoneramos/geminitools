import { GoogleGenerativeAI } from '@google/generative-ai';
import { GoogleAIFileManager } from '@google/generative-ai/server';
import fs from 'fs';
import path from 'path';
import formidable from 'formidable';
import mysql from 'mysql2/promise';

export const config = {
  api: {
    bodyParser: false, // Desabilita o parsing automático do body para lidar com multipart/form-data
  },
};

async function saveMessages(email, msgUser, msgBot) {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'gemini',
  });

  try {
    const [result] = await connection.execute(
      'INSERT INTO AudioToText (email, msguser, msgbot) VALUES (?, ?, ?)',
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
      // Parse do formulário
      const { fields, files } = await parseForm(req);

      const prompt = fields.prompt && Array.isArray(fields.prompt) ? fields.prompt[0] : fields.prompt; // Trata o prompt corretamente
      const audioFile = files.audio && Array.isArray(files.audio) ? files.audio[0] : files.audio; // Trata o arquivo de áudio

      // Verifique se o arquivo de áudio foi enviado corretamente
      if (!audioFile || !audioFile.filepath) {
        return res.status(400).json({ error: 'Arquivo de áudio não encontrado.' });
      }

      // Cria o diretório temporário
      const tempDir = createTempDir();
      const tempFilePath = path.join(tempDir, audioFile.newFilename); // Usa o nome do arquivo correto

      // Move o arquivo para a pasta temporária (renomeia se necessário)
      fs.renameSync(audioFile.filepath, tempFilePath);

      const fileManager = new GoogleAIFileManager(process.env.API_KEY);

      // Upload do arquivo para o Google AI
      const uploadResponse = await fileManager.uploadFile(tempFilePath, {
        mimeType: "audio/mp3", // Usa o mimeType correto
        displayName: 'Áudio do usuário',
      });

      const fileUri = uploadResponse.file.uri;
      console.log('File URI:', fileUri);
      console.log('MIME Type:', audioFile.mimetype);
      console.log('Prompt:', prompt);
      const genAI = new GoogleGenerativeAI(process.env.API_KEY);

      const model = genAI.getGenerativeModel({
        model: 'gemini-2.0-flash-exp',
      });

      const result = await model.generateContent([
        {
          fileData: {
            mimeType: "audio/mp3", // Usa o mimeType correto
            fileUri: fileUri,
          },
        },
        { text: prompt },
      ]);

      // Após o upload, exclui o arquivo temporário
      deleteTempFile(tempFilePath);
      await saveMessages("flavioleone8383@gmail.com", prompt, result.response.text());
      // Enviar resposta ao cliente
      return res.status(200).json({ response: result.response.text() });
    } catch (error) {
      console.error('Error:', error);
      return res.status(500).json({ error: 'Erro ao processar o áudio' });
    }
  } else {
    return res.status(405).json({ error: 'Método não permitido' });
  }
}
