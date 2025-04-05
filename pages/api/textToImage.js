import { Readable } from 'stream';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { GoogleAIFileManager } from '@google/generative-ai/server';
import fetch from 'node-fetch';
import os from 'os';
import fs from 'fs';
import path from 'path';
import OpenAI from "openai";
import mysql from 'mysql2/promise';
import { v4 as uuidv4 } from 'uuid';

const emailUser = process.env.EMAILUSER;

const genAI = new GoogleGenerativeAI(process.env.API_KEY);
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY, // Chave da API no arquivo .env
});

/*async function salvarArquivo(imageUrl) {
  try {
    // Faz o download da imagem
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error('Erro ao fazer o download da imagem');
    }
    const buffer = await response.buffer();

    // Gera um nome único para o arquivo
    const uniqueName = `${uuidv4()}.jpg`;

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
}*/

async function saveMessages(email, msgUser, msgBot, imageFileDetails) {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'gemini',
  });

  try {
    const [result] = await connection.execute(
      'INSERT INTO TextToImage (email, msguser, msgbot, contexto) VALUES (?, ?, ?, ?)',
      [email, msgUser, msgBot, imageFileDetails]
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
      { text: "Você deve Detalhar o conteúdo desta imagem para ser replicada em outra imagem. Responda em Português do Brasil, formatado pronto para copiar e colar, sem acrescentar mais textos, apenas informações da imagem em detalhe." },
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
      'SELECT msguser, contexto FROM `TextToImage` WHERE email = ? ORDER BY id DESC LIMIT 2',
      [email]
    );

    const formattedConversations = rows.map(row => {
      return `User: ${row.msguser}\n. Model: ${row.msgbot}.`;
    }).join('\n');

    return formattedConversations;

  } catch (error) {
    console.error('Erro ao buscar conversas:', error);
    throw error;
  } finally {
    await connection.end();
  }
}

export default async function handler(req, res) {
  if (req.method === 'POST') {
    const { textoSalvo, model } = req.body;

    const text = textoSalvo;

    try {

      switch (model) {
        case 'gemini-2.0-flash-exp-image-generation':
          const contents = text;
          let hystoric = await getFormattedConversations(emailUser);
          hystoric = hystoric.replace(/<br>/g, '').replace(/\s+/g, ' ').trim();

          // Set responseModalities to include "Image" so the model can generate an image
          const model = genAI.getGenerativeModel({
            model: "gemini-2.0-flash-exp-image-generation",
            systemInstruction: `Você é um assistente pessoal baseado em inteligência artificial. Você deve responder às perguntas do usuário em português do Brasil de forma clara e concisa. Você pode usar o histórico de conversas que estão dentro da tag <HISTORICO></HISTORICO> para melhorar suas respostas. Rsponda a pergunta contida dentro da tag <PERGUNTA></PERGUNTA>.`,
            generationConfig: {
              responseModalities: ['Text', 'Image']
            },
          });

          try {

            const response = await model.generateContent(`<HISTORICO>${hystoric}</HISTORICO><PERGUNTA>${contents}</PERGUNTA>`);
            for (const part of response.response.candidates[0].content.parts) {
              // Based on the part type, either show the text or save the image
              if (part.text) {

                const text = part.text;
                console.log(text);
                return res.status(200).json({ textUrl: text });

              } else if (part.inlineData) {

                const imageData = part.inlineData.data;

                const buffer = Buffer.from(imageData, 'base64');

                // Gera um nome único para o arquivo
                const uniqueName = `${uuidv4()}.jpg`;

                // Define o caminho para salvar a imagem
                const uploadPath = path.join(process.cwd(), '/public/imagens', uniqueName);

                // Cria a pasta se não existir
                if (!fs.existsSync(path.dirname(uploadPath))) {
                  fs.mkdirSync(path.dirname(uploadPath), { recursive: true });
                }

                // Salva a imagem no sistema de arquivos
                fs.writeFileSync(uploadPath, buffer);

                const fileManager = new GoogleAIFileManager(process.env.API_KEY);

                // Upload do arquivo para o Google AI
                const uploadResponse = await fileManager.uploadFile(uploadPath, {
                  mimeType: "image/jpeg", // Certifique-se de usar o MIME type correto
                  displayName: 'Imagem do usuário',
                });
                

                const fileUri = uploadResponse.file.uri;

                const imageFileDetails = await getImageDetails(fileUri, "image/jpeg"); // Remove o arquivo temporário após o upload
                //console.log('Detalhes da imagem:', imageFileDetails);
                // Retorna o caminho relativo da imagem
                const relativePath = `/imagens/${uniqueName}`;
                console.log('Imagem salva em:', relativePath);
                await saveMessages(emailUser, text, relativePath, imageFileDetails);
                return res.status(200).json({ imageUrl: relativePath });

              } else {
                console.error("Erro ao gerar conteúdo:", response);
                res.status(500).json({ error: 'Falha ao gerar a imagem' });
              }
            }
          } catch (error) {
            console.error("Erro ao gerar conteúdo:", error);
            res.status(500).json({ error: 'Falha ao gerar a imagem' });
          }
          break;
        default:
          return "Modelo não encontrado";
      }

    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Falha ao gerar a imagem' });
    }
  } else {
    res.status(405).json({ error: 'Método não permitido' });
  }
}