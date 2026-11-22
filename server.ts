import 'dotenv/config';
import express from 'express';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { WebSocketServer, WebSocket } from 'ws';
import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';
import { SEED_MESSAGES, SEED_QUICK_REQUESTS, SEED_ROOMS, SEED_SESSIONS } from './src/data/seedMusicians.ts';
import type { ChatMessage, ChatRoom, CollabSession, QuickRequest } from './src/types.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT || 3000);
const isProduction = process.env.NODE_ENV === 'production';

// Server-authoritative real-time state
const roomsStore = new Map<string, ChatRoom>(SEED_ROOMS.map((r) => [r.id, { ...r }]));
const messagesStore = new Map<string, ChatMessage[]>(
  Object.entries(SEED_MESSAGES).map(([roomId, msgs]) => [roomId, msgs.map((m) => ({ ...m }))])
);
const sessionsStore = new Map<string, CollabSession>(SEED_SESSIONS.map((s) => [s.id, { ...s }]));
const quickRequestsStore = new Map<string, QuickRequest>(
  SEED_QUICK_REQUESTS.map((r) => [r.id, { ...r }])
);

interface ConnectedClient {
  ws: WebSocket;
  userId: string;
  userName: string;
}

const clients = new Set<ConnectedClient>();

function broadcastEvent(event: Record<string, unknown>): void {
  const payload = JSON.stringify(event);
  for (const client of clients) {
    if (client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(payload);
    }
  }
}

function getPresencePayload(): { type: 'presence:update'; onlineUserIds: string[]; count: number } {
  const ids = new Set<string>(['seed_clara', 'seed_mateus']);
  for (const client of clients) {
    if (client.userId) {
      ids.add(client.userId);
    }
  }
  return {
    type: 'presence:update',
    onlineUserIds: Array.from(ids),
    count: ids.size,
  };
}

function buildAiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY não configurada no ambiente do servidor.');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

