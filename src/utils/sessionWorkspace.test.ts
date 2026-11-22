import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildSessionReminderTaskPayload,
  extractMeetCodeFromUri,
  mapMeetParticipantsToContacts,
} from './sessionWorkspace';

test('extractMeetCodeFromUri parses valid Google Meet URLs and rejects invalid ones', () => {
  assert.equal(extractMeetCodeFromUri('https://meet.google.com/abc-defg-hij'), 'abc-defg-hij');
  assert.equal(
    extractMeetCodeFromUri('https://meet.google.com/ELO-SONO-123?authuser=0'),
    'elo-sono-123'
  );
  assert.equal(extractMeetCodeFromUri(''), null);
  assert.equal(extractMeetCodeFromUri('https://example.com/abc-defg-hij'), null);
});

test('buildSessionReminderTaskPayload uses session title, scheduled dueIso, and session details', () => {
  const payload = buildSessionReminderTaskPayload({
    title: 'Jam Synth + Percussão',
    scheduledAt: '2026-11-28T19:00:00.000Z',
    durationMinutes: 90,
    format: 'Remota (Google Meet)',
    meetUri: 'https://meet.google.com/abc-defg-hij',
    participantNames: ['Você', 'Clara Sint'],
    notes: 'Exportar stems 48kHz',
  });

  assert.equal(payload.title, 'Lembrete de sessão: Jam Synth + Percussão');
  assert.equal(payload.dueIso, '2026-11-28T19:00:00.000Z');
  assert.match(payload.notes, /Jam Synth \+ Percussão/);
  assert.match(payload.notes, /https:\/\/meet\.google\.com\/abc-defg-hij/);
  assert.match(payload.notes, /Clara Sint/);
});

test('mapMeetParticipantsToContacts deduplicates participants and enriches with Google Contacts', () => {
  const mapped = mapMeetParticipantsToContacts(
    [
      {
        name: 'conferenceRecords/c1/participants/p1',
        earliestStartTime: '2026-11-22T18:00:00Z',
        signedinUser: {
          user: 'users/123',
          displayName: 'Clara Vasconcelos',
        },
      },
      {
        name: 'conferenceRecords/c1/participants/p2',
        earliestStartTime: '2026-11-22T18:01:00Z',
        latestEndTime: '2026-11-22T18:10:00Z',
        signedinUser: {
          user: 'users/123',
          displayName: 'Clara Vasconcelos',
        },
      },
      {
        name: 'conferenceRecords/c1/participants/p3',
        earliestStartTime: '2026-11-22T18:05:00Z',
        latestEndTime: '2026-11-22T18:45:00Z',
        anonymousUser: {
          displayName: 'Convidado Guitarra',
        },
      },
    ],
    [
      {
        resourceName: 'people/c999',
        name: 'Clara Vasconcelos',
        email: 'clara@elo.mus.br',
        photoUrl: 'https://example.com/clara.jpg',
      },
    ]
  );

  assert.equal(mapped.length, 2);
  assert.equal(mapped[0].displayName, 'Clara Vasconcelos');
  assert.equal(mapped[0].email, 'clara@elo.mus.br');
  assert.equal(mapped[0].inGoogleContacts, true);
  assert.equal(mapped[0].activeNow, true);
  assert.equal(mapped[1].displayName, 'Convidado Guitarra');
  assert.equal(mapped[1].source, 'anonymous');
  assert.equal(mapped[1].activeNow, false);
});
