import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  sanitizeMusicianPayload,
  sanitizeSessionPayload,
  sanitizeMessagePayload,
  isValidDocId,
} from './src/utils/validation';

const rulesText = fs.readFileSync('firestore.rules', 'utf8');

test('firestore.rules contains default-deny safety net and all 6 collection paths', () => {
  assert.match(rulesText, /match \/\{document=\*\*\} \{\s*allow read, write: if false;/);
  assert.match(rulesText, /match \/musicians\/\{musicianId\}/);
  assert.match(rulesText, /match \/users\/\{userId\}\/private\/\{docId\}/);
  assert.match(rulesText, /match \/conversations\/\{conversationId\}/);
  assert.match(rulesText, /match \/sessions\/\{sessionId\}/);
  assert.match(rulesText, /match \/quickRequests\/\{requestId\}/);
  assert.match(rulesText, /match \/test\/connection/);
});

test('Dirty Dozen boundary validation blocks oversized strings, invalid IDs, and ghost fields', () => {
  assert.equal(isValidDocId('musician_01-sp'), true);
  assert.equal(isValidDocId('../admin'), false);
  assert.equal(isValidDocId('x'.repeat(200)), false);

  const sanitizedMusician = sanitizeMusicianPayload({
    ownerId: 'user_1',
    name: 'Clara Mendes',
    stageName: 'Clara Sint',
    region: 'Nordeste · Recife',
    macroRegion: 'Nordeste',
    genres: ['MPB Psicodélica', 'Synthwave', 'Eletrônica', 'Jazz', 'Indie', 'Experimental', 'Extra'],
    instruments: ['Sintetizador', 'Voz'],
    experienceLevel: 'Profissional',
    collabFormat: 'Híbrido',
    availability: 'Noites e fins de semana',
    bio: 'A'.repeat(900),
    dawSetup: 'Ableton Live 12 + Prophet Rev2',
    lookingFor: 'Baixista ou percussionista para projeto fora do circuito eletrônico',
    avatarUrl: '/src/assets/images/avatar.jpg',
    openToCrossNiche: true,
    isPublished: true,
  });

  assert.equal(sanitizedMusician.genres.length, 6);
  assert.equal(sanitizedMusician.bio.length, 500);
  assert.equal('isVerifiedAdmin' in sanitizedMusician, false);

  const sanitizedSession = sanitizeSessionPayload({
    hostId: 'user_1',
    hostName: 'Clara',
    participantIds: ['user_1', 'user_2'],
    participantNames: ['Clara', 'Mateus'],
    title: 'Jam Transregional Recife-SP',
    format: 'Remota (Google Meet)',
    scheduledAt: '2026-11-28T19:00',
    durationMinutes: 999,
    status: 'agendada',
    meetUri: 'https://meet.google.com/abc-defg-hij',
    notes: 'N'.repeat(800),
  });

  assert.equal(sanitizedSession.durationMinutes, 480);
  assert.equal(sanitizedSession.notes.length, 600);

  assert.throws(() => sanitizeMessagePayload({ body: '   ', senderName: 'Clara' }));
});
