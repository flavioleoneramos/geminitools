import { GoogleGenerativeAI } from '@google/generative-ai';
import { GoogleAIFileManager } from '@google/generative-ai/server';
import fs from 'fs';
import path from 'path';
import formidable from 'formidable';
import mysql from 'mysql2/promise';

const emailUser = process.env.EMAILUSER;
async function saveMessages(email, msgUser, msgBot, contexto, pdfUser) {
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
      'INSERT INTO PDFToText (email, msguser, msgbot, contexto, linkArquivo) VALUES (?, ?, ?, ?, ?)',
      [email, formattedMsgUser, formattedMsgBot, contexto, pdfUser]
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

const parseForm = (req) => {
  return new Promise((resolve, reject) => {
    const form = formidable({ multiples: false, keepExtensions: true }); // Mantém a extensão do arquivo
    form.parse(req, (err, fields, files) => {
      if (err) reject(err);
      resolve({ fields, files });
    });
  });
};

async function getFormattedConversations(email) {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'gemini'
  });

  try {
    const [rows] = await connection.execute(
      'SELECT msguser, contexto FROM `PDFToText` WHERE email = ? ORDER BY id DESC LIMIT 2',
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

async function getPdfDetails(fileUri, mimeType) {
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
      { text: "Você deve Detalhar o conteúdo deste áudio de forma detalhada. Responda formatado pronto para copiar e colar, sem acrescentar mais textos, apenas informações do pdf em detalhe." },
    ]);

    // Processa a resposta da API
    const responseText = result.response.text();
    return responseText;
  } catch (error) {
    console.error('Erro ao obter detalhes da imagem:', error);
    throw error;
  }
}

export default async function handler(req, res) {
  if (req.method === 'POST') {
    try {
      // Parse do formulário
      const { fields, files } = await parseForm(req);

      const prompt = fields.prompt && Array.isArray(fields.prompt) ? fields.prompt[0] : fields.prompt; // Trata o prompt corretamente
      const pdfFile = files.pdf && Array.isArray(files.pdf) ? files.pdf[0] : files.pdf; // Trata o arquivo PDF
      const pastaPDF = fields.filePath && Array.isArray(fields.filePath) ? fields.filePath[0] : fields.filePath; // Trata o caminho do arquivo PDF

      if (!pdfFile || !pdfFile.filepath) {
        return res.status(400).json({ error: 'Arquivo PDF não encontrado.' });
      }

      // Define o diretório de destino para os PDF
      const pdfDir = path.join(process.cwd(), 'public/pdf');
      if (!fs.existsSync(pdfDir)) {
        fs.mkdirSync(pdfDir);
      }

      // Caminho final do arquivo, garantindo a extensão original do PDF
      const originalExtension = path.extname(pdfFile.originalFilename); // Obtém a extensão original do arquivo
      const pdfFilePath = path.join(pdfDir, pdfFile.newFilename + originalExtension);

      // Move o arquivo para o diretório de destino com a extensão correta
      fs.renameSync(pdfFile.filepath, pdfFilePath);

      const fileManager = new GoogleAIFileManager(process.env.API_KEY);

      // Upload do arquivo PDF para o Google AI
      const uploadResponse = await fileManager.uploadFile(pdfFilePath, {
        mimeType: 'application/pdf',
        displayName: 'PDF do usuário',
      });

      const fileUri = uploadResponse.file.uri;

      const pdfFileDetails = await getPdfDetails(fileUri, pdfFilePath.mimetype); // Remove o arquivo temporário após o upload
      console.log('detalhes:', pdfFileDetails);
      //return res.status(200).json({ message: pdfFileDetails });

      let hystoric = await getFormattedConversations(emailUser);
      //hystoric = await processText(hystoric);
      //console.log('Histórico:', hystoric);
      // res.status(200).json({ message: hystoric });
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
            mimeType: 'application/pdf',
            fileUri: fileUri,
          },
        },
        { text: `<HISTORICO>${hystoric}</HISTORICO><PERGUNTA>${prompt}</PERGUNTA>` },
      ]);

      const respApi = result.response.text();

      await saveMessages(emailUser, prompt, respApi, pdfFileDetails, pastaPDF);

      // Enviar resposta ao cliente
      return res.status(200).json({ response: respApi });
    } catch (error) {
      console.error('Error:', error);
      return res.status(500).json({ error: 'Erro ao processar o PDF' });
    }
  } else {
    return res.status(405).json({ error: 'Método não permitido' });
  }
}
