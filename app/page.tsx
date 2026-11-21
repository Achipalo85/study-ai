"use client";

import { useRef, useState } from "react";

type Message = { role: "user" | "assistant"; text: string };

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  function selectFiles(selected: FileList | null) {
    if (!selected) return;
    setFiles(Array.from(selected).slice(0, 20));
  }

  async function send() {
    const text = input.trim();
    if ((!text && files.length === 0) || loading) return;

    const label = text || "Analizza i contenuti allegati.";
    setInput("");
    setLoading(true);
    setMessages((current) => [...current, { role: "user", text: label }, { role: "assistant", text: "" }]);

    try {
      let response: Response;
      if (files.length) {
        const form = new FormData();
        form.append("prompt", label);
        files.forEach((file) => form.append("files", file));
        setFiles([]);
        response = await fetch("/api/analyze", { method: "POST", body: form });
        if (!response.ok) throw new Error(await response.text());
        const data = await response.json();
        setMessages((current) => {
          const next = [...current];
          next[next.length - 1] = { role: "assistant", text: data.text || "Nessun risultato." };
          return next;
        });
      } else {
        const history = messages.slice(-12).map((message) => ({
          role: message.role === "assistant" ? "model" : "user",
          text: message.text
        })) as { role: "user" | "model"; text: string }[];
        response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: text, history })
        });
        if (!response.ok) throw new Error(await response.text());
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        while (reader) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          setMessages((current) => {
            const next = [...current];
            next[next.length - 1] = { role: "assistant", text: next[next.length - 1].text + chunk };
            return next;
          });
        }
      }
    } catch (error) {
      setMessages((current) => {
        const next = [...current];
        next[next.length - 1] = { role: "assistant", text: "Errore: controlla GEMINI_API_KEY e i limiti dei file su Vercel." };
        return next;
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <main>
      <aside className="sidebar">
        <div className="brand"><span className="logo">S</span><b>Study AI</b></div>
        <button className="new-chat" onClick={() => { setMessages([]); setFiles([]); }}>＋ Nuova chat</button>
        <nav>
          <button className="active">💬 Chat</button>
          <button onClick={() => fileRef.current?.click()}>📷 Foto e PDF</button>
          <button onClick={() => fileRef.current?.click()}>🎙️ Audio lezioni</button>
          <button onClick={() => setInput("Crea una mappa mentale sull'argomento: ")}>🧠 Mappe mentali</button>
          <button onClick={() => setInput("Riassumi i contenuti allegati in modo chiaro:")}>📝 Riassunti</button>
        </nav>
      </aside>

      <section className="chat">
        <header><span>Assistente studio</span><button className="upgrade">Pro €3/mese</button></header>
        <div className="messages">
          {messages.length === 0 && (
            <div className="welcome">
              <div className="orb">✦</div>
              <h1>Ciao! Cosa studiamo oggi?</h1>
              <p>Fai una domanda o carica foto, appunti, PDF e registrazioni delle lezioni.</p>
              <div className="actions">
                <button onClick={() => setInput("Spiegami passo passo: ")}>Spiega un esercizio</button>
                <button onClick={() => setInput("Crea un quiz su: ")}>Crea un quiz</button>
                <button onClick={() => setInput("Riassumi i contenuti allegati:")}>Fai un riassunto</button>
              </div>
            </div>
          )}
          {messages.map((message, index) => (
            <article className={`message ${message.role}`} key={index}>{message.text}</article>
          ))}
        </div>

        {files.length > 0 && (
          <div className="file-list">
            {files.map((file) => <span key={`${file.name}-${file.size}`}>📎 {file.name}</span>)}
            <button onClick={() => setFiles([])}>Rimuovi</button>
          </div>
        )}

        <div className="composer">
          <input ref={fileRef} type="file" accept="image/*,.pdf,audio/*" multiple hidden onChange={(event) => selectFiles(event.target.files)} />
          <button className="attach" onClick={() => fileRef.current?.click()} title="Allega foto, PDF o audio">＋</button>
          <textarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); send(); }
            }}
            placeholder="Scrivi una domanda o carica il materiale…"
          />
          <button className="send" onClick={send} disabled={loading || (!input.trim() && files.length === 0)}>➤</button>
        </div>
      </section>
    </main>
  );
}
