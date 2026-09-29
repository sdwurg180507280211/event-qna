// Copy only Prisma CLI and its transitive dependencies into the runtime image.
const fs = require('node:fs');
const path = require('node:path');
const modules = path.resolve('node_modules');
const target = '/migration-tools/node_modules';
const visited = new Set();
function copy(name, from = process.cwd()) {
  let current = from, source;
  while (true) {
    const candidate = path.join(current, 'node_modules', name);
    if (fs.existsSync(path.join(candidate, 'package.json'))) { source = candidate; break; }
    const parent = path.dirname(current);
    if (parent === current) return;
    current = parent;
  }
  if (visited.has(source)) return;
  visited.add(source);
  const destination = path.join(target, path.relative(modules, source));
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.cpSync(source, destination, { recursive: true });
  const pkg = JSON.parse(fs.readFileSync(path.join(source, 'package.json')));
  for (const dep of Object.keys({ ...pkg.dependencies, ...pkg.optionalDependencies })) copy(dep, source);
}
copy('prisma');
