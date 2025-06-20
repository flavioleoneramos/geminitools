import { GoogleGenerativeAI } from '@google/generative-ai';
import { GoogleAIFileManager } from '@google/generative-ai/server';
import fs from 'fs';
import path from 'path';
import formidable from 'formidable';
import mysql from 'mysql2/promise';

const emailUser = process.env.EMAILUSER;

export const config = {
  api: {
    bodyParser: false, // Desabilita o parsing automático do body para lidar com multipart/form-data
  },
};

async function saveMessages(email, msgUser, msgBot, audioPath) {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'gemini',
  });


  try {
    // Formatar o texto antes de salvar
    const formattedMsgUser = formatText(msgUser);
    const formattedMsgBot = formatText(msgBot);

    const [result] = await connection.execute(
      'INSERT INTO AudioToText (email, msguser, msgbot, linkArquivo) VALUES (?, ?, ?, ?)',
      [email, formattedMsgUser, formattedMsgBot, audioPath]
    );

    if (result.affectedRows > 0) {
      //console.log('Mensagens inseridas com sucesso.');
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


export default async function handler(req, res) {
  if (req.method === 'POST') {
    try {
      // Parse do formulário
      const { fields, files } = await parseForm(req);

      const prompt = fields.prompt && Array.isArray(fields.prompt) ? fields.prompt[0] : fields.prompt;
      const audioFile = files.audio && Array.isArray(files.audio) ? files.audio[0] : files.audio;
      const pastaAudio = fields.filePath && Array.isArray(fields.filePath) ? fields.filePath[0] : fields.filePath;

      if (!audioFile || !audioFile.filepath) {
        return res.status(400).json({ error: 'Arquivo de áudio não encontrado.' });
      }

      // Caminho para a pasta public/audios
      const publicPath = path.resolve('./public/audios');
      const audioSalvo = path.join(publicPath, path.basename(audioFile.filepath));

      // Criar a pasta se não existir
      if (!fs.existsSync(publicPath)) {
        fs.mkdirSync(publicPath, { recursive: true });
      }

      // Mover o arquivo para a pasta public/audios
      fs.renameSync(audioFile.filepath, audioSalvo);

      //console.log('Áudio salvo em public/audios:', audioSalvo);

      const fileManager = new GoogleAIFileManager(process.env.GEMINI_API_KEY);

      // Upload do arquivo para o Google AI
      const uploadResponse = await fileManager.uploadFile(audioSalvo, {
        mimeType: "audio/mp3",
        displayName: 'Áudio do usuário',
      });

      const fileUri = uploadResponse.file.uri;

      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
      const model = genAI.getGenerativeModel({
        model: 'gemini-1.5-pro',
        generationConfig: {
          maxOutputTokens: 8000,
          temperature: 0.7,
        }
      });

      const result = await model.generateContent([
        {
          fileData: {
            mimeType: "audio/mp3",
            fileUri: fileUri,
          },
        },
        { text: prompt },
      ]);

      const respApi = result.response.text();

      const formatedText = await formatText(respApi);

      await saveMessages(emailUser, prompt, formatedText, pastaAudio);

      return res.status(200).json({ response: formatedText });
    } catch (error) {
      console.error('Error:', error);
      return res.status(500).json({ error: 'Erro ao processar o áudio' });
    }
  } else {
    return res.status(405).json({ error: 'Método não permitido' });
  }
}
