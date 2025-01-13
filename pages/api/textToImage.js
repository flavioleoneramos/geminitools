import { Readable } from 'stream';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { GoogleAIFileManager } from '@google/generative-ai/server';
import axios from 'axios';
import os from 'os';
import fs from 'fs';
import path from 'path';
import OpenAI from "openai";
import mysql from 'mysql2/promise';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY_FREE, // Chave da API no arquivo .env
});

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
    const { text, model } = req.body;

    try {

      switch (model) {
        case 'dall-e-3':

          const response = await openai.images.generate({
            model: "dall-e-3",
            prompt: text,
            n: 1,
            size: "1024x1024",
          });

          const resp = response.data[0].url

          //console.log(response);
          await saveMessages("flavioleone8383@gmail.com", text, resp);
          res.status(200).json({ imageUrl: resp });
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
          const responseFlux = await axios.post(apiUrl,
            {
              inputs: text, // Prompt do usuário
            },
            {
              headers: headers,
              responseType: 'arraybuffer', // Para lidar com a resposta em bytes (imagem)
            }
          );

          // Converte o buffer da imagem para base64
          const base64Image = Buffer.from(responseFlux.data, 'binary').toString('base64');
          const imageDataUrl = `data:image/jpeg;base64,${base64Image}`;
          await saveMessages("flavioleone8383@gmail.com", text, imageDataUrl);
          // Retorna a imagem em base64 como resposta
          res.status(200).json({ imageUrl: imageDataUrl });
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
          const responseStable = await axios.post(apiUrlStable,
            {
              inputs: text, // Prompt do usuário
            },
            {
              headers: headersStable,
              responseType: 'arraybuffer', // Para lidar com a resposta em bytes (imagem)
            }
          );

          // Converte o buffer da imagem para base64
          const base64ImageStable = Buffer.from(responseStable.data, 'binary').toString('base64');
          const imageDataUrlStable = `data:image/jpeg;base64,${base64ImageStable}`;

          await saveMessages("flavioleone8383@gmail.com", text, `data:image/jpeg;base64,${base64ImageStable}`);

          // Retorna a imagem em base64 como resposta
          res.status(200).json({ imageUrl: imageDataUrlStable });
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
          const responseStableD = await axios.post(apiUrlStableD,
            {
              inputs: text, // Prompt do usuário
            },
            {
              headers: headersStableD,
              responseType: 'arraybuffer', // Para lidar com a resposta em bytes (imagem)
            }
          );

          // Converte o buffer da imagem para base64
          const base64ImageStableD = Buffer.from(responseStableD.data, 'binary').toString('base64');
          const imageDataUrlStableD = `data:image/jpeg;base64,${base64ImageStableD}`;

          await saveMessages("flavioleone8383@gmail.com", text, `data:image/jpeg;base64,${base64ImageStableD}`);
          // Retorna a imagem em base64 como resposta
          res.status(200).json({ imageUrl: imageDataUrlStableD });
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



