import { useCallback, useEffect, useMemo, useState } from "react";
import ChatList from "../components/chats/ChatList";
import ChatWindow from "../components/chats/ChatWindow";
import {
  getConversations,
  getMessages,
  sendMessage,
} from "../services/messageService.js";
import "./Chat.css";
import {
  connectSocket,
  disconnectSocket,
} from "../socket.js";

function getAuthenticatedUser() {
  try {
    const storedUser = localStorage.getItem("figuritas_user");

    return storedUser ? JSON.parse(storedUser) : null;
  } catch (error) {
    console.error("No se pudo leer el usuario guardado:", error);
    return null;
  }
}

function formatTime(dateValue) {
  if (!dateValue) {
    return "";
  }

  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleTimeString("es-AR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function normalizeConversation(conversation) {
  return {
    id: Number(conversation.id),
    username:
      conversation.username?.trim() || "Coleccionista",
    lastMessage:
      conversation.last_message || "Sin mensajes todavía",
    lastMessageAt: formatTime(
      conversation.last_message_at
    ),
    unread: Number(conversation.unread || 0),
    online: Boolean(conversation.online),
  };
}

function normalizeMessage(message) {
  return {
    id: Number(message.id),
    tradeRequestId: message.trade_request_id,
    senderId: Number(message.sender_id),
    receiverId: Number(message.receiver_id),
    body: message.body || "",
    createdAt: formatTime(message.created_at),
    rawCreatedAt: message.created_at,
  };
}

export default function Chat() {
  const authenticatedUser = useMemo(
    () => getAuthenticatedUser(),
    []
  );

  const authenticatedUserId = Number(
    authenticatedUser?.id
  );

  const [conversations, setConversations] = useState([]);
  const [selectedUserId, setSelectedUserId] =
    useState(null);
  const [messages, setMessages] = useState([]);

  const [loadingConversations, setLoadingConversations] =
    useState(true);
  const [loadingMessages, setLoadingMessages] =
    useState(false);
  const [sendingMessage, setSendingMessage] =
    useState(false);

  const [error, setError] = useState("");

  const [onlineUserIds, setOnlineUserIds] = useState([]);

  const loadConversations = useCallback(async () => {
    try {
      setLoadingConversations(true);
      setError("");

      const data = await getConversations();

      const normalizedConversations = (
        data.conversations || []
      ).map((conversation) => {
        const normalized = normalizeConversation(conversation);

        return {
          ...normalized,
          online: onlineUserIds.includes(normalized.id),
        };
      });

      setConversations(normalizedConversations);

      setSelectedUserId((currentUserId) => {
        const currentConversationStillExists =
          normalizedConversations.some(
            (conversation) =>
              conversation.id === Number(currentUserId)
          );

        if (currentConversationStillExists) {
          return currentUserId;
        }

        return normalizedConversations[0]?.id || null;
      });
    } catch (requestError) {
      console.error(
        "Error al cargar conversaciones:",
        requestError
      );

      setError(
        requestError.response?.data?.message ||
        requestError.response?.data?.error ||
        "No se pudieron cargar las conversaciones."
      );
    } finally {
      setLoadingConversations(false);
    }
  }, [onlineUserIds]);

  const loadMessages = useCallback(async (userId) => {
    if (!userId) {
      setMessages([]);
      return;
    }

    try {
      setLoadingMessages(true);
      setError("");

      const data = await getMessages(userId);

      const normalizedMessages = (
        data.messages || []
      ).map(normalizeMessage);

      setMessages(normalizedMessages);
    } catch (requestError) {
      console.error(
        "Error al cargar mensajes:",
        requestError
      );

      setError(
        requestError.response?.data?.message ||
        requestError.response?.data?.error ||
        "No se pudieron cargar los mensajes."
      );
    } finally {
      setLoadingMessages(false);
    }
  }, []);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);
  useEffect(() => {
    const token = localStorage.getItem("figuritas_token");

    if (!token) return;

    const socket = connectSocket(token);

    if (!socket) return;

    const handlePresenceList = (users) => {
      setOnlineUserIds(users.map(Number));
    };

    const handleUserOnline = (userId) => {
      userId = Number(userId);

      setOnlineUserIds((current) =>
        current.includes(userId)
          ? current
          : [...current, userId]
      );
    };

    const handleUserOffline = (userId) => {
      userId = Number(userId);

      setOnlineUserIds((current) =>
        current.filter((id) => id !== userId)
      );
    };

    socket.on("presence:list", handlePresenceList);
    socket.on("presence:online", handleUserOnline);
    socket.on("presence:offline", handleUserOffline);

    return () => {
      socket.off("presence:list", handlePresenceList);
      socket.off("presence:online", handleUserOnline);
      socket.off("presence:offline", handleUserOffline);

      disconnectSocket();
    };
  }, []);
  
  useEffect(() => {
    setConversations((current) =>
      current.map((conversation) => ({
        ...conversation,
        online: onlineUserIds.includes(
          Number(conversation.id)
        ),
      }))
    );
  }, [onlineUserIds]);

  /* Mensajes en tiempo real */
  useEffect(() => {
    const token = localStorage.getItem("figuritas_token");

    if (!token) {
      return undefined;
    }

    const socket = connectSocket(token);

    if (!socket) {
      return undefined;
    }

    const handleIncomingMessage = (message) => {
      const normalizedMessage = normalizeMessage(message);
      const senderId = Number(normalizedMessage.senderId);
      const isCurrentConversation =
        senderId === Number(selectedUserId);

      if (isCurrentConversation) {
        setMessages((currentMessages) => {
          const alreadyExists = currentMessages.some(
            (currentMessage) =>
              Number(currentMessage.id) ===
              Number(normalizedMessage.id)
          );

          return alreadyExists
            ? currentMessages
            : [...currentMessages, normalizedMessage];
        });
      }

      setConversations((currentConversations) => {
        const conversationExists =
          currentConversations.some(
            (conversation) =>
              Number(conversation.id) === senderId
          );

        if (!conversationExists) {
          loadConversations();
          return currentConversations;
        }

        return currentConversations.map((conversation) =>
          Number(conversation.id) === senderId
            ? {
                ...conversation,
                lastMessage: normalizedMessage.body,
                lastMessageAt: normalizedMessage.createdAt,
                unread: isCurrentConversation
                  ? 0
                  : Number(conversation.unread || 0) + 1,
              }
            : conversation
        );
      });
    };

    const handleSentMessage = (message) => {
      const normalizedMessage = normalizeMessage(message);

      if (
        Number(normalizedMessage.receiverId) !==
        Number(selectedUserId)
      ) {
        return;
      }

      setMessages((currentMessages) => {
        const alreadyExists = currentMessages.some(
          (currentMessage) =>
            Number(currentMessage.id) ===
            Number(normalizedMessage.id)
        );

        return alreadyExists
          ? currentMessages
          : [...currentMessages, normalizedMessage];
      });
    };

    socket.on("message:new", handleIncomingMessage);
    socket.on("message:sent", handleSentMessage);

    return () => {
      socket.off("message:new", handleIncomingMessage);
      socket.off("message:sent", handleSentMessage);
    };
  }, [selectedUserId, loadConversations]);

  useEffect(() => {
    loadMessages(selectedUserId);
  }, [selectedUserId, loadMessages]);

  const selectedConversation = conversations.find(
    (conversation) =>
      conversation.id === Number(selectedUserId)
  );

  const handleSelectConversation = (conversationId) => {
    setSelectedUserId(Number(conversationId));

    setConversations((currentConversations) =>
      currentConversations.map((conversation) =>
        conversation.id === Number(conversationId)
          ? {
            ...conversation,
            unread: 0,
          }
          : conversation
      )
    );
  };

  const handleSendMessage = async (body) => {
    const cleanBody = String(body || "").trim();

    if (
      !cleanBody ||
      !selectedUserId ||
      sendingMessage
    ) {
      return;
    }

    try {
      setSendingMessage(true);
      setError("");

      const data = await sendMessage(
        selectedUserId,
        cleanBody
      );

      const createdMessage = normalizeMessage(
        data.message
      );

      setMessages((currentMessages) => [
        ...currentMessages,
        createdMessage,
      ]);

      setConversations((currentConversations) =>
        currentConversations.map((conversation) =>
          conversation.id === Number(selectedUserId)
            ? {
              ...conversation,
              lastMessage: createdMessage.body,
              lastMessageAt:
                createdMessage.createdAt,
            }
            : conversation
        )
      );
    } catch (requestError) {
      console.error(
        "Error al enviar el mensaje:",
        requestError
      );

      setError(
        requestError.response?.data?.message ||
        requestError.response?.data?.error ||
        "No se pudo enviar el mensaje."
      );

      throw requestError;
    } finally {
      setSendingMessage(false);
    }
  };

  return (
    <section className="chat-page-content">
      <div className="chat-page-inner">
        <div className="page-heading">
          <span className="page-eyebrow">
            Conversaciones
          </span>

          <h1>Chat de intercambios</h1>

          <p>
            Hablá con otros coleccionistas y coordiná tus cambios.
          </p>
        </div>

        {error && (
          <div className="chat-error" role="alert">
            <span aria-hidden="true">⚠️</span>
            <span>{error}</span>
          </div>
        )}

        {loadingConversations ? (
          <div className="chat-loading">
            <span aria-hidden="true">💬</span>
            <p>Cargando conversaciones...</p>
          </div>
        ) : (
          <div
            className={`premium-chat ${conversations.length === 0 ? "premium-chat-empty-list" : ""
              }`}
          >
            <ChatList
              conversations={conversations}
              selectedUserId={selectedUserId}
              onSelectConversation={handleSelectConversation}
            />

            {conversations.length > 0 && (
              <ChatWindow
                conversation={selectedConversation}
                messages={messages}
                authenticatedUserId={authenticatedUserId}
                isLoading={loadingMessages}
                isSending={sendingMessage}
                onSendMessage={handleSendMessage}
              />
            )}
          </div>
        )}
      </div>
    </section>
  );
}
