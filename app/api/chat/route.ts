import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextRequest } from "next/server";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const { message, history = [] } = await request.json();
    if (!message || typeof message !== "string") {
      return Response.json({ error: "Messaggio mancante" }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return Response.json({ error: "GEMINI_API_KEY non configurata" }, { status: 500 });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const chat = model.startChat({
      history: history.slice(-12).map((item: { role: "user" | "model"; text: string }) => ({
        role: item.role,
        parts: [{ text: item.text }]
      }))
    });

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const result = await chat.sendMessageStream(message);
        for await (const chunk of result.stream) {
          controller.enqueue(encoder.encode(chunk.text()));
        }
        controller.close();
      }
    });

    return new Response(stream, {
      headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" }
    });
  } catch (error) {
    console.error(error);
    return Response.json({ error: "Errore durante la generazione" }, { status: 500 });
  }
}
