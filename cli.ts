#!/usr/bin/env bun
// ─────────────────────────────────────────────────────────
//  DEV SETUP CLI — v2.0.0
//  Interactive installer for development environment tools
// ─────────────────────────────────────────────────────────

import inquirer from 'inquirer';
import { mkdirSync, appendFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  printBanner,
  printSystemInfo,
  printSummary,
  printHelp,
  section,
  statusLine,
  box,
  fmt,
  icons,
  stripAnsi,
  Spinner,
  type InstallResult,
  ansi,
} from './src/ui';

import { runCommand, checkCommand } from './src/runner';
import packages, { type Package } from './src/tools/packages';

// ── CLI argument parsing ──────────────────────────────────

const args    = process.argv.slice(2);
const isDry   = args.includes('--dry-run')  || args.includes('-d');
const verbose = args.includes('--verbose')  || args.includes('-v');
const all     = args.includes('--all')      || args.includes('-a');
const help    = args.includes('--help')     || args.includes('-h');

// ── Log file setup ────────────────────────────────────────

const logDir  = join(process.env.HOME ?? '/tmp', '.devsetup');
const logFile = join(logDir, 'install.log');

try { mkdirSync(logDir, { recursive: true }); } catch { /* ignore */ }

function log(msg: string) {
  try {
    appendFileSync(logFile, `[${new Date().toISOString()}] ${msg}\n`);
  } catch { /* ignore */ }
}

// ── Sudo helpers ──────────────────────────────────────────

/** Remove all `sudo ` occurrences from a shell command string. */
function stripSudo(cmd: string): string {
  return cmd.replace(/\bsudo\s+/g, '');
}

// ── Prerequisite check ────────────────────────────────────

interface PrereqResult {
  ok: boolean;
  useSudo: boolean;
}

async function checkPrerequisites(): Promise<PrereqResult> {
  section('Checking Prerequisites');

  // ── curl ──
  const curlSpin = new Spinner('Checking curl…');
  curlSpin.start();
  const hasCurl = await checkCommand('which curl');
  if (hasCurl) {
    curlSpin.succeed('curl', 'OK');
  } else {
    curlSpin.fail('curl', 'not found — install curl first');
    return { ok: false, useSudo: false };
  }

  // ── internet ──
  const netSpin = new Spinner('Checking internet connection…');
  netSpin.start();
  const hasNet = await checkCommand('curl -s --max-time 5 https://github.com > /dev/null');
  if (hasNet) {
    netSpin.succeed('internet', 'OK');
  } else {
    netSpin.warn('internet unreachable — some installs may fail');
  }

  // ── root / sudo ──
  const isRoot = await checkCommand('[ "$(id -u)" = "0" ]');

  if (isRoot) {
    statusLine(`${icons.success}  ${fmt.bold('privileges')}`, fmt.success('running as root — sudo not needed'));
    return { ok: true, useSudo: false };
  }

  // Ask user about sudo
  console.log();
  const { wantSudo } = await inquirer.prompt<{ wantSudo: boolean }>([
    {
      type:    'confirm',
      name:    'wantSudo',
      message: 'Some packages require sudo — do you have sudo access?',
      default: true,
    },
  ]);

  if (!wantSudo) {
    statusLine(`${icons.warn}  ${fmt.bold('sudo')}`, fmt.warn('disabled — commands will run without sudo'));
    return { ok: true, useSudo: false };
  }

  // Try passwordless sudo first
  const noPass = await checkCommand('sudo -n true 2>/dev/null');
  if (noPass) {
    statusLine(`${icons.success}  ${fmt.bold('sudo')}`, fmt.success('OK (no password needed)'));
    return { ok: true, useSudo: true };
  }

  // Needs password — must NOT use a spinner here (TTY conflict)
  console.log(`${ansi.dim}  Enter your sudo password to cache credentials:${ansi.reset}`);
  const sudoResult = await runCommand('sudo -v', true /* inherit stdio */);

  if (sudoResult.exitCode !== 0) {
    statusLine(`${icons.error}  ${fmt.bold('sudo')}`, fmt.error('authentication failed'));
    return { ok: false, useSudo: false };
  }

  statusLine(`${icons.success}  ${fmt.bold('sudo')}`, fmt.success('OK'));
  return { ok: true, useSudo: true };
}

// ── Package installation ──────────────────────────────────

async function installPackage(
  pkg: Package,
  useSudo: boolean,
): Promise<'success' | 'skipped' | 'error'> {
  if (pkg.checkCommand && await checkCommand(pkg.checkCommand)) return 'skipped';

  const command = useSudo ? pkg.command : stripSudo(pkg.command);

  log(`Installing: ${pkg.name}`);
  log(`Command: ${command}`);

  const result = await runCommand(command, verbose);

  log(`Exit code: ${result.exitCode}`);
  if (result.stderr) log(`stderr: ${result.stderr.slice(0, 500)}`);

  return result.exitCode === 0 ? 'success' : 'error';
}

