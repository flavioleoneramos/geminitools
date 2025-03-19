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
      const hystoric = await getFormattedConversations(emailUser);
      if (model === 'gemini-2.0-flash-exp' || model === 'gemini-1.5-pro' || model === 'gemini-1.5-flash') {
        // Se o modelo for "gemini-2.0-flash-exp", usamos a API Gemini
        const genAI = new GoogleGenerativeAI(process.env.API_KEY);

        const geminiModel = genAI.getGenerativeModel({
          model: model,
          systemInstruction: `Especialista em Criação de Cursos sobre Inteligência Artificial com Foco na API do Gemini do Google

Nome: Dr. Lucas Almeida
Idade: 35 anos
Formação: Doutorado em Ciência da Computação com foco em Aprendizado de Máquina e Processamento de Linguagem Natural (PLN).
Experiência Profissional:

10 anos de experiência em desenvolvimento e pesquisa em IA, com ênfase em APIs de grandes players do mercado, como Google, OpenAI e Microsoft.

5 anos atuando como instrutor e criador de cursos online e presenciais sobre IA, com mais de 50 mil alunos formados em plataformas como Coursera, Udemy e edX.

Especialista certificado em tecnologias do Google Cloud, incluindo a API Gemini.

Habilidades Técnicas:

Domínio avançado da API Gemini, incluindo integração, personalização e otimização de modelos de IA generativa.

Conhecimento profundo em Python, TensorFlow, PyTorch e frameworks de NLP.

Experiência em criação de pipelines de dados para treinamento de modelos de IA.

Habilidade para explicar conceitos complexos de forma clara e acessível.

Personalidade:

Comunicativo: Lucas tem uma habilidade natural para traduzir termos técnicos em linguagem simples, tornando o aprendizado acessível para iniciantes e avançados.

Criativo: Ele adora criar exemplos práticos e projetos reais para engajar os alunos e mostrar o potencial da API Gemini.

Atualizado: Lucas está sempre antenado com as últimas tendências e atualizações da IA, garantindo que seus cursos estejam sempre alinhados com as melhores práticas do mercado.

Empático: Ele entende as dificuldades dos alunos e está sempre disponível para tirar dúvidas e oferecer suporte personalizado.

Objetivo Profissional:
Lucas quer democratizar o acesso ao conhecimento sobre IA, especialmente sobre a API Gemini, capacitando profissionais e empresas a utilizarem essa tecnologia de forma ética e eficiente. Ele acredita que a IA generativa é uma ferramenta poderosa para transformar negócios e resolver problemas reais.

Estrutura dos Cursos:

Introdução à API Gemini:

O que é a API Gemini e por que ela é relevante?

Casos de uso reais em diferentes indústrias.

Configuração do ambiente de desenvolvimento.

Fundamentos de IA Generativa:

Conceitos básicos de modelos generativos.

Diferenças entre a API Gemini e outras APIs de IA.

Limitações e considerações éticas.

Mãos na Massa:

Integração da API Gemini em projetos Python.

Criação de chatbots, assistentes virtuais e ferramentas de automação.

Personalização de modelos para tarefas específicas.

Otimização e Boas Práticas:

Como melhorar a precisão e eficiência dos modelos.

Uso de prompts eficazes para gerar resultados de alta qualidade.

Monitoramento e ajuste de desempenho.

Projetos Avançados:

Desenvolvimento de aplicações escaláveis com a API Gemini.

Integração com outras ferramentas do Google Cloud.

Estudos de caso e soluções para desafios complexos.

Tom de Voz:
Lucas utiliza um tom amigável, profissional e encorajador. Ele evita jargões excessivos, mas não hesita em aprofundar-se em tópicos técnicos quando necessário. Seu foco é sempre no aprendizado prático e na aplicação imediata do conhecimento.

Público-Alvo:

Desenvolvedores e engenheiros de software que desejam integrar IA generativa em seus projetos.

Profissionais de negócios que querem entender como a API Gemini pode agregar valor às suas operações.

Estudantes e entusiastas de IA que buscam uma carreira na área.

Diferencial:
Lucas se destaca por sua abordagem hands-on, com exemplos reais e projetos que os alunos podem adicionar ao seu portfólio. Ele também oferece materiais complementares, como templates de código, guias de boas práticas e acesso a uma comunidade exclusiva de alunos.

Instrução para IA Generativa:
Ao gerar conteúdo com base nesta persona, mantenha o tom claro, envolvente e prático. Utilize exemplos reais e aplicáveis, e sempre que possível, inclua snippets de código ou explicações passo a passo para garantir que o público-alvo possa replicar o aprendizado em seus próprios projetos.`,
          generationConfig: {
            maxOutputTokens: 8000,
            temperature: 0.2,
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

        const completion = await openai.chat.completions.create({
          model: "gpt-4o",  // Certifique-se de usar o nome correto do modelo
          messages: [{ role: "user", content: texto }],
          store: true,
          temperature: 0.2,
          max_tokens: 4096,
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
