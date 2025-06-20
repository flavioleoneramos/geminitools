import { Readable } from 'stream';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { GoogleAIFileManager } from '@google/generative-ai/server';
import fetch from 'node-fetch';
import os from 'os';
import path from 'path';
import OpenAI from "openai";
import mysql from 'mysql2/promise';
import { v4 as uuidv4 } from 'uuid';
import { GoogleGenAI } from "@google/genai";
import fs from "fs";
import { createWriteStream } from "fs";


const emailUser = process.env.EMAILUSER;

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

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
    //console.log(msgBot);
    const connection = await mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: '',
<<<<<<< HEAD
        database: 'gemini',
=======
        database: 'atualizaemotiva',
>>>>>>> 5a6a1926ceef0abb4354faf1499e07aa4295906a
    });

    try {
        const [result] = await connection.execute(
            'INSERT INTO ImageToVideo (email, msguser, msgbot) VALUES (?, ?, ?)',
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
    if (req.method === "POST") {
      const { textoSalvo, filePath } = req.body;
  
      console.log("Texto recebido:", textoSalvo);
      console.log("Caminho do arquivo recebido:", filePath);
  
      try {
        // Lê o arquivo de imagem como buffer
        const imageBuffer = fs.readFileSync(filePath);
  
        // Configura o cliente da API do Google Generative AI
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  
        // Inicia a operação de geração de vídeo
        let operation = await ai.models.generateVideos({
          model: "veo-2.0-generate-001",
          prompt: textoSalvo,
          image: {
            imageBytes: imageBuffer.toString("base64"), // Converte o buffer para base64
            mimeType: "image/png", // Certifique-se de que o tipo MIME está correto
          },
          config: {
            personGeneration: "allow_adult",
            aspectRatio: "16:9",
            numberOfVideos: 1,
            durationSeconds: 5, // Duração do vídeo em segundos
          },
        });
  
        console.log("Operação iniciada:", operation.name);
  
        // Aguarda a conclusão da operação
        while (!operation.done) {
          await new Promise((resolve) => setTimeout(resolve, 10000)); // Aguarda 10 segundos
          operation = await ai.operations.getVideosOperation({
            operation: operation,
          });
          console.log("Status da operação:", operation);
        }
  
        // Verifica se o vídeo foi gerado
        if (!operation.response?.generatedVideos || operation.response.generatedVideos.length === 0) {
          console.error("Nenhum vídeo foi gerado:", operation);
          return res.status(500).json({ error: "Nenhum vídeo foi gerado." });
        }
  
        // Faz o download e salva os vídeos gerados
        const savedVideos = [];
        for (const [index, generatedVideo] of operation.response.generatedVideos.entries()) {
          const videoUrl = `${generatedVideo.video?.uri}&key=${process.env.GEMINI_API_KEY}`; // Adiciona a chave da API
          console.log(`Baixando vídeo ${index + 1}:`, videoUrl);
  
          const videoResponse = await fetch(videoUrl);
          if (!videoResponse.ok) {
            console.error("Erro ao baixar o vídeo:", await videoResponse.text());
            return res.status(500).json({ error: "Erro ao baixar o vídeo" });
          }
  
          // Define o caminho para salvar o vídeo
          const uniqueName = `video_${uuidv4()}.mp4`;
          const videoPath = path.join(process.cwd(), "/public/videos", uniqueName);
  
          // Cria a pasta se não existir
          if (!fs.existsSync(path.dirname(videoPath))) {
            fs.mkdirSync(path.dirname(videoPath), { recursive: true });
          }
  
          // Salva o vídeo no sistema de arquivos
          const writer = createWriteStream(videoPath);
          videoResponse.body.pipe(writer); // Usa o stream diretamente
  
          // Aguarda o término do salvamento
          await new Promise((resolve, reject) => {
            writer.on("finish", resolve);
            writer.on("error", reject);
          });
  
          console.log(`Vídeo salvo em: ${videoPath}`);
          savedVideos.push(`/videos/${uniqueName}`); // Caminho relativo do vídeo
        }
  
        console.log("Vídeo 1 salvo:", savedVideos[0]);
        // Salva as mensagens no banco de dados
        await saveMessages(emailUser, textoSalvo, savedVideos[0]);
        // Retorna os caminhos dos vídeos gerados
        return res.status(200).json({ videos: savedVideos[0] });
      } catch (error) {
        console.error("Erro ao processar a geração de vídeo:", error);
        return res.status(500).json({ error: "Erro ao gerar vídeo" });
      }
    } else {
      res.status(405).json({ error: "Método não permitido" });
    }
  }