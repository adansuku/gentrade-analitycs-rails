import fs from 'node:fs/promises';
import path from 'node:path';

function kebabCase(input) {
  return String(input)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-+/g, '-');
}

async function readTemplate(relPath) {
  const p = path.join(process.cwd(), relPath);
  return fs.readFile(p, 'utf8');
}

async function writeIfMissing(filePath, content) {
  try {
    await fs.access(filePath);
  } catch {
    await fs.writeFile(filePath, content, 'utf8');
  }
}

async function main() {
  const title = process.argv.slice(2).join(' ').trim();
  if (!title) {
    console.error('Usage: node scripts/new-spec.mjs "Titulo del spec"');
    process.exit(1);
  }

  const slug = kebabCase(title);
  const dir = path.join(process.cwd(), 'specs', slug);
  await fs.mkdir(dir, { recursive: true });

  const specTpl = (await readTemplate('specs/_templates/SPEC.template.md')).replaceAll('<TITLE>', title);
  const planTpl = (await readTemplate('specs/_templates/PLAN.template.md')).replaceAll('<TITLE>', title);
  const tasksTpl = (await readTemplate('specs/_templates/TASKS.template.md')).replaceAll('<TITLE>', title);

  await writeIfMissing(path.join(dir, 'SPEC.md'), specTpl);
  await writeIfMissing(path.join(dir, 'PLAN.md'), planTpl);
  await writeIfMissing(path.join(dir, 'TASKS.md'), tasksTpl);

  const indexPath = path.join(process.cwd(), 'specs', 'README.md');
  let index = '';
  try {
    index = await fs.readFile(indexPath, 'utf8');
  } catch {
    index = '# Specs\n\n';
  }

  const line = `- \`${slug}\`: ${title} (SPEC/PLAN/TASKS)\n`;
  if (!index.includes(`\`${slug}\``)) {
    // Keep it simple: append.
    if (!index.endsWith('\n')) index += '\n';
    index += line;
    await fs.writeFile(indexPath, index, 'utf8');
  }

  console.log(`Created/updated specs/${slug}/ (SPEC.md, PLAN.md, TASKS.md)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
