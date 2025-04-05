import { GoogleGenerativeAI } from '@google/generative-ai';
import { GoogleAIFileManager } from '@google/generative-ai/server';
import fs from 'fs';
import path from 'path';
import formidable from 'formidable';
import mysql from 'mysql2/promise';

const emailUser = process.env.EMAILUSER;

async function saveMessages(email, msgUser, msgBot, imageUser, detailsImage) {
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
      'INSERT INTO ImageToText (email, msguser, msgbot, contexto, linkArquivo) VALUES (?, ?, ?, ?, ?)',
      [email, formattedMsgUser, formattedMsgBot, detailsImage, imageUser]
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


async function getImageDetails(fileUri, mimeType) {
  try {

    // Inicializa o cliente da API do Gemini
    const genAI = new GoogleGenerativeAI(process.env.API_KEY);

    // Configura o modelo do Gemini
    const model = genAI.getGenerativeModel({
      model: 'gemini-1.5-pro',
    });

    // Envia a imagem e o prompt para a API do Gemini
    const result = await model.generateContent([
      {
        fileData: {
          mimeType: mimeType,
          fileUri: fileUri,
        },
      },
      { text: "Você deve Detalhar o conteúdo desta imagem para ser replicada em outra imagem. Responda formatado pronto para copiar e colar em Português do Brasil, sem acrescentar mais textos, apenas informações da imagem em detalhe." },
    ]);

    // Processa a resposta da API
    const responseText = result.response.text();
    return responseText;
  } catch (error) {
    console.error('Erro ao obter detalhes da imagem:', error);
    throw error;
  }
}

async function getFormattedConversations(email) {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'gemini'
  });

  try {
    const [rows] = await connection.execute(
      'SELECT msguser, contexto FROM `ImageToText` WHERE email = ? ORDER BY id DESC LIMIT 2',
      [email]
    );

    const formattedConversations = rows.map(row => {
      return `User: ${row.msguser}\n. Model: ${row.contexto}.`;
    }).join('\n');

    return formattedConversations;

  } catch (error) {
    console.error('Erro ao buscar conversas:', error);
    throw error;
  } finally {
    await connection.end();
  }
}

async function processText(inputText) {
  // Remove quebras de linha e espaços em branco extras
  let cleanedText = inputText.replace(/\s+/g, ' ').trim();

  // Encontra o índice do primeiro endereço de imagem
  const imageRegex = /(https?:\/\/|\/photos\/|C:\/xampp\/htdocs\/funcoes_api_gemini_upload\/public\/photos\/)/;
  const match = cleanedText.match(imageRegex);

  if (match) {
    // Mantém apenas o texto antes do endereço da imagem
    cleanedText = cleanedText.substring(0, match.index).trim();
  }

  return cleanedText;
}

export default async function handler(req, res) {
  if (req.method === 'POST') {
    try {
      // Configura o formidable para salvar o arquivo diretamente na pasta public/photos
      const form = await formidable({
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
        const pastaImagem = fields.filePath && Array.isArray(fields.filePath) ? fields.filePath[0] : fields.filePath;

        // Verifique se o arquivo de imagem foi enviado corretamente
        if (!imageFile || !imageFile.filepath) {
          return res.status(400).json({ error: 'Arquivo de imagem não encontrado.' });
        }

        //const imageUser = `C:/xampp/htdocs/funcoes_api_gemini_upload/public/photos/${path.basename(imageFile.filepath)}`; // Caminho relativo da imagem salva

        // Continue com sua lógica existente para processar o arquivo com a API do Google AI
        const fileManager = new GoogleAIFileManager(process.env.API_KEY);

        // Upload do arquivo para o Google AI
        const uploadResponse = await fileManager.uploadFile(imageFile.filepath, {
          mimeType: imageFile.mimetype,
          displayName: 'Imagem do usuário',
        });

        const fileUri = uploadResponse.file.uri;

        const imageFileDetails = await getImageDetails(fileUri, imageFile.mimetype); // Remove o arquivo temporário após o upload

        //console.log('Detalhes da imagem:', imageFileDetails);
        //return res.status(200).json({ response: imageFileDetails });


        let hystoric = await getFormattedConversations(emailUser);
        hystoric = await processText(hystoric);
        //console.log('Histórico:', hystoric);
        //return res.status(200).json({ message: hystoric });

        const genAI = new GoogleGenerativeAI(process.env.API_KEY);

        const model = genAI.getGenerativeModel({
          model: 'gemini-1.5-pro',
          systemInstruction: `Você é um assistente pessoal baseado em inteligência artificial. Você deve responder às perguntas do usuário de forma clara e concisa. Você pode usar o histórico de conversas que estão dentro da tag <HISTORICO></HISTORICO> para melhorar suas respostas. Rsponda a pergunta contida dentro da tag <PERGUNTA></PERGUNTA>.`,
          generationConfig: {
            maxOutputTokens: 8000,
            temperature: 0.2,
          }
        });

        const result = await model.generateContent([
          {
            fileData: {
              mimeType: imageFile.mimetype,
              fileUri: fileUri,
            },
          },
          { text: `<HISTORICO>${hystoric}</HISTORICO><PERGUNTA>${prompt}</PERGUNTA>` },
        ]);

        const respApi = result.response.text();

        // Enviar resposta ao cliente
        await saveMessages(emailUser, prompt, respApi, pastaImagem, imageFileDetails);
        return res.status(200).json({ response: respApi });
      });
    } catch (error) {
      console.error('Error:', error);
      return res.status(500).json({ error: 'Erro ao processar a imagem' });
    }
  } else {
    return res.status(405).json({ error: 'Método não permitido' });
  }
}

