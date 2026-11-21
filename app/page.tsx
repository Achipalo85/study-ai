"use client";

import { useRef, useState } from "react";

type Message = { role: "user" | "assistant"; text: string };

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function send() {
    const text = input.trim();
    if (!text || loading) return;

    setInput("");
    setLoading(true);
    setMessages((current) => [...current, { role: "user", text }, { role: "assistant", text: "" }]);

    try {
      const history = messages.slice(-12).map((message) => ({
        role: message.role === "assistant" ? "model" : "user",
        text: message.text
      })) as { role: "user" | "model"; text: string }[];

      const response = await fetch("/api/chat", {
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
    } catch (error) {
      setMessages((current) => {
        const next = [...current];
        next[next.length - 1] = { role: "assistant", text: "Errore: controlla la configurazione GEMINI_API_KEY su Vercel." };
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
        <button className="new-chat" onClick={() => setMessages([])}>＋ Nuova chat</button>
        <nav>
          <button className="active">💬 Chat</button>
          <button onClick={() => document.getElementById("uploader")?.click()}>📷 Foto e PDF</button>
          <button onClick={() => setInput("Creami una mappa mentale sull'argomento: ")}>🧠 Mappe mentali</button>
          <button onClick={() => setInput("Riassumi questo testo in modo chiaro: ")}>📝 Riassunti</button>
        </nav>
      </aside>

      <section className="chat">
        <header><span>Assistente studio</span><button className="upgrade">Pro €3/mese</button></header>
        <div className="messages">
          {messages.length === 0 && (
            <div className="welcome">
              <div className="orb">✦</div>
              <h1>Ciao! Cosa studiamo oggi?</h1>
              <p>Incolla un testo, fai una domanda o carica immagini, PDF e appunti.</p>
              <div className="actions">
                <button onClick={() => setInput("Spiegami passo passo: ")}>Spiega un esercizio</button>
                <button onClick={() => setInput("Creami un quiz su: ")}>Crea un quiz</button>
                <button onClick={() => setInput("Riassumi: ")}>Fai un riassunto</button>
              </div>
            </div>
          )}
          {messages.map((message, index) => (
            <article className={`message ${message.role}`} key={index}>{message.text}</article>
          ))}
        </div>

        <div className="composer">
          <input id="uploader" ref={fileRef} type="file" accept="image/*,.pdf,audio/*" multiple hidden />
          <button className="attach" onClick={() => fileRef.current?.click()} title="Allega">＋</button>
          <textarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                send();
              }
            }}
            placeholder="Scrivi una domanda o incolla un esercizio…"
          />
          <button className="send" onClick={send} disabled={loading || !input.trim()}>➤</button>
        </div>
      </section>
    </main>
  );
}
