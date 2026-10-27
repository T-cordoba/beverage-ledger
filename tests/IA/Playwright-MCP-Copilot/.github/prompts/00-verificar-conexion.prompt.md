---
agent: agent
description: Comprobación mínima de que Copilot puede usar Playwright MCP (sin escribir archivos)
---

Comprobación de conexión. No modifiques ni crees ningún archivo.

1. Con `browser_navigate` del servidor MCP `playwright` abre `http://localhost:3000/login`.
2. Toma un `browser_snapshot` y di qué encabezado y qué campos ves.
3. Cierra con `browser_close`.

Usa solo herramientas `browser_*` del servidor `playwright`; si no están disponibles,
responde "Playwright MCP no disponible" y detente.
