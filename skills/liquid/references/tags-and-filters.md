# Tags and Filters

Standard Liquid tags and filters, plus Jekyll-specific additions.

## Table of Contents

- [Control flow tags](#control-flow-tags)
- [Iteration tags](#iteration-tags)
- [Variable tags](#variable-tags)
- [Template tags](#template-tags)
- [Standard filters](#standard-filters)
- [Jekyll-specific filters](#jekyll-specific-filters)

## Control Flow Tags

### if / elsif / else

```liquid
{% if page.title %}
  <h1>{{ page.title }}</h1>
{% elsif page.name %}
  <h1>{{ page.name }}</h1>
{% else %}
  <h1>Untitled</h1>
{% endif %}
```

### unless

Executes when the condition is **false**. Prefer `unless` over `if !condition` for readability — but avoid `unless` with `elsif` (use `if` instead).

```liquid
{% unless page.hidden %}
  <article>{{ content }}</article>
{% endunless %}
```

### case / when

Use for three or more equality branches. `when` accepts multiple values with commas or `or`.

```liquid
{%- case page.layout -%}
  {%- when "post" -%}
    {% include post-meta.html %}
  {%- when "work", "project" -%}
    {% include work-meta.html %}
  {%- else -%}
    {% include page-meta.html %}
{%- endcase -%}
```

### Operators

| Operator    | Notes                                                   |
| ----------- | ------------------------------------------------------- |
| `==`, `!=`  | Equality and inequality                                 |
| `>`, `<`    | Greater/less than                                       |
| `>=`, `<=`  | Greater/less than or equal                              |
| `and`, `or` | Logical — no parentheses, evaluated left to right       |
| `contains`  | String substring check only — not for arrays of objects |

**No parentheses** — nest `{% if %}` tags for complex logic:

```liquid
{% if page.layout == "post" %}
  {% if page.featured or page.pinned %}
    <span class="badge">Featured</span>
  {% endif %}
{% endif %}
```

### Truthy and falsy

| Value               | Truthy? |
| ------------------- | ------- |
| `true`              | yes     |
| `false`             | no      |
| `nil`               | no      |
| `""` (empty string) | yes     |
| `0`                 | yes     |
| Empty array `[]`    | yes     |

Empty strings and zero are truthy in Liquid. Use `!= blank` to catch both `nil` and empty strings. Use `size > 0` to check non-empty arrays.

## Iteration Tags

### for

```liquid
{% for post in site.posts limit: 5 %}
  <li>{{ post.title }}</li>
{% endfor %}
```

Parameters: `limit`, `offset`, `reversed`.

### forloop object

| Property         | Description                    |
| ---------------- | ------------------------------ |
| `forloop.index`  | Current iteration (1-based)    |
| `forloop.index0` | Current iteration (0-based)    |
| `forloop.first`  | `true` on first iteration      |
| `forloop.last`   | `true` on last iteration       |
| `forloop.length` | Total iterations               |
| `forloop.rindex` | Iterations remaining (1-based) |

### Range loops

```liquid
{% for i in (1..5) %}
  <span>{{ i }}</span>
{% endfor %}
```

### break and continue

```liquid
{% for post in site.posts %}
  {% if post.hidden %}{% continue %}{% endif %}
  {% if forloop.index > 10 %}{% break %}{% endif %}
  <li>{{ post.title }}</li>
{% endfor %}
```

### cycle

Alternates between values across loop iterations:

```liquid
{% for item in items %}
  <tr class="{% cycle 'odd', 'even' %}">
    <td>{{ item.title }}</td>
  </tr>
{% endfor %}
```

### tablerow

Generates HTML table rows:

```liquid
<table>
  {% tablerow item in items cols: 3 %}
    {{ item.title }}
  {% endtablerow %}
</table>
```

## Variable Tags

### assign

```liquid
{%- assign title = page.title | default: "Untitled" -%}
```

### capture

Captures rendered content into a variable. Use for multi-line strings.

```liquid
{%- capture greeting -%}
  Hello {{ user.name }}, welcome to {{ site.title }}.
{%- endcapture -%}
```

### increment / decrement

Create and modify a counter. Independent of `assign` variables.

```liquid
{% increment counter %}  <!-- outputs 0, then 1, then 2 -->
{% decrement counter %}  <!-- outputs -1, then -2, then -3 -->
```

## Template Tags

### include (Jekyll)

Inserts a file from `_includes/`. Passes parameters as named arguments.

```liquid
{% include post-meta.html page=page %}
{% include margin-note.liquid text="Hello" rotate="-1.5" %}
```

Parameters are accessible via `include.param_name` inside the included file.

### raw

Disables Liquid processing for a block. Use when displaying Liquid code examples.

```liquid
{% raw %}
  {{ this will not be processed }}
{% endraw %}
```

### comment

```liquid
{% comment %}
  This entire block is stripped from rendered output.
{% endcomment %}
```

## Standard Filters

### String filters

| Filter            | Example                        | Output                |
| ----------------- | ------------------------------ | --------------------- | --------------- |
| `append`          | `{{ "hello"                    | append: " world" }}`  | `hello world`   |
| `prepend`         | `{{ "world"                    | prepend: "hello " }}` | `hello world`   |
| `capitalize`      | `{{ "hello"                    | capitalize }}`        | `Hello`         |
| `downcase`        | `{{ "Hello"                    | downcase }}`          | `hello`         |
| `upcase`          | `{{ "hello"                    | upcase }}`            | `HELLO`         |
| `strip`           | `{{ " hi "                     | strip }}`             | `hi`            |
| `lstrip`/`rstrip` | Trim left/right only           |                       |
| `strip_html`      | `{{ "<p>hi</p>"                | strip_html }}`        | `hi`            |
| `strip_newlines`  | Removes all newlines           |                       |
| `newline_to_br`   | Converts `\n` to `<br>`        |                       |
| `replace`         | `{{ "hello"                    | replace: "l", "r" }}` | `herro`         |
| `replace_first`   | Replaces first occurrence only |                       |
| `remove`          | `{{ "hello"                    | remove: "l" }}`       | `heo`           |
| `remove_first`    | Removes first occurrence only  |                       |
| `truncate`        | `{{ "hello world"              | truncate: 8 }}`       | `hello...`      |
| `truncatewords`   | `{{ "one two three"            | truncatewords: 2 }}`  | `one two...`    |
| `split`           | `{{ "a,b,c"                    | split: "," }}`        | `["a","b","c"]` |
| `slice`           | `{{ "hello"                    | slice: 0, 3 }}`       | `hel`           |
| `escape`          | Escapes HTML entities          |                       |
| `url_encode`      | `{{ "hello world"              | url_encode }}`        | `hello+world`   |
| `url_decode`      | Decodes URL-encoded strings    |                       |

### Array filters

| Filter         | Description                                |
| -------------- | ------------------------------------------ | ------------------------ |
| `first`        | First element                              |
| `last`         | Last element                               |
| `size`         | Number of elements (also works on strings) |
| `sort`         | Sort by value or property: `               | sort: "date"`            |
| `sort_natural` | Case-insensitive sort                      |
| `reverse`      | Reverse order                              |
| `map`          | Extract a property: `                      | map: "title"`            |
| `where`        | Filter by property: `                      | where: "featured", true` |
| `uniq`         | Remove duplicates                          |
| `compact`      | Remove nil values                          |
| `concat`       | Merge two arrays                           |
| `join`         | Join into string: `                        | join: ", "`              |

### Math filters

| Filter       | Description       |
| ------------ | ----------------- |
| `plus`       | Addition          |
| `minus`      | Subtraction       |
| `times`      | Multiplication    |
| `divided_by` | Integer division  |
| `modulo`     | Remainder         |
| `round`      | Round to N places |
| `ceil`       | Round up          |
| `floor`      | Round down        |
| `abs`        | Absolute value    |
| `at_least`   | Minimum clamp     |
| `at_most`    | Maximum clamp     |

### Other standard filters

| Filter    | Description                                  |
| --------- | -------------------------------------------- | ------------------- |
| `default` | Fallback if value is nil, false, or empty: ` | default: "N/A"`     |
| `date`    | Format a date: `                             | date: "%B %-d, %Y"` |
| `json`    | Serialize to JSON                            |

## Jekyll-Specific Filters

These are only available in Jekyll, not in standard Liquid.

| Filter                               | Description                                     | Example                    |
| ------------------------------------ | ----------------------------------------------- | -------------------------- | -------------------------------------------- | ------------------- |
| `relative_url`                       | Prepends `baseurl` to a path                    | `{{ "/assets/css/main.css" | relative_url }}`                             |
| `absolute_url`                       | Prepends `url` + `baseurl`                      | `{{ page.url               | absolute_url }}`                             |
| `markdownify`                        | Converts Markdown string to HTML                | `{{ post.excerpt           | markdownify }}`                              |
| `slugify`                            | Converts string to URL slug                     | `{{ "My Title"             | slugify }}`                                  |
| `date_to_xmlschema`                  | ISO 8601 date for feeds and `<time>` `datetime` | `{{ page.date              | date_to_xmlschema }}`                        |
| `date_to_rfc822`                     | RFC 822 date for RSS feeds                      | `{{ page.date              | date_to_rfc822 }}`                           |
| `date_to_long_string`                | Human-readable long date                        | `{{ page.date              | date_to_long_string }}`                      |
| `date_to_string`                     | Short date string                               | `{{ page.date              | date_to_string }}`                           |
| `number_of_words`                    | Word count of a string                          | `{{ page.content           | strip_html                                   | number_of_words }}` |
| `where_exp`                          | Filter array with an expression                 | `{{ site.posts             | where_exp: "p", "p.tags contains 'ruby'" }}` |
| `group_by`                           | Group array by a property                       | `{{ site.posts             | group_by: "category" }}`                     |
| `group_by_exp`                       | Group by expression                             | `{{ site.posts             | group_by_exp: "p", "p.date                   | date: '%Y'" }}`     |
| `xml_escape`                         | Escape for XML output                           | `{{ page.title             | xml_escape }}`                               |
| `cgi_escape`                         | CGI escape                                      | `{{ "a b"                  | cgi_escape }}`                               |
| `uri_escape`                         | URI escape                                      | `{{ "a b"                  | uri_escape }}`                               |
| `jsonify`                            | Convert to JSON (Jekyll's version of `json`)    | `{{ site.data.menu         | jsonify }}`                                  |
| `normalize_whitespace`               | Collapse whitespace to single spaces            | `{{ text                   | normalize_whitespace }}`                     |
| `smartify`                           | Convert straight quotes to smart quotes         | `{{ page.title             | smartify }}`                                 |
| `push` / `pop` / `shift` / `unshift` | Array manipulation                              |                            |
| `inspect`                            | Debug output of a variable                      | `{{ page                   | inspect }}`                                  |

### Common Jekyll filter patterns

**Read time calculation:**

```liquid
{%- assign words = page.content | strip_html | number_of_words -%}
{%- assign minutes = words | divided_by: 200 | at_least: 1 -%}
{{ minutes }} min read
```

**Filtering collections with expressions:**

```liquid
{%- assign ruby_posts = site.posts | where_exp: "p", "p.tags contains 'ruby'" -%}
```

**Safe URL generation:**

```liquid
<a href="{{ post.url | relative_url }}">{{ post.title }}</a>
<link rel="stylesheet" href="{{ "/assets/css/main.css" | relative_url }}">
```

Always use `relative_url` for internal links and assets to respect `baseurl` configuration.
