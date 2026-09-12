#!/bin/sh

set -eu

bundle install
bundle exec jekyll build --config "$JEKYLL_CONFIG"
bundle exec jekyll build \
  --watch \
  --force_polling \
  --config "$JEKYLL_CONFIG" &
builder_pid=$!

cleanup() {
  kill "$builder_pid" 2>/dev/null || true
}

trap cleanup EXIT INT TERM

SITE_ROOT=/srv/jekyll/_site \
SITE_HOST=0.0.0.0 \
node scripts/serve_site.mjs 4000
