#!/usr/bin/env python3
"""Применяет новую оценку к блоку SEED в index.html.

Использование:
  python3 scripts/apply_seed.py seed.json [index.html]

seed.json: {"date": "ГГГГ-ММ-ДД", "vals": [23 числа 0/1/2], "notes": [23 строки]}
Меняет date, vals, notes и ДОБАВЛЯЕТ запись в hist. Больше ничего не трогает.
"""
import json, re, sys

seed_path = sys.argv[1]
html_path = sys.argv[2] if len(sys.argv) > 2 else __file__.rsplit('/scripts/', 1)[0] + '/index.html'
seed = json.load(open(seed_path, encoding='utf-8'))
s = open(html_path, encoding='utf-8').read()

n_ind = len(re.findall(r"^\s*\{n:'", s, flags=re.M))
assert len(seed['vals']) == n_ind, f"vals: {len(seed['vals'])} != {n_ind} индикаторов"
assert len(seed['notes']) == n_ind, f"notes: {len(seed['notes'])} != {n_ind}"
assert all(v in (0, 1, 2) for v in seed['vals']), "vals только 0/1/2"
assert re.fullmatch(r"\d{4}-\d{2}-\d{2}", seed['date'])

def sub_once(pattern, repl, text, flags=0):
    new, n = re.subn(pattern, repl, text, flags=flags)
    assert n == 1, f"{pattern!r}: найдено {n}, ожидалось 1"
    return new

def js_str(t):
    return "'" + t.replace('\\', '\\\\').replace("'", "\\'").replace('\n', ' ') + "'"

vals_js = '[' + ','.join(map(str, seed['vals'])) + ']'
notes_js = ',\n'.join('      ' + js_str(t) for t in seed['notes'])
hist_entry = json.dumps({"d": seed['date'], "v": seed['vals']}, ensure_ascii=False)

s = sub_once(r"(const SEED = \{\n\s*date:)'[^']*'", r"\g<1>'" + seed['date'] + "'", s)
s = sub_once(r"(const SEED = \{\n\s*date:'[^']*',\n\s*vals:)\[[^\]]*\]", r"\g<1>" + vals_js, s)
s = sub_once(r"(const SEED = \{[\s\S]*?notes:\[\n)[\s\S]*?(\n\s*\],\n\s*hist:)", lambda m: m.group(1) + notes_js + m.group(2), s)
s = sub_once(r"(hist:\[[\s\S]*?)(\]\n\s*\};)", lambda m: m.group(1) + ',' + hist_entry + m.group(2), s)

open(html_path, 'w', encoding='utf-8').write(s)
print('ok: SEED обновлён на', seed['date'])
