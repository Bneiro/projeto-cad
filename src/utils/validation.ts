import type { CollabFormat, ExperienceLevel, MacroRegion, SessionFormat, SessionStatus } from '../types';

const DOC_ID_REGEX = /^[a-zA-Z0-9_-]{1,128}$/;

export function isValidDocId(id: string): boolean {
  return typeof id === 'string' && DOC_ID_REGEX.test(id);
}

export function clampString(value: unknown, minLen: number, maxLen: number, fallback = ''): string {
  const str = typeof value === 'string' ? value.trim() : fallback;
  if (str.length < minLen && fallback.length >= minLen) {
    return fallback.slice(0, maxLen);
  }
  return str.slice(0, maxLen);
}

export interface SanitizedMusicianInput {
  ownerId: string;
  name: string;
  stageName: string;
  region: string;
  macroRegion: MacroRegion;
  genres: string[];
  instruments: string[];
  experienceLevel: ExperienceLevel;
  collabFormat: CollabFormat;
  availability: string;
  bio: string;
  dawSetup: string;
  lookingFor: string;
  avatarUrl: string;
  openToCrossNiche: boolean;
  isPublished: boolean;
}

const VALID_MACRO_REGIONS: MacroRegion[] = [
  'Norte',
  'Nordeste',
  'Centro-Oeste',
  'Sudeste',
  'Sul',
  'Remoto / Global',
];

const VALID_EXPERIENCE: ExperienceLevel[] = [
  'Emergente',
  'Intermediário',
  'Profissional',
  'Produtor / Diretor',
];

const VALID_COLLAB_FORMATS: CollabFormat[] = ['Remoto', 'Presencial', 'Híbrido'];

export function sanitizeMusicianPayload(input: {
  ownerId: string;
  name: string;
  stageName: string;
  region: string;
  macroRegion: MacroRegion;
  genres: string[];
  instruments: string[];
  experienceLevel: ExperienceLevel;
  collabFormat: CollabFormat;
  availability: string;
  bio: string;
  dawSetup: string;
  lookingFor: string;
  avatarUrl: string;
  openToCrossNiche: boolean;
  isPublished: boolean;
}): SanitizedMusicianInput {
  if (!isValidDocId(input.ownerId)) {
    throw new Error('Identificador de usuário inválido.');
  }

  const name = clampString(input.name, 2, 80);
  const stageName = clampString(input.stageName, 2, 80);
  const region = clampString(input.region, 2, 60);
  const bio = clampString(input.bio, 10, 500);
  const availability = clampString(input.availability, 2, 80);
  const dawSetup = clampString(input.dawSetup, 2, 120);
  const lookingFor = clampString(input.lookingFor, 2, 200);

  if (name.length < 2 || stageName.length < 2 || region.length < 2 || bio.length < 10) {
    throw new Error('Preencha nome, nome artístico, região e biografia (mínimo 10 caracteres).');
  }

  const genres = (Array.isArray(input.genres) ? input.genres : [])
    .map((g) => clampString(g, 1, 40))
    .filter((g) => g.length > 0)
    .slice(0, 6);

  const instruments = (Array.isArray(input.instruments) ? input.instruments : [])
    .map((i) => clampString(i, 1, 40))
    .filter((i) => i.length > 0)
    .slice(0, 6);

  if (genres.length === 0 || instruments.length === 0) {
    throw new Error('Informe ao menos um gênero musical e um instrumento.');
  }

  return {
    ownerId: input.ownerId,
    name,
    stageName,
    region,
    macroRegion: VALID_MACRO_REGIONS.includes(input.macroRegion) ? input.macroRegion : 'Remoto / Global',
    genres,
    instruments,
    experienceLevel: VALID_EXPERIENCE.includes(input.experienceLevel) ? input.experienceLevel : 'Intermediário',
    collabFormat: VALID_COLLAB_FORMATS.includes(input.collabFormat) ? input.collabFormat : 'Híbrido',
    availability: availability.length >= 2 ? availability : 'Horário flexível',
    bio,
    dawSetup: dawSetup.length >= 2 ? dawSetup : 'Home studio independente',
    lookingFor: lookingFor.length >= 2 ? lookingFor : 'Parcerias criativas fora do nicho habitual',
    avatarUrl: clampString(input.avatarUrl, 0, 300),
    openToCrossNiche: Boolean(input.openToCrossNiche),
    isPublished: Boolean(input.isPublished),
  };
}

