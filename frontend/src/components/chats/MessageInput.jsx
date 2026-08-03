import { useState } from "react";

export default function MessageInput({ onSendMessage }) {
  const [message, setMessage] = useState("");

  function handleSubmit(e) {
    e.preventDefault();

    if (!message.trim()) return;

    onSendMessage(message);

    setMessage("");
  }

  return (
    <form
      className="premium-message-input"
      onSubmit={handleSubmit}
    >
      <button
        type="button"
        className="emoji-btn"
      >
        😊
      </button>

      <input
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Escribí un mensaje..."
      />

      <button
        type="submit"
        className="send-btn"
      >
        Enviar
      </button>
    </form>
  );
}