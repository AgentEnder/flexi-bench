import { spawnSync } from 'child_process';
import { existsSync, mkdirSync } from 'fs';
import { workspaceRoot } from 'nx/src/devkit-exports';
import { join, sep } from 'path';

import { collectExamples } from '../scripts/examples';

// Ensure output directory exists before running examples
const outputDir = join(workspaceRoot, 'examples', 'output');
if (!existsSync(outputDir)) {
  mkdirSync(outputDir, { recursive: true });
}

const examples = collectExamples(join(__dirname, '../examples'));

let error = false;

for (const example of examples) {
  if (example.data.e2e_skip) {
    continue;
  }
  const path = example.path;
  const label =
    example.data.title ?? example.path.replace(`${workspaceRoot}${sep}`, '');
  process.stdout.write('▶️  ' + label);
  const a = performance.now();
  const result = spawnSync(process.execPath, ['--import=tsx', example.path], {
    cwd: workspaceRoot,
  });
  const b = performance.now();

  // Check if the process exited successfully (status 0)
  if (result.status !== 0 && !example.data.expect_failure) {
    // move cursor to the beginning of the line
    process.stdout.write('\r');
    console.log(`❌  ${label}`.padEnd(process.stdout.columns, ' '));
    if (result.stderr) {
      console.error(result.stderr.toString());
    }
    error = true;
    continue;
  }

  // move cursor to the beginning of the line
  process.stdout.write('\r');
  console.log(
    `✅ ${label} (${Math.round((b - a) * 10) / 10}ms)`.padEnd(
      process.stdout.columns,
      ' ',
    ),
  );
}

if (error) {
  process.exit(1);
}
