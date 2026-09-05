# Public R2 Media

Upload media to an explicitly selected Cloudflare R2 bucket and return verified public URLs. Use this only when the project has no documented upload task; project-owned upload automation remains authoritative.

## Resolve the Destination

Inspect the project README, task runner, `.cfrc`, Wrangler configuration, upload scripts, and existing media manifests. Determine:

- Cloudflare account context;
- bucket name;
- public managed or custom domain;
- object key or key-prefix convention;
- expected manifest location.

Do not infer any of these from another project. Treat a project `.cfrc` as evidence of intended configuration, not proof that the installed CLI recognizes it or that public hosting changes are authorized.

Discover available accounts and select the intended one explicitly:

```bash
cf auth whoami
CLOUDFLARE_ACCOUNT_ID=<account-id> cf r2 buckets list
```

When multiple accounts are available, keep `CLOUDFLARE_ACCOUNT_ID` on every `cf` and Wrangler command. Use `cf r2 --help`, narrower command help, and `cf schema` to confirm current bucket and managed-domain command shapes.

## Set Up Public Hosting

List existing buckets and the selected bucket's domains with the explicit account ID first. Creating a bucket or enabling a managed/custom public domain is a separate mutation: present the account, bucket, location/storage choices, and domain change for approval.

Use `--dry-run` before supported `cf` mutations. After setup, read the domain state back and construct URLs only from the returned public hostname.

## Build Durable Object Keys

Prefer stable project conventions. When none exists and published URLs should remain immutable:

1. Compute a SHA-256 digest of the file contents.
2. Use a readable key such as `<prefix>/<first-12-digest-chars>-<filename>`.
3. Keep the prefix explicit and project-specific.

Content-addressed keys permit long-lived caching without overwriting existing published media.

## Upload

Confirm current Wrangler syntax with:

```bash
wrangler r2 object put --help
```

Then upload to the explicit bucket and key, setting the real MIME type and cache policy. A typical immutable image upload has this shape:

```bash
CLOUDFLARE_ACCOUNT_ID=<account-id> wrangler r2 object put \
  <bucket>/<key> \
  --file <local-file> \
  --content-type <mime-type> \
  --cache-control 'public, max-age=31536000, immutable' \
  --remote \
  --force
```

Do not label every asset `image/png`; derive the MIME type from the file being uploaded.

## Verify

Fetch each resulting public URL with cache bypass and retry briefly for propagation. Verify:

- the response succeeds;
- the response bytes equal the local file;
- the response `Content-Type` matches the intended media type.

Do not hand an unverified URL to a publishing tool.

When several files are uploaded, write a JSON manifest containing at least:

```json
{
  "accountId": "...",
  "bucket": "...",
  "baseUrl": "https://...",
  "assets": {
    "file.png": {
      "key": "prefix/digest-file.png",
      "url": "https://.../prefix/digest-file.png"
    }
  }
}
```

Return the manifest path or the verified local-file-to-public-URL mapping.
