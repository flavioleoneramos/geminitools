import Head from 'next/head'
import { useState, useEffect } from 'react';
import styles from '../styles/Home.module.css';
import Link from 'next/Link';
import Image from 'next/image';

export default function ImageToImage() {
    const [image, setImage] = useState(null);
    const [text, setText] = useState('');
    const [responseMessage, setResponseMessage] = useState('');
    const [error, setError] = useState('');
    const [conversas, setConversas] = useState([]);

    const handleImageChange = (e) => {
        setImage(e.target.files[0]);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        const formData = new FormData();
        formData.append('image', image);
        formData.append('text', text);

        try {
            const response = await fetch('/api/imageToImage/', {
                method: 'POST',
                body: formData
            });
            const data = await response.json();
            setResponseMessage(data.imageUrl);
            console.log(data.imageUrl);
        } catch (error) {
            console.error('Error uploading images:', error);
            setResponseMessage('Error uploading images.');
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
                const conversas = await recuperaConversas('flavioleone8383@gmail.com', 'ImageToImage');
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
                <title>Image to Image</title>
                <meta name="description" content="Upload two images and a text" />
                <link rel="icon" href="/favicon.ico" />
            </Head>
            <header className={styles.header}>
                <h1><Link href="./">Index</Link></h1>
                <h1>Image To Image</h1>
            </header>
            <main className={styles.main}>
                
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
                    {responseMessage && <p><img src={responseMessage} alt="Generated Image" /></p>}
                </div>
                <div>
                    <form onSubmit={handleSubmit} className={styles.form}>
                        <label htmlFor="image">Image:</label>
                        <input type="file" accept="image/*" onChange={handleImageChange} required />

                        <label htmlFor="text">Text:</label>
                        <input type="text" value={text} onChange={(e) => setText(e.target.value)} required />
                        <button type="submit">Submit</button>
                    </form>
                </div>

            </main>
        </div>
    );
}
