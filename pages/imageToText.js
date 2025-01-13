import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/Link';
import styles from '../styles/Home.module.css';

const ImageToText = () => {
    const [prompt, setPrompt] = useState('');
    const [imageFile, setImageFile] = useState(null); // Armazena o arquivo de imagem
    const [responseText, setResponseText] = useState('');
    const [error, setError] = useState('');
    const [conversas, setConversas] = useState([]);

    async function addMessageToConversas(message, sender) {
        setConversas((prevConversas) => [
            ...prevConversas,
            { msguser: sender === 'user' ? message : '', msgbot: sender === 'bot' ? message : '' }
        ]);
    }

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');  // Limpa erros anteriores

        const formData = new FormData();
        formData.append('prompt', prompt);
        formData.append('image', imageFile); // Adiciona o arquivo de imagem ao form data

        await addMessageToConversas(prompt, 'user');
        try {
            const response = await fetch('/api/imageToText/', {
                method: 'POST',
                body: formData, // Envia o form data
            });

            if (!response.ok) {
                throw new Error('Erro ao processar a imagem e o prompt');
            }

            const data = await response.json();
            //setResponseText(data.response); // Exibe a resposta do backend
            await addMessageToConversas(data.response, 'bot');
        } catch (err) {
            setError(err.message);
        }
    };

    async function recuperaConversas(email, nomeTabela) {
        const response = await fetch('/api/recuperaConversas', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, nomeTabela }),
        });

        if (!response.ok) {
            throw new Error('Erro ao recuperar conversas');
        }

        const conversas = await response.json();
        return conversas;
    }

    useEffect(() => {
        async function fetchConversas() {
            try {
                const conversas = await recuperaConversas('flavioleone8383@gmail.com', 'ImageToText');
                setConversas(conversas);
            } catch (err) {
                setError('Erro ao carregar conversas.');
                console.error(err);
            }
        }

        fetchConversas();
    }, []);

    return (
        <div>
            <header className={styles.header}>
                <h1><Link href="./">Index</Link></h1>
                <h1>Image To Text</h1>
            </header>

            <div className={styles.conversas}>
                {conversas.length > 0 ? (
                    conversas.map((conversa) => (
                        <div key={conversa.id} className={styles.conversaItem}>
                            <p className={styles.msguser}><strong>Usuário:</strong> {conversa.msguser}</p>
                            <p className={styles.msgbot}><strong>Bot:</strong> {conversa.msgbot}</p>
                        </div>
                    ))
                ) : (
                    <p>Nenhuma conversa encontrada.</p>
                )}
            </div>

            {responseText && (
                <div>
                    <p>{responseText}</p>
                </div>
            )}

            {error && <p style={{ color: 'red' }}>{error}</p>}

            <div>
                <form onSubmit={handleSubmit} className={styles.form}>
                    <label>Prompt:</label>
                    <input
                        type="text"
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        required
                        placeholder="Digite o prompt"
                    />
                    <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => setImageFile(e.target.files[0])} // Captura o arquivo de imagem
                        required
                    />

                    <button type="submit">Enviar</button>
                </form>
            </div>
        </div>
    );
};

export default ImageToText;
