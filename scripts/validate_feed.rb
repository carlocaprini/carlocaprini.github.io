#!/usr/bin/env ruby
# frozen_string_literal: true

require_relative "lib/legacy_feed"

path = ARGV.fetch(0, "legacy/feed.xml")
LegacyFeed.validate!(File.binread(path))
puts "Valid canonical RSS feed: #{path}"
