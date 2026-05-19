# PowerShell script to generate PWA icons
Write-Host "🎨 Generating PWA icons from logo..." -ForegroundColor Cyan

$rootDir = $PSScriptRoot | Split-Path -Parent
$sourceLogo = Join-Path $rootDir "attached_assets" "ffactory_1754714366892.png"
$iconsDir = Join-Path $rootDir "client" "public" "icons"

Write-Host "Root directory: $rootDir"
Write-Host "Source logo: $sourceLogo"
Write-Host "Icons directory: $iconsDir"

# Check if logo exists
if (-not (Test-Path $sourceLogo)) {
    Write-Host "❌ Source logo not found at: $sourceLogo" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Source logo found" -ForegroundColor Green

# Ensure icons directory exists
if (-not (Test-Path $iconsDir)) {
    New-Item -ItemType Directory -Path $iconsDir -Force | Out-Null
    Write-Host "✅ Created icons directory" -ForegroundColor Green
}

# Icon sizes to generate
$iconSizes = @(
    @{size=72; name="icon-72x72.png"},
    @{size=96; name="icon-96x96.png"},
    @{size=128; name="icon-128x128.png"},
    @{size=144; name="icon-144x144.png"},
    @{size=152; name="icon-152x152.png"},
    @{size=192; name="icon-192x192.png"},
    @{size=384; name="icon-384x384.png"},
    @{size=512; name="icon-512x512.png"},
    @{size=180; name="apple-touch-icon.png"}
)

Write-Host "`nGenerating icons using Node.js script..." -ForegroundColor Yellow

# Run the Node.js script
$scriptPath = Join-Path $PSScriptRoot "generate-icons.js"
$result = & tsx $scriptPath 2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n✅ Icon generation completed!" -ForegroundColor Green
    
    # Check if icons were created
    $iconFiles = Get-ChildItem $iconsDir -Filter "*.png" -ErrorAction SilentlyContinue
    if ($iconFiles.Count -gt 0) {
        Write-Host "`nGenerated $($iconFiles.Count) icon files:" -ForegroundColor Green
        $iconFiles | ForEach-Object { Write-Host "  - $($_.Name)" }
    } else {
        Write-Host "`n⚠️  Warning: No icon files found in $iconsDir" -ForegroundColor Yellow
        Write-Host "Check icon-generation.log for details" -ForegroundColor Yellow
    }
} else {
    Write-Host "`n❌ Icon generation failed!" -ForegroundColor Red
    Write-Host $result
    exit 1
}

Write-Host "`n📝 Next steps:" -ForegroundColor Cyan
Write-Host "   1. Icons are ready in client/public/icons/"
Write-Host "   2. Build the app: npm run build"
Write-Host "   3. Test PWA installation in Chrome/Safari"







