#!/usr/bin/env node
'use strict';

/*
 * fix-telegram.js — Wispbyte Telegram repair tool
 *
 * Repairs the following deployment-blocking bugs in Kleez-First-copy.js:
 *
 *   1. Illegal top-level `return` inside the Continuation Engine installer
 *      → SyntaxError at parse time. Nothing runs. No Telegram reply at all.
 *
 *   2. Stale telegram_polling.lock reclaim uses a 2-minute staleness window
 *      → On Wispbyte, a dead PID can still hold the lock for up to 2 min.
 *
 *   3. telegram_poll_offset.json restored unconditionally
 *      → If the token was swapped, or an older session persisted an offset,
 *         every fresh update_id is lower than the saved offset and gets
 *         silently dropped by Telegram's getUpdates.
 *
 *   4. No boot-phase logging
 *      → You cannot see whether the process died at parse time, at
 *         initialize() time, or at polling time.
 *
 * Usage:
 *   node fix-telegram.js Kleez-First-copy.js
 *
 * Safety:
 *   • Creates Kleez-First-copy.js.bak-<timestamp> before writing.
 *   • Verifies the repaired file parses with `node --check`.
 *   • Prints a unified diff of every change.
 *   • Does nothing if a patch is already applied (idempotent).
 */

const fs   = require('fs');
const path = require('path');
const cp   = require('child_process');

// ── 0. Resolve input file ──────────────────────────────────────────────────
const targetPath = path.resolve(
  process.argv[2] || 'Kleez-First-copy.js'
);

if (!fs.existsSync(targetPath)) {
  console.error(`❌ File not found: ${targetPath}`);
  console.error('Usage: node fix-telegram.js path/to/Kleez-First-copy.js');
  process.exit(1);
}

const originalSource = fs.readFileSync(targetPath, 'utf8');
let source = originalSource;

// Track every applied patch so we can print a clean report.
const applied = [];
const skipped = [];
const failed  = [];

// ─────────────────────────────────────────────────────────────────────────────
// ── PATCH HELPERS ────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────

function applyOnce(id, description, needle, replacement) {
  if (source.includes(replacement)) {
    skipped.push({ id, description, reason: 'already patched' });
    return true;
  }
  if (!source.includes(needle)) {
    failed.push({ id, description, reason: 'anchor text not found' });
    return false;
  }
  const before = source;
  source = source.replace(needle, replacement);
  const changed = source !== before;
  if (changed) applied.push({ id, description });
  return changed;
}

function applyRegexOnce(id, description, regex, replacement) {
  if (regex.test(source)) {
    const before = source;
    source = source.replace(regex, replacement);
    if (source !== before) {
      applied.push({ id, description });
      return true;
    }
    skipped.push({ id, description, reason: 'regex matched but produced no change' });
    return true;
  }
  failed.push({ id, description, reason: 'regex did not match' });
  return false;
}

// ─────────────────────────────────────────────────────────────────────────────
// ── PATCH 1: Kill the illegal top-level `return` ─────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────
// The Continuation Engine IIFE is emitted from the top-level `else` block of
// the Neon bootstrap `if`. A bare `return` in that scope is a SyntaxError.
//
// We convert:
//
//     if (global.__CONT_ENGINE__) {
//       console.log('[CONT] already installed — skipping');
//       return;
//     }
//     global.__CONT_ENGINE__ = true;
//
//     (function installContinuationEngines() { ... })();
//
// into:
//
//     if (global.__CONT_ENGINE__) {
//       console.log('[CONT] already installed — skipping');
//     } else {
//       global.__CONT_ENGINE__ = true;
//
//     (function installContinuationEngines() { ... })();
//
//     }
// ─────────────────────────────────────────────────────────────────────────────

