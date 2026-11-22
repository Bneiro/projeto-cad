import { useMemo, useState } from 'react';
import { Calendar, MapPin, MessageSquare, Sparkles, UserPlus } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import type { MacroRegion, MusicianProfile } from '../types';
import {
  recommendComplementaryMusicians,
  type UserStyleLocationSeed,
} from '../utils/recommendations';

interface SmartSuggestionsProps {
  userProfile: MusicianProfile | null;
  musicians: MusicianProfile[];
  onStartChat: (musician: MusicianProfile) => void;
  onScheduleWith: (musician: MusicianProfile) => void;
  onOpenProfileEditor: () => void;
}

const REGION_OPTIONS: MacroRegion[] = [
  'Nordeste',
  'Sudeste',
  'Sul',
  'Norte',
  'Centro-Oeste',
  'Remoto / Global',
];

const GENRE_OPTIONS = [
  'MPB Psicodélica',
  'Jazz Fusion',
  'Eletrônica Experimental',
  'Post-Rock',
  'Choro Contemporâneo',
  'Neo-Soul',
  'Ambient',
  'Folk Brasileiro',
];

const INSTRUMENT_OPTIONS = [
  'Sintetizador',
  'Guitarra',
  'Baixo Elétrico',
  'Bateria',
  'Percussão',
  'Voz',
  'Saxofone Tenor',
  'Violão Nylon',
];

export function SmartSuggestions({
  userProfile,
  musicians,
  onStartChat,
  onScheduleWith,
  onOpenProfileEditor,
}: SmartSuggestionsProps) {
  const [guestRegion, setGuestRegion] = useState<MacroRegion>('Nordeste');
  const [guestGenre, setGuestGenre] = useState('Eletrônica Experimental');
  const [guestInstrument, setGuestInstrument] = useState('Sintetizador');

  const activeSeed: UserStyleLocationSeed = useMemo(() => {
    if (userProfile) {
      return {
        id: userProfile.id,
        ownerId: userProfile.ownerId,
        stageName: userProfile.stageName,
        region: userProfile.region,
        macroRegion: userProfile.macroRegion,
        genres: userProfile.genres,
        instruments: userProfile.instruments,
        collabFormat: userProfile.collabFormat,
        openToCrossNiche: userProfile.openToCrossNiche,
        lookingFor: userProfile.lookingFor,
      };
    }

    return {
      region: guestRegion,
      macroRegion: guestRegion,
      genres: [guestGenre],
      instruments: [guestInstrument],
      collabFormat: 'Híbrido',
      openToCrossNiche: true,
      lookingFor: '',
    };
  }, [userProfile, guestRegion, guestGenre, guestInstrument]);

  const recommendations = useMemo(
    () => recommendComplementaryMusicians(activeSeed, musicians, 3),
    [activeSeed, musicians]
  );

  if (recommendations.length === 0) {
    return null;
  }

  return (
    <section
      aria-label="Sugestões Inteligentes"
      data-testid="smart-suggestions"
      className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4 transition-colors"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-blue-700 dark:text-blue-400">
            <Sparkles className="w-4 h-4" aria-hidden="true" />
            <h2 className="text-base font-display font-semibold text-slate-950 dark:text-slate-50">
              Sugestões Inteligentes
            </h2>
          </div>
          {userProfile ? (
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Conexões complementares para{' '}
              <span className="font-semibold text-slate-900 dark:text-slate-100">
                {userProfile.stageName}
              </span>{' '}
              ({userProfile.instruments.join(', ')} · {userProfile.genres.slice(0, 2).join(', ')} ·{' '}
              {userProfile.region})
            </p>
          ) : (
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Simule sua região e estilo abaixo ou publique seu perfil para recomendações
              personalizadas contínuas.
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={onOpenProfileEditor}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900/60 rounded-lg transition-colors whitespace-nowrap shrink-0 self-start sm:self-auto"
        >
          <UserPlus className="w-3.5 h-3.5" aria-hidden="true" />
          {userProfile ? 'Atualizar meu perfil' : 'Publicar meu perfil'}
        </button>
      </div>

      {!userProfile && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
          <div>
            <label
              htmlFor="smart-pref-region"
              className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1"
            >
              Sua macrorregião
            </label>
            <select
              id="smart-pref-region"
              value={guestRegion}
              onChange={(e) => setGuestRegion(e.target.value as MacroRegion)}
              className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100 focus:outline-none focus:border-blue-700 dark:focus:border-blue-500"
            >
              {REGION_OPTIONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="smart-pref-genre"
              className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1"
            >
              Seu estilo musical
            </label>
            <select
              id="smart-pref-genre"
              value={guestGenre}
              onChange={(e) => setGuestGenre(e.target.value)}
              className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100 focus:outline-none focus:border-blue-700 dark:focus:border-blue-500"
            >
              {GENRE_OPTIONS.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="smart-pref-instrument"
              className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1"
            >
              Seu instrumento principal
            </label>
            <select
              id="smart-pref-instrument"
              value={guestInstrument}
              onChange={(e) => setGuestInstrument(e.target.value)}
              className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100 focus:outline-none focus:border-blue-700 dark:focus:border-blue-500"
            >
              {INSTRUMENT_OPTIONS.map((inst) => (
                <option key={inst} value={inst}>
                  {inst}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <AnimatePresence mode="popLayout" initial={false}>
          {recommendations.map((rec) => (
            <motion.article
              key={rec.musician.id}
              layout="position"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              data-testid={`smart-suggestion-${rec.musician.id}`}
              className="bg-slate-50 dark:bg-slate-800/70 rounded-lg p-4 flex flex-col justify-between gap-3 transition-colors"
            >
              <div className="space-y-2">
                <div className="flex items-baseline justify-between gap-2">
                  <h3 className="text-sm font-display font-semibold text-slate-950 dark:text-slate-50 truncate">
                    {rec.musician.stageName}
                  </h3>
                  <span className="text-xs font-mono tabular-nums font-semibold text-blue-700 dark:text-blue-400 shrink-0">
                    {rec.score}% afinidade
                  </span>
                </div>

                <p className="text-xs text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                  <MapPin className="w-3 h-3 shrink-0 text-slate-400 dark:text-slate-500" aria-hidden="true" />
                  <span className="truncate">{rec.locationHighlight}</span>
                </p>

                <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                  {rec.styleHighlight}
                </p>

                <p className="text-[11px] text-slate-600 dark:text-slate-400">
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    Soma com:
                  </span>{' '}
                  {rec.complementaryInstruments.join(' · ')}
                </p>
              </div>

              <div className="pt-2 border-t border-slate-200/70 dark:border-slate-700/70 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onStartChat(rec.musician)}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-white dark:text-slate-950 bg-slate-900 dark:bg-slate-100 rounded-md hover:bg-slate-800 dark:hover:bg-white transition-colors whitespace-nowrap"
                >
                  <MessageSquare className="w-3 h-3" aria-hidden="true" />
                  Chat
                </button>
                <button
                  type="button"
                  onClick={() => onScheduleWith(rec.musician)}
                  className="inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-900 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors whitespace-nowrap"
                >
                  <Calendar className="w-3 h-3" aria-hidden="true" />
                  Agendar
                </button>
              </div>
            </motion.article>
          ))}
        </AnimatePresence>
      </div>
    </section>
  );
}
