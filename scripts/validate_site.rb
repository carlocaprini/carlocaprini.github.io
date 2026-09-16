#!/usr/bin/env ruby
# frozen_string_literal: true

require "json"
require "rexml/document"
require "set"
require "time"
require "uri"
require "yaml"

require_relative "lib/validation"
require_relative "validate_sitemap"

SITE_DIR = ENV["SITE_OUTPUT_DIR"] ? File.expand_path(ENV.fetch("SITE_OUTPUT_DIR")) : File.expand_path("../_site", __dir__)
SOURCE_DIR = ENV["SITE_SOURCE_DIR"] ? File.expand_path(ENV.fetch("SITE_SOURCE_DIR")) : File.expand_path("..", __dir__)
SITE_CONFIG = YAML.safe_load(File.read(File.join(SOURCE_DIR, "_config.yml")), permitted_classes: [Date, Time], aliases: true)
SITE_URL = (SITE_CONFIG["production_url"] || SITE_CONFIG.fetch("url")).delete_suffix("/")
SITE_HOST = URI(SITE_URL).host
ATOM_NAMESPACE = "http://www.w3.org/2005/Atom"
CONTENT_NAMESPACE = "http://purl.org/rss/1.0/modules/content/"

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

def sitemap_excluded_canonicals
  source_paths = [File.join(SOURCE_DIR, "index.md"), File.join(SOURCE_DIR, "404.html")] +
    Dir.glob(File.join(SOURCE_DIR, "pages/**/*.md")).sort

  source_paths.each_with_object(Set.new) do |path, exclusions|
    data, = SiteValidation.read_front_matter(path, errors: @errors, root: SOURCE_DIR)
    next unless data["sitemap"] == false

    relative = SiteValidation.relative_path(path, SOURCE_DIR)
    permalink = relative == "index.md" ? "/" : data["permalink"]
    if permalink.to_s.empty?
      fail_check("#{relative}: sitemap exclusion requires an explicit permalink")
      next
    end

    exclusions << "#{SITE_URL}#{permalink}"
  end
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
  return false if value.start_with?("/")

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

