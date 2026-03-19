import { spawn } from 'child_process';

const steps = [
  { name: 'Gitleaks',       cmd: 'gitleaks detect -i .gitleaksignore' },
  { name: 'NPM Audit',      cmd: 'npm audit --audit-level=moderate' },
  { name: 'NPM Signatures', cmd: 'npm audit signatures' },
  { name: 'Semgrep',        cmd: 'semgrep scan --error --config p/security-audit --config p/typescript --config p/react --config p/owasp-top-ten' },
  { name: 'Typecheck',      cmd: 'npm run typecheck' },
  { name: 'Lint',           cmd: 'npm run lint' },
  { name: 'React Doctor',   cmd: 'npx -y react-doctor@latest . --project hotel-inventory --fail-on error --offline' },
  { name: 'Unit Tests',     cmd: 'npm run test:unit' },
  { name: 'Build',          cmd: 'npm run build' },
];

const c = {
  reset: '\x1b[0m', bold: '\x1b[1m', dim: '\x1b[2m',
  green: '\x1b[32m', red: '\x1b[31m', blue: '\x1b[34m', cyan: '\x1b[36m',
};
const sym = { pass: '✓', fail: '✗', arrow: '→', line: '─' };

function formatTime(ms) {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(2)}s`;
  return `${Math.floor(ms / 60000)}m ${((ms % 60000) / 1000).toFixed(0)}s`;
}

function runCommand(cmd) {
  return new Promise((resolve) => {
    const [command, ...args] = cmd.split(' ');
    const proc = spawn(command, args, {
      shell: true, stdio: 'pipe', env: { ...process.env, FORCE_COLOR: '1' },
    });
    let output = '';
    proc.stdout.on('data', (data) => {
      const text = data.toString();
      output += text;
      process.stdout.write(`  ${c.dim}│${c.reset} ${text.replace(/\n/g, `\n  ${c.dim}│${c.reset} `)}`);
    });
    proc.stderr.on('data', (data) => {
      const text = data.toString();
      output += text;
      process.stdout.write(`  ${c.dim}│${c.reset} ${text.replace(/\n/g, `\n  ${c.dim}│${c.reset} `)}`);
    });
    proc.on('close', (code) => resolve({ success: code === 0, output }));
  });
}

function header(text) {
  const line = sym.line.repeat(50);
  console.log(`\n${c.blue}${line}${c.reset}`);
  console.log(`${c.bold}${c.blue}  ${text}${c.reset}`);
  console.log(`${c.blue}${line}${c.reset}\n`);
}

function stepHeader(num, total, name, cmd) {
  console.log(`${c.cyan}${c.bold}[${num}/${total}]${c.reset} ${c.bold}${name}${c.reset}`);
  console.log(`  ${c.dim}${sym.arrow} ${cmd}${c.reset}`);
  console.log(`  ${c.dim}│${c.reset}`);
}

function stepResult(success, duration) {
  console.log(`  ${c.dim}│${c.reset}`);
  if (success) {
    console.log(`  ${c.dim}└─${c.reset} ${c.green}${c.bold}${sym.pass} PASSED${c.reset} ${c.dim}(${formatTime(duration)})${c.reset}\n`);
  } else {
    console.log(`  ${c.dim}└─${c.reset} ${c.red}${c.bold}${sym.fail} FAILED${c.reset} ${c.dim}(${formatTime(duration)})${c.reset}\n`);
  }
}

async function main() {
  console.clear();
  header('VALIDATION PIPELINE');
  console.log(`${c.dim}Starting ${steps.length} validation steps...${c.reset}\n`);
  const results = [];
  const totalStart = Date.now();

  for (let i = 0; i < steps.length; i++) {
    const { name, cmd } = steps[i];
    stepHeader(i + 1, steps.length, name, cmd);
    const start = Date.now();
    const { success } = await runCommand(cmd);
    const duration = Date.now() - start;
    stepResult(success, duration);
    results.push({ name, success, duration });
    if (!success) {
      console.log(`${c.red}${sym.line.repeat(50)}${c.reset}`);
      console.log(`${c.red}${c.bold}  ${sym.fail} PIPELINE FAILED AT: ${name}${c.reset}`);
      console.log(`${c.red}${sym.line.repeat(50)}${c.reset}\n`);
      process.exit(1);
    }
  }

  const totalTime = Date.now() - totalStart;
  console.log(`${c.green}${sym.line.repeat(50)}${c.reset}`);
  console.log(`${c.green}${c.bold}  ${sym.pass} ALL CHECKS PASSED${c.reset}`);
  console.log(`${c.green}${sym.line.repeat(50)}${c.reset}\n`);
  console.log(`${c.bold}Summary:${c.reset}\n`);
  const maxNameLen = Math.max(...results.map(r => r.name.length));
  for (const r of results) {
    const icon = r.success ? `${c.green}${sym.pass}${c.reset}` : `${c.red}${sym.fail}${c.reset}`;
    console.log(`  ${icon} ${r.name.padEnd(maxNameLen)}  ${c.dim}${formatTime(r.duration).padStart(8)}${c.reset}`);
  }
  console.log(`\n  ${c.bold}Total time: ${formatTime(totalTime)}${c.reset}\n`);
}

main();
