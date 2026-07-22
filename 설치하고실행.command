#!/bin/bash
cd "$(dirname "$0")"

echo ""
echo "==============================="
echo " 계곡체크 로컬 설치 / 실행"
echo "==============================="
echo ""

if ! command -v node >/dev/null 2>&1; then
  echo "[안내] Node.js가 없습니다."
  echo "설치 페이지를 열게요. LTS 버전 설치 후 이 파일을 다시 실행하세요."
  open "https://nodejs.org/ko/download" 2>/dev/null || true
  read -r -p "엔터를 누르면 종료합니다..."
  exit 1
fi

echo "Node.js 버전: $(node -v)"
echo ""

if [ ! -f ".env.local" ]; then
  cat > .env.local <<'EOF'
VWORLD_API_KEY=49ABEC91-8E58-3145-88CF-EDA9E8F46B46
VWORLD_DOMAIN=localhost
EOF
  echo ".env.local 생성 완료"
  echo ""
fi

echo "패키지 설치 중... (처음이면 1~2분 걸려요)"
npm install || {
  echo "설치에 실패했습니다. Node.js를 다시 설치해 보세요."
  read -r -p "엔터를 누르면 종료합니다..."
  exit 1
}

echo ""
echo "서버를 켭니다. 잠시 후 브라우저가 열려요."
echo "끄려면 이 창에서 Ctrl + C 를 누르세요."
echo ""

(sleep 5; open "http://localhost:3000" 2>/dev/null || true) &
npm run dev
