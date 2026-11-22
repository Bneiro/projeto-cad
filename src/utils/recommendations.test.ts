import assert from 'node:assert/strict';
import test from 'node:test';
import { SEED_MUSICIANS } from '../data/seedMusicians.ts';
import { recommendComplementaryMusicians, type UserStyleLocationSeed } from './recommendations.ts';

test('recommendComplementaryMusicians excludes self and prioritizes complementary instruments and region', () => {
  const userProfile: UserStyleLocationSeed = {
    id: 'musician_clara_recife',
    ownerId: 'seed_clara',
    stageName: 'Clara Sint',
    region: 'Nordeste · Recife, PE',
    macroRegion: 'Nordeste',
    genres: ['MPB Psicodélica', 'Synthwave'],
    instruments: ['Sintetizador', 'Voz'],
    collabFormat: 'Híbrido',
    openToCrossNiche: true,
    lookingFor: 'Baixistas e percussão regional para EP colaborativo.',
  };

  const results = recommendComplementaryMusicians(userProfile, SEED_MUSICIANS, 3);
  assert.equal(results.length, 3);
  assert.equal(
    results.some((r) => r.musician.id === 'musician_clara_recife'),
    false
  );
  assert.ok(results[0].score >= results[1].score);
  assert.ok(results[1].score >= results[2].score);
  assert.ok(results[0].complementaryInstruments.length > 0);
  assert.ok(results[0].locationHighlight.length > 0);
  assert.ok(results[0].styleHighlight.length > 0);
});

test('recommendComplementaryMusicians favors local/regional collaborators when styles complement', () => {
  const sudesteUser: UserStyleLocationSeed = {
    region: 'Sudeste · São Paulo, SP',
    macroRegion: 'Sudeste',
    genres: ['Eletrônica Experimental', 'Ambient'],
    instruments: ['Sintetizador'],
    collabFormat: 'Híbrido',
    openToCrossNiche: true,
    lookingFor: 'Bateria, percussão ou baixo acústico.',
  };

  const results = recommendComplementaryMusicians(sudesteUser, SEED_MUSICIANS, 3);
  const topRegions = results.slice(0, 2).map((r) => r.musician.macroRegion);
  assert.ok(topRegions.includes('Sudeste'));
});
