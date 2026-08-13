/**
 * 순 상승(net ascent) 산출 — `naismith_net_ascent_srtm30m_v1` 의 입력을 만든다.
 *
 * 왜 "누적고도"가 아니라 "순 상승"인가:
 *   누적고도(오르내림의 합)를 주는 출처가 어디에도 없다. 산림청 폴리라인에 Z 가 없고,
 *   GPX 의 <ele> 는 20,235 점 전부 0 이며, 국립공원공단은 거리·시간만 준다.
 *   가진 것으로 계산할 수 있는 것은 두 지점의 표고 차이뿐이다. 그것을 누적고도라
 *   부르면 거짓이므로 "순 상승"이라 부르고, 그대로만 쓴다.
 *
 * ⚠️ 순 상승은 실제 누적고도보다 **작다**. 따라서 여기서 나온 소요시간은 최소치이며
 *    등산에서 짧게 나오는 것은 위험한 방향이다. 화면에 반드시 그 취지를 표시한다.
 *
 * 어느 두 지점인가 — 사람이 고르지 않는다:
 *   산림청 등산로 폴리라인의 **모든 꼭짓점**을 DEM 으로 찍고 최고점과 최저점을 쓴다.
 *   ① 편집자가 지도를 보고 찍은 좌표가 아니므로 재현된다
 *   ② 최저점 기준이라 순 상승이 가장 크게 나오고, 이는 "시간이 짧게 나오는"
 *      위험한 방향의 반대쪽이다
 *   장소의 `coords` 는 쓰지 않는다 — 실측에서 아차산 coords 가 산허리(DEM 118m,
 *   공식 295m)를 가리키고 있었다. 지도 표시용 점과 정상은 같지 않다.
 *
 * 두 지점을 같은 DEM 으로 찍는다:
 *   SRTM30m 은 공식 표고보다 평균 24m 낮게 나온다(뾰족한 정상을 30m 격자가 깎는다).
 *   두 지점이 같은 방향으로 깎이므로 **차이**에서는 편향이 상쇄된다. 그래서 최고점에
 *   공식 표고를 대신 넣지 않는다 — 넣으면 편향이 그대로 순 상승에 남는다.
 *
 * 사용법:
 *   node scripts/net-ascent.mjs                 # 표에 있는 장소 전부
 *   node scripts/net-ascent.mjs achasan         # 일부만
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FOREST_DIR = path.join(ROOT, 'data/raw/forest');
const PLACES_DIR = path.join(ROOT, 'src/content/places');
const OUT = path.join(ROOT, 'data/extracted/srtm30m-net-ascent.json');

/** DEM 데이터셋. 조사에서 SRTM 이 ASTER 보다 일관되게 공식값에 가까웠다. */
const DATASET = 'srtm30m';
const API = `https://api.opentopodata.org/v1/${DATASET}`;
/** 공개 인스턴스 제한: 요청당 100 지점, 초당 1 회, 하루 1,000 회. */
const MAX_LOCATIONS = 100;
const RATE_LIMIT_MS = 1100;

/** SRTM30m 격자 간격(도). 같은 칸의 꼭짓점은 같은 값을 돌려주므로 미리 접는다. */
const SRTM_CELL_DEG = 1 / 3600;

/**
 * 장소 → 산림청 산코드. 출처: `data/Down/MNT_CODE.xlsx` (2,931건).
 * 순환로(둘레길)는 넣지 않는다 — 오르내림을 반복하는 코스에서 순 상승은
 * 실제 누적고도와 너무 멀어져 추정이라 부르기도 어렵다.
 */
const MOUNTAIN_CODE = {
  achasan: '112150201',
  inwangsan: '114100401',
};

/**
 * 최고점이 정말 정상 부근인지 검사할 허용 오차(m).
 *
 * SRTM 은 공식값보다 8~38m 낮게 나왔다(실측 6건). 등산로가 정상까지 가지 않거나
 * 엉뚱한 산의 파일을 읽었으면 이 범위를 크게 벗어난다. 벗어나면 계산하지 않고
 * 멈춘다 — 조용히 틀린 순 상승을 내보내는 것보다 낫다.
 */
const SUMMIT_TOLERANCE_M = 60;

// ─── PCS_ITRF2000_TM → WGS84 ────────────────────────────────────────────────
// 산림청 Esri JSON 은 투영좌표다. spatialReference WKT 가 매개변수를 전부 준다:
//   GRS80 / Transverse Mercator / FE 200000 / FN 600000 / 중앙자오선 127°E /
//   원점위도 38°N / 축척계수 1.0   (EPSG:5186)
// 라이브러리를 넣지 않고 Snyder 역변환 공식을 그대로 옮긴다.
const A = 6378137.0;
const F = 1 / 298.257222101;
const E2 = 2 * F - F * F;
const EP2 = E2 / (1 - E2);
const K0 = 1.0;
const LAT0 = (38 * Math.PI) / 180;
const LON0 = (127 * Math.PI) / 180;
const FE = 200000;
const FN = 600000;

