import type { GoogleContactItem, GoogleTaskItem, MeetParticipantContact } from '../types';
import {
  extractMeetCodeFromUri,
  mapMeetParticipantsToContacts,
  type RawMeetParticipant,
} from '../utils/sessionWorkspace';
import { encodeGmailRawMessage } from '../utils/validation';

export async function sendGmailMessage(
  accessToken: string,
  params: { to: string; subject: string; body: string }
): Promise<{ id: string; threadId?: string }> {
  const raw = encodeGmailRawMessage(params);
  const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ raw }),
  });

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`Falha ao enviar pelo Gmail (${res.status}): ${detail}`);
  }
  return res.json();
}

export async function createGoogleMeetSpace(accessToken: string): Promise<{
  meetingUri: string;
  meetingCode: string;
}> {
  const res = await fetch('https://meet.googleapis.com/v2/spaces', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({}),
  });

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`Falha ao criar sala no Google Meet (${res.status}): ${detail}`);
  }
  const data = await res.json();
  return {
    meetingUri: data.meetingUri || '',
    meetingCode: data.meetingCode || '',
  };
}

export async function fetchMeetParticipants(
  accessToken: string,
  meetUri: string,
  knownContacts: GoogleContactItem[] = []
): Promise<{
  conferenceRecordName: string | null;
  participants: MeetParticipantContact[];
}> {
  const meetingCode = extractMeetCodeFromUri(meetUri);
  if (!meetingCode) {
    throw new Error('Link do Google Meet inválido ou não encontrado para esta sessão.');
  }

  let conferenceRecordName: string | null = null;

  const filterExpr = `space.meeting_code="${meetingCode}"`;
  const recordsRes = await fetch(
    `https://meet.googleapis.com/v2/conferenceRecords?filter=${encodeURIComponent(filterExpr)}&pageSize=5`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!recordsRes.ok) {
    const detail = await recordsRes.text();
    throw new Error(`Falha ao consultar registros do Google Meet (${recordsRes.status}): ${detail}`);
  }

  const recordsData = (await recordsRes.json()) as {
    conferenceRecords?: Array<{ name?: string }>;
  };
  conferenceRecordName = recordsData.conferenceRecords?.[0]?.name || null;

  if (!conferenceRecordName) {
    const spaceRes = await fetch(
      `https://meet.googleapis.com/v2/spaces/${encodeURIComponent(meetingCode)}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );
    if (spaceRes.ok) {
      const spaceData = (await spaceRes.json()) as {
        activeConference?: { conferenceRecord?: string };
      };
      conferenceRecordName = spaceData.activeConference?.conferenceRecord || null;
    }
  }

  if (!conferenceRecordName) {
    return {
      conferenceRecordName: null,
      participants: [],
    };
  }

  const participantsRes = await fetch(
    `https://meet.googleapis.com/v2/${conferenceRecordName}/participants?pageSize=100`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!participantsRes.ok) {
    const detail = await participantsRes.text();
    throw new Error(
      `Falha ao listar participantes do Google Meet (${participantsRes.status}): ${detail}`
    );
  }

  const participantsData = (await participantsRes.json()) as {
    participants?: RawMeetParticipant[];
  };
  const rawParticipants = Array.isArray(participantsData.participants)
    ? participantsData.participants
    : [];

  let contactsToMatch = knownContacts;
  if (contactsToMatch.length === 0) {
    try {
      contactsToMatch = await fetchGoogleContacts(accessToken);
    } catch {
      contactsToMatch = [];
    }
  }

  return {
    conferenceRecordName,
    participants: mapMeetParticipantsToContacts(rawParticipants, contactsToMatch),
  };
}

export async function fetchGoogleContacts(accessToken: string): Promise<GoogleContactItem[]> {
  const res = await fetch(
    'https://people.googleapis.com/v1/people/me/connections?personFields=names,emailAddresses,photos&pageSize=30',
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`Falha ao carregar Contatos do Google (${res.status}): ${detail}`);
  }

  const data = await res.json();
  const connections = Array.isArray(data.connections) ? data.connections : [];
  const items: GoogleContactItem[] = [];

  for (const person of connections) {
    const email = person.emailAddresses?.[0]?.value;
    if (!email) continue;
    const name = person.names?.[0]?.displayName || email;
    const photoUrl = person.photos?.[0]?.url;
    items.push({
      resourceName: person.resourceName || email,
      name,
      email,
      photoUrl,
    });
  }
  return items;
}

export async function fetchDefaultTaskListId(accessToken: string): Promise<string> {
  const res = await fetch('https://tasks.googleapis.com/tasks/v1/users/@me/lists', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`Falha ao listar listas do Google Tasks (${res.status}): ${detail}`);
  }
  const data = await res.json();
  const firstId = data.items?.[0]?.id;
  return firstId || '@default';
}

export async function listGoogleTasks(accessToken: string): Promise<GoogleTaskItem[]> {
  const res = await fetch(
    'https://tasks.googleapis.com/tasks/v1/lists/@default/tasks?showCompleted=true&maxResults=25',
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );
  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`Falha ao carregar Google Tasks (${res.status}): ${detail}`);
  }
  const data = await res.json();
  const rawItems = Array.isArray(data.items) ? data.items : [];
  return rawItems.map((item: { id: string; title?: string; notes?: string; status?: string; due?: string }) => ({
    id: item.id,
    title: item.title || 'Tarefa sem título',
    notes: item.notes,
    status: item.status === 'completed' ? 'completed' : 'needsAction',
    due: item.due,
  }));
}

export async function createGoogleTask(
  accessToken: string,
  params: { title: string; notes?: string; dueIso?: string }
): Promise<GoogleTaskItem> {
  const payload: Record<string, string> = {
    title: params.title,
  };
  if (params.notes) {
    payload.notes = params.notes;
  }
  if (params.dueIso) {
    const d = new Date(params.dueIso);
    if (!Number.isNaN(d.getTime())) {
      payload.due = d.toISOString();
    }
  }

  const res = await fetch('https://tasks.googleapis.com/tasks/v1/lists/@default/tasks', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`Falha ao criar tarefa no Google Tasks (${res.status}): ${detail}`);
  }
  const item = await res.json();
  return {
    id: item.id,
    title: item.title || params.title,
    notes: item.notes,
    status: item.status === 'completed' ? 'completed' : 'needsAction',
    due: item.due,
  };
}

export async function toggleGoogleTaskStatus(
  accessToken: string,
  taskId: string,
  nextStatus: 'needsAction' | 'completed'
): Promise<GoogleTaskItem> {
  const res = await fetch(`https://tasks.googleapis.com/tasks/v1/lists/@default/tasks/${encodeURIComponent(taskId)}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      status: nextStatus,
      completed: nextStatus === 'completed' ? new Date().toISOString() : null,
    }),
  });

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`Falha ao atualizar tarefa no Google Tasks (${res.status}): ${detail}`);
  }
  const item = await res.json();
  return {
    id: item.id,
    title: item.title || 'Tarefa',
    notes: item.notes,
    status: item.status === 'completed' ? 'completed' : 'needsAction',
    due: item.due,
  };
}
