async function sendMessage() {
  const input = document.getElementById('chat-input');
  const text = input.value.trim();
  if (!text || chatLoading) return;

  input.value = '';
  input.style.height = 'auto';
  chatLoading = true;
  document.getElementById('chat-send').disabled = true;

  addMsg(text, 'user');
  chatHistory.push({ role: 'user', content: text });
  showTyping();

  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: chatHistory })
    });

    const data = await res.json();
    removeTyping();

    if (!res.ok) {
      addMsg(`Erreur API : ${data.error || 'erreur inconnue'}`, 'bot');
      return;
    }

    addMsg(data.reply || 'Réponse vide.', 'bot');
    chatHistory.push({ role: 'assistant', content: data.reply });
  } catch (err) {
    removeTyping();
    addMsg(`Erreur réseau : ${err.message}`, 'bot');
  } finally {
    chatLoading = false;
    document.getElementById('chat-send').disabled = false;
    input.focus();
  }
}