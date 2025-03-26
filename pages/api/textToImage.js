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
//const emailUser = "flavioleone8383@gmail.com";
const genAI = new GoogleGenerativeAI(process.env.API_KEY);
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY, // Chave da API no arquivo .env
});


async function salvarArquivo64(base64Image) {
  try {
    // Remove o prefixo "data:image/jpeg;base64," se estiver presente
    const base64Data = base64Image.replace(/^data:image\/jpeg;base64,/, "");

    // Converte a imagem base64 para um buffer
    const buffer = Buffer.from(base64Data, 'base64');

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
}

async function salvarArquivo(imageUrl) {
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
}

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
        case 'dall-e-3':

          const response = await openai.images.generate({
            model: "dall-e-3",
            prompt: textoSalvo,
            n: 1,
            size: "1024x1024",
          });

          const resp = response.data[0].url;

          const filePath = await salvarArquivo(resp);

          //console.log(response);
          await saveMessages(emailUser, textoSalvo, filePath);
          res.status(200).json({ imageUrl: filePath });
          break;

        case 'FLUX.1-dev':
          console.log("FLUX.1-dev");
          // Define a URL da API Hugging Face e o token de autorização
          const apiUrl = 'https://api-inference.huggingface.co/models/black-forest-labs/FLUX.1-dev';
          const headers = {
            'Authorization': `Bearer ${process.env.HUGGINGFACE_API_KEY}`,
            'Content-Type': 'application/json',
          };

          // Faz a requisição para a API Hugging Face
          const responseFlux = await fetch(apiUrl, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify({ inputs: text }),
          });

          if (!responseFlux.ok) {
            throw new Error('Erro ao gerar a imagem com FLUX.1-dev');
          }

          const bufferFlux = await responseFlux.buffer();

          // Converte o buffer da imagem para base64
          const base64Image = bufferFlux.toString('base64');
          const imageDataUrl = `data:image/jpeg;base64,${base64Image}`;
          const imgPath = await salvarArquivo64(imageDataUrl);
          console.log(imgPath);
          await saveMessages(emailUser, text, imgPath);

          // Retorna a imagem em base64 como resposta
          res.status(200).json({ imageUrl: imgPath });
          break;

        case 'stable-diffusion-xl-base-1.0':
          console.log("stable-diffusion-xl-base-1.0");
          // Define a URL da API Hugging Face e o token de autorização
          const apiUrlStable = 'https://api-inference.huggingface.co/models/stabilityai/stable-diffusion-xl-base-1.0';
          const headersStable = {
            'Authorization': `Bearer ${process.env.HUGGINGFACE_API_KEY}`,
            'Content-Type': 'application/json',
          };

          // Faz a requisição para a API Hugging Face
          const responseStable = await fetch(apiUrlStable, {
            method: 'POST',
            headers: headersStable,
            body: JSON.stringify({ inputs: text }),
          });

          if (!responseStable.ok) {
            throw new Error('Erro ao gerar a imagem com stable-diffusion-xl-base-1.0');
          }

          const bufferStable = await responseStable.buffer();

          // Converte o buffer da imagem para base64
          const base64ImageStable = bufferStable.toString('base64');
          const imageDataUrlStable = `data:image/jpeg;base64,${base64ImageStable}`;
          const imgPath1 = await salvarArquivo64(imageDataUrlStable);
          console.log(imgPath1);
          await saveMessages(emailUser, text, imgPath1);

          // Retorna a imagem em base64 como resposta
          res.status(200).json({ imageUrl: imgPath1 });
          break;

        case 'stable-diffusion-v1-5':
          console.log("stable-diffusion-v1-5");

          // Define a URL da API Hugging Face e o token de autorização
          const apiUrlStableD = 'https://api-inference.huggingface.co/models/stable-diffusion-v1-5/stable-diffusion-v1-5';
          const headersStableD = {
            'Authorization': `Bearer ${process.env.HUGGINGFACE_API_KEY}`,
            'Content-Type': 'application/json',
          };

          // Faz a requisição para a API Hugging Face
          const responseStableD = await fetch(apiUrlStableD, {
            method: 'POST',
            headers: headersStableD,
            body: JSON.stringify({ inputs: text }),
          });

          if (!responseStableD.ok) {
            throw new Error('Erro ao gerar a imagem com stable-diffusion-v1-5');
          }

          const bufferStableD = await responseStableD.buffer();

          // Converte o buffer da imagem para base64
          const base64ImageStableD = bufferStableD.toString('base64');
          const imageDataUrlStableD = `data:image/jpeg;base64,${base64ImageStableD}`;
          const imgpath2 = await salvarArquivo64(imageDataUrlStableD);
          console.log(imgpath2);
          await saveMessages(emailUser, text, imgpath2);
          // Retorna a imagem em base64 como resposta
          res.status(200).json({ imageUrl: imgpath2 });
          break;
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
                console.log(part.text);
                return res.status(200).json({ textUrl: part.text });
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

                // Retorna o caminho relativo da imagem
                const relativePath = `/imagens/${uniqueName}`;
                console.log('Imagem salva em:', relativePath);
                await saveMessages(emailUser, text, relativePath);
                return res.status(200).json({ imageUrl: relativePath });
                
              } /**else if (part.inlineData && part.text) {
                const imageData = part.inlineData.data;
                const textUrl = part.text;
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

                // Retorna o caminho relativo da imagem
                const relativePath = `/imagens/${uniqueName}`;
                console.log('Imagem com texto salva em:', relativePath);
                await saveMessages(emailUser, text, relativePath);
                res.status(200).json({ imageUrl: relativePath, textUrl: textUrl });
                return;
              } */
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