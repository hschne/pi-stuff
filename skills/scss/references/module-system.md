# SCSS Module System

## `@use` replaces `@import`

`@import` is deprecated (Dart Sass 2.0 warning, removed in 3.0). All imports must use `@use`.

```scss
// Good
@use "variables" as vars;
@use "mixins";

.element {
  color: vars.$color-primary;
  @include mixins.respond-to("md") {
    width: 50%;
  }
}
```

```scss
// Bad — deprecated
@import "variables";
@import "mixins";
```

## Namespacing

`@use` namespaces by filename by default. Use `as` to rename, `as *` to drop the namespace.

```scss
@use "abstracts/variables" as vars; // vars.$color-primary
@use "abstracts/mixins" as *; // @include respond-to('md') — no prefix
@use "abstracts/functions"; // functions.px-to-rem(16)
```

Rules:

- Use `as *` sparingly — only for mixins/functions used very frequently in the file.
- Never use `as *` on two modules that export the same names.
- Prefer explicit namespaces for variables to make origin clear.

## `@forward`

Use `@forward` to re-export members from a partial, creating barrel files:

```scss
// abstracts/_index.scss
@forward "variables";
@forward "mixins";
@forward "functions";
```

```scss
// components/_card.scss
@use "../abstracts" as *;
```

Rules:

- Use `@forward` in `_index.scss` files only.
- Use `show` / `hide` to control what gets re-exported.
- Avoid deep `@forward` chains — one level of barrel files is enough.

```scss
// Only expose what consumers need
@forward "variables" show $color-primary, $color-secondary;
@forward "mixins" hide _internal-helper;
```

## Private Members

Prefix with `-` or `_` to make members private to the file:

```scss
// _mixins.scss
$-internal-breakpoint: 768px; // private, not accessible via @use

@mixin respond-to($name) {
  // uses $-internal-breakpoint internally
}
```

## Built-in Modules

Always import built-in modules explicitly. Never use their deprecated global equivalents.

| Module          | Use for                                          | Replaces                         |
| --------------- | ------------------------------------------------ | -------------------------------- |
| `sass:math`     | `math.div()`, `math.round()`, `math.clamp()`     | `/` division, `round()`          |
| `sass:color`    | `color.adjust()`, `color.scale()`, `color.mix()` | `darken()`, `lighten()`, `mix()` |
| `sass:map`      | `map.get()`, `map.merge()`, `map.has-key()`      | `map-get()`, `map-merge()`       |
| `sass:list`     | `list.nth()`, `list.append()`                    | `nth()`, `append()`              |
| `sass:string`   | `string.quote()`, `string.index()`               | `quote()`, `str-index()`         |
| `sass:meta`     | `meta.type-of()`, `meta.inspect()`               | `type-of()`, `inspect()`         |
| `sass:selector` | `selector.nest()`, `selector.append()`           | `selector-nest()`                |

```scss
@use "sass:math";
@use "sass:color";

.element {
  width: math.div(100%, 3);
  background: color.adjust(#3498db, $lightness: 10%);
}
```

## Migration

Use the official migration tool for existing codebases:

```bash
sass-migrator module --migrate-deps path/to/main.scss
```

This rewrites `@import` to `@use`/`@forward` and updates global function calls to namespaced equivalents.
