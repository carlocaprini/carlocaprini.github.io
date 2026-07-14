#!/usr/bin/env ruby
# frozen_string_literal: true

require "json"
require "date"
require "rexml/document"
require "set"
require "uri"
require "yaml"

SITE_DIR = File.expand_path("../_site", __dir__)
SOURCE_DIR = File.expand_path("..", __dir__)
SITE_URL = "https://carlocaprini.github.io"
SITE_HOST = URI(SITE_URL).host

@errors = []

def fail_check(message)
  @errors << message
end

def read_file(path)
  File.read(path)
rescue Errno::ENOENT
  fail_check("Missing file: #{path}")
  nil
end

def site_path(*parts)
  File.join(SITE_DIR, *parts)
end

def relative_site_path(path)
  path.delete_prefix("#{SITE_DIR}/")
end

def local_url?(value)
  return true if value.start_with?("/")

  uri = URI.parse(value)
  uri.is_a?(URI::HTTP) && uri.host == SITE_HOST
rescue URI::InvalidURIError
  false
end

def external_or_special_url?(value)
  return true if value.start_with?("#")

  uri = URI.parse(value)
  return true if uri.scheme.nil?

  !uri.is_a?(URI::HTTP) || uri.host != SITE_HOST
rescue URI::InvalidURIError
  false
end

def normalize_local_path(value)
  uri = URI.parse(value)
  path = uri.path
  path = "/" if path.nil? || path.empty?
  path
rescue URI::InvalidURIError
  nil
end

def generated_file_for_path(path)
  clean_path = path.sub(%r{\A/}, "")
  return site_path("index.html") if clean_path.empty?

  direct = site_path(clean_path)
  return direct if File.file?(direct)

  site_path(clean_path, "index.html")
end

