import { useEffect, useState } from 'react';
import { Mail, X } from 'lucide-react';
import type { GmailDraftRequest, GoogleContactItem } from '../types';

interface GmailConfirmDialogProps {
  draft: GmailDraftRequest | null;
  hasWorkspaceToken: boolean;
  contacts: GoogleContactItem[];
  onSignIn: () => Promise<void>;
  onCancel: () => void;
  onConfirmSend: (finalDraft: GmailDraftRequest) => Promise<void>;
}

export function GmailConfirmDialog({
  draft,
  hasWorkspaceToken,
  contacts,
  onSignIn,
  onCancel,
  onConfirmSend,
}: GmailConfirmDialogProps) {
  const [to, setTo] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (draft) {
      setTo(draft.to);
      setSubject(draft.subject);
      setBody(draft.body);
      setError(null);
    }
  }, [draft]);

  if (!draft) return null;

  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!to.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to.trim())) {
      setError('Informe um e-mail de destinatário válido.');
      return;
    }
    if (!subject.trim() || !body.trim()) {
      setError('Assunto e corpo do e-mail são obrigatórios.');
      return;
    }
    setSending(true);
    try {
      await onConfirmSend({
        ...draft,
        to: to.trim(),
        subject: subject.trim(),
        body: body.trim(),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao enviar e-mail.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="gmail-confirm-title"
    >
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl max-w-lg w-full overflow-hidden shadow-lg">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Mail className="w-5 h-5 text-blue-700 dark:text-blue-400" aria-hidden="true" />
            <h2
              id="gmail-confirm-title"
              className="text-base font-display font-semibold text-slate-900 dark:text-slate-50"
            >
              Confirmar envio via Gmail
            </h2>
          </div>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Fechar confirmação de envio"
            className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleConfirm} className="p-6 space-y-4">
          <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
            Esta ação enviará uma mensagem real usando sua conta do{' '}
            <strong className="text-slate-900 dark:text-slate-100">Gmail</strong> (
            {draft.contextLabel}). Revise os dados antes de confirmar.
          </p>

          {!hasWorkspaceToken && (
            <div className="p-3.5 bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 rounded-lg text-sm text-amber-900 dark:text-amber-200 space-y-2">
              <p>Conecte sua conta Google para autorizar o envio direto pelo Gmail.</p>
              <button
                type="button"
                onClick={() => void onSignIn()}
                className="px-3.5 py-1.5 text-xs font-semibold bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-950 rounded-md hover:bg-slate-800 dark:hover:bg-white"
              >
                Conectar conta Google agora
              </button>
            </div>
          )}

          {contacts.length > 0 && (
            <div>
              <label
                htmlFor="gmail-contact-picker"
                className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
              >
                Escolher dos Contatos do Google
              </label>
              <select
                id="gmail-contact-picker"
                value=""
                onChange={(e) => {
                  if (e.target.value) setTo(e.target.value);
                }}
                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
              >
                <option value="">Selecionar contato...</option>
                {contacts.map((c) => (
                  <option key={c.resourceName} value={c.email}>
                    {c.name} ({c.email})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label
              htmlFor="gmail-to"
              className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
            >
              Destinatário (Para)
            </label>
            <input
              id="gmail-to"
              type="email"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="artista@email.com"
              className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:border-blue-700 dark:focus:border-blue-500"
              required
            />
          </div>

          <div>
            <label
              htmlFor="gmail-subject"
              className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
            >
              Assunto
            </label>
            <input
              id="gmail-subject"
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:border-blue-700 dark:focus:border-blue-500"
              required
            />
          </div>

          <div>
            <label
              htmlFor="gmail-body"
              className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
            >
              Mensagem
            </label>
            <textarea
              id="gmail-body"
              rows={5}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:border-blue-700 dark:focus:border-blue-500"
              required
            />
          </div>

          {error && (
            <p
              role="alert"
              className="text-xs font-medium text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800 rounded-lg px-3 py-2"
            >
              {error}
            </p>
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
              type="submit"
              disabled={sending || !hasWorkspaceToken}
              className="px-4 py-2 text-sm font-semibold text-white bg-blue-700 dark:bg-blue-600 rounded-lg hover:bg-blue-800 dark:hover:bg-blue-500 disabled:opacity-50"
            >
              {sending ? 'Enviando...' : 'Confirmar envio pelo Gmail'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
