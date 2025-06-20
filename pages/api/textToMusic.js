import fs from 'fs';
import path from 'path';
import OpenAI from 'openai';
import mysql from 'mysql2/promise';

const emailUser = process.env.EMAILUSER;
const apiKey = process.env.MUREKA_API_KEY; // Certifique-se de que a chave está no .env

async function saveMessages(email, msgUser, msgBot) {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'gemini',
  });

  try {
    const [result] = await connection.execute(
      'INSERT INTO TextToMusic (email, msguser, msgbot) VALUES (?, ?, ?)',
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
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Método não permitido' });
  }
  const { text, voice, model } = req.body;

  console.log('Dados recebidos:', { text, voice, model });

  await saveMessages(emailUser, text, voice);

  //return res.status(200).json({ audioUrl: `${text}, ${voice}, ${model}` });

  try {

    // Requisição para a API do Mureka
    const response = await fetch('https://api.mureka.ai/v1/song/generate', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        lyrics: "[Verse]\nIn the stormy night, I wander alone\nLost in the rain, feeling like I have been thrown\nMemories of you, they flash before my eyes\nHoping for a moment, just to find some bliss",
        model: "auto",
        prompt: "r&b, slow, passionate, male vocal"
      }),
    });

    const murekaResponse = await response.json();

    // Log da resposta da API
    console.log('Resposta da Mureka:', murekaResponse);

    res.status(200).json({ audioUrl: text });

    // Gera o caminho do arquivo para salvar o áudio
    /*const fileName = `audio_${Date.now()}.mp3`;
    const filePath = path.join(process.cwd(), 'public', 'audios', fileName);

    // Converte o arrayBuffer em um buffer e grava no arquivo
    const buffer = Buffer.from(await mp3.arrayBuffer());
    await fs.promises.writeFile(filePath, buffer);
    await saveMessages(emailUser, text, `/audios/${fileName}`);*/

    // Retorna a URL acessível para o áudio
    //
    // 
    // res.status(200).json({ audioUrl: `/audios/${fileName}` });

  } catch (error) {
    console.error('Erro ao converter texto em áudio:', error);
    res.status(500).json({ message: 'Erro ao converter texto em áudio' });
  }
}
