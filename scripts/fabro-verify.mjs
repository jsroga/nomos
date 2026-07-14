#!/usr/bin/env node
/**
 * Fabro plan-workflow verify: scoped typecheck + lint for the target module,
 * then husky pre-commit parity (architecture, docs, full unit tests, production build).
 * Full-repo `tsc --noEmit` OOMs (~4GB+) in the plan Docker sandbox; module typecheck
 * uses an ephemeral tsconfig and ignores errors outside the verify scope.
 */
import { execSync, spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';

const NODE_OPTS = process.env.NODE_OPTIONS ?? '--max-old-space-size=6144';

function sh(cmd, opts = {}) {
  return execSync(cmd, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'], ...opts });
}

function filesFromPlan(planText) {
  const matches = [...planText.matchAll(/`((?:src\/)[^`]+\.(?:ts|tsx))`/g)].map((m) => m[1]);
  return [...new Set(matches)];
}

function moduleFromPlan() {
  if (!existsSync('PLAN.md')) return null;
  const plan = readFileSync('PLAN.md', 'utf8');
  // Special case: check for "Fabro module: src-root" at the top
  if (/Fabro module:\s*src-root/i.test(plan)) return 'src-root';
  const m = plan.match(/src\/domains\/([a-z0-9-]+)/);
  return m?.[1] ?? null;
}

const SRC_ROOT_DIRS = [
  'src/shared',
  'src/mcp',
  'src/trigger',
  'src/db',
  'src/components',
  'src/app',
  'evals',
  'content',
];

function isSrcRootPath(file) {
  if (file.startsWith('src/middleware') || file.startsWith('src/instrumentation')) {
    return true;
  }
  return SRC_ROOT_DIRS.some((d) => file === d || file.startsWith(`${d}/`));
}

function srcRootFileGlobs() {
  const files = [];
  for (const dir of SRC_ROOT_DIRS) {
    if (!existsSync(dir)) continue;
    const out = sh(
      `find "${dir}" -type f \\( -name '*.ts' -o -name '*.tsx' \\) 2>/dev/null || true`,
    );
    files.push(...out.split('\n').map((f) => f.trim()).filter(Boolean));
  }
  for (const f of ['src/middleware.ts', 'src/instrumentation.ts', 'src/instrumentation-client.ts']) {
    if (existsSync(f)) files.push(f);
  }
  return files;
}

function collectChangedTsFiles() {
  let base = '';
  try {
    base = sh('git merge-base HEAD origin/main 2>/dev/null || git merge-base HEAD main 2>/dev/null || true').trim();
  } catch {
    base = '';
  }
  const parts = [];
  if (base) {
    try {
      parts.push(sh(`git diff --name-only --diff-filter=ACMR ${base}...HEAD`));
    } catch {
      /* no commits vs base */
    }
  }
  try {
    parts.push(sh('git diff --name-only --diff-filter=ACMR HEAD'));
    parts.push(sh('git ls-files --others --exclude-standard'));
  } catch {
    /* empty repo */
  }
  return [
    ...new Set(
      parts
        .join('\n')
        .split('\n')
        .map((f) => f.trim())
        .filter((f) => /\.(ts|tsx)$/.test(f))
        // A file can be M/A in the committed range but renamed/deleted in the
        // uncommitted worktree — feeding the stale path crashes ESLint.
        .filter((f) => existsSync(f)),
    ),
  ];
}

function moduleFileGlobs(module) {
  if (module === 'src-root') return srcRootFileGlobs();
  const dirs = [`src/domains/${module}`, `src/app/api/${module}`];
  const files = [];
  for (const dir of dirs) {
    if (!existsSync(dir)) continue;
    const out = sh(
      `find "${dir}" -type f \\( -name '*.ts' -o -name '*.tsx' \\) 2>/dev/null || true`,
    );
    files.push(...out.split('\n').map((f) => f.trim()).filter(Boolean));
  }
  return files;
}

function runModuleUnitTests(module) {
  if (module === 'src-root') {
    const changed = collectChangedTsFiles().filter(
      (f) => f.includes('__tests__') || f.includes('.test.') || f.includes('.spec.'),
    );
    if (!changed.length) {
      console.log('unit-tests: no changed test files — skip');
      return;
    }
    console.log(`unit-tests: ${changed.length} changed test file(s)`);
    const result = spawnSync('npx', ['vitest', 'run', ...changed], {
      stdio: 'inherit',
      env: { ...process.env, NODE_OPTIONS: NODE_OPTS },
      maxBuffer: 64 * 1024 * 1024,
    });
    if (result.status !== 0) {
      console.error('unit-tests: FAILED');
      process.exit(result.status ?? 1);
    }
    console.log('unit-tests: OK');
    return;
  }

  const domainDir = `src/domains/${module}`;
  if (!existsSync(domainDir)) {
    console.log(`unit-tests: no domain dir ${domainDir} — skip`);
    return;
  }

  console.log(`unit-tests: vitest run ${domainDir}`);
  const result = spawnSync('npx', ['vitest', 'run', domainDir], {
    stdio: 'inherit',
    env: { ...process.env, NODE_OPTIONS: NODE_OPTS },
    maxBuffer: 64 * 1024 * 1024,
  });
  if (result.status !== 0) {
    console.error('unit-tests: FAILED');
    process.exit(result.status ?? 1);
  }
  console.log('unit-tests: OK');
}

function runEslint(files) {
  if (!files.length) {
    console.log('eslint: no files — skip');
    return;
  }
  console.log(`eslint: ${files.length} file(s)`);
  execSync(`npx eslint ${files.map((f) => JSON.stringify(f)).join(' ')}`, {
    stdio: 'inherit',
    env: { ...process.env, NODE_OPTIONS: NODE_OPTS },
  });
}

function filterErrors(output, allowedPaths) {
  const lines = output.split('\n');
  const errors = lines.filter((l) => /error TS\d+/.test(l));
  const inScope = errors.filter((l) =>
    allowedPaths.some((p) => l.includes(p)),
  );
  const outside = errors.filter(
    (l) => !allowedPaths.some((p) => l.includes(p)),
  );
  return { inScope, outside };
}

function modulePrefixes(module) {
  if (module === 'src-root') return SRC_ROOT_DIRS.map((d) => `${d}/`);
  return [`src/domains/${module}/`, `src/app/api/${module}/`];
}

function runModuleTypecheck(module, focusFiles) {
  if (module === 'src-root' && !focusFiles.length) {
    console.log('typecheck: no changed files — skip')
    return
  }

  const args = ['scripts/typecheck-scoped.mjs']
  if (focusFiles.length) {
    args.push('--files', ...focusFiles)
    console.log(`typecheck: ${focusFiles.length} changed file(s)`)
  } else {
    args.push('--module', module)
    console.log(`typecheck: module scope (${module})`)
  }

  const result = spawnSync('node', args, {
    stdio: 'inherit',
    env: { ...process.env, NODE_OPTIONS: NODE_OPTS },
    maxBuffer: 64 * 1024 * 1024,
  })

  if (result.status !== 0) {
    console.error('typecheck: FAILED')
    process.exit(result.status ?? 1)
  }
  console.log('typecheck: OK')
}

function runPreCommitParityGates() {
  console.log('\n=== pre-commit parity (matches .husky/pre-commit) ===');

  const gates = [
    ['architecture layout', 'node', ['scripts/check-architecture.mjs']],
    ['docs sync', 'node', ['scripts/check-docs-updated.mjs', '--working-tree']],
    ['unit tests', 'npm', ['run', 'test:unit']],
    ['production build', 'npm', ['run', 'build']],
  ];

  for (const [label, cmd, args] of gates) {
    console.log(`\n▶ pre-commit parity: ${label}`);
    const result = spawnSync(cmd, args, {
      stdio: 'inherit',
      env: { ...process.env, NODE_OPTIONS: NODE_OPTS },
      maxBuffer: 64 * 1024 * 1024,
    });
    if (result.status !== 0) {
      console.error(`pre-commit parity: ${label} FAILED — fix before handoff (same gates as git commit)`);
      process.exit(result.status ?? 1);
    }
  }

  console.log('pre-commit parity: all gates passed');
}

function main() {
  const module = moduleFromPlan();
  if (!module) {
    console.error('fabro-verify: could not detect module from PLAN.md — refusing full-repo tsc (OOM risk)');
    process.exit(1);
  }

  // Special handling for src-root: typecheck/lint changed files across all of src/
  if (module === 'src-root') {
    const changed = collectChangedTsFiles();
    const srcChanged = changed.filter((f) => f.startsWith('src/') || f.startsWith('tests/'));
    
    if (!srcChanged.length) {
      console.warn('fabro-verify (src-root): no changed TS files in src/ or tests/');
    }
    
    console.log(`fabro-verify (src-root): verifying ${srcChanged.length} changed file(s)`);
    runModuleTypecheck(module, srcChanged);
    runEslint(srcChanged);
    runModuleUnitTests(module);
    runPreCommitParityGates();
    console.log('fabro-verify: pass');
    return;
  }

  const changed = collectChangedTsFiles();
  const moduleFiles = moduleFileGlobs(module);
  const moduleChanged =
    module === 'src-root'
      ? changed.filter((f) => isSrcRootPath(f) || f.startsWith('tests/'))
      : changed.filter(
          (f) => f.includes(`/domains/${module}/`) || f.includes(`/api/${module}/`),
        );
  const planFiles = existsSync('PLAN.md')
    ? filesFromPlan(readFileSync('PLAN.md', 'utf8')).filter((f) =>
        module === 'src-root'
          ? isSrcRootPath(f) || f.startsWith('tests/')
          : f.includes(`/domains/${module}/`) || f.includes(`/api/${module}/`),
      )
    : [];
  const focus = moduleChanged.length ? moduleChanged : planFiles;

  const eslintTargets = focus.length ? focus : moduleFiles;

  if (!moduleFiles.length && !changed.length) {
    console.warn(`fabro-verify: no files found for module ${module}`);
  }

  runModuleTypecheck(module, focus);
  runEslint(eslintTargets.length ? eslintTargets : moduleFiles);
  runModuleUnitTests(module);
  runPreCommitParityGates();
  console.log('fabro-verify: pass');
}

main();