(function patch1_illegalReturn() {
  const needle =
`if (global.__CONT_ENGINE__) {
  console.log('[CONT] already installed — skipping');
  return;
}
global.__CONT_ENGINE__ = true;`;

  const replacement =
`if (global.__CONT_ENGINE__) {
  console.log('[CONT] already installed — skipping');
} else {
  global.__CONT_ENGINE__ = true;`;

  const ok = applyOnce(
    'P1',
    'Wrap Continuation Engine installer in else { } so top-level `return` becomes legal',
    needle,
    replacement
  );

  if (!ok) return;

  // Close the new `else {` we just opened. The original file ended that IIFE
  // with `})();` immediately followed by the NEON-PATCH command handler.
  // We insert the closing brace right before the NEON-PATCH comment.
  const closerNeedle =
`})();
/* [NEON-PATCH] Status/flush wrappers preserve every existing Telegram handler. */`;

  const closerReplacement =
`})();

} // ← close the outer else from the illegal-return fix
/* [NEON-PATCH] Status/flush wrappers preserve every existing Telegram handler. */`;

  applyOnce(
    'P1b',
    'Close the new else { } block before the NEON-PATCH wrapper',
    closerNeedle,
    closerReplacement
  );
})();

// ─────────────────────────────────────────────────────────────────────────────
// ── PATCH 2: Reclaim stale polling lock immediately ──────────────────────────
// ─────────────────────────────────────────────────────────────────────────────
// Original staleness window is 2 minutes. Wispbyte kills the old container
// before starting the new one, so a dead PID is definitive proof we own it.
//
// Additionally, when the process is truly passive (another live instance
// holds the lock), the bot silently drops every sendMessage reply because
// `_PASSIVE_SUPPRESSED_TG_METHODS` swallows them. We surface this in logs.
// ─────────────────────────────────────────────────────────────────────────────

(function patch2_stalePollLock() {
  // 2a. Shorten the stale window from 2 min to 30 s.
  applyOnce(
    'P2a',
    'Reduce TELEGRAM polling lock stale window from 120s → 30s',
    `const _TELEGRAM_POLLING_LOCK_STALE_MS = 2 * 60 * 1000;`,
    `const _TELEGRAM_POLLING_LOCK_STALE_MS = 30 * 1000; // Wispbyte: fast lock reclaim`
  );

  // 2b. Change the "held" decision so a DEAD PID is reclaimed immediately,
  //     not after the stale window. Wispbyte kills old containers before
  //     starting the new one, so a dead PID means we are the sole owner.
  applyOnce(
    'P2b',
    'Reclaim polling lock immediately when holder PID is dead',
    `        // A live process or a very recent lock owns this storage directory.
        // Only reclaim a lock after the heartbeat has been absent long enough
        // to indicate a crashed/stopped process.
        if (lockIsLive || lockAge < _TELEGRAM_POLLING_LOCK_STALE_MS) {
          console.error(
            \`🚫 Telegram polling lock is held\${lockPid ? \` by pid \${lockPid}\` : ''}; \` +
            'this process will remain passive to prevent duplicate scans.'
          );
          return false;
        }`,
    `        // Wispbyte runs a single container: the old process is killed before
        // the new one starts. A dead PID therefore means the lock is stale.
        // We only refuse when the holder is genuinely alive.
        const heldByLiveProcess = lockIsLive &&
          lockAge < _TELEGRAM_POLLING_LOCK_STALE_MS * 4;
        if (heldByLiveProcess) {
          console.error(
            \`🚫 Telegram polling lock held by live pid \${lockPid}; \` +
            'this instance stays passive to prevent duplicate scans. ' +
            'If you are certain no other bot instance is running, delete ' +
            \`\${_telegramPollingLockFile} and restart.\`
          );
          return false;
        }`
  );
})();

// ─────────────────────────────────────────────────────────────────────────────
// ── PATCH 3: Reject corrupt polling offsets at load time ─────────────────────
// ─────────────────────────────────────────────────────────────────────────────
// A persisted offset greater than every real update_id causes Telegram to
// return an empty result for every getUpdates call, forever. This happens
// when the token was swapped after the offset was saved.
// ─────────────────────────────────────────────────────────────────────────────

