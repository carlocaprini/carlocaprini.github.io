#!/usr/bin/env ruby
# frozen_string_literal: true

require "date"
require "set"
require "uri"
require "yaml"

SOURCE_DIR = File.expand_path("..", __dir__)

@errors = []

def fail_check(message)
  @errors << message
end

def relative_path(path)
  path.delete_prefix("#{SOURCE_DIR}/")
end

def read_yaml(path)
  YAML.safe_load(File.read(path), permitted_classes: [Date, Time], aliases: true)
rescue Psych::SyntaxError => e
  fail_check("#{relative_path(path)}: invalid YAML: #{e.message.lines.first&.strip}")
  nil
end

def read_markdown(path)
  source = File.read(path)
  match = source.match(/\A---\s*\n(.*?)\n---\s*\n/m)
  unless match
    fail_check("#{relative_path(path)}: missing front matter")
    return [{}, source]
  end

  data = YAML.safe_load(match[1], permitted_classes: [Date, Time], aliases: true) || {}
  [data, source[match.end(0)..]]
rescue Psych::SyntaxError => e
  fail_check("#{relative_path(path)}: invalid front matter: #{e.message.lines.first&.strip}")
  [{}, ""]
end

def present?(value)
  !value.to_s.strip.empty?
end

def parse_date(value, path, field)
  return value.to_date if value.respond_to?(:to_date)
  return Date.parse(value) if value.is_a?(String)

  fail_check("#{relative_path(path)}: #{field} must be a date")
  nil
rescue Date::Error
  fail_check("#{relative_path(path)}: invalid #{field}: #{value}")
  nil
end

def valid_http_url?(value)
  uri = URI.parse(value.to_s)
  uri.is_a?(URI::HTTP) && present?(uri.host)
rescue URI::InvalidURIError
  false
end

def validate_local_asset(path, value, alt)
  return unless present?(value)

  unless value.start_with?("/")
    fail_check("#{relative_path(path)}: meta_image must be a root-relative path")
    return
  end

  asset = File.join(SOURCE_DIR, value.delete_prefix("/"))
  fail_check("#{relative_path(path)}: missing meta image #{value}") unless File.file?(asset)
  fail_check("#{relative_path(path)}: meta_image_alt is required with meta_image") unless present?(alt)
end

def validate_markdown_list_spacing(path, body)
  lines = body.lines
  lines.each_index do |index|
    next unless lines[index].match?(/^\s*(?:[-*+]\s+|\d+\.\s+)/)
    next if index.zero? || lines[index - 1].strip.empty?
    next unless lines[index - 1].match?(/^\s*(?:[-*+]\s+|\d+\.\s+)/)

    fail_check("#{relative_path(path)}:#{index + 1}: Markdown list items must be separated by a blank line")
  end
end

data_files = Dir.glob(File.join(SOURCE_DIR, "_data/*.yml")).sort
data_files.each { |path| read_yaml(path) }

topics_path = File.join(SOURCE_DIR, "_data/topics.yml")
topics = Array(read_yaml(topics_path))
topic_slugs = topics.map { |topic| topic["slug"] }.compact
fail_check("_data/topics.yml: must define at least one topic") if topic_slugs.empty?

duplicate_topics = topic_slugs.group_by(&:itself).select { |_, values| values.size > 1 }.keys
fail_check("_data/topics.yml: duplicate topic slugs: #{duplicate_topics.join(', ')}") unless duplicate_topics.empty?

topics.each_with_index do |topic, index|
  %w[slug label description].each do |field|
    fail_check("_data/topics.yml: topic #{index + 1} is missing #{field}") unless present?(topic[field])
  end
end

page_paths = [File.join(SOURCE_DIR, "index.md")] + Dir.glob(File.join(SOURCE_DIR, "pages/**/*.md")).sort
page_records = page_paths.to_h { |path| [path, read_markdown(path)] }
permalink_records = {}

