# 계곡체크

계곡·하천 방문 위치가 **사유지인지 공공용지인지** 바로 확인해 주는 웹서비스입니다.

## 지금 상태

- API 키가 없으면 **데모(연습용)** 필지를 보여 줍니다.
- `VWORLD_API_KEY`를 넣으면 브이월드 **실제 지적·소유구분** 조회를 시도합니다.
- [k-skill](https://github.com/NomaDamas/k-skill)에는 연속지적도/소유구분 API가 **없습니다**.  
  k-skill의 브이월드 호출 방식(키를 서버에만 두고 `api.vworld.kr` 호출)만 참고했습니다.

## 받을 API (이것만 하면 됩니다)

1. [브이월드 Open API](https://www.vworld.kr/dev/v4api.do)에서 인증키 발급  
   - 도메인에 `valley-land-check.vercel.app` 등록
2. 같은 키/계정으로 아래 데이터도 활용신청 (공공데이터포털 → 브이월드 연계)
   - [연속지적도](https://www.data.go.kr/data/15056910/openapi.do)
   - [토지임야정보](https://www.data.go.kr/data/15123884/openapi.do)
   - [토지소유정보](https://www.data.go.kr/data/15123976/openapi.do)
3. 키를 버셀 환경변수 `VWORLD_API_KEY`에 넣고 재배포

로컬이면 `.env.local`에 넣습니다.

```bash
cp .env.example .env.local
# VWORLD_API_KEY=발급받은키
```

## 실행

```bash
npm install
npm run dev
```

브라우저에서 `http://localhost:3000`을 엽니다.

현재 모드 확인: `GET /api/status`

## 주요 기능

- 지도에 필지 칸 표시 후 탭으로 선택
- GPS 현재 위치 기준 가까운 필지 확인
- 연속지적도(필지 경계·PNU) + 토지정보(지목·소유구분)
- 사유지/공공용지/판정 보류 안내

## 판정 기준(요약)

- **공공용지 가능성**: 국유·공유·도유·시유·군유 등
- **사유지 가능성**: 개인·법인 등
- 정보가 부족하면 **판정 보류**

본 서비스는 **참고용**이며, 출입·이용의 최종 판단과 책임은 이용자에게 있습니다.
