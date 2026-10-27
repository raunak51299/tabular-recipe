#!/usr/bin/env node
/**
 * tabular-recipe renderer
 *
 * Validates a tabular recipe model and renders a self-contained, print-ready
 * HTML recipe card. No dependencies.
 *
 * Usage:
 *   node render.mjs <recipe.json> [--out <recipe.html>] [--check] [--open]
 */

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve, dirname, basename, extname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import process from "node:process";

const FONT_DIR = join(dirname(fileURLToPath(import.meta.url)), "..", "assets", "fonts");

function fontFace(family, file, style, weight) {
  try {
    const data = readFileSync(join(FONT_DIR, file)).toString("base64");
    return `@font-face {
  font-family: "${family}";
  font-style: ${style};
  font-weight: ${weight};
  font-display: block;
  src: url(data:font/woff2;base64,${data}) format("woff2");
}`;
  } catch {
    return "";
  }
}

const FONT_CSS = [
  fontFace("Source Sans 3", "source-sans-3-latin.woff2", "normal", "400 700"),
  fontFace("Source Serif 4", "source-serif-4-latin.woff2", "normal", "200 900"),
  fontFace("Source Serif 4", "source-serif-4-italic-latin.woff2", "italic", "400"),
]
  .filter(Boolean)
  .join("\n");

const HELP = `tabular-recipe renderer

Usage:
  node render.mjs <recipe.json> [options]

Options:
  --out <file>   Write HTML to this path (default: input path with .html)
  --check        Validate only; do not write an HTML file
  --open         Open the rendered HTML after writing it
  -h, --help     Show this help`;

const HEX_COLOR = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isText(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function parseArgs(argv) {
  const args = { input: null, out: null, check: false, open: false, help: false };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--check") args.check = true;
    else if (arg === "--open") args.open = true;
    else if (arg === "--out") {
      const value = argv[i + 1];
      if (!value) throw new Error("--out requires a file path");
      args.out = value;
      i += 1;
    } else if (arg === "-h" || arg === "--help") args.help = true;
    else if (arg.startsWith("-")) throw new Error(`Unknown option: ${arg}`);
    else if (!args.input) args.input = arg;
    else throw new Error(`Unexpected argument: ${arg}`);
  }
  return args;
}