/** 자오선 호장 M(φ). */
function meridionalArc(phi) {
  return (
    A *
    ((1 - E2 / 4 - (3 * E2 ** 2) / 64 - (5 * E2 ** 3) / 256) * phi -
      ((3 * E2) / 8 + (3 * E2 ** 2) / 32 + (45 * E2 ** 3) / 1024) * Math.sin(2 * phi) +
      ((15 * E2 ** 2) / 256 + (45 * E2 ** 3) / 1024) * Math.sin(4 * phi) -
      ((35 * E2 ** 3) / 3072) * Math.sin(6 * phi))
  );
}

export function tmToWgs84(x, y) {
  const M = (y - FN) / K0 + meridionalArc(LAT0);
  const mu = M / (A * (1 - E2 / 4 - (3 * E2 ** 2) / 64 - (5 * E2 ** 3) / 256));
  const e1 = (1 - Math.sqrt(1 - E2)) / (1 + Math.sqrt(1 - E2));

  const phi1 =
    mu +
    ((3 * e1) / 2 - (27 * e1 ** 3) / 32) * Math.sin(2 * mu) +
    ((21 * e1 ** 2) / 16 - (55 * e1 ** 4) / 32) * Math.sin(4 * mu) +
    ((151 * e1 ** 3) / 96) * Math.sin(6 * mu) +
    ((1097 * e1 ** 4) / 512) * Math.sin(8 * mu);

  const sin1 = Math.sin(phi1);
  const cos1 = Math.cos(phi1);
  const tan1 = Math.tan(phi1);
  const C1 = EP2 * cos1 * cos1;
  const T1 = tan1 * tan1;
  const N1 = A / Math.sqrt(1 - E2 * sin1 * sin1);
  const R1 = (A * (1 - E2)) / (1 - E2 * sin1 * sin1) ** 1.5;
  const D = (x - FE) / (N1 * K0);

  const lat =
    phi1 -
    ((N1 * tan1) / R1) *
      (D ** 2 / 2 -
        ((5 + 3 * T1 + 10 * C1 - 4 * C1 ** 2 - 9 * EP2) * D ** 4) / 24 +
        ((61 + 90 * T1 + 298 * C1 + 45 * T1 ** 2 - 252 * EP2 - 3 * C1 ** 2) * D ** 6) / 720);

  const lon =
    LON0 +
    (D -
      ((1 + 2 * T1 + C1) * D ** 3) / 6 +
      ((5 - 2 * C1 + 28 * T1 - 3 * C1 ** 2 + 8 * EP2 + 24 * T1 ** 2) * D ** 5) / 120) /
      cos1;

  return { lat: (lat * 180) / Math.PI, lng: (lon * 180) / Math.PI };
}

/**
 * 투영 역변환이 멀쩡한지 확인한다. 매 실행 앞에서 돌린다 — 여기가 틀리면 표고를
 * 엉뚱한 곳에서 읽어오고, 그 결과는 그럴듯해 보이기 때문에 눈으로 잡을 수 없다.
 */
function assertProjectionSane() {
  // 원점(FE, FN)은 정의상 정확히 38°N 127°E 로 돌아와야 한다.
  const origin = tmToWgs84(FE, FN);
  if (Math.abs(origin.lat - 38) > 1e-6 || Math.abs(origin.lng - 127) > 1e-6) {
    throw new Error(`투영 역변환이 깨졌다: 원점이 ${origin.lat}, ${origin.lng} 로 나온다`);
  }
  // 아차산 관리사무소(산림청 지점 데이터의 실제 좌표)는 아차산 위에 떨어져야 한다.
  const achasan = tmToWgs84(208827.558, 550400.984);
  if (Math.abs(achasan.lat - 37.553) > 0.01 || Math.abs(achasan.lng - 127.1) > 0.01) {
    throw new Error(`투영 역변환이 깨졌다: 아차산 지점이 ${achasan.lat}, ${achasan.lng} 로 나온다`);
  }
}

// ─── 데이터 읽기 ────────────────────────────────────────────────────────────

/**
 * 등산로 폴리라인 파일. 파일명이 CP949 라 깨져 보이므로 뒤의 산코드로 식별한다.
 * 같은 코드로 끝나는 `PMNTN_SPOT_`(지점)·`PMNTN_SAFE_SPOT_`(안전지점)과 구분해야 한다.
 */
function trailFileFor(code) {
  const name = fs
    .readdirSync(FOREST_DIR)
    .find((n) => /^PMNTN_(?!SPOT_|SAFE_SPOT_)/.test(n) && n.endsWith(`${code}.json`));
  if (!name) throw new Error(`산림청 등산로 파일이 없다: ${code} — data/raw/forest 추출을 먼저 하라`);
  return path.join(FOREST_DIR, name);
}

