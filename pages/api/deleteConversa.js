import mysql from 'mysql2/promise';
import { FaTrash } from 'react-icons/fa';

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
        'TextToAudio',
        'AudioToText',
        'TextToVideo',
        'VideoToText',
        'PDFToText'
    ];

    if (!tabelasPermitidas.includes(nomeTabela)) {
        return res.status(400).json({ message: 'Nome da tabela inválido' });
    }

    try {
        const connection = await mysql.createConnection({
            host: 'localhost',
            user: 'root',
            password: '',
            database: 'gemini'
        });

        // Exclui todas as mensagens da tabela com base no e-mail do usuário
        const deleteQuery = `
      DELETE FROM \`${nomeTabela}\`
      WHERE email = ?
    `;

        const [result] = await connection.execute(deleteQuery, [email]);

        await connection.end();

        return res.status(200).json({
            message: 'Mensagens excluídas com sucesso',
            affectedRows: result.affectedRows, // Retorna o número de linhas afetadas
        });
    } catch (error) {
        console.error('Erro ao excluir conversas:', error);
        return res.status(500).json({ message: 'Erro ao excluir conversas' });
    }
}

export default handler;