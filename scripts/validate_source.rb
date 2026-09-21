#!/usr/bin/env ruby
# frozen_string_literal: true

require "set"
require "uri"
require "json"
require_relative "lib/validation"

SOURCE_DIR = ENV["SITE_SOURCE_DIR"] ? File.expand_path(ENV.fetch("SITE_SOURCE_DIR")) : File.expand_path("..", __dir__)

@errors = []
PNG_SIGNATURE = "\x89PNG\r\n\x1a\n".b
SERIES_SOCIAL_IMAGE_DIMENSIONS = [1200, 627].freeze

def fail_check(message)
  @errors << message
end

def relative_path(path)
  SiteValidation.relative_path(path, SOURCE_DIR)
end

def read_yaml(path)
  SiteValidation.read_yaml(path, errors: @errors, root: SOURCE_DIR)
end

def read_markdown(path)
  SiteValidation.read_front_matter(path, errors: @errors, root: SOURCE_DIR)
end

def present?(value)
  SiteValidation.present?(value)
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

def validate_series_social_image_dimensions(path, value)
  return unless present?(value) && value.start_with?("/")

  asset = File.join(SOURCE_DIR, value.delete_prefix("/"))
  return unless File.file?(asset)

  header = File.binread(asset, 24)
  unless header.byteslice(0, 8) == PNG_SIGNATURE && header.byteslice(12, 4) == "IHDR"
    fail_check("#{relative_path(path)}: Series meta image #{value} must be a PNG with verifiable dimensions")
    return
  end

  dimensions = header.byteslice(16, 8).unpack("NN")
  return if dimensions == SERIES_SOCIAL_IMAGE_DIMENSIONS

  fail_check(
    "#{relative_path(path)}: Series meta image #{value} must be 1200x627, found #{dimensions.join('x')}"
  )
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
site_config = read_yaml(File.join(SOURCE_DIR, "_config.yml")) || {}

if Array(site_config["plugins"]).include?("jekyll-feed")
  fail_check("_config.yml: jekyll-feed must not be enabled; the custom feed.xml is the sole RSS owner")
end

