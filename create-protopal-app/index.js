#!/usr/bin/env node

import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import { green, blue, red, yellow } from 'kolorist';
import { execSync } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function init() {
  console.log();
  console.log(blue('✨ Create Protopal App'));
  console.log();

  // Get project name from args
  const projectName = process.argv[2];

  if (!projectName) {
    console.error(red('Error: Please provide a project name'));
    console.log();
    console.log('Usage:');
    console.log(`  ${green('npx create-protopal-app')} ${yellow('<project-name>')}`);
    console.log();
    console.log('Example:');
    console.log(`  ${green('npx create-protopal-app my-app')}`);
    process.exit(1);
  }

  const targetDir = path.resolve(process.cwd(), projectName);

  // Check if directory exists
  if (fs.existsSync(targetDir)) {
    console.error(red(`Error: Directory ${projectName} already exists`));
    process.exit(1);
  }

  console.log(`Creating project in ${green(targetDir)}...`);

  // Copy template files
  const templateDir = path.join(__dirname, 'template');
  await fs.copy(templateDir, targetDir);

  // Update package.json with project name
  const packageJsonPath = path.join(targetDir, 'package.json');
  const packageJson = await fs.readJson(packageJsonPath);
  packageJson.name = projectName;
  await fs.writeJson(packageJsonPath, packageJson, { spaces: 2 });

  console.log();
  console.log(green('✓ Project created successfully!'));
  console.log();
  console.log('Next steps:');
  console.log();
  console.log(`  ${blue('cd')} ${projectName}`);
  console.log(`  ${blue('npm install')}`);
  console.log(`  ${blue('npm run dev')}`);
  console.log();
  console.log('Start building your domain model in:');
  console.log(`  ${yellow('src/model.ts')}  - Define your domain types`);
  console.log(`  ${yellow('src/system.ts')} - Wire your deciders`);
  console.log(`  ${yellow('src/App.tsx')}   - Build your UI`);
  console.log();
  console.log(green('Happy prototyping! 🚀'));
}

init().catch((e) => {
  console.error(red('Error:'), e);
  process.exit(1);
});