export interface SanitizedSessionInput {
  hostId: string;
  hostName: string;
  participantIds: string[];
  participantNames: string[];
  title: string;
  format: SessionFormat;
  scheduledAt: string;
  durationMinutes: number;
  status: SessionStatus;
  meetUri: string;
  notes: string;
}

const VALID_SESSION_FORMATS: SessionFormat[] = ['Remota (Google Meet)', 'Presencial', 'Híbrida'];
const VALID_SESSION_STATUSES: SessionStatus[] = ['agendada', 'confirmada', 'concluida', 'cancelada'];

export function sanitizeSessionPayload(input: {
  hostId: string;
  hostName: string;
  participantIds: string[];
  participantNames: string[];
  title: string;
  format: SessionFormat;
  scheduledAt: string;
  durationMinutes: number;
  status?: SessionStatus;
  meetUri?: string;
  notes?: string;
}): SanitizedSessionInput {
  if (!isValidDocId(input.hostId)) {
    throw new Error('Host inválido para a sessão.');
  }

  const title = clampString(input.title, 2, 120);
  const hostName = clampString(input.hostName, 1, 80);
  const scheduledAt = clampString(input.scheduledAt, 10, 40);

  if (title.length < 2 || scheduledAt.length < 10) {
    throw new Error('Informe título e data/hora válidos para agendar a sessão.');
  }

  const participantIds = (Array.isArray(input.participantIds) ? input.participantIds : [input.hostId])
    .map((id) => clampString(id, 1, 128))
    .filter((id) => isValidDocId(id))
    .slice(0, 10);

  if (!participantIds.includes(input.hostId)) {
    participantIds.unshift(input.hostId);
  }

  const participantNames = (Array.isArray(input.participantNames) ? input.participantNames : [hostName])
    .map((n) => clampString(n, 1, 80))
    .filter((n) => n.length > 0)
    .slice(0, 10);

  if (participantNames.length === 0) {
    participantNames.push(hostName);
  }

  const rawDuration = Number(input.durationMinutes);
  const durationMinutes = Number.isFinite(rawDuration)
    ? Math.min(480, Math.max(15, Math.round(rawDuration)))
    : 60;

  return {
    hostId: input.hostId,
    hostName,
    participantIds: participantIds.slice(0, 10),
    participantNames,
    title,
    format: VALID_SESSION_FORMATS.includes(input.format) ? input.format : 'Remota (Google Meet)',
    scheduledAt,
    durationMinutes,
    status: input.status && VALID_SESSION_STATUSES.includes(input.status) ? input.status : 'agendada',
    meetUri: clampString(input.meetUri ?? '', 0, 300),
    notes: clampString(input.notes ?? '', 0, 600),
  };
}

export function sanitizeMessagePayload(input: { body: string; senderName: string }): {
  body: string;
  senderName: string;
} {
  const body = clampString(input.body, 1, 2000);
  const senderName = clampString(input.senderName, 1, 80);
  if (body.length < 1) {
    throw new Error('A mensagem não pode estar vazia.');
  }
  return {
    body,
    senderName: senderName.length >= 1 ? senderName : 'Artista',
  };
}

