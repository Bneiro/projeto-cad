import { useEffect, useState } from 'react';
import {
  Calendar,
  CheckCircle2,
  ExternalLink,
  ListTodo,
  Mail,
  RefreshCw,
  Users,
  Video,
  X,
} from 'lucide-react';
import type { CollabSession, MeetParticipantContact, SessionStatus } from '../types';
import { formatDateTimePtBr, formatDurationPtBr } from '../utils/filters';

interface SessionDetailsModalProps {
  session: CollabSession | null;
  hasWorkspaceToken: boolean;
  onClose: () => void;
  onSignIn: () => Promise<void>;
  onGenerateMeetForSession: (session: CollabSession) => Promise<void>;
  onImportMeetContacts: (session: CollabSession) => Promise<MeetParticipantContact[]>;
  onRequestConfirmSession: (session: CollabSession) => void;
  onUpdateSessionStatus: (session: CollabSession, nextStatus: SessionStatus) => Promise<void>;
  onSendSessionInviteGmail: (session: CollabSession, contactEmail?: string) => void;
}

const STATUS_LABELS: Record<SessionStatus, string> = {
  agendada: 'Agendada',
  confirmada: 'Confirmada',
  concluida: 'Concluída',
  cancelada: 'Cancelada',
};

const SOURCE_LABELS: Record<MeetParticipantContact['source'], string> = {
  google_account: 'Conta Google',
  anonymous: 'Convidado',
  phone: 'Telefone',
};

