import { useState } from "react";

export default function MessageInput({
  onSendMessage,
  isSending = false,
  onTypingStart,
  onTypingStop,
}) {
  const [message, setMessage] = useState("");
  const [localError, setLocalError] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();

    const cleanMessage = message.trim();

    if (!cleanMessage || isSending) {
      return;
    }

    try {
      setLocalError("");

      await onSendMessage(cleanMessage);

      setMessage("");

      // Dejar de mostrar "escribiendo..."
      onTypingStop?.();
    } catch (error) {
      console.error("No se pudo enviar el mensaje:", error);

      setLocalError(
        "No se pudo enviar. El mensaje quedó escrito para que puedas reintentar.",
      );
    }
  }

  return (
    <div>
      <form
        className="premium-message-input"
        onSubmit={handleSubmit}
      >
        <button
          type="button"
          className="emoji-btn"
          disabled={isSending}
        >
          😊
        </button>

        <input
          value={message}
          onChange={(event) => {
            const value = event.target.value;

            setMessage(value);

            if (value.trim()) {
              onTypingStart?.();
            } else {
              onTypingStop?.();
            }
          }}
          onBlur={() => onTypingStop?.()}
          placeholder="Escribí un mensaje..."
          disabled={isSending}
        />

        <button
          type="submit"
          className="send-btn"
          disabled={isSending || !message.trim()}
        >
          {isSending ? "Enviando..." : "Enviar"}
        </button>
      </form>

      {localError && (
        <p className="chat-input-error">
          {localError}
        </p>
      )}
    </div>
  );
}