export function encodeGmailRawMessage(params: {
  to: string;
  subject: string;
  body: string;
  fromName?: string;
}): string {
  const cleanTo = params.to.trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanTo)) {
    throw new Error('Endereço de e-mail do destinatário inválido.');
  }

  const utf8Subject = `=?utf-8?B?${btoa(unescape(encodeURIComponent(params.subject.trim())))}?=`;
  const lines = [
    `To: ${cleanTo}`,
    `Subject: ${utf8Subject}`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset="UTF-8"',
    'Content-Transfer-Encoding: 8bit',
    '',
    params.body.trim(),
  ];
  const raw = lines.join('\r\n');
  const encoded = btoa(unescape(encodeURIComponent(raw)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
  return encoded;
}

export interface SanitizedQuickRequestInput {
  authorId: string;
  authorName: string;
  authorStageName: string;
  authorRegion: string;
  macroRegion: MacroRegion;
  title: string;
  description: string;
  instrumentNeeded: string;
  genreContext: string;
  bpmAndKey: string;
  collabFormat: CollabFormat;
  urgency: 'Hoje / Urgente' | 'Esta semana' | 'Sem pressa';
  status: 'aberto' | 'em_andamento' | 'resolvido';
  responseCount: number;
}

const VALID_URGENCIES = ['Hoje / Urgente', 'Esta semana', 'Sem pressa'] as const;
const VALID_REQUEST_STATUSES = ['aberto', 'em_andamento', 'resolvido'] as const;

export function sanitizeQuickRequestPayload(input: {
  authorId: string;
  authorName: string;
  authorStageName: string;
  authorRegion: string;
  macroRegion: MacroRegion;
  title: string;
  description: string;
  instrumentNeeded: string;
  genreContext: string;
  bpmAndKey?: string;
  collabFormat: CollabFormat;
  urgency: 'Hoje / Urgente' | 'Esta semana' | 'Sem pressa';
  status?: 'aberto' | 'em_andamento' | 'resolvido';
  responseCount?: number;
}): SanitizedQuickRequestInput {
  if (!isValidDocId(input.authorId)) {
    throw new Error('Identificador de autor inválido.');
  }

  const title = clampString(input.title, 4, 120);
  const description = clampString(input.description, 10, 500);
  const instrumentNeeded = clampString(input.instrumentNeeded, 2, 60);
  const genreContext = clampString(input.genreContext, 2, 60);

  if (title.length < 4 || description.length < 10 || instrumentNeeded.length < 2) {
    throw new Error(
      'Informe título (mín. 4 caracteres), instrumento desejado e descrição (mín. 10 caracteres).'
    );
  }

  const authorName = clampString(input.authorName, 2, 80, 'Artista');
  const authorStageName = clampString(input.authorStageName, 2, 80, authorName);
  const authorRegion = clampString(input.authorRegion, 2, 60, 'Remoto / Brasil');
  const rawCount = Number(input.responseCount ?? 0);

  return {
    authorId: input.authorId,
    authorName: authorName.length >= 2 ? authorName : 'Artista',
    authorStageName: authorStageName.length >= 2 ? authorStageName : 'Artista',
    authorRegion: authorRegion.length >= 2 ? authorRegion : 'Remoto / Brasil',
    macroRegion: VALID_MACRO_REGIONS.includes(input.macroRegion)
      ? input.macroRegion
      : 'Remoto / Global',
    title,
    description,
    instrumentNeeded,
    genreContext: genreContext.length >= 2 ? genreContext : 'Cross-Niche',
    bpmAndKey: clampString(input.bpmAndKey ?? '', 0, 60),
    collabFormat: VALID_COLLAB_FORMATS.includes(input.collabFormat) ? input.collabFormat : 'Remoto',
    urgency: VALID_URGENCIES.includes(input.urgency) ? input.urgency : 'Esta semana',
    status:
      input.status && VALID_REQUEST_STATUSES.includes(input.status) ? input.status : 'aberto',
    responseCount: Number.isFinite(rawCount)
      ? Math.min(500, Math.max(0, Math.round(rawCount)))
      : 0,
  };
}
