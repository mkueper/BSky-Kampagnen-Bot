#!/usr/bin/env node
/**
 * scripts/setMastoSegment.js
 *
 * Setzt/merged plattformspezifische Mastodon-Identifikatoren (statusId/uri)
 * für ein Thread-Segment in den Thread-Metadaten.
 *
 * Nutzung:
 *   NODE_ENV=development node scripts/setMastoSegment.js \
 *     --thread 6 --sequence 0 \
 *     --statusId 115325927678392403 \
 *     --uri https://mastodon.social/@Mkueper/115325927678392403
 */
 
const { sequelize, Thread, ThreadSkeet } = require('../src/models');

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i += 1) {
    const key = argv[i];
    if (!key.startsWith('--')) continue;
    const name = key.slice(2);
    const value = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : true;
    args[name] = value;
    if (value !== true) i += 1;
  }
  return args;
}

function toNumber(value, fallback = null) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function ensureObject(v) {
  if (!v) return {};
  if (typeof v === 'string') {
    try { return JSON.parse(v) || {}; } catch { return {}; }
  }
  return typeof v === 'object' && !Array.isArray(v) ? { ...v } : {};
}

function extractMastodonStatusId(uri) {
  if (!uri) return undefined;
  try {
    const parsed = new URL(String(uri));
    const parts = parsed.pathname.split('/').filter(Boolean);
    return parts.pop() || undefined;
  } catch {
    const parts = String(uri).split('/').filter(Boolean);
    return parts.pop() || undefined;
  }
}

async function main() {
  const args = parseArgs(process.argv);
  const threadId = toNumber(args.thread);
  const seq = toNumber(args.sequence, 0);

  if (!threadId) {
    console.error('Usage: node scripts/setMastoSegment.js --thread <id> [--sequence <n> --statusId <id> --uri <url>] | [--statusIds csv --uris csv] | [--file mapping.json]');
    process.exit(2);
  }

  const t = await Thread.findByPk(threadId, { include: [{ model: ThreadSkeet, as: 'segments', order: [['sequence','ASC']] }] });
  if (!t) {
    console.error(`Thread ${threadId} nicht gefunden.`);
    process.exit(1);
  }

  // Build input list
  let items = [];
  if (args.file) {
    const fs = require('fs');
    try {
      const raw = fs.readFileSync(args.file, 'utf8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        items = parsed.map((it) => ({
          sequence: toNumber(it.sequence, 0),
          statusId: it.statusId ? String(it.statusId) : undefined,
          uri: it.uri ? String(it.uri) : undefined,
        }));
      }
    } catch (e) {
      console.error('Konnte Mapping-Datei nicht lesen:', e?.message || e);
      process.exit(2);
    }
  } else if (args.statusIds || args.uris) {
    const statusIds = String(args.statusIds || '').split(',').map((s) => s.trim()).filter(Boolean);
    const uris = String(args.uris || '').split(',').map((s) => s.trim()).filter(Boolean);
    const count = Math.max(statusIds.length, uris.length);
    for (let i = 0; i < count; i += 1) {
      items.push({ sequence: i, statusId: statusIds[i], uri: uris[i] });
    }
  } else if (args.statusId || args.uri) {
    if (!args.statusId && !args.uri) {
      console.error('Single-Modus benötigt --statusId oder --uri');
      process.exit(2);
    }
    items.push({ sequence: seq, statusId: args.statusId ? String(args.statusId) : undefined, uri: args.uri ? String(args.uri) : undefined });
  } else {
    console.error('Keine Zuordnung übergeben. Verwende --statusIds/--uris (CSV), --file <json> oder --sequence/--statusId[/--uri].');
    process.exit(2);
  }

  if (items.length === 0) {
    console.log('Nichts zu setzen.');
    return;
  }

  const metadata = ensureObject(t.metadata);
  const platformResults = ensureObject(metadata.platformResults);
  const masto = ensureObject(platformResults.mastodon);
  const segments = Array.isArray(masto.segments) ? [...masto.segments] : [];

  const summary = [];
  for (const it of items) {
    if (!it.statusId && !it.uri) continue;
    // Falls nur URI übergeben wurde, Status-ID daraus ableiten
    if (!it.statusId && it.uri) {
      it.statusId = extractMastodonStatusId(it.uri);
    }
    // Wenn Thread weniger Segmente hat, überspringen
    const maxSeq = Array.isArray(t.segments) ? t.segments.length - 1 : null;
    if (maxSeq != null && (it.sequence < 0 || it.sequence > maxSeq)) {
      summary.push({ sequence: it.sequence, ok: false, reason: 'sequence_out_of_range' });
      continue;
    }
    const idx = segments.findIndex((s) => Number(s?.sequence) === Number(it.sequence));
    const base = idx >= 0 ? ensureObject(segments[idx]) : { sequence: Number(it.sequence), status: 'sent' };
    const next = { ...base };
    if (it.statusId) next.statusId = String(it.statusId);
    if (it.uri) next.uri = String(it.uri);
    if (idx >= 0) segments[idx] = next; else segments.push(next);
    summary.push({ sequence: next.sequence, ok: true, statusId: next.statusId, uri: next.uri });
  }

  masto.segments = segments;
  masto.status = masto.status || 'sent';
  platformResults.mastodon = masto;
  metadata.platformResults = platformResults;

  await t.update({ metadata });
  console.log(JSON.stringify({ threadId, updated: summary }, null, 2));
}

main()
  .catch((err) => {
    console.error('Fehler:', err?.message || err);
    process.exit(1);
  })
  .finally(() => sequelize.close());
