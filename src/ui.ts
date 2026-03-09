// ─────────────────────────────────────────────────────────
//  UI Utilities — Boxes, Spinner, Banner, Helpers
// ─────────────────────────────────────────────────────────

// ANSI codes
export const ansi = {
  reset: '\x1b[0m', bold: '\x1b[1m', dim: '\x1b[2m',
  red: '\x1b[31m', green: '\x1b[32m', yellow: '\x1b[33m',
  blue: '\x1b[34m', magenta: '\x1b[35m', cyan: '\x1b[36m',
  brightRed: '\x1b[91m', brightGreen: '\x1b[92m', brightYellow: '\x1b[93m',
  brightBlue: '\x1b[94m', brightMagenta: '\x1b[95m', brightCyan: '\x1b[96m',
  brightWhite: '\x1b[97m',
};

export const fmt = {
  success: (s: string) => `${ansi.brightGreen}${s}${ansi.reset}`,
  error:   (s: string) => `${ansi.brightRed}${s}${ansi.reset}`,
  warn:    (s: string) => `${ansi.brightYellow}${s}${ansi.reset}`,
  info:    (s: string) => `${ansi.brightCyan}${s}${ansi.reset}`,
  dim:     (s: string) => `${ansi.dim}${s}${ansi.reset}`,
  bold:    (s: string) => `${ansi.bold}${s}${ansi.reset}`,
  primary: (s: string) => `${ansi.brightBlue}${s}${ansi.reset}`,
  accent:  (s: string) => `${ansi.brightMagenta}${s}${ansi.reset}`,
  muted:   (s: string) => `${ansi.dim}${ansi.brightWhite}${s}${ansi.reset}`,
};

export const icons = {
  success: fmt.success('✔'),
  error:   fmt.error('✘'),
  warn:    fmt.warn('!'),
  info:    fmt.info('i'),
  arrow:   fmt.primary('›'),
  skip:    `${ansi.dim}○${ansi.reset}`,
  dot:     `${ansi.dim}•${ansi.reset}`,
};

const FRAMES = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];

// ── Box system ────────────────────────────────────────────
//
// Layout (all lines are 62 chars wide on screen):
//   IND(2) + │(1) + space(1) + INNER(56) + space(1) + │(1) = 62
//
const INNER = 56;  // visible content width inside box
const IND   = '  '; // left indent for every output line
const BC    = ansi.brightBlue;
const R     = ansi.reset;
const IBW   = INNER + 2; // border fill width = 58

