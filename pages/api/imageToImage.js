import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { GoogleAIFileManager } from '@google/generative-ai/server';
import fs from 'fs';
import path from 'path';
import multer from 'multer';
import mysql from 'mysql2/promise';
import { v4 as uuidv4 } from 'uuid';
import fetch from 'node-fetch';
import formidable from 'formidable';
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
      'INSERT INTO imagetoimage (email, msguser, msgbot) VALUES (?, ?, ?)',
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

export const config = {
  api: {
    bodyParser: false, // Desabilita o bodyParser padrão do Next.js para processar FormData
  },
};
export default async function handler(req, res) {
  if (req.method === 'POST') {
    try {
      // Configura o formidable para salvar o arquivo diretamente na pasta public/photos
      const form = formidable({
        uploadDir: path.join(process.cwd(), 'public/photos'),
        keepExtensions: true,
        filename: (name, ext, part, form) => {
          return `${Date.now()}-${part.originalFilename}`;
        },
      });


      // Parse do formulário
      form.parse(req, async (err, fields, files) => {
        if (err) {
          console.error('Error parsing form:', err);
          return res.status(400).json({ error: 'Erro ao processar o formulário' });
        }

        const text = fields.text && Array.isArray(fields.text) ? fields.text[0] : fields.text; // Trata o text corretamente
        const imageFile = files.image && Array.isArray(files.image) ? files.image[0] : files.image; // Trata o arquivo de imagem
        const pastaImagem = fields.filePath && Array.isArray(fields.filePath) ? fields.filePath[0] : fields.filePath;

        console.log('text:', text);
        //console.log('imageFile:', imageFile);
        console.log('pastaImagem:', pastaImagem);
        // Verifique se o arquivo de imagem foi enviado corretamente
        if (!imageFile || !imageFile.filepath) {
          return res.status(400).json({ error: 'Arquivo de imagem não encontrado.' });
        }

        const imgEdit = await generateImage(text, pastaImagem);
        return res.status(200).json({ imageUrl: imgEdit });
      });
    } catch (error) {
      console.error('Error:', error);
      return res.status(500).json({ error: 'Erro ao processar a imagem' });
    }
  } else {
    return res.status(405).json({ error: 'Método não permitido' });
  }
}

async function generateImage(text, imageFilePath) {

  // Garante que o caminho completo seja usado
  //const imagePath = path.join(process.cwd(), 'public', imageFilePath);

  // Verifica se o arquivo existe antes de tentar lê-lo
  /*if (!fs.existsSync(imagePath)) {
    throw new Error(`Arquivo não encontrado: ${imagePath}`);
  }*/

  // Lê o arquivo e converte para base64
  const imageData = fs.readFileSync(imageFilePath);
  const base64Image = imageData.toString('base64');
  console.log('Imagem convertida para base64 com sucesso.');
  // Prepare the content parts
  const contents = [
    { text: text },
    {
      inlineData: {
        mimeType: "image/jpeg",
        data: base64Image
      }
    }
  ];
  const genAI = new GoogleGenerativeAI(process.env.API_KEY);

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
        return part.text;
      } else if (part.inlineData) {
        const imageData = part.inlineData.data;
        const buffer = Buffer.from(imageData, 'base64');
        fs.writeFileSync(`${imageFilePath}`, buffer);
        console.log(`/public/${imageFilePath}`);
        return imageFilePath;
      }


    }
  } catch (error) {
    console.error("Error generating content:", error);
  }
}