/** 등산로 꼭짓점을 WGS84 로 옮기고 SRTM 격자 단위로 접는다. */
function trailCells(code) {
  const j = JSON.parse(fs.readFileSync(trailFileFor(code), 'utf8'));
  const cells = new Map();
  for (const feature of j.features) {
    for (const pathPoints of feature.geometry.paths) {
      for (const [x, y] of pathPoints) {
        const p = tmToWgs84(x, y);
        const key = `${Math.round(p.lat / SRTM_CELL_DEG)}:${Math.round(p.lng / SRTM_CELL_DEG)}`;
        if (!cells.has(key)) cells.set(key, p);
      }
    }
  }
  if (cells.size === 0) throw new Error(`등산로 꼭짓점이 하나도 없다: ${code}`);
  return [...cells.values()];
}

async function sampleBatch(points) {
  const locations = points.map((p) => `${p.lat.toFixed(6)},${p.lng.toFixed(6)}`).join('|');
  const res = await fetch(`${API}?locations=${locations}`);
  if (!res.ok) throw new Error(`DEM 조회 실패 ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const body = await res.json();
  if (body.status !== 'OK') throw new Error(`DEM 조회 실패: ${JSON.stringify(body).slice(0, 200)}`);
  return body.results.map((r, i) => ({ ...points[i], elevation_m: r.elevation }));
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** 100 지점씩 나눠 초당 한 번만 조회한다. 표고가 비어 있는 지점은 버린다. */
async function sampleAll(points, label) {
  const out = [];
  for (let i = 0; i < points.length; i += MAX_LOCATIONS) {
    if (i > 0) await sleep(RATE_LIMIT_MS);
    const batch = points.slice(i, i + MAX_LOCATIONS);
    process.stdout.write(`\r${label}: ${i + batch.length}/${points.length} 지점 조회`);
    out.push(...(await sampleBatch(batch)));
  }
  process.stdout.write('\r\x1b[K');
  const usable = out.filter((p) => Number.isFinite(p.elevation_m));
  if (usable.length === 0) throw new Error(`${label}: DEM 이 표고를 하나도 주지 않았다`);
  return usable;
}

// ─── 본체 ───────────────────────────────────────────────────────────────────

async function main() {
  assertProjectionSane();

  const wanted = process.argv.slice(2);
  const ids = Object.keys(MOUNTAIN_CODE).filter((id) => wanted.length === 0 || wanted.includes(id));
  if (ids.length === 0) {
    throw new Error(`대상이 없다. 가능한 값: ${Object.keys(MOUNTAIN_CODE).join(', ')}`);
  }

  const records = [];
  for (const id of ids) {
    const place = JSON.parse(fs.readFileSync(path.join(PLACES_DIR, `${id}.json`), 'utf8'));
    const code = MOUNTAIN_CODE[id];
    const cells = trailCells(code);
    const sampled = await sampleAll(cells, id);

    const high = sampled.reduce((a, b) => (b.elevation_m > a.elevation_m ? b : a));
    const low = sampled.reduce((a, b) => (b.elevation_m < a.elevation_m ? b : a));

    // 등산로가 정상까지 닿는지 확인한다. 아니면 순 상승이 통째로 작아진다.
    const gap = high.elevation_m - place.metrics.elevation_m;
    if (Math.abs(gap) > SUMMIT_TOLERANCE_M) {
      throw new Error(
        `${id}: 등산로 최고점이 정상과 멀다 — DEM ${high.elevation_m}m, ` +
          `공식 ${place.metrics.elevation_m}m (차이 ${gap}m). ` +
          `산코드가 맞는지 확인하거나 이 장소를 추정 대상에서 빼라.`,
      );
    }

    const netAscentM = Math.round(high.elevation_m - low.elevation_m);
    if (netAscentM <= 0) {
      throw new Error(`${id}: 순 상승이 ${netAscentM}m 다 — 최고점이 최저점보다 낮을 수 없다`);
    }

    records.push({
      place_id: id,
      mountain_code: code,
      net_ascent_m: netAscentM,
      sampled_cells: sampled.length,
      high: { ...high, official_elevation_m: place.metrics.elevation_m, dem_gap_m: gap },
      low,
    });
    console.log(
      `${id}: 순 상승 ${netAscentM}m  (최고 ${high.elevation_m} − 최저 ${low.elevation_m}, ` +
        `${sampled.length}칸, 공식 표고와 차이 ${gap}m)`,
    );
  }

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(
    OUT,
    JSON.stringify(
      {
        method: 'srtm30m_net_v1',
        dataset: DATASET,
        api: API,
        geometry_source: {
          org: 'forest_service',
          dataset: '산림청 등산로 노선(PMNTN) 폴리라인 꼭짓점',
        },
        rule: 'net_ascent_m = max(DEM over trail vertices) - min(DEM over trail vertices)',
        sampled_at: new Date().toISOString().slice(0, 10),
        note: '순 상승은 누적고도가 아니다. 실제 누적고도보다 작으므로 여기서 나온 소요시간은 최소치다.',
        records,
      },
      null,
      2,
    ) + '\n',
  );
  console.log(`→ ${path.relative(ROOT, OUT)}`);
}

// 테스트가 tmToWgs84 를 import 할 때 DEM 을 조회하면 안 된다.
if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  main().catch((e) => {
    console.error(e.message);
    process.exit(1);
  });
}
