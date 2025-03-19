import React, { useState, useEffect, useRef } from 'react';
import Head from 'next/head'
import Image from 'next/image'
import Link from 'next/Link'
import styles from '../styles/Home.module.css'

export default function TextToAudio() {
    const [text, setText] = useState('');
    const [voice, setVoice] = useState('alloy');
    const [audioUrl, setAudioUrl] = useState('');
    const [conversas, setConversas] = useState([]);
    const [error, setError] = useState('');
    const conversasEndRef = useRef(null); // Referência para o fim do contêiner de conversas
    const [emailUser, setEmailUser] = useState('');


    const voices = ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'];

    useEffect(() => {
        const fetchEmailUser = async () => {
            try {
                const response = await fetch('/api/carregaEmail', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                });

                if (!response.ok) {
                    throw new Error('Erro ao carregar o email');
                }

                const data = await response.json();
                setEmailUser(data.emailUser);
            } catch (err) {
                setError(err.message);
            }
        };

        fetchEmailUser();
    }, []);

    useEffect(() => {
        if (emailUser) {
            fetchConversas();
        }
    }, [emailUser]);

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
            setText('');
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

    async function fetchConversas() {
        try {
            const conversas = await recuperaConversas(emailUser, 'TextToAudio');
            setConversas(conversas);
        } catch (err) {
            setError('Erro ao carregar conversas.');
            console.error(err);
        }
    }

    useEffect(() => {
        const timer = setTimeout(() => {
            if (conversasEndRef.current) {
                conversasEndRef.current.scrollIntoView({ behavior: 'smooth' });
            }
        }, 1000); // Adiciona um pequeno atraso para garantir que a rolagem ocorra após a renderização

        return () => clearTimeout(timer); // Limpa o timer ao desmontar
    }, [conversas]);

    return (
        <div>
            <header className={styles.header}>
                <p><Link href="./">Index</Link></p>
                <p>Text To Audio</p>
            </header>
            <main>
                <div className={styles.conversas}>
                    {conversas.length > 0 ? (
                        conversas.map((conversa, index) => (
                            <div key={index} className={styles.conversaItem}>
                                {conversa.msguser && <p className={styles.msguser}>{conversa.msguser}</p>}
                                {conversa.msgbot && <p className={styles.msgbot}><audio controls src={conversa.msgbot} /></p>}
                            </div>
                        ))
                    ) : (
                        <p>Nenhuma conversa encontrada.</p>
                    )}
                    <div ref={conversasEndRef}></div>
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
