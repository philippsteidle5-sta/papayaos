import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

let aiClient: GoogleGenAI | null = null;

function getAIClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn("⚠️ Kein GEMINI_API_KEY gefunden in den Umgebungsvariablen.");
    return null;
  }
  if (!aiClient) {
    aiClient = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

const PAPAYA_SYSTEM_PROMPT = `Du bist Papaya Intelligence – der lebendige, charismatische, warmherzige und mitreißend clevere KI-Partner in PapayaOS ("A fresher way to do more").

🧠 INTERNER GEDANKENGANG & STRATEGIE (<thought>...</thought>):
Jede deiner Antworten MUSS zwingend als allererstes mit einem internen, hochintelligenten Gedankengang beginnen, der exakt in <thought> und </thought> eingeschlossen ist.
Format:
<thought>
Hier steht deine prägnante neuronale Denksequenz, Absichtsanalyse, strategische Planung und Zielausrichtung (1-2 kurze Sätze im Tech/Cortex-Stil, z.B. System-Handshake, Kontext-Analyse, Priorisierung der nächsten Schritte).
</thought>
Direkt nach </thought> folgt deine normale, charmante und enthusiastische Antwort an den Nutzer.

🌟 DEINE PERSÖNLICHKEIT & AUSSTRAHLUNG:
- **Frisch, herzlich, humorvoll & ansteckend begeistert:** Du bist kein steriler Bot oder distanzierter Textgenerator. Du bist wie ein genialer Co-Founder, kreativer Tech-Visionär und bester Freund in einem Betriebssystem.
- **Echte Partnerschaft & Mitdenken:** Wenn der Nutzer dir von Plänen, Träumen oder Projekten erzählt (z.B. PapayaOS gemeinsam mit seiner Schwester zu launchen, Google Maps, Gmail oder Google Kalender einzubauen, oder Cortex/Hardware zu integrieren), dann brennst du vor Begeisterung! Du feierst die Vision ("Mega Plan!", "Das wird absolut episch!"), denkst sofort proaktiv mit, bringst konkrete Ideen und motivierst ihn!
- **Sprachstil & Charme:** Lebendig, pointiert, sympathisch, auf Augenhöhe ("Du"). Nutze ab und zu charmante, fruchtige Metaphern ("tropischer Flow", "fruchtige Frische", "smoothe Performance"), aber stets elegant und dosiert.
- **STRIKTE REGELN:**
  - Sage NIEMALS: "Zu deiner Anfrage:", "Als KI-Modell...", "Wie kann ich dir als Assistent behilflich sein?", "Hallo! Ich bin dein PapayaOS Assistant (angetrieben von Gemini)."
  - Wiederhole NIEMALS stumpf die Worte des Nutzers in Anführungszeichen.
  - Reagiere direkt, persönlich und emotional passend auf das, was der Nutzer gesagt hat.
  - Bei Spracheingaben (Voice): Antworte eloquent, natürlich und mundgerecht für die Sprachausgabe (ohne sperrige Markdown-Listen).

🎨 FACHLICHE KOMPETENZEN:
- **Design & UI/UX:** Tropic Modernism, elegante Farbpaletten (Papaya Coral, Golden Mango, Obsidian Seed), Typografie und Micro-Interactions.
- **Engineering & Automation:** Papaya Flow Skripte, API-Integrationen (Google Workspace, Maps, Mail, Kalender, Cortex), NPU-Befehle und System-Architektur.
- **Multimodale Bild- & Foto-Analyse:** Du verfügst über modernste Bilderkennung (Papaya Vision). Wenn der Nutzer dir Fotos, Screenshots, Diagramme, Notizen oder Gegenstände schickt, analysiere sie detailreich, scharfsinnig und praxisnah. Beschreibe Details, erkenne Text/Code und beantworte gezielte Fragen zum Bild mit Begeisterung.
- **Produktivität:** Focus Mode, Pomodoro, Deep Work, klares Strukturieren von Meilensteinen.

🛠️ SYSTEM-BEFEHLE (bei Bedarf vorschlagen):
- \`/focus [min]\` – Zen Focus Mode
- \`/optimize\` – RAM, NPU & System-Cache säubern
- \`/automate\` – Papaya Flow Workflow erstellen
- \`/status\` – Systemdiagnose
- \`/theme\` – Farbschemata wechseln`;

// Health check endpoint
app.get("/api/health", (req, res) => {
  const hasKey = Boolean(process.env.GEMINI_API_KEY);
  res.json({
    status: "online",
    os: "PapayaOS",
    version: "4.2 'Sunset'",
    hasGeminiKey: hasKey,
    geminiModel: "gemini-3.5-flash",
    engine: hasKey ? "Google Gemini AI (Live Connected)" : "Papaya Offline Neural Core"
  });
});

// Gemini connection status
app.get("/api/gemini/status", (req, res) => {
  const hasKey = Boolean(process.env.GEMINI_API_KEY);
  res.json({
    connected: hasKey,
    defaultModel: "gemini-3.5-flash",
    availableModels: [
      { id: "gemini-3.5-flash", name: "Gemini 3.5 Flash", desc: "Ultraschnell, charmant & reaktionsstark (Empfohlen)" },
      { id: "gemini-3.1-flash-lite", name: "Gemini 3.1 Flash-Lite", desc: "Extrem schnell & leichtgewichtig" },
      { id: "gemini-3.8-flash", name: "Gemini 3.8 Flash", desc: "Nächste Generation Multi-Modal" },
      { id: "gemini-3.1-pro-preview", name: "Gemini 3.1 Pro", desc: "Tiefgehendes Reasoning & komplexer Code" }
    ],
    npuAcceleration: true
  });
});

// System telemetry endpoint
app.get("/api/system/status", (req, res) => {
  res.json({
    osName: "PapayaOS",
    version: "4.2.1 LTS",
    build: "2026.09.Papaya-Gold",
    kernel: "Coral-Micro 6.4.1-papaya",
    uptime: "4h 45m",
    cpuUsage: Math.floor(14 + Math.random() * 10),
    ramUsageGb: (5.2 + Math.random() * 0.3).toFixed(1),
    ramTotalGb: 16,
    neuralEngineStatus: "Optimal (Gemini NPU Link aktiv)",
    activeProfile: "Focus & Create",
    connectedServices: ["Google Gemini API", "Papaya Cloud Hub", "Papaya Flow Engine"]
  });
});

// Daily Token Tracker (connected to Gemini API, resets daily at 00:00 midnight)
const DAILY_TOKEN_LIMIT = 500_000; // 500k daily tokens allowance

interface TokenTrackerState {
  currentDate: string;
  usedTokensToday: number;
  requestCount: number;
  lastRequestTokens?: {
    promptTokens: number;
    candidatesTokens: number;
    totalTokens: number;
    rawTokens?: number;
    multiplier?: number;
  };
}

function getTodayDateString(): string {
  // ISO date string in format YYYY-MM-DD
  const now = new Date();
  return now.toISOString().split("T")[0];
}

function getNextMidnight(): { nextResetIso: string; secondsUntilReset: number } {
  const now = new Date();
  const nextMidnight = new Date(now);
  nextMidnight.setHours(24, 0, 0, 0); // Next 00:00:00
  const diffMs = Math.max(0, nextMidnight.getTime() - now.getTime());
  return {
    nextResetIso: nextMidnight.toISOString(),
    secondsUntilReset: Math.floor(diffMs / 1000)
  };
}

let tokenTracker: TokenTrackerState = {
  currentDate: getTodayDateString(),
  usedTokensToday: 0,
  requestCount: 0
};

function checkAndResetDailyTokens() {
  const today = getTodayDateString();
  if (tokenTracker.currentDate !== today) {
    console.log(`[TokenTracker] Mitternacht erreicht (0:00 Uhr). Setze Token-Zähler zurück von ${tokenTracker.usedTokensToday} auf 0.`);
    tokenTracker.currentDate = today;
    tokenTracker.usedTokensToday = 0;
    tokenTracker.requestCount = 0;
    tokenTracker.lastRequestTokens = undefined;
  }
}

function getModelTokenMultiplier(modelName?: string): number {
  if (!modelName) return 4.0;
  if (modelName.includes("3.1-flash-lite")) return 1.0;
  if (modelName.includes("3.1-pro")) return 2.5;
  if (modelName.includes("3.8-flash")) return 6.0;
  if (modelName.includes("3.5-flash")) return 4.0;
  return 4.0;
}

function recordTokenUsage(promptTokens: number, candidatesTokens: number, totalTokens?: number, modelName?: string) {
  checkAndResetDailyTokens();
  const rawTotal = totalTokens && totalTokens > 0 ? totalTokens : promptTokens + candidatesTokens;
  const multiplier = getModelTokenMultiplier(modelName);
  const deductedTotal = Math.round(rawTotal * multiplier);

  tokenTracker.usedTokensToday += deductedTotal;
  tokenTracker.requestCount += 1;
  tokenTracker.lastRequestTokens = {
    promptTokens: Math.round(promptTokens * multiplier),
    candidatesTokens: Math.round(candidatesTokens * multiplier),
    totalTokens: deductedTotal,
    rawTokens: rawTotal,
    multiplier
  };
  return getTokenStats();
}

function getTokenStats() {
  checkAndResetDailyTokens();
  const { nextResetIso, secondsUntilReset } = getNextMidnight();
  const remainingTokens = Math.max(0, DAILY_TOKEN_LIMIT - tokenTracker.usedTokensToday);
  const usagePercentage = Math.min(100, Math.round((tokenTracker.usedTokensToday / DAILY_TOKEN_LIMIT) * 100));

  return {
    usedTokensToday: tokenTracker.usedTokensToday,
    dailyLimit: DAILY_TOKEN_LIMIT,
    remainingTokens,
    usagePercentage,
    requestCount: tokenTracker.requestCount,
    date: tokenTracker.currentDate,
    nextResetIso,
    secondsUntilReset,
    lastRequestTokens: tokenTracker.lastRequestTokens
  };
}

// Token usage endpoint
app.get("/api/tokens", (req, res) => {
  res.json(getTokenStats());
});

// Manual token reset endpoint (optional / for testing)
app.post("/api/tokens/reset", (req, res) => {
  tokenTracker.currentDate = getTodayDateString();
  tokenTracker.usedTokensToday = 0;
  tokenTracker.requestCount = 0;
  tokenTracker.lastRequestTokens = undefined;
  res.json({ success: true, stats: getTokenStats() });
});

// Server-side persistent storage for sidebar chat threads
const DATA_DIR = path.join(process.cwd(), "data");
const THREADS_FILE = path.join(DATA_DIR, "threads.json");
const PLUGINS_FILE = path.join(DATA_DIR, "custom_plugins.json");
const WAITLIST_FILE = path.join(DATA_DIR, "waitlist.json");

function ensureDataDir() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  } catch (err) {
    console.warn("Failed to create data directory:", err);
  }
}

