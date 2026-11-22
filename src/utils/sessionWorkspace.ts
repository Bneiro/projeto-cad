import type {
  CollabSession,
  GoogleContactItem,
  MeetParticipantContact,
  MeetParticipantSource,
} from '../types';
import { formatDateTimePtBr, formatDurationPtBr } from './filters';

export interface RawMeetParticipant {
  name: string;
  earliestStartTime?: string;
  latestEndTime?: string;
  signedinUser?: {
    user?: string;
    displayName?: string;
  };
  anonymousUser?: {
    displayName?: string;
  };
  phoneUser?: {
    displayName?: string;
  };
}

export function extractMeetCodeFromUri(meetUri: string): string | null {
  if (!meetUri || typeof meetUri !== 'string') return null;
  const trimmed = meetUri.trim();
  if (!trimmed) return null;

  try {
    const url = new URL(trimmed.startsWith('http') ? trimmed : `https://${trimmed}`);
    if (!url.hostname.toLowerCase().includes('meet.google.com')) {
      return null;
    }
    const slug = url.pathname.replace(/^\/+|\/+$/g, '').split('/')[0] || '';
    if (!/^[a-zA-Z0-9-]{3,40}$/.test(slug)) {
      return null;
    }
    return slug.toLowerCase();
  } catch {
    return null;
  }
}

export function buildSessionReminderTaskPayload(
  session: Pick<
    CollabSession,
    'title' | 'scheduledAt' | 'durationMinutes' | 'format' | 'meetUri' | 'participantNames' | 'notes'
  >
): { title: string; notes: string; dueIso?: string } {
  const cleanTitle = session.title.trim() || 'Sessão musical';
  const taskTitle = `Lembrete de sessão: ${cleanTitle}`.slice(0, 200);

  const noteLines = [
    `Sessão: ${cleanTitle}`,
    `Data agendada: ${formatDateTimePtBr(session.scheduledAt)}`,
    `Duração: ${formatDurationPtBr(session.durationMinutes)}`,
    `Formato: ${session.format}`,
  ];

  if (session.participantNames.length > 0) {
    noteLines.push(`Participantes: ${session.participantNames.join(', ')}`);
  }
  if (session.meetUri) {
    noteLines.push(`Link Google Meet: ${session.meetUri}`);
  }
  if (session.notes.trim()) {
    noteLines.push(`Pauta: ${session.notes.trim()}`);
  }

  let dueIso: string | undefined;
  if (session.scheduledAt) {
    const parsed = new Date(session.scheduledAt);
    if (!Number.isNaN(parsed.getTime())) {
      dueIso = parsed.toISOString();
    }
  }

  return {
    title: taskTitle,
    notes: noteLines.join('\n'),
    dueIso,
  };
}

function normalizeNameForMatch(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

export function mapMeetParticipantsToContacts(
  rawParticipants: RawMeetParticipant[],
  googleContacts: GoogleContactItem[]
): MeetParticipantContact[] {
  const contactByNormalizedName = new Map<string, GoogleContactItem>();
  for (const contact of googleContacts) {
    const normalized = normalizeNameForMatch(contact.name);
    if (normalized && !contactByNormalizedName.has(normalized)) {
      contactByNormalizedName.set(normalized, contact);
    }
  }

  const deduped = new Map<string, MeetParticipantContact>();

  for (const raw of rawParticipants) {
    let displayName = 'Participante sem nome';
    let source: MeetParticipantSource = 'anonymous';
    let stableKey = raw.name || '';

    if (raw.signedinUser) {
      source = 'google_account';
      displayName = raw.signedinUser.displayName?.trim() || 'Usuário Google';
      stableKey = raw.signedinUser.user || `signedin:${normalizeNameForMatch(displayName)}`;
    } else if (raw.phoneUser) {
      source = 'phone';
      displayName = raw.phoneUser.displayName?.trim() || 'Participante por telefone';
      stableKey = `phone:${normalizeNameForMatch(displayName)}`;
    } else if (raw.anonymousUser) {
      source = 'anonymous';
      displayName = raw.anonymousUser.displayName?.trim() || 'Convidado no Meet';
      stableKey = `anon:${normalizeNameForMatch(displayName)}`;
    }

    const matchedContact = contactByNormalizedName.get(normalizeNameForMatch(displayName));
    const activeNow = Boolean(raw.earliestStartTime) && !raw.latestEndTime;

    const existing = deduped.get(stableKey);
    if (existing) {
      deduped.set(stableKey, {
        ...existing,
        activeNow: existing.activeNow || activeNow,
        earliestStartTime: existing.earliestStartTime || raw.earliestStartTime,
        latestEndTime: raw.latestEndTime || existing.latestEndTime,
      });
      continue;
    }

    deduped.set(stableKey, {
      id: stableKey || `meet_p_${deduped.size + 1}`,
      displayName,
      email: matchedContact?.email,
      photoUrl: matchedContact?.photoUrl,
      source,
      inGoogleContacts: Boolean(matchedContact),
      earliestStartTime: raw.earliestStartTime,
      latestEndTime: raw.latestEndTime,
      activeNow,
    });
  }

  return Array.from(deduped.values()).sort((a, b) => {
    if (a.activeNow !== b.activeNow) return a.activeNow ? -1 : 1;
    if (a.inGoogleContacts !== b.inGoogleContacts) return a.inGoogleContacts ? -1 : 1;
    return a.displayName.localeCompare(b.displayName, 'pt-BR');
  });
}
