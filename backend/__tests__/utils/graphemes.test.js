import { describe, it, expect } from 'vitest';
const { countGraphemesSync } = require('../../src/utils/graphemes.js');

describe('countGraphemesSync', () => {
  it('should count simple ASCII characters correctly', () => {
    const text = 'Hello, world!';
    expect(countGraphemesSync(text)).toBe(13);
  });

  it('should handle an empty string', () => {
    const text = '';
    expect(countGraphemesSync(text)).toBe(0);
  });

  it('should correctly count graphemes in a string with composite emoji', () => {
    // The family emoji is a single grapheme composed of multiple code points
    const text = '👨‍👩‍👧‍👦';
    expect(countGraphemesSync(text)).toBe(1);
    expect(text.length).toBeGreaterThan(1); // Prove that string.length is different
  });

  it('should correctly count a string with mixed characters and emoji', () => {
    const text = 'Hi 👋, this is a test.';
    // 'H', 'i', ' ', '👋', ',', ' ', 't', 'h', 'i', 's', ' ', 'i', 's', ' ', 'a', ' ', 't', 'e', 's', 't', '.'
    expect(countGraphemesSync(text)).toBe(21);
  });

  it('should handle strings with accents and special characters', () => {
    const text = 'crème brûlée';
    expect(countGraphemesSync(text)).toBe(12);
  });
});
