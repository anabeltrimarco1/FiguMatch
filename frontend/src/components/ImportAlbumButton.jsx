import { useRef, useState } from "react";
import { api } from "../api.js";

export default function ImportAlbumButton({ onImported }) {
  const inputRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleFile = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    setLoading(true);
    setMessage("");

    try {
      const { data } = await api.post("/import/album", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setMessage(
        `Importado correctamente: ${data.updated} figuritas actualizadas.`,
      );
      onImported?.();
    } catch (err) {
      setMessage(err.response?.data?.error || "No se pudo importar el Excel");
    } finally {
      setLoading(false);
      event.target.value = "";
    }
  };

  return (
    <div className="import-box">
      <input
        ref={inputRef}
        type="file"
        accept=".xlsx,.xls"
        style={{ display: "none" }}
        onChange={handleFile}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={loading}
      >
        {loading ? "Importando..." : "📥 Importar Excel"}
      </button>
      {message && <p>{message}</p>}
    </div>
  );
}