function validate(data) {
  const errors = [];
  const warnings = [];

  if (!isObject(data)) {
    errors.push("root: expected a JSON object");
    return { errors, warnings };
  }

  if (data.schema_version !== undefined && data.schema_version !== 1) {
    warnings.push(`schema_version: expected 1, found ${JSON.stringify(data.schema_version)}`);
  }

  if (!isText(data.title)) errors.push("title: required non-empty string");

  if (data.yield !== undefined && data.yield !== null && typeof data.yield !== "string") {
    errors.push("yield: expected a string");
  }

  if (data.lang !== undefined && !isText(data.lang)) {
    errors.push("lang: expected a non-empty string such as \"en\"");
  }

  if (data.source !== undefined && data.source !== null) {
    if (typeof data.source === "string") {
      if (!isText(data.source)) errors.push("source: expected a non-empty string or object");
    } else if (!isObject(data.source)) {
      errors.push("source: expected a string or object");
    } else {
      if (data.source.name !== undefined && !isText(data.source.name)) {
        errors.push("source.name: expected a non-empty string");
      }
      if (data.source.author !== undefined && !isText(data.source.author)) {
        errors.push("source.author: expected a non-empty string");
      }
      if (data.source.url !== undefined && data.source.url !== null) {
        if (!isText(data.source.url)) {
          errors.push("source.url: expected a non-empty URL string");
        } else {
          try {
            const url = new URL(data.source.url);
            if (url.protocol !== "http:" && url.protocol !== "https:") {
              errors.push("source.url: only http:// and https:// URLs are allowed");
            }
          } catch {
            errors.push("source.url: not a valid URL");
          }
        }
      }
    }
  }

  if (data.print !== undefined && data.print !== null) {
    if (!isObject(data.print)) {
      errors.push("print: expected an object");
    } else if (
      data.print.orientation !== undefined &&
      !["portrait", "landscape"].includes(data.print.orientation)
    ) {
      errors.push("print.orientation: expected \"portrait\" or \"landscape\"");
    }
  }

  if (data.notes !== undefined && data.notes !== null) {
    if (!Array.isArray(data.notes)) {
      errors.push("notes: expected an array of strings");
    } else {
      data.notes.forEach((note, index) => {
        if (!isText(note)) errors.push(`notes[${index}]: expected a non-empty string`);
      });
    }
  }

  if (data.layers !== undefined && data.layers !== null) {
    if (!isObject(data.layers)) {
      errors.push("layers: expected an object");
    } else {
      if (data.layers.title !== undefined && !isText(data.layers.title)) {
        errors.push("layers.title: expected a non-empty string");
      }
      if (!Array.isArray(data.layers.items) || data.layers.items.length === 0) {
        errors.push("layers.items: expected a non-empty array");
      } else {
        data.layers.items.forEach((item, index) => {
          const path = `layers.items[${index}]`;
          if (!isObject(item)) {
            errors.push(`${path}: expected an object`);
            return;
          }
          if (!isText(item.label)) errors.push(`${path}.label: expected a non-empty string`);
          if (item.color !== undefined && item.color !== null) {
            if (typeof item.color !== "string" || !HEX_COLOR.test(item.color)) {
              errors.push(`${path}.color: expected a hex color such as "#c0392b"`);
            }
          }
        });
      }
    }
  }

  if (!Array.isArray(data.sections) || data.sections.length === 0) {
    errors.push("sections: expected a non-empty array");
    return { errors, warnings };
  }

  const namedSections = data.sections.filter(
    (section) => isObject(section) && isText(section.name),
  ).length;
  if (data.sections.length > 1 && namedSections !== data.sections.length) {
    errors.push("sections: every section needs a name when there is more than one section");
  }

  data.sections.forEach((section, sectionIndex) => {
    const sectionPath = `sections[${sectionIndex}]`;
    if (!isObject(section)) {
      errors.push(`${sectionPath}: expected an object`);
      return;
    }

    const sectionName = isText(section.name) ? ` (${section.name})` : "";
    const path = `${sectionPath}${sectionName}`;

    if (section.name !== undefined && !isText(section.name)) {
      errors.push(`${sectionPath}.name: expected a non-empty string`);
    }

    if (section.setup !== undefined && section.setup !== null) {
      if (!Array.isArray(section.setup)) {
        errors.push(`${path}.setup: expected an array of strings`);
      } else {
        section.setup.forEach((line, index) => {
          if (!isText(line)) errors.push(`${path}.setup[${index}]: expected a non-empty string`);
        });
      }
    }

    const rows = section.rows;
    const rowsValid = Array.isArray(rows) && rows.length > 0;
    if (!rowsValid) {
      errors.push(`${path}.rows: expected a non-empty array of ingredient strings`);
    } else {
      rows.forEach((row, index) => {
        if (!isText(row)) errors.push(`${path}.rows[${index}]: expected a non-empty string`);
      });
    }

    if (!Array.isArray(section.actions) || section.actions.length === 0) {
      errors.push(`${path}.actions: expected a non-empty array of actions`);
      return;
    }

    if (section.actions.length > 9) {
      warnings.push(
        `${path}: ${section.actions.length} action columns is wide; use landscape print or split the section`,
      );
    }

    const touched = rowsValid ? new Array(rows.length).fill(false) : [];

    section.actions.forEach((action, actionIndex) => {
      const actionPath = `${path}.actions[${actionIndex}]`;
      if (!isObject(action)) {
        errors.push(`${actionPath}: expected an object`);
        return;
      }
      if (!isText(action.label)) {
        errors.push(`${actionPath}.label: expected a non-empty string`);
      } else if (action.label.length > 36) {
        warnings.push(
          `${actionPath}.label: ${action.label.length} characters is long for a vertical label`,
        );
      }

      if (!Array.isArray(action.spans) || action.spans.length === 0) {
        errors.push(`${actionPath}.spans: expected a non-empty array of [start, count] pairs`);
        return;
      }

      const validSpans = [];
      action.spans.forEach((span, spanIndex) => {
        const spanPath = `${actionPath}.spans[${spanIndex}]`;
        if (!Array.isArray(span) || span.length !== 2) {
          errors.push(`${spanPath}: expected [start, count]`);
          return;
        }
        const [start, count] = span;
        if (!Number.isInteger(start) || start < 0) {
          errors.push(`${spanPath}: start must be a non-negative integer`);
          return;
        }
        if (!Number.isInteger(count) || count < 1) {
          errors.push(`${spanPath}: count must be a positive integer`);
          return;
        }
        if (rowsValid && start + count > rows.length) {
          errors.push(
            `${spanPath}: covers rows ${start}-${start + count - 1}, but the section has ${rows.length} rows`,
          );
          return;
        }
        validSpans.push({ start, count });
      });

      validSpans.sort((a, b) => a.start - b.start);
      for (let i = 1; i < validSpans.length; i += 1) {
        const previous = validSpans[i - 1];
        const current = validSpans[i];
        if (current.start < previous.start + previous.count) {
          errors.push(
            `${actionPath}.spans: overlap between [${previous.start}, ${previous.count}] and [${current.start}, ${current.count}]`,
          );
        } else if (current.start === previous.start + previous.count) {
          warnings.push(
            `${actionPath}.spans: adjacent spans can be merged into one [${previous.start}, ${previous.count + current.count}]`,
          );
        }
      }

      if (rowsValid) {
        validSpans.forEach(({ start, count }) => {
          for (let row = start; row < start + count; row += 1) touched[row] = true;
        });
      }
    });

    if (rowsValid) {
      const untouched = [];
      touched.forEach((value, index) => {
        if (!value) untouched.push(index);
      });
      if (untouched.length > 0) {
        warnings.push(
          `${path}.rows: row${untouched.length > 1 ? "s" : ""} ${untouched.join(", ")} ${
            untouched.length > 1 ? "are" : "is"
          } not touched by any action`,
        );
      }
    }
  });

  return { errors, warnings };
}