// ── Package selection ─────────────────────────────────────

async function selectPackages(): Promise<Package[]> {
  section('Installation Mode');

  const { mode } = await inquirer.prompt<{ mode: string }>([
    {
      type:    'list',
      name:    'mode',
      message: 'How would you like to proceed?',
      choices: [
        { name: `${fmt.bold('Interactive')}   ${fmt.dim('— choose packages from a list')}`,  value: 'interactive' },
        { name: `${fmt.bold('Full Install')}  ${fmt.dim('— install every available package')}`, value: 'all'     },
        { name: `${fmt.bold('Minimal')}       ${fmt.dim('— just the essentials')}`,            value: 'minimal'  },
        { name: `${fmt.bold('Profile')}       ${fmt.dim('— pick a developer role')}`,          value: 'profile'  },
      ],
    },
  ]);

  if (mode === 'all')     return packages;
  if (mode === 'minimal') return packages.filter(p => p.essential);

  if (mode === 'profile') {
    const { profile } = await inquirer.prompt<{ profile: string }>([
      {
        type:    'list',
        name:    'profile',
        message: 'Choose a developer profile:',
        choices: [
          { name: `Backend Developer   ${fmt.dim('Node.js · Bun · Docker · GitHub CLI · Zsh')}`,  value: 'backend'  },
          { name: `Frontend Developer  ${fmt.dim('Node.js · Bun · Starship · Zsh')}`,             value: 'frontend' },
          { name: `DevOps Engineer     ${fmt.dim('Docker · kubectl · GitHub CLI · GCloud')}`,      value: 'devops'   },
          { name: `Data Scientist      ${fmt.dim('Python 3 · GCloud · Build Essentials')}`,        value: 'data'     },
        ],
      },
    ]);
    return packages.filter(p => p.profiles?.includes(profile as any));
  }

  // Interactive: group packages by category, none pre-selected
  const categories = [...new Set(packages.map(p => p.category))];
  const choices: any[] = [];

  for (const cat of categories) {
    choices.push(new (inquirer as any).Separator(
      `\n  ${ansi.brightBlue}── ${cat} ──${ansi.reset}`
    ));
    for (const pkg of packages.filter(p => p.category === cat)) {
      const nameCol = pkg.name.padEnd(20);
      choices.push({
        name:    `  ${fmt.bold(nameCol)}  ${fmt.dim(pkg.description)}`,
        value:   pkg,
        checked: false,  // ← user decides everything, no pre-selection
      });
    }
  }

  const { selected } = await inquirer.prompt<{ selected: Package[] }>([
    {
      type:     'checkbox',
      name:     'selected',
      message:  'Select packages to install (space to toggle, enter to confirm):',
      choices,
      pageSize: 20,
    },
  ]);

  return selected;
}

// ── Preview (dry-run) ─────────────────────────────────────

// INNER = 56. Content layout inside box.aligned(left, right):
//   left_vis + gap(≥1) + right_vis ≤ INNER
//   left = "    ›  Name  desc"  → prefix_vis = 4+1+2+nameLen+2 = 9+nameLen
//   maxDesc = INNER - 10 - nameLen - tagLen  (10 = prefix 9 + min-gap 1)
function previewDescLen(nameLen: number, tagLen: number): number {
  return Math.max(0, 56 - 10 - nameLen - tagLen);
}

// INNER = 56. Content for box.line (no right-side alignment):
//   "    ›  Name  desc" → prefix_vis = 9+nameLen, maxDesc = INNER - 9 - nameLen
function reviewDescLen(nameLen: number): number {
  return Math.max(0, 56 - 9 - nameLen);
}

async function previewPackages(pkgs: Package[]): Promise<void> {
  const categories = [...new Set(pkgs.map(p => p.category))];

  console.log(box.top('Packages to Install (dry-run)'));
  console.log(box.empty());

  for (const cat of categories) {
    console.log(box.line(`  ${fmt.bold(fmt.accent(cat))}`));
    for (const pkg of pkgs.filter(p => p.category === cat)) {
      const installed  = pkg.checkCommand ? await checkCommand(pkg.checkCommand) : false;
      const tag        = installed ? fmt.muted('already installed') : fmt.success('will install');
      const tagLen     = installed ? 17 : 12;
      const nameLen    = stripAnsi(pkg.name).length;
      const desc       = pkg.description.slice(0, previewDescLen(nameLen, tagLen));
      console.log(box.aligned(
        `    ${icons.arrow}  ${fmt.bold(pkg.name)}  ${fmt.dim(desc)}`,
        tag,
      ));
    }
    console.log(box.empty());
  }

  console.log(box.line(`  ${icons.info}  Run without ${fmt.info('--dry-run')} to install.`));
  console.log(box.bottom());
  console.log();
}

