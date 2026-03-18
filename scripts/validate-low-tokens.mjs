import { execSync } from 'child_process';

const steps = [
  { name: 'Gitleaks',       cmd: 'gitleaks detect -i .gitleaksignore' },
  { name: 'NPM Audit',      cmd: 'npm audit --audit-level=moderate' },
  { name: 'NPM Signatures', cmd: 'npm audit signatures' },
  { name: 'Semgrep',        cmd: 'semgrep scan --error --config p/security-audit --config p/typescript --config p/react --config p/owasp-top-ten' },
  { name: 'Typecheck',      cmd: 'npm run typecheck' },
  { name: 'Lint',           cmd: 'npm run lint' },
  { name: 'React Doctor',   cmd: 'npx -y react-doctor@latest . --yes --fail-on none --offline --score' },
  { name: 'Unit Tests',     cmd: 'npm run test:unit' },
  { name: 'Build',          cmd: 'npm run build' },
];

const PAD = Math.max(...steps.map(s => s.name.length));

function run(cmd) {
  try {
    execSync(cmd, { stdio: 'pipe' });
    return { ok: true };
  } catch (e) {
    return { ok: false, output: (e.stdout?.toString() || '') + (e.stderr?.toString() || '') };
  }
}

function fmt(ms) {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.floor(ms / 60000)}m${((ms % 60000) / 1000).toFixed(0)}s`;
}

console.log('\nValidation Pipeline\n' + '─'.repeat(40));

const results = [];
let allPassed = true;

for (const { name, cmd } of steps) {
  const start = Date.now();
  const { ok, output } = run(cmd);
  const elapsed = Date.now() - start;
  console.log(`  ${ok ? '✓' : '✗'} ${name.padEnd(PAD)}  ${fmt(elapsed)}`);
  results.push({ name, ok, output, elapsed });
  if (!ok) { allPassed = false; break; }
}

const total = results.reduce((s, r) => s + r.elapsed, 0);
console.log('─'.repeat(40));

if (allPassed) {
  console.log(`  ✓ All passed  ${fmt(total)}\n`);
} else {
  const failed = results.find(r => !r.ok);
  console.log(`  ✗ Failed at: ${failed.name}\n`);
  if (failed.output?.trim()) {
    console.log(failed.output.trim().split('\n').slice(0, 20).join('\n'));
    console.log('');
  }
  process.exit(1);
}
