import { useEffect, useState } from 'react';
import {
  Calendar,
  CheckCircle2,
  Circle,
  ExternalLink,
  Eye,
  ListTodo,
  Mail,
  Plus,
  Users,
  Video,
} from 'lucide-react';
import type {
  CollabSession,
  GoogleContactItem,
  GoogleTaskItem,
  MeetParticipantContact,
  MusicianProfile,
  SessionFormat,
  SessionStatus,
} from '../types';
import { formatDateTimePtBr, formatDurationPtBr } from '../utils/filters';
import { SessionConfirmDialog } from './SessionConfirmDialog';
import { SessionDetailsModal } from './SessionDetailsModal';

interface SessionSchedulerProps {
  sessions: CollabSession[];
  musicians: MusicianProfile[];
  currentUserId: string;
  currentUserName: string;
  preselectedMusicianId: string | null;
  hasWorkspaceToken: boolean;
  contacts: GoogleContactItem[];
  tasks: GoogleTaskItem[];
  loadingTasks: boolean;
  loadingContacts: boolean;
  onCreateSession: (session: CollabSession, createMeetRoom: boolean) => Promise<void>;
  onConfirmSession: (session: CollabSession, createTaskReminder: boolean) => Promise<void>;
  onUpdateSessionStatus: (session: CollabSession, nextStatus: SessionStatus) => Promise<void>;
  onGenerateMeetForSession: (session: CollabSession) => Promise<void>;
  onImportMeetContacts: (session: CollabSession) => Promise<MeetParticipantContact[]>;
  onSendSessionInviteGmail: (session: CollabSession, contactEmail?: string) => void;
  onCreateGoogleTask: (title: string, notes?: string, dueIso?: string) => Promise<void>;
  onToggleGoogleTask: (task: GoogleTaskItem) => Promise<void>;
  onRefreshWorkspaceData: () => Promise<void>;
  onSignIn: () => Promise<void>;
}

const STATUS_LABELS: Record<SessionStatus, string> = {
  agendada: 'Agendada',
  confirmada: 'Confirmada',
  concluida: 'Concluída',
  cancelada: 'Cancelada',
};

const STATUS_STYLES: Record<SessionStatus, string> = {
  agendada: 'text-blue-700 dark:text-blue-400',
  confirmada: 'text-emerald-700 dark:text-emerald-400',
  concluida: 'text-slate-600 dark:text-slate-400',
  cancelada: 'text-red-700 dark:text-red-400',
};

