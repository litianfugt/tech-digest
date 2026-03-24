@echo off
REM Tech Digest 一键运行脚本
REM 用法: run.bat [日期]
REM   例: run.bat 2026-03-23
REM   不带参数则抓取昨天

set DATE=%1
if "%DATE%"=="" (
    echo 获取昨天日期...
    powershell -Command "(Get-Date).AddDays(-1).ToString('yyyy-MM-dd')" > temp_date.txt
    set /p DATE=<temp_date.txt
    del temp_date.txt
)

echo ========================================
echo  Tech Digest - AI 前沿科技日报
echo  目标日期: %DATE%
echo ========================================
echo.

REM Step 1: 采集数据
echo [1/3] 采集数据...
python "%~dp0tech_digest.py" --source-only --date %DATE%
if %errorlevel% neq 0 (
    echo 采集失败！
    exit /b 1
)

echo.
echo [2/3] 请用 AI 阅读 digests\sources\source_%DATE%.md 并生成报告
echo [3/3] 保存为 digests\reports\report_%DATE%.md
echo.
echo 然后运行以下命令发送邮件:
echo   node "%~dp0send_report.js" --date %DATE% --to 你的邮箱
echo.
echo 完成！
pause
