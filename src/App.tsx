import { useCallback, useEffect, useRef, useState } from 'react';
import type { User } from 'firebase/auth';
import { MotionConfig } from 'motion/react';
import { CuratorPanel } from './components/CuratorPanel';
import { ErrorBoundary } from './components/ErrorBoundary';
import { GmailConfirmDialog } from './components/GmailConfirmDialog';
import { LiveChatWorkspace } from './components/LiveChatWorkspace';
import { MusicianExplorer } from './components/MusicianExplorer';
import { MusicianProfileModal } from './components/MusicianProfileModal';
import { QuickRequestBoard } from './components/QuickRequestBoard';
import { SessionScheduler } from './components/SessionScheduler';
import { TopBar, type ActiveTab } from './components/TopBar';
import {
  THEME_STORAGE_KEY,
  applyThemeToDocument,
  resolveInitialTheme,
  toggleThemeMode,
  type ThemeMode,
} from './utils/theme';
import {
  SEED_MESSAGES,
  SEED_MUSICIANS,
  SEED_QUICK_REQUESTS,
  SEED_ROOMS,
  SEED_SESSIONS,
} from './data/seedMusicians';
import {
  getAccessToken,
  googleSignIn,
  initAuth,
  logout,
  saveConversationToFirestore,
  saveQuickRequestToFirestore,
  saveSessionToFirestore,
  subscribePublishedMusicians,
  subscribeQuickRequests,
  subscribeUserSessions,
  updateQuickRequestInFirestore,
  upsertMusicianProfile,
} from './services/firebase';
import {
  createGoogleMeetSpace,
  createGoogleTask,
  fetchGoogleContacts,
  fetchMeetParticipants,
  listGoogleTasks,
  sendGmailMessage,
  toggleGoogleTaskStatus,
} from './services/workspaceApi';
import { buildQuickRequestReplyMessage } from './utils/quickRequests';
import { buildSessionReminderTaskPayload } from './utils/sessionWorkspace';
import type {
  ChatMessage,
  ChatRoom,
  CollabSession,
  GmailDraftRequest,
  GoogleContactItem,
  GoogleTaskItem,
  MeetParticipantContact,
  MusicianProfile,
  QuickRequest,
  SessionStatus,
} from './types';

