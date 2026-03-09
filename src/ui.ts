// ─────────────────────────────────────────────────────────
//  UI Utilities — Colors, Spinner, Banner, Helpers
// ─────────────────────────────────────────────────────────

// ANSI escape codes
export const ansi = {
  reset:          '\x1b[0m',
  bold:           '\x1b[1m',
  dim:            '\x1b[2m',
  italic:         '\x1b[3m',
  underline:      '\x1b[4m',
  red:            '\x1b[31m',
  green:          '\x1b[32m',
  yellow:         '\x1b[33m',
  blue:           '\x1b[34m',
  magenta:        '\x1b[35m',
  cyan:           '\x1b[36m',
  white:          '\x1b[37m',
  brightRed:      '\x1b[91m',
  brightGreen:    '\x1b[92m',
  brightYellow:   '\x1b[93m',
  brightBlue:     '\x1b[94m',
  brightMagenta:  '\x1b[95m',
  brightCyan:     '\x1b[96m',
  brightWhite:    '\x1b[97m',
};

// Styled text helpers
export const fmt = {
  success: (s: string) => `${ansi.brightGreen}${s}${ansi.reset}`,
  error:   (s: string) => `${ansi.brightRed}${s}${ansi.reset}`,
  warn:    (s: string) => `${ansi.brightYellow}${s}${ansi.reset}`,
  info:    (s: string) => `${ansi.brightCyan}${s}${ansi.reset}`,
  dim:     (s: string) => `${ansi.dim}${s}${ansi.reset}`,
  bold:    (s: string) => `${ansi.bold}${s}${ansi.reset}`,
  primary: (s: string) => `${ansi.brightBlue}${s}${ansi.reset}`,
  accent:  (s: string) => `${ansi.brightMagenta}${s}${ansi.reset}`,
  muted:   (s: string) => `${ansi.dim}${ansi.white}${s}${ansi.reset}`,
};

// Status icons
export const icons = {
  success: fmt.success('✔'),
  error:   fmt.error('✘'),
  warn:    fmt.warn('⚠'),
  info:    fmt.info('ℹ'),
  arrow:   fmt.primary('→'),
  bullet:  fmt.muted('•'),
  skip:    fmt.warn('○'),
};

const SPINNER_FRAMES = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];

// ── Spinner ──────────────────────────────────────────────
export class Spinner {
  private frameIndex = 0;
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private text: string;

  constructor(text: string) {
    this.text = text;
  }

  start(): this {
    process.stdout.write('\x1b[?25l'); // hide cursor
    this.intervalId = setInterval(() => {
      const frame = SPINNER_FRAMES[this.frameIndex % SPINNER_FRAMES.length];
      process.stdout.write(`\r  ${fmt.info(frame)} ${this.text}  `);
      this.frameIndex++;
    }, 80);
    return this;
  }

  setText(text: string) {
    this.text = text;
    return this;
  }

  succeed(text?: string) {
    this.clear();
    process.stdout.write(`  ${icons.success} ${text ?? this.text}\n`);
  }

  fail(text?: string) {
    this.clear();
    process.stdout.write(`  ${icons.error} ${text ?? this.text}\n`);
  }

  skip(text?: string) {
    this.clear();
    process.stdout.write(`  ${icons.skip} ${text ?? this.text}\n`);
  }

  warn(text?: string) {
    this.clear();
    process.stdout.write(`  ${icons.warn} ${text ?? this.text}\n`);
  }

  clear() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    process.stdout.write('\r\x1b[K'); // clear current line
    process.stdout.write('\x1b[?25h'); // show cursor
  }
}

// ── Banner ───────────────────────────────────────────────
export function printBanner() {
  const line = fmt.primary('━'.repeat(56));
  console.log();
  console.log(`  ${line}`);
  console.log();
  console.log(`  ${fmt.bold(fmt.accent(' DEV SETUP '))}  ${fmt.bold(`${ansi.brightWhite}CLI${ansi.reset}`)}  ${fmt.dim('v2.0.0')}`);
  console.log(`  ${fmt.dim('Automated development environment installer')}`);
  console.log(`  ${fmt.dim('github.com/blpsoares/my-dev-configs')}`);
  console.log();
  console.log(`  ${line}`);
  console.log();
}

