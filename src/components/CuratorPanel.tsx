import { useMemo, useState } from 'react';
import { ArrowRight, Calendar, Compass, Loader2, MessageSquare } from 'lucide-react';
import {
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from 'recharts';
import type { CuratedMatchResponse, MusicianProfile } from '../types';
import { buildNetworkScatterData, type NetworkScatterPoint } from '../utils/filters';
import type { ThemeMode } from '../utils/theme';

interface CuratorPanelProps {
  musicians: MusicianProfile[];
  theme: ThemeMode;
  onStartChat: (musician: MusicianProfile) => void;
  onScheduleWith: (musician: MusicianProfile) => void;
}

const EXAMPLE_PROMPTS = [
  'Sou produtor de música eletrônica em São Paulo e quero cruzar sintetizadores analógicos com percussão regional nordestina ou choro contemporâneo.',
  'Toco guitarra shoegaze no Sul e quero sair da cena rock colaborando com sopros brasileiros e baixo neo-soul em formato remoto.',
  'Sou baterista acústico procurando beatmakers e vocalistas experimentais para gravar stems orgânicos fora do circuito comercial.',
];

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ payload: NetworkScatterPoint }>;
}

function NetworkScatterTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  const pt = payload[0].payload;
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-3 shadow-sm max-w-xs space-y-1 text-xs">
      <p className="font-display font-semibold text-slate-950 dark:text-slate-50">{pt.stageName}</p>
      <p className="text-slate-600 dark:text-slate-400">
        {pt.region} · {pt.collabFormat}
      </p>
      <p className="text-slate-800 dark:text-slate-200">
        <span className="font-medium">Gêneros:</span> {pt.genres.join(' · ')}
      </p>
      <p className="text-slate-800 dark:text-slate-200">
        <span className="font-medium">Instrumentos:</span> {pt.instruments.join(' · ')}
      </p>
    </div>
  );
}

