import Head from 'next/head';
import Link from 'next/Link';
import styles from '../styles/Home.module.css';
import { useState, useEffect } from 'react';

export default function VideoToText() {
  const [prompt, setPrompt] = useState('');
  const [videoFile, setVideoFile] = useState(null); // Armazenar o arquivo de vídeo selecionado
  const [uploadMessage, setUploadMessage] = useState('');
  const [error, setError] = useState('');
  const [conversas, setConversas] = useState([]);


  async function addMessageToConversas(message, sender) {
    setConversas((prevConversas) => [
      ...prevConversas,
      { msguser: sender === 'user' ? message : '', msgbot: sender === 'bot' ? message : '' }
    ]);
  }


  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!prompt || !videoFile) {
      setUploadMessage('Por favor, insira um prompt e selecione um arquivo de vídeo.');
      return;
    }

    await addMessageToConversas(prompt,'user');

    const formData = new FormData();
    formData.append('prompt', prompt); // Adiciona o prompt
    formData.append('video', videoFile); // Adiciona o arquivo de vídeo

    try {
      const response = await fetch('/api/videoToText/', {
        method: 'POST',
        body: formData, // Envia o form data contendo o arquivo e o prompt
      });

      if (!response.ok) {
        throw new Error('Erro ao processar o vídeo');
      }

      const data = await response.json();
      await addMessageToConversas(data.response, 'bot');
      //setUploadMessage(data.response); // Exibe a resposta do backend
    } catch (error) {
      console.error('Erro ao processar o vídeo:', error);
      setUploadMessage('Ocorreu um erro ao processar o vídeo.');
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
        const conversas = await recuperaConversas('flavioleone8383@gmail.com', 'VideoToText');
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
        <title>Video To Text</title>
        <meta name="description" content="Extrair texto de vídeos usando a API Gemini" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className={styles.main}>
        <header className={styles.header}>
          <h1><Link href="/">Index</Link></h1>
          <h1>Video To Text</h1>
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
          {uploadMessage}
        </div>
        <div>
          <form onSubmit={handleSubmit} className={styles.form}>
            <input
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Digite o prompt..."
            /><br />

            <input
              type="file"
              accept="video/mp4" // Aceita apenas arquivos de vídeo MP4
              onChange={(e) => setVideoFile(e.target.files[0])} // Atualiza o arquivo selecionado
            />
            <button type="submit">Processar Vídeo</button>
          </form>
        </div>


      </main>
    </div>
  );
}