page_records.each do |path, (data, _)|
  %w[layout title].each do |field|
    fail_check("#{relative_path(path)}: missing #{field}") unless present?(data[field])
  end

  permalink = data["permalink"]
  if relative_path(path) != "index.md"
    fail_check("#{relative_path(path)}: missing permalink") unless present?(permalink)
  end

  if present?(permalink)
    unless permalink.start_with?("/") && permalink.end_with?("/")
      fail_check("#{relative_path(path)}: permalink must start and end with /")
    end

    if permalink_records.key?(permalink)
      fail_check("#{relative_path(path)}: duplicate permalink #{permalink}")
    else
      permalink_records[permalink] = path
    end
  end

  validate_local_asset(path, data["meta_image"], data["meta_image_alt"])

  published_date = parse_date(data["date"], path, "date") if data.key?("date")
  modified_date = parse_date(data["last_modified_at"], path, "last_modified_at") if data.key?("last_modified_at")
  if published_date && modified_date && modified_date < published_date
    fail_check("#{relative_path(path)}: last_modified_at cannot precede date")
  end
end

note_paths = Dir.glob(File.join(SOURCE_DIR, "pages/thinking/*.md")).sort
note_records = note_paths.to_h { |path| [path, page_records.fetch(path)] }
note_by_permalink = {}

note_records.each do |path, (data, body)|
  fail_check("#{relative_path(path)}: layout must be article") unless data["layout"] == "article"
  fail_check("#{relative_path(path)}: missing summary") unless present?(data["summary"])
  fail_check("#{relative_path(path)}: missing date") unless data.key?("date")

  permalink = data["permalink"]
  note_by_permalink[permalink] = data if present?(permalink)

  topics_for_note = Array(data["topics"])
  fail_check("#{relative_path(path)}: must define one or two topics") unless topics_for_note.size.between?(1, 2)
  unknown_topics = topics_for_note.reject { |topic| topic_slugs.include?(topic) }
  fail_check("#{relative_path(path)}: unknown topics: #{unknown_topics.join(', ')}") unless unknown_topics.empty?

  validate_markdown_list_spacing(path, body)
end

thinking_path = File.join(SOURCE_DIR, "pages/thinking.md")
thinking_data = page_records.fetch(thinking_path).first
listed_note_urls = Array(thinking_data["articles"]).map { |article| article["url"] }.compact
duplicate_listed_urls = listed_note_urls.group_by(&:itself).select { |_, values| values.size > 1 }.keys
fail_check("pages/thinking.md: duplicate article URLs: #{duplicate_listed_urls.join(', ')}") unless duplicate_listed_urls.empty?

unknown_listed_urls = listed_note_urls.reject { |url| note_by_permalink.key?(url) }
fail_check("pages/thinking.md: unknown article URLs: #{unknown_listed_urls.join(', ')}") unless unknown_listed_urls.empty?

missing_listed_urls = note_by_permalink.keys - listed_note_urls
fail_check("pages/thinking.md: notes missing from articles: #{missing_listed_urls.join(', ')}") unless missing_listed_urls.empty?

start_here_urls = Array(thinking_data.dig("start_here", "articles")).map { |article| article["url"] }.compact
unknown_start_urls = start_here_urls.reject { |url| note_by_permalink.key?(url) }
fail_check("pages/thinking.md: unknown Start Here URLs: #{unknown_start_urls.join(', ')}") unless unknown_start_urls.empty?

series_path = File.join(SOURCE_DIR, "_data/series.yml")
series_data = read_yaml(series_path) || {}
series_pages = page_records.map do |path, (data, _)|
  [data["series_slug"], [path, data]] if present?(data["series_slug"])
end.compact.to_h

series_data.each do |slug, series|
  %w[title url description context entry_context].each do |field|
    fail_check("_data/series.yml: #{slug} is missing #{field}") unless present?(series[field])
  end

  series_page = series_pages[slug]
  if series_page
    path, data = series_page
    if data["permalink"] != series["url"]
      fail_check("#{relative_path(path)}: permalink must match the series URL #{series['url']}")
    end
  else
    fail_check("_data/series.yml: #{slug} has no page with matching series_slug")
  end

  notes = note_records.map do |path, (data, _)|
    [path, data] if data["series"] == slug
  end.compact
  fail_check("_data/series.yml: #{slug} has no notes") if notes.empty?

  orders = notes.map { |_, data| data["series_order"] }
  unless orders.all? { |order| order.is_a?(Integer) && order.positive? }
    fail_check("_data/series.yml: #{slug} series_order values must be positive integers")
    next
  end

  expected_orders = (1..orders.size).to_a
  unless orders.sort == expected_orders
    fail_check("_data/series.yml: #{slug} series_order values must be sequential: #{expected_orders.join(', ')}")
  end

  notes.each do |path, data|
    fail_check("#{relative_path(path)}: missing series_context") unless present?(data["series_context"])
    unless data["show_related_notes"] == false
      fail_check("#{relative_path(path)}: series notes must disable generic related notes")
    end
  end
