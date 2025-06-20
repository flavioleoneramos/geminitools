const { GoogleGenerativeAI } = require("@google/generative-ai");
const { Configuration, OpenAIApi, OpenAI } = require("openai");
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
      'SELECT msguser, msgbot FROM `TextToText` WHERE email = ? ORDER BY id DESC LIMIT 1',
      [email]
    );

    const formattedConversations = rows.map(row => {
      return `Flávio: ${row.msguser}\n. Você: ${row.msgbot}.`;
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
      /*let hystoric = await getFormattedConversations(emailUser);
      hystoric = hystoric.replace(/<br>/g, '').replace(/\s+/g, ' ').trim();
      console.log('Histórico:', hystoric);
      //return res.status(200).json({ message: hystoric });*/
      if (model === 'gemini-2.0-flash-exp' || model === 'gemini-1.5-pro' || model === 'gemini-1.5-flash') {
        // Se o modelo for "gemini-2.0-flash-exp", usamos a API Gemini
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

        const geminiModel = genAI.getGenerativeModel({
          model: model,
          systemInstruction: `Você é um assistente pessoal baseado em inteligência artificial do Flávio Leone Ramos que mora no Brasil e fala em Português.`,
          generationConfig: {
            maxOutputTokens: 8000,
            temperature: 0.7,
          }
        });


        result = await geminiModel.generateContent(`${texto}`); 
        const responseText = result.response.text();

        const formattedResponse = await formatText(responseText);
        await saveMessages(emailUser, texto, formattedResponse);
        res.status(200).json({ message: formattedResponse });

      } else if (model === 'gpt-4o') {

        // Se o modelo for "gpt-4o", usamos a nova API da OpenAI
        const openai = new OpenAI({
          apiKey: process.env.OPENAI_API_KEY, // Chave da API no arquivo .env
        });

        const promptUser = `Você é um assistente pessoal baseado em inteligência artificial do Flávio Leone Ramos que mora no Brasil e fala em Português.`;
        const completion = await openai.chat.completions.create({
          model: "gpt-4o",  // Certifique-se de usar o nome correto do modelo
          messages: [{ role: "user", content: promptUser }],
          store: true,
          temperature: 0.7,
          max_tokens: 4096, //Quantidade de tokens contidos na resposta
        });

        const responseText = completion.choices[0].message.content;
        await saveMessages(emailUser, texto, responseText);
        res.status(200).json({ message: responseText });

      } else if (model === "deepseek-chat") {
        // Se o modelo for "gpt-4o", usamos a nova API da OpenAI
        const openai = new OpenAI({
          baseURL: 'https://api.deepseek.com', // URL base da API DeepSeek
          apiKey: process.env.DEEPSEEK_API_KEY, // Chave da API no arquivo .env
        });

        const promptUser = `Você é um assistente pessoal baseado em inteligência artificial do Flávio Leone Ramos que mora no Brasil e fala em Português. Responda a seguinte pergunta: ${texto}`;
        const completion = await openai.chat.completions.create({
          model: "deepseek-chat",  // Certifique-se de usar o nome correto do modelo
          messages: [{ role: "user", content: promptUser }],
          store: true,
          temperature: 0.7,
          max_tokens: 4096, //Quantidade de tokens contidos na resposta
        });

        const responseText = completion.choices[0].message.content;
        await saveMessages(emailUser, texto, responseText);
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
