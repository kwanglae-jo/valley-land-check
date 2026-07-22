# 계곡체크

계곡·하천 방문 위치가 **사유지인지 공공용지인지** 바로 확인해 주는 웹서비스입니다.

## 무엇을 하면 되나요

1. 이 폴더에서 `npm install` 후 `npm run dev`로 실행합니다.
2. 화면에서 **내 위치로 확인**을 누르거나, 지도를 눌러 필지를 조회합니다.
3. 실제 공공 API를 쓰려면 브이월드 키를 `.env.local`의 `VWORLD_API_KEY`에 넣습니다.

키가 없어도 **데모 모드**로 사유지/공공용지 안내 화면을 확인할 수 있습니다.

## 주요 기능

- GPS 현재 위치 + 지도에서 위치 선택
- 국토교통부 연속지적도(브이월드)로 필지 경계·PNU 조회
- 토지임야(속성) 정보로 지목·소유구분 확인
- 소유구분 기반 사유지/공공용지 판정 및 주의 안내

## 기술 구성

| 구분 | 선택 |
| --- | --- |
| 프론트 | Next.js(App Router) + Leaflet 지도 |
| 백엔드 | Next.js Route Handler (`/api/parcel`) |
| 외부 API | 브이월드 Data API (연속지적도·토지임야) |

브라우저에서 공공 API 키를 직접 노출하지 않고, 서버 API가 대신 호출합니다.

## 환경 변수

`.env.example`을 복사해 `.env.local`을 만듭니다.

```bash
cp .env.example .env.local
```

- `VWORLD_API_KEY`: [브이월드](https://www.vworld.kr/) / [공공데이터포털](https://www.data.go.kr/)에서 발급

## 실행

```bash
npm install
npm run dev
```

브라우저에서 `http://localhost:3000`을 엽니다.

## 판정 기준(요약)

- **공공용지 가능성**: 국유·공유·도유·시유·군유 등
- **사유지 가능성**: 개인·법인 등
- 정보가 부족하면 **판정 보류**로 안내합니다.

본 서비스는 **참고용**이며, 출입·이용의 최종 판단과 책임은 이용자에게 있습니다.

## 폴더 안내

- `src/app/api/parcel` — 필지 조회 API
- `src/lib/vworld.ts` — 브이월드 연동
- `src/lib/ownership.ts` — 사유지 판정
- `src/components` — 지도·결과 화면