(function patch3_offsetLoad() {
  applyOnce(
    'P3a',
    'Validate persisted Telegram poll offset before restoring it',
    `  let _pollOffset = 0;
  try {
    if (fs.existsSync(_pollOffsetFile)) {
      const _saved = JSON.parse(fs.readFileSync(_pollOffsetFile, 'utf8'));
      if (_saved && Number.isFinite(_saved.offset)) {
        _pollOffset = _saved.offset;
        console.log(\`📡 Restored Telegram poll offset from disk: \${_pollOffset}\`);
      }
    }
  } catch (e) {
    console.warn('⚠️ Could not read persisted poll offset, starting from 0:', e.message);
  }`,
    `  let _pollOffset = 0;
  try {
    if (fs.existsSync(_pollOffsetFile)) {
      const _saved = JSON.parse(fs.readFileSync(_pollOffsetFile, 'utf8'));
      const _savedTok = _saved && typeof _saved.token === 'string' ? _saved.token : null;
      const _tokPrefix = (TELEGRAM_TOKEN || '').split(':')[0];
      const _tokenMatches = !_savedTok || _savedTok === _tokPrefix;
      if (_saved && Number.isFinite(_saved.offset) && _saved.offset > 0 &&
          _saved.offset < 1e12 && _tokenMatches) {
        _pollOffset = _saved.offset;
        console.log(\`📡 Restored Telegram poll offset from disk: \${_pollOffset}\`);
      } else if (!_tokenMatches) {
        console.warn('⚠️ Persisted Telegram poll offset belongs to a different bot token — resetting to 0');
        try { fs.unlinkSync(_pollOffsetFile); } catch (_) {}
      } else {
        console.warn('⚠️ Persisted Telegram poll offset is invalid — resetting to 0');
        try { fs.unlinkSync(_pollOffsetFile); } catch (_) {}
      }
    }
  } catch (e) {
    console.warn('⚠️ Could not read persisted poll offset, starting from 0:', e.message);
  }`
  );

  // Save the token prefix alongside the offset so the mismatch check above
  // can compare it on the next boot.
  applyOnce(
    'P3b',
    'Persist bot-token prefix with poll offset for change detection',
    `      fs.writeFileSync(_pollOffsetFile, JSON.stringify({ offset: _pollOffset }));`,
    `      fs.writeFileSync(_pollOffsetFile, JSON.stringify({
        offset: _pollOffset,
        token: (TELEGRAM_TOKEN || '').split(':')[0],
        savedAt: Date.now(),
      }));`
  );
})();

// ─────────────────────────────────────────────────────────────────────────────
// ── PATCH 4: Auto-recover from a silently-stale offset at runtime ────────────
// ─────────────────────────────────────────────────────────────────────────────
// If Telegram returns empty for 90 s with a non-zero offset, we reset to 0
// so recently-sent commands get replayed. This is the belt-and-braces
// recovery for the token-swap case that Patch 3 can't catch (e.g. saved
// before the token field existed).
// ─────────────────────────────────────────────────────────────────────────────

(function patch4_runtimeOffsetRecovery() {
  // Add the recovery counters right after `_pollRunning`/`_pollReady`.
  applyOnce(
    'P4a',
    'Track empty getUpdates responses for runtime offset recovery',
    `  let _pollRunning = false;
  let _pollReady = false;`,
    `  let _pollRunning = false;
  let _pollReady = false;
  let _emptySince = 0;
  let _offsetResets = 0;`
  );

  // Inject the recovery logic at the top of the successful-branch handler.
  applyOnce(
    'P4b',
    'Reset stale offset after 90s of empty getUpdates (token-swap recovery)',
    `      if (result && result.ok && Array.isArray(result.result)) {
        _consecutive409 = 0; // successful poll — this instance is the active one`,
    `      if (result && result.ok && Array.isArray(result.result)) {
        _consecutive409 = 0; // successful poll — this instance is the active one

        // ── Silent-stale-offset recovery (Wispbyte token swap) ─────────
        // If Telegram returns no updates for 90 s while we hold a non-zero
        // offset, the offset is almost certainly from a different bot
        // session. Reset it so fresh commands flow again.
        if (result.result.length === 0) {
          if (_emptySince === 0) _emptySince = Date.now();
          if (_pollOffset > 0 &&
              Date.now() - _emptySince > 90_000 &&
              _offsetResets < 3) {
            console.warn(
              \`♻️ No Telegram updates in 90s with offset \${_pollOffset} — \` +
              'resetting offset to 0 (probable token change)'
            );
            _pollOffset = 0;
            _offsetResets += 1;
            _emptySince = 0;
            _savePollOffset();
          }
        } else {
          _emptySince = 0;
        }`
  );
})();