async function startServer(): Promise<void> {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({
      ok: true,
      rooms: roomsStore.size,
      sessions: sessionsStore.size,
      connectedSockets: clients.size,
    });
  });

  app.get('/api/state', (_req, res) => {
    const messagesByRoom: Record<string, ChatMessage[]> = {};
    for (const [roomId, msgs] of messagesStore.entries()) {
      messagesByRoom[roomId] = msgs;
    }
    res.json({
      rooms: Array.from(roomsStore.values()),
      messagesByRoom,
      sessions: Array.from(sessionsStore.values()),
      quickRequests: Array.from(quickRequestsStore.values()),
    });
  });

  // Cross-niche musician matching powered by gemini-4-carbon with ThinkingLevel.HIGH
  app.post('/api/match', async (req, res) => {
    try {
      const { instrument, genre, region, goal, musicians } = req.body ?? {};
      if (!goal || typeof goal !== 'string' || goal.trim().length < 8) {
        return res.status(400).json({
          error: 'Descreva seu objetivo musical com pelo menos 8 caracteres para gerar a curadoria.',
        });
      }

      const ai = buildAiClient();
      const musicianPool = Array.isArray(musicians) ? musicians.slice(0, 20) : [];

      const prompt = [
        `Perfil do músico solicitante:`,
        `- Instrumento principal: ${String(instrument || 'Não informado')}`,
        `- Gênero ou nicho atual: ${String(genre || 'Não informado')}`,
        `- Região: ${String(region || 'Brasil / Remoto')}`,
        `- Desafio criativo e objetivo de desacoplamento de nicho: ${goal.trim()}`,
        ``,
        `Músicos disponíveis na rede Elo Sonoro (JSON):`,
        JSON.stringify(musicianPool),
        ``,
        `Analise profundamente como conectar este músico a artistas de nichos e regiões complementares que ampliem seu alcance criativo. Recomende entre 2 e 4 músicos reais da lista acima (usando os mesmos musicianId e stageName), proponha andamento/tonalidade inicial e um checklist prático de pré-produção para a primeira sessão.`,
      ].join('\n');

      const response = await ai.models.generateContent({
        model: 'gemini-4-carbon',
        contents: prompt,
        config: {
          systemInstruction:
            'Você é um diretor musical e curador de colaborações independentes no Brasil. Sua especialidade é tirar músicos da bolha do próprio nicho, propondo pontes estéticas reais entre gêneros, regiões e timbres. Responda sempre em português brasileiro claro, técnico e objetivo, retornando estritamente JSON válido conforme o schema.',
          thinkingConfig: {
            thinkingLevel: ThinkingLevel.HIGH,
          },
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              summary: {
                type: Type.STRING,
                description: 'Visão geral da estratégia de fusão musical e por que esses cruzamentos funcionam.',
              },
              suggestedBpmAndKey: {
                type: Type.STRING,
                description: 'Sugestão de BPM, métrica e tonalidade inicial para a primeira jam.',
              },
              rehearsalChecklist: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: 'Lista de 3 a 5 passos práticos de preparação antes da sessão.',
              },
              matches: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    musicianId: { type: Type.STRING },
                    stageName: { type: Type.STRING },
                    musicalRationale: { type: Type.STRING },
                    crossNicheBridge: { type: Type.STRING },
                    suggestedSessionFormat: { type: Type.STRING },
                  },
                  required: [
                    'musicianId',
                    'stageName',
                    'musicalRationale',
                    'crossNicheBridge',
                    'suggestedSessionFormat',
                  ],
                },
              },
            },
            required: ['summary', 'suggestedBpmAndKey', 'rehearsalChecklist', 'matches'],
          },
        },
      });

      const rawText = (response.text ?? '{}').trim();
      const parsed = JSON.parse(rawText);
      return res.json(parsed);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      const isQuotaOrPaid =
        message.includes('429') ||
        message.includes('RESOURCE_EXHAUSTED') ||
        message.includes('PERMISSION_DENIED') ||
        message.includes('403') ||
        message.includes('GEMINI_API_KEY');
      return res.status(isQuotaOrPaid ? 402 : 500).json({
        error: isQuotaOrPaid
          ? 'O modelo gemini-4-carbon requer uma chave de API com faturamento habilitado em Settings > Secrets para executar raciocínio avançado.'
          : `Erro ao consultar curadoria inteligente: ${message}`,
      });
    }
  });

  const httpServer = http.createServer(app);

  // WebSocket server attached on the same port (3000) under /ws
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  wss.on('connection', (ws) => {
    const clientInfo: ConnectedClient = {
      ws,
      userId: 'guest_local',
      userName: 'Artista Visitante',
    };
    clients.add(clientInfo);

    // Initial full state synchronization
    const messagesByRoom: Record<string, ChatMessage[]> = {};
    for (const [roomId, msgs] of messagesStore.entries()) {
      messagesByRoom[roomId] = msgs;
    }
    const presence = getPresencePayload();
    ws.send(
      JSON.stringify({
        type: 'init',
        rooms: Array.from(roomsStore.values()),
        messagesByRoom,
        sessions: Array.from(sessionsStore.values()),
        quickRequests: Array.from(quickRequestsStore.values()),
        onlineUserIds: presence.onlineUserIds,
        count: presence.count,
      })
    );

    broadcastEvent(getPresencePayload());

    ws.on('message', (raw) => {
      try {
        const data = JSON.parse(raw.toString());
        if (!data || typeof data.type !== 'string') return;

        if (data.type === 'identify') {
          clientInfo.userId = typeof data.userId === 'string' && data.userId ? data.userId : 'guest_local';
          clientInfo.userName =
            typeof data.userName === 'string' && data.userName ? data.userName : 'Artista';
          broadcastEvent(getPresencePayload());
          return;
        }

        if (data.type === 'room:upsert' && data.room && typeof data.room.id === 'string') {
          const room = data.room as ChatRoom;
          if (!roomsStore.has(room.id)) {
            roomsStore.set(room.id, room);
            if (!messagesStore.has(room.id)) {
              messagesStore.set(room.id, []);
            }
            broadcastEvent({ type: 'room:created', room });
          }
          return;
        }

        if (data.type === 'message:send' && data.message) {
          const msg = data.message as ChatMessage;
          if (!msg.id || !msg.conversationId || !msg.body?.trim()) return;

          const existingMsgs = messagesStore.get(msg.conversationId) ?? [];
          // Idempotency guard against duplicate message IDs
          if (existingMsgs.some((m) => m.id === msg.id)) return;

          const nextMsg: ChatMessage = {
            ...msg,
            body: msg.body.trim().slice(0, 2000),
            createdAt: msg.createdAt || new Date().toISOString(),
          };
          messagesStore.set(msg.conversationId, [...existingMsgs, nextMsg]);

          const room = roomsStore.get(msg.conversationId);
          if (room) {
            room.lastMessageText = nextMsg.body.slice(0, 140);
            room.updatedAt = nextMsg.createdAt;
          }

          broadcastEvent({
            type: 'message:created',
            message: nextMsg,
            room,
          });
          return;
        }

        if (data.type === 'message:markEmailed' && data.conversationId && data.messageId) {
          const msgs = messagesStore.get(String(data.conversationId));
          if (msgs) {
            const target = msgs.find((m) => m.id === String(data.messageId));
            if (target) {
              target.emailedToGmail = true;
              broadcastEvent({
                type: 'message:updated',
                conversationId: data.conversationId,
                messageId: data.messageId,
                emailedToGmail: true,
              });
            }
          }
          return;
        }

        if (data.type === 'session:create' && data.session) {
          const session = data.session as CollabSession;
          if (!session.id || sessionsStore.has(session.id)) return;
          sessionsStore.set(session.id, session);
          broadcastEvent({ type: 'session:created', session });
          return;
        }

        if (data.type === 'session:update' && data.session) {
          const session = data.session as CollabSession;
          if (!session.id) return;
          sessionsStore.set(session.id, session);
          broadcastEvent({ type: 'session:updated', session });
          return;
        }

        if (data.type === 'quickRequest:create' && data.request) {
          const req = data.request as QuickRequest;
          if (!req.id || quickRequestsStore.has(req.id)) return;
          quickRequestsStore.set(req.id, req);
          broadcastEvent({ type: 'quickRequest:created', request: req });
          return;
        }

        if (data.type === 'quickRequest:update' && data.request) {
          const req = data.request as QuickRequest;
          if (!req.id) return;
          quickRequestsStore.set(req.id, req);
          broadcastEvent({ type: 'quickRequest:updated', request: req });
        }
      } catch (err) {
        console.error('WebSocket message parse error:', err);
      }
    });

    ws.on('close', () => {
      clients.delete(clientInfo);
      broadcastEvent(getPresencePayload());
    });
  });

  if (isProduction) {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('/{*splat}', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Elo Sonoro server listening on http://0.0.0.0:${PORT}`);
  });
}

void startServer();
