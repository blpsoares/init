// ─────────────────────────────────────────────────────────
//  UI Utilities — Modern Box-Drawing Terminal Interface
// ─────────────────────────────────────────────────────────

// ── Layout constants ──────────────────────────────────────
const P  = '  ';   // 2-space prefix for every line
const IW = 66;     // inner width between border chars │ … │
const TW = IW - 2; // usable text width (1-space padding each side)

// ── ANSI-aware helpers ────────────────────────────────────

/** Visual (printable) length — strips ANSI escape codes */
function visLen(s: string): number {
  return s.replace(/\x1b\[[0-9;]*m/g, '').length;
}

/** Pad a possibly-styled string to a given visual width */
function visPad(s: string, w: number, ch = ' '): string {
  const n = w - visLen(s);
  return n > 0 ? s + ch.repeat(n) : s;
}

// ── ANSI escape codes ─────────────────────────────────────
export const ansi = {
  reset:         '\x1b[0m',
  bold:          '\x1b[1m',
  dim:           '\x1b[2m',
  italic:        '\x1b[3m',
  underline:     '\x1b[4m',
  red:           '\x1b[31m',
  green:         '\x1b[32m',
  yellow:        '\x1b[33m',
  blue:          '\x1b[34m',
  magenta:       '\x1b[35m',
  cyan:          '\x1b[36m',
  white:         '\x1b[37m',
  brightRed:     '\x1b[91m',
  brightGreen:   '\x1b[92m',
  brightYellow:  '\x1b[93m',
  brightBlue:    '\x1b[94m',
  brightMagenta: '\x1b[95m',
  brightCyan:    '\x1b[96m',
  brightWhite:   '\x1b[97m',
};

// ── Styled text helpers ───────────────────────────────────
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

// ── Status icons ──────────────────────────────────────────
export const icons = {
  success: fmt.success('✔'),
  error:   fmt.error('✘'),
  warn:    fmt.warn('⚠'),
  info:    fmt.info('ℹ'),
  arrow:   fmt.primary('›'),
  bullet:  fmt.muted('·'),
  skip:    fmt.dim('○'),
  dot:     fmt.accent('◆'),
};

// ── Box drawing — single line (╭─╮ / │ / ╰─╯) ────────────
function sTop(title?: string): string {
  if (title) {
    const t = `─ ${title} `;
    return `${P}╭${t}${'─'.repeat(IW - t.length)}╮`;
  }
  return `${P}╭${'─'.repeat(IW)}╮`;
}
function sBot():              string { return `${P}╰${'─'.repeat(IW)}╯`; }
function sDivider():          string { return `${P}├${'─'.repeat(IW)}┤`; }
function sRow(text: string):  string { return `${P}│ ${visPad(text, TW)} │`; }
function sBlank():            string { return `${P}│${' '.repeat(IW)}│`; }

// ── Box drawing — double line (╔═╗ / ║ / ╚═╝) ── banner ──
function dTop():              string { return `${P}╔${'═'.repeat(IW)}╗`; }
function dBot():              string { return `${P}╚${'═'.repeat(IW)}╝`; }
function dDivider():          string { return `${P}╠${'═'.repeat(IW)}╣`; }
function dRow(text: string):  string { return `${P}║ ${visPad(text, TW)} ║`; }
function dBlank():            string { return `${P}║${' '.repeat(IW)}║`; }

// ── Banner ────────────────────────────────────────────────
export function printBanner(): void {
  // Plain-text versions for length arithmetic (no ANSI codes)
  const plainTitle = '  ◆  DEV SETUP CLI';
  const plainVer   = 'v2.0.0';
  const spacer     = ' '.repeat(Math.max(1, TW - plainTitle.length - plainVer.length));

  // Styled versions
  const styledTitle =
    `  ${fmt.accent('◆')}  ${ansi.bold}${fmt.primary('DEV SETUP')}${ansi.reset} ` +
    `${ansi.bold}${ansi.brightWhite}CLI${ansi.reset}`;
  const styledVer   = fmt.dim(plainVer);
  const styledSub   = fmt.dim('Automated development environment installer');
  const styledRepo  = fmt.muted('github.com/blpsoares/init');

  console.log();
  console.log(dTop());
  console.log(dBlank());
  console.log(dRow(styledTitle + spacer + styledVer));
  console.log(dRow(`  ${styledSub}`));
  console.log(dBlank());
  console.log(dDivider());
  console.log(dRow(`  ${fmt.muted('#')}  ${styledRepo}`));
  console.log(dBot());
  console.log();
}

// ── Section header (precedes interactive prompts) ─────────
export function section(title: string): void {
  const rule = fmt.dim('┄'.repeat(IW + 2));
  console.log();
  console.log(`${P}${rule}`);
  console.log(`${P}  ${fmt.accent('◆')} ${fmt.bold(title)}`);
  console.log(`${P}${rule}`);
  console.log();
}

// ── Horizontal rule ───────────────────────────────────────
export function divider(): void {
  console.log(`${P}${fmt.dim('─'.repeat(IW + 2))}`);
}

// ── System information panel ──────────────────────────────
export async function printSystemInfo(): Promise<void> {
  const run = async (cmd: string): Promise<string> => {
    try {
      const p = Bun.spawn(['bash', '-c', cmd], { stdout: 'pipe', stderr: 'pipe', stdin: null });
      await p.exited;
      return (await new Response(p.stdout).text()).trim();
    } catch { return 'unknown'; }
  };

  const [osName, arch, distro] = await Promise.all([
    run('uname -s'),
    run('uname -m'),
    run('. /etc/os-release 2>/dev/null && echo "$PRETTY_NAME" || uname -sr'),
  ]);

  const user = process.env.USER ?? process.env.USERNAME
    ?? await run('whoami').catch(() => 'unknown');
  const home = process.env.HOME ?? await run('echo ~').catch(() => '~');

  const rows: [string, string][] = [
    ['OS',   distro || osName],
    ['Arch', arch],
    ['User', user],
    ['Home', home],
  ];

  console.log(sTop('System Information'));
  console.log(sBlank());
  for (const [label, value] of rows) {
    const line = `${fmt.dim(label.padEnd(6))}  ${fmt.info(value)}`;
    console.log(sRow(`  ${line}`));
  }
  console.log(sBlank());
  console.log(sBot());
  console.log();
}

// ── Spinner ───────────────────────────────────────────────
const FRAMES = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];

