> 📓 **노트북 LM 보관소부터 찾아주세요** — 종합 지식 베이스: `docs/notebooklm/2026-08-14-korea-outdoor-knowledge-base.md`

# data/ — 공공데이터 원본과 판독값

사이트가 "공식 데이터 기반"이라고 주장하는 근거가 여기에 있다. 주장을 뒷받침할 수 없으면
그 주장을 하지 않는다는 것이 이 디렉터리의 존재 이유다.

## 구조

```
data/
├─ raw/            공공데이터 원본 (커밋 안 함, .gitignore 참조)
│  ├─ forest/      산림청 등산로 (GeoJSON / GPX)
│  │  └─ manifest.json    ← 커밋함
│  └─ knps/        국립공원공단 탐방로 (CSV)
│     └─ manifest.json    ← 커밋함
└─ extracted/      출처별 원시 판독값 (커밋함)
```

## 무엇을 커밋하고 무엇을 커밋하지 않는가

| 대상 | 커밋 | 이유 |
|---|---|---|
| 원본 아카이브·지오메트리 | ✗ | 파일당 수 MB. Phase 1은 지도를 렌더링하지 않으므로 노선 좌표를 쓰지 않는다 |
| `raw/*/manifest.json` | ✓ | 출처·일시·해시. 상류 변경 감지와 재다운로드의 근거 |
| `extracted/*.json` | ✓ | 출처별 판독값. **교차검증 주장의 실제 증거** |

원본을 버려도 되는 이유는 재현 경로가 남기 때문이다. manifest의 `source_url`로 다시 받고
`sha256`을 대조하면 그때 그 데이터인지 확인된다. 해시가 다르면 상류가 바뀐 것이고,
그건 숨길 게 아니라 알아야 할 사실이다.

## manifest.json

원본 파일 하나당 한 항목. 손으로 받은 파일도 반드시 기록한다 — 기록되지 않은 파일은
출처를 주장할 수 없으므로 사용하지 않는다.

```jsonc
{
  "org": "forest_service",
  "dataset": "등산로정보(산림문화·휴양정보)",
  "files": [
    {
      "path": "inwangsan_geojson.zip",
      "place_id": "inwangsan",
      "source_url": "https://www.forest.go.kr/kfsweb/kfi/kfs/trail/trailInformation.do?...",
      "fetched_at": "2026-08-13",
      "fetched_by": "manual",
      "sha256": "0000000000000000000000000000000000000000000000000000000000000000",
      "bytes": 0
    }
  ]
}
```

`fetched_by`는 `manual` 또는 스크립트 이름. 자동화 이전에는 전부 `manual`이다.
위 예시의 해시와 바이트 수는 자리표시자이며 실제 파일을 받은 뒤 채운다.

## extracted/ — 왜 별도로 두는가

`src/content/places/*.json`에는 **최종 값 하나**가 들어간다. 그것만으로는
"2건 이상 공식 정보로 교차 확인"이라는 표시를 검증할 수 없다. 두 출처가 실제로
무엇을 말했는지가 없으면 그 주장은 반증 불가능하다.

`extracted/{place-id}.json`은 합치기 **전**의 출처별 값을 담는다.

```jsonc
{
  "place_id": "inwangsan",
  "readings": {
    "elevation_m": [
      { "org": "forest_service", "value": 338 },
      { "org": "knps", "value": 339 }
    ],
    "distance_km": [
      { "org": "forest_service", "value": 3.2 }
    ]
  }
}
```

이 파일과 `src/lib/reconcile.ts`가 만나 최종 값과 `verification.status`를 만든다.

**주의**: 필드마다 출처 수가 다르다. 위 예시에서 고도는 2건이지만 거리는 1건이다.
현재 스키마는 장소 단위로 `verification.status` 하나만 갖는데, 이것이 맞는지는 미결이며
실데이터를 본 뒤 결정한다. `docs/superpowers/specs/2026-08-13-provenance-granularity.md` 참조.

## 라이선스와 출처 표시

공공데이터포털 데이터는 다수가 **출처 표시**를 조건으로 한다. 장소 상세 페이지 하단의
`ProvenanceBlock`이 기관명과 조회일을 렌더링하는 것은 설계 취향이 아니라 준수 의무다.

각 데이터셋의 실제 이용조건은 manifest에 기록하고, 조건이 다른 데이터셋을 섞을 때는
가장 엄격한 조건을 따른다.
