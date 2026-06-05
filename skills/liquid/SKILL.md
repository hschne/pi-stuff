---
name: liquid
description: Write clean, idiomatic Liquid templates for Jekyll sites. Use when creating or editing .liquid or .html files that contain Liquid tags, filters, or objects — layouts, includes, pages, and collection templates.
---

# Liquid for Jekyll

Conventions for writing Liquid templates in Jekyll static sites.

## When to Use This Skill

- Creating or editing layouts, includes, or pages with Liquid
- Writing loops, conditionals, or variable assignments in templates
- Using Jekyll-specific filters or objects (`site`, `page`, `post`, `paginator`)
- Debugging template rendering issues

## Core Rules

- Use `{%- ... -%}` whitespace controls on logic tags that should not emit blank lines
- Use `{% comment %}...{% endcomment %}` for Liquid comments, never HTML comments for template logic
- Use `snake_case` for all variable names
- Prefer `{% assign %}` over `{% capture %}` unless building multi-line strings
- Always guard optional values with `{% if %}` before rendering
- Keep templates shallow — no include-from-include chains deeper than one level
- Use `| default:` to set fallback values instead of wrapping in conditionals
- Pass data to includes explicitly via parameters, not implicit scope leaking

## Whitespace Control

Use `{%-` and `-%}` on logic-only tags to prevent blank lines in rendered HTML.

**Good:**

```liquid
{%- assign name = page.title | default: "Untitled" -%}
{%- if page.date -%}
  <time datetime="{{ page.date | date_to_xmlschema }}">{{ page.date | date: "%B %-d, %Y" }}</time>
{%- endif -%}
```

**Bad:**

```liquid
{% assign name = page.title | default: "Untitled" %}
{% if page.date %}
  <time datetime="{{ page.date | date_to_xmlschema }}">{{ page.date | date: "%B %-d, %Y" }}</time>
{% endif %}
```

Do **not** use whitespace controls on output tags that are part of inline content — `{{ value }}` is fine as-is when surrounded by text.

## Variables

Declare variables at the top of the file or block. Initialize booleans before loops to avoid stale values.

**Good:**

```liquid
{%- assign featured = site.posts | where: "featured", true | sort: "date" | reverse -%}
{%- assign date_format = site.date_format | default: "%B %-d, %Y" -%}

{% for post in featured limit: 5 %}
  <h3>{{ post.title }}</h3>
  <time>{{ post.date | date: date_format }}</time>
{% endfor %}
```

**Bad:**

```liquid
{% for post in site.posts %}
  {% assign date_format = site.date_format | default: "%B %-d, %Y" %}
  {% if post.featured %}
    <h3>{{ post.title }}</h3>
    <time>{{ post.date | date: date_format }}</time>
  {% endif %}
{% endfor %}
```

Filter and sort the collection up front instead of branching inside the loop.

## Conditionals

Use `case`/`when` for three or more branches. Use `!= blank` or `!= nil` over bare truthiness when checking optional settings.

**Good:**

```liquid
{%- case page.layout -%}
  {%- when "post" -%}
    {% include post-meta.html %}
  {%- when "work" -%}
    {% include work-meta.html %}
  {%- else -%}
    {% include page-meta.html %}
{%- endcase -%}
```

**Bad:**

```liquid
{% if page.layout == "post" %}
  {% include post-meta.html %}
{% elsif page.layout == "work" %}
  {% include work-meta.html %}
{% elsif page.layout == "page" %}
  {% include page-meta.html %}
{% else %}
  {% include page-meta.html %}
{% endif %}
```

## Includes

Document include parameters with a comment header. Pass all data explicitly.

**Good:**

```liquid
{%- comment -%}
  Renders a date with optional "updated" line.

  Parameters:
    date    – date to display (required)
    updated – updated date (optional)
    format  – strftime format (optional, default: "%B %-d, %Y")
{%- endcomment -%}
{%- assign fmt = include.format | default: "%B %-d, %Y" -%}

<time datetime="{{ include.date | date_to_xmlschema }}">
  {{ include.date | date: fmt }}
</time>
```

**Bad:**

```liquid
{%- comment -%} date helper {%- endcomment -%}
<time datetime="{{ date | date_to_xmlschema }}">
  {{ date | date: "%B %-d, %Y" }}
</time>
```

Undocumented parameters and implicit variables make includes fragile.

## Filter Chains

Keep filter chains readable. Assign intermediate results when chains exceed three filters.

**Good:**

```liquid
{%- assign excerpt = post.excerpt | markdownify | strip_html -%}
{{ excerpt | truncate: 160 }}
```

**Bad:**

```liquid
{{ post.excerpt | markdownify | strip_html | truncate: 160 | prepend: "<p>" | append: "</p>" }}
```

## Workflow

1. Read the reference matching the area of change
2. Write or edit the template following the conventions above
3. Run `bundle exec jekyll build` and check for Liquid errors
4. Inspect rendered HTML for stray blank lines or broken markup
5. Fix issues and rebuild

## References

Read the relevant reference based on the area you are changing:

| Topic            | Description                                                          | Reference                                          |
| ---------------- | -------------------------------------------------------------------- | -------------------------------------------------- |
| Syntax and style | Formatting, comments, whitespace control, naming, variable patterns  | [syntax-and-style](references/syntax-and-style.md) |
| Tags and filters | Standard Liquid and Jekyll-specific tags and filters with examples   | [tags-and-filters](references/tags-and-filters.md) |
| Jekyll objects   | `site`, `page`, `post`, `paginator`, collections, data files, layout | [jekyll-objects](references/jekyll-objects.md)     |