export class Spinner {
  private frame = 0;
  private timer: ReturnType<typeof setInterval> | null = null;
  private text: string;

  constructor(text: string) { this.text = text; }

  start(): this {
    process.stdout.write('\x1b[?25l');
    this.timer = setInterval(() => {
      const f = FRAMES[this.frame % FRAMES.length];
      process.stdout.write(`\r${P}  ${fmt.accent(f)} ${this.text}   `);
      this.frame++;
    }, 80);
    return this;
  }

  setText(t: string) { this.text = t; return this; }

  private stop(icon: string, text?: string): void {
    if (this.timer) { clearInterval(this.timer); this.timer = null; }
    process.stdout.write('\r\x1b[K\x1b[?25h');
    process.stdout.write(`${P}  ${icon} ${text ?? this.text}\n`);
  }

  succeed(t?: string) { this.stop(icons.success, t); }
  fail(t?: string)    { this.stop(icons.error, t); }
  skip(t?: string)    { this.stop(icons.skip, t); }
  warn(t?: string)    { this.stop(icons.warn, t); }

  clear(): void {
    if (this.timer) { clearInterval(this.timer); this.timer = null; }
    process.stdout.write('\r\x1b[K\x1b[?25h');
  }
}

// ── Installation summary panel ────────────────────────────
export type InstallResult = {
  name: string;
  status: 'success' | 'error' | 'skipped';
  message?: string;
};

export function printSummary(results: InstallResult[]): void {
  const ok      = results.filter(r => r.status === 'success').length;
  const failed  = results.filter(r => r.status === 'error').length;
  const skipped = results.filter(r => r.status === 'skipped').length;

  const nameW = Math.min(Math.max(...results.map(r => r.name.length), 10), 24);

  console.log(sTop('Installation Summary'));
  console.log(sBlank());

  for (const r of results) {
    const name = fmt.bold(visPad(r.name, nameW));
    if (r.status === 'success') {
      console.log(sRow(`  ${icons.success}  ${name}  ${fmt.success('installed')}`));
    } else if (r.status === 'error') {
      const msg = r.message ? fmt.dim(` — ${r.message.slice(0, 24)}`) : '';
      console.log(sRow(`  ${icons.error}  ${name}  ${fmt.error('failed')}${msg}`));
    } else {
      console.log(sRow(`  ${icons.skip}  ${name}  ${fmt.dim('already installed')}`));
    }
  }

  console.log(sBlank());
  console.log(sDivider());

  const stats =
    `${icons.success} ${fmt.bold(String(ok))} installed` +
    `   ${icons.skip} ${fmt.bold(String(skipped))} skipped` +
    `   ${icons.error} ${fmt.bold(String(failed))} failed`;
  console.log(sRow(`  ${stats}`));
  console.log(sBot());
}

// ── Help panel ────────────────────────────────────────────
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
    ['setup --all',     'Install everything without prompting'],
    ['setup --dry-run', 'Preview what would be installed'],
    ['setup --verbose', 'Show full command output'],
  ];

  console.log(sTop('Usage'));
  console.log(sBlank());
  console.log(sRow(`  ${fmt.bold('setup')} ${fmt.dim('[options]')}`));
  console.log(sBlank());
  console.log(sRow(`  ${fmt.dim('Options:')}`));
  for (const [flag, desc] of opts) {
    const styledFlag = fmt.info(flag);
    const space      = ' '.repeat(Math.max(1, 20 - flag.length));
    console.log(sRow(`    ${styledFlag}${space}${fmt.dim(desc)}`));
  }
  console.log(sBlank());
  console.log(sRow(`  ${fmt.dim('Examples:')}`));
  for (const [cmd, desc] of examples) {
    const space = ' '.repeat(Math.max(1, 22 - cmd.length));
    console.log(sRow(`    ${fmt.bold(cmd)}${space}${fmt.dim(desc)}`));
  }
  console.log(sBlank());
  console.log(sBot());
  console.log();
}
