import fs from 'node:fs';
import path from 'node:path';

/**
 * @param {string} dir
 * @returns {Record<string, string>}
 */
export const findSymlinks = dir => {
  /** @type {Record<string, string>} */
  let results = {};
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isSymbolicLink()) {
      const targetPath = fs.readlinkSync(fullPath);
      results[path.resolve(dir, targetPath)] = fullPath;
    } else if (entry.isDirectory()) {
      results = {
        ...results,
        ...findSymlinks(fullPath),
      };
    }
  }
  return results;
};

/**
 * @param {Record<string, string>} symlinks
 * @param {string} resolvedId
 * @returns {string}
 */
export const replaceSymlink = (symlinks, resolvedId) => {
  for (const target of Object.keys(symlinks).sort((a, b) => b.length - a.length)) {
    if (resolvedId.startsWith(target)) {
      return resolvedId.replace(target, symlinks[target] ?? target);
    }
  }
  return resolvedId;
};