export function CuratorPanel({
  musicians,
  theme,
  onStartChat,
  onScheduleWith,
}: CuratorPanelProps) {
  const [instrument, setInstrument] = useState('Guitarra & Pedais');
  const [genre, setGenre] = useState('Indie / Post-Rock');
  const [region, setRegion] = useState('Sul · Porto Alegre');
  const [goal, setGoal] = useState(EXAMPLE_PROMPTS[0]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CuratedMatchResponse | null>(null);

  const isDark = theme === 'dark';
  const chartColors = isDark
    ? {
        grid: '#334155',
        tick: '#cbd5e1',
        axis: '#475569',
        cursor: '#64748b',
        remote: '#60a5fa',
        hybrid: '#2dd4bf',
        inPerson: '#fbbf24',
      }
    : {
        grid: '#e2e8f0',
        tick: '#475569',
        axis: '#cbd5e1',
        cursor: '#94a3b8',
        remote: '#1d4ed8',
        hybrid: '#0f766e',
        inPerson: '#b45309',
      };

  const scatter = useMemo(() => buildNetworkScatterData(musicians), [musicians]);
  const remotePoints = useMemo(
    () => scatter.points.filter((p) => p.collabFormat === 'Remoto'),
    [scatter.points]
  );
  const hybridPoints = useMemo(
    () => scatter.points.filter((p) => p.collabFormat === 'Híbrido'),
    [scatter.points]
  );
  const inPersonPoints = useMemo(
    () => scatter.points.filter((p) => p.collabFormat === 'Presencial'),
    [scatter.points]
  );

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch('/api/match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instrument,
          genre,
          region,
          goal,
          musicians: musicians.map((m) => ({
            musicianId: m.id,
            stageName: m.stageName,
            region: m.region,
            genres: m.genres,
            instruments: m.instruments,
            collabFormat: m.collabFormat,
            dawSetup: m.dawSetup,
            lookingFor: m.lookingFor,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Falha ao consultar o serviço de curadoria.');
      }
      setResult(data as CuratedMatchResponse);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro inesperado na análise.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      {/* Input column */}
      <form
        onSubmit={handleAnalyze}
        className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-5 transition-colors"
      >
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-blue-700 dark:text-blue-400">
            <Compass className="w-4 h-4" aria-hidden="true" />
            <span className="text-xs font-semibold">Curadoria Cross-Niche</span>
          </div>
          <h1 className="text-2xl font-display font-bold text-slate-950 dark:text-slate-50">
            Desacople seu som do nicho habitual
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
            Descreva seu momento criativo e receba recomendações fundamentadas de artistas da rede,
            tonalidade de partida e roteiro para a primeira sessão.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label
              htmlFor="cur-inst"
              className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
            >
              Seu instrumento principal
            </label>
            <input
              id="cur-inst"
              type="text"
              value={instrument}
              onChange={(e) => setInstrument(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:border-blue-700 dark:focus:border-blue-500"
              required
            />
          </div>
          <div>
            <label
              htmlFor="cur-genre"
              className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
            >
              Seu nicho / gênero atual
            </label>
            <input
              id="cur-genre"
              type="text"
              value={genre}
              onChange={(e) => setGenre(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:border-blue-700 dark:focus:border-blue-500"
              required
            />
          </div>
        </div>

        <div>
          <label
            htmlFor="cur-region"
            className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
          >
            Sua região
          </label>
          <input
            id="cur-region"
            type="text"
            value={region}
            onChange={(e) => setRegion(e.target.value)}
            className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:border-blue-700 dark:focus:border-blue-500"
            required
          />
        </div>

        <div>
          <label
            htmlFor="cur-goal"
            className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
          >
            O que você quer construir fora da sua bolha?
          </label>
          <textarea
            id="cur-goal"
            rows={4}
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:border-blue-700 dark:focus:border-blue-500"
            required
          />
        </div>

        <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Cenários rápidos:</p>
          <div className="divide-y divide-slate-100 dark:divide-slate-800 border-y border-slate-100 dark:border-slate-800">
            {EXAMPLE_PROMPTS.map((preset, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setGoal(preset)}
                className="w-full text-left text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/70 hover:text-slate-950 dark:hover:text-slate-50 py-2.5 px-1 transition-colors"
              >
                {preset}
              </button>
            ))}
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 text-sm font-semibold text-white bg-blue-700 dark:bg-blue-600 rounded-lg hover:bg-blue-800 dark:hover:bg-blue-500 disabled:opacity-60 transition-colors"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
              Analisando conexões musicais...
            </>
          ) : (
            <>
              Analisar conexões e gerar roteiro
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </>
          )}
        </button>
      </form>

      {/* Output column */}
      <section className="lg:col-span-7 space-y-6">
        {/* Scatter Plot: Geographic & Musical Genre Distribution */}
        <section
          aria-label="Distribuição geográfica e de gêneros musicais na rede"
          data-testid="network-scatter-chart"
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-4 transition-colors"
        >
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <div>
              <h2 className="text-lg font-display font-semibold text-slate-950 dark:text-slate-50">
                Dispersão Geográfica e Gêneros da Rede
              </h2>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                Passe o cursor sobre os pontos para ver instrumentos, região e formato de cada
                artista cadastrado.
              </p>
            </div>
            <span className="text-xs font-mono tabular-nums text-slate-600 dark:text-slate-400">
              {scatter.points.length} músicos mapeados
            </span>
          </div>

          {scatter.points.length === 0 ? (
            <div className="py-10 text-center text-sm text-slate-500 dark:text-slate-400">
              Nenhum músico publicado para exibir no gráfico.
            </div>
          ) : (
            <div className="w-full h-72">
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ top: 12, right: 20, bottom: 20, left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
                  <XAxis
                    type="number"
                    dataKey="x"
                    name="Região"
                    domain={[-0.6, scatter.regionLabels.length - 0.4]}
                    ticks={scatter.regionLabels.map((_, idx) => idx)}
                    tickFormatter={(val: number) => {
                      const label = scatter.regionLabels[Math.round(val)] || '';
                      return label === 'Remoto / Global' ? 'Remoto' : label;
                    }}
                    tick={{ fontSize: 11, fill: chartColors.tick }}
                    stroke={chartColors.axis}
                  />
                  <YAxis
                    type="number"
                    dataKey="y"
                    name="Gênero"
                    width={136}
                    domain={[-0.6, Math.max(0.6, scatter.genreLabels.length - 0.4)]}
                    ticks={scatter.genreLabels.map((_, idx) => idx)}
                    tickFormatter={(val: number) => scatter.genreLabels[Math.round(val)] || ''}
                    tick={{ fontSize: 11, fill: chartColors.tick }}
                    stroke={chartColors.axis}
                  />
                  <ZAxis type="number" dataKey="z" range={[110, 260]} name="Instrumentos" />
                  <Tooltip
                    cursor={{ strokeDasharray: '3 3', stroke: chartColors.cursor }}
                    content={<NetworkScatterTooltip />}
                  />
                  <Legend
                    wrapperStyle={{
                      fontSize: '12px',
                      paddingTop: '8px',
                      color: chartColors.tick,
                    }}
                  />
                  {remotePoints.length > 0 && (
                    <Scatter
                      name="Remoto"
                      data={remotePoints}
                      fill={chartColors.remote}
                      fillOpacity={0.88}
                    />
                  )}
                  {hybridPoints.length > 0 && (
                    <Scatter
                      name="Híbrido"
                      data={hybridPoints}
                      fill={chartColors.hybrid}
                      fillOpacity={0.88}
                    />
                  )}
                  {inPersonPoints.length > 0 && (
                    <Scatter
                      name="Presencial"
                      data={inPersonPoints}
                      fill={chartColors.inPerson}
                      fillOpacity={0.88}
                    />
                  )}
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          )}
        </section>

        {error && (
          <div
            role="alert"
            className="bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 rounded-xl p-6 space-y-2"
          >
            <h2 className="text-sm font-semibold text-amber-950 dark:text-amber-200">
              Não foi possível executar a curadoria inteligente agora
            </h2>
            <p className="text-sm text-amber-900 dark:text-amber-300 leading-relaxed">{error}</p>
          </div>
        )}

        {loading && (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-8 space-y-4">
            <div className="h-5 w-48 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
            <div className="h-4 w-full bg-slate-100 dark:bg-slate-800 rounded animate-pulse" />
            <div className="h-4 w-5/6 bg-slate-100 dark:bg-slate-800 rounded animate-pulse" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div className="h-32 bg-slate-100 dark:bg-slate-800 rounded-lg animate-pulse" />
              <div className="h-32 bg-slate-100 dark:bg-slate-800 rounded-lg animate-pulse" />
            </div>
          </div>
        )}

        {!loading && !result && !error && (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-8 space-y-3 transition-colors">
            <h2 className="text-lg font-display font-semibold text-slate-950 dark:text-slate-50">
              Como funciona a ponte entre nichos
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              A curadoria avalia instrumentação complementar, disponibilidade de gravação remota ou
              híbrida e afinidades harmônicas para sugerir encontros improváveis entre cenas locais
              do Brasil.
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 pt-1">
              Preencha seu perfil ao lado e clique em &ldquo;Analisar conexões e gerar roteiro&rdquo;
              para receber recomendações acionáveis.
            </p>
          </div>
        )}

        {!loading && result && (
          <div className="space-y-6">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-lg font-display font-semibold text-slate-950 dark:text-slate-50">
                  Estratégia de Fusão Recomendada
                </h2>
                <span className="text-xs font-mono tabular-nums font-medium text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 px-3 py-1 rounded-md">
                  {result.suggestedBpmAndKey}
                </span>
              </div>
              <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                {result.summary}
              </p>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
                <h3 className="text-xs font-semibold text-slate-900 dark:text-slate-100 mb-2">
                  Checklist para a primeira sessão:
                </h3>
                <ol className="list-decimal list-inside space-y-1.5 text-sm text-slate-700 dark:text-slate-300">
                  {result.rehearsalChecklist.map((step, i) => (
                    <li key={i}>{step}</li>
                  ))}
                </ol>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-base font-display font-semibold text-slate-950 dark:text-slate-50">
                Artistas recomendados na rede
              </h3>
              {result.matches.map((match) => {
                const fullMusician = musicians.find(
                  (m) => m.id === match.musicianId || m.stageName === match.stageName
                );
                return (
                  <article
                    key={match.musicianId + match.stageName}
                    className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-3"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <h4 className="text-base font-display font-semibold text-slate-950 dark:text-slate-50">
                          {match.stageName}
                        </h4>
                        {fullMusician && (
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            {fullMusician.region} · {fullMusician.instruments.join(', ')}
                          </p>
                        )}
                      </div>
                      <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
                        {match.suggestedSessionFormat}
                      </span>
                    </div>

                    <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                      <span className="font-semibold text-slate-900 dark:text-slate-100">
                        Por que funciona:
                      </span>{' '}
                      {match.musicalRationale}
                    </p>
                    <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                      <span className="font-semibold text-slate-900 dark:text-slate-100">
                        Ponte estética:
                      </span>{' '}
                      {match.crossNicheBridge}
                    </p>

                    {fullMusician && (
                      <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => onStartChat(fullMusician)}
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white dark:text-slate-950 bg-slate-900 dark:bg-slate-100 rounded-lg hover:bg-slate-800 dark:hover:bg-white"
                        >
                          <MessageSquare className="w-3.5 h-3.5" aria-hidden="true" />
                          Abrir Chat com {fullMusician.stageName}
                        </button>
                        <button
                          type="button"
                          onClick={() => onScheduleWith(fullMusician)}
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-800 dark:text-slate-100 bg-slate-100 dark:bg-slate-800 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700"
                        >
                          <Calendar className="w-3.5 h-3.5" aria-hidden="true" />
                          Agendar Sessão
                        </button>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
