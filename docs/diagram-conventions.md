# Diagram conventions

The architecture diagram in `remotion/TVFrame.tsx` follows a fixed visual grammar so a
viewer can read a frame at a glance: a cylinder is always a store, a Redis node always
carries the Redis mark, and so on. Any new topic (`src/episode/topics.ts` or a
`src/episode/projects/*.json` file) should follow these rules so the whole series stays
consistent.

Each `DiagramNode` (see `src/episode/types.ts`) takes two optional fields:

- `shape` — the visual form. Defaults to `service`.
- `tech` — a brand slug that renders the brand icon top-left and tints the node accent
  with the brand color.

## Shapes (always followed)

| `shape`     | Renders as                                             | Use for |
|-------------|--------------------------------------------------------|---------|
| `db`        | a **cylinder**                                         | databases / key-value stores. Databases are ALWAYS cylinders, never rectangles. |
| `cache`     | a **cylinder** with a distinct top-cap accent (Redis red) | in-memory stores (Redis, Memcached). |
| `queue`     | a rectangle with an **open (dashed) right end** + message-bar glyph | queues & streams (Kafka, RabbitMQ, SQS). |
| `client`    | rounded rect + monitor glyph                           | users, browsers, apps, upstream posters/readers. |
| `compute`   | rounded rect + CPU glyph                               | workers / processors (fan-out worker, merge, shard). |
| `component` | rounded rect + stacked-layers glyph                    | abstract algorithmic nodes (a sketch, a heap, a token bucket, an id generator). |
| `service`   | rounded rect (default)                                 | APIs, gateways, app logic. |

## Tech icons

Set `tech` to a brand slug. The icon is drawn top-left and the brand color becomes the
node's border/accent (a highlighted node still overrides to amber). Icons come from the
**`simple-icons`** package where available, with hand-authored fallbacks for brands
simple-icons no longer ships.

Supported slugs (registry in `remotion/diagram-icons.ts`):

- From `simple-icons`: `redis`, `postgresql`, `apachekafka`, `nginx`, `cloudflare`, `rabbitmq`.
- Hand-authored (simple-icons dropped the AWS marks + Memcached for trademark reasons):
  `amazondynamodb`, `amazons3`, `memcached`.

An unknown slug falls back to no icon (it never crashes). A `component` node with no
brand renders a neutral stacked-layers glyph.

Convention shorthand:

- any database / key-value store → `shape: 'db'` (cylinder). Brand it (`tech: 'postgresql'`, `'amazondynamodb'`, …) when the store is a named product.
- any Redis / in-memory cache → `shape: 'cache', tech: 'redis'`.
- any queue / stream / log → `shape: 'queue'`, plus `tech: 'apachekafka'` / `'rabbitmq'` when named.

## Legend

`TVFrame` renders a compact legend derived from the nodes actually in the episode (one chip
per distinct `tech`, plus one per distinct store/queue shape with no brand icon). It only
shows what the episode uses, so no maintenance is needed per topic. Plain
service/client/compute nodes stay out of it.

## What is NOT in this frame

The chess cameo is rendered as a **separate** image per beat (`chess/beat-NN.png`) so it can
be mirrored on a physical board. The main frame (`frames/beat-NN.png`) is the architecture
diagram + dialogue only. Do not add the board back into `TVFrame`.
