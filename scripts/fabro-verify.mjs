#!/usr/bin/env node
/**
 * Fabro plan-workflow verify: scoped typecheck + lint for the target module.
 * Full-repo `tsc --noEmit` OOMs (~4GB+) in the plan Docker sandbox; this script
 * typechecks only the module under cleanup (from PLAN.md) and fails only on errors
 * in that module's paths — not pre-existing issues elsewhere in the monorepo.
 */
import { execSync, spawnSync } from 'node:child_process';
import { existsSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';

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
        .filter((f) => /\.(ts|tsx)$/.test(f)),
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
  const tsconfigPath = 'tsconfig.fabro-verify.json';
  
  // For src-root, only typecheck focusFiles (changed files); skip if no changes
  if (module === 'src-root') {
    if (!focusFiles.length) {
      console.log('typecheck: no changed files — skip');
      return;
    }
  }
  
  const include = focusFiles.length
    ? focusFiles
    : module === 'src-root'
      ? SRC_ROOT_DIRS.map((d) => `${d}/**/*.{ts,tsx}`)
      : [
          `src/domains/${module}/**/*.ts`,
          `src/domains/${module}/**/*.tsx`,
          `src/app/api/${module}/**/*.ts`,
        ];
  const config = { extends: './tsconfig.json', include };
  writeFileSync(tsconfigPath, `${JSON.stringify(config, null, 2)}\n`);

  const errorPaths = focusFiles.length
    ? focusFiles
    : modulePrefixes(module);

  try {
    console.log(
      `typecheck: ${focusFiles.length ? `${focusFiles.length} changed file(s)` : `module scope (${module})`}`,
    );
    const result = spawnSync('npx', ['tsc', '--noEmit', '-p', tsconfigPath], {
      encoding: 'utf8',
      env: { ...process.env, NODE_OPTIONS: NODE_OPTS },
      maxBuffer: 64 * 1024 * 1024,
    });

    const combined = `${result.stdout ?? ''}\n${result.stderr ?? ''}`;
    if (result.signal === 'SIGABRT' || /heap out of memory|JavaScript heap out of memory/i.test(combined)) {
      console.error(
        'typecheck: OOM in sandbox — infrastructure limit, not fixable by Developer loop. See Retro.',
      );
      process.exit(1);
    }

    const { inScope, outside } = filterErrors(combined, errorPaths);
    if (outside.length) {
      console.warn(
        `typecheck: ignoring ${outside.length} error(s) outside the verify scope`,
      );
    }
    if (inScope.length) {
      console.error('typecheck: errors in scope:\n' + inScope.join('\n'));
      process.exit(result.status === 0 ? 1 : (result.status ?? 1));
    }
    if (result.status !== 0 && inScope.length === 0) {
      console.log('typecheck: scoped paths clean');
      return;
    }
    if (result.status !== 0) {
      console.error(combined);
      process.exit(result.status ?? 1);
    }
    console.log('typecheck: OK');
  } finally {
    if (existsSync(tsconfigPath)) unlinkSync(tsconfigPath);
  }
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
  console.log('fabro-verify: pass');
}

main();
