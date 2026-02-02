import { LoadContext } from '@docusaurus/types';
import { workspaceRoot } from '@nx/devkit';
import { h1, lines, link, ul } from 'markdown-factory';

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, sep } from 'node:path';

import { stringify } from 'yaml';

import { CollectedExample, collectExamples } from '../../../scripts/examples';

export async function ExamplesDocsPlugin(context: LoadContext) {
  const examplesRoot = join(workspaceRoot, 'examples') + sep;
  const examples = collectExamples(join(examplesRoot, '../examples'));
  for (const example of examples) {
    const relative = example.path.replace(examplesRoot, '');
    const destination = join(
      __dirname,
      '../../docs/examples',
      relative.replace('.ts', '.md'),
    );
    ensureDirSync(dirname(destination));
    writeFileSync(destination, formatExampleMd(example));
  }
  writeFileSync(
    join(__dirname, '../../docs/examples/index.md'),
    formatIndexMd(examples),
  );
  return {
    // a unique name for this plugin
    name: 'examples-docs-plugin',
  };
}

function formatExampleMd({ contents, data }: CollectedExample): string {
  const bodyLines = [h1(data.title)];
  if (data.description) {
    bodyLines.push(data.description);
  }
  return `---
${stringify(data)}hide_title: true
---
${lines(bodyLines)}
\`\`\`ts title="${data.title}" showLineNumbers
${contents}
\`\`\`
  `;
}

function formatIndexMd(examples: CollectedExample[]): string {
  return `---
id: examples
title: Examples
---
${h1('Examples', ul(examples.map((example) => link(`examples/${example.data.id}`, example.data?.title))))}
`;
}

function ensureDirSync(path: string): void {
  try {
    mkdirSync(path, { recursive: true });
  } catch (error) {
    throw new Error(`Failed to create directory: ${path}`);
  }
}