/** Strip ANSI escape codes to measure visible length. */
export function stripAnsi(s: string): string {
  return s.replace(/\x1b\[[0-9;]*[mGKJHFAB]/g, '');
}

function mkBorder(l: string, f: string, r: string, title?: string): string {
  if (!title) return `${IND}${BC}${l}${f.repeat(IBW)}${r}${R}`;
  const seg = `${f} ${title} `;
  return `${IND}${BC}${l}${seg}${f.repeat(Math.max(0, IBW - seg.length))}${r}${R}`;
}

export const box = {
  top:    (title?: string) => mkBorder('┌', '─', '┐', title),
  mid:    (title?: string) => mkBorder('├', '─', '┤', title),
  bottom: ()               => mkBorder('└', '─', '┘'),
  empty:  ()               => `${IND}${BC}│${R}${' '.repeat(IBW)}${BC}│${R}`,

  /** Content line: auto-pads to INNER width. */
  line(content: string): string {
    const pad = Math.max(0, INNER - stripAnsi(content).length);
    return `${IND}${BC}│${R} ${content}${' '.repeat(pad)} ${BC}│${R}`;
  },

  /** Two-sided aligned line: left justified, right justified inside box. */
  aligned(left: string, right: string): string {
    const gap = Math.max(1, INNER - stripAnsi(left).length - stripAnsi(right).length);
    return this.line(`${left}${' '.repeat(gap)}${right}`);
  },
};

// ── Status lines (outside box, same 2-space indent) ───────
//
// Width = IBW = 58 visible chars (matches box content area)
//

/** Right-aligned status line printed outside a box. */
export function statusLine(left: string, right: string): void {
  const gap = Math.max(2, IBW - stripAnsi(left).length - stripAnsi(right).length);
  console.log(`${IND}${left}${' '.repeat(gap)}${right}`);
}

// ── Section separator ─────────────────────────────────────

export function section(title: string): void {
  const seg = `── ${title} `;
  const rem = Math.max(0, IBW - seg.length);
  console.log();
  console.log(`${IND}${BC}${seg}${'─'.repeat(rem)}${R}`);
  console.log();
}

// ── Spinner ───────────────────────────────────────────────

export class Spinner {
  private idx = 0;
  private id: ReturnType<typeof setInterval> | null = null;
  readonly label: string;

  constructor(label: string) { this.label = label; }

  start(): this {
    process.stdout.write('\x1b[?25l'); // hide cursor
    this.id = setInterval(() => {
      const f = FRAMES[this.idx++ % FRAMES.length];
      process.stdout.write(`\r${IND}${fmt.info(f)}  ${this.label}\x1b[K`);
    }, 80);
    return this;
  }

  private stop() {
    if (this.id) { clearInterval(this.id); this.id = null; }
    process.stdout.write('\r\x1b[K\x1b[?25h');
  }

  /** ✔  Name                                        installed */
  succeed(name: string, text = 'installed') {
    this.stop();
    statusLine(`${icons.success}  ${fmt.bold(name)}`, fmt.success(text));
  }

  /** ✘  Name                                           failed */
  fail(name: string, text = 'failed') {
    this.stop();
    statusLine(`${icons.error}  ${fmt.bold(name)}`, fmt.error(text));
  }

  /** ○  Name                                already installed */
  skip(name: string, text = 'already installed') {
    this.stop();
    statusLine(`${icons.skip}  ${fmt.bold(name)}`, fmt.muted(text));
  }

  warn(msg: string) {
    this.stop();
    console.log(`${IND}${icons.warn}  ${msg}`);
  }
}

// ── Banner ────────────────────────────────────────────────
//
// ┌────────────────────────────────────────────────────────┐
// │                                                        │
// │   DEV SETUP CLI                               v2.0.0  │
// │   Automated development environment installer          │
// │   github.com/blpsoares/my-dev-configs                  │
// │                                                        │
// └────────────────────────────────────────────────────────┘
//
export function printBanner(): void {
  // Visible: "   DEV SETUP CLI" = 16 chars + "v2.0.0" = 6 chars → gap = 34
  const titleL = `   ${ansi.bold}${ansi.brightMagenta}DEV SETUP${R} ${ansi.bold}${ansi.brightWhite}CLI${R}`;
  const titleR = `${ansi.dim}v2.0.0${R}`;

  console.log();
  console.log(box.top());
  console.log(box.empty());
  console.log(box.aligned(titleL, titleR));
  console.log(box.line(`   ${ansi.dim}Automated development environment installer${R}`));
  console.log(box.line(`   ${ansi.dim}github.com/blpsoares/my-dev-configs${R}`));
  console.log(box.empty());
  console.log(box.bottom());
  console.log();
}

// ── System information ────────────────────────────────────
//
// ┌── System ──────────────────────────────────────────────┐
// │                                                        │
// │  OS    Ubuntu 20.04.6 LTS        User   padawan        │
// │  Arch  x86_64                    Home   /home/padawan  │
// │                                                        │
// └────────────────────────────────────────────────────────┘
//
export async function printSystemInfo(): Promise<void> {
  const run = async (cmd: string): Promise<string> => {
    try {
      const p = Bun.spawn(['bash', '-c', cmd], { stdout: 'pipe', stderr: 'pipe', stdin: null });
      await p.exited;
      return (await new Response(p.stdout).text()).trim() || 'unknown';
    } catch { return 'unknown'; }
  };

  const [os, arch] = await Promise.all([
    run('. /etc/os-release 2>/dev/null && echo "$PRETTY_NAME" || uname -sr'),
    run('uname -m'),
  ]);

  const user = process.env.USER ?? process.env.USERNAME ?? 'unknown';
  const home = process.env.HOME ?? '~';

  // Two-column layout: col1 = 2+6+20 = 28, col2 = 6+22 = 28, total = 56 ✓
  const lbl = (s: string) => `${ansi.dim}${s.padEnd(6)}${R}`;
  const val = (s: string, w: number) => fmt.info(s.slice(0, w).padEnd(w));

  console.log(box.top('System'));
  console.log(box.empty());
  console.log(box.line(`  ${lbl('OS')}${val(os, 20)}${lbl('User')}${val(user, 22)}`));
  console.log(box.line(`  ${lbl('Arch')}${val(arch, 20)}${lbl('Home')}${val(home, 22)}`));
  console.log(box.empty());
  console.log(box.bottom());
  console.log();
}

// ── Summary ───────────────────────────────────────────────
//
// ┌── Summary ──────────────────────────────────────────────┐
// │                                                         │
// │  ✔  Zsh                                     installed  │
// │  ○  Build Essentials               already installed  │
// │  ✘  Docker                                     failed  │
// │                                                         │
// ├─────────────────────────────────────────────────────────┤
// │  3 installed   1 skipped   1 failed                     │
// └─────────────────────────────────────────────────────────┘
//
export type InstallResult = {
  name: string;
  status: 'success' | 'error' | 'skipped';
  message?: string;
};

export function printSummary(results: InstallResult[]): void {
  const ok      = results.filter(r => r.status === 'success').length;
  const failed  = results.filter(r => r.status === 'error').length;
  const skipped = results.filter(r => r.status === 'skipped').length;

  console.log();
  console.log(box.top('Summary'));
  console.log(box.empty());

  for (const r of results) {
    if (r.status === 'success') {
      console.log(box.aligned(`  ${icons.success}  ${fmt.bold(r.name)}`, fmt.success('installed')));
    } else if (r.status === 'error') {
      console.log(box.aligned(`  ${icons.error}  ${fmt.bold(r.name)}`, fmt.error('failed')));
    } else {
      console.log(box.aligned(`  ${icons.skip}  ${fmt.bold(r.name)}`, fmt.muted('already installed')));
    }
  }

  console.log(box.empty());
  console.log(box.mid());

  const parts: string[] = [];
  if (ok > 0)      parts.push(fmt.success(`${ok} installed`));
  if (skipped > 0) parts.push(fmt.muted(`${skipped} skipped`));
  if (failed > 0)  parts.push(fmt.error(`${failed} failed`));

  console.log(box.line(`  ${parts.join(fmt.dim('   '))}`));
  console.log(box.bottom());
}

// ── Help ──────────────────────────────────────────────────

export function printHelp(): void {
  printBanner();

  const opts: [string, string][] = [
    ['-h, --help',    'Show this help message'],
    ['-v, --verbose', 'Show full installation output'],
    ['-d, --dry-run', 'Preview packages without installing'],
    ['-a, --all',     'Install all packages without prompting'],
  ];

  const examples: [string, string][] = [
    ['setup',           'Interactive mode (default)'],
    ['setup --all',     'Install everything'],
    ['setup --dry-run', 'Preview only, no changes'],
    ['setup --verbose', 'Show full command output'],
  ];

  console.log(box.top('Usage & Options'));
  console.log(box.line(`  ${fmt.dim('setup')} ${fmt.dim('[options]')}`));
  console.log(box.empty());
  for (const [flag, desc] of opts) {
    console.log(box.aligned(`  ${fmt.info(flag)}`, fmt.dim(desc)));
  }
  console.log(box.mid('Examples'));
  for (const [cmd, desc] of examples) {
    console.log(box.aligned(`  ${fmt.dim(cmd)}`, fmt.dim(desc)));
  }
  console.log(box.bottom());
  console.log();
}
