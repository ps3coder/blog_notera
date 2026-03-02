/**
 * Fetch markdown from GitHub raw URL and parse frontmatter + body to HTML.
 * Used at build time only — no runtime DB, low cost.
 * In-memory + file cache in dev to avoid slow reloads (no repeated GitHub fetches).
 */
import matter from "gray-matter";
import { marked } from "marked";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";

export interface ParsedPost {
	title: string;
	description?: string;
	pubDate?: string;
	tags?: string[];
	draft?: boolean;
	content: string;
	contentHtml: string;
}

const memoryCache = new Map<string, ParsedPost>();

const FILE_CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

async function readFileCache(rawUrl: string): Promise<ParsedPost | null> {
	try {
		const dir = join(process.cwd(), ".blog-cache");
		const filePath = join(dir, "posts.json");
		const data = await readFile(filePath, "utf-8");
		const json = JSON.parse(data) as Record<string, { parsed: ParsedPost; fetchedAt: number }>;
		const entry = json[rawUrl];
		if (!entry || Date.now() - entry.fetchedAt > FILE_CACHE_TTL_MS) return null;
		return entry.parsed;
	} catch {
		return null;
	}
}

async function writeFileCache(rawUrl: string, parsed: ParsedPost): Promise<void> {
	try {
		const dir = join(process.cwd(), ".blog-cache");
		await mkdir(dir, { recursive: true });
		const filePath = join(dir, "posts.json");
		let json: Record<string, { parsed: ParsedPost; fetchedAt: number }> = {};
		try {
			const data = await readFile(filePath, "utf-8");
			json = JSON.parse(data);
		} catch {
			/* fresh file */
		}
		json[rawUrl] = { parsed, fetchedAt: Date.now() };
		await writeFile(filePath, JSON.stringify(json), "utf-8");
	} catch {
		/* ignore write errors */
	}
}

export async function fetchAndParsePost(rawUrl: string): Promise<ParsedPost> {
	const fromMemory = memoryCache.get(rawUrl);
	if (fromMemory) return fromMemory;

	const isDev = import.meta.env?.DEV ?? false;
	if (isDev) {
		const fromFile = await readFileCache(rawUrl);
		if (fromFile) {
			memoryCache.set(rawUrl, fromFile);
			return fromFile;
		}
	}

	const res = await fetch(rawUrl, {
		headers: { "User-Agent": "Astro-Blog-GitHub" },
	});
	if (!res.ok) throw new Error(`Failed to fetch ${rawUrl}: ${res.status}`);
	const text = await res.text();
	const { data, content } = matter(text);
	const contentHtml = (await marked.parse(content)) as string;
	const parsed: ParsedPost = {
		title: (data.title as string) ?? "Untitled",
		description: data.description,
		pubDate: data.pubDate,
		tags: Array.isArray(data.tags) ? data.tags : undefined,
		draft: data.draft,
		content,
		contentHtml,
	};

	memoryCache.set(rawUrl, parsed);
	if (isDev) await writeFileCache(rawUrl, parsed);
	return parsed;
}
