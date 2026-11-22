import assert from 'node:assert/strict';
import test from 'node:test';
import { resolveInitialTheme, toggleThemeMode } from './theme.ts';

test('resolveInitialTheme prefers explicit stored value over system preference', () => {
  assert.equal(resolveInitialTheme('dark', false), 'dark');
  assert.equal(resolveInitialTheme('light', true), 'light');
});

test('resolveInitialTheme falls back to system preference when unset or invalid', () => {
  assert.equal(resolveInitialTheme(null, true), 'dark');
  assert.equal(resolveInitialTheme(undefined, false), 'light');
  assert.equal(resolveInitialTheme('invalid', true), 'dark');
});

test('toggleThemeMode switches cleanly between light and dark', () => {
  assert.equal(toggleThemeMode('light'), 'dark');
  assert.equal(toggleThemeMode('dark'), 'light');
});
