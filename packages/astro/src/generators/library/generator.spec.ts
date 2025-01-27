jest.mock('@nx/devkit', () => ({
  ...jest.requireActual('@nx/devkit'),
  formatFiles: jest.fn(),
}));

import {
  formatFiles,
  readJson,
  readProjectConfiguration,
  type Tree,
} from '@nx/devkit';
import { createTreeWithEmptyWorkspace } from '../utilities/testing';
import { libraryGenerator } from './generator';
import type { GeneratorOptions } from './schema';

describe('library generator', () => {
  let tree: Tree;
  const options: GeneratorOptions = {
    name: 'lib1',
    projectNameAndRootFormat: 'as-provided',
  };

  beforeEach(() => {
    tree = createTreeWithEmptyWorkspace();
  });

  test('should add project configuration', async () => {
    await libraryGenerator(tree, options);

    const config = readProjectConfiguration(tree, options.name);
    expect(config).toMatchSnapshot();
  });

  test('should generate files', async () => {
    await libraryGenerator(tree, options);

    expect(tree.exists(`${options.name}/index.ts`)).toBeTruthy();
    expect(tree.exists(`${options.name}/src/Lib1.astro`)).toBeTruthy();
    expect(tree.exists(`${options.name}/README.md`)).toBeTruthy();
    expect(tree.exists(`${options.name}/tsconfig.json`)).toBeTruthy();
  });

  test('should generate files in a monorepo layout', async () => {
    tree.write('libs/.gitkeep', '');

    await libraryGenerator(tree, {
      ...options,
      projectNameAndRootFormat: 'derived',
    });

    expect(tree.exists(`libs/${options.name}/index.ts`)).toBeTruthy();
    expect(tree.exists(`libs/${options.name}/src/Lib1.astro`)).toBeTruthy();
    expect(tree.exists(`libs/${options.name}/README.md`)).toBeTruthy();
    expect(tree.exists(`libs/${options.name}/tsconfig.json`)).toBeTruthy();
  });

  test('should add the path mapping', async () => {
    await libraryGenerator(tree, options);

    const { compilerOptions } = readJson(tree, 'tsconfig.base.json');
    expect(compilerOptions.paths[`@proj/${options.name}`]).toStrictEqual([
      `${options.name}/index.ts`,
    ]);
  });

  test('should format files', async () => {
    await libraryGenerator(tree, options);

    expect(formatFiles).toHaveBeenCalled();
  });

  describe('--directory', () => {
    const directory = `some-directory/sub-directory/${options.name}`;

    test('should add project with the right name when a directory is provided', async () => {
      await libraryGenerator(tree, { ...options, directory });

      const project = readProjectConfiguration(tree, options.name);
      expect(project).toBeTruthy();
    });

    test('should generate files in the right directory', async () => {
      await libraryGenerator(tree, { ...options, directory });

      expect(tree.exists(`${directory}/index.ts`)).toBeTruthy();
      expect(tree.exists(`${directory}/src/Lib1.astro`)).toBeTruthy();
      expect(tree.exists(`${directory}/README.md`)).toBeTruthy();
      expect(tree.exists(`${directory}/tsconfig.json`)).toBeTruthy();
    });

    test('should generate files in the right directory in a monorepo layout', async () => {
      tree.write('libs/.gitkeep', '');

      await libraryGenerator(tree, {
        ...options,
        directory,
        projectNameAndRootFormat: 'derived',
      });

      expect(
        tree.exists(`libs/${directory}/${options.name}/index.ts`)
      ).toBeTruthy();
      expect(
        tree.exists(`libs/${directory}/${options.name}/src/Lib1.astro`)
      ).toBeTruthy();
      expect(
        tree.exists(`libs/${directory}/${options.name}/README.md`)
      ).toBeTruthy();
      expect(
        tree.exists(`libs/${directory}/${options.name}/tsconfig.json`)
      ).toBeTruthy();
    });

    test('should add the path mapping with the right directory', async () => {
      await libraryGenerator(tree, { ...options, directory });

      const { compilerOptions } = readJson(tree, 'tsconfig.base.json');
      expect(compilerOptions.paths[`@proj/${options.name}`]).toStrictEqual([
        `${directory}/index.ts`,
      ]);
    });
  });

  describe('--tags', () => {
    test('should add project tags when provided', async () => {
      await libraryGenerator(tree, { ...options, tags: 'foo, bar' });

      const { tags } = readProjectConfiguration(tree, options.name);
      expect(tags).toEqual(['foo', 'bar']);
    });
  });

  describe('--publishable', () => {
    test('should not generate a package.json when publishable is false', async () => {
      await libraryGenerator(tree, { ...options, publishable: false });

      expect(tree.exists(`${options.name}/package.json`)).toBeFalsy();
    });

    test('should throw when publishable is true and importPath was not specified', async () => {
      await expect(
        libraryGenerator(tree, { ...options, publishable: true })
      ).rejects.toThrow();
    });

    test('should generate a package.json when publishable is true', async () => {
      await libraryGenerator(tree, {
        ...options,
        publishable: true,
        importPath: 'lib1',
      });

      expect(tree.exists(`${options.name}/package.json`)).toBeTruthy();
    });
  });

  describe('--importPath', () => {
    const importPath = '@my-awesome-scope/lib1';

    test('should use the specified importPath as the package name', async () => {
      await libraryGenerator(tree, {
        ...options,
        importPath,
        publishable: true,
      });

      expect(readJson(tree, `${options.name}/package.json`).name).toBe(
        importPath
      );
    });

    test('should add the specified importPath to the path mappings in tsconfig.base.json', async () => {
      await libraryGenerator(tree, { ...options, importPath });

      const { compilerOptions } = readJson(tree, 'tsconfig.base.json');
      expect(compilerOptions.paths[importPath]).toStrictEqual([
        `${options.name}/index.ts`,
      ]);
    });
  });
});
