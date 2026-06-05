# Syntax and Style

Formatting, comments, whitespace control, naming, and variable conventions for Liquid templates.

## Table of Contents

- [Delimiters](#delimiters)
- [Whitespace control](#whitespace-control)
- [Comments](#comments)
- [Naming](#naming)
- [Variables](#variables)
- [Formatting](#formatting)

## Delimiters

| Delimiter     | Purpose                        |
| ------------- | ------------------------------ |
| `{{ ... }}`   | Output — prints a value        |
| `{{- ... -}}` | Output with whitespace trim    |
| `{% ... %}`   | Logic tag — prints nothing     |
| `{%- ... -%}` | Logic tag with whitespace trim |

Use `{{- -}}` only when the output itself would add unwanted whitespace (e.g. inside an HTML attribute). For inline content flow, plain `{{ }}` is fine.

## Whitespace Control

Liquid renders blank lines wherever logic tags appear. Use `{%-` / `-%}` on tags that should not emit whitespace.

**Good:**

```liquid
{%- assign items = site.posts | where: "featured", true -%}
{%- for item in items -%}
  <li>{{ item.title }}</li>
{%- endfor -%}
```

**Bad:**

```liquid
{% assign items = site.posts | where: "featured", true %}
{% for item in items %}
  <li>{{ item.title }}</li>
{% endfor %}
```

The bad example produces blank lines before and after each `<li>`.

### When to skip whitespace controls

- Output tags inside flowing text: `Hello {{ name }}, welcome.`
- Tags inside `{% capture %}` blocks where whitespace is intentional
- Single-line includes where the surrounding context already handles spacing

## Comments

### Liquid comments (preferred)

```liquid
{%- comment -%}
  This comment is stripped from the rendered HTML.
{%- endcomment -%}
```

### Inline comments (short notes)

```liquid
{% # This is a short inline comment %}
```

### HTML comments (avoid)

```html
<!-- This leaks into the rendered page — avoid for template logic -->
```

Use HTML comments only when you intentionally want the comment visible in the page source.

### Include headers

Document every include file with a comment block listing parameters:

```liquid
{%- comment -%}
  Renders a post card.

  Parameters:
    post    – a post object (required)
    show_excerpt – display the excerpt (optional, default: true)
    date_format  – strftime format string (optional)
{%- endcomment -%}
```

Use `@param`-style or plain list — either is fine as long as each parameter documents its name, type hint, and whether it is required or optional.

## Naming

### Variables

- Use `snake_case`: `featured_posts`, `date_format`, `has_sidebar`
- Boolean variables read as questions: `has_sidebar`, `is_featured`, `show_excerpt`
- Array variables use plural nouns: `featured_posts`, `talk_entries`
- String variables describe the content: `page_title`, `date_format`

**Good:**

```liquid
{%- assign featured_posts = site.posts | where: "featured", true -%}
{%- assign has_sidebar = page.sidebar | default: false -%}
```

**Bad:**

```liquid
{%- assign fp = site.posts | where: "featured", true -%}
{%- assign data = page.sidebar | default: false -%}
```

### Files

- Includes use `kebab-case`: `post-meta.html`, `margin-note.liquid`
- Layouts use `kebab-case`: `base.liquid`, `post.liquid`
- Pick one extension per directory — prefer `.liquid` for new files

## Variables

### Assign vs. Capture

Use `assign` for single values and filter chains. Use `capture` for multi-line HTML or string building.

**Good:**

```liquid
{%- assign excerpt = post.excerpt | markdownify | strip_html | truncate: 160 -%}

{%- capture card_style -%}
  --card-rotate: {{ include.rotate | default: "0" }}deg;
  --card-opacity: {{ include.opacity | default: "1" }};
{%- endcapture -%}
```

**Bad:**

```liquid
{%- capture excerpt -%}{{ post.excerpt | markdownify | strip_html | truncate: 160 }}{%- endcapture -%}
```

Using `capture` for a one-liner adds noise.

### Declare before use

Group top-level variables at the start of the file, before any HTML. Variables scoped to a loop belong at the top of the loop body.

```liquid
{%- assign date_format = site.date_format | default: "%B %-d, %Y" -%}
{%- assign posts = site.posts | sort: "date" | reverse -%}

{% for post in posts limit: 5 %}
  {%- assign words = post.content | strip_html | number_of_words -%}
  <article>
    <h3>{{ post.title }}</h3>
    <time>{{ post.date | date: date_format }}</time>
    <span>{{ words | divided_by: 200 }} min read</span>
  </article>
{% endfor %}
```

### Reset booleans in loops

Variables leak across loop iterations. Always reset inside the loop body.

**Good:**

```liquid
{% for product in collection %}
  {%- assign is_featured = false -%}
  {%- if product.tags contains "featured" -%}
    {%- assign is_featured = true -%}
  {%- endif -%}
  ...
{% endfor %}
```

**Bad:**

```liquid
{% for product in collection %}
  {%- if product.tags contains "featured" -%}
    {%- assign is_featured = true -%}
  {%- endif -%}
  ...
{% endfor %}
```

Once `is_featured` is `true`, it stays `true` for all subsequent iterations.

## Formatting

### Indentation

Indent two spaces inside Liquid block tags, matching HTML indentation.

```liquid
{% if page.date %}
  <time datetime="{{ page.date | date_to_xmlschema }}">
    {{ page.date | date: "%B %-d, %Y" }}
  </time>
{% endif %}
```

### Line length

Break long conditions across multiple lines:

**Good:**

```liquid
{% if
  template contains 'search' or
  template contains 'account' or
  template contains 'cart'
%}
  <meta name="robots" content="noindex">
{% endif %}
```

**Bad:**

```liquid
{% if template contains 'search' or template contains 'account' or template contains 'cart' %}<meta name="robots" content="noindex">{% endif %}
```

### Filter spacing

Add spaces around the pipe `|` and after colons in filter arguments:

**Good:**

```liquid
{{ post.excerpt | markdownify | strip_html | truncate: 160 }}
```

**Bad:**

```liquid
{{ post.excerpt|markdownify|strip_html|truncate:160 }}
```

### Long filter chains

When a chain exceeds three filters, assign an intermediate variable:

```liquid
{%- assign clean_excerpt = post.excerpt | markdownify | strip_html -%}
{{ clean_excerpt | truncate: 160 }}
```

### Else spacing

Add a blank line before `{% else %}` or `{% elsif %}` when the block above spans multiple lines:

```liquid
{% if page.series %}
  <aside class="post-series">
    <h3>{{ page.series }}</h3>
    ...
  </aside>

{% else %}
  <p>Standalone post</p>
{% endif %}
```
