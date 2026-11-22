import type { CollabFormat, MacroRegion, MusicianProfile } from '../types';
import { normalizeText } from './filters';

export interface UserStyleLocationSeed {
  id?: string;
  ownerId?: string;
  stageName?: string;
  region: string;
  macroRegion: MacroRegion;
  genres: string[];
  instruments: string[];
  collabFormat: CollabFormat;
  openToCrossNiche: boolean;
  lookingFor?: string;
}

export interface SmartRecommendation {
  musician: MusicianProfile;
  score: number;
  locationHighlight: string;
  styleHighlight: string;
  complementaryInstruments: string[];
}

export function recommendComplementaryMusicians(
  userProfile: UserStyleLocationSeed,
  candidates: MusicianProfile[],
  limit = 3
): SmartRecommendation[] {
  const userGenresNorm = new Set(userProfile.genres.map(normalizeText).filter(Boolean));
  const userInstNorm = new Set(userProfile.instruments.map(normalizeText).filter(Boolean));
  const userLookingNorm = normalizeText(userProfile.lookingFor || '');
  const userRegionNorm = normalizeText(userProfile.region);

  const ranked = candidates
    .filter((candidate) => {
      if (!candidate.isPublished) return false;
      if (userProfile.id && candidate.id === userProfile.id) return false;
      if (userProfile.ownerId && candidate.ownerId === userProfile.ownerId) return false;
      return true;
    })
    .map((candidate) => {
      let score = 0;

      // 1. Location & collaboration proximity (up to 35 pts)
      let locationHighlight = '';
      const candRegionNorm = normalizeText(candidate.region);
      if (userRegionNorm && candRegionNorm && candRegionNorm === userRegionNorm) {
        score += 35;
        locationHighlight = `Mesma cena local (${candidate.region})`;
      } else if (candidate.macroRegion === userProfile.macroRegion) {
        score += 28;
        locationHighlight = `Mesma região (${candidate.macroRegion} · ${candidate.collabFormat})`;
      } else if (
        candidate.collabFormat === 'Remoto' ||
        candidate.collabFormat === 'Híbrido' ||
        candidate.macroRegion === 'Remoto / Global'
      ) {
        score += 20;
        locationHighlight = `Conexão ${candidate.collabFormat.toLowerCase()} de ${candidate.region}`;
      } else {
        score += 5;
        locationHighlight = `${candidate.region} (${candidate.collabFormat})`;
      }

      // 2. Complementary instruments & mutual needs (up to 30 pts)
      const complementaryInstruments = candidate.instruments.filter(
        (inst) => !userInstNorm.has(normalizeText(inst))
      );
      if (complementaryInstruments.length >= 2) {
        score += 22;
      } else if (complementaryInstruments.length === 1) {
        score += 14;
      } else {
        score += 6;
      }

      const candLookingNorm = normalizeText(candidate.lookingFor);
      const mutualMatch =
        candidate.instruments.some((inst) => userLookingNorm.includes(normalizeText(inst))) ||
        candidate.genres.some((g) => userLookingNorm.includes(normalizeText(g))) ||
        userProfile.instruments.some((inst) => candLookingNorm.includes(normalizeText(inst))) ||
        userProfile.genres.some((g) => candLookingNorm.includes(normalizeText(g)));

      if (mutualMatch) {
        score += 8;
      }

      // 3. Musical style complementarity & cross-niche bridge (up to 20 pts)
      const sharedGenres = candidate.genres.filter((g) =>
        userGenresNorm.has(normalizeText(g))
      );
      const distinctGenres = candidate.genres.filter(
        (g) => !userGenresNorm.has(normalizeText(g))
      );

      let styleHighlight = '';
      if (sharedGenres.length > 0 && distinctGenres.length > 0) {
        score += 20;
        styleHighlight = `Base comum em ${sharedGenres[0]} + ponte para ${distinctGenres[0]}`;
      } else if (distinctGenres.length > 0 && candidate.openToCrossNiche) {
        score += 17;
        styleHighlight = `Fusão complementar com ${distinctGenres.slice(0, 2).join(' e ')}`;
      } else if (sharedGenres.length > 0) {
        score += 14;
        styleHighlight = `Afinidade direta em ${sharedGenres[0]}`;
      } else {
        score += 9;
        styleHighlight = `Diálogo aberto entre ${candidate.genres[0] || 'estilos diversos'}`;
      }

      // 4. Cross-niche & format harmony (up to 15 pts)
      if (userProfile.openToCrossNiche && candidate.openToCrossNiche) {
        score += 9;
      } else if (candidate.openToCrossNiche) {
        score += 5;
      }

      const formatCompatible =
        userProfile.collabFormat === 'Híbrido' ||
        candidate.collabFormat === 'Híbrido' ||
        userProfile.collabFormat === candidate.collabFormat;
      if (formatCompatible) {
        score += 6;
      }

      return {
        musician: candidate,
        score: Math.min(99, Math.max(40, score)),
        locationHighlight,
        styleHighlight,
        complementaryInstruments:
          complementaryInstruments.length > 0 ? complementaryInstruments : candidate.instruments,
      };
    })
    .sort((a, b) => b.score - a.score || a.musician.stageName.localeCompare(b.musician.stageName, 'pt-BR'));

  return ranked.slice(0, Math.max(1, limit));
}
