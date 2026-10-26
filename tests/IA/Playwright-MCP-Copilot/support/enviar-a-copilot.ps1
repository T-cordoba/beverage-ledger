# Sends a workspace prompt file to GitHub Copilot Chat (agent mode) in the VS Code
# window of this folder. The file goes as a chat attachment (`code chat -a`), the way
# VS Code hands files to Copilot, with a short ASCII message. Piping the text through
# stdin lost every accent ("secci?n") in the Windows code page conversion.
# Usage: .\support\enviar-a-copilot.ps1 -Prompt 02-generar-suite
param(
  [Parameter(Mandatory)] [string] $Prompt
)
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

$promptFile = Join-Path $root ".github\prompts\$Prompt.prompt.md"
if (-not (Test-Path $promptFile)) { throw "No existe $promptFile" }

# `code chat -r` goes to the last focused VS Code window, and `code <folder>` does not
# reliably take the focus on Windows: twice the prompt landed in another workspace,
# where neither the MCP server nor these settings exist. So the window of this folder
# is brought to the front by its title, and the new session's cwd is checked after.
$folder = Split-Path -Leaf $root
Add-Type @'
using System; using System.Text; using System.Runtime.InteropServices;
public static class VsWindow {
  delegate bool EnumProc(IntPtr h, IntPtr p);
  [DllImport("user32.dll")] static extern bool EnumWindows(EnumProc f, IntPtr p);
  [DllImport("user32.dll")] static extern bool IsWindowVisible(IntPtr h);
  [DllImport("user32.dll", CharSet = CharSet.Unicode)] static extern int GetWindowText(IntPtr h, StringBuilder s, int n);
  [DllImport("user32.dll")] static extern bool SetForegroundWindow(IntPtr h);
  [DllImport("user32.dll")] static extern bool ShowWindow(IntPtr h, int c);
  public static string Focus(string marker) {
    string found = null;
    EnumWindows((h, p) => {
      var s = new StringBuilder(512); GetWindowText(h, s, 512); var t = s.ToString();
      if (IsWindowVisible(h) && t.EndsWith(" - " + marker + " - Visual Studio Code") || t == marker + " - Visual Studio Code") {
        ShowWindow(h, 9); SetForegroundWindow(h); found = t; return false;
      }
      return true;
    }, IntPtr.Zero);
    return found;
  }
}
'@
$title = [VsWindow]::Focus($folder)
if (-not $title) { throw "No encuentro una ventana de VS Code con '$folder' abierta." }
Start-Sleep -Seconds 2
$sessions = Join-Path $HOME '.copilot\session-state'
$before = Get-Date
code chat -r -m agent -a $promptFile "Sigue las instrucciones del archivo adjunto .github/prompts/$Prompt.prompt.md (leelo con la herramienta de archivos, no con el navegador)."

$session = $null
for ($i = 0; $i -lt 30 -and -not $session; $i++) {
  Start-Sleep -Seconds 2
  $session = Get-ChildItem $sessions -Directory | Where-Object { $_.CreationTime -gt $before } |
    Sort-Object CreationTime | Select-Object -Last 1
}
if (-not $session) { throw 'Copilot no abrio ninguna sesion nueva (agent host sin arrancar?).' }
$cwd = (Select-String -Path (Join-Path $session.FullName 'workspace.yaml') -Pattern '^cwd: (.*)$').Matches[0].Groups[1].Value
if ($cwd.TrimEnd('\') -ne $root.TrimEnd('\')) {
  throw "La sesion $($session.Name) se abrio en '$cwd', no en este workspace."
}
"Enviado $Prompt a las $(Get-Date -Format HH:mm:ss): sesion $($session.Name)"