// ─────────────────────────────────────────────────────────────────────────────
// ── PATCH 5: Boot-phase logging ──────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────
// Without these, "no reply" gives no clue whether the process died at parse
// time, at initialize() time, or at polling time.
// ─────────────────────────────────────────────────────────────────────────────

(function patch5_bootPhases() {
  // 5a. Phase 1 — after the trading system reference is wired.
  applyOnce(
    'P5a',
    'Log boot phase 1 (file parsed, system constructed)',
    `// _tradingSystem is wired below — single reference for webhook handler
_tradingSystem = enhancedQuantumSystem;`,
    `// _tradingSystem is wired below — single reference for webhook handler
_tradingSystem = enhancedQuantumSystem;
console.log('=== BOOT PHASE 1: file parsed, trading system constructed ===');
process.on('exit', (code) => console.log('=== PROCESS EXIT CODE:', code, '==='));`
  );

  // 5b. Phase 2 — polling loop started.
  applyOnce(
    'P5b',
    'Log boot phase 2 (polling loop started)',
    `  console.log('📡 Telegram long-polling started');
  poll();`,
    `  console.log('📡 Telegram long-polling started');
  console.log('=== BOOT PHASE 2: polling loop started ===');
  poll();`
  );

  // 5c. Phase 3 — initialize complete.
  applyOnce(
    'P5c',
    'Log boot phase 3 (initialize() resolved successfully)',
    `console.log("\\n✅ ENHANCED QUANTUM SYSTEMS OPERATIONAL");`,
    `console.log('=== BOOT PHASE 3: initialize() resolved ===');
console.log("\\n✅ ENHANCED QUANTUM SYSTEMS OPERATIONAL");`
  );
})();

// ─────────────────────────────────────────────────────────────────────────────
// ── PATCH 6: Fail-safe startup wrapper around initialize() ──────────────────
// ─────────────────────────────────────────────────────────────────────────────
// If initialize() rejects (e.g. a wrapper throws), the original code called
// process.exit(1) — which Wispbyte loops and shows nothing. We keep the
// exit code, but try to send a plaintext Telegram notification first so the
// operator sees the crash on their phone.
// ─────────────────────────────────────────────────────────────────────────────

(function patch6_failsafeInit() {
  applyOnce(
    'P6',
    'Send Telegram notification when initialize() fails so the crash is visible',
    `enhancedQuantumSystem.initialize().catch(error => {
  console.error("❌ Enhanced quantum system initialization failed:", error);
  process.exit(1);
});`,
    `enhancedQuantumSystem.initialize().catch(async (error) => {
  console.error("❌ Enhanced quantum system initialization failed:", error);
  try {
    if (TELEGRAM_TOKEN && TELEGRAM_CHAT_ID) {
      await tg('sendMessage', {
        chat_id: TELEGRAM_CHAT_ID,
        text: '❌ Bot initialize() failed on startup:\\n<code>' +
              String(error && error.message || error).slice(0, 300).replace(/[<>&]/g, '') +
              '</code>\\n\\nThe process will now exit. Check the host logs.',
        parse_mode: 'HTML',
      }, 1);
    }
  } catch (_) {}
  process.exit(1);
});`
  );
})();

// ─────────────────────────────────────────────────────────────────────────────
// ── PATCH 7: Wispbyte boot recovery — unconditional stale-lock sweep ────────
// ─────────────────────────────────────────────────────────────────────────────
// Runs before the polling-lock helper, so any leftover lock from a crashed
// previous run (Wispbyte kills with SIGKILL in many cases) is cleared before
// acquireTelegramPollingLock() ever sees it. Only removes the lock when the
// holder PID is dead — it will never steal from a live sibling.
// ─────────────────────────────────────────────────────────────────────────────

