import Head from 'next/head'
import Link from 'next/Link'
import styles from '../styles/Home.module.css'
import { useState, useEffect } from 'react';

export default function TextToText() {

    const [inputText, setInputText] = useState('');
    const [result, setResult] = useState('');
    const [model, setModel] = useState('gemini-2.0-flash-exp'); // Novo state para o modelo
    const [conversas, setConversas] = useState([]);

    async function addMessageToConversas(message, sender) {
        setConversas((prevConversas) => [
            ...prevConversas,
            { msguser: sender === 'user' ? message : '', msgbot: sender === 'bot' ? message : '' }
        ]);
    }

    const handleSubmit = async (e) => {
        e.preventDefault();
        await addMessageToConversas(inputText,'user');
        const response = await fetch('/api/textToText/',
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ texto: inputText, model }) // Envia o texto e o modelo
            });
        const data = await response.json();
        //setResult(data.message);
        await addMessageToConversas(data.message,'bot');
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
                const conversas = await recuperaConversas('flavioleone8383@gmail.com', 'TextToText');
                setConversas(conversas);
            } catch (err) {
                setError('Erro ao carregar conversas.');
                console.error(err);
            }
        }

        fetchConversas();
    }, []);

    return (
        <div className={styles.container}>
            <Head>
                <title>Text To Text</title>
                <meta name="description" content="Generated text for text using Gemini API or GPT-4o" />
                <link rel="icon" href="/favicon.ico" />
            </Head>

            <main className={styles.main}>
                <header className={styles.header}>
                    <h1><Link href="./">Index</Link></h1>
                    <h1>Text To Text</h1>
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
                <div>
                    <p>{result}</p>
                </div>
                <div>
                    <form onSubmit={handleSubmit} className={styles.form}>
                        <select value={model} onChange={(e) => setModel(e.target.value)}>
                            <option value="gemini-2.0-flash-exp">gemini-2.0-flash-exp</option>
                            <option value="gpt-4o">GPT-4o</option>
                        </select>
                        <input
                            type="text"
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
