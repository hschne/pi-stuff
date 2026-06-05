# Jekyll Objects

The data objects available in Jekyll Liquid templates: `site`, `page`, `post`, `paginator`, collections, and data files.

## Table of Contents

- [site](#site)
- [page](#page)
- [post](#post)
- [paginator](#paginator)
- [Collections](#collections)
- [Data files](#data-files)
- [Layout and include](#layout-and-include)
- [content](#content)

## site

Global site-level data, available everywhere.

| Property                 | Description                                     |
| ------------------------ | ----------------------------------------------- |
| `site.title`             | Site title from `_config.yml`                   |
| `site.description`       | Site description from `_config.yml`             |
| `site.url`               | Base URL (e.g. `https://example.com`)           |
| `site.baseurl`           | Subpath (e.g. `/blog`)                          |
| `site.time`              | Time when `jekyll build` ran                    |
| `site.pages`             | All pages (non-collection documents)            |
| `site.posts`             | All posts, reverse chronological                |
| `site.tags`              | Hash of tag → posts                             |
| `site.categories`        | Hash of category → posts                        |
| `site.data`              | Data from `_data/` files                        |
| `site.documents`         | All documents across all collections            |
| `site.static_files`      | All static files                                |
| `site.collections`       | All collections                                 |
| `site.<collection_name>` | Posts in a custom collection (e.g. `site.work`) |
| `site.<config_key>`      | Any custom key in `_config.yml`                 |

### Common patterns

```liquid
{%- assign date_format = site.date_format | default: "%B %-d, %Y" -%}

{% for post in site.posts limit: 5 %}
  <a href="{{ post.url | relative_url }}">{{ post.title }}</a>
{% endfor %}

{%- assign talks = site.data.slides | where: "public", true | sort: "date" | reverse -%}
```

## page

Current page data. Available in layouts, includes, and pages.

| Property          | Description                                            |
| ----------------- | ------------------------------------------------------ |
| `page.title`      | Page title from front matter                           |
| `page.url`        | URL path (e.g. `/writing/my-post.html`)                |
| `page.date`       | Date from front matter or filename                     |
| `page.content`    | Raw content (unrendered)                               |
| `page.excerpt`    | Auto-generated excerpt (first paragraph)               |
| `page.permalink`  | Custom permalink from front matter                     |
| `page.layout`     | Layout name                                            |
| `page.path`       | Source file path                                       |
| `page.id`         | Unique identifier for the document                     |
| `page.categories` | Categories from front matter or directory path         |
| `page.tags`       | Tags array from front matter                           |
| `page.<custom>`   | Any front matter key (e.g. `page.series`, `page.role`) |

### Front matter access

Any key in front matter is accessible as `page.<key>`:

```yaml
---
title: My Post
series: "Rails Testing"
series_part: 2
featured: true
---
```

```liquid
{% if page.series %}
  {%- assign series_posts = site.posts | where_exp: "p", "p.series == page.series" | sort: "series_part" -%}
{% endif %}
```

## post

Inside a `{% for post in site.posts %}` loop, `post` has the same properties as `page`. Key properties:

| Property          | Description                |
| ----------------- | -------------------------- |
| `post.title`      | Post title                 |
| `post.url`        | URL path                   |
| `post.date`       | Post date                  |
| `post.content`    | Full rendered content      |
| `post.excerpt`    | First paragraph excerpt    |
| `post.categories` | Categories                 |
| `post.tags`       | Tags                       |
| `post.<custom>`   | Custom front matter values |

### Post vs. page

In a post layout, the current post's data is on `page` (not `post`). The `post` variable only exists inside `{% for post in site.posts %}` loops.

## paginator

Available only on pages with `paginate: true` in the config and only on the page pointed to by `paginate_path`. Requires the `jekyll-paginate` plugin.

| Property                       | Description                         |
| ------------------------------ | ----------------------------------- |
| `paginator.page`               | Current page number                 |
| `paginator.per_page`           | Posts per page                      |
| `paginator.posts`              | Posts on the current page           |
| `paginator.total_posts`        | Total post count                    |
| `paginator.total_pages`        | Total page count                    |
| `paginator.previous_page`      | Previous page number (nil if first) |
| `paginator.previous_page_path` | Path to previous page               |
| `paginator.next_page`          | Next page number (nil if last)      |
| `paginator.next_page_path`     | Path to next page                   |

### Pagination pattern

```liquid
{% for post in paginator.posts %}
  <article>
    <h3><a href="{{ post.url | relative_url }}">{{ post.title }}</a></h3>
  </article>
{% endfor %}

<nav aria-label="Pagination">
  {% if paginator.previous_page %}
    <a href="{{ paginator.previous_page_path | relative_url }}">Previous</a>
  {% endif %}

  {% for page_num in (1..paginator.total_pages) %}
    {% if page_num == paginator.page %}
      <span aria-current="page">{{ page_num }}</span>
    {% elsif page_num == 1 %}
      <a href="{{ '/writing' | relative_url }}">{{ page_num }}</a>
    {% else %}
      <a href="{{ site.paginate_path | relative_url | replace: ':num', page_num }}">{{ page_num }}</a>
    {% endif %}
  {% endfor %}

  {% if paginator.next_page %}
    <a href="{{ paginator.next_page_path | relative_url }}">Next</a>
  {% endif %}
</nav>
```

## Collections

Custom content types defined in `_config.yml`. Each collection lives in a `_<name>/` directory.

```yaml
# _config.yml
collections:
  work:
    output: true
    permalink: /work/:path/
```

Access via `site.<collection_name>`:

```liquid
{%- assign featured_work = site.work | where: "featured", true | sort: "order" -%}
{% for item in featured_work %}
  <h3><a href="{{ item.url | relative_url }}">{{ item.title }}</a></h3>
  <p>{{ item.role }} · {{ item.period }}</p>
  <p>{{ item.stack | join: ", " }}</p>
{% endfor %}
```

Collection documents have the same properties as `page` — all front matter keys are available as `item.<key>`.

## Data Files

YAML, JSON, or CSV files in `_data/` are accessible via `site.data.<filename>`.

```
_data/
├── slides.yml
└── navigation.yml
```

```liquid
{%- assign talks = site.data.slides | where: "public", true | sort: "date" | reverse -%}
{% for talk in talks limit: 3 %}
  <a href="/slides/{{ talk.slug }}/">{{ talk.title }}</a>
{% endfor %}
```

Nested directories create nested hashes: `_data/authors/hans.yml` → `site.data.authors.hans`.

## Layout and Include

### layout

The `layout` front matter key selects a layout from `_layouts/`. Layouts can chain: `post.liquid` → `base.liquid`.

```yaml
---
layout: base
---
```

Inside a layout, `{{ content }}` renders the child template's output.

### include

The `{% include %}` tag inserts a file from `_includes/`. Parameters are available as `include.<param>`.

```liquid
{% include margin-note.liquid text="Hello" rotate="-1.5" side="left" %}
```

Inside `margin-note.liquid`:

```liquid
{%- assign rotation = include.rotate | default: "-1.5" -%}
{%- assign side = include.side | default: "right" -%}
```

**Important:** Unlike Shopify's `{% render %}`, Jekyll's `{% include %}` shares the parent scope. Variables from the parent template are accessible inside the include. This is convenient but fragile — always prefer explicit parameters over relying on parent-scope variables.

## content

`{{ content }}` is available in layout files. It renders the content of the page or post that uses the layout. Only one `{{ content }}` per layout.
