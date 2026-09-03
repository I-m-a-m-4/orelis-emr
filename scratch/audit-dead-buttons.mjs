/**
 * Find interactive elements that cannot do anything.
 *
 * A dead button is a <Button> with no onClick, no type="submit", no `asChild`
 * (which would mean it delegates to a Link or a Radix trigger), and no enclosing
 * *Trigger that supplies behaviour through context. Run:
 *
 *   node scratch/audit-dead-buttons.mjs
 */
import { readFileSync } from 'node:fs';

import { execSync } from 'node:child_process';

const files = execSync('git ls-files "src/**/*.tsx"', { encoding: 'utf8' })
  .split('\n')
  .filter(Boolean);

/** Walk forward from `<Button` to its closing `>`, respecting nested braces/quotes. */
function readTag(src, start) {
  let i = start;
  let depth = 0;
  let quote = null;
  while (i < src.length) {
    const c = src[i];
    if (quote) {
      if (c === quote && src[i - 1] !== '\\') quote = null;
    } else if (c === '"' || c === "'" || c === '`') {
      quote = c;
    } else if (c === '{') depth++;
    else if (c === '}') depth--;
    else if (c === '>' && depth === 0) return src.slice(start, i + 1);
    i++;
  }
  return src.slice(start, start + 400);
}

const TRIGGERS = /<(Dialog|AlertDialog|Popover|DropdownMenu|Sheet|Tooltip|Collapsible|Select|HoverCard|Menubar|Accordion)?(Trigger|Close)[^>]*asChild[^>]*>\s*$/;

const findings = [];

for (const file of files) {
  const src = readFileSync(file, 'utf8');

  let idx = 0;
  while ((idx = src.indexOf('<Button', idx)) !== -1) {
    // Skip <ButtonSomething>
    const after = src[idx + 7];
    if (after && /[A-Za-z]/.test(after)) { idx += 7; continue; }

    const tag = readTag(src, idx);
    const line = src.slice(0, idx).split('\n').length;

    const hasOnClick = /\bonClick\s*=/.test(tag);
    const hasSubmit = /type\s*=\s*["']submit["']/.test(tag);
    const hasAsChild = /\basChild\b/.test(tag);
    const hasOnSelect = /\bonSelect\s*=/.test(tag);

    // Deliberately inert, and therefore not a defect:
    //  - `disabled` states ("Payment Gateway Offline") say so honestly.
    //  - `pointer-events-none` marks a decorative label sitting over the real
    //    control, e.g. a styled "Browse Files" above a transparent file input.
    const isDisabled = /\bdisabled\b(?!\s*=\s*\{?false)/.test(tag);
    const isDecorative = /pointer-events-none/.test(tag);

    // Child of a Radix trigger/close that forwards its own handlers.
    const before = src.slice(Math.max(0, idx - 300), idx);
    const insideTrigger = TRIGGERS.test(before);

    // Passed as a `trigger`/`children` prop to a wrapper that will put it inside
    // a Trigger. Cannot be resolved statically, so it is reported separately
    // rather than counted as dead.
    const asPropValue = /(trigger|children|action)\s*=\s*\{?\s*$/.test(before.trimEnd().slice(-40));

    if (!hasOnClick && !hasSubmit && !hasAsChild && !hasOnSelect
        && !insideTrigger && !isDisabled && !isDecorative && !asPropValue) {
      const label = (tag.match(/>([^<]{0,60})/) || [])[1]?.trim() || '';
      const bodyStart = idx + tag.length;
      const body = src.slice(bodyStart, bodyStart + 120).replace(/\s+/g, ' ');
      const text = body.replace(/<[^>]*>/g, '').trim().slice(0, 48);
      findings.push({ file, line, text: text || label });
    }

    idx += 7;
  }
}

if (!findings.length) {
  console.log('No dead buttons found.');
} else {
  console.log(`${findings.length} button(s) with no handler:\n`);
  const byFile = new Map();
  for (const f of findings) {
    if (!byFile.has(f.file)) byFile.set(f.file, []);
    byFile.get(f.file).push(f);
  }
  for (const [file, items] of [...byFile].sort((a, b) => b[1].length - a[1].length)) {
    console.log(`${file}  (${items.length})`);
    for (const it of items) console.log(`   :${it.line}  "${it.text}"`);
  }
}
