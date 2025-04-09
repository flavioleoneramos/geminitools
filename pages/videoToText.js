import Head from 'next/head';
import Link from 'next/Link';
import styles from '../styles/Home.module.css';
import { useState, useEffect, useRef } from 'react';
import { FaTrash } from 'react-icons/fa';
import ConfirmationPopup from '/pages/api/ConfirmationPopup';

export default function VideoToText() {
  const [prompt, setPrompt] = useState('');
  const [videoFile, setVideoFile] = useState(null); // Armazenar o arquivo de vídeo selecionado
  const [uploadMessage, setUploadMessage] = useState('');
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

      const AudioToText = 'VideoToText'; // Nome da tabela a ser excluída
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


  const handleSubmit = async (event) => {
    event.preventDefault();
    const promptSalvo = prompt;
    setPrompt('');

    const filePath = await salvarArquivo(videoFile);
    const videoLocalUrl = `${window.location.origin}${filePath}`;
    await addMessageToConversas(`${promptSalvo} <br> <video controls width="400" height="400"><source src="${videoLocalUrl}" type="video/mp4" /></video>`, 'user');

    const formData = new FormData();
    formData.append('prompt', promptSalvo);
    formData.append('video', videoFile);
    formData.append('filePath', filePath);

    try {
      const response = await fetch('/api/videoToText/', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Erro ao processar o vídeo');
      }

      const data = await response.json();
      const formattedText = await formatText(data.response);
      await addMessageToConversas(formattedText, 'bot');
    } catch (error) {
      console.error('Erro ao processar o vídeo:', error);
      setUploadMessage('Ocorreu um erro ao processar o vídeo.');
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

  async function fetchConversas() {
    try {
      const conversas = await recuperaConversas(emailUser, 'VideoToText');
      setConversas(conversas);
    } catch (err) {
      setError('Erro ao carregar conversas.');
      console.error(err);
    }
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
      msguser: formatText(`${conversa.msguser} <br> <video controls width="400"><source src="${conversa.linkArquivo}" type="video/mp4" /></video>`),
      msgbot: formatText(conversa.msgbot),
    }));

    return formattedConversas;
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
        <title>Video To Text</title>
        <meta name="description" content="Extrair texto de vídeos usando a API Gemini" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className={styles.main}>
        <header className={styles.header}>
          <p><Link href="./">Index</Link></p>
          <p>Video To Text</p>
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

        <div>
          {/*uploadMessage*/}
        </div>
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
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Escreva sua mensagem..."
            />
            <input
              type="file"
              accept="video/mp4"
              onChange={(e) => setVideoFile(e.target.files[0])}
            />
            <button type="submit">Processar Vídeo</button>
          </form>
        </div>
      </main>
    </div>
  );
}