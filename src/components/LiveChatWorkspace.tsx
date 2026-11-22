import { useEffect, useRef, useState } from 'react';
import { Calendar, Check, Mail, Send, Wifi, WifiOff } from 'lucide-react';
import type { ChatMessage, ChatRoom } from '../types';
import { formatDateTimePtBr } from '../utils/filters';

interface LiveChatWorkspaceProps {
  rooms: ChatRoom[];
  activeRoomId: string;
  messagesByRoom: Record<string, ChatMessage[]>;
  currentUserId: string;
  onlineUserIds: string[];
  wsConnected: boolean;
  onSelectRoom: (roomId: string) => void;
  onSendMessage: (roomId: string, body: string) => void;
  onForwardMessageToGmail: (room: ChatRoom, message: ChatMessage) => void;
  onForwardTranscriptToGmail: (room: ChatRoom, messages: ChatMessage[]) => void;
  onScheduleFromRoom: (room: ChatRoom) => void;
}

export function LiveChatWorkspace({
  rooms,
  activeRoomId,
  messagesByRoom,
  currentUserId,
  onlineUserIds,
  wsConnected,
  onSelectRoom,
  onSendMessage,
  onForwardMessageToGmail,
  onForwardTranscriptToGmail,
  onScheduleFromRoom,
}: LiveChatWorkspaceProps) {
  const [draft, setDraft] = useState('');
  const endRef = useRef<HTMLDivElement | null>(null);

  const activeRoom = rooms.find((r) => r.id === activeRoomId) || rooms[0] || null;
  const messages = activeRoom ? messagesByRoom[activeRoom.id] || [] : [];

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, activeRoom?.id]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeRoom || !draft.trim()) return;
    onSendMessage(activeRoom.id, draft.trim());
    setDraft('');
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* Room Sidebar */}
      <aside className="lg:col-span-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden transition-colors">
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2">
          <h1 className="text-base font-display font-semibold text-slate-950 dark:text-slate-50">
            Conversas em Tempo Real
          </h1>
          <span
            className={`inline-flex items-center gap-1.5 text-xs font-medium ${
              wsConnected
                ? 'text-emerald-700 dark:text-emerald-400'
                : 'text-amber-700 dark:text-amber-400'
            }`}
          >
            {wsConnected ? (
              <Wifi className="w-3.5 h-3.5" aria-hidden="true" />
            ) : (
              <WifiOff className="w-3.5 h-3.5" aria-hidden="true" />
            )}
            <span>{wsConnected ? 'Ao vivo' : 'Reconectando'}</span>
          </span>
        </div>

        {rooms.length === 0 ? (
          <div className="p-6 text-sm text-slate-600 dark:text-slate-400">
            Nenhuma conversa iniciada. Escolha um músico no diretório para começar.
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {rooms.map((room) => {
              const isSelected = activeRoom?.id === room.id;
              const otherOnline = room.participantIds.some(
                (id) => id !== currentUserId && onlineUserIds.includes(id)
              );

              return (
                <button
                  key={room.id}
                  type="button"
                  onClick={() => onSelectRoom(room.id)}
                  className={`w-full text-left px-5 py-4 transition-colors focus-visible:outline-2 focus-visible:outline-blue-700 ${
                    isSelected
                      ? 'bg-slate-100 dark:bg-slate-800'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-slate-950 dark:text-slate-50 truncate">
                      {room.otherMusicianName || room.title}
                    </span>
                    <span className="text-[11px] font-mono tabular-nums text-slate-500 dark:text-slate-400 shrink-0">
                      {otherOnline ? 'Online' : 'Offline'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                    {room.otherMusicianSubtitle || room.title}
                  </p>
                  <p className="text-xs text-slate-600 dark:text-slate-400 truncate mt-1.5">
                    {room.lastMessageText || 'Sala pronta para troca de ideias.'}
                  </p>
                </button>
              );
            })}
          </div>
        )}
      </aside>

      {/* Active Conversation Panel */}
      <section className="lg:col-span-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl flex flex-col min-h-[560px] max-h-[75vh] transition-colors">
        {activeRoom ? (
          <>
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <h2 className="text-base font-display font-semibold text-slate-950 dark:text-slate-50 truncate">
                  {activeRoom.title}
                </h2>
                <p className="text-xs text-slate-600 dark:text-slate-400 truncate">
                  {activeRoom.otherMusicianSubtitle || activeRoom.participantNames.join(' · ')}
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => onScheduleFromRoom(activeRoom)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-800 dark:text-slate-100 bg-slate-100 dark:bg-slate-800 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors whitespace-nowrap"
                >
                  <Calendar className="w-3.5 h-3.5" aria-hidden="true" />
                  Agendar Sessão
                </button>
                <button
                  type="button"
                  onClick={() => onForwardTranscriptToGmail(activeRoom, messages)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/60 transition-colors whitespace-nowrap"
                >
                  <Mail className="w-3.5 h-3.5" aria-hidden="true" />
                  Enviar resumo ao Gmail
                </button>
              </div>
            </div>

            <div
              data-testid="chat-messages-list"
              className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50/60 dark:bg-slate-950/60"
            >
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center py-12">
                  <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                    Inicie a colaboração com {activeRoom.otherMusicianName || 'este artista'}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm">
                    Compartilhe BPM, tonalidade, referências ou combine uma sessão remota pelo Google Meet.
                  </p>
                </div>
              ) : (
                messages.map((msg) => {
                  const isMine = msg.senderId === currentUserId;
                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}
                    >
                      <div className="flex items-center gap-2 mb-1 text-[11px] text-slate-500 dark:text-slate-400">
                        <span className="font-medium text-slate-700 dark:text-slate-300">
                          {msg.senderName}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono tabular-nums">
                          {formatDateTimePtBr(msg.createdAt)}
                        </span>
                      </div>

                      <div
                        className={`max-w-xl rounded-xl px-4 py-3 text-sm leading-relaxed border ${
                          isMine
                            ? 'bg-slate-900 dark:bg-blue-700 text-white border-slate-900 dark:border-blue-600'
                            : 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        <p className="whitespace-pre-wrap">{msg.body}</p>
                      </div>

                      <div className="mt-1 flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => onForwardMessageToGmail(activeRoom, msg)}
                          className="inline-flex items-center gap-1 text-[11px] font-medium text-blue-700 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                        >
                          <Mail className="w-3 h-3" aria-hidden="true" />
                          <span>Enviar esta mensagem ao Gmail</span>
                        </button>
                        {msg.emailedToGmail && (
                          <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 dark:text-emerald-400 font-medium">
                            <Check className="w-3 h-3" aria-hidden="true" />
                            Enviada ao Gmail
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={endRef} />
            </div>

            <form
              onSubmit={handleSubmit}
              className="p-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center gap-3"
            >
              <label htmlFor="chat-message-input" className="sr-only">
                Escrever mensagem para {activeRoom.title}
              </label>
              <input
                id="chat-message-input"
                type="text"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Escreva uma mensagem em tempo real (ex: link de stems, BPM, horário)..."
                className="flex-1 px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:bg-white dark:focus:bg-slate-900 focus:border-blue-700 dark:focus:border-blue-500"
              />
              <button
                type="submit"
                disabled={!draft.trim()}
                className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-blue-700 dark:bg-blue-600 rounded-lg hover:bg-blue-800 dark:hover:bg-blue-500 disabled:opacity-50 transition-colors whitespace-nowrap shrink-0"
              >
                <Send className="w-4 h-4" aria-hidden="true" />
                Enviar
              </button>
            </form>
          </>
        ) : (
          <div className="p-12 text-center text-sm text-slate-600 dark:text-slate-400">
            Selecione uma conversa na lista ao lado.
          </div>
        )}
      </section>
    </div>
  );
}