def html_ids(html)
  html.scan(/\sid=(["'])(.*?)\1/).map { |(_, id)| id }.to_set
end

def front_matter(path)
  source = read_file(path)
  return {} unless source

  match = source.match(/\A---\s*\n(.*?)\n---\s*\n/m)
  return {} unless match

  YAML.safe_load(match[1], permitted_classes: [Date], aliases: true) || {}
rescue Psych::SyntaxError => e
  fail_check("#{path.delete_prefix("#{SOURCE_DIR}/")}: invalid front matter: #{e.message.lines.first&.strip}")
  {}
end

required_files = %w[
  index.html
  robots.txt
  sitemap.xml
  sitemap.txt
  feed.xml
  assets/css/main.css
]

required_files.each do |file|
  fail_check("Missing generated file: #{file}") unless File.file?(site_path(file))
end

sitemap_locs = []
sitemap_xml = read_file(site_path("sitemap.xml"))
if sitemap_xml
  begin
    document = REXML::Document.new(sitemap_xml)
    REXML::XPath.each(document, "//*[local-name()='loc']") do |loc|
      sitemap_locs << loc.text.to_s.strip
    end
  rescue REXML::ParseException => e
    fail_check("Invalid sitemap.xml: #{e.message.lines.first&.strip}")
  end

  fail_check("sitemap.xml does not contain URLs") if sitemap_locs.empty?
  duplicates = sitemap_locs.group_by(&:itself).select { |_, values| values.size > 1 }.keys
  fail_check("Duplicate URLs in sitemap.xml: #{duplicates.join(', ')}") unless duplicates.empty?

  development_sitemap = sitemap_locs.any? do |url|
    url.start_with?("http://0.0.0.0:", "http://localhost:", "http://127.0.0.1:")
  end

  if development_sitemap
    fail_check("Generated site uses development sitemap URLs. Run `JEKYLL_ENV=production bundle exec jekyll build` before validating.")
  end

  sitemap_locs.each do |url|
    next if development_sitemap

    unless url.start_with?("#{SITE_URL}/")
      fail_check("Non-canonical sitemap URL: #{url}")
      next
    end

    path = normalize_local_path(url)
    next if path.nil?

    target = generated_file_for_path(path)
    fail_check("Sitemap URL has no generated file: #{url}") unless File.file?(target)
  end
end

sitemap_txt = read_file(site_path("sitemap.txt"))
if sitemap_txt
  text_urls = sitemap_txt.lines.map(&:strip).reject(&:empty?)
  fail_check("sitemap.txt does not contain URLs") if text_urls.empty?
  text_urls.each do |url|
    fail_check("Non-canonical sitemap.txt URL: #{url}") unless url.start_with?("#{SITE_URL}/")
  end
end

robots = read_file(site_path("robots.txt"))
if robots
  fail_check("robots.txt does not reference sitemap.xml") unless robots.include?("#{SITE_URL}/sitemap.xml")
  fail_check("robots.txt does not reference sitemap.txt") unless robots.include?("#{SITE_URL}/sitemap.txt")
end

feed = read_file(site_path("feed.xml"))
if feed
  begin
    REXML::Document.new(feed)
  rescue REXML::ParseException => e
    fail_check("Invalid feed.xml: #{e.message.lines.first&.strip}")
  end
end

canonical_urls = []
html_files = Dir.glob(site_path("**/*.html")).sort
fail_check("No generated HTML files found") if html_files.empty?

html_files.each do |file|
  html = read_file(file)
  next unless html

  relative = relative_site_path(file)
  ids = html_ids(html)
  all_ids = html.scan(/\sid=(["'])(.*?)\1/).map { |(_, id)| id }
  duplicate_ids = all_ids.group_by(&:itself).select { |_, values| values.size > 1 }.keys

  fail_check("#{relative}: unrendered Liquid tag found") if html.match?(/({{.*?}}|{%.*?%})/m)
  fail_check("#{relative}: missing <title>") unless html.match?(%r{<title>.+?</title>}im)
  fail_check("#{relative}: missing meta description") unless html.match?(%r{<meta\s+name=["']description["']}i)
  fail_check("#{relative}: root html language must be English") unless html.match?(%r{<html\s+lang=["']en["']}i)
  fail_check("#{relative}: expected exactly one h1") unless html.scan(%r{<h1\b}i).size == 1
  fail_check("#{relative}: duplicate ids: #{duplicate_ids.join(', ')}") unless duplicate_ids.empty?
  fail_check("#{relative}: missing skip link") unless html.match?(%r{<a\s+class=["']skip-link["']\s+href=["']#top["']}i)
  fail_check("#{relative}: missing Open Graph title") unless html.match?(%r{<meta\s+property=["']og:title["']}i)
  fail_check("#{relative}: missing Open Graph description") unless html.match?(%r{<meta\s+property=["']og:description["']}i)

  canonical_match = html.match(%r{<link\s+rel=["']canonical["']\s+href=["']([^"']+)["']}i)
  if canonical_match
    canonical = canonical_match[1]
    canonical_urls << canonical
    fail_check("#{relative}: non-canonical canonical URL #{canonical}") unless canonical.start_with?("#{SITE_URL}/")
    unless sitemap_locs.empty? || sitemap_locs.include?(canonical) || defined?(development_sitemap) && development_sitemap
      fail_check("#{relative}: canonical URL not listed in sitemap.xml: #{canonical}")
    end
  else
    fail_check("#{relative}: missing canonical link")
  end

  html.scan(%r{\shref=(["'])(.*?)\1}i).each do |(_, href)|
    next if href.nil? || href.empty? || external_or_special_url?(href)
    next unless local_url?(href)

    path = normalize_local_path(href)
    if path.nil?
      fail_check("#{relative}: invalid href #{href}")
      next
    end

    target = generated_file_for_path(path)
    fail_check("#{relative}: broken internal link #{href}") unless File.file?(target)

    fragment = URI.parse(href).fragment rescue nil
    if fragment && !fragment.empty? && File.file?(target)
      target_html = File.read(target)
      target_ids = target == file ? ids : html_ids(target_html)
      fail_check("#{relative}: broken fragment link #{href}") unless target_ids.include?(fragment)
    end
  end

  html.scan(%r{\ssrc=(["'])(.*?)\1}i).each do |(_, src)|
    next if src.nil? || src.empty? || external_or_special_url?(src)
    next unless local_url?(src)

    path = normalize_local_path(src)
    if path.nil?
      fail_check("#{relative}: invalid src #{src}")
      next
    end

    target = generated_file_for_path(path)
    fail_check("#{relative}: missing local asset #{src}") unless File.file?(target)
  end

  html.scan(%r{<a\b[^>]*>}i).each do |anchor|
    next unless anchor.match?(%r{\starget=["']_blank["']}i)

    rel = anchor[%r{\srel=["']([^"']*)["']}i, 1].to_s.split
    fail_check("#{relative}: target=_blank link missing noopener") unless rel.include?("noopener")
    fail_check("#{relative}: target=_blank link missing noreferrer") unless rel.include?("noreferrer")
  end

  html.scan(%r{<img\b[^>]*>}i).each do |image|
    fail_check("#{relative}: image missing alt attribute") unless image.match?(%r{\salt=["'][^"']*["']}i)
  end

  html.scan(%r{<script\s+type=["']application/ld\+json["']\s*>(.*?)</script>}im).each do |(json_ld)|
    JSON.parse(json_ld)
  rescue JSON::ParserError => e
    fail_check("#{relative}: invalid JSON-LD: #{e.message}")
  end
end

duplicate_canonicals = canonical_urls.group_by(&:itself).select { |_, values| values.size > 1 }.keys
fail_check("Duplicate canonical URLs: #{duplicate_canonicals.join(', ')}") unless duplicate_canonicals.empty?

topics_data = YAML.safe_load_file(File.join(SOURCE_DIR, "_data/topics.yml"), aliases: true) || []
canonical_topics = topics_data.filter_map { |topic| topic["slug"] }.to_set
fail_check("Canonical topic data is empty") if canonical_topics.empty?

note_data = {}
Dir.glob(File.join(SOURCE_DIR, "pages/thinking/*.md")).sort.each do |path|
  data = front_matter(path)
  relative = path.delete_prefix("#{SOURCE_DIR}/")
  topics = Array(data["topics"])

  fail_check("#{relative}: missing summary") if data["summary"].to_s.strip.empty?
  fail_check("#{relative}: must define one or two topics") unless topics.size.between?(1, 2)
  unknown_topics = topics.reject { |topic| canonical_topics.include?(topic) }
  fail_check("#{relative}: unknown topics: #{unknown_topics.join(', ')}") unless unknown_topics.empty?
  note_data[data["permalink"]] = data if data["permalink"]
end

Dir.glob(File.join(SOURCE_DIR, "_influences/*.md")).sort.each do |path|
  data = front_matter(path)
  relative = path.delete_prefix("#{SOURCE_DIR}/")
  topics = Array(data["topics"])

  fail_check("#{relative}: missing external_url") if data["external_url"].to_s.strip.empty?
  fail_check("#{relative}: missing summary") if data["summary"].to_s.strip.empty?
  fail_check("#{relative}: must define one or two topics") unless topics.size.between?(1, 2)
  unknown_topics = topics.reject { |topic| canonical_topics.include?(topic) }
  fail_check("#{relative}: unknown topics: #{unknown_topics.join(', ')}") unless unknown_topics.empty?

  related_note = data["related_note"]
  if related_note && !note_data.key?(related_note)
    fail_check("#{relative}: related_note does not match a Thinking permalink: #{related_note}")
  end
end

if @errors.any?
  warn "\nSite validation failed:"
  @errors.each { |error| warn "- #{error}" }
  exit 1
end

puts "Site validation passed: #{html_files.size} HTML files checked."
