#!/usr/bin/env node
// 同步脚本：以 posts/md/*.md 的 front-matter 为唯一事实来源，
// 自动重写 data/site-data.js 的 posts 数组、feed.xml、sitemap.xml。
// 用法：node scripts/sync.mjs [--check]
import { readdirSync, readFileSync, writeFileSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const mdDir = join(root, 'posts', 'md');
const dataFile = join(root, 'data', 'site-data.js');
const feedFile = join(root, 'feed.xml');
const sitemapFile = join(root, 'sitemap.xml');
const SITE = 'https://bpjro.github.io';

function parseFM(text) {
  const m = String(text).match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  const meta = {};
  if (!m) return { meta, body: text };
  for (const line of m[1].split(/\r?\n/)) {
    if (!line.trim() || line.trim().startsWith('#')) continue;
    const idx = line.indexOf(':');
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    let val = line.slice(idx + 1).trim();
    if (val.length >= 2) {
      const f = val[0], l = val[val.length - 1];
      if ((f === '"' && l === '"') || (f === "'" && l === "'")) val = val.slice(1, -1);
    }
    if (key) meta[key] = val;
  }
  return { meta, body: String(text).slice(m[0].length) };
}

function toTime(v) {
  if (!v) return NaN;
  const t = Date.parse(String(v).trim());
  if (!isNaN(t)) return t;
  const m = String(v).match(/(\d{4})(?:-(\d{1,2})(?:-(\d{1,2}))?)?/);
  if (!m) return NaN;
  return Date.UTC(+m[1], + (m[2] || 1) - 1, +(m[3] || 1));
}

function escXml(s) {
  return String(s ?? '').replace(/[<>&'"]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' }[c]));
}
function escJs(s) {
  return String(s ?? '').replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\r?\n/g, ' ');
}

const files = readdirSync(mdDir).filter(f => f.endsWith('.md')).sort();
const posts = [];
for (const f of files) {
  const slug = f.replace(/\.md$/, '');
  if (!/^[A-Za-z0-9_-]+$/.test(slug)) { console.warn(`跳过非法文件名: ${f}（仅允许字母数字/_/-）`); continue; }
  const full = join(mdDir, f);
  const raw = readFileSync(full, 'utf8');
  const { meta, body } = parseFM(raw);
  // 缺字段自动补齐：标题默认用文件名，日期默认用文件修改时间，摘要默认取正文首行
  let title = (meta.title || '').trim() || slug;
  let date = (meta.date || '').trim();
  if (!date || isNaN(toTime(date))) {
    const mt = statSync(full).mtime;
    date = `${mt.getFullYear()}-${String(mt.getMonth() + 1).padStart(2, '0')}-${String(mt.getDate()).padStart(2, '0')}`;
    console.log(`补日期 ${f} -> ${date}`);
  }
  let summary = (meta.summary || '').trim();
  if (!summary) {
    const first = String(body).split(/\r?\n/).map(s => s.trim()).find(s => s && !s.startsWith('#'));
    summary = (first || '').slice(0, 80);
    if (summary) console.log(`补摘要 ${f} -> ${summary}`);
  }
  if (!meta.title) console.log(`补标题 ${f} -> ${title}`);
  posts.push({ slug, title, date, summary });
}
posts.sort((a, b) => {
  const ta = toTime(a.date), tb = toTime(b.date);
  if (isNaN(ta) && isNaN(tb)) return a.slug.localeCompare(b.slug);
  if (isNaN(ta)) return 1;
  if (isNaN(tb)) return -1;
  return tb - ta || a.slug.localeCompare(b.slug);
});

// 1) 重写 site-data.js 的 posts 数组（保留 profile/highlights/timeline）
let js = readFileSync(dataFile, 'utf8');
const oldSlugs = new Set([...js.matchAll(/slug:\s*"([^"]+)"/g)].map(m => m[1]));
const newOnes = posts.filter(p => !oldSlugs.has(p.slug)).map(p => p.slug);
if (newOnes.length) console.log(`发现新博文：${newOnes.join(', ')}`);
const block = `const posts = [\n${posts.map(p => `  { slug: "${escJs(p.slug)}", title: "${escJs(p.title)}", date: "${escJs(p.date)}", summary: "${escJs(p.summary)}" }`).join(',\n')}\n];`;
if (!/const posts = \[[\s\S]*?\];/.test(js)) { console.error('site-data.js 未找到 posts 数组，未写入'); process.exit(1); }
const next = js.replace(/const posts = \[[\s\S]*?\];/, block);

// 2) feed.xml
const feed = `<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0">\n<channel>\n<title>BPJRO的个人主页</title>\n<link>${SITE}/</link>\n<description>BPJRO 最近文章</description>\n<language>zh-CN</language>\n${posts.map(p => {
  const d = new Date(toTime(p.date));
  const pub = isNaN(d) ? new Date().toUTCString() : d.toUTCString();
  return `<item><title>${escXml(p.title)}</title><link>${SITE}/posts/post.html?slug=${escXml(p.slug)}</link><pubDate>${pub}</pubDate><description>${escXml(p.summary)}</description></item>`;
}).join('\n')}\n</channel>\n</rss>\n`;

// 3) sitemap.xml
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url><loc>${SITE}/</loc><changefreq>weekly</changefreq></url>\n  <url><loc>${SITE}/posts/</loc><changefreq>weekly</changefreq></url>\n${posts.map(p => `  <url><loc>${SITE}/posts/post.html?slug=${escXml(p.slug)}</loc></url>`).join('\n')}\n</urlset>\n`;

if (process.argv.includes('--check')) {
  const cur1 = readFileSync(dataFile, 'utf8');
  const cur2 = readFileSync(feedFile, 'utf8');
  const cur3 = readFileSync(sitemapFile, 'utf8');
  const dirty = cur1 !== next || cur2 !== feed || cur3 !== sitemap;
  console.log(dirty ? 'OUTDATED：运行 node scripts/sync.mjs 同步' : 'OK：已同步');
  process.exit(dirty ? 1 : 0);
}

writeFileSync(dataFile, next, 'utf8');
writeFileSync(feedFile, feed, 'utf8');
writeFileSync(sitemapFile, sitemap, 'utf8');
console.log(`已同步 ${posts.length} 篇：site-data.js / feed.xml / sitemap.xml`);
