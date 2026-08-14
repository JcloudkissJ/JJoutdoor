/**
 * 숲나들e 100대명산 CSV 판독 — 대표 등산로와 공식 소요시간을 그대로 꺼낸다.
 *
 * 계산하지 않는다. 기관이 적어둔 총 소요시간("약 4시간 30분")을 분으로 바꾸는 것이
 * 전부이며, 구간 시간을 더하지 않는다. 합계는 이미 출처에 있다.
 *
 * 이 자료가 주지 않는 것: **거리(km). 100건 전부 없다.** 다른 데서 끌어오지 않는다 —
 * 이름 조인은 동명이산 오염이 확인된 경로다.
 *
 * 사용법:
 *   node scripts/forest100.mjs              # 100개 전부
 *   node scripts/forest100.mjs 북한산 관악산   # 일부만
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DOWN_DIR = path.join(ROOT, 'data/Down');
const OUT = path.join(ROOT, 'data/extracted/forest100-courses.json');

const SOURCE_URL = 'https://www.data.go.kr/data/15112801/fileData.do';

/** CSV 열 순서. 상류가 열을 바꾸면 헤더 검사에서 멈춘다. */
const HEAD = [
  '명산_이름',
  '명산_소재지',
  '명산_높이',
  '난이도',
  '특징_및_선정_이유',
  '산_개요',
  '산행포인트',
  '산행코스',
  '교통정보',
  'Y좌표',
  'X좌표',
];
const C = Object.fromEntries(HEAD.map((h, i) => [h, i]));

/** 콘텐츠에 인용한 값. 상류가 바뀌면 조용히 넘어가지 않고 멈춘다. */
const EXPECTED = {
  북한산: 270,
  관악산: 210,
  도봉산: 215,
};

// ─── 읽기 ───────────────────────────────────────────────────────────────────

/** data.go.kr CSV 는 UTF-8 일 때도 CP949 일 때도 있다. 매번 판별한다. */
function readCsv() {
  const name = fs.readdirSync(DOWN_DIR).find((n) => n.endsWith('.csv') && n.includes('100대명산'));
  if (!name) {
    throw new Error(
      `data/Down 에 100대명산 CSV 가 없다. ${SOURCE_URL} 에서 받아 넣어라 (로그인 불필요)`,
    );
  }
  const buf = fs.readFileSync(path.join(DOWN_DIR, name));
  let text = new TextDecoder('utf-8', { fatal: false }).decode(buf);
  if (text.includes('�')) text = new TextDecoder('euc-kr', { fatal: false }).decode(buf);
  return { name, text: text.replace(/^﻿/, '') };
}

/** RFC4180. 산_개요가 길어 따옴표 안에 줄바꿈과 쉼표가 들어 있다. */
function parseCsv(s) {
  const rows = [];
  let row = [];
  let cur = '';
  let quoted = false;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (quoted) {
      if (c === '"') {
        if (s[i + 1] === '"') {
          cur += '"';
          i++;
        } else quoted = false;
      } else cur += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') {
      row.push(cur);
      cur = '';
    } else if (c === '\r') {
      // 무시
    } else if (c === '\n') {
      row.push(cur);
      rows.push(row);
      row = [];
      cur = '';
    } else cur += c;
  }
  if (cur !== '' || row.length) {
    row.push(cur);
    rows.push(row);
  }
  return rows;
}

// ─── 셀 해석 ────────────────────────────────────────────────────────────────

