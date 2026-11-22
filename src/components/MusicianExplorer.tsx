import { useMemo, useState } from 'react';
import {
  ArrowRight,
  Calendar,
  Mail,
  Megaphone,
  MessageSquare,
  Music2,
  Search,
  UserPlus,
  X,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { HERO_STUDIO_IMAGE } from '../data/seedMusicians';
import type { FilterState, MusicianProfile, QuickRequest } from '../types';
import { DEFAULT_FILTERS, extractFilterOptions, filterMusicians } from '../utils/filters';
import {
  DEFAULT_QUICK_REQUEST_FILTERS,
  filterAndSortQuickRequests,
} from '../utils/quickRequests';
import { SmartSuggestions } from './SmartSuggestions';

interface MusicianExplorerProps {
  musicians: MusicianProfile[];
  quickRequests: QuickRequest[];
  userProfile: MusicianProfile | null;
  sessionCount: number;
  onStartChat: (musician: MusicianProfile) => void;
  onScheduleWith: (musician: MusicianProfile) => void;
  onSendGmailTo: (musician: MusicianProfile) => void;
  onOpenProfileEditor: () => void;
  onOpenCurator: () => void;
  onOpenMural: () => void;
  onRespondQuickRequest: (request: QuickRequest) => void;
}

const FORMAT_TABS = ['Todos', 'Remoto', 'Presencial', 'Híbrido'] as const;

export function MusicianExplorer({
  musicians,
  quickRequests,
  userProfile,
  sessionCount,
  onStartChat,
  onScheduleWith,
  onSendGmailTo,
  onOpenProfileEditor,
  onOpenCurator,
  onOpenMural,
  onRespondQuickRequest,
}: MusicianExplorerProps) {
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [heroImgFailed, setHeroImgFailed] = useState(false);
  const [failedAvatars, setFailedAvatars] = useState<Record<string, boolean>>({});

  const options = useMemo(() => extractFilterOptions(musicians), [musicians]);
  const filteredMusicians = useMemo(() => filterMusicians(musicians, filters), [musicians, filters]);
  const topActiveRequests = useMemo(
    () => filterAndSortQuickRequests(quickRequests, DEFAULT_QUICK_REQUEST_FILTERS).slice(0, 3),
    [quickRequests]
  );

  const hasActiveFilter =
    filters.search !== '' ||
    filters.macroRegion !== 'Todas' ||
    filters.genre !== 'Todos' ||
    filters.instrument !== 'Todos' ||
    filters.collabFormat !== 'Todos' ||
    filters.experienceLevel !== 'Todos' ||
    filters.onlyCrossNiche;

  const resetFilters = () => setFilters(DEFAULT_FILTERS);

  return (
    <div className="space-y-6">
      {/* Editorial Hero Split (2-column items-stretch) */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        <div className="lg:col-span-6 flex flex-col justify-between bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 transition-colors">
          <div className="space-y-3">
            <p className="text-xs font-medium text-blue-700 dark:text-blue-400 tracking-wide">
              Rede independente de colaboração musical
            </p>
            <h1 className="text-3xl sm:text-4xl font-display font-bold tracking-tight text-slate-950 dark:text-slate-50 leading-tight [text-wrap:balance]">
              Conecte músicos além do seu circuito habitual
            </h1>
            <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 leading-relaxed max-w-xl">
              Encontre instrumentistas, produtores e vocalistas por região, gênero, instrumento e
              formato de trabalho. Converse ao vivo, agende sessões no Google Meet e envie convites
              diretamente pelo Gmail.
            </p>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={onOpenProfileEditor}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-blue-700 dark:bg-blue-600 rounded-lg hover:bg-blue-800 dark:hover:bg-blue-500 transition-colors whitespace-nowrap shrink-0"
            >
              <UserPlus className="w-4 h-4" aria-hidden="true" />
              Publicar meu perfil
            </button>
            <button
              type="button"
              onClick={onOpenCurator}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-slate-800 dark:text-slate-100 bg-slate-100 dark:bg-slate-800 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors whitespace-nowrap shrink-0"
            >
              Explorar curadoria inteligente
            </button>
          </div>
        </div>

        <div className="lg:col-span-6 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-900 min-h-56 max-h-72">
          {!heroImgFailed ? (
            <img
              src={HERO_STUDIO_IMAGE}
              alt="Dois músicos independentes colaborando em estúdio acústico com violão e sintetizador analógico"
              referrerPolicy="no-referrer"
              onError={() => setHeroImgFailed(true)}
              className="w-full h-full lg:h-full object-cover"
            />
          ) : (
            <div className="w-full h-full min-h-56 flex flex-col items-center justify-center p-8 bg-gradient-to-br from-slate-800 to-slate-950 text-slate-200">
              <Music2 className="w-10 h-10 text-blue-400 mb-3" aria-hidden="true" />
              <p className="text-sm font-medium">Estúdio Aberto Elo Sonoro</p>
            </div>
          )}
        </div>
      </section>

      {/* 4-column studio summary strip below hero */}
      <section aria-label="Resumo da rede" className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-5 py-3.5 transition-colors">
          <p className="text-xs text-slate-500 dark:text-slate-400">Artistas ativos</p>
          <p className="mt-0.5 text-2xl font-display font-bold text-slate-950 dark:text-slate-50 font-mono tabular-nums">
            {musicians.filter((m) => m.isPublished).length}
          </p>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-5 py-3.5 transition-colors">
          <p className="text-xs text-slate-500 dark:text-slate-400">Regiões integradas</p>
          <p className="mt-0.5 text-2xl font-display font-bold text-slate-950 dark:text-slate-50 font-mono tabular-nums">
            {options.regions.length}
          </p>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-5 py-3.5 transition-colors">
          <p className="text-xs text-slate-500 dark:text-slate-400">Instrumentos mapeados</p>
          <p className="mt-0.5 text-2xl font-display font-bold text-slate-950 dark:text-slate-50 font-mono tabular-nums">
            {options.instruments.length}
          </p>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-5 py-3.5 transition-colors">
          <p className="text-xs text-slate-500 dark:text-slate-400">Sessões agendadas</p>
          <p className="mt-0.5 text-2xl font-display font-bold text-slate-950 dark:text-slate-50 font-mono tabular-nums">
            {sessionCount}
          </p>
        </div>
      </section>

      {/* Smart Suggestions based on user profile (style & location) */}
      <SmartSuggestions
        userProfile={userProfile}
        musicians={musicians}
        onStartChat={onStartChat}
        onScheduleWith={onScheduleWith}
        onOpenProfileEditor={onOpenProfileEditor}
      />

      {/* Community Quick Requests Preview Strip */}
      {topActiveRequests.length > 0 && (
        <section
          aria-label="Mural de pedidos rápidos da comunidade"
          data-testid="explorer-mural-preview"
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4 transition-colors"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <Megaphone className="w-4 h-4 text-blue-700 dark:text-blue-400 shrink-0" aria-hidden="true" />
              <div>
                <h2 className="text-base font-display font-semibold text-slate-950 dark:text-slate-50">
                  Mural de Pedidos Rápidos da Comunidade
                </h2>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  Músicos procurando colaboradores imediatos para gravações, stems e arranjos.
                </p>
              </div>
            </div>
            <button
              type="button"
              data-testid="explorer-open-mural-btn"
              onClick={onOpenMural}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/60 transition-colors whitespace-nowrap shrink-0"
            >
              Ver mural completo
              <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
            {topActiveRequests.map((req) => (
              <div
                key={req.id}
                className="bg-slate-50 dark:bg-slate-800/60 rounded-lg p-4 flex flex-col justify-between gap-3"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2 text-[11px]">
                    <span
                      className={`font-semibold ${
                        req.urgency === 'Hoje / Urgente'
                          ? 'text-amber-700 dark:text-amber-400'
                          : 'text-blue-700 dark:text-blue-400'
                      }`}
                    >
                      {req.urgency}
                    </span>
                    <span className="font-mono tabular-nums text-slate-500 dark:text-slate-400">
                      {req.bpmAndKey || req.collabFormat}
                    </span>
                  </div>
                  <h3 className="text-sm font-display font-semibold text-slate-950 dark:text-slate-50 line-clamp-2">
                    {req.title}
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400 truncate">
                    {req.authorStageName} · Busca: {req.instrumentNeeded}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => onRespondQuickRequest(req)}
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-900 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                >
                  <MessageSquare className="w-3.5 h-3.5" aria-hidden="true" />
                  Responder no Chat
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Filter Bar */}
      <section
        aria-label="Filtros de músicos"
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4 transition-colors"
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-display font-semibold text-slate-950 dark:text-slate-50">
              Diretório de Artistas Independentes
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-0.5">
              Exibindo{' '}
              <span className="font-mono tabular-nums font-medium text-slate-900 dark:text-slate-100">
                {filteredMusicians.length}
              </span>{' '}
              de{' '}
              <span className="font-mono tabular-nums font-medium text-slate-900 dark:text-slate-100">
                {musicians.filter((m) => m.isPublished).length}
              </span>{' '}
              músicos disponíveis
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Segmented control for Collaboration Format */}
            <div className="inline-flex items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
              {FORMAT_TABS.map((fmt) => {
                const active = filters.collabFormat === fmt;
                return (
                  <button
                    key={fmt}
                    type="button"
                    onClick={() => setFilters((prev) => ({ ...prev, collabFormat: fmt }))}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                      active
                        ? 'bg-white dark:bg-slate-950 text-slate-950 dark:text-slate-50 shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-950 dark:hover:text-slate-100'
                    }`}
                  >
                    {fmt}
                  </button>
                );
              })}
            </div>

            {hasActiveFilter && (
              <button
                type="button"
                onClick={resetFilters}
                className="px-3 py-2 text-xs font-medium text-blue-700 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-950/50 rounded-lg transition-colors whitespace-nowrap shrink-0"
              >
                Limpar filtros
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="lg:col-span-2 relative">
            <label htmlFor="musician-search" className="sr-only">
              Buscar músico por nome, instrumento ou região
            </label>
            <Search
              className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
              aria-hidden="true"
            />
            <input
              id="musician-search"
              type="text"
              role="searchbox"
              value={filters.search}
              onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
              placeholder="Buscar por nome, instrumento ou região..."
              className="w-full pl-9 pr-9 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:bg-white dark:focus:bg-slate-900 focus:border-blue-700 dark:focus:border-blue-500 transition-colors"
            />
            {filters.search.length > 0 && (
              <button
                type="button"
                aria-label="Limpar busca"
                onClick={() => setFilters((prev) => ({ ...prev, search: '' }))}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded transition-colors"
              >
                <X className="w-3.5 h-3.5" aria-hidden="true" />
              </button>
            )}
          </div>

          <div>
            <label htmlFor="filter-region" className="sr-only">
              Filtrar por região
            </label>
            <select
              id="filter-region"
              value={filters.macroRegion}
              onChange={(e) => setFilters((prev) => ({ ...prev, macroRegion: e.target.value }))}
              className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100 focus:outline-none focus:border-blue-700 dark:focus:border-blue-500"
            >
              <option value="Todas">Região: Todas</option>
              {options.regions.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="filter-genre" className="sr-only">
              Filtrar por gênero musical
            </label>
            <select
              id="filter-genre"
              value={filters.genre}
              onChange={(e) => setFilters((prev) => ({ ...prev, genre: e.target.value }))}
              className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100 focus:outline-none focus:border-blue-700 dark:focus:border-blue-500"
            >
              <option value="Todos">Gênero: Todos</option>
              {options.genres.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="filter-instrument" className="sr-only">
              Filtrar por instrumento
            </label>
            <select
              id="filter-instrument"
              value={filters.instrument}
              onChange={(e) => setFilters((prev) => ({ ...prev, instrument: e.target.value }))}
              className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100 focus:outline-none focus:border-blue-700 dark:focus:border-blue-500"
            >
              <option value="Todos">Instrumento: Todos</option>
              {options.instruments.map((inst) => (
                <option key={inst} value={inst}>
                  {inst}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <label htmlFor="filter-exp" className="text-xs font-medium text-slate-600 dark:text-slate-400">
              Experiência:
            </label>
            <select
              id="filter-exp"
              value={filters.experienceLevel}
              onChange={(e) => setFilters((prev) => ({ ...prev, experienceLevel: e.target.value }))}
              className="px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-slate-800 dark:text-slate-100"
            >
              <option value="Todos">Todos os níveis</option>
              <option value="Emergente">Emergente</option>
              <option value="Intermediário">Intermediário</option>
              <option value="Profissional">Profissional</option>
              <option value="Produtor / Diretor">Produtor / Diretor</option>
            </select>
          </div>

          <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer">
            <input
              type="checkbox"
              checked={filters.onlyCrossNiche}
              onChange={(e) => setFilters((prev) => ({ ...prev, onlyCrossNiche: e.target.checked }))}
              className="rounded border-slate-300 dark:border-slate-600 text-blue-700 focus:ring-blue-700"
            />
            <span>Somente abertos a fusões fora do nicho</span>
          </label>
        </div>
      </section>

      {/* Musician Cards Grid with Framer Motion fade & displacement transitions */}
      <AnimatePresence mode="wait" initial={false}>
        {filteredMusicians.length === 0 ? (
          <motion.div
            key="empty-musicians"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-12 text-center space-y-3"
          >
            <p className="text-base font-display font-semibold text-slate-900 dark:text-slate-100">
              Nenhum músico encontrado com esses critérios
            </p>
            <p className="text-sm text-slate-600 dark:text-slate-400 max-w-md mx-auto">
              Experimente ampliar a região ou limpar um dos filtros de instrumento para descobrir
              artistas disponíveis.
            </p>
            <button
              type="button"
              onClick={resetFilters}
              className="mt-2 px-4 py-2 text-sm font-semibold text-white bg-blue-700 dark:bg-blue-600 rounded-lg hover:bg-blue-800 dark:hover:bg-blue-500 transition-colors"
            >
              Mostrar todos os músicos
            </button>
          </motion.div>
        ) : (
          <motion.section
            key="musician-grid"
            aria-label="Lista de músicos"
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            <AnimatePresence mode="popLayout" initial={false}>
              {filteredMusicians.map((musician) => {
                const initials = musician.stageName
                  .split(' ')
                  .slice(0, 2)
                  .map((w) => w[0]?.toUpperCase() || '')
                  .join('');
                const showImage = Boolean(musician.avatarUrl) && !failedAvatars[musician.id];

                return (
                  <motion.article
                    key={musician.id}
                    layout="position"
                    initial={{ opacity: 0, y: 16, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -12, scale: 0.97 }}
                    transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
                    data-testid={`musician-card-${musician.id}`}
                    className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 flex flex-col justify-between gap-5 transition-colors"
                  >
                    <div className="space-y-4">
                      {/* Header with portrait and unboxed metadata */}
                      <div className="flex items-start gap-4">
                        <div className="w-16 h-16 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 shrink-0 flex items-center justify-center">
                          {showImage ? (
                            <img
                              src={musician.avatarUrl}
                              alt={`Retrato de ${musician.stageName}`}
                              referrerPolicy="no-referrer"
                              onError={() =>
                                setFailedAvatars((prev) => ({ ...prev, [musician.id]: true }))
                              }
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span className="text-base font-display font-bold text-slate-700 dark:text-slate-200">
                              {initials}
                            </span>
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <h3 className="text-lg font-display font-semibold text-slate-950 dark:text-slate-50 truncate">
                            {musician.stageName}
                          </h3>
                          <p className="text-xs text-slate-600 dark:text-slate-400 truncate">
                            {musician.name} · {musician.region}
                          </p>
                          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                            {musician.collabFormat} · {musician.experienceLevel}
                          </p>
                        </div>
                      </div>

                      {/* Clean unboxed genre and instrument lists */}
                      <div className="space-y-1.5 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
                        <p className="text-slate-700 dark:text-slate-300">
                          <span className="font-semibold text-slate-900 dark:text-slate-100">
                            Instrumentos:
                          </span>{' '}
                          {musician.instruments.join(' · ')}
                        </p>
                        <p className="text-slate-700 dark:text-slate-300">
                          <span className="font-semibold text-slate-900 dark:text-slate-100">
                            Gêneros:
                          </span>{' '}
                          {musician.genres.join(' · ')}
                        </p>
                      </div>

                      <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                        {musician.bio}
                      </p>

                      <div className="space-y-1 text-xs text-slate-600 dark:text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800">
                        <p>
                          <span className="font-medium text-slate-800 dark:text-slate-200">
                            Busca agora:
                          </span>{' '}
                          {musician.lookingFor}
                        </p>
                        <p>
                          <span className="font-medium text-slate-800 dark:text-slate-200">
                            Setup:
                          </span>{' '}
                          {musician.dawSetup}
                        </p>
                        <p>
                          <span className="font-medium text-slate-800 dark:text-slate-200">
                            Agenda:
                          </span>{' '}
                          {musician.availability}
                        </p>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => onStartChat(musician)}
                        aria-label={`Abrir chat com ${musician.stageName}`}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-white dark:text-slate-950 bg-slate-900 dark:bg-slate-100 rounded-lg hover:bg-slate-800 dark:hover:bg-white transition-colors whitespace-nowrap"
                      >
                        <MessageSquare className="w-3.5 h-3.5" aria-hidden="true" />
                        Abrir Chat
                      </button>
                      <button
                        type="button"
                        onClick={() => onScheduleWith(musician)}
                        aria-label={`Agendar sessão com ${musician.stageName}`}
                        className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-800 dark:text-slate-100 bg-slate-100 dark:bg-slate-800 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors whitespace-nowrap"
                      >
                        <Calendar className="w-3.5 h-3.5" aria-hidden="true" />
                        Agendar
                      </button>
                      <button
                        type="button"
                        onClick={() => onSendGmailTo(musician)}
                        aria-label={`Enviar mensagem para ${musician.stageName} no Gmail`}
                        className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/60 transition-colors whitespace-nowrap"
                      >
                        <Mail className="w-3.5 h-3.5" aria-hidden="true" />
                        Gmail
                      </button>
                    </div>
                  </motion.article>
                );
              })}
            </AnimatePresence>
          </motion.section>
        )}
      </AnimatePresence>
    </div>
  );
}
