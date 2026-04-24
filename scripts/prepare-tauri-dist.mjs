import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const distDir = path.join(root, ".tauri-dist");
const standaloneDir = path.join(root, ".next", "standalone");
const staticDir = path.join(root, ".next", "static");
const publicDir = path.join(root, "public");
const oldNodeModulesDir = path.join(distDir, "node_modules");
const depsDir = path.join(distDir, "deps");

function copyDirectory(source, destination) {
  if (!fs.existsSync(source)) {
    throw new Error(`Missing build output: ${path.relative(root, source)}`);
  }

  fs.cpSync(source, destination, {
    recursive: true,
    force: true,
    dereference: false,
  });
}

function rewriteNodeModuleSymlinks(directory) {
  for (const entry of fs.readdirSync(directory)) {
    const entryPath = path.join(directory, entry);
    const stat = fs.lstatSync(entryPath);

    if (stat.isDirectory()) {
      rewriteNodeModuleSymlinks(entryPath);
      continue;
    }

    if (!stat.isSymbolicLink()) {
      continue;
    }

    const target = fs.readlinkSync(entryPath);
    const targetPath = path.resolve(path.dirname(entryPath), target);

    if (!targetPath.startsWith(`${oldNodeModulesDir}${path.sep}`)) {
      continue;
    }

    const dependencyPath = path.relative(oldNodeModulesDir, targetPath);
    const nextTarget = path.relative(
      path.dirname(entryPath),
      path.join(depsDir, dependencyPath),
    );

    fs.unlinkSync(entryPath);
    fs.symlinkSync(nextTarget, entryPath);
  }
}

fs.rmSync(distDir, { recursive: true, force: true });
copyDirectory(standaloneDir, distDir);
fs.renameSync(oldNodeModulesDir, depsDir);
rewriteNodeModuleSymlinks(distDir);
copyDirectory(staticDir, path.join(distDir, ".next", "static"));
copyDirectory(publicDir, path.join(distDir, "public"));
