import { existsSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const indexPath = new URL('../funding/index.json', import.meta.url);
const index = JSON.parse(readFileSync(indexPath, 'utf8'));
const failures = [];
const programs = Array.isArray(index.programs) ? index.programs : [];

if (programs.length === 0) failures.push('funding index has no programmes; completeness cannot be claimed');

for (const [i, program] of programs.entries()) {
  const prefix = `program[${i}]`;
  if (!program.id || !program.title || !program.authority) failures.push(`${prefix} missing id/title/authority`);
  if (!/^https:\/\//.test(program.sourceUrl ?? '')) failures.push(`${prefix} sourceUrl must be HTTPS`);
  if (!program.lastVerifiedAt) failures.push(`${prefix} missing lastVerifiedAt`);
  if (!Array.isArray(program.documents) || program.documents.length === 0) failures.push(`${prefix} has no evidence documents`);
  for (const [j, document] of (program.documents ?? []).entries()) {
    const path = document.path;
    if (!path || !existsSync(path)) failures.push(`${prefix}.documents[${j}] missing local PDF: ${path ?? '(none)'}`);
    if (!/^[a-f0-9]{64}$/.test(document.sha256 ?? '')) failures.push(`${prefix}.documents[${j}] missing SHA-256`);
    if (path && existsSync(path)) {
      const actual = createHash('sha256').update(readFileSync(path)).digest('hex');
      if (actual !== document.sha256) failures.push(`${prefix}.documents[${j}] SHA-256 mismatch`);
    }
  }
  if (!program.hindsightNotePath || !existsSync(program.hindsightNotePath)) failures.push(`${prefix} missing Hindsight note`);
}

if (failures.length) {
  console.error('FUNDING_QA_GATE=FAIL');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log(`FUNDING_QA_GATE=PASS programmes=${programs.length}`);
}