/** 산행코스 셀은 HTML 표가 통째로 이스케이프되어 들어 있다. */
const unescapeHtml = (s) =>
  s
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#59;/g, ';')
    .replace(/&#47;/g, '/')
    .replace(/&quot;/g, '"')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&');

/** 표를 행 배열로. 헤더는 구분 / 구간 / 소요시간 3열이다. */
function tableRows(html) {
  const out = [];
  for (const chunk of unescapeHtml(html).split(/<tr[^>]*>/i).slice(1)) {
    const cells = [...chunk.matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)].map((m) =>
      m[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim(),
    );
    if (cells.length) out.push(cells);
  }
  return out;
}

/**
 * 난이도 열에 세 항목이 뭉쳐 있다:
 *   "산행시간 : 4시간30분~5시간미만산높이 : 800m ~ 900m 미만 난이도 : -"
 * 구분자가 없어 다음 항목 이름을 경계로 자른다. "-" 는 값이 아니라 빈칸이다.
 */
function splitDifficultyCell(raw) {
  const s = (raw || '').replace(/\s+/g, ' ');
  const pick = (re) => {
    const m = s.match(re);
    const v = (m ? m[1] : '').trim();
    return v && v !== '-' ? v : null;
  };
  return {
    hike_time_range: pick(/산행시간\s*:\s*(.*?)\s*산높이/),
    height_range: pick(/산높이\s*:\s*(.*?)\s*난이도/),
    difficulty_ko: pick(/난이도\s*:\s*(.*)$/),
  };
}

/** "약 4시간 30분" → 270. 구간 시간을 더하지 않는다 — 합계가 이미 출처에 있다. */
function toMinutes(text) {
  const h = Number((text.match(/(\d+)\s*시간/) || [0, 0])[1]);
  const m = Number((text.match(/(\d+)\s*분/) || [0, 0])[1]);
  const total = h * 60 + m;
  return total > 0 ? total : null;
}

// ─── 본체 ───────────────────────────────────────────────────────────────────

function extract() {
  const { name: file, text } = readCsv();
  const rows = parseCsv(text);
  const header = rows[0].map((h) => h.trim());
  if (header.join(',') !== HEAD.join(',')) {
    throw new Error(`CSV 열 구성이 바뀌었다. 받은 헤더: ${header.join(' | ')}`);
  }

  const wanted = process.argv.slice(2);
  const mountains = rows
    .slice(1)
    .filter((r) => r.length > 1 && r.some((c) => c.trim()))
    .map((r) => ({
      name_ko: r[C['명산_이름']].trim(),
      location_ko: r[C['명산_소재지']].trim(),
      elevation_m_forest: Number(r[C['명산_높이']]),
      ...splitDifficultyCell(r[C['난이도']]),
      coords: { lat: Number(r[C['Y좌표']]), lng: Number(r[C['X좌표']]) },
      courses: tableRows(r[C['산행코스']])
        .filter((row) => row.length >= 3 && !row[0].includes('구분'))
        .map(([kind, section, duration]) => ({
          kind_ko: kind,
          section_ko: section,
          duration_text: duration,
          duration_min: toMinutes(duration),
        })),
    }))
    .filter((m) => wanted.length === 0 || wanted.includes(m.name_ko));

  if (mountains.length === 0) throw new Error(`해당하는 산이 없다: ${wanted.join(', ')}`);

  // 콘텐츠가 인용한 숫자가 그대로인지 확인한다. 다르면 콘텐츠도 함께 고쳐야 한다.
  for (const [nameKo, minutes] of Object.entries(EXPECTED)) {
    const m = mountains.find((x) => x.name_ko === nameKo);
    if (!m) continue;
    const rec = m.courses.find((c) => c.kind_ko.includes('추천'));
    if (!rec || rec.duration_min !== minutes) {
      throw new Error(
        `${nameKo} 추천코스 소요시간이 달라졌다: 기대 ${minutes}분, 실제 ${rec?.duration_min ?? '없음'}분 ` +
          `(${rec?.duration_text ?? '-'}). src/content/places 를 함께 고쳐라.`,
      );
    }
  }

  return { file, mountains };
}

function main() {
  const { file, mountains } = extract();
  const withRecommended = mountains.filter((m) => m.courses.some((c) => c.kind_ko.includes('추천')));

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(
    OUT,
    JSON.stringify(
      {
        org: 'forest_service',
        dataset: '산림청 국립자연휴양림관리소 · 숲나들e 숲길 100대명산 정보',
        source_url: SOURCE_URL,
        source_file: file,
        license: '이용허락범위 제한 없음',
        fetched_at: '2026-08-14',
        note:
          '소요시간은 기관이 적어둔 값을 분으로만 바꾼 것이며 구간 시간을 합산하지 않았다. ' +
          '이 자료에는 거리(km)가 100건 전부 없다.',
        counts: {
          mountains: mountains.length,
          with_recommended_course: withRecommended.length,
          with_difficulty: mountains.filter((m) => m.difficulty_ko).length,
        },
        mountains,
      },
      null,
      2,
    ) + '\n',
  );

  console.log(`${mountains.length}개 산 · 추천코스 있는 산 ${withRecommended.length}개`);
  for (const m of mountains.filter((x) => x.name_ko in EXPECTED)) {
    const rec = m.courses.find((c) => c.kind_ko.includes('추천'));
    console.log(`  ${m.name_ko} ${m.elevation_m_forest}m — ${rec.duration_text} (${rec.duration_min}분)`);
  }
  console.log(`→ ${path.relative(ROOT, OUT)}`);
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  try {
    main();
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
}
