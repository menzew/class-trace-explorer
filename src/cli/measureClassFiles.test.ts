import { afterEach, describe, expect, it } from 'vitest';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { pathToFileURL } from 'node:url';
import type { GraphModel } from '../core/types';
import { measureClassFiles } from './measureClassFiles';

const JAR_FIXTURE =
  'UEsDBAoAAAAAALw8HV0yzqQRCwAAAAsAAAALABwAYS9Gb28uY2xhc3NVVAkAAzNwkmozcJJqdXgLAAEE6AMAAAToAwAAY2xhc3MtYnl0ZXNQSwECHgMKAAAAAAC8PB1dMs6kEQsAAAALAAAACwAYAAAAAAABAAAAtIEAAAAAYS9Gb28uY2xhc3NVVAUAAzNwkmp1eAsAAQToAwAABOgDAABQSwUGAAAAAAEAAQBRAAAAUAAAAAAA';

const temporaryPaths: string[] = [];

afterEach(async () => {
  await Promise.all(temporaryPaths.splice(0).map((path) => rm(path, { recursive: true })));
});

function graphFor(source: string): GraphModel {
  return {
    classes: ['a.Foo', 'a.Missing'],
    edges: [],
    classInfo: {
      'a.Foo': { name: 'a.Foo', source, origin: 'application' },
      'a.Missing': { name: 'a.Missing', source, origin: 'application' },
    },
  };
}

describe('measureClassFiles', () => {
  it('measures class files from a directory and preserves unknown coverage', async () => {
    const root = await mkdtemp(join(tmpdir(), 'cte-classes-'));
    temporaryPaths.push(root);
    await mkdir(join(root, 'a'));
    await writeFile(join(root, 'a/Foo.class'), 'class-bytes');

    const measured = await measureClassFiles(graphFor(pathToFileURL(root).href));

    expect(measured.classInfo?.['a.Foo']).toMatchObject({
      classFileBytes: 11,
      sizeProvenance: 'class-file',
    });
    expect(measured.classInfo?.['a.Missing'].classFileBytes).toBeUndefined();
  });

  it('reads uncompressed class sizes from a JAR central directory', async () => {
    const root = await mkdtemp(join(tmpdir(), 'cte-jar-'));
    temporaryPaths.push(root);
    const jar = join(root, 'fixture.jar');
    await writeFile(jar, Buffer.from(JAR_FIXTURE, 'base64'));

    const measured = await measureClassFiles(graphFor(`jar:${pathToFileURL(jar).href}!/`));

    expect(measured.classInfo?.['a.Foo'].classFileBytes).toBe(11);
    expect(measured.classInfo?.['a.Missing'].classFileBytes).toBeUndefined();
  });

  it('does not fail when imported trace sources are unavailable', async () => {
    const graph = graphFor('file:/does/not/exist/application.jar');
    await expect(measureClassFiles(graph)).resolves.toEqual(graph);
  });
});
