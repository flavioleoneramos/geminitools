import Head from 'next/head'
import { useState, useEffect, useRef } from 'react';
import styles from '../styles/Home.module.css';
import Link from 'next/Link';
import Image from 'next/image';
import { FaTrash } from 'react-icons/fa';
import ConfirmationPopup from '/pages/api/ConfirmationPopup';
export default function ImageToImage() {
    const [image, setImage] = useState(null);
    const [text, setText] = useState('');
    const [responseMessage, setResponseMessage] = useState('');
    const [model, setModel] = useState('gemini-2.0-flash-exp-image-generation'); // Modelo padrão
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
            // alert('Conversas excluídas com sucesso!');
        } catch (error) {
            console.error('Erro ao excluir conversas:', error);
        }
    };

    const handleCancelDelete = () => {
        setShowPopup(false); // Fecha o popup sem excluir
    };

    async function deleteConversations() {

        const AudioToText = 'ImageToImage'; // Nome da tabela a ser excluída
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

    const handleImageChange = (e) => {
        setImage(e);
    };


    async function addMessageToConversas(message, sender) {
        setConversas((prevConversas) => [
            ...prevConversas,
            { msguser: sender === 'user' ? message : '', msgbot: sender === 'bot' ? message : '' }
        ]);
    }

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

    const handleSubmit = async (e) => {
        e.preventDefault();

        const promptSalvo = text;
        setText('');

        const filePath = await salvarArquivo(image);

        const formData = new FormData();
        formData.append('text', promptSalvo);
        formData.append('image', image); // Adiciona o arquivo de imagem ao form data
        formData.append('filePath', filePath); // Adiciona o caminho do arquivo ao form data
        formData.append('model', model); // Adiciona o modelo selecionado ao form data

        await addMessageToConversas(`${promptSalvo} <br> <img src="${filePath}" width="400" height="400"/>`, 'user');
        //return;
        try {
            const response = await fetch('/api/imageToImage/', {
                method: 'POST',
                body: formData
            });

            const data = await response.json();
            const resptSalvo = data.imageUrl;
            await addMessageToConversas(resptSalvo, 'bot');

            //setResponseMessage(data.imageUrl);
            //console.log(data.imageUrl);
        } catch (error) {
            console.error('Error uploading images:', error);
            setResponseMessage('Error uploading images.');
        }
    };

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
            msguser: formatText(conversa.msguser),
            msgbot: formatText(conversa.msgbot),
        }));

        return formattedConversas;
    }

    async function fetchConversas() {
        try {
            const conversas = await recuperaConversas(emailUser, 'ImageToImage');
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
        <div className={styles.container}>
            <Head>
                <title>Image to Image</title>
                <meta name="description" content="Upload two images and a text" />
                <link rel="icon" href="/favicon.ico" />
            </Head>
            <header className={styles.header}>
                <p><Link href="./">Index</Link></p>
                <p>Image To Image</p>
                <p><button onClick={handleDeleteClick}>
                    <FaTrash size={20} color="red" />
                </button></p>
            </header>
            <main className={styles.main}>

                <div className={styles.conversas}>
                    {conversas.length > 0 ? (
                        conversas.map((conversa, index) => (
                            <div key={index} className={styles.conversaItem}>
                                {/* Renderiza o texto e a imagem enviada pelo usuário */}
                                {conversa.msguser && (
                                    <p className={styles.msguser}>
                                        <span dangerouslySetInnerHTML={{ __html: conversa.msguser }}></span><br />
                                        {conversa.linkArquivo && (
                                            <img
                                                src={conversa.linkArquivo}
                                                width={400}
                                                height={400}
                                                alt="Imagem enviada pelo usuário"
                                            />
                                        )}
                                    </p>
                                )}
                                {/* Renderiza a resposta do bot */}
                                {conversa.msgbot && (
                                    <p className={styles.msgbot}>
                                        <img
                                            src={conversa.msgbot}
                                            width={400}
                                            height={400}
                                            alt="Imagem gerada pelo bot"
                                        />
                                    </p>
                                )}
                            </div>
                        ))
                    ) : (
                        <p>Nenhuma conversa encontrada.</p>
                    )}
                    <div ref={conversasEndRef}></div>
                </div>

                {/**<div>
                    {responseMessage && <p><img src={responseMessage} alt="Generated Image" /></p>}
                </div> */}

                {showPopup && (
                    <ConfirmationPopup
                        message="Tem certeza de que deseja excluir todas as conversas?"
                        onConfirm={handleConfirmDelete}
                        onCancel={handleCancelDelete}
                    />
                )}
                <div>
                    <form onSubmit={handleSubmit} className={styles.form}>
                        <textarea
                            value={text}
                            onChange={(e) => setText(e.target.value)}
                            placeholder="Digite o prompt"
                            required
                        />
                        <div className={styles.selectContainer}>
                            <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => handleImageChange(e.target.files[0])}
                                required
                            />
                            <select
                                value={model}
                                onChange={(e) => setModel(e.target.value)}
                                required
                            >
                                <option value="gemini-2.0-flash-exp-image-generation">Gemini 2.0 Flash Exp</option>
                                <option value="dall-e-2">Dall-e-2</option>
                            </select>
                        </div>
                        <button type="submit">Enviar</button>
                    </form>
                </div>

            </main>
        </div>
    );
}
