// Brand tech icons for diagram nodes. Each icon is a set of 24x24-viewBox SVG path
// 'd' strings filled with the brand hex, plus the brand color for the node accent.
//
// simple-icons is the source for open brands. Amazon/AWS marks (DynamoDB, S3) and
// Memcached were removed from simple-icons for trademark reasons, so those three carry
// a small hand-authored brand-colored glyph instead — recognizable enough at node
// size ("that's a DynamoDB store") without shipping a trademarked logo.
import {
  siRedis,
  siPostgresql,
  siApachekafka,
  siNginx,
  siCloudflare,
  siRabbitmq,
} from 'simple-icons';

export interface TechIcon {
  /** '#RRGGBB' brand color used for the node accent and the icon fill. */
  hex: string;
  title: string;
  /** 24x24-viewBox path 'd' strings, each filled with `hex`. */
  paths: string[];
}

type SimpleIcon = { path: string; hex: string; title: string };

function fromSimple(icon: SimpleIcon): TechIcon {
  return { hex: `#${icon.hex}`, title: icon.title, paths: [icon.path] };
}

// Hand-authored fallbacks for brands simple-icons no longer ships.
const SUPPLEMENTAL: Record<string, TechIcon> = {
  amazondynamodb: {
    hex: '#4053D6',
    title: 'Amazon DynamoDB',
    // brand-blue stacked records — a key-value / DB mark
    paths: ['M3 5h18v3.2H3z', 'M3 10.4h13v3.2H3z', 'M3 15.8h18v3.2H3z'],
  },
  amazons3: {
    hex: '#569A31',
    title: 'Amazon S3',
    // an object-storage bucket
    paths: [
      'M4.5 6.6h15l-1.5 12.2a1 1 0 0 1-1 .9H7a1 1 0 0 1-1-.9L4.5 6.6z',
      'M3.4 4.4h17.2v2.3H3.4z',
    ],
  },
  memcached: {
    hex: '#398539',
    title: 'Memcached',
    // a memory grid
    paths: ['M4 4h6.6v6.6H4z', 'M13.4 4H20v6.6h-6.6z', 'M4 13.4h6.6V20H4z', 'M13.4 13.4H20V20h-6.6z'],
  },
};

const REGISTRY: Record<string, TechIcon> = {
  redis: fromSimple(siRedis),
  postgresql: fromSimple(siPostgresql),
  apachekafka: fromSimple(siApachekafka),
  nginx: fromSimple(siNginx),
  cloudflare: fromSimple(siCloudflare),
  rabbitmq: fromSimple(siRabbitmq),
  ...SUPPLEMENTAL,
};

/** Look up a brand icon by slug. Unknown slugs return null (caller renders no icon). */
export function getTechIcon(slug?: string): TechIcon | null {
  if (!slug) return null;
  return REGISTRY[slug.toLowerCase()] ?? null;
}

// Neutral, non-brand glyphs drawn in the icon slot when a shape has no `tech` icon,
// so client/compute/component/queue nodes still read at a glance. 24x24 viewBox.
export const SHAPE_GLYPHS: Partial<Record<string, string[]>> = {
  // monitor + stand
  client: ['M3 4.5h18v11H3z', 'M9.5 15.5h5v2.2h2.2V20H7.3v-2.3H9.5z'],
  // CPU / worker: a chip with pins
  compute: [
    'M7 7h10v10H7z',
    'M9.5 4h1.6v2.4H9.5zM12.9 4h1.6v2.4h-1.6z',
    'M9.5 17.6h1.6V20H9.5zM12.9 17.6h1.6V20h-1.6z',
    'M4 9.5h2.4v1.6H4zM4 12.9h2.4v1.6H4z',
    'M17.6 9.5H20v1.6h-2.4zM17.6 12.9H20v1.6h-2.4z',
  ],
  // abstract data structure: stacked layers
  component: [
    'M12 3.2l8 4-8 4-8-4z',
    'M4 11.3l8 4 8-4 0 0-1.9-.95L12 13.4l-6.1-3.05L4 11.3z',
    'M4 15.1l8 4 8-4-1.9-.95L12 17.2l-6.1-3.05L4 15.1z',
  ],
  // message queue: three payload bars
  queue: ['M4 8h4v8H4z', 'M10 8h4v8h-4z', 'M16 8h4v8h-4z'],
};
