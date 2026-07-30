/**
 * Film series registry — both share dialogue + chess eval-swing format.
 * See docs/SERIES.md and docs/FINAL-INTERVIEW-FORMAT.md.
 */

export type SeriesId = 'system-design' | 'cli-tools';

export interface FilmSeries {
  id: SeriesId;
  /** Human title on Film / thumbnails */
  title: string;
  /** One-line pitch */
  tagline: string;
  /** Default series string written into episode.json */
  seriesLabel: string;
}

export const SERIES: Record<SeriesId, FilmSeries> = {
  'system-design': {
    id: 'system-design',
    title: 'System Design, Out Loud',
    tagline: 'Architecture interviews with a live chess match',
    seriesLabel: 'System Design, Out Loud',
  },
  'cli-tools': {
    id: 'cli-tools',
    title: 'Command Line, Out Loud',
    tagline: 'Tools agents actually use — basic through advanced',
    seriesLabel: 'Command Line, Out Loud',
  },
};

export function isSeriesId(s: string): s is SeriesId {
  return s === 'system-design' || s === 'cli-tools';
}

export function seriesOrDefault(id: string | undefined): FilmSeries {
  if (id && isSeriesId(id)) return SERIES[id];
  return SERIES['system-design'];
}
