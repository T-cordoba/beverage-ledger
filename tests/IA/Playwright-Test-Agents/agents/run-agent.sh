#!/usr/bin/env bash
# Runs one Playwright Test Agent headless with Claude Code, from this folder so
# that .claude/agents/ and .mcp.json (the playwright-test MCP server) are found.
#
#   bash agents/run-agent.sh <planner|generator|healer> <prompt-file> <log-name>
#
# Needs TEST_USER_EMAIL / TEST_USER_PASSWORD in the shell and the local stack up.
set -u
cd "$(dirname "$0")/.." || exit 1
agent="playwright-test-$1"
prompt="$2"
log="agents/logs/$3.out.md"

case "$1" in
  healer) tools="mcp__playwright-test__* Read Glob Grep LS Edit MultiEdit Write" ;;
  *) tools="mcp__playwright-test__* Read Glob Grep LS" ;;
esac

cp "$prompt" "agents/logs/$3.prompt.md"
echo "=== $(date +%T) start $agent ($prompt)" >> agents/logs/agents.log
# shellcheck disable=SC2086
timeout 2400 claude -p --agent "$agent" --mcp-config .mcp.json --strict-mcp-config \
  --allowedTools $tools --output-format text < "$prompt" > "$log" 2>&1
status=$?
echo "=== $(date +%T) end $agent exit=$status" >> agents/logs/agents.log
exit $status
