import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import formidable from 'formidable';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { GoogleAIFileManager } from '@google/generative-ai/server';
import mysql from 'mysql2/promise';

export const config = {
  api: {
    bodyParser: false, // Desabilita o bodyParser para lidar com multipart/form-data
  },
};

const emailUser = process.env.EMAILUSER;

async function saveMessages(email, msgUser, msgBot, imageUser) {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'gemini',
  });

  try {
    //const formattedMsgUser = formatText(msgUser);
    //const formattedMsgBot = formatText(msgBot);

    const [result] = await connection.execute(
      'INSERT INTO ImageToImage (email, msguser, msgbot, linkArquivo) VALUES (?, ?, ?, ?)',
      [email, msgUser, msgBot, imageUser]
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

async function salvarArquivo(buffer) {
  try {
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

async function generateImage(text, imagePath) {
  try {

    // Lê o arquivo da imagem e converte para Base64
    const imageData = fs.readFileSync(imagePath);
    const base64Image = imageData.toString('base64');

    // Prepara os conteúdos para a API do Gemini
    const contents = [
      { text: text },
      {
        inlineData: {
          mimeType: 'image/jpeg', // Certifique-se de usar o MIME type correto
          data: base64Image,
        },
      },
    ];

    const genAI = new GoogleGenerativeAI(process.env.API_KEY);

    // Configura o modelo do Gemini
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash-exp-image-generation',
      generationConfig: {
        responseModalities: ['Text', 'Image'],
      },
    });


    // Gera o conteúdo usando a API do Gemini
    const response = await model.generateContent(contents);

    for (const part of response.response.candidates[0].content.parts) {
      if (part.inlineData) {
        const generatedImageBase64 = part.inlineData.data;
        const buffer = Buffer.from(generatedImageBase64, 'base64');

        // Salva a imagem gerada no servidor
        const uniqueName = `${uuidv4()}.jpg`;
        const generatedImagePath = path.join(process.cwd(), '/public/imagens', uniqueName);
        fs.writeFileSync(generatedImagePath, buffer);

        // Retorna o caminho relativo da imagem gerada
        return `/imagens/${uniqueName}`;
      }
    }

    throw new Error('Nenhuma imagem foi gerada pela API do Gemini.');
  } catch (error) {
    console.error('Erro ao gerar a imagem:', error);
    throw error;
  }
}

export default async function handler(req, res) {
  if (req.method === 'POST') {
    try {
      // Inicializa o formidable para processar o formulário
      const form = formidable({ multiples: true });

      form.parse(req, async (err, fields, files) => {
        if (err) {
          console.error('Erro ao processar o formulário:', err);
          return res.status(400).json({ error: 'Erro ao processar o formulário' });
        }

        const text = fields.text && Array.isArray(fields.text) ? fields.text[0] : fields.text; // Trata o texto corretamente
        const imageFile = files.image && Array.isArray(files.image) ? files.image[0] : files.image; // Trata o arquivo de imagem

        if (!text || !imageFile) {
          return res.status(400).json({ error: 'Texto ou imagem ausente na requisição.' });
        }

        // Lê o buffer da imagem enviada pelo usuário
        const imageBuffer = fs.readFileSync(imageFile.filepath);

        // Salva a imagem enviada pelo usuário no servidor
        const userImagePath = await salvarArquivo(imageBuffer);

        // Gera a imagem editada usando a API do Gemini
        const generatedImagePath = await generateImage(text, imageFile.filepath);

        // Salva as mensagens no banco de dados
        await saveMessages(emailUser, text, generatedImagePath, userImagePath);

        // Retorna o caminho relativo da imagem gerada
        return res.status(200).json({ imageUrl: generatedImagePath });
      });
    } catch (error) {
      console.error('Erro ao processar a requisição:', error);
      res.status(500).json({ error: 'Erro ao processar a requisição.' });
    }
  } else {
    res.status(405).json({ error: 'Método não permitido' });
  }
}