def application_fragment?(html, fragment)
  html.match?(/\sdata-explore-topic=(["'])#{Regexp.escape(fragment)}\1/)
end

def meta_content(html, attribute, value)
  tag = html[%r{<meta\b[^>]*\b#{Regexp.escape(attribute)}=["']#{Regexp.escape(value)}["'][^>]*>}i]
  tag&.[](%r{\bcontent=["']([^"']+)["']}i, 1)
end

def tag_attribute(tag, name)
  tag[%r{\b#{Regexp.escape(name)}=["']([^"']*)["']}i, 1]
end

def canonical_href(html)
  html.scan(%r{<link\b[^>]*>}i).map do |tag|
    rel = tag_attribute(tag, "rel").to_s.split
    tag_attribute(tag, "href") if rel.include?("canonical")
  end.compact.first
end

def generated_url_for_html(relative)
  path = if relative == "index.html"
           "/"
         elsif relative.end_with?("/index.html")
           "/#{relative.delete_suffix('index.html')}"
         else
           "/#{relative}"
         end
  "#{SITE_URL}#{path}"
end

def parse_iso8601(value, label)
  if value.to_s.strip.empty?
    fail_check("#{label} is missing")
    return nil
  end

  Time.iso8601(value)
rescue ArgumentError
  fail_check("#{label} is not a valid ISO 8601 timestamp: #{value}")
  nil
end

def parse_rfc822(value, label)
  if value.to_s.strip.empty?
    fail_check("#{label} is missing")
    return nil
  end

  Time.rfc2822(value)
rescue ArgumentError
  fail_check("#{label} is not a valid RFC822 date: #{value}")
  nil
end

def xml_text(element)
  return "" unless element

  element.children.grep(REXML::Text).map(&:value).join.strip
end

def validate_canonical_feed_url(value, label)
  if value.to_s.strip.empty?
    fail_check("#{label} is missing")
    return nil
  end

  uri = URI.parse(value)
  unless uri.is_a?(URI::HTTPS) && uri.host&.downcase == SITE_HOST.downcase && uri.userinfo.nil? && value.start_with?("#{SITE_URL}/")
    fail_check("#{label} must use the canonical production origin #{SITE_URL}")
    return nil
  end

  fail_check("#{label} must not contain a query string") if uri.query
  fail_check("#{label} must not contain a fragment") if uri.fragment

  target = generated_file_for_path(uri.path)
  fail_check("#{label} points to a missing generated page: #{value}") unless File.file?(target)
  uri
rescue URI::InvalidURIError
  fail_check("#{label} is not a valid absolute URL: #{value}")
  nil
end

def validate_feed_discovery(relative, html)
  discovery_links = html.scan(%r{<link\b[^>]*>}i).select do |tag|
    tag_attribute(tag, "rel").to_s.split.include?("alternate") &&
      tag_attribute(tag, "type") == "application/rss+xml"
  end

  unless discovery_links.size == 1
    fail_check("#{relative}: expected exactly one RSS autodiscovery link")
    return
  end

  href = tag_attribute(discovery_links.first, "href")
  fail_check("#{relative}: RSS autodiscovery must point to #{SITE_URL}/feed.xml") unless href == "#{SITE_URL}/feed.xml"
end

def validate_footer_feed_link(relative, html)
  footer = html[%r{<footer\b[^>]*>.*?</footer>}im].to_s
  footer_links = footer.scan(%r{<a\b[^>]*>}i).select do |tag|
    tag_attribute(tag, "data-analytics-event") == "rss_open"
  end

  unless footer_links.size == 1
    fail_check("#{relative}: expected exactly one footer RSS link")
    return
  end

  link = footer_links.first
  href = tag_attribute(link, "href")
  allowed = ["/feed.xml", "#{SITE_URL}/feed.xml"]
  fail_check("#{relative}: footer RSS link must point to /feed.xml") unless allowed.include?(href)
  fail_check("#{relative}: footer RSS link must identify its analytics context") unless tag_attribute(link, "data-analytics-link-context") == "footer"
  fail_check("#{relative}: footer RSS link must identify its analytics destination") unless tag_attribute(link, "data-analytics-destination") == "/feed.xml"
end


def collect_expected_thinking_articles(html_files)
  article_files = html_files.select do |file|
    relative = relative_site_path(file)
    relative.start_with?("thinking/") && relative != "thinking/index.html"
  end

  article_files.to_h do |file|
    relative = relative_site_path(file)
    html = File.read(file)
    expected_url = generated_url_for_html(relative)
    canonical = canonical_href(html)
    fail_check("#{relative}: Thinking article canonical must match its generated URL #{expected_url}") unless canonical == expected_url
    fail_check("#{relative}: Thinking article must declare og:type=article") unless meta_content(html, "property", "og:type") == "article"

    published_at = parse_iso8601(
      meta_content(html, "property", "article:published_time"),
      "#{relative}: article:published_time"
    )
    modified_at = parse_iso8601(
      meta_content(html, "property", "article:modified_time"),
      "#{relative}: article:modified_time"
    )

    [expected_url, { relative: relative, published_at: published_at, modified_at: modified_at }]
  end
end

def validate_feed_content_urls(content, label)
  content.scan(%r{\b(?:href|src)\s*=\s*(["'])(.*?)\1}i).each do |(_, value)|
    if value.start_with?("/")
      fail_check("#{label} contains a root-relative internal URL: #{value}")
      next
    end

    uri = URI.parse(value)
    # Fragments remain meaningful inside an item's HTML. Every other relative
    # reference would resolve against the feed document rather than the article.
    if uri.relative? && !value.start_with?("#")
      fail_check("#{label} contains a relative href/src URL: #{value}")
      next
    end

    next unless uri.host&.downcase == SITE_HOST.downcase

    unless uri.is_a?(URI::HTTPS) && value.start_with?("#{SITE_URL}/")
      fail_check("#{label} contains a non-canonical internal URL: #{value}")
    end
  rescue URI::InvalidURIError
    fail_check("#{label} contains an invalid href/src URL: #{value}")
  end
end

def validate_feed(feed, expected_articles)
  return unless feed

  begin
    document = REXML::Document.new(feed)
  rescue REXML::ParseException => e
    fail_check("Invalid feed.xml: #{e.message.lines.first&.strip}")
    return
  end

  root = document.root
  unless root&.name == "rss" && root.attributes["version"] == "2.0"
    fail_check("feed.xml must be an RSS 2.0 document")
    return
  end

  channel = root.elements["channel"]
  unless channel
    fail_check("feed.xml is missing its channel")
    return
  end

  %w[title description].each do |field|
    fail_check("feed.xml channel #{field} is missing") if xml_text(channel.elements[field]).empty?
  end
  fail_check("feed.xml channel link must point to #{SITE_URL}/thinking/") unless xml_text(channel.elements["link"]) == "#{SITE_URL}/thinking/"
  fail_check("feed.xml channel language must be en") unless xml_text(channel.elements["language"]) == "en"

  atom_links = channel.elements.to_a.select { |element| element.name == "link" && element.namespace == ATOM_NAMESPACE }
  self_links = atom_links.select { |element| element.attributes["rel"] == "self" }
  if self_links.size != 1
    fail_check("feed.xml channel must contain exactly one atom:link rel=self")
  else
    self_link = self_links.first
    fail_check("feed.xml channel self URL must point to #{SITE_URL}/feed.xml") unless self_link.attributes["href"] == "#{SITE_URL}/feed.xml"
    fail_check("feed.xml channel self link type must be application/rss+xml") unless self_link.attributes["type"] == "application/rss+xml"
  end

  last_build_date = parse_rfc822(xml_text(channel.elements["lastBuildDate"]), "feed.xml channel lastBuildDate")
  expected_last_build_date = expected_articles.values.map { |article| article[:modified_at] || article[:published_at] }.compact.max
  if last_build_date && expected_last_build_date && last_build_date != expected_last_build_date
    fail_check("feed.xml channel lastBuildDate must match the newest editorial timestamp")
  end

  item_records = channel.get_elements("item").each_with_index.map do |item, index|
    label = "feed.xml item #{index + 1}"
    title = xml_text(item.elements["title"])
    description = xml_text(item.elements["description"])
    link = xml_text(item.elements["link"])
    guid_element = item.elements["guid"]
    guid = xml_text(guid_element)
    pub_date = parse_rfc822(xml_text(item.elements["pubDate"]), "#{label} pubDate")
    content_element = item.elements.to_a.find { |element| element.name == "encoded" && element.namespace == CONTENT_NAMESPACE }
    content = xml_text(content_element)

    fail_check("#{label} title is missing") if title.empty?
    fail_check("#{label} description is missing") if description.empty?
    validate_canonical_feed_url(link, "#{label} link")

    if guid_element.nil?
      fail_check("#{label} GUID is missing")
    else
      fail_check("#{label} GUID must declare isPermaLink=true") unless guid_element.attributes["isPermaLink"] == "true"
      validate_canonical_feed_url(guid, "#{label} GUID")
      fail_check("#{label} GUID must equal its canonical link") unless guid == link
    end

    if content_element.nil?
      fail_check("#{label} content:encoded is missing")
    elsif content.empty?
      fail_check("#{label} content:encoded is empty")
    else
      fail_check("#{label} content:encoded must contain rendered HTML") unless content.match?(%r{<[a-z][^>]*>}i)
      validate_feed_content_urls(content, "#{label} content:encoded")
    end

    expected = expected_articles[link]
    if expected && pub_date && expected[:published_at] && pub_date != expected[:published_at]
      fail_check("#{label} pubDate must match the Thinking article publication date")
    end

    { link: link, guid: guid, pub_date: pub_date }
  end

  feed_urls = item_records.map { |item| item[:link] }.reject(&:empty?)
  duplicate_urls = feed_urls.group_by(&:itself).select { |_, values| values.size > 1 }.keys
  fail_check("Duplicate feed item URLs: #{duplicate_urls.join(', ')}") unless duplicate_urls.empty?

  guids = item_records.map { |item| item[:guid] }.reject(&:empty?)
  duplicate_guids = guids.group_by(&:itself).select { |_, values| values.size > 1 }.keys
  fail_check("Duplicate feed GUIDs: #{duplicate_guids.join(', ')}") unless duplicate_guids.empty?

  expected_urls = expected_articles.keys.to_set
  actual_urls = feed_urls.to_set
  missing_urls = expected_urls - actual_urls
  unknown_urls = actual_urls - expected_urls
  fail_check("Feed is missing Thinking article URLs: #{missing_urls.to_a.sort.join(', ')}") unless missing_urls.empty?
  fail_check("Feed contains unknown item URLs: #{unknown_urls.to_a.sort.join(', ')}") unless unknown_urls.empty?

  item_records.each_cons(2) do |previous, current|
    next unless previous[:pub_date] && current[:pub_date]

    if current[:pub_date] > previous[:pub_date]
      fail_check("Feed items must be ordered by publication date descending")
    elsif current[:pub_date] == previous[:pub_date] && current[:link] < previous[:link]
      fail_check("Feed items with the same publication date must be ordered by canonical URL")
    end
  end
end

def validate_generated_url(relative, label, value)
  unless value&.start_with?("#{SITE_URL}/")
    fail_check("#{relative}: #{label} must use the canonical site URL")
    return
  end

  path = normalize_local_path(value)
  return if path.nil?

  target = generated_file_for_path(path)
  fail_check("#{relative}: #{label} points to a missing file: #{value}") unless File.file?(target)
end

required_files = %w[
  404.html
  index.html
  robots.txt
  sitemap.xml
  sitemap-static.xml
  sitemap.txt
  feed.xml
  assets/css/main.css
  assets/js/analytics-contract.generated.js
  assets/js/analytics.js
  assets/js/aggregate-analytics.js
  assets/js/consent.js
]

required_files.each do |file|
  fail_check("Missing generated file: #{file}") unless File.file?(site_path(file))
end

forbidden_files = %w[
  package.json
  package-lock.json
  playwright.config.js
  scripts
  _sitemap
  visual-reference
]

forbidden_files.each do |file|
  fail_check("Development file leaked into generated site: #{file}") if File.exist?(site_path(file))
end
fail_check("Browser tests leaked into generated site") if File.exist?(site_path("tests"))
fail_check("Aggregate service leaked into generated site") if File.exist?(site_path("_analytics"))

sitemap_result = SitemapValidation.validate(
  site_dir: SITE_DIR,
  config_path: File.expand_path("../_config.yml", __dir__)
)
sitemap_result.errors.each { |error| fail_check(error) }
sitemap_locs = sitemap_result.locations
development_sitemap = false

sitemap_locs.each do |url|
  path = normalize_local_path(url)
  next if path.nil?

  target = generated_file_for_path(path)
  fail_check("Sitemap URL has no generated file: #{url}") unless File.file?(target)
end

static_sitemap_urls = [
  "#{SITE_URL}/",
  "#{SITE_URL}/explore/",
  "#{SITE_URL}/thinking/"
]
static_sitemap_xml = read_file(site_path("sitemap-static.xml"))
if static_sitemap_xml
  begin
    document = REXML::Document.new(static_sitemap_xml)
    static_sitemap_locs = []
    REXML::XPath.each(document, "//*[local-name()='loc']") do |loc|
      static_sitemap_locs << loc.text.to_s.strip
    end

    unless static_sitemap_locs == static_sitemap_urls
      fail_check("sitemap-static.xml must contain only the canonical diagnostic URLs")
    end
  rescue REXML::ParseException => e
    fail_check("Invalid sitemap-static.xml: #{e.message.lines.first&.strip}")
  end
end

sitemap_txt = read_file(site_path("sitemap.txt"))
if sitemap_txt
  text_urls = sitemap_txt.lines.map(&:strip).reject(&:empty?)
  fail_check("sitemap.txt does not contain URLs") if text_urls.empty?
  duplicates = text_urls.group_by(&:itself).select { |_, values| values.size > 1 }.keys
  fail_check("Duplicate URLs in sitemap.txt: #{duplicates.join(', ')}") unless duplicates.empty?
  text_urls.each do |url|
    fail_check("Non-canonical sitemap.txt URL: #{url}") unless url.start_with?("#{SITE_URL}/")
  end

  unless sitemap_locs.empty?
    missing_from_text = sitemap_locs.to_set - text_urls.to_set
    extra_in_text = text_urls.to_set - sitemap_locs.to_set
    unless missing_from_text.empty?
      fail_check("sitemap.txt is missing sitemap.xml URLs: #{missing_from_text.to_a.join(', ')}")
    end
    unless extra_in_text.empty?
      fail_check("sitemap.txt contains URLs absent from sitemap.xml: #{extra_in_text.to_a.join(', ')}")
    end
  end
end

robots = read_file(site_path("robots.txt"))
if robots
  sitemap_declarations = robots.lines.map do |line|
    match = line.match(/^Sitemap:\s*(\S+)\s*$/i)
    match && match[1]
  end.compact
  canonical_sitemap = "#{SITE_URL}/sitemap.xml"
  text_sitemap = "#{SITE_URL}/sitemap.txt"
  expected_sitemaps = [canonical_sitemap, text_sitemap, sitemap_result.external_sitemap_url]
  unless sitemap_declarations == expected_sitemaps
    fail_check("robots.txt must declare the canonical, text, and external sitemap URLs in order")
  end
end

feed = read_file(site_path("feed.xml"))

canonical_urls = []
sitemap_exclusions = sitemap_excluded_canonicals
html_files = Dir.glob(site_path("**/*.html")).sort
fail_check("No generated HTML files found") if html_files.empty?

html_files.each do |file|
  html = read_file(file)
  next unless html

  relative = relative_site_path(file)
  validate_feed_discovery(relative, html)
  validate_footer_feed_link(relative, html)
  ids = html_ids(html)
  all_ids = html.scan(/\sid=(["'])(.*?)\1/).map { |(_, id)| id }
  duplicate_ids = all_ids.group_by(&:itself).select { |_, values| values.size > 1 }.keys

  fail_check("#{relative}: unrendered Liquid tag found") if html.match?(/({{.*?}}|{%.*?%})/m)
  fail_check("#{relative}: missing <title>") unless html.match?(%r{<title>.+?</title>}im)
  fail_check("#{relative}: missing meta description") unless html.match?(%r{<meta\s+name=["']description["']}i)
  fail_check("#{relative}: root html language must be English") unless html.match?(%r{<html\s+lang=["']en["']}i)
  fail_check("#{relative}: expected exactly one h1") unless html.scan(%r{<h1\b}i).size == 1
  fail_check("#{relative}: expected exactly one main landmark") unless html.scan(%r{<main\b}i).size == 1
  fail_check("#{relative}: main landmark must expose id=top") unless html.match?(%r{<main\b[^>]*\bid=["']top["']}i)
  fail_check("#{relative}: duplicate ids: #{duplicate_ids.join(', ')}") unless duplicate_ids.empty?
  fail_check("#{relative}: missing skip link") unless html.match?(%r{<a\s+class=["']skip-link["']\s+href=["']#top["']}i)
  fail_check("#{relative}: missing Open Graph title") unless html.match?(%r{<meta\s+property=["']og:title["']}i)
  fail_check("#{relative}: missing Open Graph description") unless html.match?(%r{<meta\s+property=["']og:description["']}i)
  fail_check("#{relative}: missing Open Graph type") unless meta_content(html, "property", "og:type")

  local_stylesheets = html.scan(%r{<link\b[^>]*\brel=["']stylesheet["'][^>]*>}i).map do |tag|
    tag[%r{\bhref=["']([^"']+)["']}i, 1]
  end.compact.select { |href| href.start_with?("/assets/css/") }.map { |href| href.sub(/\?.*\z/, "") }
  unless local_stylesheets == ["/assets/css/main.css"]
    fail_check("#{relative}: must load exactly one canonical site stylesheet")
  end

  og_image = meta_content(html, "property", "og:image")
  og_image_alt = meta_content(html, "property", "og:image:alt")
  fail_check("#{relative}: missing Open Graph image") unless og_image
  fail_check("#{relative}: missing Open Graph image alt text") unless og_image_alt
  validate_generated_url(relative, "Open Graph image", og_image) if og_image

  twitter_card = meta_content(html, "name", "twitter:card")
  fail_check("#{relative}: twitter:card must be summary_large_image") unless twitter_card == "summary_large_image"
  %w[twitter:title twitter:description twitter:image twitter:image:alt].each do |name|
    fail_check("#{relative}: missing #{name}") unless meta_content(html, "name", name)
  end
  twitter_image = meta_content(html, "name", "twitter:image")
  validate_generated_url(relative, "Twitter image", twitter_image) if twitter_image

  canonical_match = html.match(%r{<link\s+rel=["']canonical["']\s+href=["']([^"']+)["']}i)
  legacy_redirect = html.include?("data-legacy-redirect")
  noindex = meta_content(html, "name", "robots").to_s.split(",").map(&:strip).include?("noindex")
  if canonical_match
    canonical = canonical_match[1]
    canonical_urls << canonical unless legacy_redirect
    fail_check("#{relative}: non-canonical canonical URL #{canonical}") unless canonical.start_with?("#{SITE_URL}/")
    explicitly_excluded = sitemap_exclusions.include?(canonical)
    if explicitly_excluded && sitemap_locs.include?(canonical)
      fail_check("#{relative}: sitemap-excluded canonical URL must not be listed in sitemap.xml")
    elsif noindex && !legacy_redirect && sitemap_locs.include?(canonical)
      fail_check("#{relative}: noindex canonical URL must not be listed in sitemap.xml")
    elsif !noindex && !(legacy_redirect || explicitly_excluded || sitemap_locs.empty? || sitemap_locs.include?(canonical) || defined?(development_sitemap) && development_sitemap)
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
      unless target_ids.include?(fragment) || application_fragment?(target_html, fragment)
        fail_check("#{relative}: broken fragment link #{href}")
      end
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
    fail_check("#{relative}: image missing intrinsic width") unless image.match?(%r{\swidth=["']\d+["']}i)
    fail_check("#{relative}: image missing intrinsic height") unless image.match?(%r{\sheight=["']\d+["']}i)
  end

  html.scan(%r{<script\s+type=["']application/ld\+json["']\s*>(.*?)</script>}im).each do |(json_ld)|
    JSON.parse(json_ld)
  rescue JSON::ParserError => e
    fail_check("#{relative}: invalid JSON-LD: #{e.message}")
  end
end

duplicate_canonicals = canonical_urls.group_by(&:itself).select { |_, values| values.size > 1 }.keys
fail_check("Duplicate canonical URLs: #{duplicate_canonicals.join(', ')}") unless duplicate_canonicals.empty?

expected_thinking_articles = collect_expected_thinking_articles(html_files)
validate_feed(feed, expected_thinking_articles)

if @errors.any?
  warn "\nSite validation failed:"
  @errors.each { |error| warn "- #{error}" }
  exit 1
end

puts "Site validation passed: #{html_files.size} HTML files and #{expected_thinking_articles.size} RSS items checked."
