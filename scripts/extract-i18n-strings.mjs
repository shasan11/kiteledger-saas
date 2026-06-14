import { promises as fs } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const sourceCandidates = [
    path.join(root, 'resources', 'js'),
    path.join(root, 'Resources', 'js'),
    path.join(root, 'resources', 'views'),
];
const outputPath = path.join(root, 'resources', 'lang', 'en.json');
const extensions = new Set(['.js', '.jsx', '.ts', '.tsx', '.php']);

const textPatterns = [
    />\s*([A-Za-z][^<>{}\n]*?)\s*</g,
    /\b(?:label|title|placeholder|description|aria-label)\s*=\s*["']([^"'{}]+)["']/g,
    /\b(?:label|title|placeholder|description|aria-label)\s*:\s*["']([^"'{}]+)["']/g,
    /\bmessage\.(?:success|error|warning|info)\(\s*["']([^"']+)["']/g,
    /\bnotification\.(?:success|error|warning|info)\(\s*\{[\s\S]{0,300}?\bmessage\s*:\s*["']([^"']+)["']/g,
    /\bModal\.(?:confirm|info|success|error|warning)\(\s*\{[\s\S]{0,300}?\btitle\s*:\s*["']([^"']+)["']/g,
    /\b(?:t|__)\(\s*["']([^"']+)["']/g,
    /\$tr\(\s*["']([^"']+)["']/g,
];

const normalize = (value) => value.replace(/\s+/g, ' ').trim();

const isProbableVisibleText = (value) => {
    if (value.length < 2 || value.length > 240) return false;
    if (!/[A-Za-z]/.test(value)) return false;
    if (/^(?:https?:|\/|\.\/|\.\.\/|#|[a-z0-9_.-]+\/[a-z0-9_./-]+$)/i.test(value)) return false;
    if (/^[a-z0-9_.-]+$/i.test(value) && !value.includes(' ')) return false;
    if (/[<>{}=;]/.test(value)) return false;
    if (/^(?:GET|POST|PUT|PATCH|DELETE)$/i.test(value)) return false;

    return true;
};

async function existingDirectories() {
    const directories = [];
    const seen = new Set();

    for (const candidate of sourceCandidates) {
        try {
            const real = await fs.realpath(candidate);
            const key = real.toLowerCase();

            if (!seen.has(key)) {
                seen.add(key);
                directories.push(real);
            }
        } catch {
            // A repository may only contain one casing of resources/js.
        }
    }

    return directories;
}

async function walk(directory) {
    const files = [];

    for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
        const fullPath = path.join(directory, entry.name);

        if (entry.isDirectory()) {
            files.push(...await walk(fullPath));
        } else if (extensions.has(path.extname(entry.name))) {
            files.push(fullPath);
        }
    }

    return files;
}

async function readTranslations() {
    try {
        const parsed = JSON.parse(await fs.readFile(outputPath, 'utf8'));
        return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
    } catch {
        return {};
    }
}

const directories = await existingDirectories();
const files = (await Promise.all(directories.map(walk))).flat();
const translations = await readTranslations();
const discovered = new Set();

for (const file of files) {
    const source = await fs.readFile(file, 'utf8');

    for (const pattern of textPatterns) {
        pattern.lastIndex = 0;

        for (const match of source.matchAll(pattern)) {
            const value = normalize(match[1]);

            if (isProbableVisibleText(value)) {
                discovered.add(value);
            }
        }
    }
}

for (const key of discovered) {
    if (!(key in translations)) {
        translations[key] = key;
    }
}

const sorted = Object.fromEntries(
    Object.entries(translations).sort(([left], [right]) => left.localeCompare(right)),
);

await fs.mkdir(path.dirname(outputPath), { recursive: true });
await fs.writeFile(outputPath, `${JSON.stringify(sorted, null, 4)}\n`, 'utf8');

console.log(`Scanned ${files.length} files and found ${discovered.size} probable UI strings.`);
console.log(`Wrote ${Object.keys(sorted).length} English translation keys to ${outputPath}.`);
