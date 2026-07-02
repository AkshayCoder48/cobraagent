#!/bin/bash
# CobraAgent dev script — runs the Next.js dev server in foreground
# so the parent subshell (started by /start.sh) waits for it.
cd /home/z/my-project
exec bun run dev
