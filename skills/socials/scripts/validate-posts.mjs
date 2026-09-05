#!/usr/bin/env node

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const filePath = process.argv[2];

if (!filePath) {
  console.error("Usage: validate-posts.mjs <social-draft>");
  process.exit(2);
}

const headingPattern = /^(#{1,6})\s+(.+?)\s*$/;
const validatedPlatformPattern = /^(X|Twitter|Bluesky)(?:\s+\([^)]*\))?$/i;
const platformPattern =
  /^(X|Twitter|Bluesky|LinkedIn|Instagram|Facebook|Mastodon|Threads|TikTok|Pinterest|YouTube|Google Business|Start Page)(?:\s+\([^)]*\))?$/i;
const lines = readFileSync(resolve(filePath), "utf8").split("\n");
const posts = [];
const headings = [];
let currentPost = null;

const savePost = () => {
  if (!currentPost) {
    return;
  }

  posts.push({
    ...currentPost,
    text: currentPost.content.join("\n").trim(),
  });
  currentPost = null;
};

for (const line of lines) {
  const heading = line.match(headingPattern);

  if (heading) {
    const level = heading[1].length;
    const title = heading[2];
    const validatedPlatform = title.match(validatedPlatformPattern);

    if (currentPost && level <= currentPost.level) {
      savePost();
    }

    while (headings.at(-1)?.level >= level) {
      headings.pop();
    }

    if (validatedPlatform) {
      const parent = headings.findLast(({ isPlatform }) => !isPlatform);

      currentPost = {
        context: parent?.title ?? "Document",
        content: [],
        level,
        platform:
          validatedPlatform[1].toLowerCase() === "twitter"
            ? "X"
            : validatedPlatform[1],
      };
    }

    headings.push({
      isPlatform: platformPattern.test(title),
      level,
      title,
    });
    continue;
  }

  if (currentPost) {
    currentPost.content.push(line);
  }
}

savePost();

const graphemes = (value) => [
  ...new Intl.Segmenter("en", { granularity: "grapheme" }).segment(value),
];

const weightedCodePoint = (codePoint) => {
  const hasSingleWeight =
    (codePoint >= 0 && codePoint <= 4351) ||
    (codePoint >= 8192 && codePoint <= 8205) ||
    (codePoint >= 8208 && codePoint <= 8223) ||
    (codePoint >= 8242 && codePoint <= 8247);

  return hasSingleWeight ? 1 : 2;
};

const weightedTextLength = (value) =>
  graphemes(value).reduce((total, { segment }) => {
    if (/\p{Extended_Pictographic}/u.test(segment)) {
      return total + 2;
    }

    return (
      total +
      [...segment].reduce(
        (segmentTotal, character) =>
          segmentTotal + weightedCodePoint(character.codePointAt(0)),
        0,
      )
    );
  }, 0);

const weightedXLength = (value) => {
  const normalized = value.normalize("NFC");
  const urlPattern = /https?:\/\/[^\s]+/gu;
  let length = 0;
  let offset = 0;

  for (const match of normalized.matchAll(urlPattern)) {
    length += weightedTextLength(normalized.slice(offset, match.index));
    length += 23;
    offset = match.index + match[0].length;
  }

  return length + weightedTextLength(normalized.slice(offset));
};

if (posts.length === 0) {
  console.error("No X, Twitter, or Bluesky headings found.");
  process.exit(2);
}

let hasFailure = false;

for (const post of posts) {
  if (!post.text) {
    console.error(`FAIL ${post.platform} - ${post.context}: empty post`);
    hasFailure = true;
    continue;
  }

  if (post.platform.toLowerCase() === "bluesky") {
    const normalized = post.text.normalize("NFC");
    const graphemeCount = graphemes(normalized).length;
    const byteCount = Buffer.byteLength(normalized, "utf8");
    const isValid = graphemeCount <= 300 && byteCount <= 3_000;
    const status = isValid ? "PASS" : "FAIL";

    console.log(
      `${status} Bluesky - ${post.context}: ${graphemeCount}/300 graphemes, ${byteCount}/3000 bytes`,
    );
    hasFailure ||= !isValid;
    continue;
  }

  const length = weightedXLength(post.text);
  const status = length <= 280 ? "PASS" : "FAIL";
  console.log(
    `${status} X - ${post.context}: ${length}/280 weighted characters`,
  );
  hasFailure ||= length > 280;
}

process.exitCode = hasFailure ? 1 : 0;
