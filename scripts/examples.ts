import { readFileSync, readdirSync } from 'node:fs';
import { basename, join } from 'node:path';

import { parse as loadYaml } from 'yaml';

/**
 * FrontMatter metadata for an example file.
 * Extracted from YAML-like comments at the top of TypeScript files.
 *
 * @example
 * ```ts
 * // ---
 * // id: 'example-id'
 * // title: 'Example Title'
 * // description: 'Description text'
 * // sidebar_label: 'Sidebar Label'
 * // ---
 * ```
 */
export type ExampleFrontMatter = {
  id: string;
  title: string;
  description?: string;
  sidebar_label?: string;
  expect_failure?: boolean;
  e2e_skip?: boolean;
};

/**
 * Represents a collected example with its path, contents, and metadata.
 */
export type CollectedExample = {
  /** Absolute path to the example file */
  path: string;
  /** File contents with frontmatter stripped */
  contents: string;
  /** Parsed and normalized frontmatter metadata */
  data: ExampleFrontMatter;
};

/**
 * Loads an example file and extracts its frontmatter metadata.
 *
 * Frontmatter is expected to be in YAML format within TypeScript comments:
 * ```ts
 * // ---
 * // key: value
 * // ---
 * ```
 *
 * @param path - Absolute path to the example file
 * @returns Object with file contents (frontmatter stripped) and parsed metadata
 */
export function loadExampleFile(path: string): {
  contents: string;
  data: Partial<ExampleFrontMatter>;
} {
  const contents = readFileSync(path, 'utf-8');
  const lines = contents.split('\n');
  const frontMatterLines: string[] = [];

  let line = lines.shift();
  if (line && line.startsWith('// ---')) {
    while (true) {
      line = lines.shift();
      if (!line) {
        throw new Error(
          `Unexpected end of file while parsing frontmatter: ${path}`,
        );
      }
      if (line.startsWith('// ---')) {
        break;
      } else {
        frontMatterLines.push(line.replace(/^\/\/\s?/, ''));
      }
    }
  } else if (line) {
    lines.unshift(line);
  }

  const yaml = frontMatterLines.join('\n');

  return {
    contents: lines.join('\n'),
    data: yaml ? loadYaml(yaml) : {},
  };
}

/**
 * Normalizes frontmatter by providing default values for missing fields.
 *
 * - `id` defaults to the filename (without extension) with slashes replaced by dashes
 * - `title` defaults to the filename (without extension)
 *
 * @param example - Example with potentially partial frontmatter
 * @returns Example with fully populated frontmatter
 */
export function normalizeFrontMatter(
  example: Omit<CollectedExample, 'data'> & {
    data: Partial<ExampleFrontMatter>;
  },
): CollectedExample {
  const { data, path } = example;
  const defaultName = basename(path).replace('.ts', '');

  return {
    ...example,
    data: {
      id: data?.id ?? defaultName.replace(/\//g, '-'),
      title: data?.title ?? defaultName,
      ...data,
    },
  };
}

/**
 * Recursively collects all TypeScript example files from the given directory.
 *
 * Each example is loaded, its frontmatter is parsed, and missing metadata
 * fields are normalized with sensible defaults.
 *
 * @param root - Root directory to search for examples
 * @returns Array of collected examples with paths, contents, and metadata
 */
export function collectExamples(root: string): CollectedExample[] {
  const files = readdirSync(root, { withFileTypes: true });
  const collected: CollectedExample[] = [];

  for (const file of files) {
    if (file.isDirectory()) {
      collected.push(...collectExamples(join(root, file.name)));
    } else {
      if (file.name.endsWith('.ts')) {
        const path = join(root, file.name);
        const loaded = loadExampleFile(path);
        collected.push(
          normalizeFrontMatter({
            path,
            data: loaded.data,
            contents: loaded.contents,
          }),
        );
      }
    }
  }

  return collected;
}

/**
 * Recursively collects all TypeScript example file paths from the given directory.
 *
 * This is a lightweight version of `collectExamples` that only returns paths
 * without loading file contents or parsing metadata.
 *
 * @param root - Root directory to search for examples
 * @returns Array of absolute paths to example files
 */
export function collectExamplePaths(root: string): string[] {
  const files = readdirSync(root, { withFileTypes: true });
  const collected: string[] = [];

  for (const file of files) {
    if (file.isDirectory()) {
      collected.push(...collectExamplePaths(join(root, file.name)));
    } else {
      if (file.name.endsWith('.ts')) {
        collected.push(join(root, file.name));
      }
    }
  }

  return collected;
}
