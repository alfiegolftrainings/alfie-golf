// check-c01-sessions.js
// Run: node check-c01-sessions.js
// Queries the Alfie Worker for all C01 golfer sessions and prints a summary.

const WORKER = 'https://alfie-api.alfie-golf.workers.dev/';

const C01_SLUGS = [
  'adam-c01-22',
  'adam',
  'adi-dobson',
  'alex',
  'apollos-gause',
  'charlie',
  'colin',
  'daniel-lewis',
  'danny',
  'dave',
  'devin-willis',
  'dickie-chute',
  'dylan',
  'ed',
  'gonzalo',
  'jd-hankins',
  'jim',
  'joe',
  'joel-sati',
  'joey',
  'jon',
  'jonathan-pile',
  'joon-d',
  'kris',
  'lawrence',
  'leroy-kapping',
  'lester',
  'mark-minervini',
  'matteo',
  'niall',
  'rachel-smith',
  'rob-reid',
  'rob',
  'ross',
  'roy-johns',
  'russ',
  'tanner-meyer',
  'tom',
  'tyler-dahnke',
  'will',
];

async function getResults(slug) {
  const url = `${WORKER}?action=getGolferResults&slug=${slug}`;
  try {
    const res = await fetch(url);
    const data = await res.json();
    return data.sessions || data.results || data || [];
  } catch (e) {
    return { error: e.message };
  }
}

async function main() {
  console.log(`Checking ${C01_SLUGS.length} C01 golfers...\n`);

  const submitted = [];
  const noSubmission = [];
  const errors = [];

  for (const slug of C01_SLUGS) {
    const results = await getResults(slug);
    if (results.error) {
      errors.push({ slug, error: results.error });
    } else if (Array.isArray(results) && results.length > 0) {
      submitted.push({ slug, sessions: results.length, latest: results[results.length - 1] });
    } else {
      noSubmission.push(slug);
    }
  }

  console.log(`✅ SUBMITTED RESULTS (${submitted.length}):`);
  submitted.forEach(g => {
    const latest = g.latest;
    const date = latest?.date || latest?.submitted_at || '?';
    console.log(`  • ${g.slug} — ${g.sessions} session(s), last: ${date}`);
  });

  console.log(`\n⏳ NO SUBMISSIONS YET (${noSubmission.length}):`);
  noSubmission.forEach(slug => console.log(`  • ${slug}`));

  if (errors.length > 0) {
    console.log(`\n⚠️  ERRORS (${errors.length}):`);
    errors.forEach(e => console.log(`  • ${e.slug}: ${e.error}`));
  }

  console.log(`\nSUMMARY: ${submitted.length} / ${C01_SLUGS.length} golfers have submitted at least one session.`);
}

main();
