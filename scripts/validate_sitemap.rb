#!/usr/bin/env ruby
# frozen_string_literal: true

require "rexml/document"
require "set"
require "uri"
require "yaml"

module SitemapValidation
  SITEMAP_PATH = "sitemap.xml"
  MAX_URLS = 50_000
  MAX_BYTES = 50 * 1024 * 1024
  FORBIDDEN_PATH_PARTS = %w[
    .github
    _analytics
    _site
    node_modules
    package.json
    playwright-report
    scripts
    test-results
    tests
    visual-reference
  ].freeze

  Result = Struct.new(:errors, :locations, :bytesize, :external_sitemap_url, keyword_init: true)

  module_function

  def validate(site_dir:, config_path:)
    errors = []
    locations = []
    sitemap_path = File.join(site_dir, SITEMAP_PATH)
    config = read_config(config_path, errors)
    canonical_site_url = read_canonical_site_url(config, errors) if config
    external_sitemap_url = read_external_sitemap_url(config, errors, canonical_site_url) if config

    unless File.file?(sitemap_path)
      errors << "Missing generated sitemap: #{sitemap_path}"
      return Result.new(
        errors: errors,
        locations: locations,
        bytesize: 0,
        external_sitemap_url: external_sitemap_url
      )
    end

    sitemap_xml = File.binread(sitemap_path)
    bytesize = sitemap_xml.bytesize
    errors << "sitemap.xml exceeds the 50 MiB protocol limit: #{bytesize} bytes" if bytesize > MAX_BYTES

    begin
      document = REXML::Document.new(sitemap_xml)
      root = document.root
      errors << "sitemap.xml root element must be urlset" unless root&.name == "urlset"
      REXML::XPath.each(document, "//*[local-name()='loc']") do |loc|
        locations << loc.text.to_s.strip
      end
    rescue REXML::ParseException => e
      errors << "Invalid sitemap.xml: #{e.message.lines.first&.strip}"
    end

    errors << "sitemap.xml does not contain URLs" if locations.empty?
    errors << "sitemap.xml contains more than #{MAX_URLS} URLs: #{locations.size}" if locations.size > MAX_URLS

    duplicates = locations.group_by(&:itself).select { |_, values| values.size > 1 }.keys
    errors << "Duplicate URLs in sitemap.xml: #{duplicates.join(', ')}" unless duplicates.empty?

    locations.each do |location|
      validate_location(location, errors, canonical_site_url, external_sitemap_url)
    end

    Result.new(
      errors: errors,
      locations: locations,
      bytesize: bytesize,
      external_sitemap_url: external_sitemap_url
    )
  end

  def read_config(config_path, errors)
    YAML.safe_load(File.read(config_path), permitted_classes: [], aliases: true) || {}
  rescue Errno::ENOENT
    errors << "Missing site configuration: #{config_path}"
    nil
  rescue Psych::SyntaxError => e
    errors << "Invalid site configuration: #{e.message.lines.first&.strip}"
    nil
  end

  def read_canonical_site_url(config, errors)
    value = (config["production_url"] || config["url"]).to_s.strip.delete_suffix("/")
    if value.empty?
      errors << "_config.yml must define production_url or url"
      return nil
    end

    uri = URI.parse(value)
    valid = uri.is_a?(URI::HTTPS) && uri.host && uri.userinfo.nil? && ["", "/"].include?(uri.path) && uri.query.nil? && uri.fragment.nil?
    errors << "production_url/url must define an absolute HTTPS website origin" unless valid
    value if valid
  rescue URI::InvalidURIError => e
    errors << "Invalid production_url/url configuration: #{e.message.lines.first&.strip}"
    nil
  end

  def read_external_sitemap_url(config, errors, canonical_site_url)
    value = config["external_sitemap_url"].to_s.strip
    if value.empty?
      errors << "_config.yml must define external_sitemap_url"
      return nil
    end

    uri = URI.parse(value)
    valid = uri.is_a?(URI::HTTPS) && uri.host&.end_with?(".workers.dev") && uri.path == "/sitemap.xml" && uri.query.nil? && uri.fragment.nil?
    errors << "external_sitemap_url must be an HTTPS workers.dev /sitemap.xml URL" unless valid
    errors << "external_sitemap_url must not use the canonical website origin" if canonical_site_url && uri.host == URI(canonical_site_url).host
    value
  rescue URI::InvalidURIError => e
    errors << "Invalid external_sitemap_url configuration: #{e.message.lines.first&.strip}"
    nil
  end

  def validate_location(location, errors, canonical_site_url, external_sitemap_url)
    uri = URI.parse(location)
    unless uri.is_a?(URI::HTTPS) && uri.absolute?
      errors << "Sitemap URL must be absolute HTTPS: #{location}"
      return
    end

    if canonical_site_url
      canonical_uri = URI(canonical_site_url)
      unless uri.scheme == canonical_uri.scheme && uri.host == canonical_uri.host && uri.port == canonical_uri.port
        errors << "Non-canonical sitemap URL: #{location}"
      end
    end

    errors << "Sitemap URL must not include credentials, query, or fragment: #{location}" if uri.userinfo || uri.query || uri.fragment
    errors << "Worker hostname must not appear in sitemap URLs: #{location}" if uri.host&.end_with?(".workers.dev")
    errors << "External sitemap URL must not appear as a canonical page URL: #{location}" if external_sitemap_url && location == external_sitemap_url

    path = uri.path.to_s
    errors << "/404.html must be excluded from sitemap.xml" if path == "/404.html"

    path_parts = path.split("/").reject(&:empty?)
    forbidden_parts = path_parts & FORBIDDEN_PATH_PARTS
    unless forbidden_parts.empty?
      errors << "Build or test path must not appear in sitemap.xml: #{location}"
    end
  rescue URI::InvalidURIError
    errors << "Invalid sitemap URL: #{location}"
  end
end

if $PROGRAM_NAME == __FILE__
  site_dir = ENV["SITE_OUTPUT_DIR"] ? File.expand_path(ENV.fetch("SITE_OUTPUT_DIR")) : File.expand_path("../_site", __dir__)
  config_path = ENV["SITE_CONFIG_PATH"] ? File.expand_path(ENV.fetch("SITE_CONFIG_PATH")) : File.expand_path("../_config.yml", __dir__)
  result = SitemapValidation.validate(site_dir: site_dir, config_path: config_path)

  if result.errors.any?
    warn "\nSitemap validation failed:"
    result.errors.each { |error| warn "- #{error}" }
    exit 1
  end

  puts "Sitemap validation passed: #{result.locations.size} URLs, #{result.bytesize} bytes."
end