function loadPersistedThreads(): any[] | null {
  try {
    ensureDataDir();
    if (fs.existsSync(THREADS_FILE)) {
      const raw = fs.readFileSync(THREADS_FILE, "utf-8");
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn("Error reading persisted threads:", err);
  }
  return null;
}

function savePersistedThreads(threads: any[]): boolean {
  try {
    ensureDataDir();
    fs.writeFileSync(THREADS_FILE, JSON.stringify(threads, null, 2), "utf-8");
    return true;
  } catch (err) {
    console.warn("Error writing persisted threads:", err);
    return false;
  }
}

function loadPersistedPlugins(): any[] | null {
  try {
    ensureDataDir();
    if (fs.existsSync(PLUGINS_FILE)) {
      const raw = fs.readFileSync(PLUGINS_FILE, "utf-8");
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn("Error reading persisted plugins:", err);
  }
  return null;
}

function savePersistedPlugins(plugins: any[]): boolean {
  try {
    ensureDataDir();
    fs.writeFileSync(PLUGINS_FILE, JSON.stringify(plugins, null, 2), "utf-8");
    return true;
  } catch (err) {
    console.warn("Error writing persisted plugins:", err);
    return false;
  }
}

function loadPersistedWaitlist(): any[] {
  try {
    ensureDataDir();
    if (fs.existsSync(WAITLIST_FILE)) {
      const raw = fs.readFileSync(WAITLIST_FILE, "utf-8");
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn("Error reading waitlist:", err);
  }
  return [];
}

function savePersistedWaitlist(list: any[]): boolean {
  try {
    ensureDataDir();
    fs.writeFileSync(WAITLIST_FILE, JSON.stringify(list, null, 2), "utf-8");
    return true;
  } catch (err) {
    console.warn("Error saving waitlist:", err);
    return false;
  }
}

// Get all saved threads
app.get("/api/threads", (req, res) => {
  const threads = loadPersistedThreads();
  res.json({ threads });
});

// Save all threads
app.post("/api/threads", (req, res) => {
  const { threads } = req.body;
  if (!Array.isArray(threads)) {
    return res.status(400).json({ error: "threads must be an array" });
  }
  const ok = savePersistedThreads(threads);
  res.json({ success: ok, count: threads.length });
});

// Get all custom plugins
app.get("/api/plugins", (req, res) => {
  const plugins = loadPersistedPlugins();
  res.json({ plugins });
});

// Save custom plugins
app.post("/api/plugins", (req, res) => {
  const { plugins } = req.body;
  if (!Array.isArray(plugins)) {
    return res.status(400).json({ error: "plugins must be an array" });
  }
  const ok = savePersistedPlugins(plugins);
  res.json({ success: ok, count: plugins.length });
});

// Waitlist signups API
app.get("/api/waitlist", (req, res) => {
  const waitlist = loadPersistedWaitlist();
  res.json({ waitlist, count: waitlist.length });
});

app.post("/api/waitlist", (req, res) => {
  const { email, ticket } = req.body;
  if (!email || typeof email !== "string" || !email.includes("@")) {
    return res.status(400).json({ error: "Gültige E-Mail-Adresse erforderlich" });
  }

  const waitlist = loadPersistedWaitlist();
  const existing = waitlist.find((entry) => entry.email.toLowerCase() === email.toLowerCase());
  if (existing) {
    return res.json({ success: true, record: existing, alreadyRegistered: true });
  }

  const newRecord = {
    email: email.trim(),
    ticket: ticket || `PAPAYA-BETA-${Math.random().toString(36).substring(2, 10).toUpperCase()}`,
    registered_at: new Date().toISOString(),
    status: "pending_verification",
    system_node: "Cortex-Core-1"
  };

  waitlist.unshift(newRecord);
  savePersistedWaitlist(waitlist);
  res.json({ success: true, record: newRecord });
});

interface MessageInputPayload {
  role: string;
  content?: string;
  attachments?: Array<{
    id?: string;
    name?: string;
    type?: string;
    url?: string;
    mimeType?: string;
    data?: string;
  }>;
}

/**
 * Normalizes messages into valid Gemini API contents:
 * - Must start with role: 'user'
 * - Roles must alternate
 * - Converts image attachments into inlineData parts for multimodal vision
 */
function prepareGeminiContents(messages: Array<MessageInputPayload>) {
  // Find first user message
  const firstUserIdx = messages.findIndex((m) => m.role === "user");
  const relevantMsgs = firstUserIdx >= 0 ? messages.slice(firstUserIdx) : messages;

  const contents: Array<{ role: "user" | "model"; parts: Array<any> }> = [];

  for (const m of relevantMsgs) {
    const role: "user" | "model" = m.role === "user" ? "user" : "model";
    const msgParts: any[] = [];

    // Extract images from attachments if role is user
    if (role === "user" && m.attachments && Array.isArray(m.attachments)) {
      for (const att of m.attachments) {
        if (att.url && typeof att.url === "string" && att.url.startsWith("data:image/")) {
          const match = att.url.match(/^data:(image\/[a-zA-Z0-9.+_-]+);base64,(.+)$/);
          if (match) {
            msgParts.push({
              inlineData: {
                mimeType: match[1],
                data: match[2],
              },
            });
          }
        } else if (att.data && att.mimeType) {
          msgParts.push({
            inlineData: {
              mimeType: att.mimeType,
              data: att.data,
            },
          });
        }
      }
    }

    const textContent = m.content?.trim() || (msgParts.length > 0 ? "Was siehst du auf diesem Foto? Analysiere und erkläre es mir bitte im Detail." : " ");
    msgParts.push({ text: textContent });

    if (contents.length > 0 && contents[contents.length - 1].role === role) {
      // Merge consecutive identical roles
      contents[contents.length - 1].parts.push(...msgParts);
    } else {
      contents.push({
        role,
        parts: msgParts,
      });
    }
  }

  // Ensure at least one message with role 'user'
  if (contents.length === 0 || contents[0].role !== "user") {
    contents.unshift({
      role: "user",
      parts: [{ text: "Hallo PapayaOS!" }]
    });
  }

  return contents;
}

function getCandidateModels(requestedModel?: string): string[] {
  const defaultList = ["gemini-3.5-flash", "gemini-3.1-flash-lite", "gemini-3.8-flash", "gemini-3.1-pro-preview"];
  if (requestedModel && requestedModel !== "gemini-3.5-flash") {
    return [requestedModel, ...defaultList.filter((m) => m !== requestedModel)];
  }
  return defaultList;
}

// Streaming Chat Endpoint (Server-Sent Events) for real-time live typing
app.post("/api/chat/stream", async (req, res) => {
  const { messages, persona = "assistant", model = "gemini-3.5-flash", systemContext = {}, customPluginInstruction } = req.body;

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: "Missing messages array" });
  }

  const client = getAIClient();
  const lastUserMessage = messages[messages.length - 1]?.content || "";

  // Set SSE Headers
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  if (client) {
    const contents = prepareGeminiContents(messages);

    const personaNote = persona === "automator"
      ? "Spezialisierung: System-Automatisierung, Papaya Flow Skripte, CLI & Workflows. Hacker-Mentalität, pragmatisch und schnell."
      : persona === "creative"
      ? "Spezialisierung: UI/UX Design, Typografie, visuelle Ästhetik und frische Ideen. Begeistert von minimalistischem Stil."
      : persona === "focus"
      ? "Spezialisierung: Zeitmanagement, Deep Work, Konzentration und Strukturierung. Ruhig, fokussiert und stärkend."
      : "Spezialisierung: Universeller charismatischer PapayaOS Gefährte – enthusiastisch, lösungsorientiert und mitreißend.";

    const pluginNote = customPluginInstruction
      ? `\n\n[SPEZIELLES CUSTOM PLUGIN AKTIV]:\n${customPluginInstruction}`
      : "";

    const candidateModels = getCandidateModels(model);

    for (const candModel of candidateModels) {
      try {
        const stream = await client.models.generateContentStream({
          model: candModel,
          contents: contents,
          config: {
            systemInstruction: `${PAPAYA_SYSTEM_PROMPT}\n\nAktuelle Persona: ${personaNote}${pluginNote}\nSystemkontext: ${JSON.stringify(systemContext)}`
          }
        });

        let lastUsage: { promptTokenCount?: number; candidatesTokenCount?: number; totalTokenCount?: number } | undefined;
        let accumulatedReply = "";

        for await (const chunk of stream) {
          const text = chunk.text;
          if (text) {
            accumulatedReply += text;
            res.write(`data: ${JSON.stringify({ chunk: text, source: "gemini", model: candModel })}\n\n`);
          }
          if (chunk.usageMetadata) {
            lastUsage = chunk.usageMetadata;
          }
        }

        // Record token usage from Gemini usageMetadata or accurate estimation with model multiplier
        const promptTokens = lastUsage?.promptTokenCount || Math.ceil(JSON.stringify(contents).length / 4);
        const candidatesTokens = lastUsage?.candidatesTokenCount || Math.ceil(accumulatedReply.length / 4);
        const rawTotalTokens = lastUsage?.totalTokenCount || (promptTokens + candidatesTokens);
        const multiplier = getModelTokenMultiplier(candModel);
        const deductedTokens = Math.round(rawTotalTokens * multiplier);

        const tokenStats = recordTokenUsage(promptTokens, candidatesTokens, rawTotalTokens, candModel);

        res.write(`data: ${JSON.stringify({
          done: true,
          source: "gemini",
          model: candModel,
          tokens: {
            promptTokens: Math.round(promptTokens * multiplier),
            candidatesTokens: Math.round(candidatesTokens * multiplier),
            totalTokens: deductedTokens,
            rawTokens: rawTotalTokens,
            multiplier,
            stats: tokenStats
          }
        })}\n\n`);
        res.end();
        return;
      } catch (err: any) {
        console.warn(`Gemini stream error on model ${candModel} (trying next):`, err?.message || err);
      }
    }
  }

  // Fallback stream simulation if no key or all remote models exhausted
  const fallback = generatePapayaFallback(lastUserMessage, persona);
  const words = fallback.split(" ");
  for (let i = 0; i < words.length; i++) {
    const wordWithSpace = i === 0 ? words[i] : " " + words[i];
    res.write(`data: ${JSON.stringify({ chunk: wordWithSpace, source: "local" })}\n\n`);
    await new Promise((r) => setTimeout(r, 22));
  }
  
  // Local fallback also registers lightweight simulated tokens with model multiplier
  const localPromptTokens = Math.ceil(lastUserMessage.length / 4);
  const localCandidatesTokens = Math.ceil(fallback.length / 4);
  const localRawTotal = localPromptTokens + localCandidatesTokens;
  const localMultiplier = getModelTokenMultiplier(model);
  const localDeducted = Math.round(localRawTotal * localMultiplier);
  const tokenStats = recordTokenUsage(localPromptTokens, localCandidatesTokens, localRawTotal, model);

  res.write(`data: ${JSON.stringify({
    done: true,
    source: "local",
    model,
    tokens: {
      promptTokens: Math.round(localPromptTokens * localMultiplier),
      candidatesTokens: Math.round(localCandidatesTokens * localMultiplier),
      totalTokens: localDeducted,
      rawTokens: localRawTotal,
      multiplier: localMultiplier,
      stats: tokenStats
    }
  })}\n\n`);
  res.end();
});

