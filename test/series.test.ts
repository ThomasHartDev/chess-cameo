import { describe, expect, it } from 'vitest';
import { SERIES, isSeriesId, seriesOrDefault } from '../src/series.js';

describe('series registry', () => {
  it('registers system-design and cli-tools', () => {
    expect(Object.keys(SERIES).sort()).toEqual(['cli-tools', 'system-design']);
  });

  it('isSeriesId guards', () => {
    expect(isSeriesId('cli-tools')).toBe(true);
    expect(isSeriesId('nope')).toBe(false);
  });

  it('seriesOrDefault falls back to system-design', () => {
    expect(seriesOrDefault(undefined).id).toBe('system-design');
    expect(seriesOrDefault('cli-tools').title).toMatch(/Command Line/);
  });
});
