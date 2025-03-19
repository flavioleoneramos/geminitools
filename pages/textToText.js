import Head from 'next/head'
import Link from 'next/Link'
import styles from '../styles/Home.module.css'
import { useState, useEffect, useRef } from 'react';
export default function TextToText() {

    const [inputText, setInputText] = useState('');
    const [result, setResult] = useState('');
    const [model, setModel] = useState('gemini-2.0-flash-exp'); // Novo state para o modelo
    const [conversas, setConversas] = useState([]);
    const [error, setError] = useState('');
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

    async function addMessageToConversas(message, sender) {
        const formattedMessage = await formatText(message);
        setConversas((prevConversas) => [
            ...prevConversas,
            { msguser: sender === 'user' ? formattedMessage : '', msgbot: sender === 'bot' ? formattedMessage : '' }
        ]);
    }

    const handleSubmit = async (e) => {
        e.preventDefault();

        const textSalvo = inputText;
        setInputText('');
        await addMessageToConversas(textSalvo, 'user');
        const response = await fetch('/api/textToText/',
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ texto: textSalvo, model }) // Envia o texto e o modelo
            });
        const data = await response.json();
        //setResult(data.message);
        await addMessageToConversas(data.message, 'bot');

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
            msguser: formatText(conversa.msguser),
            msgbot: formatText(conversa.msgbot),
        }));

        return formattedConversas;
    }

    async function fetchConversas() {
        try {
            const conversas = await recuperaConversas(emailUser, 'TextToText');
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
                <title>Text To Text</title>
                <meta name="description" content="Generated text for text using Gemini API or GPT-4o" />
                <link rel="icon" href="/favicon.ico" />
            </Head>

            <main className={styles.main}>
                <header className={styles.header1}>
                    <p><Link href="./">Index</Link></p>
                    <p>Text To Text</p>
                </header>
                <div className={styles.conversas1}>
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

                <div>
                    <p>{result}</p>
                </div>
                <div>
                    <form onSubmit={handleSubmit} className={styles.form}>
                        <select value={model} onChange={(e) => setModel(e.target.value)}>
                            <option value="gemini-2.0-flash-exp">gemini-2.0-flash-exp</option>
                            <option value="gemini-1.5-pro">gemini-1.5-pro</option>
                            <option value="gemini-1.5-flash">gemini-1.5-flash</option>
                        </select>
                        <textarea
                            className={styles.textarea1}
                            value={inputText}
                            onChange={(e) => setInputText(e.target.value)}
                            placeholder="Digite o texto aqui"
                        />

                        <button type="submit">Enviar</button>
                    </form></div>

            </main>

        </div>
    );
}