import { useEffect, useRef } from "react";
import MessageBubble from "./MessageBubble";
import MessageInput from "./MessageInput";

export default function ChatWindow({
  conversation,
  messages,
  authenticatedUserId,
  onSendMessage,
  isLoading = false,
  isSending = false,
  typing = false,
  onTypingStart,
  onTypingStop,
}) {
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages]);

  if (!conversation) {
    return (
      <section className="premium-chat-window premium-chat-empty">
        <span aria-hidden="true">💬</span>
        <h2>Elegí una conversación</h2>
        <p>
          Seleccioná un coleccionista para comenzar a chatear.
        </p>
      </section>
    );
  }

  return (
    <section className="premium-chat-window">
      <header className="premium-chat-header">
        <div className="premium-chat-user">
          <div className="premium-avatar-wrapper">
            <div className="premium-chat-avatar large">
              {conversation.username.charAt(0).toUpperCase()}
            </div>

            <span
              className={`premium-presence ${
                conversation.online ? "online" : ""
              }`}
            />
          </div>

          <div>
            <h2>{conversation.username}</h2>

            <span>
              {conversation.online
                ? "En línea"
                : "Desconectado"}
            </span>
          </div>
        </div>

        <button
          type="button"
          className="premium-chat-options"
          aria-label="Opciones de conversación"
        >
          •••
        </button>
      </header>

      <div className="premium-chat-messages">
        <div className="premium-chat-date">
          <span>Hoy</span>
        </div>

        {isLoading ? (
          <div className="chat-loading">
            <span aria-hidden="true">💬</span>
            <p>Cargando mensajes...</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="premium-chat-first-message">
            <span aria-hidden="true">👋</span>
            <strong>Comenzá la conversación</strong>
            <p>
              Preguntale qué figuritas necesita o coordiná un
              intercambio.
            </p>
          </div>
        ) : (
          messages.map((message) => (
            <MessageBubble
              key={message.id}
              message={message}
              isMine={
                message.senderId === authenticatedUserId
              }
            />
          ))
        )}

        {typing && (
          <div className="chat-typing-indicator">
            ✍️ {conversation.username} está escribiendo...
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <MessageInput
        onSendMessage={onSendMessage}
        isSending={isSending}
        onTypingStart={onTypingStart}
        onTypingStop={onTypingStop}
      />
    </section>
  );
}
