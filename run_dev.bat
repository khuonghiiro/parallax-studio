@echo off
chcp 65001 > nul
echo ===================================================
echo   Parallax Studio - Khởi chạy máy chủ phát triển
echo ===================================================
echo.
echo Đang mở trình duyệt tại địa chỉ: http://localhost:5173
start "" "http://localhost:5173"
echo.
echo Đang khởi động Vite Dev Server...
echo (Nhấn Ctrl+C để dừng máy chủ)
echo.

where pnpm >nul 2>nul
if %errorlevel% equ 0 (
    call pnpm dev
) else (
    call npm.cmd run dev
)

pause
