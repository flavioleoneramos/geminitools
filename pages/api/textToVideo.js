
import mysql from 'mysql2/promise';
import { Client } from "@gradio/client";

export default async function handler(req, res) {
  if (req.method === 'POST') {
    const { prompt } = req.body;

    try {
      console.log('Tentando conectar ao cliente...');
      const client = await Client.connect("ByteDance/AnimateDiff-Lightning");
      console.log('Conexão bem-sucedida, enviando previsão...');

      const result = await client.predict("/generate_image", {
        prompt: prompt,
        base: "ToonYou",
        motion: "",
        step: "1",
      });

      console.log('Resultado da previsão:', result);

      res.status(200).json({ result });
    } catch (error) {
      console.error('Erro ao processar a requisição:', error);
      res.status(500).json({ error: 'Erro ao processar a requisição' });
    }
  } else {
    res.status(405).json({ error: 'Método não permitido' });
  }
}