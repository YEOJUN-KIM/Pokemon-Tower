// pnpm uses relative directory links. Next's Windows fallback currently only
// handles absolute links; allow relative directory links as junctions too.
// This preload runs only for the build, without changing Node or Next on disk.
const fs = require('node:fs');
const path = require('node:path');
if (process.platform === 'win32') {
  const original = fs.promises.symlink;
  fs.promises.symlink = async (target, destination, type) => {
    try {
      return await original(target, destination, type);
    } catch (error) {
      if (error.code !== 'EPERM' || type === 'junction') throw error;
      const absolute = path.resolve(path.dirname(destination), target);
      // Junctions only support directories. Preserve genuine file-link errors.
      const standalone = path.resolve('.next/standalone');
      const within = path.relative(standalone, absolute);
      if (within.startsWith('..') || path.isAbsolute(within)) throw error;
      // Trace copying is parallel: the output target may not exist yet. Inspect
      // its original dependency instead, then link to the eventual output path.
      const info = await fs.promises.stat(absolute).catch(() =>
        fs.promises.stat(path.resolve(within)).catch(() => null));
      if (!info?.isDirectory()) throw error;
      return original(absolute, destination, 'junction');
    }
  };
}
