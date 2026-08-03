export default function MessageBubble({ message, isMine }) {
  return (
    <div className={`premium-message-row ${isMine ? "mine" : ""}`}>
      <div
        className={`premium-message-bubble ${
          isMine ? "mine" : "other"
        }`}
      >
        <p>{message.body}</p>

        <span className="premium-message-time">
          {message.createdAt}
        </span>
      </div>
    </div>
  );
}