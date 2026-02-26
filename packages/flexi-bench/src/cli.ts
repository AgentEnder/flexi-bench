import cliForge from 'cli-forge';
import { readdirSync } from 'node:fs';
import { registerListCommand } from './cli/list';
import { registerRunCommand } from './cli/run';

type PackageManager = 'npm' | 'pnpm' | 'yarn' | 'bun';

function getPackageManager(): PackageManager {
  const files = readdirSync('.');
  if (files.includes('pnpm-lock.yaml')) return 'pnpm';
  if (files.includes('yarn.lock')) return 'yarn';
  if (files.includes('bun.lockb')) return 'bun';
  return 'npm';
}

function getInstallCommand(pm: PackageManager): string {
  switch (pm) {
    case 'pnpm':
      return 'pnpm add -D @flexi-bench/tui';
    case 'yarn':
      return 'yarn add -D @flexi-bench/tui';
    case 'bun':
      return 'bun add -d @flexi-bench/tui';
    default:
      return 'npm install --save-dev @flexi-bench/tui';
  }
}

const app = cliForge('flexibench', {
  description: 'CLI for running and inspecting flexi-bench benchmark files',
  builder: (args) => args.strict(false),
  handler: async (args) => {
    const files = args.unmatched ?? [];
    if (files.length === 0 || !process.stdout.isTTY) {
      app.printHelp();
      return;
    }
    let launchTui: typeof import('@flexi-bench/tui').launchTui;
    try {
      ({ launchTui } = await import('@flexi-bench/tui'));
    } catch {
      const pm = getPackageManager();
      const installCmd = getInstallCommand(pm);
      throw new Error(
        'Interactive mode requires @flexi-bench/tui. Install it with:\n' +
          `  ${installCmd}\n\n` +
          'Alternatively, use the non-interactive CLI commands:\n' +
          '  flexibench list <files>  - List benchmarks and suites\n' +
          '  flexibench run <files>   - Run benchmarks',
      );
    }
    await launchTui(files);
  },
});

registerRunCommand(registerListCommand(app)).forge();
