// ─────────────────────────────────────────────────────────
//  Command Runner — executes shell commands via Bun.spawn
// ─────────────────────────────────────────────────────────

export interface RunResult {
  exitCode: number;
  stdout: string;
  stderr: string;
}

/**
 * Executes a shell command via `bash -c`.
 *
 * @param command - The shell command string to run
 * @param verbose - When true, inherit stdio so output streams to terminal
 * @returns exitCode, stdout, and stderr
 */
export async function runCommand(command: string, verbose = false): Promise<RunResult> {
  if (verbose) {
    // Stream output directly to the terminal
    const proc = Bun.spawn(['bash', '-c', command], {
      stdout: 'inherit',
      stderr: 'inherit',
      stdin:  'inherit',
    });

    const exitCode = await proc.exited;
    return { exitCode, stdout: '', stderr: '' };
  }

  // Capture output silently (non-verbose)
  const proc = Bun.spawn(['bash', '-c', command], {
    stdout: 'pipe',
    stderr: 'pipe',
    stdin:  'inherit',
  });

  // Read stdout, stderr, and wait for exit concurrently
  const [exitCode, stdout, stderr] = await Promise.all([
    proc.exited,
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ]);

  return { exitCode, stdout, stderr };
}

/**
 * Runs a check command and returns true if it exits with code 0.
 * Used to detect whether a tool is already installed.
 */
export async function checkCommand(command: string): Promise<boolean> {
  const proc = Bun.spawn(['bash', '-c', command], {
    stdout: 'pipe',
    stderr: 'pipe',
    stdin:  null,
  });

  const exitCode = await proc.exited;
  return exitCode === 0;
}

/**
 * Appends a line to the user's shell rc file (~/.bashrc or ~/.zshrc)
 * if it isn't already present.
 */
export async function addToShellRc(line: string): Promise<void> {
  const shell = process.env.SHELL ?? '';
  const rcFile = shell.includes('zsh')
    ? `${process.env.HOME}/.zshrc`
    : `${process.env.HOME}/.bashrc`;

  const proc = Bun.spawn(
    ['bash', '-c', `grep -qxF ${JSON.stringify(line)} ${rcFile} || echo ${JSON.stringify(line)} >> ${rcFile}`],
    { stdout: 'pipe', stderr: 'pipe', stdin: null }
  );
  await proc.exited;
}
