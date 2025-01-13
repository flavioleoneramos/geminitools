import { GoogleGenerativeAI } from '@google/generative-ai';
import { GoogleAIFileManager, FileState } from '@google/generative-ai/server';
import formidable from 'formidable';
import fs from 'fs';
import os from 'os';
import path from 'path';
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
      'INSERT INTO VideoToText (email, msguser, msgbot) VALUES (?, ?, ?)',
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
    bodyParser: false, // Desativar o bodyParser para lidar com uploads de arquivos
  },
};

// Função para aguardar o processamento do arquivo
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
    //console.log("Recebendo a requisição POST");

    const form = formidable({ uploadDir: os.tmpdir(), keepExtensions: true }); // Instanciando o formidable

    form.parse(req, async (err, fields, files) => {
      console.log("Analisando a requisição");
      if (err) {
        console.error('Erro ao processar o arquivo:', err);
        return res.status(500).json({ error: 'Erro ao processar o arquivo.' });
      }

      const prompt = fields.prompt && fields.prompt[0]; // Pegando o primeiro valor de prompt
      const videoFile = files.video && files.video[0]; // Pegando o primeiro arquivo de vídeo

      // Logs para verificar se o arquivo e o prompt foram recebidos corretamente
      //console.log("Prompt recebido:", prompt);
      //console.log("Arquivo de vídeo recebido:", videoFile);

      if (!videoFile || !videoFile.filepath) {
        console.error('Arquivo de vídeo não encontrado');
        return res.status(400).json({ error: 'Arquivo de vídeo não encontrado.' });
      }

      try {
        const fileManager = new GoogleAIFileManager(process.env.API_KEY);

        console.log('Fazendo upload do vídeo para o Google File Manager');
        // Fazer upload do vídeo
        const uploadResponse = await fileManager.uploadFile(videoFile.filepath, {
          mimeType: 'video/mp4',
          displayName: 'Vídeo do usuário',
        });

        console.log('Upload realizado com sucesso, verificando o estado do arquivo');
        // Verificar se o arquivo está ativo
        const processedFile = await waitForFileToBeActive(uploadResponse.file.name, fileManager);

        console.log('Arquivo ativo, iniciando a IA para gerar conteúdo');
        // Inicializar a IA para gerar o conteúdo
        const genAI = new GoogleGenerativeAI(process.env.API_KEY);
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-pro' });

        // Gerar o conteúdo usando o vídeo
        const result = await model.generateContent([
          {
            fileData: {
              mimeType: processedFile.mimeType,
              fileUri: processedFile.uri,
            },
          },
          { text: prompt },
        ]);

        console.log('Conteúdo gerado com sucesso, enviando resposta' + result.response.text());
        const resp = result.response.text();
        await saveMessages("flavioleone8383@gmail.com", prompt, resp);
        // Enviar a resposta
        return res.status(200).json({ response: resp });
      } catch (error) {
        console.error('Erro ao processar o vídeo:', error);
        return res.status(500).json({ error: 'Erro ao processar o vídeo.' });
      }
    });
  } else {
    console.error('Método não permitido');
    return res.status(405).json({ error: 'Método não permitido' });
  }
}
