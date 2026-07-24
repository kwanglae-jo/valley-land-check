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
  echo Node.js가 없어서 자동 설치를 시도합니다...
  where winget >nul 2>nul
  if errorlevel 1 (
    echo winget이 없어 자동 설치를 못 합니다.
    echo 컴퓨터에 Node.js LTS를 설치한 뒤 다시 더블클릭하세요.
    pause
    exit /b 1
  )
  winget install -e --id OpenJS.NodeJS.LTS --accept-package-agreements --accept-source-agreements
  echo.
  echo Node 설치 후 이 창을 닫고, 설치하고실행.bat 을 다시 더블클릭하세요.
  pause
  exit /b 0
)

echo Node.js 버전:
node -v
echo.

if not exist ".env.local" (
  echo 브이월드 인증키를 붙여넣고 Enter 치세요.
  set /p USER_KEY=키:
  if "%USER_KEY%"=="" (
    echo 키가 비어 있습니다. 다시 실행해 주세요.
    pause
    exit /b 1
  )
  (
    echo VWORLD_API_KEY=%USER_KEY%
    echo VWORLD_DOMAIN=localhost
  ) > ".env.local"
  echo .env.local 생성 완료
  echo.
)

echo 패키지 설치 중...
call npm install
if errorlevel 1 (
  echo 설치 실패. Node.js를 다시 설치해 보세요.
  pause
  exit /b 1
)

echo.
echo 서버 시작. 브라우저가 곧 열립니다.
echo 끄려면 이 창에서 Ctrl + C
echo.

start "" cmd /c "timeout /t 6 /nobreak >nul && start http://localhost:3000"
call npm run dev
pause
