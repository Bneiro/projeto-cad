import test from 'node:test';
import assert from 'node:assert/strict';
import type { QuickRequest } from '../types';
import {
  DEFAULT_QUICK_REQUEST_FILTERS,
  buildQuickRequestReplyMessage,
  filterAndSortQuickRequests,
} from './quickRequests';
import { sanitizeQuickRequestPayload } from './validation';

const SAMPLE_REQUESTS: QuickRequest[] = [
  {
    id: 'qr_1',
    authorId: 'u1',
    authorName: 'Clara',
    authorStageName: 'Clara Sint',
    authorRegion: 'Nordeste · Recife, PE',
    macroRegion: 'Nordeste',
    title: 'Preciso de sax tenor em 108 BPM',
    description: 'EP experimental misturando synth analógico com sopros orgânicos.',
    instrumentNeeded: 'Saxofone Tenor',
    genreContext: 'MPB Psicodélica + Jazz',
    bpmAndKey: '108 BPM · Ré menor',
    collabFormat: 'Remoto',
    urgency: 'Hoje / Urgente',
    status: 'aberto',
    responseCount: 1,
    createdAt: '2026-11-22T10:00:00.000Z',
    updatedAt: '2026-11-22T10:00:00.000Z',
  },
  {
    id: 'qr_2',
    authorId: 'u2',
    authorName: 'Davi',
    authorStageName: 'Maré Sintética',
    authorRegion: 'Norte · Belém, PA',
    macroRegion: 'Norte',
    title: 'Baterista para guitarrada ambient',
    description: 'Busco bateria acústica gravada em stems 48kHz para faixa instrumental.',
    instrumentNeeded: 'Bateria',
    genreContext: 'Guitarrada + Ambient',
    bpmAndKey: '118 BPM · Lá menor',
    collabFormat: 'Remoto',
    urgency: 'Sem pressa',
    status: 'aberto',
    responseCount: 0,
    createdAt: '2026-11-22T12:00:00.000Z',
    updatedAt: '2026-11-22T12:00:00.000Z',
  },
  {
    id: 'qr_3',
    authorId: 'u3',
    authorName: 'Júlia',
    authorStageName: 'Alencar Fuzz',
    authorRegion: 'Sul · Porto Alegre, RS',
    macroRegion: 'Sul',
    title: 'Vocalista para shoegaze finalizado',
    description: 'Pedido já atendido pela comunidade com dupla de vozes.',
    instrumentNeeded: 'Voz',
    genreContext: 'Shoegaze',
    bpmAndKey: '96 BPM · Mi menor',
    collabFormat: 'Remoto',
    urgency: 'Esta semana',
    status: 'resolvido',
    responseCount: 3,
    createdAt: '2026-11-21T15:00:00.000Z',
    updatedAt: '2026-11-22T09:00:00.000Z',
  },
];

test('filterAndSortQuickRequests hides resolved by default and prioritizes urgent open requests', () => {
  const active = filterAndSortQuickRequests(SAMPLE_REQUESTS, DEFAULT_QUICK_REQUEST_FILTERS);
  assert.equal(active.length, 2);
  assert.equal(active[0].id, 'qr_1');
  assert.equal(active[1].id, 'qr_2');

  const all = filterAndSortQuickRequests(SAMPLE_REQUESTS, {
    ...DEFAULT_QUICK_REQUEST_FILTERS,
    status: 'todos',
  });
  assert.equal(all.length, 3);
  assert.equal(all[2].id, 'qr_3');
});

test('filterAndSortQuickRequests searches by instrument, title, and region', () => {
  const byInstrument = filterAndSortQuickRequests(SAMPLE_REQUESTS, {
    ...DEFAULT_QUICK_REQUEST_FILTERS,
    search: 'guitarrada',
  });
  assert.equal(byInstrument.length, 1);
  assert.equal(byInstrument[0].id, 'qr_2');
});

test('buildQuickRequestReplyMessage and sanitizeQuickRequestPayload enforce invariants', () => {
  const msg = buildQuickRequestReplyMessage(SAMPLE_REQUESTS[0], 'Pedro Sopros');
  assert.match(msg, /Clara Sint/);
  assert.match(msg, /108 BPM · Ré menor/);
  assert.match(msg, /Saxofone Tenor/);

  const sanitized = sanitizeQuickRequestPayload({
    authorId: 'user_abc',
    authorName: 'Pedro',
    authorStageName: 'Pedro Sopro',
    authorRegion: 'Centro-Oeste · Goiânia',
    macroRegion: 'Centro-Oeste',
    title: 'Procuro beatmaker para faixa folk-jazz',
    description: 'Tenho linhas de flauta e clarinete gravadas em 24bit prontas para remix.',
    instrumentNeeded: 'Beatmaking',
    genreContext: 'Folk + Jazz',
    bpmAndKey: '94 BPM',
    collabFormat: 'Remoto',
    urgency: 'Esta semana',
    responseCount: 9999,
  });
  assert.equal(sanitized.responseCount, 500);
  assert.equal('isAdmin' in sanitized, false);
});
