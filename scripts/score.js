#!/usr/bin/env node
// Считает показание барометра из index.html (та же формула, что на странице).
// Использование: node scripts/score.js [index.html] [vals через запятую]
const fs = require('fs'), vm = require('vm');
const file = process.argv[2] || __dirname + '/../index.html';
const src = fs.readFileSync(file, 'utf8');
const grab = n => { const m = src.match(new RegExp('const ' + n + ' = ([\\s\\S]*?);\\n')); if (!m) throw new Error(n + ' not found'); return vm.runInNewContext('(' + m[1] + ')'); };
const SC = grab('SC'), IND = grab('IND'), SEED = grab('SEED');
const vals = process.argv[3] ? process.argv[3].split(',').map(Number) : SEED.vals;
if (vals.length !== IND.length) throw new Error('vals length ' + vals.length + ' != ' + IND.length);
const lo = {}; SC.forEach(s => lo[s.k] = Math.log(s.base / 100));
let warSig = 0, dealSig = 0, warMax = 0, dealMax = 0, nato = 0, natoMax = 0;
IND.forEach((ind, i) => {
  const f = vals[i] / 2;
  for (const k in ind.e) lo[k] += ind.e[k] * f * 0.65;
  if (ind.side > 0) { warSig += f; warMax++; } else { dealSig += f; dealMax++; }
  if (ind.nato) { nato += ind.nato * f; natoMax += ind.nato; }
});
const ex = SC.map(s => Math.exp(lo[s.k])), sum = ex.reduce((a, b) => a + b, 0);
const probs = {}; SC.forEach((s, i) => probs[s.k] = Math.round(ex[i] / sum * 100));
let drift = 100 - Object.values(probs).reduce((a, b) => a + b, 0);
if (drift) { const top = SC.slice().sort((a, b) => probs[b.k] - probs[a.k])[0]; probs[top.k] += drift; }
const needle = Math.round((warSig / warMax - dealSig / dealMax) * 100);
const natoLvl = natoMax ? nato / natoMax : 0;
console.log('Дата оценки:', SEED.date, '| индикаторов:', IND.length);
SC.forEach(s => console.log(`${s.name}: ${probs[s.k]} %`));
console.log('Стрелка:', (needle > 0 ? '+' : '') + needle);
console.log('Флаг НАТО:', natoLvl >= 0.5 ? 'горит' : natoLvl > 0 ? 'сигналы' : 'нет', `(${natoLvl.toFixed(2)})`);