// ── Section header ───────────────────────────────────────
export function section(title: string) {
  console.log();
  console.log(`  ${fmt.bold(fmt.accent('▸'))} ${fmt.bold(title)}`);
  console.log();
}

// ── Divider ──────────────────────────────────────────────
export function divider() {
  console.log(`  ${fmt.muted('─'.repeat(50))}`);
}

// ── System info ──────────────────────────────────────────
export async function printSystemInfo() {
  section('System Information');

  const getOutput = async (cmd: string): Promise<string> => {
    try {
      const proc = Bun.spawn(['bash', '-c', cmd], { stdout: 'pipe', stderr: 'pipe', stdin: null });
      await proc.exited;
      return (await new Response(proc.stdout).text()).trim();
    } catch {
      return 'unknown';
    }
  };

  const [osName, arch, distro] = await Promise.all([
    getOutput('uname -s'),
    getOutput('uname -m'),
    getOutput('. /etc/os-release 2>/dev/null && echo "$PRETTY_NAME" || uname -sr'),
  ]);

  const user = process.env.USER ?? process.env.USERNAME ?? 'unknown';
  const home = process.env.HOME ?? '~';

  const info = [
    ['OS',   distro || osName],
    ['Arch', arch],
    ['User', user],
    ['Home', home],
  ];

  for (const [label, value] of info) {
    console.log(`  ${icons.bullet} ${fmt.dim(label.padEnd(6))} ${fmt.info(value)}`);
  }
}

// ── Summary table ─────────────────────────────────────────
export type InstallResult = {
  name: string;
  status: 'success' | 'error' | 'skipped';
  message?: string;
};

export function printSummary(results: InstallResult[]) {
  section('Installation Summary');

  for (const r of results) {
    if (r.status === 'success') {
      console.log(`  ${icons.success} ${fmt.bold(r.name)}`);
    } else if (r.status === 'error') {
      const msg = r.message ? fmt.dim(`  — ${r.message}`) : '';
      console.log(`  ${icons.error} ${fmt.bold(r.name)}${msg}`);
    } else {
      console.log(`  ${icons.skip} ${fmt.bold(r.name)} ${fmt.dim('(already installed)')}`);
    }
  }

  const ok      = results.filter(r => r.status === 'success').length;
  const failed  = results.filter(r => r.status === 'error').length;
  const skipped = results.filter(r => r.status === 'skipped').length;

  console.log();
  divider();
  console.log(
    `  ${icons.success} ${ok} installed` +
    `   ${icons.skip} ${skipped} skipped` +
    `   ${icons.error} ${failed} failed`
  );
}

// ── Help text ─────────────────────────────────────────────
export function printHelp() {
  printBanner();
  console.log(`  ${fmt.bold('Usage:')}`);
  console.log(`    setup ${fmt.dim('[options]')}`);
  console.log();
  console.log(`  ${fmt.bold('Options:')}`);

  const opts: [string, string][] = [
    ['-h, --help',    'Show this help message'],
    ['-v, --verbose', 'Show full installation output'],
    ['-d, --dry-run', 'Preview packages without installing'],
    ['-a, --all',     'Install all packages without prompting'],
  ];

  for (const [flag, desc] of opts) {
    console.log(`    ${fmt.info(flag.padEnd(18))} ${desc}`);
  }

  console.log();
  console.log(`  ${fmt.bold('Examples:')}`);
  console.log(`    ${fmt.dim('setup')}             Interactive mode`);
  console.log(`    ${fmt.dim('setup --all')}       Install everything`);
  console.log(`    ${fmt.dim('setup --dry-run')}   Preview only`);
  console.log(`    ${fmt.dim('setup --verbose')}   Show command output`);
  console.log();
}
