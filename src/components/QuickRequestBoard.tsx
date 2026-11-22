import { useEffect, useMemo, useState } from 'react';
import {
  Calendar,
  CheckCircle2,
  Clock,
  Mail,
  Megaphone,
  MessageSquare,
  Plus,
  Search,
  X,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import type {
  CollabFormat,
  MacroRegion,
  QuickRequest,
  RequestStatus,
  RequestUrgency,
  MusicianProfile,
} from '../types';
import { formatDateTimePtBr, MACRO_REGION_ORDER } from '../utils/filters';
import {
  DEFAULT_QUICK_REQUEST_FILTERS,
  filterAndSortQuickRequests,
  type QuickRequestFilterState,
} from '../utils/quickRequests';

interface QuickRequestBoardProps {
  requests: QuickRequest[];
  userProfile: MusicianProfile | null;
  currentUserId: string;
  currentUserName: string;
  onCreateRequest: (request: QuickRequest) => Promise<void>;
  onRespondRequest: (request: QuickRequest) => void;
  onScheduleFromRequest: (request: QuickRequest) => void;
  onSendGmailFromRequest: (request: QuickRequest) => void;
  onResolveRequest: (request: QuickRequest) => Promise<void>;
}

const STATUS_LABELS: Record<RequestStatus, string> = {
  aberto: 'Aberto',
  em_andamento: 'Em andamento',
  resolvido: 'Resolvido',
};

const STATUS_TEXT_COLORS: Record<RequestStatus, string> = {
  aberto: 'text-emerald-700 dark:text-emerald-400',
  em_andamento: 'text-blue-700 dark:text-blue-400',
  resolvido: 'text-slate-500 dark:text-slate-400',
};

const URGENCY_TEXT_COLORS: Record<RequestUrgency, string> = {
  'Hoje / Urgente': 'text-amber-700 dark:text-amber-400',
  'Esta semana': 'text-blue-700 dark:text-blue-400',
  'Sem pressa': 'text-slate-600 dark:text-slate-400',
};

const STATUS_FILTER_OPTIONS: { id: QuickRequestFilterState['status']; label: string }[] = [
  { id: 'ativos', label: 'Ativos' },
  { id: 'aberto', label: 'Abertos' },
  { id: 'em_andamento', label: 'Em andamento' },
  { id: 'resolvido', label: 'Resolvidos' },
  { id: 'todos', label: 'Todos' },
];

export function QuickRequestBoard({
  requests,
  userProfile,
  currentUserId,
  currentUserName,
  onCreateRequest,
  onRespondRequest,
  onScheduleFromRequest,
  onSendGmailFromRequest,
  onResolveRequest,
}: QuickRequestBoardProps) {
  const [filters, setFilters] = useState<QuickRequestFilterState>(DEFAULT_QUICK_REQUEST_FILTERS);

  // Composer state
  const [title, setTitle] = useState('');
  const [instrumentNeeded, setInstrumentNeeded] = useState('');
  const [genreContext, setGenreContext] = useState('');
  const [bpmAndKey, setBpmAndKey] = useState('');
  const [urgency, setUrgency] = useState<RequestUrgency>('Hoje / Urgente');
  const [collabFormat, setCollabFormat] = useState<CollabFormat>(
    userProfile?.collabFormat || 'Remoto'
  );
  const [macroRegion, setMacroRegion] = useState<MacroRegion>(
    userProfile?.macroRegion || 'Remoto / Global'
  );
  const [authorRegion, setAuthorRegion] = useState(
    userProfile?.region || 'Brasil · Remoto'
  );
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (userProfile) {
      setCollabFormat(userProfile.collabFormat);
      setMacroRegion(userProfile.macroRegion);
      setAuthorRegion(userProfile.region);
    }
  }, [userProfile]);

  const filteredRequests = useMemo(
    () => filterAndSortQuickRequests(requests, filters),
    [requests, filters]
  );

  const activeCount = useMemo(
    () => requests.filter((r) => r.status !== 'resolvido').length,
    [requests]
  );

  const hasActiveFilter =
    filters.search !== '' ||
    filters.macroRegion !== 'Todas' ||
    filters.urgency !== 'Todas' ||
    filters.collabFormat !== 'Todos' ||
    filters.status !== 'ativos';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (title.trim().length < 3) {
      setFormError('Informe um título claro com pelo menos 3 caracteres.');
      return;
    }
    if (instrumentNeeded.trim().length < 2) {
      setFormError('Informe qual instrumento ou função você precisa.');
      return;
    }
    if (description.trim().length < 6) {
      setFormError('Descreva o pedido rapidamente (ex: guia, stems, prazo).');
      return;
    }

    const now = new Date().toISOString();
    const newRequest: QuickRequest = {
      id: `req_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      authorId: currentUserId,
      authorName: userProfile?.name || currentUserName || 'Você',
      authorStageName: userProfile?.stageName || currentUserName || 'Artista Independente',
      authorRegion: authorRegion.trim() || macroRegion,
      macroRegion,
      title: title.trim(),
      description: description.trim(),
      instrumentNeeded: instrumentNeeded.trim(),
      genreContext: genreContext.trim() || 'Fusão Aberta',
      bpmAndKey: bpmAndKey.trim() || 'A combinar',
      collabFormat,
      urgency,
      status: 'aberto',
      responseCount: 0,
      demoContactEmail: userProfile?.demoContactEmail,
      createdAt: now,
      updatedAt: now,
    };

    setSubmitting(true);
    try {
      await onCreateRequest(newRequest);
      setTitle('');
      setInstrumentNeeded('');
      setGenreContext('');
      setBpmAndKey('');
      setDescription('');
      setFilters((prev) => ({ ...prev, status: 'ativos' }));
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : 'Não foi possível publicar seu pedido rápido.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      {/* Left: Community Feed + Filters */}
      <section className="lg:col-span-7 space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-medium text-blue-700 dark:text-blue-400 tracking-wide">
              Comunidade ativa · Chamadas abertas
            </p>
            <h1 className="text-2xl sm:text-3xl font-display font-bold text-slate-950 dark:text-slate-50 mt-0.5">
              Mural de Pedidos Rápidos
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              Publique demandas pontuais de gravação, stems ou ensaios e responda diretamente no
              chat ao vivo.
            </p>
          </div>
          <span className="text-xs font-mono tabular-nums text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-1.5 shrink-0">
            {activeCount} pedidos ativos
          </span>
        </div>

        {/* Filters */}
        <div
          aria-label="Filtros do mural de pedidos"
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-3 transition-colors"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="inline-flex flex-wrap items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
              {STATUS_FILTER_OPTIONS.map((opt) => {
                const active = filters.status === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setFilters((prev) => ({ ...prev, status: opt.id }))}
                    className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                      active
                        ? 'bg-white dark:bg-slate-950 text-slate-950 dark:text-slate-50 shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-950 dark:hover:text-slate-100'
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>

            {hasActiveFilter && (
              <button
                type="button"
                onClick={() => setFilters(DEFAULT_QUICK_REQUEST_FILTERS)}
                className="px-2.5 py-1 text-xs font-medium text-blue-700 dark:text-blue-400 hover:underline"
              >
                Limpar filtros
              </button>
            )}
          </div>

          <div className="space-y-2.5">
            <div className="relative">
              <label htmlFor="quick-request-search" className="sr-only">
                Buscar pedidos por instrumento, gênero ou BPM
              </label>
              <Search
                className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                aria-hidden="true"
              />
              <input
                id="quick-request-search"
                type="text"
                role="searchbox"
                value={filters.search}
                onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
                placeholder="Buscar por instrumento, gênero, região ou BPM..."
                className="w-full pl-8 pr-8 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-blue-700 dark:focus:border-blue-500"
              />
              {filters.search.length > 0 && (
                <button
                  type="button"
                  aria-label="Limpar busca do mural"
                  onClick={() => setFilters((prev) => ({ ...prev, search: '' }))}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                >
                  <X className="w-3.5 h-3.5" aria-hidden="true" />
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div>
                <label htmlFor="quick-filter-urgency" className="sr-only">
                  Filtrar por urgência
                </label>
                <select
                  id="quick-filter-urgency"
                  value={filters.urgency}
                  onChange={(e) => setFilters((prev) => ({ ...prev, urgency: e.target.value }))}
                  className="w-full px-2.5 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100"
                >
                  <option value="Todas">Urgência: Todas</option>
                  <option value="Hoje / Urgente">Hoje / Urgente</option>
                  <option value="Esta semana">Esta semana</option>
                  <option value="Sem pressa">Sem pressa</option>
                </select>
              </div>

              <div>
                <label htmlFor="quick-filter-region" className="sr-only">
                  Filtrar por macrorregião
                </label>
                <select
                  id="quick-filter-region"
                  value={filters.macroRegion}
                  onChange={(e) => setFilters((prev) => ({ ...prev, macroRegion: e.target.value }))}
                  className="w-full px-2.5 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100"
                >
                  <option value="Todas">Região: Todas</option>
                  {MACRO_REGION_ORDER.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="quick-filter-format" className="sr-only">
                  Filtrar por formato
                </label>
                <select
                  id="quick-filter-format"
                  value={filters.collabFormat}
                  onChange={(e) => setFilters((prev) => ({ ...prev, collabFormat: e.target.value }))}
                  className="w-full px-2.5 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100"
                >
                  <option value="Todos">Formato: Todos</option>
                  <option value="Remoto">Remoto</option>
                  <option value="Híbrido">Híbrido</option>
                  <option value="Presencial">Presencial</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Feed */}
        {filteredRequests.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-10 text-center space-y-2">
            <Megaphone className="w-8 h-8 text-slate-400 dark:text-slate-500 mx-auto" aria-hidden="true" />
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Nenhum pedido encontrado com esses filtros
            </p>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Amplie os critérios ou publique um novo pedido rápido ao lado para acionar a rede.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <AnimatePresence mode="popLayout" initial={false}>
              {filteredRequests.map((req) => {
                const isOwner = req.authorId === currentUserId;
                const isResolved = req.status === 'resolvido';

                return (
                  <motion.article
                    key={req.id}
                    layout="position"
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                    data-testid={`quick-request-card-${req.id}`}
                    className={`bg-white dark:bg-slate-900 border rounded-xl p-6 space-y-4 transition-colors ${
                      isResolved
                        ? 'border-slate-200 dark:border-slate-800 opacity-80'
                        : 'border-slate-200 dark:border-slate-800'
                    }`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                          <span
                            className={`inline-flex items-center gap-1 font-semibold ${URGENCY_TEXT_COLORS[req.urgency]}`}
                          >
                            <Clock className="w-3.5 h-3.5" aria-hidden="true" />
                            {req.urgency}
                          </span>
                          <span aria-hidden="true" className="text-slate-300 dark:text-slate-700">
                            ·
                          </span>
                          <span className={`font-semibold ${STATUS_TEXT_COLORS[req.status]}`}>
                            {STATUS_LABELS[req.status]}
                          </span>
                          <span aria-hidden="true" className="text-slate-300 dark:text-slate-700">
                            ·
                          </span>
                          <span className="font-mono tabular-nums text-slate-500 dark:text-slate-400">
                            {req.responseCount}{' '}
                            {req.responseCount === 1 ? 'resposta' : 'respostas'}
                          </span>
                        </div>

                        <h2 className="text-lg font-display font-semibold text-slate-950 dark:text-slate-50">
                          {req.title}
                        </h2>
                        <p className="text-xs text-slate-600 dark:text-slate-400">
                          <span className="font-medium text-slate-800 dark:text-slate-200">
                            {req.authorStageName}
                          </span>
                          {' · '}
                          {req.authorRegion}
                          {' · '}
                          <span className="font-mono tabular-nums">
                            {formatDateTimePtBr(req.createdAt)}
                          </span>
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
                      <div>
                        <span className="block text-[11px] text-slate-500 dark:text-slate-400">
                          Instrumento
                        </span>
                        <span className="font-semibold text-slate-900 dark:text-slate-100">
                          {req.instrumentNeeded}
                        </span>
                      </div>
                      <div>
                        <span className="block text-[11px] text-slate-500 dark:text-slate-400">
                          Contexto
                        </span>
                        <span className="font-medium text-slate-800 dark:text-slate-200">
                          {req.genreContext}
                        </span>
                      </div>
                      <div>
                        <span className="block text-[11px] text-slate-500 dark:text-slate-400">
                          Andamento / Tom
                        </span>
                        <span className="font-mono tabular-nums font-medium text-slate-800 dark:text-slate-200">
                          {req.bpmAndKey || 'A combinar'}
                        </span>
                      </div>
                      <div>
                        <span className="block text-[11px] text-slate-500 dark:text-slate-400">
                          Formato
                        </span>
                        <span className="font-medium text-slate-800 dark:text-slate-200">
                          {req.collabFormat}
                        </span>
                      </div>
                    </div>

                    <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed pt-2 border-t border-slate-100 dark:border-slate-800">
                      {req.description}
                    </p>

                    <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        {!isResolved && (
                          <>
                            <button
                              type="button"
                              data-testid={`respond-request-btn-${req.id}`}
                              onClick={() => onRespondRequest(req)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white dark:text-slate-950 bg-slate-900 dark:bg-slate-100 rounded-lg hover:bg-slate-800 dark:hover:bg-white transition-colors"
                            >
                              <MessageSquare className="w-3.5 h-3.5" aria-hidden="true" />
                              Responder no Chat
                            </button>
                            <button
                              type="button"
                              onClick={() => onScheduleFromRequest(req)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-800 dark:text-slate-100 bg-slate-100 dark:bg-slate-800 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                            >
                              <Calendar className="w-3.5 h-3.5" aria-hidden="true" />
                              Propor Sessão
                            </button>
                            <button
                              type="button"
                              onClick={() => onSendGmailFromRequest(req)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/60 transition-colors"
                            >
                              <Mail className="w-3.5 h-3.5" aria-hidden="true" />
                              Gmail
                            </button>
                          </>
                        )}
                      </div>

                      {isOwner && !isResolved && (
                        <button
                          type="button"
                          data-testid={`resolve-request-btn-${req.id}`}
                          disabled={resolvingId === req.id}
                          onClick={async () => {
                            setResolvingId(req.id);
                            try {
                              await onResolveRequest(req);
                            } finally {
                              setResolvingId(null);
                            }
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 rounded-md transition-colors disabled:opacity-50"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                          {resolvingId === req.id ? 'Finalizando...' : 'Marcar como resolvido'}
                        </button>
                      )}
                    </div>
                  </motion.article>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </section>

      {/* Right: Quick Request Composer */}
      <aside className="lg:col-span-5">
        <form
          onSubmit={handleSubmit}
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-4 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Megaphone className="w-4 h-4 text-blue-700 dark:text-blue-400" aria-hidden="true" />
            <h2 className="text-lg font-display font-semibold text-slate-950 dark:text-slate-50">
              Publicar Pedido Rápido
            </h2>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400">
            Chamada visível imediatamente para músicos de outras regiões e nichos.
          </p>

          <div>
            <label
              htmlFor="quick-request-title"
              className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
            >
              Título do pedido
            </label>
            <input
              id="quick-request-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Procuro baixo fretless para ponte de synth-MPB"
              className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:border-blue-700 dark:focus:border-blue-500"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="quick-request-instrument"
                className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
              >
                Instrumento / Função
              </label>
              <input
                id="quick-request-instrument"
                type="text"
                value={instrumentNeeded}
                onChange={(e) => setInstrumentNeeded(e.target.value)}
                placeholder="Ex: Violoncelo, Beatmaker"
                className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 border border-slate-200 dark:border-slate-700 rounded-lg"
                required
              />
            </div>

            <div>
              <label
                htmlFor="quick-request-genre"
                className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
              >
                Contexto musical
              </label>
              <input
                id="quick-request-genre"
                type="text"
                value={genreContext}
                onChange={(e) => setGenreContext(e.target.value)}
                placeholder="Ex: Ambient + Choro"
                className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 border border-slate-200 dark:border-slate-700 rounded-lg"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="quick-request-bpm"
                className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
              >
                BPM e tonalidade
              </label>
              <input
                id="quick-request-bpm"
                type="text"
                value={bpmAndKey}
                onChange={(e) => setBpmAndKey(e.target.value)}
                placeholder="Ex: 108 BPM · Ré menor"
                className="w-full px-3 py-2 text-sm font-mono tabular-nums bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 border border-slate-200 dark:border-slate-700 rounded-lg"
              />
            </div>

            <div>
              <label
                htmlFor="quick-request-urgency"
                className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
              >
                Urgência
              </label>
              <select
                id="quick-request-urgency"
                value={urgency}
                onChange={(e) => setUrgency(e.target.value as RequestUrgency)}
                className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-lg"
              >
                <option value="Hoje / Urgente">Hoje / Urgente</option>
                <option value="Esta semana">Esta semana</option>
                <option value="Sem pressa">Sem pressa</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="quick-request-format"
                className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
              >
                Formato
              </label>
              <select
                id="quick-request-format"
                value={collabFormat}
                onChange={(e) => setCollabFormat(e.target.value as CollabFormat)}
                className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-lg"
              >
                <option value="Remoto">Remoto</option>
                <option value="Híbrido">Híbrido</option>
                <option value="Presencial">Presencial</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="quick-request-region"
                className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
              >
                Macrorregião
              </label>
              <select
                id="quick-request-region"
                value={macroRegion}
                onChange={(e) => setMacroRegion(e.target.value as MacroRegion)}
                className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-lg"
              >
                {MACRO_REGION_ORDER.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label
              htmlFor="quick-request-city"
              className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
            >
              Cidade / Referência local
            </label>
            <input
              id="quick-request-city"
              type="text"
              value={authorRegion}
              onChange={(e) => setAuthorRegion(e.target.value)}
              placeholder="Ex: Sudeste · Campinas, SP"
              className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-lg"
            />
          </div>

          <div>
            <label
              htmlFor="quick-request-description"
              className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
            >
              Detalhes técnicos e referência
            </label>
            <textarea
              id="quick-request-description"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Explique o que já está gravado, formato de stems (WAV 48kHz) e o tipo de liberdade criativa."
              className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 border border-slate-200 dark:border-slate-700 rounded-lg"
              required
            />
          </div>

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
            data-testid="publish-quick-request-btn"
            disabled={submitting}
            className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 text-sm font-semibold text-white bg-blue-700 dark:bg-blue-600 rounded-lg hover:bg-blue-800 dark:hover:bg-blue-500 disabled:opacity-50 transition-colors"
          >
            <Plus className="w-4 h-4" aria-hidden="true" />
            {submitting ? 'Publicando...' : 'Publicar no Mural'}
          </button>
        </form>
      </aside>
    </div>
  );
}
