#!/usr/bin/env node

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const filePath = process.argv[2];

if (!filePath) {
  console.error("Usage: validate-social.mjs <promotion-file>");
  process.exit(2);
}

const text = readFileSync(resolve(filePath), "utf8");
const lines = text.split("\n");
const posts = [];
let campaign = null;
let platform = null;
let content = [];

const savePost = () => {
  if (campaign && platform) {
    posts.push({ campaign, platform, text: content.join("\n").trim() });
  }

  content = [];
};

for (const line of lines) {
  if (line.startsWith("## ")) {
    savePost();
    campaign = line.slice(3).trim();
    platform = null;
  } else if (line === "### X" || line === "### Bluesky") {
    savePost();
    platform = line.slice(4);
  } else if (line.startsWith("### ")) {
    savePost();
    platform = null;
  } else if (platform) {
    content.push(line);
  }
}

savePost();

const weightedCodePoint = (codePoint) => {
  const hasSingleWeight =
    (codePoint >= 0 && codePoint <= 4351) ||
    (codePoint >= 8192 && codePoint <= 8205) ||
    (codePoint >= 8208 && codePoint <= 8223) ||
    (codePoint >= 8242 && codePoint <= 8247);

  return hasSingleWeight ? 1 : 2;
};

const graphemes = (value) => [
  ...new Intl.Segmenter("en", { granularity: "grapheme" }).segment(value),
];

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

if (posts.length === 0) {
  console.error("No `### X` or `### Bluesky` sections found.");
  process.exit(2);
}

let hasFailure = false;

for (const post of posts) {
  if (!post.text) {
    console.error(`FAIL ${post.platform} — ${post.campaign}: empty post`);
    hasFailure = true;
    continue;
  }

  if (post.platform === "X") {
    const length = weightedXLength(post.text);
    const status = length <= 280 ? "PASS" : "FAIL";
    console.log(
      `${status} X — ${post.campaign}: ${length}/280 weighted characters`,
    );
    hasFailure ||= length > 280;
  } else {
    const graphemeCount = graphemes(post.text.normalize("NFC")).length;
    const byteCount = Buffer.byteLength(post.text, "utf8");
    const isValid = graphemeCount <= 300 && byteCount <= 3_000;
    const status = isValid ? "PASS" : "FAIL";
    console.log(
      `${status} Bluesky — ${post.campaign}: ${graphemeCount}/300 graphemes, ${byteCount}/3000 bytes`,
    );
    hasFailure ||= !isValid;
  }
}

process.exitCode = hasFailure ? 1 : 0;
