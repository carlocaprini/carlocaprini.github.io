# frozen_string_literal: true

require "rexml/document"
require "uri"

module LegacyFeed
  CANONICAL_HOST = "carlocaprini.com"

  def self.validate!(xml)
    document = REXML::Document.new(xml)
    root = document.root
    raise "Feed must be RSS 2.0" unless root&.name == "rss" && root.attributes["version"] == "2.0"

    channel = root.elements["channel"]
    raise "Feed must contain a channel" unless channel
    links = channel.get_elements("link").map(&:text)
    links.concat(channel.get_elements("item/link").map(&:text))
    links.concat(channel.get_elements("item/guid").select { |node| node.attributes["isPermaLink"] == "true" }.map(&:text))
    self_link = channel.get_elements("atom:link").find { |node| node.attributes["rel"] == "self" }
    links << self_link.attributes["href"] if self_link
    raise "Feed must contain entries and a self link" if channel.get_elements("item").empty? || !self_link

    links.compact.each do |link|
      uri = URI.parse(link.strip)
      raise "Feed URL must use the canonical HTTPS origin: #{link}" unless uri.scheme == "https" && uri.host == CANONICAL_HOST
    end
    true
  rescue REXML::ParseException, URI::InvalidURIError => error
    raise "Invalid feed: #{error.message}"
  end
end
