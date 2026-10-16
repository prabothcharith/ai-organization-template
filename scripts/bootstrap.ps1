$ErrorActionPreference = 'Stop'
Set-Location (Resolve-Path (Join-Path $PSScriptRoot '..'))
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    if ($args -contains '--dry-run') { Write-Host 'WOULD INSTALL Node 24+ using winget; no changes made.'; exit 0 }
    if (-not (Get-Command winget -ErrorAction SilentlyContinue)) {
        throw 'Node 24+ and winget are unavailable. Install the official Node.js LTS package or repair Microsoft App Installer, then re-run.'
    }
    Write-Host 'Installing Node LTS through winget...'
    winget install --exact --id OpenJS.NodeJS.LTS --accept-package-agreements --accept-source-agreements --disable-interactivity
    if ($LASTEXITCODE -ne 0) { throw "winget failed with $LASTEXITCODE" }
    $env:Path = [System.Environment]::GetEnvironmentVariable('Path','Machine') + ';' + [System.Environment]::GetEnvironmentVariable('Path','User')
}
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    throw 'Node installed but not on PATH. Restart PowerShell then re-run bootstrap.ps1.'
}
node --experimental-strip-types src/cli.ts setup --profile all @args
exit $LASTEXITCODE
