import Head from 'next/head'
import Image from 'next/image'
import Link from 'next/Link'
import styles from '../styles/Home.module.css'
import React, { useState, useEffect, useRef } from 'react';

function TextToImage() {
    const [text, setText] = useState('');
    const [model, setModel] = useState('gemini-2.0-flash-exp-image-generation');
    const [imageUrl, setImageUrl] = useState('');
    const [textUrl, setTextUrl] = useState('');
    const [error, setError] = useState('');
    const [conversas, setConversas] = useState([]);
    const conversasEndRef = useRef(null); // Referência para o fim do contêiner de conversas
    const [emailUser, setEmailUser] = useState('');

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

        const textoSalvo = text;
        setText('');
        await addMessageToConversas(textoSalvo, 'user');
        const response = await fetch('/api/textToImage/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ textoSalvo, model }),
        });

        const data = await response.json();
        //setImageUrl(data.imageUrl); // Atualiza o estado com a URL da imagem
        console.log(data.imageUrl);
        if (data.textUrl) {
            alert(data.textUrl);
        }
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

    async function fetchConversas() {
        try {
            const conversas = await recuperaConversas(emailUser, 'TextToImage');
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
                <p>Text To Image</p>
            </header>
            <div className={styles.conversas}>
                {conversas.length > 0 ? (
                    conversas.map((conversa, index) => (
                        <div key={index} className={styles.conversaItem}>
                            {conversa.msguser && <p className={styles.msguser}>{conversa.msguser}</p>}
                            {conversa.msgbot && <p className={styles.msgbot}>{<img src={conversa.msgbot} width={400} height={400} alt="Imagem gerada a partir do texto" />}</p>} {/*<Image src={conversa.msgbot} width={400} height={400} alt="Imagem gerada a partir do texto" />*/}
                        </div>
                    ))
                ) : (
                    <p>Nenhuma conversa encontrada.</p>
                )}
                <div ref={conversasEndRef}></div>
            </div>

            {/**{imageUrl && (
                <div>
                    <img src={imageUrl} alt="Imagem gerada a partir do texto" />
                </div>
            )} */}
            <form onSubmit={handleSubmit} className={styles.form}>
                <textarea
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="Digite seu texto aqui"
                />
                <select value={model} onChange={(e) => setModel(e.target.value)}>
                    <option value="dall-e-3">DALL-E 3</option>
                    <option value="gemini-2.0-flash-exp-image-generation">gemini-2.0-flash-exp-image-generation</option>  {/* Ajuste se necesario */}
                    {/*<option value="gemini-2.0-flash-exp">gemini-2.0-flash-exp</option>   /* Ajuste se necessário */}

                </select>
                <button type="submit">Converter</button>
            </form>

        </div>
    );
}

export default TextToImage;
