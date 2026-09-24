import { getCommitInfo, getPullRequestInfo } from "@changesets/get-github-info";

/** @typedef {import("@changesets/types").ChangelogFunctions} ChangelogFunctions */
/** @typedef {import("@changesets/get-github-info").CommitInfo} CommitInfo */
/** @typedef {import("@changesets/get-github-info").PullRequestInfo} PullRequestInfo */

/**
 * @param {CommitInfo | PullRequestInfo | undefined} info GitHub info, `undefined` when not found
 * @returns {{ commit: string | null, pull: string | null, user: string | null }} markdown links
 */
function toLinks(info) {
	return {
		commit: (info && info.commit && info.commit.markdownLink) || null,
		pull: (info && info.pull && info.pull.markdownLink) || null,
		user: (info && info.author && info.author.markdownLink) || null,
	};
}

/**
 * @returns {{ GITHUB_SERVER_URL: string }} value
 */
function readEnv() {
	const GITHUB_SERVER_URL =
		process.env.GITHUB_SERVER_URL || "https://github.com";
	return { GITHUB_SERVER_URL };
}

/** @type {ChangelogFunctions} */
const changelogFunctions = {
	getDependencyReleaseLine: async (
		changesets,
		dependenciesUpdated,
		options,
	) => {
		if (!options.repo) {
			throw new Error(
				'Please provide a repo to this changelog generator like this:\n"changelog": ["@changesets/changelog-github", { "repo": "org/repo" }]',
			);
		}
		if (dependenciesUpdated.length === 0) return "";

		const changesetLink = `- Updated dependencies [${(
			await Promise.all(
				changesets.map(async (cs) => {
					if (cs.commit) {
						const { commit } = toLinks(
							await getCommitInfo({
								repo: options.repo,
								commit: cs.commit,
							}),
						);
						return commit;
					}
				}),
			)
		)
			.filter(Boolean)
			.join(", ")}]:`;

		const updatedDependenciesList = dependenciesUpdated.map(
			(dependency) => `  - ${dependency.name}@${dependency.newVersion}`,
		);

		return [changesetLink, ...updatedDependenciesList].join("\n");
	},
	getReleaseLine: async (changeset, type, options) => {
		const { GITHUB_SERVER_URL } = readEnv();
		if (!options || !options.repo) {
			throw new Error(
				'Please provide a repo to this changelog generator like this:\n"changelog": ["@changesets/changelog-github", { "repo": "org/repo" }]',
			);
		}

		/** @type {number | undefined} */
		let prFromSummary;
		/** @type {string | undefined} */
		let commitFromSummary;
		/** @type {string[]} */
		const usersFromSummary = [];

		const replacedChangelog = changeset.summary
			.replace(/^\s*(?:pr|pull|pull\s+request):\s*#?(\d+)/im, (_, pr) => {
				const num = Number(pr);
				if (!Number.isNaN(num)) prFromSummary = num;
				return "";
			})
			.replace(/^\s*commit:\s*([^\s]+)/im, (_, commit) => {
				commitFromSummary = commit;
				return "";
			})
			.replaceAll(/^\s*(?:author|user):\s*@?([^\s]+)/gim, (_, user) => {
				usersFromSummary.push(user);
				return "";
			})
			.trim();

		const [firstLine, ...futureLines] = replacedChangelog
			.split("\n")
			.map((l) => l.trimEnd());

		const links = await (async () => {
			if (prFromSummary !== undefined) {
				let links = toLinks(
					await getPullRequestInfo({
						repo: options.repo,
						pull: prFromSummary,
					}),
				);
				if (commitFromSummary) {
					const shortCommitId = commitFromSummary.slice(0, 7);
					links = {
						...links,
						commit: `[\`${shortCommitId}\`](${GITHUB_SERVER_URL}/${options.repo}/commit/${commitFromSummary})`,
					};
				}
				return links;
			}
			const commitToFetchFrom = commitFromSummary || changeset.commit;
			if (commitToFetchFrom) {
				return toLinks(
					await getCommitInfo({
						repo: options.repo,
						commit: commitToFetchFrom,
					}),
				);
			}
			return {
				commit: null,
				pull: null,
				user: null,
			};
		})();

		const users = usersFromSummary.length
			? usersFromSummary
					.map(
						(userFromSummary) =>
							`[@${userFromSummary}](${GITHUB_SERVER_URL}/${userFromSummary})`,
					)
					.join(", ")
			: links.user;

		let suffix = "";
		if (links.pull || links.commit || users) {
			suffix = `(${users ? `by ${users} ` : ""}in ${links.pull || links.commit})`;
		}

		return `\n\n- ${firstLine} ${suffix}\n${futureLines.map((l) => `  ${l}`).join("\n")}`;
	},
};

export default changelogFunctions;
