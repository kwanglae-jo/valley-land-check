# 계곡체크

계곡·하천 방문 위치가 **사유지인지 공공용지인지** 바로 확인해 주는 웹서비스입니다.

## 로컬 실행 (추천)

컴퓨터에서 이렇게 하면 됩니다.

### 0) 브이월드 키에 도메인 추가
1. https://www.vworld.kr/dev/v4api.do 접속
2. 발급한 키 설정에서 도메인에 `localhost` 추가
3. (이미 있다면) `valley-land-check.vercel.app`도 유지

### 1) 프로젝트 받기
```bash
git clone https://github.com/kwanglae-jo/valley-land-check.git
cd valley-land-check
```

### 2) 키 넣기
`.env.local` 파일을 만들고 아래처럼 적습니다.

```env
VWORLD_API_KEY=여기에_발급받은_키
VWORLD_DOMAIN=localhost
```

### 3) 실행
```bash
npm install
npm run dev
```

브라우저에서 http://localhost:3000 을 엽니다.

정상이면 화면 안내가 **실제 지적·소유구분**으로 바뀌고,  
결과의 데이터가 `실연동`으로 보입니다.  
확인: http://localhost:3000/api/status

## 지금 상태 (버셀)

https://valley-land-check.vercel.app 은 키가 들어 있지만,  
해외 클라우드에서 브이월드 연결이 자주 실패해 데모로 보일 수 있습니다.  
**실데이터 확인은 로컬 실행이 더 잘 됩니다.**

## 받을 API

1. [브이월드 Open API](https://www.vworld.kr/dev/v4api.do) 인증키
2. 같은 키로 연속지적도 / 토지임야 / 토지소유 활용신청
   - [연속지적도](https://www.data.go.kr/data/15056910/openapi.do)
   - [토지임야정보](https://www.data.go.kr/data/15123884/openapi.do)
   - [토지소유정보](https://www.data.go.kr/data/15123976/openapi.do)

## 주요 기능

- 지도 필지 칸 탭으로 선택
- GPS 현재 위치 확인
- 연속지적도 + 소유구분으로 사유지/공공용지 안내

본 서비스는 **참고용**입니다.
