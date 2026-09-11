@echo off
chcp 65001 > nul
echo ===================================================
echo   Parallax Studio - Khởi chạy máy chủ phát triển
echo ===================================================
echo.
echo Đang mở trình duyệt tại địa chỉ: http://localhost:5173
start "" "http://localhost:5173"
echo.
echo Đang khởi động Parallax Unified System (Application Service + UI)...
echo (Nhấn Ctrl+C để dừng toàn bộ hệ thống)
echo.

where pnpm >nul 2>nul
if %errorlevel% equ 0 (
    call pnpm start
) else (
    call npm.cmd run start
)

pause
