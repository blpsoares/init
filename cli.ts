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
  divider,
  fmt,
  icons,
  Spinner,
  type InstallResult,
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

// ── Prerequisite check ────────────────────────────────────

async function checkPrerequisites(): Promise<boolean> {
  section('Checking Prerequisites');

  // Root user has implicit sudo — skip the check
  const isRoot = process.getuid?.() === 0;

  const checks = [
    { label: 'curl available',      cmd: 'which curl',                                                   required: true  },
    { label: 'internet connection', cmd: 'curl -s --max-time 5 https://github.com > /dev/null',          required: false },
    ...(isRoot
      ? []
      : [{ label: 'sudo access', cmd: 'sudo -n true 2>/dev/null || sudo -v 2>/dev/null', required: true }]
    ),
  ];

  let allRequired = true;

  for (const check of checks) {
    const spinner = new Spinner(`Checking ${check.label}…`);
    spinner.start();

    const ok = await checkCommand(check.cmd);

    if (ok) {
      spinner.succeed(fmt.dim(check.label) + '  ' + fmt.success('OK'));
    } else {
      if (check.required) {
        spinner.fail(fmt.dim(check.label) + '  ' + fmt.error('FAILED'));
        allRequired = false;
      } else {
        spinner.warn(fmt.dim(check.label) + '  ' + fmt.warn('UNAVAILABLE'));
      }
    }
  }

  return allRequired;
}

// ── Package installation ──────────────────────────────────

const isRoot = process.getuid?.() === 0;

async function installPackage(pkg: Package): Promise<'success' | 'skipped' | 'error'> {
  // Skip if already installed
  if (pkg.checkCommand) {
    const installed = await checkCommand(pkg.checkCommand);
    if (installed) return 'skipped';
  }

  // Root doesn't need sudo — strip it from commands
  const cmd = isRoot ? pkg.command.replace(/\bsudo\s+/g, '') : pkg.command;

  log(`Installing: ${pkg.name}`);
  log(`Command: ${cmd}`);

  const result = await runCommand(cmd, verbose);

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
        { name: `${fmt.bold('Interactive')}  ${fmt.dim('— Choose packages manually')}`,  value: 'interactive' },
        { name: `${fmt.bold('Full Install')} ${fmt.dim('— Install everything')}`,         value: 'all'         },
        { name: `${fmt.bold('Minimal')}      ${fmt.dim('— Just the essentials')}`,        value: 'minimal'     },
        { name: `${fmt.bold('Profile')}      ${fmt.dim('— Pick a developer profile')}`,   value: 'profile'     },
      ],
    },
  ]);

  if (mode === 'all') {
    return packages;
  }

  if (mode === 'minimal') {
    return packages.filter(p => p.essential);
  }

  if (mode === 'profile') {
    const { profile } = await inquirer.prompt<{ profile: string }>([
      {
        type:    'list',
        name:    'profile',
        message: 'Choose a developer profile:',
        choices: [
          { name: `Backend Developer  ${fmt.dim('(Zsh, Node.js, Bun, Docker, GitHub CLI)')}`,   value: 'backend'  },
          { name: `Frontend Developer ${fmt.dim('(Zsh, Starship, Node.js, Bun)')}`,             value: 'frontend' },
          { name: `DevOps Engineer    ${fmt.dim('(Docker, kubectl, GitHub CLI, GCloud)')}`,      value: 'devops'   },
          { name: `Data Scientist     ${fmt.dim('(Python3, GCloud, Build Essentials)')}`,        value: 'data'     },
        ],
      },
    ]);

    return packages.filter(p => p.profiles?.includes(profile as any));
  }

  // Interactive: flat list of all packages
  const choices = packages.map(pkg => ({
    name:    `${pkg.name.padEnd(22)} ${fmt.dim(pkg.description)}`,
    value:   pkg,
    checked: false,
  }));

  const { selected } = await inquirer.prompt<{ selected: Package[] }>([
    {
      type:     'checkbox',
      name:     'selected',
      message:  'Select tools to install:',
      choices,
      pageSize: 20,
    },
  ]);

  return selected;
}

// ── Preview (dry-run) ─────────────────────────────────────

