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
const CN = {}; IND.forEach(ind => { CN[ind.c] = (CN[ind.c] || 0) + 1; }); // размер кластера: индикаторы одного кластера получают 1/√n веса
let warSig = 0, dealSig = 0, warMax = 0, dealMax = 0, nato = 0, natoMax = 0, natoYes = false;
IND.forEach((ind, i) => {
  const f = vals[i] / 2;
  const w = 0.65 / Math.sqrt(CN[ind.c] || 1);
  for (const k in ind.e) lo[k] += ind.e[k] * f * w;
  if (ind.side > 0) { warSig += f; warMax++; } else { dealSig += f; dealMax++; }
  if (ind.nato > 0) { nato += ind.nato * f; natoMax += ind.nato; if (vals[i] === 2) natoYes = true; } else if (ind.nato < 0) { nato += ind.nato * f; } // отрицательный вес вычитается
});
const ex = SC.map(s => Math.exp(lo[s.k])), sum = ex.reduce((a, b) => a + b, 0);
const probs = {}; SC.forEach((s, i) => probs[s.k] = Math.round(ex[i] / sum * 100));
let drift = 100 - Object.values(probs).reduce((a, b) => a + b, 0);
if (drift) { const top = SC.slice().sort((a, b) => probs[b.k] - probs[a.k])[0]; probs[top.k] += drift; }
const needle = Math.round((warSig / warMax - dealSig / dealMax) * 100);
const natoLvl = natoMax ? Math.max(0, Math.min(1, nato / natoMax)) : 0;
console.log('Дата оценки:', SEED.date, '| индикаторов:', IND.length);
SC.forEach(s => console.log(`${s.name}: ${probs[s.k]} %`));
console.log('Стрелка:', (needle > 0 ? '+' : '') + needle);
const natoOn = natoLvl >= 0.5 && natoYes; // горит: не меньше половины веса и хотя бы одно «да» в группе
console.log('Флаг НАТО:', natoOn ? 'горит' : natoLvl > 0 ? 'сигналы' : 'нет', `(${natoLvl.toFixed(2)}${natoYes ? ', есть «да»' : ', без «да»'})`);
console.log('Риск столкновения с НАТО:', Math.round(natoLvl * 100), 'из 100');
// тренд относительно предыдущей опубликованной оценки (SEED.hist)
const hist = SEED.hist.slice().sort((a, b) => (a.d < b.d ? -1 : 1));
if (hist.length >= 2 && !process.argv[3]) {
  const pv = hist[hist.length - 2].v; let pn = 0, pm = 0, pw = 0, pd = 0, pwm = 0, pdm = 0;
  IND.forEach((ind, i) => { const f = pv[i] / 2; if (ind.nato > 0) { pn += ind.nato * f; pm += ind.nato; } else if (ind.nato < 0) { pn += ind.nato * f; } if (ind.side > 0) { pw += f; pwm++; } else { pd += f; pdm++; } });
  const pl = Math.round(Math.max(0, Math.min(1, pn / pm)) * 100), pneedle = Math.round((pw / pwm - pd / pdm) * 100);
  console.log(`С прошлой оценки (${hist[hist.length - 2].d}): стрелка ${pneedle} → ${needle}, риск НАТО ${pl} → ${Math.round(natoLvl * 100)}`);
} else if (!process.argv[3]) console.log('Предыдущей оценки в hist нет — тренд появится после следующей.');