(function patch7_bootRecovery() {
  applyOnce(
    'P7',
    'Wispbyte boot recovery: sweep dead-PID polling lock before first acquire',
    `const _tgHttps = require('https');`,
    `// ── Wispbyte boot recovery ─────────────────────────────────────────────
// Wispbyte frequently SIGKILLs the previous container. A lock file left by
// a dead PID would make the fresh instance passive, so every sendMessage
// reply is silently swallowed. We sweep it before any consumer runs.
try {
  const _wsLockFile = path.join(STORAGE_DIR, 'telegram_polling.lock');
  if (fs.existsSync(_wsLockFile)) {
    let _wsDead = true;
    try {
      const _wsInfo = JSON.parse(fs.readFileSync(_wsLockFile, 'utf8'));
      if (_wsInfo && Number.isInteger(_wsInfo.pid) && _wsInfo.pid > 0) {
        try { process.kill(_wsInfo.pid, 0); _wsDead = false; } catch (_) { _wsDead = true; }
      }
    } catch (_) { _wsDead = true; }
    if (_wsDead) {
      fs.unlinkSync(_wsLockFile);
      console.log('🧹 Wispbyte boot recovery: reclaimed stale Telegram polling lock');
    } else {
      console.warn('⚠️ Wispbyte boot: a LIVE process holds the polling lock — this instance will stay passive');
    }
  }
} catch (_) {}
// ────────────────────────────────────────────────────────────────────────────

const _tgHttps = require('https');`
  );
})();

// ─────────────────────────────────────────────────────────────────────────────
// ── WRITE / VERIFY / REPORT ─────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────

if (applied.length === 0 && failed.length === 0) {
  console.log('\n✅ Nothing to do — file already repaired.\n');
  process.exit(0);
}

if (failed.length > 0) {
  console.error('\n❌ The following patches could not be applied:\n');
  for (const f of failed) {
    console.error(`   [${f.id}] ${f.description}`);
    console.error(`          reason: ${f.reason}\n`);
  }
  console.error('This usually means your copy of the source file has been modified');
  console.error('from what this tool expects (different whitespace, changed lines, etc.).');
  console.error('You can still apply the remaining patches by editing manually — see');
  console.error('the ANCHOR / REPLACEMENT pairs in fix-telegram.js.\n');
  if (applied.length === 0) {
    console.error('No changes were written. Original file untouched.');
    process.exit(1);
  }
  console.error(`However, ${applied.length} patch(es) will still be written.\n`);
}

// ── Backup ─────────────────────────────────────────────────────────────────
const stamp  = new Date().toISOString().replace(/[:.]/g, '-');
const backup = `${targetPath}.bak-${stamp}`;
fs.writeFileSync(backup, originalSource, 'utf8');
console.log(`\n📦 Backup saved: ${path.basename(backup)}`);

// ── Diff ───────────────────────────────────────────────────────────────────
function unifiedDiff(before, after, context = 3) {
  const a = before.split('\n');
  const b = after.split('\n');
  const max = Math.max(a.length, b.length);
  const out = [];
  let inHunk = false;
  let hunkStart = 0;
  let hunkBuffer = [];

  const flush = () => {
    if (!inHunk) return;
    out.push(`@@ -${hunkStart + 1},${hunkBuffer.filter(l => l[0] === ' ' || l[0] === '-').length} +${hunkStart + 1},${hunkBuffer.filter(l => l[0] === ' ' || l[0] === '+').length} @@`);
    out.push(...hunkBuffer);
    hunkBuffer = [];
    inHunk = false;
  };

  for (let i = 0; i < max; i++) {
    const la = a[i];
    const lb = b[i];
    if (la === lb) {
      if (inHunk) {
        hunkBuffer.push(` ${la ?? ''}`);
        const tailNew = hunkBuffer.slice(-context * 2).filter(l => l[0] !== ' ').length;
        if (tailNew === 0 && hunkBuffer.length > context * 2) flush();
      }
      continue;
    }
    if (!inHunk) {
      inHunk = true;
      hunkStart = Math.max(0, i - context);
      for (let k = Math.max(0, i - context); k < i; k++) {
        if (a[k] !== undefined) hunkBuffer.push(` ${a[k]}`);
      }
    }
    if (la !== undefined) hunkBuffer.push(`-${la}`);
    if (lb !== undefined) hunkBuffer.push(`+${lb}`);
  }
  flush();
  return out.join('\n');
}

