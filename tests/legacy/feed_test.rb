# frozen_string_literal: true

require "minitest/autorun"
require "tmpdir"
require_relative "../../scripts/lib/legacy_feed"
require_relative "../../scripts/refresh_feed"

class FeedTest < Minitest::Test
  VALID = <<~XML
    <?xml version="1.0"?><rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom"><channel>
    <title>Test</title><link>https://carlocaprini.com/thinking/</link>
    <atom:link href="https://carlocaprini.com/feed.xml" rel="self" type="application/rss+xml"/>
    <item><title>Entry</title><link>https://carlocaprini.com/thinking/entry/</link><guid isPermaLink="true">https://carlocaprini.com/thinking/entry/</guid></item>
    </channel></rss>
  XML

  def test_checked_in_feed_is_valid
    assert LegacyFeed.validate!(File.binread("legacy/feed.xml"))
  end

  def test_rejects_invalid_xml_and_noncanonical_urls
    assert_raises(RuntimeError) { LegacyFeed.validate!("<rss>") }
    assert_raises(RuntimeError) { LegacyFeed.validate!(VALID.sub("carlocaprini.com/thinking/entry", "example.com/entry")) }
  end

  def test_failed_fetch_or_validation_preserves_last_valid_feed
    Dir.mktmpdir do |directory|
      output = File.join(directory, "feed.xml")
      File.binwrite(output, VALID)
      assert_raises(RuntimeError) { FeedRefresh.run(output: output, fetcher: ->(_uri) { raise "offline" }) }
      assert_equal VALID, File.binread(output)
      assert_raises(RuntimeError) { FeedRefresh.run(output: output, fetcher: ->(_uri) { "not xml" }) }
      assert_equal VALID, File.binread(output)
    end
  end
end
