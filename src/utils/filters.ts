import type { FilterState, MusicianProfile } from '../types';

export const DEFAULT_FILTERS: FilterState = {
  search: '',
  macroRegion: 'Todas',
  genre: 'Todos',
  instrument: 'Todos',
  collabFormat: 'Todos',
  experienceLevel: 'Todos',
  onlyCrossNiche: false,
};

export function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

export function filterMusicians(musicians: MusicianProfile[], filters: FilterState): MusicianProfile[] {
  const q = normalizeText(filters.search);

  return musicians.filter((m) => {
    if (!m.isPublished) return false;

    if (filters.macroRegion !== 'Todas' && m.macroRegion !== filters.macroRegion) {
      return false;
    }
    if (filters.collabFormat !== 'Todos' && m.collabFormat !== filters.collabFormat) {
      return false;
    }
    if (filters.experienceLevel !== 'Todos' && m.experienceLevel !== filters.experienceLevel) {
      return false;
    }
    if (filters.onlyCrossNiche && !m.openToCrossNiche) {
      return false;
    }
    if (
      filters.genre !== 'Todos' &&
      !m.genres.some((g) => normalizeText(g) === normalizeText(filters.genre))
    ) {
      return false;
    }
    if (
      filters.instrument !== 'Todos' &&
      !m.instruments.some((inst) => normalizeText(inst) === normalizeText(filters.instrument))
    ) {
      return false;
    }

    if (q.length > 0) {
      const haystack = normalizeText(
        [
          m.name,
          m.stageName,
          m.region,
          m.macroRegion,
          m.bio,
          m.lookingFor,
          m.dawSetup,
          ...m.genres,
          ...m.instruments,
        ].join(' ')
      );
      if (!haystack.includes(q)) {
        return false;
      }
    }

    return true;
  });
}

export function extractFilterOptions(musicians: MusicianProfile[]): {
  regions: string[];
  genres: string[];
  instruments: string[];
} {
  const regionSet = new Set<string>();
  const genreSet = new Set<string>();
  const instrumentSet = new Set<string>();

  for (const m of musicians) {
    if (!m.isPublished) continue;
    regionSet.add(m.macroRegion);
    m.genres.forEach((g) => genreSet.add(g));
    m.instruments.forEach((i) => instrumentSet.add(i));
  }

  return {
    regions: Array.from(regionSet).sort((a, b) => a.localeCompare(b, 'pt-BR')),
    genres: Array.from(genreSet).sort((a, b) => a.localeCompare(b, 'pt-BR')),
    instruments: Array.from(instrumentSet).sort((a, b) => a.localeCompare(b, 'pt-BR')),
  };
}

export const MACRO_REGION_ORDER = [
  'Norte',
  'Nordeste',
  'Centro-Oeste',
  'Sudeste',
  'Sul',
  'Remoto / Global',
] as const;

export interface NetworkScatterPoint {
  id: string;
  stageName: string;
  name: string;
  region: string;
  macroRegion: string;
  primaryGenre: string;
  genres: string[];
  instruments: string[];
  collabFormat: MusicianProfile['collabFormat'];
  x: number;
  y: number;
  z: number;
}

export function buildNetworkScatterData(musicians: MusicianProfile[]): {
  points: NetworkScatterPoint[];
  genreLabels: string[];
  regionLabels: readonly string[];
} {
  const published = musicians.filter((m) => m.isPublished);
  const primaryGenres = Array.from(
    new Set(published.map((m) => m.genres[0] || 'Outro'))
  ).sort((a, b) => a.localeCompare(b, 'pt-BR'));

  const slotCounts = new Map<string, number>();

  const points: NetworkScatterPoint[] = published.map((m) => {
    const baseRegionIdx = MACRO_REGION_ORDER.indexOf(
      m.macroRegion as (typeof MACRO_REGION_ORDER)[number]
    );
    const regionIdx = baseRegionIdx >= 0 ? baseRegionIdx : MACRO_REGION_ORDER.length - 1;
    const primaryGenre = m.genres[0] || 'Outro';
    const genreIdx = Math.max(0, primaryGenres.indexOf(primaryGenre));

    // Deterministic slight horizontal/vertical jitter when multiple musicians share the same slot
    const slotKey = `${regionIdx}:${genreIdx}`;
    const seen = slotCounts.get(slotKey) || 0;
    slotCounts.set(slotKey, seen + 1);
    const jitterX = seen === 0 ? 0 : (seen % 2 === 0 ? 1 : -1) * Math.min(0.28, 0.14 * Math.ceil(seen / 2));
    const jitterY = seen === 0 ? 0 : (seen % 2 === 0 ? -0.1 : 0.1);

    return {
      id: m.id,
      stageName: m.stageName,
      name: m.name,
      region: m.region,
      macroRegion: m.macroRegion,
      primaryGenre,
      genres: m.genres,
      instruments: m.instruments,
      collabFormat: m.collabFormat,
      x: Number((regionIdx + jitterX).toFixed(2)),
      y: Number((genreIdx + jitterY).toFixed(2)),
      z: Math.max(1, m.instruments.length),
    };
  });

  return {
    points,
    genreLabels: primaryGenres,
    regionLabels: MACRO_REGION_ORDER,
  };
}

export function formatDurationPtBr(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} min`;
  }
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}min`;
}

export function formatDateTimePtBr(isoString: string): string {
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) {
    return isoString;
  }
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}