console.log('\n─── DIFF ─────────────────────────────────────────────────────────────');
console.log(unifiedDiff(originalSource, source));
console.log('──────────────────────────────────────────────────────────────────────\n');

// ── Syntax check ───────────────────────────────────────────────────────────
const checkPath = `${targetPath}.syntax-check-${process.pid}.js`;
fs.writeFileSync(checkPath, source, 'utf8');
let syntaxOk = false;
try {
  cp.execFileSync(process.execPath, ['--check', checkPath], { stdio: 'pipe' });
  syntaxOk = true;
} catch (e) {
  syntaxOk = false;
  console.error('\n❌ SYNTAX CHECK FAILED — refusing to overwrite.');
  console.error(e.stderr ? e.stderr.toString() : e.message);
  console.error('\nYour original file has NOT been modified. Investigate the diff above.');
  try { fs.unlinkSync(checkPath); } catch (_) {}
  process.exit(1);
}
try { fs.unlinkSync(checkPath); } catch (_) {}

// ── Write ──────────────────────────────────────────────────────────────────
fs.writeFileSync(targetPath, source, 'utf8');
console.log(`✅ Syntax check passed. Repaired file written: ${path.basename(targetPath)}`);

// ── Report ─────────────────────────────────────────────────────────────────
console.log('\n─── APPLIED ──────────────────────────────────────────────────────────');
for (const a of applied) console.log(`   ✅ [${a.id}] ${a.description}`);
if (skipped.length) {
  console.log('\n─── SKIPPED (already present) ────────────────────────────────────────');
  for (const s of skipped) console.log(`   ⏭️  [${s.id}] ${s.description} — ${s.reason}`);
}
console.log('──────────────────────────────────────────────────────────────────────\n');

// ── Next steps ─────────────────────────────────────────────────────────────
console.log('─── NEXT STEPS ───────────────────────────────────────────────────────');
console.log('  1. Redeploy Kleez-First-copy.js to Wispbyte.');
console.log('  2. Set DEBUG=true in the Wispbyte environment variables.');
console.log('  3. Restart the service and tail the logs.');
console.log('');
console.log('  You should see, in order, on every boot:');
console.log('     === BOOT PHASE 1: file parsed, trading system constructed ===');
console.log('     📡 Telegram long-polling started');
console.log('     === BOOT PHASE 2: polling loop started ===');
console.log('     🧠 KerasBrain ready: ...');
console.log('     === BOOT PHASE 3: initialize() resolved ===');
console.log('     ✅ ENHANCED QUANTUM SYSTEMS OPERATIONAL');
console.log('');
console.log('  If you see only PHASE 1, the process is dying inside initialize().');
console.log('  If you see all three but replies still fail, verify outbound HTTPS:');
console.log('     node -e "require(\'https\').get(\'https://api.telegram.org\',r=>console.log(r.statusCode)).on(\'error\',e=>console.error(e.code))"');
console.log('  A `404` response means egress works; `ENOTFOUND`/`ECONNREFUSED` means');
console.log('  Wispbyte is blocking outbound traffic and you need to contact support.');
console.log('');
console.log('  If commands still do not reply but PHASE 2/3 log cleanly, check:');
console.log('     node -e "console.log(process.env.TELEGRAM_TOKEN, process.env.TELEGRAM_CHAT_ID)"');
console.log('  and confirm ADMIN_USER_ID matches your Telegram user ID from @userinfobot.');
console.log('──────────────────────────────────────────────────────────────────────\n');

if (failed.length > 0) process.exit(2);
