#!/usr/bin/env ruby
# frozen_string_literal: true

require "net/http"
require "tempfile"
require_relative "lib/legacy_feed"

module FeedRefresh
  SOURCE = URI("https://carlocaprini.com/feed.xml")

  def self.run(output:, fetcher: nil)
    fetcher ||= lambda do |uri|
      response = Net::HTTP.get_response(uri)
      raise "Feed request failed with HTTP #{response.code}" unless response.is_a?(Net::HTTPSuccess)
      response.body
    end
    body = fetcher.call(SOURCE)
    LegacyFeed.validate!(body)
    directory = File.dirname(output)
    Tempfile.create(["feed", ".xml"], directory) do |file|
      file.binmode
      file.write(body)
      file.flush
      File.rename(file.path, output)
    end
  end
end

FeedRefresh.run(output: ARGV.fetch(0, "legacy/feed.xml")) if $PROGRAM_NAME == __FILE__
