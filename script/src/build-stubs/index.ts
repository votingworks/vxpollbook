import * as fs from 'node:fs';
import { join } from 'node:path';
import { IO } from '../types';
import { createRequire } from 'node:module';

type Module = Record<PropertyKey, unknown>;

const stubFnName = '__stubFnDoNotCall';
const stubFnBody = `
function ${stubFnName}(): never {
  throw new Error('this function is a stub and should never be called');
}
`;
const INDENT = '  ';

function findModuleExportReference(
  mod: Module,
  exportValue: unknown
): string | undefined {
  if (typeof exportValue === 'object' && exportValue !== null) {
    for (const [key, value] of Object.entries(mod)) {
      if (value === exportValue) {
        return key;
      }
    }
  }

  return undefined;
}

function writeValue(
  out: NodeJS.WritableStream,
  mod: Module,
  seen: Set<unknown>,
  indent: number,
  value: unknown
): void {
  if (typeof value === 'object' && value !== null) {
    if (seen.has(value)) {
      const moduleEntry = findModuleExportReference(mod, value);
      if (moduleEntry) {
        out.write(moduleEntry);
      } else {
        out.write('undefined /* [Circular] */');
      }
      return;
    }
    seen.add(value);
  }

  if (
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean' ||
    value === null
  ) {
    out.write(JSON.stringify(value));
  } else if (value === undefined) {
    out.write('undefined');
  } else if (Array.isArray(value)) {
    out.write('[');
    for (const entry of value) {
      out.write(INDENT.repeat(indent + 1));
      writeValue(out, mod, seen, indent + 1, entry);
      out.write(',\n');
    }
    out.write(']');
  } else if (typeof value === 'object') {
    out.write('{\n');
    for (const [key, val] of Object.entries(value)) {
      const moduleEntry = findModuleExportReference(mod, val);
      if (moduleEntry) {
        out.write(INDENT.repeat(indent + 1));
        out.write(`get ${key}() {\n`);
        out.write(INDENT.repeat(indent + 2));
        out.write(`return ${moduleEntry};\n`);
        out.write(INDENT.repeat(indent + 1));
        out.write(`},\n`);
      } else {
        out.write(INDENT.repeat(indent + 1));
        out.write(`${key}: `);
        writeValue(out, mod, seen, indent + 1, val);
        out.write(',\n');
      }
    }
    out.write(INDENT.repeat(indent));
    out.write('}');
  } else if (typeof value === 'function') {
    out.write(stubFnName);
  } else {
    throw new Error(`Unsupported value type: ${typeof value}`);
  }
}

function writeExports(out: NodeJS.WritableStream, mod: Module): void {
  const seen = new Set<unknown>();
  for (const [key, value] of Object.entries(mod)) {
    out.write(`/** Stub for ${key} */\nexport const ${key} = `);
    writeValue(out, mod, seen, 0, value);
    out.write(';\n');
  }
}

function writeStub(
  out: NodeJS.WritableStream,
  name: string,
  mod: Module
): void {
  out.write(
    `/** Stub for '${name}' module, generated by script/build-stubs. DO NOT EDIT */\n`
  );
  out.write('/* eslint-disable */\n');
  out.write('/* istanbul ignore file */\n');
  out.write(stubFnBody);
  writeExports(out, mod);
}

function buildStub(name: string, outputPath: string): void {
  const require = createRequire(join(process.cwd(), 'build-stubs.ts'));
  const mod = require(name);
  const out = fs.createWriteStream(outputPath);
  writeStub(out, name, mod);
}

function usage(out: NodeJS.WritableStream): void {
  out.write(`
  Usage: build-stubs <module>:<output-path> [<module>:<output-path> …]

  Example: build-stubs fs:src/stubs/fs.ts glob:src/stubs/glob.ts
  `);
}

export function main({ stdout, stderr }: IO) {
  for (let i = 2; i < process.argv.length; i += 1) {
    const arg = process.argv[i] as string;

    if (arg === '--help' || arg === '-h') {
      usage(stdout);
      process.exit(0);
    }

    if (arg.startsWith('-')) {
      stderr.write(`Unknown option: ${arg}\n`);
      usage(stderr);
      process.exit(1);
    }

    const [name, outputPath] = arg.split(':');

    if (!name || !outputPath) {
      stderr.write(`error: expected e.g. 'fs:src/stubs/fs.ts', got: ${arg}\n`);
      process.exit(1);
    }

    buildStub(name, outputPath);
  }
}
