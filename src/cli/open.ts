import { spawn } from 'node:child_process';

/** Open a file with the OS default handler (best-effort; never throws). */
export function openInBrowser(path: string): void {
  const cmd =
    process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'start' : 'xdg-open';
  try {
    const child = spawn(cmd, [path], {
      stdio: 'ignore',
      detached: true,
      shell: process.platform === 'win32',
    });
    child.unref();
  } catch {
    /* ignore — opening is a convenience */
  }
}
