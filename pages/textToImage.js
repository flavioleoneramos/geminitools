import Head from 'next/head'
import Image from 'next/image'
import Link from 'next/Link'
import styles from '../styles/Home.module.css'
import React, { useState, useEffect } from 'react';

function TextToImage() {
    const [text, setText] = useState('');
    const [model, setModel] = useState('FLUX.1-dev');
    const [imageUrl, setImageUrl] = useState('');
    const [error, setError] = useState('');
    const [conversas, setConversas] = useState([]);

    async function addMessageToConversas(message, sender) {
        setConversas((prevConversas) => [
            ...prevConversas,
            { msguser: sender === 'user' ? message : '', msgbot: sender === 'bot' ? message : '' }
        ]);
    }

    const handleSubmit = async (event) => {
        event.preventDefault();
        await addMessageToConversas(text, 'user');
        const response = await fetch('/api/textToImage/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ text, model }),
        });

        const data = await response.json();
        //setImageUrl(data.imageUrl); // Atualiza o estado com a URL da imagem
        await addMessageToConversas(data.imageUrl, 'bot');
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
                const conversas = await recuperaConversas('flavioleone8383@gmail.com', 'TextToImage');
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
                <h1>Text To Image</h1>
            </header>
            <div className={styles.conversas}>
                {conversas.length > 0 ? (
                    conversas.map((conversa) => (
                        <div key={conversa.id} className={styles.conversaItem}>
                            <p className={styles.msguser}><strong>Usuário:</strong> {conversa.msguser}</p>
                            <p><strong>Bot:</strong> <br /><Image src={conversa.msgbot} width={500} height={500} alt="Imagem gerada a partir do texto" /></p>
                        </div>
                    ))
                ) : (
                    <p>Nenhuma conversa encontrada.</p>
                )}
            </div>

            {imageUrl && (
                <div>
                    <img src={imageUrl} alt="Imagem gerada a partir do texto" />
                </div>
            )}
            <form onSubmit={handleSubmit} className={styles.form}>
                <textarea
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="Digite seu texto aqui"
                />
                <select value={model} onChange={(e) => setModel(e.target.value)}>
                    <option value="dall-e-3">DALL-E 3</option>
                    <option value="FLUX.1-dev">FLUX.1-dev</option>  {/* Ajuste se necessário */}
                    <option value="stable-diffusion-xl-base-1.0">Stable Diffusion xl-base-1.0</option>  {/* Ajuste se necessário */}
                    <option value="stable-diffusion-v1-5">Stable Diffusion v1-5</option>  {/* Ajuste se necessário */}

                </select>
                <button type="submit">Converter</button>
            </form>

        </div>
    );
}

export default TextToImage;
