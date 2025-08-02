# 下载外部资源到本地
# PowerShell script to download external dependencies

Write-Host "正在下载外部资源到本地..." -ForegroundColor Green

# 创建目录
$basePath = $PSScriptRoot

# 下载 Chart.js
Write-Host "下载 Chart.js..." -ForegroundColor Yellow
Invoke-WebRequest -Uri "https://cdnjs.cloudflare.com/ajax/libs/Chart.js/3.9.1/chart.min.js" -OutFile "$basePath\js-libraries\chart.min.js"

# 下载 Three.js
Write-Host "下载 Three.js..." -ForegroundColor Yellow
Invoke-WebRequest -Uri "https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js" -OutFile "$basePath\js-libraries\three.min.js"

# 下载 Font Awesome CSS
Write-Host "下载 Font Awesome CSS..." -ForegroundColor Yellow
Invoke-WebRequest -Uri "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" -OutFile "$basePath\css-frameworks\font-awesome.min.css"

# 下载 Font Awesome 字体文件
Write-Host "下载 Font Awesome 字体文件..." -ForegroundColor Yellow
$fontAwesomeVersion = "6.0.0"
$fontFiles = @(
    "fa-solid-900.woff2",
    "fa-solid-900.woff",
    "fa-regular-400.woff2", 
    "fa-regular-400.woff",
    "fa-brands-400.woff2",
    "fa-brands-400.woff"
)

foreach ($fontFile in $fontFiles) {
    try {
        Invoke-WebRequest -Uri "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/$fontAwesomeVersion/webfonts/$fontFile" -OutFile "$basePath\fonts\$fontFile"
        Write-Host "下载 $fontFile 完成" -ForegroundColor Green
    } catch {
        Write-Host "下载 $fontFile 失败: $($_.Exception.Message)" -ForegroundColor Red
    }
}

# 下载 TailwindCSS (使用预编译版本)
Write-Host "下载 TailwindCSS..." -ForegroundColor Yellow
Invoke-WebRequest -Uri "https://cdn.tailwindcss.com/3.3.0" -OutFile "$basePath\css-frameworks\tailwind.min.css"

# 下载 Google Fonts - Inter
Write-Host "下载 Google Fonts - Inter..." -ForegroundColor Yellow
# 由于Google Fonts比较复杂，我们使用Google Fonts的API下载
$googleFontsUrl = "https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap"
Invoke-WebRequest -Uri $googleFontsUrl -OutFile "$basePath\fonts\inter-font.css"

Write-Host "所有资源下载完成!" -ForegroundColor Green
Write-Host "本地资源位置: $basePath" -ForegroundColor Cyan