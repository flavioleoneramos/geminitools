import React, { useState, useEffect } from 'react';
import Head from 'next/head'
import Image from 'next/image'
import Link from 'next/Link'
import styles from '../styles/Home.module.css'

export default function TextToAudio() {
    const [text, setText] = useState('');
    const [voice, setVoice] = useState('alloy');
    const [audioUrl, setAudioUrl] = useState('');
    const [conversas, setConversas] = useState([]);

    const voices = ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'];

    async function addMessageToConversas(message, sender) {
        setConversas((prevConversas) => [
            ...prevConversas,
            { msguser: sender === 'user' ? message : '', msgbot: sender === 'bot' ? message : '' }
        ]);
    }

    const handleSubmit = async (event) => {
        event.preventDefault();
        await addMessageToConversas(text, 'user');
        // Envia uma requisição POST para o backend
        const response = await fetch('/api/textToAudio/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ text, voice }),
        });

        if (response.ok) {
            const data = await response.json();
            //setAudioUrl(data.audioUrl); // Recebe a URL do áudio gerada no backend
            await addMessageToConversas(data.audioUrl, 'bot');
        } else {
            console.error('Erro ao converter texto em áudio');
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
                const conversas = await recuperaConversas('flavioleone8383@gmail.com', 'TextToAudio');
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
                <h1>Text ToÁudio</h1>
            </header>
            <main>
                <div className={styles.conversas}>
                    {conversas.length > 0 ? (
                        conversas.map((conversa) => (
                            <div key={conversa.id} className={styles.conversaItem}>
                                <p className={styles.msguser}><strong>Usuário:</strong> {conversa.msguser}</p>
                                <p><strong>Bot:</strong> <audio controls src={conversa.msgbot} /></p>
                            </div>
                        ))
                    ) : (
                        <p>Nenhuma conversa encontrada.</p>
                    )}
                </div>
                {audioUrl && (
                    <div>
                        <audio controls src={audioUrl} />
                    </div>
                )}
                <div>
                    <form onSubmit={handleSubmit} className={styles.form}>
                        <textarea
                            value={text}
                            onChange={(e) => setText(e.target.value)}
                            placeholder="Digite seu texto aqui"
                        />
                        <select value={voice} onChange={(e) => setVoice(e.target.value)}>
                            {voices.map((v) => (
                                <option key={v} value={v}>
                                    {v}
                                </option>
                            ))}
                        </select>
                        <button type="submit">Converter</button>
                    </form>
                </div>

            </main>
        </div>
    );
}