function MainApp() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('explorer');
  const [theme, setTheme] = useState<ThemeMode>(() => {
    try {
      const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
      const prefersDark =
        typeof window.matchMedia === 'function' &&
        window.matchMedia('(prefers-color-scheme: dark)').matches;
      return resolveInitialTheme(stored, prefersDark);
    } catch {
      return 'light';
    }
  });

  useEffect(() => {
    applyThemeToDocument(theme);
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // Ignore storage failures in restricted contexts
    }
  }, [theme]);

  const handleToggleTheme = useCallback(() => {
    setTheme((prev) => toggleThemeMode(prev));
  }, []);

  // Auth & Google Workspace token state
  const [user, setUser] = useState<User | null>(null);
  const [hasWorkspaceToken, setHasWorkspaceToken] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Core collaborative domain state
  const [musicians, setMusicians] = useState<MusicianProfile[]>(SEED_MUSICIANS);
  const [rooms, setRooms] = useState<ChatRoom[]>(SEED_ROOMS);
  const [activeRoomId, setActiveRoomId] = useState<string>(SEED_ROOMS[0].id);
  const [messagesByRoom, setMessagesByRoom] = useState<Record<string, ChatMessage[]>>(SEED_MESSAGES);
  const [sessions, setSessions] = useState<CollabSession[]>(SEED_SESSIONS);
  const [quickRequests, setQuickRequests] = useState<QuickRequest[]>(SEED_QUICK_REQUESTS);
  const [onlineUserIds, setOnlineUserIds] = useState<string[]>(['seed_clara', 'seed_mateus']);
  const [wsConnected, setWsConnected] = useState(false);

  // Workspace API data (Contacts + Tasks)
  const [contacts, setContacts] = useState<GoogleContactItem[]>([]);
  const [tasks, setTasks] = useState<GoogleTaskItem[]>([]);
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [loadingTasks, setLoadingTasks] = useState(false);

  // Modals & contextual selections
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [gmailDraft, setGmailDraft] = useState<GmailDraftRequest | null>(null);
  const [preselectedSessionMusicianId, setPreselectedSessionMusicianId] = useState<string | null>(
    null
  );
  const [bannerFeedback, setBannerFeedback] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const currentUserId = user?.uid || 'guest_local';
  const currentUserName = user?.displayName || 'Você';

  const showFeedback = useCallback((type: 'success' | 'error', text: string) => {
    setBannerFeedback({ type, text });
  }, []);

  useEffect(() => {
    if (!bannerFeedback || bannerFeedback.type !== 'success') return;
    const timer = setTimeout(() => setBannerFeedback(null), 4500);
    return () => clearTimeout(timer);
  }, [bannerFeedback]);

  const handleSelectTab = useCallback((tab: ActiveTab) => {
    setActiveTab(tab);
    setBannerFeedback(null);
  }, []);

  // Load Google Contacts & Google Tasks when Workspace token is available
  const refreshWorkspaceData = useCallback(async () => {
    const token = await getAccessToken();
    if (!token) return;
    setLoadingContacts(true);
    setLoadingTasks(true);
    try {
      const [fetchedContacts, fetchedTasks] = await Promise.allSettled([
        fetchGoogleContacts(token),
        listGoogleTasks(token),
      ]);
      if (fetchedContacts.status === 'fulfilled') {
        setContacts(fetchedContacts.value);
      }
      if (fetchedTasks.status === 'fulfilled') {
        setTasks(fetchedTasks.value);
      }
    } finally {
      setLoadingContacts(false);
      setLoadingTasks(false);
    }
  }, []);

  // Auth listener
  useEffect(() => {
    const unsub = initAuth((authUser, token) => {
      setUser(authUser);
      setHasWorkspaceToken(Boolean(token));
      if (!authUser || !token) {
        setContacts([]);
        setTasks([]);
      }
    });
    return () => unsub();
  }, []);

  // Subscribe to published musician profiles in Firestore (merges cleanly with seed roster)
  useEffect(() => {
    const unsub = subscribePublishedMusicians(
      (firestoreMusicians) => {
        setMusicians((prev) => {
          const map = new Map<string, MusicianProfile>();
          for (const seed of SEED_MUSICIANS) {
            map.set(seed.id, seed);
          }
          for (const local of prev) {
            if (!map.has(local.id)) map.set(local.id, local);
          }
          for (const remote of firestoreMusicians) {
            map.set(remote.id, remote);
          }
          return Array.from(map.values());
        });
      },
      (err) => {
        console.warn('Firestore musician directory sync fallback:', err.message);
      }
    );
    return () => unsub();
  }, []);

  // Subscribe to user's Firestore sessions when signed in
  useEffect(() => {
    if (!user?.uid) return;
    const unsub = subscribeUserSessions(user.uid, (remoteSessions) => {
      if (remoteSessions.length === 0) return;
      setSessions((prev) => {
        const map = new Map<string, CollabSession>();
        for (const s of prev) map.set(s.id, s);
        for (const r of remoteSessions) map.set(r.id, r);
        return Array.from(map.values());
      });
    });
    return () => unsub();
  }, [user?.uid]);

  // Subscribe to community quick requests in Firestore (merges cleanly with seed & WS state)
  useEffect(() => {
    const unsub = subscribeQuickRequests(
      (remoteRequests) => {
        if (remoteRequests.length === 0) return;
        setQuickRequests((prev) => {
          const map = new Map<string, QuickRequest>();
          for (const item of prev) map.set(item.id, item);
          for (const remote of remoteRequests) {
            const existing = map.get(remote.id);
            map.set(remote.id, {
              ...remote,
              demoContactEmail: existing?.demoContactEmail,
            });
          }
          return Array.from(map.values());
        });
      },
      (err) => {
        console.warn('Firestore quickRequests sync fallback:', err.message);
      }
    );
    return () => unsub();
  }, []);

  // Real-time WebSocket connection with automatic reconnect
  useEffect(() => {
    let closedByUnmount = false;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

    const connect = () => {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const ws = new WebSocket(`${protocol}//${window.location.host}/ws`);
      wsRef.current = ws;

      ws.onopen = () => {
        setWsConnected(true);
        ws.send(
          JSON.stringify({
            type: 'identify',
            userId: currentUserId,
            userName: currentUserName,
          })
        );
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'init') {
            if (Array.isArray(data.rooms) && data.rooms.length > 0) {
              setRooms((prev) => {
                const map = new Map<string, ChatRoom>();
                for (const r of data.rooms as ChatRoom[]) map.set(r.id, r);
                for (const p of prev) if (!map.has(p.id)) map.set(p.id, p);
                return Array.from(map.values());
              });
            }
            if (data.messagesByRoom && typeof data.messagesByRoom === 'object') {
              setMessagesByRoom((prev) => ({
                ...prev,
                ...(data.messagesByRoom as Record<string, ChatMessage[]>),
              }));
            }
            if (Array.isArray(data.sessions) && data.sessions.length > 0) {
              setSessions((prev) => {
                const map = new Map<string, CollabSession>();
                for (const s of data.sessions as CollabSession[]) map.set(s.id, s);
                for (const p of prev) if (!map.has(p.id)) map.set(p.id, p);
                return Array.from(map.values());
              });
            }
            if (Array.isArray(data.quickRequests) && data.quickRequests.length > 0) {
              setQuickRequests((prev) => {
                const map = new Map<string, QuickRequest>();
                for (const r of data.quickRequests as QuickRequest[]) map.set(r.id, r);
                for (const p of prev) if (!map.has(p.id)) map.set(p.id, p);
                return Array.from(map.values());
              });
            }
            if (Array.isArray(data.onlineUserIds)) {
              setOnlineUserIds(data.onlineUserIds);
            }
            return;
          }

          if (data.type === 'presence:update' && Array.isArray(data.onlineUserIds)) {
            setOnlineUserIds(data.onlineUserIds);
            return;
          }

          if (data.type === 'room:created' && data.room) {
            const incomingRoom = data.room as ChatRoom;
            setRooms((prev) => {
              if (prev.some((r) => r.id === incomingRoom.id)) return prev;
              return [incomingRoom, ...prev];
            });
            return;
          }

          if (data.type === 'message:created' && data.message) {
            const msg = data.message as ChatMessage;
            setMessagesByRoom((prev) => {
              const existing = prev[msg.conversationId] || [];
              if (existing.some((m) => m.id === msg.id)) return prev;
              return {
                ...prev,
                [msg.conversationId]: [...existing, msg],
              };
            });
            if (data.room) {
              const updatedRoom = data.room as ChatRoom;
              setRooms((prev) =>
                prev.map((r) => (r.id === updatedRoom.id ? { ...r, ...updatedRoom } : r))
              );
            }
            return;
          }

          if (data.type === 'message:updated' && data.conversationId && data.messageId) {
            setMessagesByRoom((prev) => {
              const existing = prev[data.conversationId] || [];
              return {
                ...prev,
                [data.conversationId]: existing.map((m) =>
                  m.id === data.messageId ? { ...m, emailedToGmail: true } : m
                ),
              };
            });
            return;
          }

          if (data.type === 'session:created' && data.session) {
            const incomingSession = data.session as CollabSession;
            setSessions((prev) => {
              if (prev.some((s) => s.id === incomingSession.id)) return prev;
              return [incomingSession, ...prev];
            });
            return;
          }

          if (data.type === 'session:updated' && data.session) {
            const updatedSession = data.session as CollabSession;
            setSessions((prev) =>
              prev.map((s) => (s.id === updatedSession.id ? updatedSession : s))
            );
            return;
          }

          if (data.type === 'quickRequest:created' && data.request) {
            const incomingReq = data.request as QuickRequest;
            setQuickRequests((prev) => {
              if (prev.some((r) => r.id === incomingReq.id)) return prev;
              return [incomingReq, ...prev];
            });
            return;
          }

          if (data.type === 'quickRequest:updated' && data.request) {
            const updatedReq = data.request as QuickRequest;
            setQuickRequests((prev) =>
              prev.map((r) => (r.id === updatedReq.id ? updatedReq : r))
            );
          }
        } catch (err) {
          console.error('WS event parse error:', err);
        }
      };

      ws.onclose = () => {
        setWsConnected(false);
        if (!closedByUnmount) {
          reconnectTimer = setTimeout(connect, 1500);
        }
      };
    };

    connect();

    return () => {
      closedByUnmount = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      wsRef.current?.close();
    };
  }, [currentUserId, currentUserName]);

  const handleSignIn = async () => {
    setIsLoggingIn(true);
    try {
      const result = await googleSignIn();
      setUser(result.user);
      setHasWorkspaceToken(true);
      await refreshWorkspaceData();
      showFeedback('success', 'Conta Google conectada com Gmail, Google Meet, Tasks e Contatos.');
    } catch (err) {
      showFeedback(
        'error',
        err instanceof Error ? err.message : 'Falha ao conectar conta Google.'
      );
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleSignOut = async () => {
    await logout();
    setUser(null);
    setHasWorkspaceToken(false);
    setContacts([]);
    setTasks([]);
    showFeedback('success', 'Sessão Google encerrada.');
  };

  const handleStartChatWithMusician = (musician: MusicianProfile) => {
    const existingRoom = rooms.find(
      (r) => r.otherMusicianId === musician.id || r.participantIds.includes(musician.ownerId)
    );
    if (existingRoom) {
      setActiveRoomId(existingRoom.id);
      setActiveTab('chat');
      return;
    }

    const newRoom: ChatRoom = {
      id: `room_${musician.id}`,
      title: `${musician.stageName} — Colaboração`,
      participantIds: [currentUserId, musician.ownerId],
      participantNames: [currentUserName, musician.stageName],
      otherMusicianId: musician.id,
      otherMusicianName: musician.stageName,
      otherMusicianSubtitle: `${musician.instruments[0] || 'Músico'} · ${musician.region}`,
      otherMusicianAvatar: musician.avatarUrl,
      otherContactEmail: musician.demoContactEmail,
      lastMessageText: 'Conversa aberta. Envie uma mensagem para combinar a sessão.',
      updatedAt: new Date().toISOString(),
    };

    setRooms((prev) => [newRoom, ...prev]);
    setMessagesByRoom((prev) => ({ ...prev, [newRoom.id]: prev[newRoom.id] || [] }));
    setActiveRoomId(newRoom.id);
    setActiveTab('chat');

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'room:upsert', room: newRoom }));
    }
    if (user?.emailVerified) {
      void saveConversationToFirestore(newRoom);
    }
  };

  const handleSendMessage = (roomId: string, body: string) => {
    const msg: ChatMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      conversationId: roomId,
      senderId: currentUserId,
      senderName: currentUserName,
      body,
      createdAt: new Date().toISOString(),
    };

    // Optimistic local state update
    setMessagesByRoom((prev) => ({
      ...prev,
      [roomId]: [...(prev[roomId] || []), msg],
    }));
    setRooms((prev) =>
      prev.map((r) =>
        r.id === roomId
          ? { ...r, lastMessageText: body.slice(0, 140), updatedAt: msg.createdAt }
          : r
      )
    );

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'message:send', message: msg }));
    }
  };

  const handleSaveMusicianProfile = async (profile: MusicianProfile) => {
    const alreadyExists = musicians.some((m) => m.id === profile.id);
    if (user?.emailVerified) {
      await upsertMusicianProfile(profile.id, profile, alreadyExists);
    }
    setMusicians((prev) => {
      if (prev.some((m) => m.id === profile.id)) {
        return prev.map((m) => (m.id === profile.id ? profile : m));
      }
      return [profile, ...prev];
    });
    showFeedback('success', `Perfil "${profile.stageName}" publicado na rede Elo Sonoro.`);
  };

  const handleCreateSession = async (session: CollabSession, createMeetRoom: boolean) => {
    let finalSession = { ...session };
    if (createMeetRoom) {
      const token = await getAccessToken();
      if (token) {
        const meet = await createGoogleMeetSpace(token);
        finalSession = { ...finalSession, meetUri: meet.meetingUri };
      }
    }

    setSessions((prev) => [finalSession, ...prev]);

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'session:create', session: finalSession }));
    }
    if (user?.emailVerified) {
      await saveSessionToFirestore(finalSession, false);
    }
    showFeedback('success', `Sessão "${finalSession.title}" agendada.`);
  };

  const handleUpdateSessionStatus = async (session: CollabSession, nextStatus: SessionStatus) => {
    const updated: CollabSession = {
      ...session,
      status: nextStatus,
      updatedAt: new Date().toISOString(),
    };
    setSessions((prev) => prev.map((s) => (s.id === session.id ? updated : s)));
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'session:update', session: updated }));
    }
    if (user?.emailVerified) {
      try {
        await saveSessionToFirestore(updated, true);
      } catch (err) {
        console.warn('Firestore session update fallback:', err);
      }
    }
  };

  const handleConfirmSession = async (
    session: CollabSession,
    createTaskReminder: boolean
  ) => {
    let updated: CollabSession = {
      ...session,
      status: 'confirmada',
      updatedAt: new Date().toISOString(),
    };

    let taskCreated: GoogleTaskItem | null = null;
    let taskWarning: string | null = null;

    if (createTaskReminder && !session.reminderTaskId) {
      const token = await getAccessToken();
      if (token) {
        try {
          const payload = buildSessionReminderTaskPayload(updated);
          taskCreated = await createGoogleTask(token, payload);
          setTasks((prev) => [taskCreated!, ...prev]);
          updated = {
            ...updated,
            reminderTaskId: taskCreated.id,
            reminderTaskTitle: taskCreated.title,
          };
        } catch (err) {
          taskWarning =
            err instanceof Error
              ? err.message
              : 'Sessão confirmada, mas não foi possível criar o lembrete no Google Tasks.';
        }
      }
    }

    setSessions((prev) => prev.map((s) => (s.id === session.id ? updated : s)));
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'session:update', session: updated }));
    }
    if (user?.emailVerified) {
      try {
        await saveSessionToFirestore(updated, true);
      } catch (err) {
        console.warn('Firestore session confirm fallback:', err);
      }
    }

    if (taskWarning) {
      showFeedback('error', taskWarning);
    } else if (taskCreated) {
      showFeedback(
        'success',
        `Sessão "${updated.title}" confirmada e lembrete criado no Google Tasks.`
      );
    } else {
      showFeedback('success', `Sessão "${updated.title}" confirmada.`);
    }
  };

  const handleImportMeetContacts = async (
    session: CollabSession
  ): Promise<MeetParticipantContact[]> => {
    const token = await getAccessToken();
    if (!token) {
      throw new Error('Conecte sua conta Google para importar participantes do Google Meet.');
    }

    const result = await fetchMeetParticipants(token, session.meetUri, contacts);
    const updated: CollabSession = {
      ...session,
      meetImportedContacts: result.participants,
      updatedAt: new Date().toISOString(),
    };

    setSessions((prev) => prev.map((s) => (s.id === session.id ? updated : s)));
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'session:update', session: updated }));
    }

    if (result.participants.length > 0) {
      showFeedback(
        'success',
        `${result.participants.length} contato(s) importado(s) do Google Meet para "${session.title}".`
      );
    }
    return result.participants;
  };

  const handleGenerateMeetForSession = async (session: CollabSession) => {
    const token = await getAccessToken();
    if (!token) {
      showFeedback('error', 'Conecte sua conta Google para criar uma sala real no Google Meet.');
      return;
    }
    try {
      const meet = await createGoogleMeetSpace(token);
      const updated = {
        ...session,
        meetUri: meet.meetingUri,
        updatedAt: new Date().toISOString(),
      };
      setSessions((prev) => prev.map((s) => (s.id === session.id ? updated : s)));
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'session:update', session: updated }));
      }
      if (user?.emailVerified) {
        await saveSessionToFirestore(updated, true);
      }
      showFeedback('success', 'Link do Google Meet criado e vinculado à sessão.');
    } catch (err) {
      showFeedback(
        'error',
        err instanceof Error ? err.message : 'Erro ao criar sala do Google Meet.'
      );
    }
  };

  const handleConfirmSendGmail = async (finalDraft: GmailDraftRequest) => {
    const token = await getAccessToken();
    if (!token) {
      throw new Error('Conecte sua conta Google para enviar e-mails pelo Gmail.');
    }
    await sendGmailMessage(token, {
      to: finalDraft.to,
      subject: finalDraft.subject,
      body: finalDraft.body,
    });

    if (finalDraft.conversationId && finalDraft.messageId) {
      setMessagesByRoom((prev) => {
        const list = prev[finalDraft.conversationId!] || [];
        return {
          ...prev,
          [finalDraft.conversationId!]: list.map((m) =>
            m.id === finalDraft.messageId ? { ...m, emailedToGmail: true } : m
          ),
        };
      });
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(
          JSON.stringify({
            type: 'message:markEmailed',
            conversationId: finalDraft.conversationId,
            messageId: finalDraft.messageId,
          })
        );
      }
    }

    setGmailDraft(null);
    showFeedback('success', `Mensagem enviada para ${finalDraft.to} pelo Gmail.`);
  };

  const handleCreateGoogleTask = async (title: string, notes?: string, dueIso?: string) => {
    const token = await getAccessToken();
    if (!token) {
      showFeedback('error', 'Conecte sua conta Google para criar tarefas no Google Tasks.');
      return;
    }
    try {
      const created = await createGoogleTask(token, { title, notes, dueIso });
      setTasks((prev) => [created, ...prev]);
      showFeedback('success', `Tarefa "${created.title}" adicionada ao Google Tasks.`);
    } catch (err) {
      showFeedback('error', err instanceof Error ? err.message : 'Erro ao criar tarefa.');
    }
  };

  const handleToggleGoogleTask = async (task: GoogleTaskItem) => {
    const token = await getAccessToken();
    if (!token) return;
    const nextStatus = task.status === 'completed' ? 'needsAction' : 'completed';
    const updated = await toggleGoogleTaskStatus(token, task.id, nextStatus);
    setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
  };

  const handleCreateQuickRequest = async (request: QuickRequest) => {
    setQuickRequests((prev) => [request, ...prev]);

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'quickRequest:create', request }));
    }
    if (user?.emailVerified) {
      await saveQuickRequestToFirestore(request);
    }
    showFeedback('success', `Pedido "${request.title}" publicado no Mural de Pedidos Rápidos.`);
  };

  const handleRespondQuickRequest = (request: QuickRequest) => {
    const matchingMusician = musicians.find(
      (m) => m.ownerId === request.authorId || m.stageName === request.authorStageName
    );

    const existingRoom = rooms.find(
      (r) =>
        (matchingMusician && r.otherMusicianId === matchingMusician.id) ||
        r.participantIds.includes(request.authorId)
    );

    const targetRoomId = existingRoom
      ? existingRoom.id
      : `room_req_${matchingMusician ? matchingMusician.id : request.authorId}`;

    if (!existingRoom) {
      const newRoom: ChatRoom = {
        id: targetRoomId,
        title: `${request.authorStageName} — ${request.title.slice(0, 42)}`,
        participantIds: [currentUserId, request.authorId],
        participantNames: [currentUserName, request.authorStageName],
        otherMusicianId: matchingMusician?.id,
        otherMusicianName: request.authorStageName,
        otherMusicianSubtitle: `${request.instrumentNeeded} · ${request.authorRegion}`,
        otherMusicianAvatar: matchingMusician?.avatarUrl,
        otherContactEmail: request.demoContactEmail || matchingMusician?.demoContactEmail,
        lastMessageText: `Respondendo ao pedido: ${request.title}`,
        updatedAt: new Date().toISOString(),
      };
      setRooms((prev) => [newRoom, ...prev]);
      setMessagesByRoom((prev) => ({ ...prev, [newRoom.id]: prev[newRoom.id] || [] }));

      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'room:upsert', room: newRoom }));
      }
      if (user?.emailVerified) {
        void saveConversationToFirestore(newRoom);
      }
    }

    const replyBody = buildQuickRequestReplyMessage(request, currentUserName);
    const existingMessages = messagesByRoom[targetRoomId] || [];
    const alreadyRepliedToRequest = existingMessages.some((m) =>
      m.body.includes(`"${request.title}"`)
    );

    if (!alreadyRepliedToRequest) {
      handleSendMessage(targetRoomId, replyBody);

      const updatedRequest: QuickRequest = {
        ...request,
        responseCount: request.responseCount + 1,
        status: request.status === 'aberto' ? 'em_andamento' : request.status,
        updatedAt: new Date().toISOString(),
      };
      setQuickRequests((prev) =>
        prev.map((r) => (r.id === updatedRequest.id ? updatedRequest : r))
      );

      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(
          JSON.stringify({ type: 'quickRequest:update', request: updatedRequest })
        );
      }
      if (user?.emailVerified) {
        void updateQuickRequestInFirestore(updatedRequest, 'respond').catch((err) =>
          console.warn('Firestore quickRequest respond fallback:', err)
        );
      }
    }

    setActiveRoomId(targetRoomId);
    setActiveTab('chat');
  };

  const handleResolveQuickRequest = async (request: QuickRequest) => {
    const updated: QuickRequest = {
      ...request,
      status: 'resolvido',
      updatedAt: new Date().toISOString(),
    };
    setQuickRequests((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'quickRequest:update', request: updated }));
    }
    if (user?.emailVerified) {
      try {
        await updateQuickRequestInFirestore(updated, 'resolve');
      } catch (err) {
        console.warn('Firestore quickRequest resolve fallback:', err);
      }
    }
    showFeedback('success', `Pedido "${request.title}" marcado como resolvido.`);
  };

  const handleScheduleFromQuickRequest = (request: QuickRequest) => {
    const matchingMusician = musicians.find(
      (m) => m.ownerId === request.authorId || m.stageName === request.authorStageName
    );
    if (matchingMusician) {
      setPreselectedSessionMusicianId(matchingMusician.id);
    }
    setActiveTab('sessions');
  };

  const handleSendGmailFromQuickRequest = (request: QuickRequest) => {
    const matchingMusician = musicians.find(
      (m) => m.ownerId === request.authorId || m.stageName === request.authorStageName
    );
    setGmailDraft({
      to: request.demoContactEmail || matchingMusician?.demoContactEmail || user?.email || '',
      subject: `[Elo Sonoro] Resposta ao pedido: ${request.title}`,
      body: [
        `Olá ${request.authorStageName},`,
        ``,
        `Vi seu pedido no Mural de Pedidos Rápidos ("${request.title}") buscando ${request.instrumentNeeded} (${request.bpmAndKey || request.genreContext}).`,
        ``,
        `Tenho interesse em colaborar nessa gravação! Quando podemos alinhar os stems ou testar uma sessão no Google Meet?`,
      ].join('\n'),
      contextLabel: `Pedido rápido de ${request.authorStageName}`,
    });
  };

  const myOwnProfile = musicians.find((m) => m.ownerId === currentUserId) || null;

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 transition-colors duration-200">
      <TopBar
        activeTab={activeTab}
        onSelectTab={handleSelectTab}
        user={user}
        hasWorkspaceToken={hasWorkspaceToken}
        isLoggingIn={isLoggingIn}
        theme={theme}
        onToggleTheme={handleToggleTheme}
        onSignIn={handleSignIn}
        onSignOut={handleSignOut}
      />

      {bannerFeedback && (
        <div
          role="status"
          className={`border-b px-4 py-2.5 text-xs font-medium flex items-center justify-between gap-4 ${
            bannerFeedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900 dark:bg-emerald-950/60 dark:border-emerald-800 dark:text-emerald-200'
              : 'bg-red-50 border-red-200 text-red-900 dark:bg-red-950/60 dark:border-red-800 dark:text-red-200'
          }`}
        >
          <span className="max-w-7xl mx-auto w-full flex items-center justify-between gap-4">
            <span>{bannerFeedback.text}</span>
            <button
              type="button"
              onClick={() => setBannerFeedback(null)}
              className="underline shrink-0"
            >
              Fechar
            </button>
          </span>
        </div>
      )}

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-8">
        {activeTab === 'explorer' && (
          <MusicianExplorer
            musicians={musicians}
            quickRequests={quickRequests}
            userProfile={myOwnProfile}
            sessionCount={sessions.length}
            onStartChat={handleStartChatWithMusician}
            onScheduleWith={(musician) => {
              setPreselectedSessionMusicianId(musician.id);
              setActiveTab('sessions');
            }}
            onSendGmailTo={(musician) => {
              setGmailDraft({
                to: musician.demoContactEmail || user?.email || '',
                subject: `Convite de colaboração musical — ${musician.stageName}`,
                body: `Olá ${musician.stageName},\n\nVi seu perfil no Elo Sonoro (${musician.instruments.join(', ')} · ${musician.region}) e gostaria de propor uma sessão colaborativa fora do nosso nicho habitual.\n\nQuando você teria disponibilidade para conversarmos?`,
                contextLabel: `Contato direto com ${musician.stageName}`,
              });
            }}
            onOpenProfileEditor={() => setProfileModalOpen(true)}
            onOpenCurator={() => setActiveTab('curator')}
            onOpenMural={() => setActiveTab('mural')}
            onRespondQuickRequest={handleRespondQuickRequest}
          />
        )}

        {activeTab === 'mural' && (
          <QuickRequestBoard
            requests={quickRequests}
            userProfile={myOwnProfile}
            currentUserId={currentUserId}
            currentUserName={currentUserName}
            onCreateRequest={handleCreateQuickRequest}
            onRespondRequest={handleRespondQuickRequest}
            onScheduleFromRequest={handleScheduleFromQuickRequest}
            onSendGmailFromRequest={handleSendGmailFromQuickRequest}
            onResolveRequest={handleResolveQuickRequest}
          />
        )}

        {activeTab === 'chat' && (
          <LiveChatWorkspace
            rooms={rooms}
            activeRoomId={activeRoomId}
            messagesByRoom={messagesByRoom}
            currentUserId={currentUserId}
            onlineUserIds={onlineUserIds}
            wsConnected={wsConnected}
            onSelectRoom={setActiveRoomId}
            onSendMessage={handleSendMessage}
            onForwardMessageToGmail={(room, message) => {
              setGmailDraft({
                to: room.otherContactEmail || user?.email || '',
                subject: `[Elo Sonoro] Mensagem de ${message.senderName} — ${room.title}`,
                body: `Mensagem enviada na sala "${room.title}":\n\n"${message.body}"\n\n— Enviado via Elo Sonoro`,
                contextLabel: `Encaminhar mensagem de ${room.title}`,
                conversationId: room.id,
                messageId: message.id,
              });
            }}
            onForwardTranscriptToGmail={(room, roomMessages) => {
              const summaryLines = roomMessages
                .slice(-8)
                .map((m) => `${m.senderName}: ${m.body}`)
                .join('\n');
              setGmailDraft({
                to: room.otherContactEmail || user?.email || '',
                subject: `[Elo Sonoro] Resumo da conversa — ${room.title}`,
                body: `Resumo das últimas mensagens da conversa "${room.title}":\n\n${summaryLines || 'Sem mensagens registradas.'}`,
                contextLabel: `Resumo de ${room.title}`,
              });
            }}
            onScheduleFromRoom={(room) => {
              if (room.otherMusicianId) {
                setPreselectedSessionMusicianId(room.otherMusicianId);
              }
              setActiveTab('sessions');
            }}
          />
        )}

        {activeTab === 'sessions' && (
          <SessionScheduler
            sessions={sessions}
            musicians={musicians}
            currentUserId={currentUserId}
            currentUserName={currentUserName}
            preselectedMusicianId={preselectedSessionMusicianId}
            hasWorkspaceToken={hasWorkspaceToken}
            contacts={contacts}
            tasks={tasks}
            loadingTasks={loadingTasks}
            loadingContacts={loadingContacts}
            onCreateSession={handleCreateSession}
            onConfirmSession={handleConfirmSession}
            onUpdateSessionStatus={handleUpdateSessionStatus}
            onGenerateMeetForSession={handleGenerateMeetForSession}
            onImportMeetContacts={handleImportMeetContacts}
            onSendSessionInviteGmail={(session, contactEmail) => {
              setGmailDraft({
                to: contactEmail || user?.email || '',
                subject: `Convite de Sessão Musical: ${session.title}`,
                body: [
                  `Olá! Segue o convite da nossa sessão colaborativa pelo Elo Sonoro:`,
                  ``,
                  `Sessão: ${session.title}`,
                  `Data/Hora: ${session.scheduledAt}`,
                  `Duração: ${session.durationMinutes} minutos`,
                  `Formato: ${session.format}`,
                  session.meetUri ? `Link Google Meet: ${session.meetUri}` : '',
                  session.notes ? `Pauta técnica: ${session.notes}` : '',
                ]
                  .filter(Boolean)
                  .join('\n'),
                contextLabel: `Convite da sessão "${session.title}"`,
              });
            }}
            onCreateGoogleTask={handleCreateGoogleTask}
            onToggleGoogleTask={handleToggleGoogleTask}
            onRefreshWorkspaceData={refreshWorkspaceData}
            onSignIn={handleSignIn}
          />
        )}

        {activeTab === 'curator' && (
          <CuratorPanel
            musicians={musicians}
            theme={theme}
            onStartChat={handleStartChatWithMusician}
            onScheduleWith={(musician) => {
              setPreselectedSessionMusicianId(musician.id);
              setActiveTab('sessions');
            }}
          />
        )}
      </main>

      <footer className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 mt-12 transition-colors duration-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400">
          <span>Elo Sonoro — Rede independente de colaboração entre músicos</span>
          <span>Integrado com Gmail, Google Meet, Google Tasks e Contatos</span>
        </div>
      </footer>

      <MusicianProfileModal
        isOpen={profileModalOpen}
        ownerId={currentUserId}
        initialProfile={myOwnProfile}
        onClose={() => setProfileModalOpen(false)}
        onSave={handleSaveMusicianProfile}
      />

      <GmailConfirmDialog
        draft={gmailDraft}
        hasWorkspaceToken={hasWorkspaceToken}
        contacts={contacts}
        onSignIn={handleSignIn}
        onCancel={() => setGmailDraft(null)}
        onConfirmSend={handleConfirmSendGmail}
      />
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <MotionConfig reducedMotion="user">
        <MainApp />
      </MotionConfig>
    </ErrorBoundary>
  );
}
