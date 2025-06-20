import mysql from 'mysql2/promise';

async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Método não permitido' });
  }

  const { email, nomeTabela } = req.body;

  const tabelasPermitidas = [
    'TextToText',
    'TextToImage',
    'ImageToText',
    'ImageToImage',
    'ImageToVideo',
    'TextToAudio',
    'AudioToText',
    'TextToVideo',
    'VideoToText',
    'PDFToText',
    'TextToMusic'
  ];

  if (!tabelasPermitidas.includes(nomeTabela)) {
    return res.status(400).json({ message: 'Nome da tabela inválido' });
  }

  try {
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'atualizaemotiva'
    });

    const query = `
      SELECT id, nome, email, msguser, msgbot, contexto, linkArquivo
      FROM \`${nomeTabela}\`
      WHERE email = ?
      ORDER BY id ASC
      LIMIT 1000
    `;

    const [rows] = await connection.execute(query, [email]);

    await connection.end();
    
    return res.status(200).json(rows);
  } catch (error) {
    console.error('Erro ao recuperar conversas:', error);
    return res.status(500).json({ message: 'Erro ao recuperar conversas' });
  }
}

export default handler;
