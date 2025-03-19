import fs from 'fs';
import path from 'path';
import OpenAI from 'openai';
import mysql from 'mysql2/promise';

const emailUser = process.env.EMAILUSER;
async function saveMessages(email, msgUser, msgBot) {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'gemini',
  });

  try {
    const [result] = await connection.execute(
      'INSERT INTO TextToAudio (email, msguser, msgbot) VALUES (?, ?, ?)',
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

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY, // Certifique-se de que a chave está no .env
});

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Método não permitido' });
    }

    const { text, voice } = req.body;

    if (!text || !voice) {
        return res.status(400).json({ message: 'Texto e voz são obrigatórios' });
    }

  
    try {
        // Faz a chamada para a API de síntese de fala da OpenAI
        const mp3 = await openai.audio.speech.create({
            model: 'tts-1', // Modelo de síntese de fala
            voice: voice,   // Tipo de voz escolhido
            input: text,    // Texto a ser convertido em áudio
            response_format: 'mp3',
        });

        // Gera o caminho do arquivo para salvar o áudio
        const fileName = `audio_${Date.now()}.mp3`;
        const filePath = path.join(process.cwd(), 'public', 'audios', fileName);

        // Converte o arrayBuffer em um buffer e grava no arquivo
        const buffer = Buffer.from(await mp3.arrayBuffer());
        await fs.promises.writeFile(filePath, buffer);
        await saveMessages(emailUser, text, `/audios/${fileName}`);
        // Retorna a URL acessível para o áudio
        res.status(200).json({ audioUrl: `/audios/${fileName}` });

    } catch (error) {
        console.error('Erro ao converter texto em áudio:', error);
        res.status(500).json({ message: 'Erro ao converter texto em áudio' });
    }
}
