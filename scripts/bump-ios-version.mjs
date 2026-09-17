import { readFile, writeFile } from "node:fs/promises";

const projectFile = new URL(
  "../ios/App/App.xcodeproj/project.pbxproj",
  import.meta.url,
);
const requestedVersion = process.argv[2];

function fail(message) {
  console.error(`Error: ${message}`);
  console.error("Usage: npm run ios:version -- <patch|minor|major|x.y.z>");
  process.exit(1);
}

function parseVersion(version) {
  const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(version);
  if (!match) fail(`\"${version}\" is not a version in x.y.z format.`);
  return match.slice(1).map(Number);
}

function nextVersion(current, requested) {
  const [major, minor, patch] = parseVersion(current);

  if (requested === "major") return `${major + 1}.0.0`;
  if (requested === "minor") return `${major}.${minor + 1}.0`;
  if (requested === "patch") return `${major}.${minor}.${patch + 1}`;

  const target = parseVersion(requested);
  const currentParts = [major, minor, patch];
  for (let index = 0; index < target.length; index += 1) {
    if (target[index] > currentParts[index]) return requested;
    if (target[index] < currentParts[index]) {
      fail(`\"${requested}\" must be greater than the current version (${current}).`);
    }
  }
  fail(`\"${requested}\" is already the current iOS version.`);
}

if (!requestedVersion) fail("A version increment is required.");

const project = await readFile(projectFile, "utf8");
const versions = [...project.matchAll(/MARKETING_VERSION = ([^;]+);/g)].map(
  ([, version]) => version,
);

if (versions.length === 0) {
  fail("MARKETING_VERSION was not found in the Xcode project.");
}
if (new Set(versions).size !== 1) {
  fail("Debug and Release MARKETING_VERSION values do not match.");
}

const currentVersion = versions[0];
const version = nextVersion(currentVersion, requestedVersion);
const updatedProject = project.replaceAll(
  `MARKETING_VERSION = ${currentVersion};`,
  `MARKETING_VERSION = ${version};`,
);

await writeFile(projectFile, updatedProject);
console.log(`iOS marketing version: ${currentVersion} → ${version}`);
