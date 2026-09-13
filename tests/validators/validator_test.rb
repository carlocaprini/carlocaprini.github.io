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
    404.html
    contracts
    feed.xml
    Gemfile
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

  def mutate_file!(path)
    source = File.read(path)
    replacement = yield source
    refute_equal source, replacement, "Mutation did not change #{path}"
    File.write(path, replacement)
  end

  def note_path(directory)
    File.join(directory, "pages/thinking/waiting-as-product-decision.md")
  end

  def influence_path(directory)
    File.join(directory, "_influences/ai-coding-is-not-the-same-as-software-engineering-and-it-matters.md")
  end

  def generated_destination(directory, path)
    return File.join(directory, "index.html") if path == "/"

    File.join(directory, path.delete_prefix("/"), "index.html")
  end

  def generated_page_html(path, article = nil)
    canonical = "https://carlocaprini.github.io#{path}"
    article_metadata = if article
                         <<~HTML
                           <meta property="article:published_time" content="#{article.fetch(:published_at)}">
                           <meta property="article:modified_time" content="#{article.fetch(:modified_at)}">
                         HTML
                       else
                         ""
                       end

    <<~HTML
      <!doctype html>
      <html lang="en">
      <head>
        <title>Fixture page</title>
        <meta name="description" content="Fixture description">
        <meta property="og:title" content="Fixture page">
        <meta property="og:description" content="Fixture description">
        <meta property="og:type" content="#{article ? 'article' : 'website'}">
        <meta property="og:image" content="https://carlocaprini.github.io/assets/test.webp">
        <meta property="og:image:alt" content="Fixture image">
        <meta name="twitter:card" content="summary_large_image">
        <meta name="twitter:title" content="Fixture page">
        <meta name="twitter:description" content="Fixture description">
        <meta name="twitter:image" content="https://carlocaprini.github.io/assets/test.webp">
        <meta name="twitter:image:alt" content="Fixture image">
        <link rel="canonical" href="#{canonical}">
        <link rel="alternate" type="application/rss+xml" title="Fixture feed" href="https://carlocaprini.github.io/feed.xml">
        <link rel="stylesheet" href="/assets/css/main.css">
        #{article_metadata}<script type="application/ld+json">{"@context":"https://schema.org","@type":"WebPage"}</script>
      </head>
      <body>
        <a class="skip-link" href="#top">Skip</a>
        <main id="top"><h1>Fixture page</h1></main>
        <footer><a href="/feed.xml" data-analytics-event="rss_open" data-analytics-link-context="footer" data-analytics-destination="/feed.xml">RSS</a></footer>
      </body>
      </html>
    HTML
  end

  def valid_feed_xml
    <<~XML
      <?xml version="1.0" encoding="UTF-8"?>
      <rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:atom="http://www.w3.org/2005/Atom">
        <channel>
          <title>Fixture Thinking</title>
          <description>Fixture feed description</description>
          <link>https://carlocaprini.github.io/thinking/</link>
          <atom:link href="https://carlocaprini.github.io/feed.xml" rel="self" type="application/rss+xml" />
          <language>en</language>
          <lastBuildDate>Fri, 04 Sep 2026 00:00:00 +0000</lastBuildDate>
          <item>
            <title>Newer note</title>
            <description>Newer description</description>
            <link>https://carlocaprini.github.io/thinking/newer-note/</link>
            <guid isPermaLink="true">https://carlocaprini.github.io/thinking/newer-note/</guid>
            <pubDate>Tue, 01 Sep 2026 00:00:00 +0000</pubDate>
            <content:encoded><![CDATA[<p>Newer content with an <a href="https://example.com/reference">external reference</a>.</p>]]></content:encoded>
          </item>
          <item>
            <title>Older note</title>
            <description>Older description</description>
            <link>https://carlocaprini.github.io/thinking/older-note/</link>
            <guid isPermaLink="true">https://carlocaprini.github.io/thinking/older-note/</guid>
            <pubDate>Sat, 01 Aug 2026 00:00:00 +0000</pubDate>
            <content:encoded><![CDATA[<p>Older content with an <a href="https://carlocaprini.github.io/thinking/newer-note/">internal reference</a>.</p>]]></content:encoded>
          </item>
        </channel>
      </rss>
    XML
  end

  def build_generated_fixture(directory)
    pages = [
      { path: "/" },
      { path: "/explore/" },
      { path: "/thinking/" },
      {
        path: "/thinking/newer-note/",
        article: { published_at: "2026-09-01T00:00:00+00:00", modified_at: "2026-09-04T00:00:00+00:00" }
      },
      {
        path: "/thinking/older-note/",
        article: { published_at: "2026-08-01T00:00:00+00:00", modified_at: "2026-08-02T00:00:00+00:00" }
      }
    ]
    urls = pages.map { |page| page.fetch(:path) }
    FileUtils.mkdir_p(File.join(directory, "assets/css"))
    FileUtils.mkdir_p(File.join(directory, "assets/js"))
    FileUtils.mkdir_p(File.join(directory, "assets"))
    File.write(File.join(directory, "assets/test.webp"), "fixture")
    File.write(File.join(directory, "assets/css/main.css"), "body { color: white; }\n")
    %w[analytics-contract.generated.js analytics.js aggregate-analytics.js consent.js].each do |name|
      File.write(File.join(directory, "assets/js", name), "// fixture\n")
    end

    pages.each do |page|
      path = page.fetch(:path)
      destination = generated_destination(directory, path)
      FileUtils.mkdir_p(File.dirname(destination))
      File.write(destination, generated_page_html(path, page[:article]))
    end

    not_found = File.read(File.join(directory, "index.html"))
      .sub("<title>Fixture page</title>", "<title>Page not found</title>")
      .sub('<link rel="canonical" href="https://carlocaprini.github.io/">', '<link rel="canonical" href="https://carlocaprini.github.io/404.html">')
      .sub("</head>", "<meta name=\"robots\" content=\"noindex, follow\">\n</head>")
    File.write(File.join(directory, "404.html"), not_found)

    sitemap_entries = urls.map { |path| "  <url><loc>https://carlocaprini.github.io#{path}</loc></url>" }.join("\n")
    sitemap = "<?xml version=\"1.0\"?><urlset xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\">\n#{sitemap_entries}\n</urlset>\n"
    File.write(File.join(directory, "sitemap.xml"), sitemap)
    static_urls = ["/", "/explore/", "/thinking/"]
    static_entries = static_urls.map { |path| "  <url><loc>https://carlocaprini.github.io#{path}</loc></url>" }.join("\n")
    File.write(File.join(directory, "sitemap-static.xml"), "<?xml version=\"1.0\"?><urlset>\n#{static_entries}\n</urlset>\n")
    File.write(File.join(directory, "sitemap.txt"), urls.map { |path| "https://carlocaprini.github.io#{path}" }.join("\n") + "\n")
    File.write(File.join(directory, "robots.txt"), <<~TEXT)
      Sitemap: https://carlocaprini.github.io/sitemap.xml
    TEXT
    File.write(File.join(directory, "feed.xml"), valid_feed_xml)
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

  def assert_valid_output
    Dir.mktmpdir("generated-validator-") do |directory|
      build_generated_fixture(directory)
      yield directory if block_given?
      status, output = run_validator(SITE_VALIDATOR, { "SITE_OUTPUT_DIR" => directory })
      assert status.success?, output
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

  def test_source_rejects_topics_that_are_not_an_ordered_list
    assert_invalid_source(/must define one or two topics as an ordered list/) do |directory|
      replace!(note_path(directory), "topics:\n  - product-decisions", "topics: product-decisions")
    end
  end

  def test_source_rejects_duplicate_topics
    assert_invalid_source(/duplicate topics make primary-topic order ambiguous/) do |directory|
      replace!(note_path(directory), "  - product-decisions", "  - product-decisions\n  - product-decisions")
    end
  end

  def test_source_rejects_invalid_topic_visual_color
    assert_invalid_source(/must define a six-digit visual color/) do |directory|
      path = File.join(directory, "_data/topics.yml")
      replace!(path, 'color: "#fbbf24"', 'color: "amber"')
    end
  end

  def test_source_rejects_duplicate_topic_motif_family
    assert_invalid_source(/topic motif families must be unique/) do |directory|
      path = File.join(directory, "_data/topics.yml")
      replace!(path, "motif: bounded-loops", "motif: branching")
    end
  end

  def test_source_rejects_unsupported_topic_motif_family
    assert_invalid_source(/unsupported visual motif family "bounded-loop"/) do |directory|
      path = File.join(directory, "_data/topics.yml")
      replace!(path, "motif: bounded-loops", "motif: bounded-loop")
    end
  end

  def test_source_rejects_unknown_article_topic_motif_variant
    assert_invalid_source(/article_topic_motif_variant must be balanced or spatial/) do |directory|
      path = File.join(directory, "_config.yml")
      replace!(path, "article_topic_motif_variant: spatial", "article_topic_motif_variant: loud")
    end
  end

  def test_source_rejects_unknown_article_topic_motif_variant_override
    assert_invalid_source(%r{pages/thinking/waiting-as-product-decision.md: article_topic_motif_variant must be balanced or spatial}) do |directory|
      path = note_path(directory)
      replace!(path, "layout: article", "layout: article\narticle_topic_motif_variant: loud")
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

  def test_source_rejects_jekyll_feed_plugin_ownership
    assert_invalid_source(/jekyll-feed must not be enabled/) do |directory|
      path = File.join(directory, "_config.yml")
      replace!(path, "plugins:\n  - jekyll-sitemap", "plugins:\n  - jekyll-feed\n  - jekyll-sitemap")
    end
  end

  def test_source_rejects_jekyll_feed_gem_ownership
    assert_invalid_source(/jekyll-feed must not be declared/) do |directory|
      path = File.join(directory, "Gemfile")
      replace!(path, '  gem "jekyll-sitemap", "~> 1.4"', "  gem \"jekyll-feed\", \"~> 0.17\"\n  gem \"jekyll-sitemap\", \"~> 1.4\"")
    end
  end

  def test_source_rejects_noncanonical_feed_permalink
    assert_invalid_source(/feed.xml: permalink must be \/feed.xml/) do |directory|
      path = File.join(directory, "feed.xml")
      replace!(path, "permalink: /feed.xml", "permalink: /rss.xml")
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

  def test_source_rejects_indexable_404
    assert_invalid_source(/404.html: robots must be noindex, follow/) do |directory|
      path = File.join(directory, "404.html")
      replace!(path, "robots: noindex, follow", "robots: index, follow")
    end
  end

  def test_source_rejects_incomplete_start_here_selection
    assert_invalid_source(/_data\/start_here.yml: must define exactly three notes/) do |directory|
      path = File.join(directory, "_data/start_here.yml")
      replace!(path, "  - url: /thinking/waiting-as-product-decision/\n", "")
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

  def test_source_rejects_missing_question_synthesis
    assert_invalid_source(/must define two synthesis paragraphs/) do |directory|
      path = File.join(directory, "_data/questions.yml")
      replace!(path, /^    synthesis:\n(?:      - .*\n){2}/, "")
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
    assert_valid_output
  end

  def test_generated_feed_rejects_missing_thinking_note
    assert_invalid_output(/Feed is missing Thinking article URLs: .*older-note/) do |directory|
      path = File.join(directory, "feed.xml")
      mutate_file!(path) do |source|
        source.sub(%r{\s*<item>\s*<title>Older note</title>.*?</item>}m, "")
      end
    end
  end

  def test_generated_feed_rejects_duplicate_item
    assert_invalid_output(/Duplicate feed item URLs: .*newer-note/) do |directory|
      path = File.join(directory, "feed.xml")
      mutate_file!(path) do |source|
        item = source[%r{<item>\s*<title>Newer note</title>.*?</item>}m]
        source.sub("</channel>", "#{item}\n  </channel>")
      end
    end
  end

  def test_generated_feed_rejects_extra_unknown_item
    assert_invalid_output(/Feed contains unknown item URLs: .*unknown-note/) do |directory|
      path = File.join(directory, "feed.xml")
      mutate_file!(path) do |source|
        item = source[%r{<item>\s*<title>Older note</title>.*?</item>}m]
          .gsub("Older note", "Unknown note")
          .gsub("older-note", "unknown-note")
        source.sub("</channel>", "#{item}\n  </channel>")
      end
    end
  end

  def test_generated_feed_rejects_wrong_item_host
    assert_invalid_output(/item 1 link must use the canonical production origin/) do |directory|
      path = File.join(directory, "feed.xml")
      replace!(path, "<link>https://carlocaprini.github.io/thinking/newer-note/</link>", "<link>https://example.com/thinking/newer-note/</link>")
    end
  end

  def test_generated_feed_rejects_relative_item_link
    assert_invalid_output(/item 1 link must use the canonical production origin/) do |directory|
      path = File.join(directory, "feed.xml")
      replace!(path, "<link>https://carlocaprini.github.io/thinking/newer-note/</link>", "<link>/thinking/newer-note/</link>")
    end
  end

  def test_generated_feed_rejects_duplicate_guid
    assert_invalid_output(/Duplicate feed GUIDs: .*newer-note/) do |directory|
      path = File.join(directory, "feed.xml")
      replace!(path,
        '<guid isPermaLink="true">https://carlocaprini.github.io/thinking/older-note/</guid>',
        '<guid isPermaLink="true">https://carlocaprini.github.io/thinking/newer-note/</guid>')
    end
  end

  def test_generated_feed_rejects_incorrect_item_order
    assert_invalid_output(/Feed items must be ordered by publication date descending/) do |directory|
      path = File.join(directory, "feed.xml")
      mutate_file!(path) do |source|
        match = source.match(%r{(\s*<item>\s*<title>Newer note</title>.*?</item>)(\s*<item>\s*<title>Older note</title>.*?</item>)}m)
        source.sub(match[0], "#{match[2]}#{match[1]}")
      end
    end
  end

  def test_generated_feed_rejects_missing_full_content
    assert_invalid_output(/item 1 content:encoded is missing/) do |directory|
      path = File.join(directory, "feed.xml")
      mutate_file!(path) do |source|
        source.sub(%r{\s*<content:encoded><!\[CDATA\[<p>Newer content.*?</content:encoded>}m, "")
      end
    end
  end

  def test_generated_feed_rejects_empty_description
    assert_invalid_output(/item 1 description is missing/) do |directory|
      path = File.join(directory, "feed.xml")
      replace!(path, "<description>Newer description</description>", "<description> </description>")
    end
  end

  def test_generated_feed_rejects_wrong_self_url
    assert_invalid_output(/channel self URL must point to .*\/feed.xml/) do |directory|
      path = File.join(directory, "feed.xml")
      replace!(path, 'href="https://carlocaprini.github.io/feed.xml" rel="self"', 'href="https://example.com/feed.xml" rel="self"')
    end
  end

  def test_generated_feed_rejects_malformed_xml
    assert_invalid_output(/Invalid feed.xml/) do |directory|
      path = File.join(directory, "feed.xml")
      File.write(path, "<?xml version=\"1.0\"?><rss><channel><item></channel></rss>\n")
    end
  end

  def test_generated_feed_rejects_root_relative_content_url
    assert_invalid_output(%r{content:encoded contains a root-relative internal URL: /thinking/newer-note/}) do |directory|
      path = File.join(directory, "feed.xml")
      replace!(path,
        'href="https://carlocaprini.github.io/thinking/newer-note/"',
        'href="/thinking/newer-note/"')
    end
  end

  def test_generated_feed_rejects_bare_relative_content_url
    assert_invalid_output(%r{content:encoded contains a relative href/src URL: other-note/}) do |directory|
      path = File.join(directory, "feed.xml")
      replace!(path,
        'href="https://carlocaprini.github.io/thinking/newer-note/"',
        'href="other-note/"')
    end
  end

  def test_generated_feed_rejects_parent_relative_content_url
    assert_invalid_output(%r{content:encoded contains a relative href/src URL: ../other-note/}) do |directory|
      path = File.join(directory, "feed.xml")
      replace!(path,
        'href="https://carlocaprini.github.io/thinking/newer-note/"',
        'href="../other-note/"')
    end
  end

  def test_generated_feed_rejects_relative_asset_url
    assert_invalid_output(%r{content:encoded contains a relative href/src URL: assets/image.png}) do |directory|
      path = File.join(directory, "feed.xml")
      replace!(path,
        '<p>Newer content with an <a href="https://example.com/reference">',
        '<p>Newer content with an <img src="assets/image.png" alt=""><a href="https://example.com/reference">')
    end
  end

  def test_generated_feed_allows_legitimate_external_content_url
    assert_valid_output do |directory|
      path = File.join(directory, "feed.xml")
      replace!(path, "https://example.com/reference", "https://docs.example.org/reference?view=full#details")
    end
  end

  def test_generated_feed_allows_fragment_and_non_site_scheme
    assert_valid_output do |directory|
      path = File.join(directory, "feed.xml")
      replace!(path,
        'external reference</a>.</p>',
        'external reference</a>, <a href="#details">fragment</a>, and <a href="mailto:hello@example.com">email</a>.</p>')
    end
  end

  def test_generated_feed_requires_generated_future_dated_article
    assert_valid_output do |directory|
      article_path = File.join(directory, "thinking/newer-note/index.html")
      replace!(article_path, "2026-09-01T00:00:00+00:00", "2030-09-01T00:00:00+00:00")
      replace!(article_path, "2026-09-04T00:00:00+00:00", "2030-09-04T00:00:00+00:00")

      feed_path = File.join(directory, "feed.xml")
      replace!(feed_path, "Fri, 04 Sep 2026 00:00:00 +0000", "Wed, 04 Sep 2030 00:00:00 +0000")
      replace!(feed_path, "Tue, 01 Sep 2026 00:00:00 +0000", "Sun, 01 Sep 2030 00:00:00 +0000")
    end
  end

  def test_generated_feed_rejects_publication_date_drift
    assert_invalid_output(/item 1 pubDate must match the Thinking article publication date/) do |directory|
      path = File.join(directory, "feed.xml")
      replace!(path, "Tue, 01 Sep 2026 00:00:00 +0000", "Wed, 02 Sep 2026 00:00:00 +0000")
    end
  end

  def test_generated_feed_rejects_deployment_time_as_last_build_date
    assert_invalid_output(/lastBuildDate must match the newest editorial timestamp/) do |directory|
      path = File.join(directory, "feed.xml")
      replace!(path, "Fri, 04 Sep 2026 00:00:00 +0000", "Sun, 13 Sep 2026 00:00:00 +0000")
    end
  end

  def test_generated_output_rejects_missing_rss_autodiscovery
    assert_invalid_output(/index.html: expected exactly one RSS autodiscovery link/) do |directory|
      path = File.join(directory, "index.html")
      mutate_file!(path) { |source| source.sub(/^\s*<link rel="alternate" type="application\/rss\+xml".*\n/, "") }
    end
  end

  def test_generated_output_rejects_incorrect_rss_autodiscovery
    assert_invalid_output(%r{index.html: RSS autodiscovery must point to .*\/feed.xml}) do |directory|
      path = File.join(directory, "index.html")
      replace!(path, "href=\"https://carlocaprini.github.io/feed.xml\"", "href=\"https://example.com/feed.xml\"")
    end
  end

  def test_generated_output_rejects_duplicate_rss_autodiscovery
    assert_invalid_output(/index.html: expected exactly one RSS autodiscovery link/) do |directory|
      path = File.join(directory, "index.html")
      mutate_file!(path) do |source|
        link = source[%r{<link rel="alternate" type="application/rss\+xml"[^>]*>}]
        source.sub(link, "#{link}\n#{link}")
      end
    end
  end

  def test_generated_output_rejects_wrong_footer_rss_link
    assert_invalid_output(%r{index.html: footer RSS link must point to /feed.xml}) do |directory|
      path = File.join(directory, "index.html")
      replace!(path, '<a href="/feed.xml" data-analytics-event="rss_open"', '<a href="/rss.xml" data-analytics-event="rss_open"')
    end
  end

  def test_generated_output_rejects_missing_footer_rss_analytics_context
    assert_invalid_output(/index.html: footer RSS link must identify its analytics context/) do |directory|
      path = File.join(directory, "index.html")
      replace!(path, ' data-analytics-link-context="footer"', "")
    end
  end

  def test_generated_output_rejects_missing_footer_rss_analytics_destination
    assert_invalid_output(/index.html: footer RSS link must identify its analytics destination/) do |directory|
      path = File.join(directory, "index.html")
      replace!(path, ' data-analytics-destination="/feed.xml"', "")
    end
  end

  def test_generated_output_rejects_missing_required_file
    assert_invalid_output(/Missing generated file: robots.txt/) do |directory|
      FileUtils.rm(File.join(directory, "robots.txt"))
    end
  end

  def test_generated_output_rejects_missing_custom_404
    assert_invalid_output(/Missing generated file: 404.html/) do |directory|
      FileUtils.rm(File.join(directory, "404.html"))
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

  def test_generated_output_rejects_redundant_sitemap_declarations
    assert_invalid_output(/must declare only the canonical sitemap.xml/) do |directory|
      path = File.join(directory, "robots.txt")
      File.open(path, "a") { |file| file.puts("Sitemap: https://carlocaprini.github.io/sitemap.txt") }
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
