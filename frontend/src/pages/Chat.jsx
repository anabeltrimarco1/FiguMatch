import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import ChatList from "../components/chats/ChatList";
import ChatWindow from "../components/chats/ChatWindow";
import {
  getConversations,
  getMessages,
  sendMessage,
} from "../services/messageService.js";
import {
  connectSocket,
  disconnectSocket,
} from "../socket.js";
import "./Chat.css";

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
  if (!dateValue) return "";

  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleTimeString("es-AR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function normalizeConversation(conversation) {
  return {
    id: Number(conversation.id),
    username: conversation.username?.trim() || "Coleccionista",
    lastMessage: conversation.last_message || "Sin mensajes todavía",
    lastMessageAt: formatTime(conversation.last_message_at),
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

function createTemporaryConversation(userId, username, onlineUserIds) {
  return {
    id: Number(userId),
    username: username?.trim() || "Coleccionista",
    lastMessage: "Sin mensajes todavía",
    lastMessageAt: "",
    unread: 0,
    online: onlineUserIds.includes(Number(userId)),
    temporary: true,
  };
}

export default function Chat() {
  const [searchParams] = useSearchParams();

  const requestedUserId = Number(searchParams.get("userId"));
  const requestedUsername = searchParams.get("username") || "Coleccionista";

  const authenticatedUser = useMemo(() => getAuthenticatedUser(), []);
  const authenticatedUserId = Number(authenticatedUser?.id);

  const [conversations, setConversations] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [error, setError] = useState("");
  const [onlineUserIds, setOnlineUserIds] = useState([]);
  const [typingUserId, setTypingUserId] = useState(null);

  const hasRequestedUser =
    Number.isInteger(requestedUserId) &&
    requestedUserId > 0 &&
    requestedUserId !== authenticatedUserId;

  const loadConversations = useCallback(async () => {
    try {
      setLoadingConversations(true);
      setError("");

      const data = await getConversations();

      let normalizedConversations = (data.conversations || []).map(
        (conversation) => {
          const normalized = normalizeConversation(conversation);
          return {
            ...normalized,
            online: onlineUserIds.includes(normalized.id),
          };
        },
      );

      if (
        hasRequestedUser &&
        !normalizedConversations.some(
          (conversation) => conversation.id === requestedUserId,
        )
      ) {
        normalizedConversations = [
          createTemporaryConversation(
            requestedUserId,
            requestedUsername,
            onlineUserIds,
          ),
          ...normalizedConversations,
        ];
      }

      setConversations(normalizedConversations);

      setSelectedUserId((currentUserId) => {
        if (hasRequestedUser) return requestedUserId;

        const currentConversationStillExists = normalizedConversations.some(
          (conversation) =>
            conversation.id === Number(currentUserId),
        );

        if (currentConversationStillExists) return currentUserId;
        return normalizedConversations[0]?.id || null;
      });
    } catch (requestError) {
      console.error("Error al cargar conversaciones:", requestError);

      if (hasRequestedUser) {
        const temporaryConversation = createTemporaryConversation(
          requestedUserId,
          requestedUsername,
          onlineUserIds,
        );

        setConversations([temporaryConversation]);
        setSelectedUserId(requestedUserId);
      }

      setError(
        requestError.response?.data?.message ||
          requestError.response?.data?.error ||
          "No se pudieron cargar las conversaciones.",
      );
    } finally {
      setLoadingConversations(false);
    }
  }, [
    hasRequestedUser,
    requestedUserId,
    requestedUsername,
    onlineUserIds,
  ]);

  const loadMessages = useCallback(async (userId) => {
    if (!userId) {
      setMessages([]);
      return;
    }

    try {
      setLoadingMessages(true);
      setError("");

      const data = await getMessages(userId);
      setMessages((data.messages || []).map(normalizeMessage));
    } catch (requestError) {
      console.error("Error al cargar mensajes:", requestError);
      setMessages([]);
      setError(
        requestError.response?.data?.message ||
          requestError.response?.data?.error ||
          "No se pudieron cargar los mensajes.",
      );
    } finally {
      setLoadingMessages(false);
    }
  }, []);

  useEffect(() => {
    void loadConversations();
  }, [loadConversations]);

  useEffect(() => {
    const token = localStorage.getItem("figuritas_token");
    if (!token) return undefined;

    const socket = connectSocket(token);
    if (!socket) return undefined;

    const handlePresenceList = (users) => {
      setOnlineUserIds(Array.isArray(users) ? users.map(Number) : []);
    };

    const handleUserOnline = (userId) => {
      const normalizedUserId = Number(userId);
      setOnlineUserIds((current) =>
        current.includes(normalizedUserId)
          ? current
          : [...current, normalizedUserId],
      );
    };

    const handleUserOffline = (userId) => {
      const normalizedUserId = Number(userId);
      setOnlineUserIds((current) =>
        current.filter((id) => id !== normalizedUserId),
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
        online: onlineUserIds.includes(Number(conversation.id)),
      })),
    );
  }, [onlineUserIds]);

  useEffect(() => {
    const token = localStorage.getItem("figuritas_token");
    if (!token) return undefined;

    const socket = connectSocket(token);
    if (!socket) return undefined;

    const handleIncomingMessage = (message) => {
      const normalizedMessage = normalizeMessage(message);
      const senderId = Number(normalizedMessage.senderId);
      const isCurrentConversation = senderId === Number(selectedUserId);

      if (isCurrentConversation) {
        setMessages((currentMessages) => {
          const alreadyExists = currentMessages.some(
            (currentMessage) =>
              Number(currentMessage.id) === Number(normalizedMessage.id),
          );

          return alreadyExists
            ? currentMessages
            : [...currentMessages, normalizedMessage];
        });
      }

      setConversations((currentConversations) => {
        const conversationExists = currentConversations.some(
          (conversation) => Number(conversation.id) === senderId,
        );

        if (!conversationExists) {
          void loadConversations();
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
                temporary: false,
              }
            : conversation,
        );
      });
    };

    const handleSentMessage = (message) => {
      const normalizedMessage = normalizeMessage(message);

      if (
        Number(normalizedMessage.receiverId) !== Number(selectedUserId)
      ) {
        return;
      }

      setMessages((currentMessages) => {
        const alreadyExists = currentMessages.some(
          (currentMessage) =>
            Number(currentMessage.id) === Number(normalizedMessage.id),
        );

        return alreadyExists
          ? currentMessages
          : [...currentMessages, normalizedMessage];
      });
    };

    const handleTypingStart = ({ userId }) => {
      if (Number(userId) === Number(selectedUserId)) {
        setTypingUserId(Number(userId));
      }
    };

    const handleTypingStop = ({ userId }) => {
      if (Number(userId) === Number(selectedUserId)) {
        setTypingUserId(null);
      }
    };

    socket.on("message:new", handleIncomingMessage);
    socket.on("message:sent", handleSentMessage);
    socket.on("typing:start", handleTypingStart);
    socket.on("typing:stop", handleTypingStop);

    return () => {
      socket.off("message:new", handleIncomingMessage);
      socket.off("message:sent", handleSentMessage);
      socket.off("typing:start", handleTypingStart);
      socket.off("typing:stop", handleTypingStop);
    };
  }, [selectedUserId, loadConversations]);

  useEffect(() => {
    void loadMessages(selectedUserId);
  }, [selectedUserId, loadMessages]);

  const selectedConversation = conversations.find(
    (conversation) => conversation.id === Number(selectedUserId),
  );

  const handleSelectConversation = (conversationId) => {
    setSelectedUserId(Number(conversationId));
    setTypingUserId(null);

    setConversations((currentConversations) =>
      currentConversations.map((conversation) =>
        conversation.id === Number(conversationId)
          ? { ...conversation, unread: 0 }
          : conversation,
      ),
    );
  };

  const handleSendMessage = async (body) => {
    const cleanBody = String(body || "").trim();

    if (!cleanBody || !selectedUserId || sendingMessage) return;

    try {
      setSendingMessage(true);
      setError("");

      const data = await sendMessage(selectedUserId, cleanBody);
      const createdMessage = normalizeMessage(data.message);

      setMessages((currentMessages) => {
        const alreadyExists = currentMessages.some(
          (currentMessage) =>
            Number(currentMessage.id) === Number(createdMessage.id),
        );

        return alreadyExists
          ? currentMessages
          : [...currentMessages, createdMessage];
      });

      setConversations((currentConversations) => {
        const exists = currentConversations.some(
          (conversation) =>
            conversation.id === Number(selectedUserId),
        );

        const updatedConversation = {
          id: Number(selectedUserId),
          username:
            selectedConversation?.username ||
            requestedUsername ||
            "Coleccionista",
          lastMessage: createdMessage.body,
          lastMessageAt: createdMessage.createdAt,
          unread: 0,
          online: onlineUserIds.includes(Number(selectedUserId)),
          temporary: false,
        };

        if (!exists) {
          return [updatedConversation, ...currentConversations];
        }

        return currentConversations.map((conversation) =>
          conversation.id === Number(selectedUserId)
            ? { ...conversation, ...updatedConversation }
            : conversation,
        );
      });
    } catch (requestError) {
      console.error("Error al enviar el mensaje:", requestError);
      setError(
        requestError.response?.data?.message ||
          requestError.response?.data?.error ||
          "No se pudo enviar el mensaje.",
      );
      throw requestError;
    } finally {
      setSendingMessage(false);
    }
  };

  const handleTypingStartEmit = () => {
    const token = localStorage.getItem("figuritas_token");
    if (!token || !selectedUserId) return;

    const socket = connectSocket(token);

    socket?.emit("typing:start", {
      receiverId: Number(selectedUserId),
    });
  };

  const handleTypingStopEmit = () => {
    const token = localStorage.getItem("figuritas_token");
    if (!token || !selectedUserId) return;

    const socket = connectSocket(token);

    socket?.emit("typing:stop", {
      receiverId: Number(selectedUserId),
    });
  };

  return (
    <section className="chat-page-content">
      <div className="chat-page-inner">
        <div className="page-heading">
          <span className="page-eyebrow">Conversaciones</span>
          <h1>Chat de intercambios</h1>
          <p>Hablá con otros coleccionistas y coordiná tus cambios.</p>
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
            className={`premium-chat ${
              conversations.length === 0
                ? "premium-chat-empty-list"
                : ""
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
                onTypingStart={handleTypingStartEmit}
                onTypingStop={handleTypingStopEmit}
                typing={typingUserId === Number(selectedUserId)}
              />
            )}
          </div>
        )}
      </div>
    </section>
  );
}
