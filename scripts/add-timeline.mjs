#!/usr/bin/env node
// 时间线：一句话追加，不用手改 JS 数组。
// 用法：
//   npm run timeline -- "做了什么" [--date 2026-09-29]
//   npm run timeline   (无参数 → 交互式提问)
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createInterface } from 'node:readline';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dataFile = join(root, 'data', 'site-data.js');
const args = process.argv.slice(2);

function opt(name, def = '') {
  const i = args.findIndex(a => a === name || a.startsWith(name + '='));
  if (i === -1) return def;
  const a = args[i];
  if (a.includes('=')) return a.split('=').slice(1).join('=');
  return args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : def;
}
if (args.includes('-h') || args.includes('--help')) {
  console.log('用法：npm run timeline -- "做了什么" [--date YYYY-MM-DD]');
  process.exit(0);
}
async function ask(q, def = '') {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(res => rl.question(`${q}${def ? `（回车=${def}）` : ''}：`, a => { rl.close(); res((a || '').trim() || def); }));
}

let text = args.find(a => !a.startsWith('--'));
let date = opt('--date', '');
if (!text && process.stdin.isTTY && !args.length) {
  text = await ask('做了什么');
  date = await ask('日期 YYYY-MM-DD', new Date().toISOString().slice(0, 10));
}
if (!text) { console.error('内容不能为空'); process.exit(1); }
date = date || new Date().toISOString().slice(0, 10);

function toTime(v) {
  const t = Date.parse(String(v).trim());
  if (!isNaN(t)) return t;
  const m = String(v).match(/(\d{4})(?:-(\d{1,2})(?:-(\d{1,2}))?)?/);
  return m ? Date.UTC(+m[1], +(m[2] || 1) - 1, +(m[3] || 1)) : NaN;
}
const esc = s => String(s).replace(/\\/g, '\\\\').replace(/"/g, '\\"');

const js = readFileSync(dataFile, 'utf8');
const m = js.match(/const timelineEvents = \[([\s\S]*?)\];/);
if (!m) { console.error('site-data.js 未找到 timelineEvents'); process.exit(1); }
const items = [...m[1].matchAll(/\{\s*date:\s*"((?:[^"\\]|\\.)*)"\s*,\s*text:\s*"((?:[^"\\]|\\.)*)"\s*\}/g)]
  .map(x => ({ date: x[1].replace(/\\"/g, '"'), text: x[2].replace(/\\"/g, '"') }));
if (items.some(e => e.date === date && e.text === text)) { console.log('已存在相同记录，无需添加'); process.exit(0); }
items.push({ date, text });
items.sort((a, b) => {
  const ta = toTime(a.date), tb = toTime(b.date);
  if (isNaN(ta) && isNaN(tb)) return 0;
  if (isNaN(ta)) return 1;
  if (isNaN(tb)) return -1;
  return tb - ta;
});
const block = `const timelineEvents = [\n${items.map(e => `  { date: "${esc(e.date)}", text: "${esc(e.text)}" }`).join(',\n')}\n];`;
writeFileSync(dataFile, js.replace(/const timelineEvents = \[[\s\S]*?\];/, block), 'utf8');
console.log(`已添加：${date} ${text}（共 ${items.length} 条）`);