gemfile_path = File.join(SOURCE_DIR, "Gemfile")
gemfile = File.read(gemfile_path)
if gemfile.match?(/^\s*gem\s+["']jekyll-feed["']/)
  fail_check("Gemfile: jekyll-feed must not be declared; the custom feed.xml is the sole RSS owner")
end

feed_path = File.join(SOURCE_DIR, "feed.xml")
feed_data, = read_markdown(feed_path)
fail_check("feed.xml: layout must be null") unless feed_data.key?("layout") && feed_data["layout"].nil?
fail_check("feed.xml: permalink must be /feed.xml") unless feed_data["permalink"] == "/feed.xml"

topics_path = File.join(SOURCE_DIR, "_data/topics.yml")
topics = Array(read_yaml(topics_path))
topic_slugs = topics.map { |topic| topic["slug"] }.compact
supported_motif_families = %w[branching bounded-loops layered-interfaces partial-convergence].freeze
fail_check("_data/topics.yml: must define at least one topic") if topic_slugs.empty?

duplicate_topics = topic_slugs.group_by(&:itself).select { |_, values| values.size > 1 }.keys
fail_check("_data/topics.yml: duplicate topic slugs: #{duplicate_topics.join(', ')}") unless duplicate_topics.empty?

topics.each_with_index do |topic, index|
  %w[slug label description].each do |field|
    fail_check("_data/topics.yml: topic #{index + 1} is missing #{field}") unless present?(topic[field])
  end

  visual = topic["visual"] || {}
  color = visual["color"]
  motif = visual["motif"]
  unless color.to_s.match?(/\A#[0-9a-fA-F]{6}\z/)
    fail_check("_data/topics.yml: topic #{index + 1} must define a six-digit visual color")
  end
  unless supported_motif_families.include?(motif)
    fail_check("_data/topics.yml: topic #{index + 1} has unsupported visual motif family #{motif.inspect}")
  end
end

motif_families = topics.map { |topic| topic.dig("visual", "motif") }.compact
duplicate_motifs = motif_families.group_by(&:itself).select { |_, values| values.size > 1 }.keys
unless duplicate_motifs.empty?
  fail_check("_data/topics.yml: topic motif families must be unique: #{duplicate_motifs.join(', ')}")
end

unless %w[balanced spatial].include?(site_config["article_topic_motif_variant"])
  fail_check("_config.yml: article_topic_motif_variant must be balanced or spatial")
end

def validate_ordered_topics(path, value, topic_slugs)
  topics = value.is_a?(Array) ? value : []
  unless value.is_a?(Array) && topics.size.between?(1, 2)
    fail_check("#{relative_path(path)}: must define one or two topics as an ordered list")
  end

  duplicate_topics = topics.group_by(&:itself).select { |_, values| values.size > 1 }.keys
  unless duplicate_topics.empty?
    fail_check("#{relative_path(path)}: duplicate topics make primary-topic order ambiguous: #{duplicate_topics.join(', ')}")
  end

  unknown_topics = topics.reject { |topic| topic.is_a?(String) && topic_slugs.include?(topic) }
  fail_check("#{relative_path(path)}: unknown topics: #{unknown_topics.join(', ')}") unless unknown_topics.empty?
end

questions_path = File.join(SOURCE_DIR, "_data/questions.yml")
questions = Array((read_yaml(questions_path) || {})["questions"])
question_slugs = questions.map { |question| question["slug"] }.compact
fail_check("_data/questions.yml: must define at least one question") if question_slugs.empty?

duplicate_questions = question_slugs.group_by(&:itself).select { |_, values| values.size > 1 }.keys
unless duplicate_questions.empty?
  fail_check("_data/questions.yml: duplicate question slugs: #{duplicate_questions.join(', ')}")
end

questions.each_with_index do |question, index|
  label = "_data/questions.yml: question #{index + 1}"
  %w[slug title short_title description home_description sidebar_description related_question].each do |field|
    fail_check("#{label} is missing #{field}") unless present?(question[field])
  end

  %w[title_prefix title_highlight].each do |field|
    fail_check("#{label} hero is missing #{field}") unless present?(question.dig("hero", field))
  end
  hero_title = "#{question.dig('hero', 'title_prefix')}#{question.dig('hero', 'title_highlight')}"
  unless hero_title == question["title"]
    fail_check("#{label} hero title must match its canonical title")
  end

  synthesis = Array(question["synthesis"])
  unless synthesis.length == 2 && synthesis.all? { |paragraph| present?(paragraph) }
    fail_check("#{label} must define two synthesis paragraphs")
  end

  unless question["slug"].to_s.match?(/\A[a-z0-9]+(?:-[a-z0-9]+)*\z/)
    fail_check("#{label} has an invalid slug")
  end

  unknown_topics = Array(question["topics"]) - topic_slugs
  fail_check("#{label} has unknown topics: #{unknown_topics.join(', ')}") unless unknown_topics.empty?

  sections = Array(question["sections"])
  fail_check("#{label} must define at least one section") if sections.empty?
  sections.each_with_index do |section, section_index|
    section_label = "#{label}, section #{section_index + 1}"
    %w[title description].each do |field|
      fail_check("#{section_label} is missing #{field}") unless present?(section[field])
    end
    fail_check("#{section_label} must include at least one note") if Array(section["notes"]).empty?
  end

  section_note_urls = sections.flat_map { |section| Array(section["notes"]) }
  entry_point = question["entry_point"]
  unless entry_point.is_a?(Hash)
    fail_check("#{label} must define an entry_point")
    entry_point = {}
  end

  %w[note reason].each do |field|
    fail_check("#{label} entry_point is missing #{field}") unless present?(entry_point[field])
  end

  entry_note = entry_point["note"]
  if present?(entry_note) && section_note_urls.count(entry_note) != 1
    fail_check("#{label} entry_point note must appear exactly once in its sections: #{entry_note}")
  end

  Array(question["influences"]).each_with_index do |influence, influence_index|
    %w[slug context].each do |field|
      unless present?(influence[field])
        fail_check("#{label}, influence #{influence_index + 1} is missing #{field}")
      end
    end
  end

  %w[title url description].each do |field|
    fail_check("#{label} experience is missing #{field}") unless present?(question.dig("experience", field))
  end
end

questions.each do |question|
  related_question = question["related_question"]
  next if question_slugs.include?(related_question)

  fail_check("_data/questions.yml: #{question['slug']} references unknown question #{related_question}")
end

page_paths = [File.join(SOURCE_DIR, "index.md"), File.join(SOURCE_DIR, "404.html")] +
  Dir.glob(File.join(SOURCE_DIR, "pages/**/*.md")).sort
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
    unless permalink == "/404.html" || permalink.start_with?("/") && permalink.end_with?("/")
      fail_check("#{relative_path(path)}: permalink must start and end with /, or be /404.html")
    end

    if permalink_records.key?(permalink)
      fail_check("#{relative_path(path)}: duplicate permalink #{permalink}")
    else
      permalink_records[permalink] = path
    end
  end

  if data.key?("sitemap") && data["sitemap"] != true && data["sitemap"] != false
    fail_check("#{relative_path(path)}: sitemap must be true or false")
  end

  validate_local_asset(path, data["meta_image"], data["meta_image_alt"])

  motif_variant = data["article_topic_motif_variant"]
  if motif_variant && !%w[balanced spatial].include?(motif_variant)
    fail_check("#{relative_path(path)}: article_topic_motif_variant must be balanced or spatial")
  end

  published_date = parse_date(data["date"], path, "date") if data.key?("date")
  modified_date = parse_date(data["last_modified_at"], path, "last_modified_at") if data.key?("last_modified_at")
  if published_date && modified_date && modified_date < published_date
    fail_check("#{relative_path(path)}: last_modified_at cannot precede date")
  end
end

not_found_path = File.join(SOURCE_DIR, "404.html")
not_found_data = page_records.fetch(not_found_path).first
fail_check("404.html: layout must be not_found") unless not_found_data["layout"] == "not_found"
fail_check("404.html: permalink must be /404.html") unless not_found_data["permalink"] == "/404.html"
fail_check("404.html: robots must be noindex, follow") unless not_found_data["robots"] == "noindex, follow"
fail_check("404.html: sitemap must be false") unless not_found_data["sitemap"] == false

privacy_path = File.join(SOURCE_DIR, "pages/privacy.md")
privacy_data = page_records.fetch(privacy_path).first
fail_check("pages/privacy.md: sitemap must be false") unless privacy_data["sitemap"] == false

questions.each do |question|
  expected_permalink = "/explore/#{question['slug']}/"
  page_path = permalink_records[expected_permalink]
  if page_path.nil?
    fail_check("_data/questions.yml: #{question['slug']} has no page at #{expected_permalink}")
    next
  end

  page_data = page_records.fetch(page_path).first
  fail_check("#{relative_path(page_path)}: layout must be question") unless page_data["layout"] == "question"
  unless page_data["question_slug"] == question["slug"]
    fail_check("#{relative_path(page_path)}: question_slug must match #{question['slug']}")
  end
  unless page_data["title"] == question["title"]
    fail_check("#{relative_path(page_path)}: title must match the canonical question title")
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

  validate_ordered_topics(path, data["topics"], topic_slugs)

  validate_markdown_list_spacing(path, body)
end

questions.each do |question|
  question_note_urls = [question.dig("entry_point", "note")] +
    Array(question["sections"]).flat_map { |section| Array(section["notes"]) }
  unknown_note_urls = question_note_urls.compact.uniq.reject { |url| note_by_permalink.key?(url) }
  unless unknown_note_urls.empty?
    fail_check("_data/questions.yml: #{question['slug']} references unknown notes: #{unknown_note_urls.join(', ')}")
  end
end

thinking_path = File.join(SOURCE_DIR, "pages/thinking.md")
thinking_data = page_records.fetch(thinking_path).first
listed_note_urls = Array(thinking_data["notes"]).map { |note| note["url"] }.compact
duplicate_listed_urls = listed_note_urls.group_by(&:itself).select { |_, values| values.size > 1 }.keys
fail_check("pages/thinking.md: duplicate note URLs: #{duplicate_listed_urls.join(', ')}") unless duplicate_listed_urls.empty?

unknown_listed_urls = listed_note_urls.reject { |url| note_by_permalink.key?(url) }
fail_check("pages/thinking.md: unknown note URLs: #{unknown_listed_urls.join(', ')}") unless unknown_listed_urls.empty?

missing_listed_urls = note_by_permalink.keys - listed_note_urls
fail_check("pages/thinking.md: notes missing from notes list: #{missing_listed_urls.join(', ')}") unless missing_listed_urls.empty?

start_here_path = File.join(SOURCE_DIR, "_data/start_here.yml")
start_here_data = read_yaml(start_here_path) || {}
start_here_urls = Array(start_here_data["notes"]).map { |note| note["url"] }.compact
fail_check("_data/start_here.yml: must define exactly three notes") unless start_here_urls.size == 3
duplicate_start_urls = start_here_urls.group_by(&:itself).select { |_, values| values.size > 1 }.keys
unless duplicate_start_urls.empty?
  fail_check("_data/start_here.yml: duplicate note URLs: #{duplicate_start_urls.join(', ')}")
end
unknown_start_urls = start_here_urls.reject { |url| note_by_permalink.key?(url) }
fail_check("_data/start_here.yml: unknown note URLs: #{unknown_start_urls.join(', ')}") unless unknown_start_urls.empty?

series_path = File.join(SOURCE_DIR, "_data/series.yml")
series_data = read_yaml(series_path) || {}
series_page_records = page_records.map do |path, (data, _)|
  [data["series_slug"], path, data] if present?(data["series_slug"])
end.compact
series_pages_by_slug = series_page_records.group_by(&:first)
duplicate_series_pages = series_pages_by_slug.select { |_, records| records.size > 1 }.keys
unless duplicate_series_pages.empty?
  fail_check("Series slugs must have exactly one page: #{duplicate_series_pages.join(', ')}")
end

series_urls = series_data.values.map { |series| series["url"] }.compact
duplicate_series_urls = series_urls.group_by(&:itself).select { |_, values| values.size > 1 }.keys
fail_check("_data/series.yml: duplicate Series URLs: #{duplicate_series_urls.join(', ')}") unless duplicate_series_urls.empty?
fail_check("A /series/ index page must not exist") if permalink_records.key?("/series/")

series_data.each do |slug, series|
  label = "_data/series.yml: #{slug}"
  %w[title short_title url meta_image meta_image_alt tagline listing_description description context entry_context].each do |field|
    fail_check("_data/series.yml: #{slug} is missing #{field}") unless present?(series[field])
  end
  validate_local_asset(series_path, series["meta_image"], series["meta_image_alt"])
  validate_series_social_image_dimensions(series_path, series["meta_image"])
  unless series["url"] == "/series/#{slug}/"
    fail_check("#{label} URL must match its Series slug")
  end

  series_topics = series["topics"]
  unless series_topics.is_a?(Array) && series_topics.size.between?(1, 2)
    fail_check("#{label} must define one or two topics as an ordered list")
  end
  duplicate_topics = Array(series_topics).group_by(&:itself).select { |_, values| values.size > 1 }.keys
  fail_check("#{label} has duplicate topics: #{duplicate_topics.join(', ')}") unless duplicate_topics.empty?
  unknown_topics = Array(series_topics) - topic_slugs
  fail_check("#{label} has unknown topics: #{unknown_topics.join(', ')}") unless unknown_topics.empty?

  overview = series["overview"] || {}
  %w[eyebrow title].each do |field|
    fail_check("#{label} overview is missing #{field}") unless present?(overview[field])
  end
  overview_paragraphs = Array(overview["paragraphs"])
  unless overview_paragraphs.any? && overview_paragraphs.all? { |paragraph| present?(paragraph) }
    fail_check("#{label} overview must define at least one non-empty paragraph")
  end
  overview_items = Array(overview["items"])
  services = Array(series["services"])
  structured_items = overview_items.any? ? overview_items : services
  if structured_items.empty?
    fail_check("#{label} must define overview.items or services")
  else
    structured_items.each_with_index do |item, index|
      unless present?(item["title"]) || present?(item["name"])
        fail_check("#{label} structured overview item #{index + 1} is missing title or name")
      end
      fail_check("#{label} structured overview item #{index + 1} is missing description") unless present?(item["description"])
    end
  end

  article_context = series["article_context"]
  unless article_context.is_a?(Hash)
    fail_check("#{label} must define article_context")
  end
  show_related_reading = article_context.is_a?(Hash) ? article_context["show_related_reading"] : nil
  unless show_related_reading == true || show_related_reading == false
    fail_check("#{label} article_context.show_related_reading must be true or false")
  end

  series_page_records_for_slug = series_pages_by_slug.fetch(slug, [])
  if series_page_records_for_slug.size == 1
    _, path, data = series_page_records_for_slug.first
    if data["permalink"] != series["url"]
      fail_check("#{relative_path(path)}: permalink must match the series URL #{series['url']}")
    end
    fail_check("#{relative_path(path)}: layout must be series") unless data["layout"] == "series"
    fail_check("#{relative_path(path)}: title must match the canonical Series title") unless data["title"] == series["title"]
    %w[meta_title meta_description].each do |field|
      fail_check("#{relative_path(path)}: Series page is missing #{field}") unless present?(data[field])
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
    _, body = note_records.fetch(path)
    if body.include?("{% include series-context.html %}")
      fail_check("#{relative_path(path)}: Series context is rendered by the article layout and must not be included in note Markdown")
    end
  end
end

unknown_series = note_records.values.map { |(data, _)| data["series"] }.compact.uniq - series_data.keys
fail_check("Thinking notes reference unknown series: #{unknown_series.join(', ')}") unless unknown_series.empty?
unknown_series_pages = series_pages_by_slug.keys - series_data.keys
fail_check("Series pages reference unknown Series: #{unknown_series_pages.join(', ')}") unless unknown_series_pages.empty?

expected_series_order = %w[product-judgment-in-practice building-my-ai-operating-system].freeze
unless series_data.keys.sort == expected_series_order.sort
  fail_check("_data/series.yml: must define exactly the two supported Series")
end

explore_path = File.join(SOURCE_DIR, "pages/explore.md")
explore_data = page_records.fetch(explore_path).first
explore_series_value = explore_data.dig("series", "items")
unless explore_series_value.is_a?(Array)
  fail_check("pages/explore.md: series.items must exist as an ordered list")
end
explore_series_items = Array(explore_series_value)
duplicate_explore_series = explore_series_items.group_by(&:itself).select { |_, values| values.size > 1 }.keys
unless duplicate_explore_series.empty?
  fail_check("pages/explore.md: series.items contains duplicates: #{duplicate_explore_series.join(', ')}")
end
unknown_explore_series = explore_series_items - series_data.keys
unless unknown_explore_series.empty?
  fail_check("pages/explore.md: series.items contains unknown Series: #{unknown_explore_series.join(', ')}")
end
missing_explore_series = series_data.keys - explore_series_items
unless missing_explore_series.empty?
  fail_check("pages/explore.md: series.items is missing Series: #{missing_explore_series.join(', ')}")
end
unless explore_series_items == expected_series_order
  fail_check("pages/explore.md: series.items must use the intended editorial order")
end

thinking_series_items = Array(thinking_data.dig("series", "items"))
unless thinking_series_items == explore_series_items
  fail_check("pages/thinking.md: series.items must match Explore Series order")
end
thinking_featured_series = thinking_data.dig("series", "featured")
unless series_data.key?(thinking_featured_series)
  fail_check("pages/thinking.md: series.featured must reference a valid Series")
end
unless thinking_series_items.include?(thinking_featured_series)
  fail_check("pages/thinking.md: series.featured must be included in series.items")
end

home_path = File.join(SOURCE_DIR, "_data/home.yml")
home_data = read_yaml(home_path) || {}
home_series_config = home_data["series"]
unless home_series_config.is_a?(Hash) && home_series_config.keys == ["featured"]
  fail_check("_data/home.yml: series must expose only the featured Series")
end
home_featured_series = home_data.dig("series", "featured")
unless series_data.key?(home_featured_series)
  fail_check("_data/home.yml: series.featured must reference a valid Series")
end
unless home_featured_series == "product-judgment-in-practice"
  fail_check("_data/home.yml: Product Judgment must be the featured Series")
end

home_question_slugs = Array(home_data.dig("questions", "items"))
unless home_question_slugs == question_slugs
  fail_check("_data/home.yml: questions.items must list every canonical question once and in canonical order")
end

expected_home_paths = {
  "Thinking" => "/thinking/",
  "Explore" => "/explore/",
  "Influences" => "/influences/"
}
home_paths = Array(home_data.dig("entry_points", "cards")).to_h do |card|
  [card["title"], card["url"]]
end
unless home_paths == expected_home_paths
  fail_check("_data/home.yml: entry_points cards must match the canonical Thinking, Explore and Influences paths")
end

experience_path = File.join(SOURCE_DIR, "pages/experience.md")
experience_ids = Array(page_records.fetch(experience_path).first.dig("evidence", "items")).map { |item| item["id"] }
questions.each do |question|
  experience_url = question.dig("experience", "url").to_s
  fragment = experience_url.split("#", 2)[1]
  unless experience_url.start_with?("/experience/#") && experience_ids.include?(fragment)
    fail_check("_data/questions.yml: #{question['slug']} references unknown Experience anchor #{experience_url}")
  end
end

influence_paths = Dir.glob(File.join(SOURCE_DIR, "_influences/*.md")).sort
influence_slugs = influence_paths.map { |path| File.basename(path, ".md") }
influence_paths.each do |path|
  data, body = read_markdown(path)
  %w[title summary external_url].each do |field|
    fail_check("#{relative_path(path)}: missing #{field}") unless present?(data[field])
  end
  fail_check("#{relative_path(path)}: invalid external_url") unless valid_http_url?(data["external_url"])

  validate_ordered_topics(path, data["topics"], topic_slugs)

  related_note = data["related_note"]
  if present?(related_note) && !note_by_permalink.key?(related_note)
    fail_check("#{relative_path(path)}: related_note does not match a Thinking permalink: #{related_note}")
  end

  validate_markdown_list_spacing(path, body)
end

questions.each do |question|
  referenced_influences = Array(question["influences"]).map { |influence| influence["slug"] }
  unknown_influences = referenced_influences.reject { |slug| influence_slugs.include?(slug) }
  unless unknown_influences.empty?
    fail_check("_data/questions.yml: #{question['slug']} references unknown influences: #{unknown_influences.join(', ')}")
  end
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
%w[bundler github-actions npm].each do |ecosystem|
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

unexpected_ecosystems = ecosystems - %w[bundler github-actions npm]
unless unexpected_ecosystems.empty?
  fail_check(".github/dependabot.yml: undocumented ecosystems: #{unexpected_ecosystems.join(', ')}")
end

analytics_contract_path = File.join(SOURCE_DIR, "contracts/analytics.json")
analytics_contract = JSON.parse(File.read(analytics_contract_path))
analytics_events = Array(analytics_contract.dig("events", "semantic"))
analytics_sources = Dir.glob(File.join(SOURCE_DIR, "{_includes,_layouts}/**/*.html")).sort
declared_analytics_events = analytics_sources.flat_map do |path|
  source = File.read(path)
  source.scan(/data-analytics-event=["']([^"']+)["']/).flatten +
    source.scan(/siteAnalytics\.track\(\s*["']([^"']+)["']/).flatten
end.uniq
consent_script = File.read(File.join(SOURCE_DIR, "assets/js/consent.js"))
aggregate_script = File.read(File.join(SOURCE_DIR, "assets/js/aggregate-analytics.js"))
collector_script = File.read(File.join(SOURCE_DIR, "_analytics/collector/src/index.js"))
collector_migration = File.read(File.join(SOURCE_DIR, "_analytics/collector/migrations/0001_daily_counts.sql"))
campaign_migration = File.read(File.join(SOURCE_DIR, "_analytics/collector/migrations/0002_daily_campaign_counts.sql"))
head_include = File.read(File.join(SOURCE_DIR, "_includes/head.html"))
default_layout = File.read(File.join(SOURCE_DIR, "_layouts/default.html"))

if head_include.include?("googletagmanager.com")
  fail_check("_includes/head.html: Google Analytics must not load before consent")
end

unless consent_script.include?('data-analytics-enabled') && consent_script.include?("googletagmanager.com/gtag/js")
  fail_check("assets/js/consent.js: Analytics must load through the consent gate")
end

production_host = URI.parse(site_config["production_url"].to_s).host
unless present?(site_config["google_analytics_hostname"]) && site_config["google_analytics_hostname"] == production_host
  fail_check("_config.yml: google_analytics_hostname must match the production_url hostname")
end

unless consent_script.include?('data-analytics-hostname') &&
    consent_script.include?('window.location.protocol === "https:"') &&
    consent_script.include?("window.location.hostname === analyticsHostname")
  fail_check("assets/js/consent.js: Analytics must remain fail-closed outside the exact HTTPS production hostname")
end

unless consent_script.match?(/allow_google_signals:\s*false/) && consent_script.match?(/allow_ad_personalization_signals:\s*false/)
  fail_check("assets/js/consent.js: advertising and Google Signals must remain disabled")
end

unknown_analytics_events = declared_analytics_events - analytics_events
unless unknown_analytics_events.empty?
  fail_check("analytics: unknown events: #{unknown_analytics_events.join(', ')}")
end

unused_analytics_events = analytics_events - declared_analytics_events - ["content_view"]
unless unused_analytics_events.empty?
  fail_check("analytics: events are not attached to a source interaction: #{unused_analytics_events.join(', ')}")
end

contract_position = default_layout.index("analytics-contract.generated.js")
runtime_positions = [default_layout.index("aggregate-analytics.js"), default_layout.index("analytics.js")]
unless contract_position && runtime_positions.all? { |position| position && contract_position < position }
  fail_check("_layouts/default.html: generated analytics contract must load before analytics runtimes")
end

unless %w[localhost 127.0.0.1 0.0.0.0 ::1].all? { |hostname| aggregate_script.include?(hostname) }
  fail_check("assets/js/aggregate-analytics.js: local preview detection is incomplete")
end

unless aggregate_script.include?('data-aggregate-analytics-local') && aggregate_script.include?('url.pathname === "/v1/measure"')
  fail_check("assets/js/aggregate-analytics.js: local aggregate measurement must require an explicit loopback collector")
end

unless aggregate_script.include?('credentials: "omit"') && aggregate_script.include?('referrerPolicy: "no-referrer"')
  fail_check("assets/js/aggregate-analytics.js: aggregate requests must omit credentials and referrers")
end

unless collector_migration.scan(/CREATE TABLE/i).size == 1 && collector_migration.include?("daily_counts")
  fail_check("_analytics collector: D1 migration must create only the aggregate daily_counts table")
end

unless campaign_migration.scan(/CREATE TABLE/i).size == 1 && campaign_migration.include?("daily_campaign_counts")
  fail_check("_analytics collector: campaign migration must create only the aggregate daily_campaign_counts table")
end

if [collector_migration, campaign_migration].any? { |migration| migration.match?(/raw[_ ]events?/i) }
  fail_check("_analytics collector: raw-event storage is forbidden")
end


collector_inserts = collector_script.scan(/INSERT INTO\s+([a-z_]+)/i).flatten.uniq
unless (collector_inserts - %w[daily_counts daily_campaign_counts]).empty?
  fail_check("_analytics collector: only aggregate counter tables may receive inserts")
end

excluded_paths = Array(site_config["exclude"])
fail_check("_config.yml: _analytics must be excluded from the generated site") unless excluded_paths.include?("_analytics")

local_analytics_config = read_yaml(File.join(SOURCE_DIR, "_config.analytics-local.yml")) || {}
unless local_analytics_config["aggregate_analytics_local"] == true &&
    local_analytics_config["aggregate_analytics_endpoint"] == "http://127.0.0.1:8787/v1/measure"
  fail_check("_config.analytics-local.yml: local measurement must require the canonical loopback collector")
end

analytics_sources.each do |path|
  File.read(path).scan(/data-analytics-[^=\s]+=["']([^"']*)["']/).flatten.each do |value|
    if value.match?(/knowledge/i)
      fail_check("#{relative_path(path)}: analytics attributes must use the current Explore terminology")
    end
  end
end

if @errors.any?
  warn "\nSource validation failed:"
  @errors.each { |error| warn "- #{error}" }
  exit 1
end

puts "Source validation passed: #{page_records.size} pages, #{note_records.size} notes, #{influence_paths.size} influences."