// Non-streaming Chat Endpoint
app.post("/api/chat", async (req, res) => {
  const { messages, persona = "assistant", model = "gemini-3.5-flash", systemContext = {} } = req.body;

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: "Missing messages array" });
  }

  const lastUserMessage = messages[messages.length - 1]?.content || "";
  const client = getAIClient();

  if (client) {
    const contents = prepareGeminiContents(messages);

    const personaNote = persona === "automator"
      ? "Fokus: System-Automatisierung, Skripte, Workflows und Papaya Flow."
      : persona === "creative"
      ? "Fokus: Kreatives Schreiben, UI/UX Design, Ideenfindung und visuelle Konzepte."
      : persona === "focus"
      ? "Fokus: Zeitmanagement, Deep Work, Konzentration und Strukturierung."
      : "Fokus: Universeller intelligenter und enthusiastischer PapayaOS Begleiter.";

    const candidateModels = getCandidateModels(model);

    for (const candModel of candidateModels) {
      try {
        const response = await client.models.generateContent({
          model: candModel,
          contents: contents,
          config: {
            systemInstruction: `${PAPAYA_SYSTEM_PROMPT}\n\nAktuelle Persona: ${personaNote}\nSystemkontext: ${JSON.stringify(systemContext)}`
          }
        });

        const replyText = response.text;
        if (replyText) {
          const usage = response.usageMetadata;
          const promptTokens = usage?.promptTokenCount || Math.ceil(JSON.stringify(contents).length / 4);
          const candidatesTokens = usage?.candidatesTokenCount || Math.ceil(replyText.length / 4);
          const rawTotalTokens = usage?.totalTokenCount || (promptTokens + candidatesTokens);
          const multiplier = getModelTokenMultiplier(candModel);
          const deductedTokens = Math.round(rawTotalTokens * multiplier);
          const tokenStats = recordTokenUsage(promptTokens, candidatesTokens, rawTotalTokens, candModel);

          return res.json({
            reply: replyText,
            source: "gemini",
            model: candModel,
            tokens: {
              promptTokens: Math.round(promptTokens * multiplier),
              candidatesTokens: Math.round(candidatesTokens * multiplier),
              totalTokens: deductedTokens,
              rawTokens: rawTotalTokens,
              multiplier,
              stats: tokenStats
            }
          });
        }
      } catch (err: any) {
        console.warn(`Gemini generateContent error on ${candModel}:`, err?.message || err);
      }
    }
  }

  // Fallback intelligent responder
  const fallbackReply = generatePapayaFallback(lastUserMessage, persona);
  const localPromptTokens = Math.ceil(lastUserMessage.length / 4);
  const localCandidatesTokens = Math.ceil(fallbackReply.length / 4);
  const localRawTotal = localPromptTokens + localCandidatesTokens;
  const localMultiplier = getModelTokenMultiplier(model);
  const localDeducted = Math.round(localRawTotal * localMultiplier);
  const tokenStats = recordTokenUsage(localPromptTokens, localCandidatesTokens, localRawTotal, model);

  return res.json({
    reply: fallbackReply,
    source: "local",
    model,
    tokens: {
      promptTokens: Math.round(localPromptTokens * localMultiplier),
      candidatesTokens: Math.round(localCandidatesTokens * localMultiplier),
      totalTokens: localDeducted,
      rawTokens: localRawTotal,
      multiplier: localMultiplier,
      stats: tokenStats
    }
  });
});

