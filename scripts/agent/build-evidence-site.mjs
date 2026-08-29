// Builds a static evidence page from the screenshots and video an agent
// captured while verifying a PR, ready for `eas deploy`.
//
// Usage: node scripts/agent/build-evidence-site.mjs <evidenceDir> "<subject>" "<verdict>"
//
// <subject> is the page label, e.g. "PR #12". The verdict's leading keyword
// drives the badge: PASS is green, INCONCLUSIVE amber, anything else red.
//
// Only media is copied into site/. The prompt, diff, raw JSONL transcript, and
// the argent config also live in the evidence dir and must not be published —
// the config carries a session bearer token.
import { cpSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const [evidenceDir, subject, verdict] = process.argv.slice(2);
if (!evidenceDir) {
  console.error('usage: build-evidence-site.mjs <evidenceDir> "<subject>" "<verdict>"');
  process.exit(1);
}

const siteDir = join(evidenceDir, 'site');
mkdirSync(siteDir, { recursive: true });

// Natural sort so "2-x.png" precedes "10-x.png".
const files = readdirSync(evidenceDir)
  .filter((f) => /\.(png|jpg|jpeg|mp4|mov)$/i.test(f))
  .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

for (const f of files) cpSync(join(evidenceDir, f), join(siteDir, f));

const esc = (s) =>
  String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

// "2-ratios-adjusted.png" -> "Ratios adjusted"
const caption = (f) => {
  const base = f
    .replace(/\.[^.]+$/, '')
    .replace(/^\d+[-_ ]*/, '')
    .replace(/[-_]+/g, ' ')
    .trim();
  return base ? base.charAt(0).toUpperCase() + base.slice(1) : f;
};

const images = files.filter((f) => /\.(png|jpg|jpeg)$/i.test(f));
const videos = files.filter((f) => /\.(mp4|mov)$/i.test(f));

// The report is everything after the verdict line. Rendered as preformatted
// text rather than parsed markdown — no dependencies, and it cannot inject
// markup into the page.
let report = '';
try {
  report = readFileSync(join(evidenceDir, 'verdict.md'), 'utf8').split('\n').slice(1).join('\n').trim();
} catch {
  report = '';
}

const keyword = (String(verdict).match(/^[A-Za-z-]+/)?.[0] ?? 'FAIL').toUpperCase();
const tone = keyword === 'PASS' ? 'pass' : keyword === 'INCONCLUSIVE' ? 'unsure' : 'fail';
const detail = String(verdict).replace(/^[A-Za-z-]+\s*:?\s*/, '');

const imageCards = images
  .map(
    (f, i) => `<a class="shot" href="./${esc(f)}" target="_blank" rel="noopener">
  <span class="shot-num">${i + 1}</span>
  <img src="./${esc(f)}" alt="${esc(caption(f))}" loading="lazy" />
  <span class="shot-caption">${esc(caption(f))}</span>
</a>`
  )
  .join('\n');

const videoBlocks = videos
  .map(
    (f) => `<figure class="clip">
  <video src="./${esc(f)}" controls muted playsinline></video>
  <figcaption>${esc(caption(f))}</figcaption>
</figure>`
  )
  .join('\n');

writeFileSync(
  join(siteDir, 'index.html'),
  `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Pancake Theory · ${esc(subject)} verification</title>
<style>
  /* Tokens mirror src/constants/theme.ts so the page reads like the app. */
  :root {
    --bg: #ffffff; --card: #f4f5f6; --border: #e2e4e6;
    --text: #11181C; --dim: #687076;
    --brand: #0a7ea4;
    --pass: #0a7f3f; --fail: #c62828; --unsure: #9a6700;
    --on-badge: #ffffff;
    --mono: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', monospace;
  }
  @media (prefers-color-scheme: dark) {
    :root {
      --bg: #151718; --card: #1e2122; --border: #2b2f31;
      --text: #ECEDEE; --dim: #9BA1A6;
      --brand: #0c96c5;
      --pass: #4ade80; --fail: #ff6b6b; --unsure: #e0b341;
      --on-badge: #11181C;
    }
  }
  * { box-sizing: border-box; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    background: var(--bg); color: var(--text);
    max-width: 1080px; margin: 0 auto; padding: 32px 24px 64px;
  }
  header { display: flex; align-items: baseline; gap: 12px; flex-wrap: wrap; }
  .brand { font-size: 22px; font-weight: 700; letter-spacing: -0.02em; }
  .brand .accent { color: var(--brand); }
  .subject { color: var(--dim); font-size: 15px; font-family: var(--mono); }
  .verdict {
    display: flex; align-items: center; gap: 12px;
    margin: 20px 0 8px; padding: 14px 16px;
    background: var(--card); border-radius: 10px;
  }
  .badge {
    flex: none; padding: 4px 12px; border-radius: 999px;
    font-weight: 700; font-size: 13px; letter-spacing: 0.04em;
    color: var(--on-badge); background: var(--${tone});
  }
  .verdict p { margin: 0; font-size: 15px; line-height: 1.45; }
  .meta { color: var(--dim); font-size: 13px; margin: 0 0 28px; }
  h2 {
    font-size: 13px; font-weight: 600; text-transform: uppercase;
    letter-spacing: 0.08em; color: var(--dim); margin: 32px 0 14px;
  }
  .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; }
  .shot {
    position: relative; display: flex; flex-direction: column;
    background: var(--card); border-radius: 10px; padding: 10px;
    text-decoration: none; transition: box-shadow 0.15s ease;
  }
  .shot:hover { box-shadow: 0 0 0 2px var(--brand); }
  .shot img {
    width: 100%; height: 380px; object-fit: contain;
    border-radius: 7px; background: var(--border);
  }
  .shot-num {
    position: absolute; top: 18px; left: 18px;
    width: 24px; height: 24px; border-radius: 7px;
    display: flex; align-items: center; justify-content: center;
    background: var(--brand); color: #ffffff;
    font-size: 12px; font-weight: 700; font-family: var(--mono);
  }
  .shot-caption {
    color: var(--text); font-size: 13px; font-weight: 600;
    text-align: center; padding: 10px 4px 4px;
  }
  .clip { margin: 0 0 20px; }
  .clip video { width: 100%; max-height: 70vh; border-radius: 10px; background: var(--card); }
  .clip figcaption { color: var(--dim); font-size: 13px; margin-top: 8px; }
  .report {
    background: var(--card); border-radius: 10px; padding: 16px 18px;
    font-size: 14px; line-height: 1.55; white-space: pre-wrap;
    overflow-x: auto; margin: 0;
  }
  .empty { color: var(--dim); }
  footer {
    margin-top: 40px; color: var(--dim); font-size: 12px; font-family: var(--mono);
    border-top: 1px solid var(--border); padding-top: 16px;
  }
</style>
</head>
<body>
<header>
  <span class="brand">Pancake <span class="accent">Theory</span></span>
  <span class="subject">${esc(subject)} · verification</span>
</header>

<div class="verdict">
  <span class="badge">${esc(keyword)}</span>
  <p>${esc(detail) || esc(verdict)}</p>
</div>
<p class="meta">Captured by an agent driving the app on an EAS cloud simulator. Click a screenshot to open it full size.</p>

${images.length ? `<h2>Screenshots</h2>\n<div class="grid">\n${imageCards}\n</div>` : ''}
${videos.length ? `<h2>Recording</h2>\n${videoBlocks}` : ''}
${!files.length ? '<p class="empty">No media was captured during this run.</p>' : ''}
${report ? `<h2>Report</h2>\n<pre class="report">${esc(report)}</pre>` : ''}

<footer>Generated ${new Date().toISOString().slice(0, 16).replace('T', ' ')} UTC · EAS Hosting</footer>
</body>
</html>
`
);

console.log(`Evidence site written to ${siteDir} (${images.length} images, ${videos.length} videos)`);
