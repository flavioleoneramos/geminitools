import React, { useState, useEffect, useRef } from 'react';
import Head from 'next/head'
import Image from 'next/image'
import Link from 'next/Link'
import styles from '../styles/Home.module.css'
import { FaTrash } from 'react-icons/fa';
import ConfirmationPopup from '/pages/api/ConfirmationPopup';

export default function TextToAudio() {
    const [text, setText] = useState('');
    const [voice, setVoice] = useState('alloy');
    const [audioUrl, setAudioUrl] = useState('');
    const [conversas, setConversas] = useState([]);
    const [error, setError] = useState('');
    const conversasEndRef = useRef(null); // Referência para o fim do contêiner de conversas
    const [emailUser, setEmailUser] = useState('');
    const [showPopup, setShowPopup] = useState(false);

    const handleDeleteClick = () => {
        setShowPopup(true); // Exibe o popup
    };

    const handleConfirmDelete = async () => {
        setShowPopup(false); // Fecha o popup
        try {
            await deleteConversations(); // Chama a função para excluir as conversas
            await fetchConversas(); // Atualiza a lista de conversas
            // alert('Conversas excluídas com sucesso!');
        } catch (error) {
            console.error('Erro ao excluir conversas:', error);
        }
    };

    const handleCancelDelete = () => {
        setShowPopup(false); // Fecha o popup sem excluir
    };

    async function deleteConversations() {

        const AudioToText = 'TextToAudio'; // Nome da tabela a ser excluída
        try {
            const response = await fetch('/api/deleteConversa', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email: emailUser, nomeTabela: AudioToText }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Erro ao excluir conversas');
            }

            alert('Conversas excluídas com sucesso!');
            return data; // Retorna os dados da resposta, como `affectedRows`
        } catch (error) {
            console.error('Erro ao excluir conversas:', error);
            alert('Erro ao excluir conversas');
            throw error; // Lança o erro para ser tratado pelo chamador
        }
    }

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
                <p><button onClick={handleDeleteClick}>
                    <FaTrash size={20} color="red" />
                </button></p>
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
                {showPopup && (
                    <ConfirmationPopup
                        message="Tem certeza de que deseja excluir todas as conversas?"
                        onConfirm={handleConfirmDelete}
                        onCancel={handleCancelDelete}
                    />
                )}

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
