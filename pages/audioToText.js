import { useState, useEffect, useRef } from 'react';
import Head from 'next/head';
import Link from 'next/Link';
import styles from '../styles/Home.module.css';

const AudioTotext = () => {
    const [prompt, setPrompt] = useState('');
    const [audioFile, setAudioFile] = useState(null); // Armazena o arquivo de áudio
    const [responseText, setResponseText] = useState('');
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

    async function salvarArquivo(file) {
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch('/api/salvarArquivo', {
            method: 'POST',
            body: formData,
        });

        if (!response.ok) {
            throw new Error('Erro ao salvar o arquivo');
        }

        const data = await response.json();
        return data.filePath;
    }

    const handleSubmit = async (e) => {
        e.preventDefault();

        const promptSalvo = prompt;

        const filePath = await salvarArquivo(audioFile);

        await addMessageToConversas(`${promptSalvo} <br> <audio controls src="${filePath}"/>`, 'user');
        setPrompt('');
        setError('');  // Limpa erros anteriores

        const formData = new FormData();
        formData.append('prompt', promptSalvo);
        formData.append('audio', audioFile); // Adiciona o arquivo de áudio ao form data
        formData.append('filePath', filePath); // Adiciona o caminho do arquivo ao form data

        try {
            const response = await fetch('/api/audioToText/', {
                method: 'POST',
                body: formData, // Envia o form data
            });

            if (!response.ok) {
                throw new Error('Erro ao processar áudio e o prompt');
            }

            const data = await response.json();
            const respApi = data.response;
            const formatedText = await formatText(respApi);
            await addMessageToConversas(formatedText, 'bot');
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

        // Formatar o texto ao carregar
        const formattedConversas = conversas.map(conversa => ({
            ...conversa,
            msguser: formatText(`${conversa.msguser} <br> <audio controls src="${conversa.linkArquivo}"/>`),
            msgbot: formatText(conversa.msgbot),
        }));

        return formattedConversas;
    }

    async function fetchConversas() {
        try {
            const conversas = await recuperaConversas(emailUser, 'AudioToText');
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

    return (
        <div>
            <header className={styles.header}>
                <p><Link href="./">Index</Link></p>
                <p>Audio To Text</p>
            </header>
            <div className={styles.conversas}>
                {conversas.length > 0 ? (
                    conversas.map((conversa, index) => (
                        <div key={index} className={styles.conversaItem}>
                            {conversa.msguser && <p className={styles.msguser} dangerouslySetInnerHTML={{ __html: conversa.msguser }}></p>}
                            {conversa.msgbot && <p className={styles.msgbot} dangerouslySetInnerHTML={{ __html: conversa.msgbot }}></p>}
                        </div>
                    ))
                ) : (
                    <p>Nenhuma conversa encontrada.</p>
                )}
                <div ref={conversasEndRef}></div>
            </div>
            <form onSubmit={handleSubmit} className={styles.form}>
                <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    required
                    placeholder="Envie arquivos de áudio para obter respostas"
                />

                <input
                    type="file"
                    accept="audio/*"
                    onChange={(e) => setAudioFile(e.target.files[0])} // Captura o arquivo de áudio
                    required
                />

                <button type="submit">Enviar</button>
            </form>

            {responseText && (
                <div>
                    <h2>Resposta do Modelo:</h2>
                    <p>{responseText}</p>
                </div>
            )}

            {/*error && <p style={{ color: 'red' }}>{error}</p>*/}
        </div>
    );
};

export default AudioTotext;