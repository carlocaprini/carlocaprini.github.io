# frozen_string_literal: true

require "fileutils"
require "minitest/autorun"
require "open3"
require "rbconfig"
require "tmpdir"

class ValidatorTest < Minitest::Test
  ROOT = File.expand_path("../..", __dir__)
  SOURCE_VALIDATOR = File.join(ROOT, "scripts/validate_source.rb")
  SITE_VALIDATOR = File.join(ROOT, "scripts/validate_site.rb")
  SOURCE_ENTRIES = %w[
    .github
    _analytics
    _config.analytics-local.yml
    _config.yml
    _data
    _includes
    _influences
    _layouts
    assets
    contracts
    index.md
    pages
  ].freeze

  def run_validator(script, environment)
    stdout, stderr, status = Open3.capture3(environment, RbConfig.ruby, script, chdir: ROOT)
    [status, "#{stdout}#{stderr}"]
  end

  def with_source_fixture
    Dir.mktmpdir("source-validator-") do |directory|
      SOURCE_ENTRIES.each do |entry|
        FileUtils.cp_r(File.join(ROOT, entry), File.join(directory, entry))
      end
      yield directory
    end
  end

  def assert_invalid_source(expected)
    with_source_fixture do |directory|
      yield directory
      status, output = run_validator(SOURCE_VALIDATOR, { "SITE_SOURCE_DIR" => directory })
      refute status.success?, output
      assert_match expected, output
    end
  end

  def replace!(path, before, after)
    source = File.read(path)
    replacement = source.sub(before, after)
    refute_equal source, replacement, "Mutation did not match #{path}"
    File.write(path, replacement)
  end

  def note_path(directory)
    File.join(directory, "pages/thinking/waiting-as-product-decision.md")
  end

  def influence_path(directory)
    File.join(directory, "_influences/ai-coding-is-not-the-same-as-software-engineering-and-it-matters.md")
  end

  def build_generated_fixture(directory)
    urls = ["/", "/explore/", "/thinking/"]
    FileUtils.mkdir_p(File.join(directory, "assets/css"))
    FileUtils.mkdir_p(File.join(directory, "assets/js"))
    FileUtils.mkdir_p(File.join(directory, "assets"))
    File.write(File.join(directory, "assets/test.webp"), "fixture")
    File.write(File.join(directory, "assets/css/main.css"), "body { color: white; }\n")
    %w[analytics-contract.generated.js analytics.js aggregate-analytics.js consent.js].each do |name|
      File.write(File.join(directory, "assets/js", name), "// fixture\n")
    end

    urls.each do |path|
      destination = path == "/" ? File.join(directory, "index.html") : File.join(directory, path.delete_prefix("/"), "index.html")
      FileUtils.mkdir_p(File.dirname(destination))
      canonical = "https://carlocaprini.github.io#{path}"
      File.write(destination, <<~HTML)
        <!doctype html>
        <html lang="en">
        <head>
          <title>Fixture page</title>
          <meta name="description" content="Fixture description">
          <meta property="og:title" content="Fixture page">
          <meta property="og:description" content="Fixture description">
          <meta property="og:type" content="website">
          <meta property="og:image" content="https://carlocaprini.github.io/assets/test.webp">
          <meta property="og:image:alt" content="Fixture image">
          <meta name="twitter:card" content="summary_large_image">
          <meta name="twitter:title" content="Fixture page">
          <meta name="twitter:description" content="Fixture description">
          <meta name="twitter:image" content="https://carlocaprini.github.io/assets/test.webp">
          <meta name="twitter:image:alt" content="Fixture image">
          <link rel="canonical" href="#{canonical}">
          <link rel="stylesheet" href="/assets/css/main.css">
          <script type="application/ld+json">{"@context":"https://schema.org","@type":"WebPage"}</script>
        </head>
        <body>
          <a class="skip-link" href="#top">Skip</a>
          <main id="top"><h1>Fixture page</h1></main>
        </body>
        </html>
      HTML
    end

    sitemap_entries = urls.map { |path| "  <url><loc>https://carlocaprini.github.io#{path}</loc></url>" }.join("\n")
    sitemap = "<?xml version=\"1.0\"?><urlset xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\">\n#{sitemap_entries}\n</urlset>\n"
    File.write(File.join(directory, "sitemap.xml"), sitemap)
    File.write(File.join(directory, "sitemap-static.xml"), sitemap)
    File.write(File.join(directory, "sitemap.txt"), urls.map { |path| "https://carlocaprini.github.io#{path}" }.join("\n") + "\n")
    File.write(File.join(directory, "robots.txt"), <<~TEXT)
      Sitemap: https://carlocaprini.github.io/sitemap.xml
      Sitemap: https://carlocaprini.github.io/sitemap.txt
      Sitemap: https://carlocaprini.github.io/sitemap-static.xml
    TEXT
    File.write(File.join(directory, "feed.xml"), "<?xml version=\"1.0\"?><feed/>\n")
  end

  def assert_invalid_output(expected)
    Dir.mktmpdir("generated-validator-") do |directory|
      build_generated_fixture(directory)
      yield directory
      status, output = run_validator(SITE_VALIDATOR, { "SITE_OUTPUT_DIR" => directory })
      refute status.success?, output
      assert_match expected, output
    end
  end

  def test_real_source_is_valid
    status, output = run_validator(SOURCE_VALIDATOR, { "SITE_SOURCE_DIR" => ROOT })
    assert status.success?, output
  end

  def test_source_rejects_unknown_topic
    assert_invalid_source(/unknown topics: invented-topic/) do |directory|
      replace!(note_path(directory), "  - product-decisions", "  - invented-topic")
    end
  end

  def test_source_rejects_more_than_two_topics
    assert_invalid_source(/must define one or two topics/) do |directory|
      replace!(note_path(directory), "  - product-decisions", "  - product-decisions\n  - software-systems\n  - teams-and-collaboration")
    end
  end

  def test_source_rejects_duplicate_permalink
    assert_invalid_source(/duplicate permalink/) do |directory|
      replace!(note_path(directory), "/thinking/waiting-as-product-decision/", "/thinking/temporary-solutions-become-permanent/")
    end
  end

  def test_source_rejects_missing_note_summary
    assert_invalid_source(/missing summary/) do |directory|
      replace!(note_path(directory), /^summary:/, "removed_summary:")
    end
  end

  def test_source_rejects_unknown_thinking_list_reference
    assert_invalid_source(/unknown note URLs/) do |directory|
      path = File.join(directory, "pages/thinking.md")
      replace!(path, "/thinking/stop-asking-people-for-information-the-system-already-has/", "/thinking/missing-note/")
    end
  end

  def test_source_rejects_note_missing_from_canonical_listing
    assert_invalid_source(/notes missing from notes list/) do |directory|
      path = File.join(directory, "pages/thinking.md")
      source = File.read(path).gsub(/^\s*- url: \/thinking\/waiting-as-product-decision\/\n/, "")
      File.write(path, source)
    end
  end

  def test_source_rejects_invalid_influence_metadata
    assert_invalid_source(/invalid external_url/) do |directory|
      replace!(influence_path(directory), /^external_url:.*$/, "external_url: not-a-url")
    end
  end

  def test_source_rejects_missing_related_note
    assert_invalid_source(/related_note does not match/) do |directory|
      replace!(influence_path(directory), /^related_note:.*$/, "related_note: /thinking/missing-note/")
    end
  end

  def test_source_rejects_question_note_reference
    assert_invalid_source(/references unknown notes/) do |directory|
      path = File.join(directory, "_data/questions.yml")
      replace!(path, "/thinking/most-product-disagreements-come-from-missing-information/", "/thinking/missing-note/")
    end
  end

  def test_source_rejects_question_influence_reference
    assert_invalid_source(/references unknown influences/) do |directory|
      path = File.join(directory, "_data/questions.yml")
      replace!(path, "slug: jeff-bezos-smart-decisions", "slug: missing-influence")
    end
  end

  def test_source_rejects_question_experience_anchor
    assert_invalid_source(/references unknown Experience anchor/) do |directory|
      path = File.join(directory, "_data/questions.yml")
      replace!(path, "/experience/#product-direction", "/experience/#missing-anchor")
    end
  end

  def test_source_rejects_invalid_series_order
    assert_invalid_source(/series_order values must be sequential/) do |directory|
      path = File.join(directory, "pages/thinking/i-stopped-trying-to-build-jarvis.md")
      replace!(path, "series_order: 1", "series_order: 9")
    end
  end

  def test_source_rejects_invalid_home_destination
    assert_invalid_source(/entry_points cards must match/) do |directory|
      path = File.join(directory, "_data/home.yml")
      replace!(path, "url: /influences/", "url: /missing-destination/")
    end
  end

  def test_minimal_generated_fixture_is_valid
    Dir.mktmpdir("generated-validator-") do |directory|
      build_generated_fixture(directory)
      status, output = run_validator(SITE_VALIDATOR, { "SITE_OUTPUT_DIR" => directory })
      assert status.success?, output
    end
  end

  def test_generated_output_rejects_missing_required_file
    assert_invalid_output(/Missing generated file: robots.txt/) do |directory|
      FileUtils.rm(File.join(directory, "robots.txt"))
    end
  end

  def test_generated_output_rejects_broken_internal_link
    assert_invalid_output(/broken internal link \/missing\//) do |directory|
      path = File.join(directory, "index.html")
      replace!(path, "</main>", "<a href=\"/missing/\">Missing</a></main>")
    end
  end

  def test_generated_output_rejects_noncanonical_url
    assert_invalid_output(/non-canonical canonical URL/) do |directory|
      path = File.join(directory, "index.html")
      replace!(path, "https://carlocaprini.github.io/\">", "https://example.com/\">")
    end
  end

  def test_generated_output_rejects_missing_asset
    assert_invalid_output(/Open Graph image points to a missing file/) do |directory|
      FileUtils.rm(File.join(directory, "assets/test.webp"))
    end
  end

  def test_generated_output_rejects_inconsistent_sitemap
    assert_invalid_output(/Sitemap URL has no generated file/) do |directory|
      FileUtils.rm_rf(File.join(directory, "thinking"))
    end
  end

  def test_generated_output_rejects_malformed_structured_data
    assert_invalid_output(/invalid JSON-LD/) do |directory|
      path = File.join(directory, "index.html")
      replace!(path, "{\"@context\":\"https://schema.org\",\"@type\":\"WebPage\"}", "{not-json}")
    end
  end

  def test_generated_output_rejects_noncanonical_stylesheet_delivery
    assert_invalid_output(/must load exactly one canonical site stylesheet/) do |directory|
      path = File.join(directory, "index.html")
      replace!(path, "</head>", "<link rel=\"stylesheet\" href=\"/assets/css/extra.css\">\n</head>")
    end
  end
end