// ── Review box ────────────────────────────────────────────

function showReview(selected: Package[]): void {
  const categories = [...new Set(selected.map(p => p.category))];

  console.log(box.top('Review'));
  console.log(box.empty());

  for (const cat of categories) {
    console.log(box.line(`  ${fmt.bold(fmt.accent(cat))}`));
    for (const pkg of selected.filter(p => p.category === cat)) {
      const nameLen = stripAnsi(pkg.name).length;
      const desc    = pkg.description.slice(0, reviewDescLen(nameLen));
      console.log(box.line(`    ${icons.arrow}  ${fmt.bold(pkg.name)}  ${fmt.dim(desc)}`));
    }
    console.log(box.empty());
  }

  console.log(box.bottom());
  console.log();
}

// ── Main ──────────────────────────────────────────────────

async function main() {
  if (help) {
    printHelp();
    process.exit(0);
  }

  printBanner();

  if (isDry) {
    console.log(`  ${icons.warn}  ${fmt.warn('DRY RUN MODE')} — no packages will be installed\n`);
  }

  await printSystemInfo();

  let useSudo = true;

  if (!isDry) {
    const prereqs = await checkPrerequisites();
    if (!prereqs.ok) {
      console.log();
      console.log(`  ${icons.error}  ${fmt.error('Prerequisites not met. Aborting.')}`);
      console.log(`  ${fmt.dim(`Log: ${logFile}`)}`);
      process.exit(1);
    }
    useSudo = prereqs.useSudo;
  }

  // Package selection
  let selected: Package[];

  if (all) {
    selected = packages;
    section('Full Installation');
    console.log(`  ${icons.info}  Installing all ${fmt.bold(String(packages.length))} available packages.\n`);
  } else {
    selected = await selectPackages();
  }

  if (selected.length === 0) {
    console.log();
    console.log(`  ${icons.info}  ${fmt.info('No packages selected. Exiting.')}`);
    process.exit(0);
  }

  if (isDry) {
    await previewPackages(selected);
    process.exit(0);
  }

  // Show review and confirm
  showReview(selected);

  const { confirmed } = await inquirer.prompt<{ confirmed: boolean }>([
    {
      type:    'confirm',
      name:    'confirmed',
      message: `Proceed with ${fmt.bold(String(selected.length))} package(s)?`,
      default: true,
    },
  ]);

  if (!confirmed) {
    console.log(`\n  ${icons.info}  ${fmt.info('Installation cancelled.')}`);
    process.exit(0);
  }

  // Install
  section('Installing');

  log('=== Session started ===');
  log(`Packages: ${selected.map(p => p.name).join(', ')}`);

  const results: InstallResult[] = [];

  for (const pkg of selected) {
    const spinner = new Spinner(
      `${fmt.bold(pkg.name)}  ${fmt.dim(pkg.description)}`
    );

    if (!verbose) spinner.start();
    else          console.log(`\n  ${icons.arrow}  ${fmt.bold(pkg.name)}`);

    try {
      const status = await installPackage(pkg, useSudo);

      if (status === 'success') {
        spinner.succeed(pkg.name);
        results.push({ name: pkg.name, status: 'success' });
        if (pkg.postInstall) {
          console.log(`     ${icons.info}  ${fmt.dim(pkg.postInstall)}`);
        }
      } else if (status === 'skipped') {
        spinner.skip(pkg.name);
        results.push({ name: pkg.name, status: 'skipped' });
      } else {
        spinner.fail(pkg.name);
        results.push({ name: pkg.name, status: 'error' });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      spinner.fail(pkg.name, `error: ${msg.slice(0, 30)}`);
      results.push({ name: pkg.name, status: 'error', message: msg });
      log(`Exception for ${pkg.name}: ${msg}`);
    }
  }

  // Summary
  printSummary(results);

  const needsReload = selected.some(
    p => p.requiresReload && results.find(r => r.name === p.name)?.status === 'success'
  );

  console.log();
  if (needsReload) {
    console.log(`  ${icons.warn}  ${fmt.warn('Restart your terminal or run: source ~/.bashrc')}`);
  }
  console.log(`  ${icons.info}  ${fmt.dim(`Full log: ${logFile}`)}`);
  console.log();

  log('=== Session ended ===');
}

main().catch(err => {
  const msg = err instanceof Error ? err.message : String(err);
  console.error(`\n  ${icons.error}  ${fmt.error('Fatal: ' + msg)}\n`);
  process.exit(1);
});
