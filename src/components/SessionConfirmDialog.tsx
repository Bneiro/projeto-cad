import { useEffect, useState } from 'react';
import { Calendar, CheckCircle2, ListTodo, X } from 'lucide-react';
import type { CollabSession } from '../types';
import { formatDateTimePtBr } from '../utils/filters';
import { buildSessionReminderTaskPayload } from '../utils/sessionWorkspace';

interface SessionConfirmDialogProps {
  session: CollabSession | null;
  hasWorkspaceToken: boolean;
  onSignIn: () => Promise<void>;
  onCancel: () => void;
  onConfirm: (session: CollabSession, createTaskReminder: boolean) => Promise<void>;
}

export function SessionConfirmDialog({
  session,
  hasWorkspaceToken,
  onSignIn,
  onCancel,
  onConfirm,
}: SessionConfirmDialogProps) {
  const [createTaskReminder, setCreateTaskReminder] = useState(true);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    if (session) {
      setCreateTaskReminder(true);
    }
  }, [session]);

  if (!session) return null;

  const taskPreview = buildSessionReminderTaskPayload(session);

  const handleConfirmClick = async () => {
    setConfirming(true);
    try {
      await onConfirm(session, hasWorkspaceToken && createTaskReminder);
    } finally {
      setConfirming(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="session-confirm-title"
    >
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl max-w-md w-full overflow-hidden shadow-lg">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
            <h2
              id="session-confirm-title"
              className="text-base font-display font-semibold text-slate-950 dark:text-slate-50"
            >
              Confirmar sessão musical
            </h2>
          </div>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Fechar confirmação de sessão"
            className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="space-y-1">
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{session.title}</p>
            <p className="text-xs text-slate-600 dark:text-slate-400 flex items-center gap-1.5 font-mono tabular-nums">
              <Calendar className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
              {formatDateTimePtBr(session.scheduledAt)} · {session.format}
            </p>
          </div>

          {hasWorkspaceToken ? (
            <div className="bg-slate-50 dark:bg-slate-800/70 rounded-lg p-3.5 space-y-2.5">
              <label className="flex items-start gap-2.5 text-xs text-slate-800 dark:text-slate-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={createTaskReminder}
                  onChange={(e) => setCreateTaskReminder(e.target.checked)}
                  className="mt-0.5 rounded border-slate-300 dark:border-slate-600 text-blue-700"
                />
                <span>
                  Criar automaticamente um lembrete no <strong>Google Tasks</strong> com o título e
                  a data agendada desta sessão.
                </span>
              </label>

              {createTaskReminder && (
                <div className="pl-6 text-[11px] text-slate-600 dark:text-slate-400 space-y-1">
                  <p className="flex items-center gap-1.5 font-medium text-slate-700 dark:text-slate-300">
                    <ListTodo className="w-3.5 h-3.5 text-blue-700 dark:text-blue-400 shrink-0" aria-hidden="true" />
                    <span>{taskPreview.title}</span>
                  </p>
                  <p className="font-mono tabular-nums">
                    Prazo: {formatDateTimePtBr(session.scheduledAt)}
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-amber-50 dark:bg-amber-950/50 rounded-lg p-3.5 text-xs text-amber-900 dark:text-amber-200 space-y-2">
              <p>
                Ao confirmar agora, o status da sessão será atualizado para <strong>Confirmada</strong>.
                Para gerar automaticamente o lembrete no <strong>Google Tasks</strong>, conecte sua
                conta Google antes de confirmar.
              </p>
              <button
                type="button"
                onClick={() => void onSignIn()}
                className="px-3 py-1.5 text-xs font-semibold bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-950 rounded-md hover:bg-slate-800 dark:hover:bg-white"
              >
                Conectar Google Workspace
              </button>
            </div>
          )}

          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={confirming}
              onClick={() => void handleConfirmClick()}
              className="px-4 py-2 text-sm font-semibold text-white bg-emerald-700 dark:bg-emerald-600 rounded-lg hover:bg-emerald-800 dark:hover:bg-emerald-500 disabled:opacity-50"
            >
              {confirming
                ? 'Confirmando...'
                : hasWorkspaceToken && createTaskReminder
                  ? 'Confirmar e criar lembrete'
                  : 'Confirmar sessão'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
