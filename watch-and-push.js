/**
 * watch-and-push.js
 * Watches the plans/ folder. When a new .html file appears (or an existing one
 * is modified), waits 2 seconds then auto-commits and pushes to GitHub.
 *
 * Usage: node watch-and-push.js
 * Keep this terminal window open while using plan-builder.
 */

const fs   = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const PLANS_DIR = path.join(__dirname, 'plans');
const DEBOUNCE_MS = 2000; // wait 2s after last change before pushing

let timer = null;
const pending = new Set();

console.log('👀  Watching plans/ for changes… (keep this window open)');
console.log('    Auto-commits and pushes to GitHub when a plan file is saved.\n');

fs.watch(PLANS_DIR, (eventType, filename) => {
  if (!filename || !filename.endsWith('.html')) return;

  const fullPath = path.join(PLANS_DIR, filename);

  // Make sure the file actually exists (watch fires on delete too)
  if (!fs.existsSync(fullPath)) return;

  pending.add(filename);
  clearTimeout(timer);

  timer = setTimeout(() => {
    const files = [...pending];
    pending.clear();

    console.log(`\n📄  Detected: ${files.join(', ')}`);
    console.log('    Committing and pushing…');

    try {
      // Stage only the changed plan files
      execSync(`git add ${files.map(f => `plans/${f}`).join(' ')}`, { cwd: __dirname, stdio: 'inherit' });

      const msg = files.length === 1
        ? `Add plan: ${files[0]}`
        : `Add plans: ${files.join(', ')}`;

      execSync(`git commit -m "${msg}"`, { cwd: __dirname, stdio: 'inherit' });
      execSync('git push', { cwd: __dirname, stdio: 'inherit' });

      console.log(`\n✅  Pushed! Vercel will deploy in ~30s.`);
      console.log(`    URL: https://alfie-golf.com/plans/${files[0]}\n`);
    } catch (err) {
      console.error('\n❌  Git error:', err.message);
      console.error('    Check your git status and push manually if needed.\n');
    }
  }, DEBOUNCE_MS);
});
