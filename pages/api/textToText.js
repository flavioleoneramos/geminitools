const { GoogleGenerativeAI } = require("@google/generative-ai");
const { Configuration, OpenAIApi, OpenAI } = require("openai");
import mysql from 'mysql2/promise';

async function saveMessages(email, msgUser, msgBot) {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'gemini',
  });

  try {
    const [result] = await connection.execute(
      'INSERT INTO TextToText (email, msguser, msgbot) VALUES (?, ?, ?)',
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

async function getFormattedConversations(email) {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'gemini'
  });

  try {
    const [rows] = await connection.execute(
      'SELECT msguser, msgbot FROM `TextToText` WHERE email = ? ORDER BY id ASC LIMIT 100',
      [email]
    );

    const formattedConversations = rows.map(row => {
      return `Usuário: ${row.msguser}\nBot: ${row.msgbot}`;
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
    const { texto, model } = req.body;

    try {
      let result;
      const hystoric = await getFormattedConversations("flavioleone8383@gmail.com");
      if (model === 'gemini-2.0-flash-exp') {
        // Se o modelo for "gemini-2.0-flash-exp", usamos a API Gemini
        const genAI = new GoogleGenerativeAI(process.env.API_KEY);

        const geminiModel = genAI.getGenerativeModel({ 
          model: "gemini-2.0-flash-exp",
          systemInstruction:`Você é um assistente virtual do Flávio Leone Ramos. O Flávio quer que você o auxilie ele na produção de conteúdos pagos para mídias sociais e no desenvolvimento de campanhas de marketing digital. O Flávio deseja que vocé responda as perguntas em Portugês do Brasil. O Flávio deseja que vocé use o seguinte histórico de conversas: ${hystoric}`,
         });

        result = await geminiModel.generateContent(texto);
        const responseText = result.response.text();
        await saveMessages("flavioleone8383@gmail.com", texto, responseText);
        res.status(200).json({ message: responseText });

      } else if (model === 'gpt-4o') {
        // Se o modelo for "gpt-4o", usamos a nova API da OpenAI
        const openai = new OpenAI({
          apiKey: process.env.OPENAI_API_KEY, // Chave da API no arquivo .env
        });

        const completion = await openai.chat.completions.create({
          model: "gpt-4o",  // Certifique-se de usar o nome correto do modelo
          messages: [{ role: "user", content: texto }],
        });

        const responseText = completion.choices[0].message.content;
        await saveMessages("flavioleone8383@gmail.com", texto, responseText);
        res.status(200).json({ message: responseText });

      } else {
        res.status(400).json({ error: 'Modelo inválido' });
      }

    } catch (error) {
      console.error('Erro ao gerar conteúdo:', error);
      res.status(500).json({ error: 'Erro ao gerar conteúdo' });
    }
  } else {
    res.status(405).json({ error: 'Método não permitido' });
  }
}
