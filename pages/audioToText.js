import { useState, useEffect, useRef } from 'react';
import Head from 'next/head';
import Link from 'next/Link';
import styles from '../styles/Home.module.css';
import { FaTrash, FaHome} from 'react-icons/fa';
import ConfirmationPopup from '/pages/api/ConfirmationPopup';
const AudioTotext = () => {
    const [prompt, setPrompt] = useState('');
    const [audioFile, setAudioFile] = useState(null); // Armazena o arquivo de áudio
    const [responseText, setResponseText] = useState('');
    const [error, setError] = useState('');
    const [conversas, setConversas] = useState([]);
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
            //alert('Conversas excluídas com sucesso!');
        } catch (error) {
            console.error('Erro ao excluir conversas:', error);
        }
    };

    const handleCancelDelete = () => {
        setShowPopup(false); // Fecha o popup sem excluir
    };

    async function deleteConversations() {

        const AudioToText = 'AudioToText'; // Nome da tabela a ser excluída
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
                <p><Link href="./"><FaHome size={30} color="white" /></Link></p>
                <p>Audio To Text</p>
                <p><button onClick={handleDeleteClick}>
                    <FaTrash size={20} color="red" />
                </button></p>
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

            {showPopup && (
                <ConfirmationPopup
                    message="Tem certeza de que deseja excluir todas as conversas?"
                    onConfirm={handleConfirmDelete}
                    onCancel={handleCancelDelete}
                />
            )}

            {/*error && <p style={{ color: 'red' }}>{error}</p>*/}
        </div>
    );
};

export default AudioTotext;