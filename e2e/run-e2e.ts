import { execSync, spawnSync } from 'child_process';
import { readdirSync } from 'fs';
import { workspaceRoot } from 'nx/src/devkit-exports';
import { join, sep } from 'path';

// returns all .ts files from given path
function collectExamples(path: string): string[] {
  const files = readdirSync(path, { withFileTypes: true });
  const collected: string[] = [];
  for (const file of files) {
    if (file.isDirectory()) {
      collected.push(...collectExamples(join(path, file.name)));
    } else {
      if (file.name.endsWith('.ts')) {
        collected.push(join(path, file.name));
      }
    }
  }
  return collected;
}

const examples = collectExamples(join(__dirname, '../examples'));

let error = false;

for (const example of examples) {
  const label = example.replace(`${workspaceRoot}${sep}`, '');
  try {
    process.stdout.write('▶️ ' + label);
    const a = performance.now();
    spawnSync(process.execPath, ['--import=tsx', example], {});
    const b = performance.now();
    // move cursor to the beginning of the line
    process.stdout.write('\r');

    console.log(
      `✅ ${label} (${Math.round((b - a) * 10) / 10}ms)`.padEnd(
        process.stdout.columns,
        ' ',
      ),
    );
  } catch {
    // move cursor to the beginning of the line
    process.stdout.write('\r');
    console.log(`❌ ${label}`.padEnd(process.stdout.columns, ' '));
    error = true;
  }
}

if (error) {
  process.exit(1);
}