end

unknown_series = note_records.values.map { |(data, _)| data["series"] }.compact.uniq - series_data.keys
fail_check("Thinking notes reference unknown series: #{unknown_series.join(', ')}") unless unknown_series.empty?

featured_series = thinking_data.dig("featured_series", "slug")
unless series_data.key?(featured_series)
  fail_check("pages/thinking.md: featured_series must reference _data/series.yml")
end

home_path = File.join(SOURCE_DIR, "_data/home.yml")
home_data = read_yaml(home_path) || {}
home_featured_series = home_data.dig("featured_series", "slug")
unless series_data.key?(home_featured_series)
  fail_check("_data/home.yml: featured_series must reference _data/series.yml")
end

influence_paths = Dir.glob(File.join(SOURCE_DIR, "_influences/*.md")).sort
influence_paths.each do |path|
  data, body = read_markdown(path)
  %w[title summary external_url].each do |field|
    fail_check("#{relative_path(path)}: missing #{field}") unless present?(data[field])
  end
  fail_check("#{relative_path(path)}: invalid external_url") unless valid_http_url?(data["external_url"])

  topics_for_influence = Array(data["topics"])
  fail_check("#{relative_path(path)}: must define one or two topics") unless topics_for_influence.size.between?(1, 2)
  unknown_topics = topics_for_influence.reject { |topic| topic_slugs.include?(topic) }
  fail_check("#{relative_path(path)}: unknown topics: #{unknown_topics.join(', ')}") unless unknown_topics.empty?

  related_note = data["related_note"]
  if present?(related_note) && !note_by_permalink.key?(related_note)
    fail_check("#{relative_path(path)}: related_note does not match a Thinking permalink: #{related_note}")
  end

  validate_markdown_list_spacing(path, body)
end

def validate_related_note_references(value, path, note_urls)
  case value
  when Array
    value.each { |entry| validate_related_note_references(entry, path, note_urls) }
  when Hash
    value.each do |key, entry|
      if key == "related_note"
        url = entry.is_a?(Hash) ? entry["url"] : entry
        if present?(url) && !note_urls.include?(url)
          fail_check("#{relative_path(path)}: related_note does not match a Thinking permalink: #{url}")
        end
      else
        validate_related_note_references(entry, path, note_urls)
      end
    end
  end
end

page_records.each do |path, (data, _)|
  validate_related_note_references(data, path, note_by_permalink.keys)
end

dependabot_path = File.join(SOURCE_DIR, ".github/dependabot.yml")
dependabot = read_yaml(dependabot_path) || {}
fail_check(".github/dependabot.yml: version must be 2") unless dependabot["version"] == 2
updates = Array(dependabot["updates"])
ecosystems = updates.map { |update| update["package-ecosystem"] }.compact
%w[bundler github-actions].each do |ecosystem|
  update = updates.find { |entry| entry["package-ecosystem"] == ecosystem }
  if update.nil?
    fail_check(".github/dependabot.yml: missing #{ecosystem} updates")
    next
  end

  fail_check(".github/dependabot.yml: #{ecosystem} must scan /") unless update["directory"] == "/"
  unless update.dig("schedule", "interval") == "weekly"
    fail_check(".github/dependabot.yml: #{ecosystem} must run weekly")
  end
end

unexpected_ecosystems = ecosystems - %w[bundler github-actions]
unless unexpected_ecosystems.empty?
  fail_check(".github/dependabot.yml: undocumented ecosystems: #{unexpected_ecosystems.join(', ')}")
end

if @errors.any?
  warn "\nSource validation failed:"
  @errors.each { |error| warn "- #{error}" }
  exit 1
end

puts "Source validation passed: #{page_records.size} pages, #{note_records.size} notes, #{influence_paths.size} influences."