function plural(count, singular, pluralForm = `${singular}s`) {
  return count === 1 ? singular : pluralForm;
}

function printReport(data, result, inputPath) {
  const sections = Array.isArray(data?.sections) ? data.sections : [];
  const rows = sections.reduce(
    (total, section) => total + (Array.isArray(section?.rows) ? section.rows.length : 0),
    0,
  );
  const actions = sections.reduce(
    (total, section) => total + (Array.isArray(section?.actions) ? section.actions.length : 0),
    0,
  );

  console.log("");
  console.log(data?.title || basename(inputPath));
  console.log(
    `  ${sections.length} ${plural(sections.length, "section")} | ${rows} ${plural(
      rows,
      "ingredient",
    )} | ${actions} ${plural(actions, "action")}`,
  );
  result.warnings.forEach((warning) => console.log(`  [warn] ${warning}`));
  result.errors.forEach((error) => console.log(`  [error] ${error}`));
  if (result.warnings.length === 0 && result.errors.length === 0) {
    console.log("  No issues found.");
  }
  console.log("");
}

function escapeHTML(value) {
  return String(value).replace(
    /[&<>"']/g,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[character],
  );
}

function renderSource(source) {
  if (!source) return "";
  if (typeof source === "string") {
    return `<p class="source">Source: ${escapeHTML(source)}</p>`;
  }

  const name = isText(source.name) ? escapeHTML(source.name) : "";
  const author = isText(source.author) ? escapeHTML(source.author) : "";
  const url = isText(source.url) ? escapeHTML(source.url) : "";

  let value = "";
  if (name && url) value = `<a href="${url}">${name}</a>`;
  else if (name) value = name;
  else if (url) value = `<a href="${url}">${url}</a>`;

  if (author) value += `${value ? " by " : "by "}${author}`;
  return value ? `<p class="source">Source: ${value}</p>` : "";
}

function buildTable(section, title) {
  const rows = section.rows;
  const actions = section.actions;
  const columnCount = actions.length;

  // grid[row][column] is either undefined (blank), a start cell, or a covered cell.
  const grid = Array.from({ length: rows.length }, () => Array(columnCount).fill(undefined));

  actions.forEach((action, columnIndex) => {
    action.spans.forEach(([start, count]) => {
      for (let offset = 0; offset < count; offset += 1) {
        const rowIndex = start + offset;
        const existing = grid[rowIndex][columnIndex];
        if (existing !== undefined) {
          throw new Error(
            `Internal geometry error: overlapping cells in section "${section.name || title}" at row ${rowIndex}, column ${columnIndex}`,
          );
        }
        grid[rowIndex][columnIndex] = {
          state: offset === 0 ? "start" : "cover",
          label: action.label,
          rowspan: count,
        };
      }
    });
  });

  const setupRows = Array.isArray(section.setup) ? section.setup : [];
  const setupHTML = setupRows
    .map(
      (line) =>
        `<tr class="setup-row"><td class="setup" colspan="${
          columnCount + 1
        }">${escapeHTML(line)}</td></tr>`,
    )
    .join("\n");

  const bodyRows = rows
    .map((row, rowIndex) => {
      let cells = "";
      let blankRun = 0;
      let covered = 0;
      let occupied = 1; // the ingredient header cell

      const flushBlanks = () => {
        if (blankRun === 0) return;
        const colspan = blankRun > 1 ? ` colspan="${blankRun}"` : "";
        cells += `<td class="blank"${colspan}>&nbsp;</td>`;
        occupied += blankRun;
        blankRun = 0;
      };

      for (let columnIndex = 0; columnIndex < columnCount; columnIndex += 1) {
        const cell = grid[rowIndex][columnIndex];
        if (!cell) {
          blankRun += 1;
          continue;
        }
        flushBlanks();
        if (cell.state === "cover") {
          covered += 1;
          continue;
        }
        const rowspan = cell.rowspan > 1 ? ` rowspan="${cell.rowspan}"` : "";
        cells += `<td class="action"${rowspan}><span class="action-label">${escapeHTML(
          cell.label,
        )}</span></td>`;
        occupied += 1;
      }
      flushBlanks();

      if (occupied + covered !== 1 + columnCount) {
        throw new Error(
          `Internal geometry error: row ${rowIndex} of section "${section.name || title}" has ${
            occupied + covered
          } columns, expected ${1 + columnCount}`,
        );
      }

      return `<tr><th scope="row" class="ingredient">${escapeHTML(
        row,
      )}</th>${cells}</tr>`;
    })
    .join("\n");

  const caption = escapeHTML(section.name ? `${section.name} - ${title}` : title);

  return `<div class="table-wrap">
<table class="recipe-table">
<caption class="sr-only">${caption}</caption>
<tbody>
${setupHTML ? `${setupHTML}\n` : ""}${bodyRows}
</tbody>
</table>
</div>`;
}

function renderLayers(layers) {
  if (!layers) return "";
  const items = layers.items || [];
  if (items.length === 0) return "";

  const rows = items
    .map((item) => {
      const color = isText(item.color) ? escapeHTML(item.color) : "";
      const style = color ? ` style="background-color: ${color}"` : "";
      return `<tr><th scope="row">${escapeHTML(item.label)}</th><td class="swatch${
        color ? "" : " no-color"
      }"${style}>&nbsp;</td></tr>`;
    })
    .join("\n");

  return `<section class="layers">
<h2>${escapeHTML(layers.title || "Layer diagram")}</h2>
<p class="layer-hint">Top to bottom</p>
<div class="table-wrap">
<table class="layer-table">
<caption class="sr-only">${escapeHTML(layers.title || "Layer diagram")}, top to bottom</caption>
<tbody>
${rows}
</tbody>
</table>
</div>
</section>`;
}

function renderNotes(notes) {
  if (!Array.isArray(notes) || notes.length === 0) return "";
  return `<section class="notes">
<h2>Notes</h2>
<ul>
${notes.map((note) => `<li>${escapeHTML(note)}</li>`).join("\n")}
</ul>
</section>`;
}

function renderHTML(data) {
  const title = data.title;
  const lang = isText(data.lang) ? data.lang : "en";
  const orientation = data.print?.orientation === "landscape" ? "landscape" : "portrait";
  const yieldLine = isText(data.yield) ? `<p class="yield">${escapeHTML(data.yield)}</p>` : "";
  const source = renderSource(data.source);
  const sections = data.sections
    .map((section) => {
      const heading = isText(section.name) ? `<h2>${escapeHTML(section.name)}</h2>\n` : "";
      return `<section class="recipe-section">
${heading}${buildTable(section, title)}
</section>`;
    })
    .join("\n");
  const layers = renderLayers(data.layers);
  const notes = renderNotes(data.notes);

  return `<!doctype html>
<html lang="${escapeHTML(lang)}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHTML(title)} - Tabular Recipe</title>
<!-- Generated by tabular-recipe. Edit the JSON model and re-render; changes to this HTML will be overwritten. -->
<style>
${FONT_CSS}
:root {
  --ink: #1f1f1f;
  --muted: #666;
  --rule: #2b2b2b;
  --paper: #f2efe8;
  --card: #fffdf9;
  --setup-bg: #f6f3ec;
  --font-sans: "Source Sans 3", "Segoe UI", system-ui, -apple-system, sans-serif;
  --font-serif: "Source Serif 4", Georgia, "Times New Roman", serif;
}
* { box-sizing: border-box; }
html { color-scheme: light; }
body {
  margin: 0;
  padding: 2.5rem 1.25rem 4rem;
  background: var(--paper);
  color: var(--ink);
  font-family: var(--font-sans);
  font-size: 16px;
  line-height: 1.5;
  font-kerning: normal;
}
.card {
  max-width: 980px;
  margin: 0 auto;
  padding: 2.5rem 2.75rem 2rem;
  background: var(--card);
  border: 1px solid #d9d2c4;
  box-shadow: 0 18px 50px rgba(51, 41, 25, 0.09);
}
.card-header {
  position: relative;
  padding-right: 9rem;
  padding-bottom: 1.35rem;
  margin-bottom: 1.5rem;
  border-bottom: 1px solid var(--rule);
}
.kicker {
  margin: 0 0 0.5rem;
  font-size: 0.7rem;
  font-weight: 600;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: var(--muted);
}
h1 {
  margin: 0;
  font-family: var(--font-serif);
  font-size: clamp(2.2rem, 5vw, 3.15rem);
  font-weight: 400;
  line-height: 1.02;
  letter-spacing: -0.018em;
  text-wrap: balance;
  font-optical-sizing: auto;
}
.yield { margin: 0.55rem 0 0; font-size: 0.98rem; color: var(--muted); }
.source { margin: 0.4rem 0 0; font-size: 0.85rem; color: var(--muted); }
.source a, .card-footer a { color: inherit; text-decoration-thickness: 1px; text-underline-offset: 2px; }
.print-button {
  position: absolute;
  top: 0;
  right: 0;
  padding: 0.5rem 0.75rem;
  border: 1px solid var(--rule);
  background: transparent;
  color: var(--ink);
  font: inherit;
  font-size: 0.75rem;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  cursor: pointer;
}
.print-button:hover { background: var(--ink); color: var(--card); }
.recipe-section { margin: 1.7rem 0 0; }
.recipe-section h2, .layers h2, .notes h2 {
  margin: 0 0 0.55rem;
  font-family: var(--font-serif);
  font-size: 1.12rem;
  font-weight: 600;
  letter-spacing: 0;
}
.table-wrap { overflow-x: auto; }
table.recipe-table {
  width: 100%;
  border-collapse: collapse;
  table-layout: auto;
  font-size: 0.85rem;
  line-height: 1.32;
  font-variant-numeric: tabular-nums;
}
table.recipe-table th,
table.recipe-table td { border: 1px solid var(--rule); }
th.ingredient {
  width: 42%;
  min-width: 210px;
  padding: 0.5rem 0.65rem;
  text-align: left;
  font-family: var(--font-serif);
  font-size: 0.88rem;
  font-weight: 400;
  vertical-align: middle;
}
td.action { padding: 0.45rem 0.3rem; text-align: center; vertical-align: middle; }
.action-label {
  display: inline-block;
  writing-mode: vertical-rl;
  transform: rotate(180deg);
  white-space: nowrap;
  font-size: 0.76rem;
  font-weight: 500;
  letter-spacing: 0.015em;
}
td.blank { padding: 0.45rem 0.3rem; background: #fff; }
tr.setup-row td.setup {
  padding: 0.4rem 0.6rem;
  text-align: center;
  font-family: var(--font-serif);
  font-style: italic;
  font-size: 0.86rem;
  background: var(--setup-bg);
  color: #4d4d4d;
}
.layers { margin-top: 2rem; }
.layer-hint {
  margin: -0.25rem 0 0.5rem;
  font-size: 0.72rem;
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: 0.12em;
}
.layer-table {
  width: 100%;
  max-width: 720px;
  border-collapse: collapse;
  font-size: 0.84rem;
}
.layer-table th, .layer-table td { border: 1px solid var(--rule); padding: 0.45rem 0.65rem; }
.layer-table th { text-align: left; font-weight: 400; }
.layer-table td.swatch { width: 32px; padding: 0; background-clip: padding-box; }
.layer-table td.no-color {
  background-image: repeating-linear-gradient(45deg, #ddd 0 4px, #fff 4px 8px);
}
.notes { margin-top: 2rem; }
.notes ul { margin: 0.4rem 0 0; padding-left: 1.2rem; font-size: 0.88rem; color: #3d3d3d; }
.notes li + li { margin-top: 0.25rem; }
.card-footer {
  margin-top: 2.5rem;
  padding-top: 1rem;
  border-top: 1px solid #cfc7b8;
  font-size: 0.72rem;
  line-height: 1.5;
  color: var(--muted);
}
.card-footer p { margin: 0.2rem 0; }
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
@media (max-width: 720px) {
  body { padding: 1rem 0.6rem 2rem; }
  .card { padding: 1.4rem 1rem 1.2rem; }
  .card-header { padding-right: 0; }
  .print-button { position: static; margin-top: 1rem; }
  th.ingredient { min-width: 160px; }
  table.recipe-table { font-size: 0.8rem; }
  th.ingredient { font-size: 0.83rem; }
}
@media print {
  @page { size: ${orientation}; margin: 9mm; }
  body { padding: 0; background: #fff; font-size: 9pt; line-height: 1.36; }
  .card {
    max-width: none;
    margin: 0;
    padding: 0;
    border: 0;
    box-shadow: none;
    background: #fff;
  }
  .print-button { display: none; }
  .card-header {
    padding-right: 0;
    padding-bottom: 0.7rem;
    margin-bottom: 0.75rem;
  }
  .kicker { margin-bottom: 0.18rem; font-size: 0.64rem; }
  h1 { font-size: 2.05rem; }
  .yield { margin-top: 0.22rem; font-size: 0.84rem; }
  .source { margin-top: 0.12rem; font-size: 0.73rem; }
  .table-wrap { overflow: visible; }
  .recipe-section {
    margin-top: 0.55rem;
    break-inside: avoid;
    page-break-inside: avoid;
  }
  .card.keep-tail .recipe-section:last-of-type,
  .card.keep-tail .layers,
  .card.keep-tail .notes {
    break-after: avoid;
    page-break-after: avoid;
  }
  .card.keep-tail .layers,
  .card.keep-tail .notes,
  .card.keep-tail .card-footer {
    break-before: avoid;
    page-break-before: avoid;
  }
  .recipe-section h2, .layers h2, .notes h2 {
    margin-bottom: 0.2rem;
    font-size: 1rem;
    break-after: avoid;
    page-break-after: avoid;
  }
  table.recipe-table { font-size: 7.5pt; line-height: 1.27; }
  table.recipe-table tr { break-inside: avoid; page-break-inside: avoid; }
  th.ingredient { width: 40%; min-width: 0; padding: 0.25rem 0.45rem; font-size: 7.7pt; }
  td.action { padding: 0.15rem 0.2rem; }
  td.blank { padding: 0.15rem 0.2rem; }
  .action-label { font-size: 6.8pt; }
  tr.setup-row td.setup {
    padding: 0.24rem 0.5rem;
    font-size: 7.7pt;
    background: #f5f5f5 !important;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .layers {
    margin-top: 0.9rem;
    break-inside: avoid;
    page-break-inside: avoid;
  }
  .layer-hint { margin-bottom: 0.3rem; font-size: 0.62rem; }
  .layer-table { font-size: 7.8pt; }
  .layer-table th, .layer-table td { padding: 0.25rem 0.5rem; }
  .layer-table td.swatch {
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .notes {
    margin-top: 0.9rem;
    break-inside: avoid;
    page-break-inside: avoid;
  }
  .notes ul { font-size: 8pt; }
  .card-footer {
    margin-top: 0.9rem;
    padding-top: 0.55rem;
    font-size: 6.4pt;
    break-inside: avoid;
    page-break-inside: avoid;
  }
  a { color: inherit; text-decoration: none; }
}
</style>
</head>
<body>
<main class="card${data.sections.length > 1 ? " keep-tail" : ""}">
<header class="card-header">
<p class="kicker">Tabular recipe</p>
<h1>${escapeHTML(title)}</h1>
${yieldLine}
${source}
<button type="button" class="print-button" onclick="window.print()">Print / Save as PDF</button>
</header>
${sections}
${layers}
${notes}
<footer class="card-footer">
<p>Format inspired by the <a href="https://www.cookingforengineers.com/">Tabular Recipe Notation</a> at Cooking For Engineers. Not affiliated with Cooking For Engineers.</p>
<p>Recipe content remains the property of its source.</p>
</footer>
</main>
</body>
</html>
`;
}

function openFile(file) {
  const platform = process.platform;
  const command = platform === "win32" ? "cmd" : platform === "darwin" ? "open" : "xdg-open";
  const args = platform === "win32" ? ["/c", "start", "", file] : [file];
  try {
    const child = spawn(command, args, { detached: true, stdio: "ignore" });
    child.unref();
  } catch (error) {
    console.error(`[warn] Could not open the file: ${error.message}`);
  }
}

function main() {
  let args;
  try {
    args = parseArgs(process.argv.slice(2));
  } catch (error) {
    console.error(`[error] ${error.message}\n\n${HELP}`);
    process.exitCode = 2;
    return;
  }

  if (args.help) {
    console.log(HELP);
    return;
  }

  if (!args.input) {
    console.error(HELP);
    process.exitCode = 2;
    return;
  }

  const inputPath = resolve(args.input);
  let data;
  try {
    data = JSON.parse(readFileSync(inputPath, "utf8").replace(/^\uFEFF/, ""));
  } catch (error) {
    console.error(`[error] Could not read or parse ${inputPath}`);
    console.error(`        ${error.message}`);
    process.exitCode = 1;
    return;
  }

  const result = validate(data);
  printReport(data, result, inputPath);

  if (result.errors.length > 0) {
    process.exitCode = 1;
    return;
  }

  if (args.check) {
    console.log("[ok] Validation complete; no file written.");
    return;
  }

  const defaultOutput =
    extname(inputPath).toLowerCase() === ".json"
      ? inputPath.slice(0, -5) + ".html"
      : inputPath + ".html";
  const outputPath = args.out ? resolve(args.out) : defaultOutput;

  try {
    mkdirSync(dirname(outputPath), { recursive: true });
    writeFileSync(outputPath, renderHTML(data), "utf8");
  } catch (error) {
    console.error(`[error] Could not write ${outputPath}`);
    console.error(`        ${error.message}`);
    process.exitCode = 1;
    return;
  }

  console.log(`[ok] Wrote ${outputPath}`);
  if (args.open) openFile(outputPath);
}

main();