async function previewPackages(pkgs: Package[]) {
  section('Packages to Install (dry-run)');

  const categories = [...new Set(pkgs.map(p => p.category))];

  for (const cat of categories) {
    console.log(`  ${fmt.bold(fmt.accent(cat))}`);
    for (const pkg of pkgs.filter(p => p.category === cat)) {
      const installed = pkg.checkCommand ? await checkCommand(pkg.checkCommand) : false;
      const tag = installed ? fmt.dim('(already installed)') : fmt.success('(will install)');
      console.log(`    ${icons.arrow} ${fmt.bold(pkg.name)} ${tag}`);
      console.log(`       ${fmt.dim(pkg.description)}`);
    }
    console.log();
  }

  console.log(`  ${icons.info} Run without ${fmt.info('--dry-run')} to perform the installation.`);
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
    console.log(`  ${icons.warn} ${fmt.warn('DRY RUN MODE')} — no packages will be installed\n`);
  }

  await printSystemInfo();

  if (!isDry) {
    const prereqsOk = await checkPrerequisites();
    if (!prereqsOk) {
      console.log();
      console.log(`  ${icons.error} ${fmt.error('Prerequisites not met — please ensure curl and sudo are available.')}`);
      console.log(`  ${fmt.dim(`Install log: ${logFile}`)}`);
      process.exit(1);
    }
  }

  // Package selection
  let selected: Package[];  // may be extended by dependency resolution below

  if (all) {
    selected = packages;
    section('Full Installation');
    console.log(`  ${icons.info} Installing all ${fmt.bold(String(packages.length))} packages.`);
  } else {
    selected = await selectPackages();
  }

  if (selected.length === 0) {
    console.log();
    console.log(`  ${icons.info} ${fmt.info('No packages selected. Exiting.')}`);
    process.exit(0);
  }

  // Resolve dependencies: inject missing required packages before their dependents
  const resolved: Package[] = [];
  for (const pkg of selected) {
    if (pkg.dependencies) {
      for (const depName of pkg.dependencies) {
        const dep = packages.find(p => p.name === depName);
        if (dep && !resolved.find(p => p.name === dep.name) && !selected.find(p => p.name === dep.name)) {
          console.log(`  ${icons.info} ${fmt.warn(pkg.name)} requires ${fmt.bold(dep.name)} — adding automatically`);
          resolved.push(dep);
        }
      }
    }
    if (!resolved.find(p => p.name === pkg.name)) {
      resolved.push(pkg);
    }
  }
  selected = resolved;

  // Dry-run preview
  if (isDry) {
    await previewPackages(selected);
    process.exit(0);
  }

  // Confirmation
  section('Review');

  const categories = [...new Set(selected.map(p => p.category))];
  for (const cat of categories) {
    console.log(`  ${fmt.bold(fmt.accent(cat))}`);
    for (const pkg of selected.filter(p => p.category === cat)) {
      console.log(`    ${icons.arrow} ${pkg.name}  ${fmt.dim(pkg.description)}`);
    }
  }

  console.log();

  const { confirmed } = await inquirer.prompt<{ confirmed: boolean }>([
    {
      type:    'confirm',
      name:    'confirmed',
      message: `Install ${fmt.bold(String(selected.length))} package(s)?`,
      default: true,
    },
  ]);

  if (!confirmed) {
    console.log(`\n  ${icons.info} ${fmt.info('Installation cancelled.')}`);
    process.exit(0);
  }

  // Installation
  section('Installing');

  log(`=== Session started ===`);
  log(`Packages: ${selected.map(p => p.name).join(', ')}`);

  const results: InstallResult[] = [];

  for (const pkg of selected) {
    const spinner = new Spinner(`${fmt.bold(pkg.name)}  ${fmt.dim(pkg.description)}`);

    if (!verbose) spinner.start();
    else console.log(`\n  ${icons.arrow} ${fmt.bold(pkg.name)}`);

    try {
      const status = await installPackage(pkg);

      if (status === 'success') {
        spinner.succeed(`${fmt.bold(pkg.name)}  ${fmt.success('installed')}`);
        results.push({ name: pkg.name, status: 'success' });

        if (pkg.postInstall) {
          console.log(`    ${icons.info} ${fmt.dim(pkg.postInstall)}`);
        }
      } else if (status === 'skipped') {
        spinner.skip(`${fmt.bold(pkg.name)}  ${fmt.dim('already installed')}`);
        results.push({ name: pkg.name, status: 'skipped' });
      } else {
        spinner.fail(`${fmt.bold(pkg.name)}  ${fmt.error('failed')}`);
        results.push({ name: pkg.name, status: 'error', message: 'Non-zero exit code' });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      spinner.fail(`${fmt.bold(pkg.name)}  ${fmt.error(msg)}`);
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
    console.log(`  ${icons.warn} ${fmt.warn('Restart your terminal (or run source ~/.bashrc) to apply all changes.')}`);
  }

  console.log(`  ${icons.info} ${fmt.dim(`Full log: ${logFile}`)}`);
  console.log();

  log('=== Session ended ===');
}

main().catch(err => {
  const msg = err instanceof Error ? err.message : String(err);
  console.error(`\n  ${icons.error} ${fmt.error('Fatal: ' + msg)}\n`);
  process.exit(1);
});
