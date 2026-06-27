# Deploying Jekyll (GitHub Pages)

Pick the build path first — it decides which plugins you can use.

## Native Pages Build vs GitHub Actions

**Native Pages build** (push to a branch, Pages builds it): only runs the `github-pages` gem's pinned safelist of plugins. It ignores your `Gemfile.lock` and your plugin versions. Use it for simple sites that stay within the safelist.

- Safelisted (work out of the box): `jekyll-seo-tag`, `jekyll-sitemap`, `jekyll-feed`, `jekyll-redirect-from`, and others listed at https://pages.github.com/versions/.
- Not safelisted: any other plugin is silently ignored, which looks like "my plugin does nothing."

**GitHub Actions build** (you run `bundle exec jekyll build` in a workflow and publish `_site/`): full control — any plugin, your own gem versions, your `Gemfile.lock`. Use it the moment you need a non-safelisted plugin, a newer Jekyll, or custom build steps.

Minimal Actions build:

```yaml
# .github/workflows/pages.yml
name: pages
on: { push: { branches: [main] } }
permissions: { contents: read, pages: write, id-token: write }
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: ruby/setup-ruby@v1
        with: { ruby-version: "3.3", bundler-cache: true }
      - run: bundle exec jekyll build
      - uses: actions/upload-pages-artifact@v3
        with: { path: _site }
  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment: github-pages
    steps:
      - uses: actions/deploy-pages@v4
```

Commit `Gemfile.lock` for Actions builds so CI is reproducible.

## url / baseurl Matrix

Get these right or every link and asset breaks. `relative_url` prepends `baseurl`; `absolute_url` prepends `url + baseurl`.

| Hosting                              | `url`                    | `baseurl` |
| ------------------------------------ | ------------------------ | --------- |
| User/org site (`user.github.io`)     | `https://user.github.io` | `""`      |
| Project site (`user.github.io/repo`) | `https://user.github.io` | `"/repo"` |
| Custom domain (apex or subdomain)    | `https://example.com`    | `""`      |

The classic project-site bug: CSS/JS load locally (served at root) but 404 in production (served under `/repo`) because paths were hardcoded instead of run through `relative_url`.

## Custom Domain

1. Add a `CNAME` file at the site root containing just the domain (`lif.example.com` or `example.com`). With a `docs/` source, it lives at `docs/CNAME`.
2. Set `url: https://example.com` and `baseurl: ""`.
3. DNS: apex domain → `A`/`AAAA` records to GitHub's Pages IPs; subdomain → `CNAME` to `user.github.io`.
4. Enable **Enforce HTTPS** in repo Pages settings once the cert provisions.

## Verify the Deploy

```bash
# Tags and assets are live (not just built locally):
curl -s https://example.com/ | grep -iE 'og:|canonical'
curl -sI https://example.com/assets/og.png   # 200 + image/png
```

A stale preview after deploy is usually a social cache, not a tag problem — bust it via the platform debuggers (open-graph reference).

## Sources

- https://docs.github.com/en/pages/setting-up-a-github-pages-site-with-jekyll
- https://pages.github.com/versions/
- https://jekyllrb.com/docs/github-pages/
