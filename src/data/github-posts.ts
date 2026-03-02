/**
 * Blog posts live on GitHub. Add entries here to showcase them.
 * No database — just add a row and redeploy.
 *
 * rawUrl = use "raw" view, e.g.:
 *   GitHub:  https://github.com/ps3coder/blog_notera/blob/main/src/content/blog/engineering-clarity-in-modern-systems.md
 *   Raw:     https://raw.githubusercontent.com/ps3coder/blog_notera/main/src/content/blog/engineering-clarity-in-modern-systems.md
 */
export interface GitHubPostEntry {
	slug: string;
	rawUrl: string;
}

export const GITHUB_POSTS: GitHubPostEntry[] = [
	{
		slug: "engineering-clarity-in-modern-systems",
		rawUrl:
			"https://raw.githubusercontent.com/ps3coder/blog_notera/main/src/content/blog/engineering-clarity-in-modern-systems.md",
	},
];

export function getRawUrlFromBlob(blobUrl: string): string {
	// https://github.com/owner/repo/blob/branch/path/to/file.md
	// -> https://raw.githubusercontent.com/owner/repo/branch/path/to/file.md
	const match = blobUrl.match(
		/^https:\/\/github\.com\/([^/]+)\/([^/]+)\/blob\/([^/]+)\/(.+)$/
	);
	if (!match) return blobUrl;
	const [, owner, repo, branch, path] = match;
	return `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${path}`;
}