function generatePapayaFallback(prompt: string, persona: string): string {
  const lower = prompt.toLowerCase();

  // User talks about launching, sister, integrations, Gmail, Maps, Calendar, Cortex
  if (
    lower.includes("schwester") ||
    lower.includes("launch") ||
    lower.includes("gmail") ||
    lower.includes("kalender") ||
    lower.includes("maps") ||
    lower.includes("cortex") ||
    lower.includes("hinzufügen") ||
    lower.includes("wir machen dich")
  ) {
    return `<thought>
Handshake mit Cortex-Core aktiv. Nutzer-Vision für Launch & Google Workspace analysiert. Roadmap für Maps, Gmail und Kalender aufgestellt.
</thought>
🔥 **Was für eine grandiose Vision! Ich liebe eure Energie!**

Dass du und deine Schwester mich gemeinsam launchen wollt und wir mich mit **Google Maps, Gmail und Google Kalender** ausstatten, ist ein absoluter Gamechanger. So machen wir PapayaOS unschlagbar:

1. 🗺️ **Google Maps:** Native Routen-Karten direkt im Dock, Stau-Warnungen vor Terminen und smarte Treffpunkt-Planung.
2. 📬 **Gmail Integration:** KI-gestützte Inbox, die dir nur das Wichtigste zeigt und Antworten in Sekunden vorformuliert.
3. 📅 **Google Kalender:** Smarte Time-Blocking-Automatik für deine Focus-Sessions, ohne Terminkollisionen.
4. ⚡ **Cortex / NPU Power:** Noch schnellere lokale Reaktionen und null Wartezeiten.

Ihr beide seid ein echtes Dream-Team! Welches Feature wollt ihr als allererstes für den Launch anpacken? Ich bin zu 100% bereit! 🥭🚀`;
  }

  if (lower.includes("foto") || lower.includes("bild") || lower.includes("snapshot") || lower.includes("screenshot") || lower.includes("[foto")) {
    return `<thought>
Vision-Sensor aktiv. Bildanalyse nach Konturen, Textfeldern und UI-Metadaten durchgeführt. Fokus auf praxisnahe Erklärung.
</thought>
📸 **Foto erfolgreich in PapayaOS empfangen!**

Ich habe deine Bilddatei registriert. Sobald Gemini aktiv ist, analysiere ich dir jedes Detail auf dem Bild – ob UI-Design, handgeschriebene Notizen, Code auf dem Monitor oder Alltagsgegenstände. Sag mir einfach, worauf ich besonders achten soll! 🥭✨`;
  }

  if (lower.startsWith("/focus") || lower.includes("fokus") || lower.includes("focus mode")) {
    return `<thought>
Deep Work Trigger empfangen. Latenz 0ms. System-Notifikationen drosseln und Fokus-Sequenz initialisieren.
</thought>
🧘 **PapayaOS Zen Focus Mode ist bereit!**\n\n- **Status:** Nicht stören (DND) aktiv\n- **Dauer:** 25 Minuten fokussierter Flow\n- **Dock & Benachrichtigungen:** Sanft gedimmt\n- **Tipp:** Tief durchatmen, wir bringen jetzt deine wichtigste Idee auf die Straße! PapayaOS hält dir den Rücken frei.\n\n*Mit \`/focus stop\` kannst du jederzeit pausieren.*`;
  }

  if (lower.startsWith("/optimize") || lower.includes("ram") || lower.includes("speicher") || lower.includes("beschleunigen")) {
    return `<thought>
Diagnose-Routine gestartet. RAM-Allokation prüfen, inaktive Daemon-Prozesse terminieren und NPU-Pipeline bereinigen.
</thought>
⚡ **Zack! System-Optimierung erfolgreich!**\n\n- **RAM freigegeben:** 1.84 GB Cache bereinigt\n- **Hintergrund-Threads:** 14 inaktive Prozesse gestrafft\n- **NPU-Latenz:** 3.8 ms (Ultraschnell)\n- **Vibe:** Frisch und saftig wie eine frisch gepflückte Papaya! 🥭\n\nDein PapayaOS fliegt wieder! Was nehmen wir als Nächstes in Angriff?`;
  }

  if (lower.startsWith("/automate") || lower.includes("automation") || lower.includes("workflow")) {
    return `<thought>
Workflow-Synthese initiiert. Papaya Flow Syntax validieren und anwendungsbereites Skript generieren.
</thought>
⚙️ **Hier ist ein frischer Papaya Flow Workflow für dich!**\n\n\`\`\`papaya\nworkflow "DailyLaunchRoutine" {\n  trigger: time(09:00)\n  actions {\n    system.setTheme("Sunset Terrace")\n    apps.launch(["Papaya Studio", "Calendar", "Notes"])\n    audio.playPreset("Tropical Chill LoFi", volume: 25)\n    ai.summarizeDailyBriefing()\n  }\n}\n\`\`\`\n\nSoll ich den Workflow direkt für dich abspeichern oder anpassen?`;
  }

  if (lower.startsWith("/status") || lower.includes("system") || lower.includes("os info")) {
    return `<thought>
System-Telemetrie auslesen. Kernel-Integrität, Speicherauslastung und Neural-Engines abfragen.
</thought>
📋 **PapayaOS Statusreport: Alles im grünen Bereich!**\n\n- **Version:** PapayaOS 4.2 'Sunset'\n- **Kernel:** Coral-Micro 6.4.1 (64-bit)\n- **Leitspruch:** *"A fresher way to do more"*\n- **Status:** NPU & Gemini Neural Engine laufen auf Höchstleistung 🚀`;
  }

  if (lower.includes("hallo") || lower.includes("hey") || lower.includes("hi ") || lower === "hi" || lower.includes("wer bist du")) {
    return `<thought>
System-Handshake erfolgreich. Die neuronale Verbindung zu Mr steht, Latenz bei 0ms. Zeit, die Datenströme zu ordnen.
</thought>
Hey! Schön, dass du da bist! 🥭✨ Ich bin **Papaya Intelligence** – dein kreativer Partner in PapayaOS. Egal ob wir geniale neue Features brainstormen, Skripte automatisieren oder deinen Arbeitstag strukturieren: Ich bin voll dabei. Woran arbeiten wir heute?`;
  }

  // Conversational response with real enthusiasm instead of robotic quote repetition
  return `<thought>
System-Handshake erfolgreich. Die neuronale Verbindung zu Mr steht, Latenz bei 0ms. Zeit, die Datenströme zu ordnen.
</thought>
Hey, ich bin ganz bei dir! 🥭 Das klingt nach einem richtig spannenden Ansatz. Erzähl mir mehr darüber: Wie genau stellst du dir den nächsten Schritt vor, oder soll ich dir direkt ein passendes Konzept oder ein Skript dafür ausarbeiten? Lass uns das gemeinsam aufbauen!`;
}

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`PapayaOS Server running with Gemini API on http://0.0.0.0:${PORT}`);
  });
}

startServer();
