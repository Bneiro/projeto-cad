import test from 'node:test';
import assert from 'node:assert/strict';
import { SEED_MUSICIANS } from '../data/seedMusicians';
import {
  buildNetworkScatterData,
  DEFAULT_FILTERS,
  extractFilterOptions,
  filterMusicians,
  formatDurationPtBr,
} from './filters';
import { encodeGmailRawMessage } from './validation';

test('filterMusicians filters by macroRegion, genre, instrument, and instant search by name/instrument/region', () => {
  const all = filterMusicians(SEED_MUSICIANS, DEFAULT_FILTERS);
  assert.equal(all.length, 6);

  const nordeste = filterMusicians(SEED_MUSICIANS, {
    ...DEFAULT_FILTERS,
    macroRegion: 'Nordeste',
  });
  assert.equal(nordeste.length, 1);
  assert.equal(nordeste[0].stageName, 'Clara Sint');

  const bassists = filterMusicians(SEED_MUSICIANS, {
    ...DEFAULT_FILTERS,
    instrument: 'Baixo Elétrico',
  });
  assert.equal(bassists.length, 1);
  assert.equal(bassists[0].stageName, 'Teu Groove');

  const byName = filterMusicians(SEED_MUSICIANS, {
    ...DEFAULT_FILTERS,
    search: 'Ribeiro',
  });
  assert.equal(byName.length, 1);
  assert.equal(byName[0].stageName, 'Teu Groove');

  const byInstrument = filterMusicians(SEED_MUSICIANS, {
    ...DEFAULT_FILTERS,
    search: 'Saxofone',
  });
  assert.equal(byInstrument.length, 1);
  assert.equal(byInstrument[0].stageName, 'Nogueira Sopro');

  const byRegion = filterMusicians(SEED_MUSICIANS, {
    ...DEFAULT_FILTERS,
    search: 'Belém',
  });
  assert.equal(byRegion.length, 1);
  assert.equal(byRegion[0].stageName, 'Maré Sintética');
});

test('buildNetworkScatterData maps published musicians across region and genre axes', () => {
  const scatter = buildNetworkScatterData(SEED_MUSICIANS);
  assert.equal(scatter.points.length, 6);
  assert.ok(scatter.genreLabels.length >= 5);
  assert.ok(scatter.regionLabels.includes('Nordeste'));
  const claraPoint = scatter.points.find((p) => p.stageName === 'Clara Sint');
  assert.ok(claraPoint);
  assert.equal(claraPoint.x, 1);
  assert.equal(claraPoint.z, 3);
});

test('extractFilterOptions returns sorted unique regions, genres, and instruments', () => {
  const options = extractFilterOptions(SEED_MUSICIANS);
  assert.ok(options.regions.includes('Nordeste'));
  assert.ok(options.regions.includes('Norte'));
  assert.ok(options.genres.includes('Guitarrada'));
  assert.ok(options.instruments.includes('Sintetizador'));
});

test('formatDurationPtBr formats minutes and hours cleanly', () => {
  assert.equal(formatDurationPtBr(45), '45 min');
  assert.equal(formatDurationPtBr(60), '1h');
  assert.equal(formatDurationPtBr(90), '1h 30min');
});

test('encodeGmailRawMessage encodes UTF-8 recipient, subject, and body in URL-safe base64', () => {
  const encoded = encodeGmailRawMessage({
    to: 'clara.sint@exemplo.elo.mus.br',
    subject: 'Sessão de Jam: Síntese & Baixo',
    body: 'Olá Clara! Vamos agendar nossa gravação?',
  });
  assert.ok(encoded.length > 20);
  assert.equal(encoded.includes('+'), false);
  assert.equal(encoded.includes('/'), false);
  assert.equal(encoded.includes('='), false);

  assert.throws(() =>
    encodeGmailRawMessage({
      to: 'invalido',
      subject: 'Teste',
      body: 'Corpo',
    })
  );
});
