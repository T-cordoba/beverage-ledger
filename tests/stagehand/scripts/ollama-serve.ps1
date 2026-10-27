# Restarts the local Ollama server with a context window large enough for
# Stagehand. Ollama's default (4096 tokens on GPUs under 24 GB) truncates the
# prompts Stagehand builds from a whole page (~8k tokens on the movement
# capture screens), and the model then answers about a page it never saw.
# The variable is set for this server process only, not for the system.
#
#   powershell -ExecutionPolicy Bypass -File tests\stagehand\scripts\ollama-serve.ps1 [-Context 16384]
param([int]$Context = 16384)

$exe = Join-Path $env:LOCALAPPDATA 'Programs\Ollama\ollama.exe'
if (-not (Test-Path $exe)) { $exe = (Get-Command ollama -ErrorAction Stop).Source }

# The tray app restarts its own server; stop both so ours owns the port.
Get-Process 'ollama app', 'ollama' -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep -Seconds 2

$psi = New-Object System.Diagnostics.ProcessStartInfo $exe, 'serve'
$psi.UseShellExecute = $false
$psi.CreateNoWindow = $true
$psi.EnvironmentVariables['OLLAMA_CONTEXT_LENGTH'] = "$Context"
$psi.EnvironmentVariables['OLLAMA_KEEP_ALIVE'] = '30m'
# Memory: a quantized KV cache with flash attention halves the context's
# footprint, so more of the model fits in VRAM and less sits in RAM; the suite
# never sends two requests at once, so nothing is reserved for parallel ones.
# Added after reports/17-suite-completa stopped at 300 MB of free RAM.
$psi.EnvironmentVariables['OLLAMA_FLASH_ATTENTION'] = '1'
$psi.EnvironmentVariables['OLLAMA_KV_CACHE_TYPE'] = 'q8_0'
$psi.EnvironmentVariables['OLLAMA_NUM_PARALLEL'] = '1'
$psi.EnvironmentVariables['OLLAMA_MAX_LOADED_MODELS'] = '1'
[System.Diagnostics.Process]::Start($psi) | Out-Null

for ($i = 0; $i -lt 90; $i++) {
  try { Invoke-RestMethod http://localhost:11434/api/version -TimeoutSec 2 | Out-Null; Write-Output "Ollama sirviendo en :11434 con OLLAMA_CONTEXT_LENGTH=$Context"; exit 0 } catch { Start-Sleep -Seconds 1 }
}
Write-Output 'Ollama no arrancó en 90 s'
exit 1
