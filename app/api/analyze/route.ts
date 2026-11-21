import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextRequest } from "next/server";

export const runtime = "nodejs";

const MAX_AUDIO_BYTES = 2 * 1024 * 1024 * 1024;
const MAX_PDF_PAGES = 100;

export async function POST(request: NextRequest) {
  try {
    const form = await request.formData();
    const prompt = String(form.get("prompt") || "Analizza i contenuti allegati.");
    const files = form.getAll("files").filter((item): item is File => item instanceof File);

    if (!files.length) return Response.json({ error: "Nessun file allegato" }, { status: 400 });

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return Response.json({ error: "GEMINI_API_KEY non configurata" }, { status: 500 });

    for (const file of files) {
      if (file.type.startsWith("audio/") && file.size > MAX_AUDIO_BYTES) {
        return Response.json({ error: "Audio troppo grande: limite 2 GB" }, { status: 413 });
      }
      if (file.type === "application/pdf" && file.size > 100 * 1024 * 1024) {
        return Response.json({ error: "PDF troppo grande per l'elaborazione demo" }, { status: 413 });
      }
    }

    const model = new GoogleGenerativeAI(apiKey).getGenerativeModel({ model: "gemini-2.5-flash" });
    const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [{ text: prompt }];

    for (const file of files.slice(0, 20)) {
      if (file.type.startsWith("image/") || file.type === "application/pdf" || file.type.startsWith("audio/")) {
        const bytes = Buffer.from(await file.arrayBuffer());
        parts.push({ inlineData: { mimeType: file.type, data: bytes.toString("base64") } });
      }
    }

    const result = await model.generateContent({
      contents: [{ role: "user", parts }],
      systemInstruction: "Sei Study AI, assistente scolastico italiano. Analizza documenti, foto, PDF e audio. Rispondi in italiano con spiegazioni passo-passo, riassunti, punti chiave e mappe mentali quando utile."
    });

    return Response.json({ text: result.response.text(), maxPdfPages: MAX_PDF_PAGES });
  } catch (error) {
    console.error(error);
    return Response.json({ error: "Errore nell'elaborazione del materiale" }, { status: 500 });
  }
}
