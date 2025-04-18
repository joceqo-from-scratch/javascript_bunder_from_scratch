import JestHastMap from "jest-haste-map";
import { join } from "node:path";
import { cpus } from "node:os";
import yargs from "yargs";
import chalk from "chalk";
import Resolver from "jest-resolve";
import { DependencyResolver } from "jest-resolve-dependencies";

const root = join(process.cwd(), "product");

const hasteMapOptions = {
	extensions: ["js"],
	name: "jest-bundler",
	platforms: [],
	rootDir: root,
	roots: [root],
	maxWorkers: cpus().length,
};

const hasteMap = new JestHastMap.default(hasteMapOptions);

await hasteMap.setupCachePath(hasteMapOptions);
const { hasteFS, moduleMap } = await hasteMap.build();

console.log("HasteFS:", hasteFS.getAllFiles());

const options = yargs(process.argv).argv;
const entryPoint = options.entryPoint || "";

console.log("entryPoint", entryPoint);

if (!hasteFS.exists(entryPoint)) {
	throw new Error(`Entry point ${entryPoint} does not exist`);
}

console.log(chalk.bold(`❯ Building ${chalk.blue(options.entryPoint)}`));

const resolver = new Resolver.default(moduleMap, {
	extensions: [".js"],
	hasCoreModules: false,
	rootDir: root,
});
const dependencyResolver = new DependencyResolver(resolver, hasteFS);

console.log(dependencyResolver.resolve(entryPoint));

const allFiles = new Set();
const queue = [entryPoint];
while (queue.length) {
  const module = queue.shift();
  // Ensure we process each module at most once
  // to guard for cycles.
  if (allFiles.has(module)) {
    continue;
  }

  allFiles.add(module);
  queue.push(...dependencyResolver.resolve(module));
}

console.log(chalk.bold(`❯ Found ${chalk.blue(allFiles.size)} files`));
console.log(Array.from(allFiles));
// ['/path/to/entry-point.js', '/path/to/apple.js', …]
