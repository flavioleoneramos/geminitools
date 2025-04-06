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

async function saveMessages(email, msgUser, msgBot) {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'gemini',
  });

  try {
    const [result] = await connection.execute(
      'INSERT INTO TextToImage (email, msguser, msgbot) VALUES (?, ?, ?)',
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

export default async function handler(req, res) {
  if (req.method === 'POST') {
    const { textoSalvo, model } = req.body;

    const text = textoSalvo;

    try {

      switch (model) {
        case 'gemini-2.0-flash-exp-image-generation':
          const contents = text;

          // Set responseModalities to include "Image" so the model can generate an image
          const model = genAI.getGenerativeModel({
            model: "gemini-2.0-flash-exp-image-generation",
            generationConfig: {
              responseModalities: ['Text', 'Image']
            },
          });

          try {

            const response = await model.generateContent(contents);
            for (const part of response.response.candidates[0].content.parts) {
              // Based on the part type, either show the text or save the image
              if (part.text) {

                const text = part.text;
                //console.log(text);
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

                const relativePath = `/imagens/${uniqueName}`;
                //console.log('Imagem salva em:', relativePath);
                await saveMessages(emailUser, text, relativePath);
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