export function SessionScheduler({
  sessions,
  musicians,
  currentUserId,
  currentUserName,
  preselectedMusicianId,
  hasWorkspaceToken,
  contacts,
  tasks,
  loadingTasks,
  loadingContacts,
  onCreateSession,
  onConfirmSession,
  onUpdateSessionStatus,
  onGenerateMeetForSession,
  onImportMeetContacts,
  onSendSessionInviteGmail,
  onCreateGoogleTask,
  onToggleGoogleTask,
  onRefreshWorkspaceData,
  onSignIn,
}: SessionSchedulerProps) {
  const [title, setTitle] = useState('');
  const [selectedMusicianId, setSelectedMusicianId] = useState(
    preselectedMusicianId || musicians[0]?.id || ''
  );
  const [selectedContactEmail, setSelectedContactEmail] = useState('');
  const [format, setFormat] = useState<SessionFormat>('Remota (Google Meet)');
  const [scheduledAt, setScheduledAt] = useState('2026-11-28T19:00');
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [notes, setNotes] = useState('');
  const [createMeetAuto, setCreateMeetAuto] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [generatingMeetId, setGeneratingMeetId] = useState<string | null>(null);
  const [detailsSessionId, setDetailsSessionId] = useState<string | null>(null);
  const [confirmSessionId, setConfirmSessionId] = useState<string | null>(null);

  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [creatingTask, setCreatingTask] = useState(false);

  const detailsSession = sessions.find((s) => s.id === detailsSessionId) || null;
  const confirmSession = sessions.find((s) => s.id === confirmSessionId) || null;

  useEffect(() => {
    if (preselectedMusicianId) {
      setSelectedMusicianId(preselectedMusicianId);
    }
  }, [preselectedMusicianId]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (title.trim().length < 2) {
      setFormError('Informe um título com pelo menos 2 caracteres.');
      return;
    }

    const chosenMusician = musicians.find((m) => m.id === selectedMusicianId);
    const chosenContact = contacts.find((c) => c.email === selectedContactEmail);

    const participantIds = [currentUserId];
    const participantNames = [currentUserName];

    if (chosenMusician && !participantIds.includes(chosenMusician.ownerId)) {
      participantIds.push(chosenMusician.ownerId);
      participantNames.push(chosenMusician.stageName);
    } else if (chosenContact) {
      participantNames.push(chosenContact.name);
    }

    const newSession: CollabSession = {
      id: `session_${Date.now()}`,
      hostId: currentUserId,
      hostName: currentUserName,
      participantIds,
      participantNames,
      title: title.trim(),
      format,
      scheduledAt,
      durationMinutes,
      status: 'agendada',
      meetUri: '',
      notes: notes.trim(),
      updatedAt: new Date().toISOString(),
    };

    setSubmitting(true);
    try {
      await onCreateSession(
        newSession,
        createMeetAuto && hasWorkspaceToken && format !== 'Presencial'
      );
      setTitle('');
      setNotes('');
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Não foi possível agendar a sessão.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleTaskSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;
    setCreatingTask(true);
    try {
      await onCreateGoogleTask(newTaskTitle.trim());
      setNewTaskTitle('');
    } finally {
      setCreatingTask(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      {/* Left: Scheduled Sessions List */}
      <section className="lg:col-span-7 space-y-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-display font-bold text-slate-950 dark:text-slate-50">
              Agenda de Sessões & Ensaios
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              Coordene horários, gere salas no Google Meet e envie convites diretamente ao Gmail.
            </p>
          </div>
          <span className="text-xs font-mono tabular-nums text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-1.5">
            {sessions.length} sessões
          </span>
        </div>

        {sessions.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-10 text-center space-y-2">
            <Calendar className="w-8 h-8 text-slate-400 dark:text-slate-500 mx-auto" aria-hidden="true" />
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Nenhuma sessão agendada ainda
            </p>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Use o formulário ao lado para marcar seu próximo ensaio ou gravação remota.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {sessions.map((session) => {
              const isTerminal = session.status === 'concluida' || session.status === 'cancelada';
              const collaboratorMusician = musicians.find((m) =>
                session.participantIds.includes(m.ownerId)
              );

              return (
                <article
                  key={session.id}
                  data-testid={`session-card-${session.id}`}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-4 transition-colors"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-1 min-w-0">
                      <h2 className="text-lg font-display font-semibold text-slate-950 dark:text-slate-50">
                        {session.title}
                      </h2>
                      <p className="text-xs text-slate-600 dark:text-slate-400">
                        <span className="font-mono tabular-nums">
                          {formatDateTimePtBr(session.scheduledAt)}
                        </span>
                        <span aria-hidden="true"> · </span>
                        <span className="font-mono tabular-nums">
                          {formatDurationPtBr(session.durationMinutes)}
                        </span>
                        <span aria-hidden="true"> · </span>
                        <span>{session.format}</span>
                      </p>
                      <p className="text-xs text-slate-600 dark:text-slate-400">
                        Participantes: {session.participantNames.join(', ')}
                      </p>
                    </div>

                    <span className={`text-xs font-semibold ${STATUS_STYLES[session.status]}`}>
                      {STATUS_LABELS[session.status]}
                    </span>
                  </div>

                  {session.notes && (
                    <p className="text-sm text-slate-700 dark:text-slate-300 pt-3 border-t border-slate-100 dark:border-slate-800 leading-relaxed">
                      {session.notes}
                    </p>
                  )}

                  {/* Meet link or generator */}
                  {session.meetUri ? (
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
                      <div className="flex items-center gap-2 text-blue-900 dark:text-blue-300 font-medium min-w-0">
                        <Video className="w-4 h-4 text-blue-700 dark:text-blue-400 shrink-0" aria-hidden="true" />
                        <span className="truncate font-mono">{session.meetUri}</span>
                      </div>
                      <a
                        href={session.meetUri}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 font-semibold text-blue-700 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300 shrink-0"
                      >
                        Abrir Meet
                        <ExternalLink className="w-3 h-3" aria-hidden="true" />
                      </a>
                    </div>
                  ) : (
                    session.format !== 'Presencial' &&
                    !isTerminal && (
                      <div className="flex items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
                        <span className="text-slate-600 dark:text-slate-400">
                          Sala de vídeo Google Meet ainda não gerada.
                        </span>
                        <button
                          type="button"
                          disabled={generatingMeetId === session.id}
                          onClick={async () => {
                            setGeneratingMeetId(session.id);
                            try {
                              await onGenerateMeetForSession(session);
                            } finally {
                              setGeneratingMeetId(null);
                            }
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 font-semibold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 rounded-md hover:bg-blue-100 dark:hover:bg-blue-900/60 shrink-0"
                        >
                          <Video className="w-3.5 h-3.5" aria-hidden="true" />
                          {generatingMeetId === session.id ? 'Gerando...' : 'Gerar Google Meet'}
                        </button>
                      </div>
                    )
                  )}

                  {/* Automatic Google Task reminder status */}
                  {session.reminderTaskTitle && (
                    <div className="flex items-center gap-2 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs text-emerald-700 dark:text-emerald-400 font-medium">
                      <ListTodo className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                      <span className="truncate">{session.reminderTaskTitle}</span>
                    </div>
                  )}

                  {/* Imported Google Meet Contacts on session card */}
                  {session.meetImportedContacts && session.meetImportedContacts.length > 0 && (
                    <div
                      data-testid={`session-meet-contacts-${session.id}`}
                      className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                          <Users className="w-3.5 h-3.5 text-blue-700 dark:text-blue-400" aria-hidden="true" />
                          Contatos presentes no Google Meet ({session.meetImportedContacts.length})
                        </span>
                        <button
                          type="button"
                          onClick={() => setDetailsSessionId(session.id)}
                          className="text-[11px] font-medium text-blue-700 dark:text-blue-400 hover:underline"
                        >
                          Gerenciar
                        </button>
                      </div>
                      <ul className="divide-y divide-slate-100 dark:divide-slate-800 bg-slate-50 dark:bg-slate-800/60 rounded-lg px-3">
                        {session.meetImportedContacts.map((contact) => (
                          <li
                            key={contact.id}
                            className="py-2 flex items-center justify-between gap-2 text-xs"
                          >
                            <div className="min-w-0">
                              <p className="font-medium text-slate-900 dark:text-slate-100 truncate">
                                {contact.displayName}
                              </p>
                              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                                {contact.email ||
                                  (contact.source === 'google_account'
                                    ? 'Conta Google'
                                    : contact.source === 'phone'
                                      ? 'Telefone'
                                      : 'Convidado')}
                                {contact.activeNow ? ' · Na sala agora' : ''}
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => onSendSessionInviteGmail(session, contact.email)}
                              className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-blue-700 dark:text-blue-300 bg-white dark:bg-slate-900 rounded hover:bg-blue-50 dark:hover:bg-slate-800 shrink-0"
                            >
                              <Mail className="w-3 h-3" aria-hidden="true" />
                              Gmail
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Session actions */}
                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        data-testid={`session-details-btn-${session.id}`}
                        onClick={() => setDetailsSessionId(session.id)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-800 dark:text-slate-100 bg-slate-100 dark:bg-slate-800 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700"
                      >
                        <Eye className="w-3.5 h-3.5" aria-hidden="true" />
                        Ver detalhes
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          onSendSessionInviteGmail(session, collaboratorMusician?.demoContactEmail)
                        }
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/60"
                      >
                        <Mail className="w-3.5 h-3.5" aria-hidden="true" />
                        Enviar convite pelo Gmail
                      </button>
                      {hasWorkspaceToken && (
                        <button
                          type="button"
                          onClick={() =>
                            void onCreateGoogleTask(
                              `Preparar sessão: ${session.title}`,
                              session.notes || `Formato: ${session.format}`,
                              session.scheduledAt
                            )
                          }
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700"
                        >
                          <ListTodo className="w-3.5 h-3.5" aria-hidden="true" />
                          Adicionar ao Google Tasks
                        </button>
                      )}
                    </div>

                    {!isTerminal && (
                      <div className="flex items-center gap-2">
                        {session.status === 'agendada' && (
                          <button
                            type="button"
                            data-testid={`confirm-session-btn-${session.id}`}
                            onClick={() => setConfirmSessionId(session.id)}
                            className="px-2.5 py-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 rounded-md"
                          >
                            Confirmar
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => void onUpdateSessionStatus(session, 'concluida')}
                          className="px-2.5 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md"
                        >
                          Concluir
                        </button>
                        <button
                          type="button"
                          onClick={() => void onUpdateSessionStatus(session, 'cancelada')}
                          className="px-2.5 py-1.5 text-xs font-medium text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/50 rounded-md"
                        >
                          Cancelar
                        </button>
                      </div>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* Right Column: Schedule Form + Google Tasks & Contacts */}
      <aside className="lg:col-span-5 space-y-6">
        <form
          onSubmit={handleCreate}
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-4 transition-colors"
        >
          <h2 className="text-lg font-display font-semibold text-slate-950 dark:text-slate-50">
            Agendar Nova Sessão
          </h2>

          <div>
            <label
              htmlFor="session-title"
              className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
            >
              Título da sessão
            </label>
            <input
              id="session-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Jam Synth + Percussão Regional"
              className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:border-blue-700 dark:focus:border-blue-500"
              required
            />
          </div>

          <div>
            <label
              htmlFor="session-musician"
              className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
            >
              Músico da rede
            </label>
            <select
              id="session-musician"
              value={selectedMusicianId}
              onChange={(e) => setSelectedMusicianId(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-lg"
            >
              {musicians.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.stageName} — {m.instruments[0]} ({m.region})
                </option>
              ))}
            </select>
          </div>

          {hasWorkspaceToken && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <label
                  htmlFor="session-contact"
                  className="text-xs font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1.5"
                >
                  <Users className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" aria-hidden="true" />
                  Ou convidar de Contatos do Google
                </label>
                <button
                  type="button"
                  onClick={() => void onRefreshWorkspaceData()}
                  className="text-[11px] font-medium text-blue-700 dark:text-blue-400 hover:underline"
                >
                  {loadingContacts ? 'Carregando...' : 'Atualizar contatos'}
                </button>
              </div>
              <select
                id="session-contact"
                value={selectedContactEmail}
                onChange={(e) => setSelectedContactEmail(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-lg"
              >
                <option value="">Nenhum contato externo selecionado</option>
                {contacts.map((c) => (
                  <option key={c.resourceName} value={c.email}>
                    {c.name} ({c.email})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="session-datetime"
                className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
              >
                Data e horário
              </label>
              <input
                id="session-datetime"
                type="datetime-local"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono tabular-nums bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-lg"
                required
              />
            </div>
            <div>
              <label
                htmlFor="session-duration"
                className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
              >
                Duração
              </label>
              <select
                id="session-duration"
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(Number(e.target.value))}
                className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-lg font-mono tabular-nums"
              >
                <option value={30}>30 min</option>
                <option value={60}>1 hora</option>
                <option value={90}>1h 30min</option>
                <option value={120}>2 horas</option>
              </select>
            </div>
          </div>

          <div>
            <label
              htmlFor="session-format"
              className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
            >
              Formato
            </label>
            <select
              id="session-format"
              value={format}
              onChange={(e) => setFormat(e.target.value as SessionFormat)}
              className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-lg"
            >
              <option value="Remota (Google Meet)">Remota (Google Meet)</option>
              <option value="Híbrida">Híbrida</option>
              <option value="Presencial">Presencial</option>
            </select>
          </div>

          <div>
            <label
              htmlFor="session-notes"
              className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
            >
              Pauta técnica (BPM, tonalidade, stems)
            </label>
            <textarea
              id="session-notes"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ex: Testar groove em 108 BPM, enviar stems em WAV 48kHz."
              className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 border border-slate-200 dark:border-slate-700 rounded-lg"
            />
          </div>

          {format !== 'Presencial' && hasWorkspaceToken && (
            <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={createMeetAuto}
                onChange={(e) => setCreateMeetAuto(e.target.checked)}
                className="rounded border-slate-300 dark:border-slate-600 text-blue-700"
              />
              <span>Gerar sala no Google Meet automaticamente ao agendar</span>
            </label>
          )}

          {formError && (
            <p
              role="alert"
              className="text-xs font-medium text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800 rounded-lg px-3 py-2"
            >
              {formError}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-2.5 px-4 text-sm font-semibold text-white bg-blue-700 dark:bg-blue-600 rounded-lg hover:bg-blue-800 dark:hover:bg-blue-500 disabled:opacity-50 transition-colors"
          >
            {submitting ? 'Agendando...' : 'Agendar sessão'}
          </button>
        </form>

        {/* Google Tasks Rehearsal Checklist */}
        <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-4 transition-colors">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <ListTodo className="w-4 h-4 text-blue-700 dark:text-blue-400" aria-hidden="true" />
              <h2 className="text-base font-display font-semibold text-slate-950 dark:text-slate-50">
                Checklist no Google Tasks
              </h2>
            </div>
            {hasWorkspaceToken && (
              <button
                type="button"
                onClick={() => void onRefreshWorkspaceData()}
                className="text-xs font-medium text-blue-700 dark:text-blue-400 hover:underline"
              >
                {loadingTasks ? 'Sincronizando...' : 'Sincronizar'}
              </button>
            )}
          </div>

          {!hasWorkspaceToken ? (
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-3">
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Conecte sua conta Google para criar e acompanhar tarefas de preparo de gravação
                diretamente no seu <strong>Google Tasks</strong> e importar colaboradores de{' '}
                <strong>Contatos</strong>.
              </p>
              <button
                type="button"
                onClick={() => void onSignIn()}
                className="px-3.5 py-2 text-xs font-semibold text-white dark:text-slate-950 bg-slate-900 dark:bg-slate-100 rounded-lg hover:bg-slate-800 dark:hover:bg-white"
              >
                Conectar Google Workspace
              </button>
            </div>
          ) : (
            <>
              <form onSubmit={handleTaskSubmit} className="flex items-center gap-2">
                <label htmlFor="new-google-task" className="sr-only">
                  Nova tarefa no Google Tasks
                </label>
                <input
                  id="new-google-task"
                  type="text"
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  placeholder="Ex: Exportar stems de baixo 24bit"
                  className="flex-1 px-3 py-2 text-xs bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 border border-slate-200 dark:border-slate-700 rounded-lg"
                />
                <button
                  type="submit"
                  disabled={creatingTask || !newTaskTitle.trim()}
                  aria-label="Adicionar tarefa ao Google Tasks"
                  className="inline-flex items-center gap-1 px-3 py-2 text-xs font-semibold text-white dark:text-slate-950 bg-slate-900 dark:bg-slate-100 rounded-lg hover:bg-slate-800 dark:hover:bg-white disabled:opacity-50"
                >
                  <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                  Criar
                </button>
              </form>

              {tasks.length === 0 ? (
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Nenhuma tarefa na sua lista padrão do Google Tasks.
                </p>
              ) : (
                <ul className="divide-y divide-slate-100 dark:divide-slate-800 max-h-60 overflow-y-auto">
                  {tasks.map((task) => {
                    const done = task.status === 'completed';
                    return (
                      <li key={task.id} className="py-2.5 flex items-start gap-2.5">
                        <button
                          type="button"
                          onClick={() => void onToggleGoogleTask(task)}
                          aria-label={
                            done ? `Reabrir tarefa ${task.title}` : `Concluir tarefa ${task.title}`
                          }
                          className="mt-0.5 text-slate-500 dark:text-slate-400 hover:text-blue-700 dark:hover:text-blue-400 shrink-0"
                        >
                          {done ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                          ) : (
                            <Circle className="w-4 h-4" />
                          )}
                        </button>
                        <div className="min-w-0 flex-1">
                          <p
                            className={`text-xs font-medium ${
                              done
                                ? 'line-through text-slate-400 dark:text-slate-500'
                                : 'text-slate-800 dark:text-slate-200'
                            }`}
                          >
                            {task.title}
                          </p>
                          {task.due && (
                            <p className="text-[11px] font-mono tabular-nums text-slate-500 dark:text-slate-400">
                              Prazo: {formatDateTimePtBr(task.due)}
                            </p>
                          )}
                          {task.notes && (
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                              {task.notes}
                            </p>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </>
          )}
        </section>

        {/* Consolidated Imported Meet Contacts Panel */}
        <section
          data-testid="scheduler-meet-contacts-panel"
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-3 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-blue-700 dark:text-blue-400" aria-hidden="true" />
            <h2 className="text-base font-display font-semibold text-slate-950 dark:text-slate-50">
              Contatos do Google Meet
            </h2>
          </div>

          {(() => {
            const entries = sessions.flatMap((s) =>
              (s.meetImportedContacts || []).map((contact) => ({
                session: s,
                contact,
              }))
            );
            if (entries.length === 0) {
              return (
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  Abra <strong>Ver detalhes</strong> em qualquer sessão com sala do Google Meet
                  para importar os participantes presentes na reunião.
                </p>
              );
            }
            return (
              <ul className="divide-y divide-slate-100 dark:divide-slate-800 max-h-60 overflow-y-auto">
                {entries.map(({ session, contact }) => (
                  <li
                    key={`${session.id}_${contact.id}`}
                    className="py-2.5 flex items-center justify-between gap-2 text-xs"
                  >
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                        {contact.displayName}
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                        {session.title}
                        {contact.email ? ` · ${contact.email}` : ''}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => onSendSessionInviteGmail(session, contact.email)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 rounded-md hover:bg-blue-100 dark:hover:bg-blue-900/60 shrink-0"
                    >
                      <Mail className="w-3 h-3" aria-hidden="true" />
                      Gmail
                    </button>
                  </li>
                ))}
              </ul>
            );
          })()}
        </section>
      </aside>

      <SessionDetailsModal
        session={detailsSession}
        hasWorkspaceToken={hasWorkspaceToken}
        onClose={() => setDetailsSessionId(null)}
        onSignIn={onSignIn}
        onGenerateMeetForSession={onGenerateMeetForSession}
        onImportMeetContacts={onImportMeetContacts}
        onRequestConfirmSession={(target) => setConfirmSessionId(target.id)}
        onUpdateSessionStatus={onUpdateSessionStatus}
        onSendSessionInviteGmail={onSendSessionInviteGmail}
      />

      <SessionConfirmDialog
        session={confirmSession}
        hasWorkspaceToken={hasWorkspaceToken}
        onSignIn={onSignIn}
        onCancel={() => setConfirmSessionId(null)}
        onConfirm={async (target, createTaskReminder) => {
          await onConfirmSession(target, createTaskReminder);
          setConfirmSessionId(null);
        }}
      />
    </div>
  );
}
