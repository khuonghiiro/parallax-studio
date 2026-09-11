@echo off
chcp 65001 > nul
echo ===================================================
echo   Parallax Studio - Cài đặt môi trường làm việc
echo ===================================================
echo.

:: Kiểm tra Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [LỖI] Node.js chưa được cài đặt hoặc chưa thêm vào PATH!
    echo Vui lòng tải và cài đặt Node.js từ https://nodejs.org/ (phiên bản khuyến nghị LTS v20 trở lên).
    pause
    exit /b 1
)

echo [1/3] Đã phát hiện Node.js:
node -v
echo.

:: Cài đặt dependencies bằng pnpm hoặc npx pnpm
echo [2/3] Đang cài đặt thư viện dependencies...
where pnpm >nul 2>nul
if %errorlevel% equ 0 (
    call pnpm install
) else (
    echo Đang dùng npx pnpm...
    call npx --yes pnpm install
)

if %errorlevel% neq 0 (
    echo.
    echo [LỖI] Cài đặt dependencies thất bại! Vui lòng kiểm tra kết nối mạng.
    pause
    exit /b %errorlevel%
)

echo.
echo [3/3] Đang kiểm tra tính hợp lệ của mã nguồn...
call node scripts/quality/check-source-limits.mjs

echo.
echo ===================================================
echo   CÀI ĐẶT MÔI TRƯỜNG THÀNH CÔNG!
echo   Bây giờ bạn có thể nhấp đúp vào 'run_dev.bat' để khởi chạy ứng dụng.
echo ===================================================
echo.
pause