export function SessionDetailsModal({
  session,
  hasWorkspaceToken,
  onClose,
  onSignIn,
  onGenerateMeetForSession,
  onImportMeetContacts,
  onRequestConfirmSession,
  onUpdateSessionStatus,
  onSendSessionInviteGmail,
}: SessionDetailsModalProps) {
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importNotice, setImportNotice] = useState<string | null>(null);
  const [generatingMeet, setGeneratingMeet] = useState(false);

  useEffect(() => {
    setImportError(null);
    setImportNotice(null);
    setImporting(false);
  }, [session?.id]);

  if (!session) return null;

  const isTerminal = session.status === 'concluida' || session.status === 'cancelada';
  const importedContacts = session.meetImportedContacts || [];

  const handleImportClick = async () => {
    setImportError(null);
    setImportNotice(null);
    setImporting(true);
    try {
      const list = await onImportMeetContacts(session);
      if (list.length === 0) {
        setImportNotice(
          'Nenhum participante registrado até o momento nesta sala do Google Meet. Os contatos ficam disponíveis assim que alguém entra na chamada.'
        );
      } else {
        setImportNotice(
          `${list.length} contato(s) importado(s) do Google Meet e exibido(s) na agenda.`
        );
      }
    } catch (err) {
      setImportError(
        err instanceof Error
          ? err.message
          : 'Não foi possível importar os contatos do Google Meet.'
      );
    } finally {
      setImporting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="session-details-modal-title"
      data-testid="session-details-modal"
    >
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-lg">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between sticky top-0 bg-white dark:bg-slate-900 z-10">
          <div className="min-w-0 pr-4">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-blue-700 dark:text-blue-400">
              Detalhes da sessão · {STATUS_LABELS[session.status]}
            </p>
            <h2
              id="session-details-modal-title"
              className="text-lg font-display font-semibold text-slate-950 dark:text-slate-50 truncate"
            >
              {session.title}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar detalhes da sessão"
            className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Core metadata */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 dark:bg-slate-800/70 rounded-xl p-4 text-xs">
            <div className="space-y-1">
              <span className="text-slate-500 dark:text-slate-400 block">Data e horário</span>
              <span className="font-mono tabular-nums font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-blue-700 dark:text-blue-400" aria-hidden="true" />
                {formatDateTimePtBr(session.scheduledAt)}
              </span>
            </div>
            <div className="space-y-1">
              <span className="text-slate-500 dark:text-slate-400 block">Duração e formato</span>
              <span className="font-semibold text-slate-900 dark:text-slate-100">
                <span className="font-mono tabular-nums">
                  {formatDurationPtBr(session.durationMinutes)}
                </span>{' '}
                · {session.format}
              </span>
            </div>
            <div className="space-y-1">
              <span className="text-slate-500 dark:text-slate-400 block">Anfitrião</span>
              <span className="font-semibold text-slate-900 dark:text-slate-100">
                {session.hostName}
              </span>
            </div>
            <div className="space-y-1">
              <span className="text-slate-500 dark:text-slate-400 block">
                Participantes convidados
              </span>
              <span className="font-medium text-slate-800 dark:text-slate-200">
                {session.participantNames.join(', ')}
              </span>
            </div>
          </div>

          {session.notes && (
            <div className="space-y-1.5">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Pauta técnica
              </h3>
              <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                {session.notes}
              </p>
            </div>
          )}

          {/* Reminder status */}
          <div className="flex items-center justify-between gap-3 pt-4 border-t border-slate-100 dark:border-slate-800 text-xs">
            <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
              <ListTodo className="w-4 h-4 text-blue-700 dark:text-blue-400 shrink-0" aria-hidden="true" />
              {session.reminderTaskTitle ? (
                <span>
                  Lembrete no Google Tasks criado:{' '}
                  <strong className="text-slate-900 dark:text-slate-100">
                    {session.reminderTaskTitle}
                  </strong>
                </span>
              ) : session.status === 'agendada' ? (
                <span>
                  Ao confirmar esta sessão, um lembrete será criado automaticamente no{' '}
                  <strong>Google Tasks</strong>.
                </span>
              ) : (
                <span>Nenhum lembrete automático vinculado no Google Tasks.</span>
              )}
            </div>
            {session.status === 'agendada' && (
              <button
                type="button"
                onClick={() => onRequestConfirmSession(session)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 font-semibold text-white bg-emerald-700 dark:bg-emerald-600 rounded-lg hover:bg-emerald-800 dark:hover:bg-emerald-500 shrink-0"
              >
                <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                Confirmar agora
              </button>
            )}
          </div>

          {/* Google Meet section + Import Contacts */}
          <section className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-display font-semibold text-slate-950 dark:text-slate-50 flex items-center gap-2">
                  <Users className="w-4 h-4 text-blue-700 dark:text-blue-400" aria-hidden="true" />
                  Contatos presentes no Google Meet
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                  Importe a lista de participantes da reunião Meet vinculada para visualizar e contatar na agenda.
                </p>
              </div>

              {session.meetUri && hasWorkspaceToken && (
                <button
                  type="button"
                  disabled={importing}
                  onClick={() => void handleImportClick()}
                  data-testid="import-meet-contacts-btn"
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-blue-700 dark:bg-blue-600 rounded-lg hover:bg-blue-800 dark:hover:bg-blue-500 disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${importing ? 'animate-spin' : ''}`} aria-hidden="true" />
                  {importing ? 'Importando do Meet...' : 'Importar contatos do Google Meet'}
                </button>
              )}
            </div>

            {session.meetUri ? (
              <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-50 dark:bg-slate-800/70 rounded-lg px-3.5 py-2.5 text-xs">
                <div className="flex items-center gap-2 text-blue-900 dark:text-blue-300 font-mono min-w-0">
                  <Video className="w-4 h-4 text-blue-700 dark:text-blue-400 shrink-0" aria-hidden="true" />
                  <span className="truncate">{session.meetUri}</span>
                </div>
                <a
                  href={session.meetUri}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 font-semibold text-blue-700 dark:text-blue-400 hover:underline shrink-0"
                >
                  Abrir sala
                  <ExternalLink className="w-3 h-3" aria-hidden="true" />
                </a>
              </div>
            ) : (
              <div className="bg-slate-50 dark:bg-slate-800/70 rounded-lg p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs">
                <span className="text-slate-600 dark:text-slate-400">
                  Esta sessão ainda não possui um link do Google Meet vinculado.
                </span>
                {session.format !== 'Presencial' && !isTerminal && (
                  <button
                    type="button"
                    disabled={generatingMeet}
                    onClick={async () => {
                      setGeneratingMeet(true);
                      try {
                        await onGenerateMeetForSession(session);
                      } finally {
                        setGeneratingMeet(false);
                      }
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 font-semibold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 rounded-md hover:bg-blue-100 dark:hover:bg-blue-900/60"
                  >
                    <Video className="w-3.5 h-3.5" aria-hidden="true" />
                    {generatingMeet ? 'Gerando...' : 'Gerar Google Meet'}
                  </button>
                )}
              </div>
            )}

            {session.meetUri && !hasWorkspaceToken && (
              <div className="bg-amber-50 dark:bg-amber-950/50 rounded-lg p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs text-amber-900 dark:text-amber-200">
                <span>
                  Conecte sua conta Google para ler os participantes da reunião no Google Meet.
                </span>
                <button
                  type="button"
                  onClick={() => void onSignIn()}
                  className="px-3 py-1.5 font-semibold bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-950 rounded-md hover:bg-slate-800 dark:hover:bg-white shrink-0"
                >
                  Conectar Google Workspace
                </button>
              </div>
            )}

            {importError && (
              <p
                role="alert"
                className="text-xs font-medium text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800 rounded-lg px-3 py-2"
              >
                {importError}
              </p>
            )}

            {importNotice && (
              <p
                role="status"
                className="text-xs font-medium text-blue-900 dark:text-blue-200 bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 rounded-lg px-3 py-2"
              >
                {importNotice}
              </p>
            )}

            {importedContacts.length > 0 && (
              <ul
                data-testid="modal-meet-contacts-list"
                className="divide-y divide-slate-100 dark:divide-slate-800 rounded-lg bg-slate-50 dark:bg-slate-800/70 px-4"
              >
                {importedContacts.map((contact) => (
                  <li
                    key={contact.id}
                    className="py-3 flex flex-wrap items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {contact.photoUrl ? (
                        <img
                          src={contact.photoUrl}
                          alt={contact.displayName}
                          className="w-8 h-8 rounded-full object-cover shrink-0"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center font-semibold shrink-0">
                          {contact.displayName.slice(0, 2).toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                          {contact.displayName}
                        </p>
                        <p className="text-[11px] text-slate-600 dark:text-slate-400 truncate">
                          <span>{SOURCE_LABELS[contact.source]}</span>
                          {contact.email && <span> · {contact.email}</span>}
                          {contact.inGoogleContacts && <span> · Nos seus Contatos</span>}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span
                        className={`text-[11px] font-medium ${
                          contact.activeNow
                            ? 'text-emerald-700 dark:text-emerald-400'
                            : 'text-slate-500 dark:text-slate-400'
                        }`}
                      >
                        {contact.activeNow ? 'Presente agora' : 'Participou'}
                      </span>
                      <button
                        type="button"
                        onClick={() => onSendSessionInviteGmail(session, contact.email)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-blue-700 dark:text-blue-300 bg-white dark:bg-slate-900 rounded-md hover:bg-blue-50 dark:hover:bg-slate-800"
                      >
                        <Mail className="w-3 h-3" aria-hidden="true" />
                        Gmail
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Footer quick actions */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => onSendSessionInviteGmail(session)}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/60"
              >
                <Mail className="w-3.5 h-3.5" aria-hidden="true" />
                Enviar convite pelo Gmail
              </button>
              {!isTerminal && (
                <button
                  type="button"
                  onClick={() => void onUpdateSessionStatus(session, 'concluida')}
                  className="px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700"
                >
                  Concluir sessão
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700"
            >
              Fechar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
