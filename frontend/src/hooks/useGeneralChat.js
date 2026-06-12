import { useState } from 'react';
import { authFetch } from '../lib/api';

const API_BASE = '';

export default function useGeneralChat() {
  const [generalChatMessages, setGeneralChatMessages] = useState([]);
  const [generalChatInput, setGeneralChatInput] = useState('');
  const [generalChatLoading, setGeneralChatLoading] = useState(false);
  const [generalChatError, setGeneralChatError] = useState('');
  const [chatOpen, setChatOpen] = useState(false);

  const handleGeneralChatSend = async () => {
    const trimmed = generalChatInput.trim();
    if (!trimmed || generalChatLoading) return;

    const nextMessages = [...generalChatMessages, { role: 'user', content: trimmed }];
    setGeneralChatMessages(nextMessages);
    setGeneralChatInput('');
    setGeneralChatLoading(true);
    setGeneralChatError('');

    try {
      const response = await authFetch(`${API_BASE}/api/chat/general`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: nextMessages }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.message || 'No se pudo generar respuesta');
      }

      if (data?.content) {
        setGeneralChatMessages([...nextMessages, { role: 'assistant', content: data.content }]);
      }
    } catch (error) {
      console.error('Error sending general chat:', error);
      setGeneralChatError(error.message || 'Error inesperado');
    } finally {
      setGeneralChatLoading(false);
    }
  };

  return {
    generalChatMessages, generalChatInput, generalChatLoading, generalChatError,
    chatOpen, setChatOpen, setGeneralChatInput, handleGeneralChatSend,
  };
}
