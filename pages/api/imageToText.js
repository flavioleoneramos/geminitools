import { GoogleGenerativeAI } from '@google/generative-ai';
import { GoogleAIFileManager } from '@google/generative-ai/server';
import fs from 'fs';
import path from 'path';
import OpenAI from "openai";
import formidable from 'formidable';
import mysql from 'mysql2/promise';
import { Messages } from 'openai/resources/beta/threads/messages.mjs';


const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY, // Chave da API no arquivo .env
});

const emailUser = process.env.EMAILUSER;

async function saveMessages(email, msgUser, msgBot, imageUser) {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'atualizaemotiva',
  });

  try {
    const formattedMsgUser = formatText(msgUser);
    const formattedMsgBot = formatText(msgBot);

    const [result] = await connection.execute(
      'INSERT INTO ImageToText (email, msguser, msgbot, linkArquivo) VALUES (?, ?, ?, ?)',
      [email, formattedMsgUser, formattedMsgBot, imageUser]
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

export const config = {
  api: {
    bodyParser: false, // Desabilita o parsing automático do body para lidar com multipart/form-data
  },
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
        const filePath = fields.filePath && Array.isArray(fields.filePath) ? fields.filePath[0] : fields.filePath; // Caminho do arquivo
        const model = fields.model && Array.isArray(fields.model) ? fields.model[0] : fields.model; // Modelo selecionado

        // Verifique se o arquivo de imagem foi enviado corretamente
        if (!imageFile || !imageFile.filepath) {
          return res.status(400).json({ error: 'Arquivo de imagem não encontrado.' });
        }

        let responseText;

        if (model === 'gemini-2.5-pro-exp-03-25' || model === 'gemini-1.5-pro') {
          // Processa a imagem com o modelo Gemini
          const fileManager = new GoogleAIFileManager(process.env.GEMINI_API_KEY);

          // Upload do arquivo para o Google AI
          const uploadResponse = await fileManager.uploadFile(imageFile.filepath, {
            mimeType: imageFile.mimetype,
            displayName: 'Imagem do usuário',
          });

          const fileUri = uploadResponse.file.uri;

          const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

          const geminiModel = genAI.getGenerativeModel({
            model: model,
            generationConfig: {
              maxOutputTokens: 8000,
              temperature: 0.7,
            },
          });

          const result = await geminiModel.generateContent([
            {
              fileData: {
                mimeType: imageFile.mimetype,
                fileUri: fileUri,
              },
            },
            { text: prompt },
          ]);

          responseText = result.response.text();
        } else if (model === 'gpt-4o-mini') {

          console.log(imageFile.filepath);
          // Processa a imagem com o modelo GPT-4o Mini
          const base64Image = fs.readFileSync(imageFile.filepath, "base64"); // Lê o arquivo local como Base64

          const response = await openai.responses.create({
            model: "gpt-4o-mini",
            input: [
              {
                role: "user",
                content: [
                  { type: "input_text", text: prompt },
                  {
                    type: "input_image",
                    image_url: `data:image/jpeg;base64,${base64Image}`, // Usa o Base64 da imagem
                  },
                ],
              },
            ],
          });

          console.log(response.output_text);
          responseText = response.output_text;
        } else {
          return res.status(400).json({ error: 'Modelo inválido.' });
        }

        // Salva as mensagens no banco de dados
        await saveMessages(emailUser, prompt, responseText, filePath);

        // Retorna a resposta ao cliente
        return res.status(200).json({ response: responseText });
      });
    } catch (error) {
      console.error('Error:', error);
      return res.status(500).json({ error: 'Erro ao processar a imagem' });
    }
  } else {
    return res.status(405).json({ error: 'Método não permitido' });
  }
}

