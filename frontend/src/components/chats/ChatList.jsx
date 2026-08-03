import { useMemo, useState } from "react";

export default function ChatList({
  conversations = [],
  selectedUserId,
  onSelectConversation,
}) {
  const [search, setSearch] = useState("");

  const filteredConversations = useMemo(() => {
    const normalizedSearch = search
      .trim()
      .toLocaleLowerCase("es");

    if (!normalizedSearch) {
      return conversations;
    }

    return conversations.filter((conversation) => {
      const username = String(
        conversation.username || ""
      ).toLocaleLowerCase("es");

      const lastMessage = String(
        conversation.lastMessage || ""
      ).toLocaleLowerCase("es");

      return (
        username.includes(normalizedSearch) ||
        lastMessage.includes(normalizedSearch)
      );
    });
  }, [conversations, search]);

  return (
    <aside className="premium-chat-sidebar">
      <header className="premium-chat-sidebar-header">
        <div>
          <span className="premium-chat-eyebrow">
            Tus mensajes
          </span>

          <h2>Conversaciones</h2>
        </div>

        <span
          className="premium-chat-counter"
          title={`${conversations.length} conversaciones`}
        >
          {conversations.length}
        </span>
      </header>

      <label className="premium-chat-search">
        <span aria-hidden="true">🔍</span>

        <input
          type="search"
          value={search}
          placeholder="Buscar conversación..."
          aria-label="Buscar conversación"
          onChange={(event) =>
            setSearch(event.target.value)
          }
        />

        {search && (
          <button
            type="button"
            className="premium-search-clear"
            aria-label="Limpiar búsqueda"
            onClick={() => setSearch("")}
          >
            ×
          </button>
        )}
      </label>

      <div className="premium-chat-conversations">
        {conversations.length === 0 && (
          <div className="premium-chat-list-empty">
            <span aria-hidden="true">💬</span>

            <strong>
              Todavía no tenés conversaciones
            </strong>

            <p>
              Iniciá un chat desde una coincidencia o una
              solicitud de intercambio.
            </p>
          </div>
        )}

        {conversations.length > 0 &&
          filteredConversations.length === 0 && (
            <div className="premium-chat-list-empty compact">
              <span aria-hidden="true">🔎</span>

              <strong>
                No encontramos conversaciones
              </strong>

              <p>
                Probá buscando con otro nombre o mensaje.
              </p>
            </div>
          )}

        {filteredConversations.map((conversation) => {
          const isSelected =
            Number(conversation.id) ===
            Number(selectedUserId);

          const username =
            conversation.username || "Coleccionista";

          const avatarLetter = username
            .trim()
            .charAt(0)
            .toUpperCase();

          return (
            <button
              key={conversation.id}
              type="button"
              className={`premium-conversation ${
                isSelected ? "active" : ""
              }`}
              aria-pressed={isSelected}
              onClick={() =>
                onSelectConversation(conversation.id)
              }
            >
              <div className="premium-avatar-wrapper">
                <div className="premium-chat-avatar">
                  {avatarLetter || "?"}
                </div>

                <span
                  className={`premium-presence ${
                    conversation.online ? "online" : ""
                  }`}
                  title={
                    conversation.online
                      ? "En línea"
                      : "Desconectado"
                  }
                  aria-label={
                    conversation.online
                      ? "En línea"
                      : "Desconectado"
                  }
                />
              </div>

              <div className="premium-conversation-content">
                <div className="premium-conversation-heading">
                  <strong>{username}</strong>

                  <time>
                    {conversation.lastMessageAt || ""}
                  </time>
                </div>

                <div className="premium-conversation-preview">
                  <span>
                    {conversation.lastMessage ||
                      "Sin mensajes todavía"}
                  </span>

                  {Number(conversation.unread) > 0 && (
                    <span className="premium-unread">
                      {conversation.unread > 99
                        ? "99+"
                        : conversation.unread}
                    </span>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </aside>
  );
}