@echo off
chcp 65001 >nul
cd /d "%~dp0"

echo.
echo ===============================
echo  계곡체크 로컬 설치 / 실행
echo ===============================
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo [안내] Node.js가 없습니다.
  echo 설치 페이지를 열게요. LTS 버전을 설치한 뒤
  echo 이 파일^(설치하고실행.bat^)을 다시 더블클릭하세요.
  echo.
  start https://nodejs.org/ko/download
  pause
  exit /b 1
)

echo Node.js 버전:
node -v
echo.

if not exist ".env.local" (
  echo .env.local 파일을 만들어요...
  (
    echo VWORLD_API_KEY=49ABEC91-8E58-3145-88CF-EDA9E8F46B46
    echo VWORLD_DOMAIN=localhost
  ) > ".env.local"
  echo .env.local 생성 완료
  echo.
)

echo 패키지 설치 중... ^(처음이면 1~2분 걸려요^)
call npm install
if errorlevel 1 (
  echo 설치에 실패했습니다. Node.js를 다시 설치해 보세요.
  pause
  exit /b 1
)

echo.
echo 서버를 켭니다. 잠시 후 브라우저가 열려요.
echo 끄려면 이 검은 창에서 Ctrl + C 를 누르세요.
echo.

start "" cmd /c "timeout /t 5 /nobreak >nul && start http://localhost:3000"
call npm run dev

pause
