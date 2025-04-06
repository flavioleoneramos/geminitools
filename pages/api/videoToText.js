import { GoogleGenerativeAI } from '@google/generative-ai';
import { GoogleAIFileManager, FileState } from '@google/generative-ai/server';
import formidable from 'formidable';
import fs from 'fs';
import os from 'os';
import path from 'path';
import mysql from 'mysql2/promise';

const emailUser = process.env.EMAILUSER;

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


async function saveMessages(email, msgUser, msgBot, videoPath) {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'gemini',
  });

  try {
    const formattedMsgUser = formatText(msgUser);
    const formattedMsgBot = formatText(msgBot);

    const [result] = await connection.execute(
      'INSERT INTO VideoToText (email, msguser, msgbot, linkArquivo) VALUES (?, ?, ?, ?)',
      [email, formattedMsgUser, formattedMsgBot, videoPath]
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
    bodyParser: false, // Desativar o bodyParser para lidar com uploads de arquivos
  },
};

async function waitForFileToBeActive(fileId, fileManager, maxAttempts = 10, delay = 10000) {
  let attempts = 0;
  let file = await fileManager.getFile(fileId);

  while (file.state === FileState.PROCESSING && attempts < maxAttempts) {
    console.log('Esperando o arquivo ser processado...');
    await new Promise((resolve) => setTimeout(resolve, delay)); // Aguardar 10 segundos
    file = await fileManager.getFile(fileId); // Rechecar o estado do arquivo
    attempts++;
  }

  if (file.state === FileState.FAILED) {
    throw new Error('Falha no processamento do vídeo.');
  }

  if (file.state !== FileState.ACTIVE) {
    throw new Error('O arquivo não ficou ativo dentro do tempo limite.');
  }

  return file; // Retornar o arquivo quando estiver ativo
}

export default async function handler(req, res) {
  if (req.method === 'POST') {
    const form = formidable({ uploadDir: os.tmpdir(), keepExtensions: true });

    form.parse(req, async (err, fields, files) => {
      if (err) {
        console.error('Erro ao processar o arquivo:', err);
        return res.status(500).json({ error: 'Erro ao processar o arquivo.' });
      }

      const prompt = fields.prompt && fields.prompt[0];
      const videoFile = files.video && files.video[0];

      try {
        if (videoFile && videoFile.filepath) {
          // Processar arquivo de vídeo enviado
          const publicPath = path.resolve('./public/videos');
          const videoPath = path.join(publicPath, path.basename(videoFile.filepath));

          if (!fs.existsSync(publicPath)) {
            fs.mkdirSync(publicPath, { recursive: true });
          }

          fs.renameSync(videoFile.filepath, videoPath);

          //console.log('Vídeo salvo em public/videos:', videoPath);

          // Converter o caminho para usar barras "/" e pegar apenas a parte relativa a "/public/"
          const relativePath = videoPath.replace(/\\/g, '/').split('/public/')[1];
          const finalPath = `/${relativePath}`;
          //console.log('Caminho relativo do vídeo:', finalPath);

          const fileManager = new GoogleAIFileManager(process.env.API_KEY);

          const uploadResponse = await fileManager.uploadFile(videoPath, {
            mimeType: 'video/mp4',
            displayName: 'Vídeo do usuário',
          });

          const processedFile = await waitForFileToBeActive(uploadResponse.file.name, fileManager);

          const genAI = new GoogleGenerativeAI(process.env.API_KEY);
          const model = genAI.getGenerativeModel({ model: 'gemini-1.5-pro' });

          const result = await model.generateContent([
            {
              fileData: {
                mimeType: processedFile.mimeType,
                fileUri: processedFile.uri,
              },
            },
            { text: prompt },
          ]);

          const resp = result.response.text();

          await saveMessages(emailUser, prompt, resp, finalPath); // Salvar o caminho relativo no banco de dados

          return res.status(200).json({ response: resp });
        } else {
          return res.status(400).json({ error: 'Nenhum vídeo enviado.' });
        }
      } catch (error) {
        console.error('Erro ao processar o vídeo:', error);
        return res.status(500).json({ error: 'Erro ao processar o vídeo.' });
      }
    });
  } else {
    return res.status(405).json({ error: 'Método não permitido' });
  }
}