#!/usr/bin/env node
// 新建文章：一键生成 md + 自动同步 site-data/feed/sitemap。
// 用法：
//   npm run new -- "标题" --summary "摘要" [--slug my-slug] [--date 2026-09-30] [--open]
//   不带参数直接 npm run new 会进入交互式提问。
import { writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync, spawnSync } from 'node:child_process';
import { createInterface } from 'node:readline';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
let title = args.find(a => !a.startsWith('--'));
function opt(name, def = '') {
  const i = args.findIndex(a => a === name || a.startsWith(name + '='));
  if (i === -1) return def;
  const a = args[i];
  if (a.includes('=')) return a.split('=').slice(1).join('=');
  return args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : def;
}
if (args.includes('-h') || args.includes('--help')) {
  console.log('用法：npm run new -- "标题" --summary "摘要" [--slug my-slug] [--date YYYY-MM-DD] [--open]');
  process.exit(0);
}

async function ask(q, def = '') {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const hint = def ? `（回车=${def}）` : '';
  return new Promise(res => rl.question(`${q}${hint}：`, a => { rl.close(); res((a || '').trim() || def); }));
}

// 无参数 → 交互式（不用记 flags）
if (!title) {
  title = await ask('标题');
  if (!title) { console.error('标题不能为空'); process.exit(1); }
  // 非交互环境（CI）直接退出，避免卡住
  if (!process.stdin.isTTY) process.exit(1);
}
let summary = opt('--summary', '');
let slug = opt('--slug', '');
let date = opt('--date', '');
if (!summary && process.stdin.isTTY && !args.length) summary = await ask('摘要', '');
if (!date && process.stdin.isTTY && !args.length) date = await ask('日期 YYYY-MM-DD', new Date().toISOString().slice(0, 10));
if (!slug && process.stdin.isTTY && !args.length) slug = await ask('slug（回车自动生成）', '');
if (!slug) {
  const d = (date || new Date().toISOString().slice(0, 10)).replaceAll('-', '');
  slug = 'post' + d;
}
// slug 冲突自动加后缀，不报错重来
let n = 2;
const base = slug;
while (existsSync(join(root, 'posts', 'md', slug + '.md'))) { slug = `${base}-${n++}`; }
if (slug !== base) console.log(`slug 已存在，改用 ${slug}`);
if (!/^[A-Za-z0-9_-]+$/.test(slug)) { console.error('slug 仅允许字母数字/_/-'); process.exit(1); }
date = date || new Date().toISOString().slice(0, 10);
const file = join(root, 'posts', 'md', slug + '.md');

const md = `---\ntitle: ${title}\ndate: ${date}\nsummary: ${summary}\n---\n\n## ${title}\n\n正文从这里开始写……\n`;
writeFileSync(file, md, 'utf8');
console.log(`已创建 posts/md/${slug}.md`);
execSync('node scripts/sync.mjs', { cwd: root, stdio: 'inherit' });
if (args.includes('--open')) spawnSync('code', [file], { stdio: 'inherit', shell: true });
console.log(`下一步：编辑 posts/md/${slug}.md 写正文，npm run preview 本地预览`);
