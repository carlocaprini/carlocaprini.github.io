# frozen_string_literal: true

require "date"
require "yaml"

module SiteValidation
  module_function

  def present?(value)
    !value.to_s.strip.empty?
  end

  def relative_path(path, root)
    path.delete_prefix("#{root}/")
  end

  def read_yaml(path, errors:, root:)
    YAML.safe_load(File.read(path), permitted_classes: [Date, Time], aliases: true)
  rescue Errno::ENOENT
    errors << "#{relative_path(path, root)}: missing file"
    nil
  rescue Psych::SyntaxError => e
    errors << "#{relative_path(path, root)}: invalid YAML: #{e.message.lines.first&.strip}"
    nil
  end

  def read_front_matter(path, errors:, root:)
    source = File.read(path)
    match = source.match(/\A---\s*\n(.*?)\n---\s*\n/m)
    unless match
      errors << "#{relative_path(path, root)}: missing front matter"
      return [{}, source]
    end

    data = YAML.safe_load(match[1], permitted_classes: [Date, Time], aliases: true) || {}
    [data, source[match.end(0)..]]
  rescue Errno::ENOENT
    errors << "#{relative_path(path, root)}: missing file"
    [{}, ""]
  rescue Psych::SyntaxError => e
    errors << "#{relative_path(path, root)}: invalid front matter: #{e.message.lines.first&.strip}"
    [{}, ""]
  end
end
