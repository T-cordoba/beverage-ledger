# Stores the Gemini API key in tests/stagehand/.env without it ever being shown:
# it is read with hidden input (or from the clipboard with -FromClipboard), checked
# for the AIza... shape and written to the GOOGLE_GENERATIVE_AI_API_KEY line.
#
#   powershell -ExecutionPolicy Bypass -File tests\stagehand\scripts\set-gemini-key.ps1
#   powershell -ExecutionPolicy Bypass -File tests\stagehand\scripts\set-gemini-key.ps1 -FromClipboard
param([switch]$FromClipboard)

$envFile = Join-Path (Split-Path $PSScriptRoot -Parent) '.env'
$example = Join-Path (Split-Path $PSScriptRoot -Parent) '.env.example'
if (-not (Test-Path $envFile)) { Copy-Item $example $envFile }

if ($FromClipboard) {
  $key = Get-Clipboard -Raw
} else {
  $secure = Read-Host -AsSecureString 'Pega la clave de Gemini (no se mostrará) y pulsa Enter'
  $key = [Runtime.InteropServices.Marshal]::PtrToStringBSTR([Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure))
}
if ($null -eq $key) { $key = '' }
$key = $key.Trim()
if ($key -notmatch '^AIza[0-9A-Za-z_-]{30,}$') {
  Write-Output "Eso no parece una clave de Gemini (debe empezar por AIza; longitud recibida: $($key.Length)). No se cambió nada."
  exit 1
}

$lines = [System.IO.File]::ReadAllLines($envFile)
if (-not ($lines | Where-Object { $_ -match '^GOOGLE_GENERATIVE_AI_API_KEY=' })) { $lines += 'GOOGLE_GENERATIVE_AI_API_KEY=' }
$lines = $lines | ForEach-Object { if ($_ -match '^GOOGLE_GENERATIVE_AI_API_KEY=') { "GOOGLE_GENERATIVE_AI_API_KEY=$key" } else { $_ } }
[System.IO.File]::WriteAllLines($envFile, $lines, (New-Object System.Text.UTF8Encoding $false))
if ($FromClipboard) { Set-Clipboard -Value ' ' }
Write-Output "Clave guardada en tests/stagehand/.env (longitud $($key.Length))."
