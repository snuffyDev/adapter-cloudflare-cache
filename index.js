import toml from '@iarna/toml';
import { execSync } from 'child_process';
import esbuild from 'esbuild';
import fs from 'fs';
import { fileURLToPath } from 'url';

/**
 * @typedef {import('esbuild').BuildOptions} BuildOptions
 */

/**
 * @param {{
 *   esbuild?: (defaultOptions: BuildOptions) => Promise<BuildOptions> | BuildOptions;
 * }} [options]
 **/
export default function (options = {}) {
	/** @type {import('@sveltejs/kit').Adapter} */
	const adapter = {
		name: '@snuffydev/adapter-cloudflare-cache',
		async adapt({ utils }) {
			const { site } = validate_config(utils);

			const bucket = site.bucket;
			const entrypoint = site['entry-point'] || 'workers-site';

			const files = fileURLToPath(new URL('./files', import.meta.url));

			// utils.update_ignores({ patterns: [bucket, entrypoint] });

			utils.rimraf(bucket);
			utils.rimraf(entrypoint);

			utils.log.info('Installing worker dependencies...');
			utils.copy(`${files}/_package.json`, '.svelte-kit/cloudflare-workers/package.json');

			// TODO would be cool if we could make this step unnecessary somehow
			const stdout = execSync('npm install', { cwd: '.svelte-kit/cloudflare-workers' });
			utils.log.info(stdout.toString());

			utils.log.minor('Generating worker...');
			utils.copy(`${files}/entry.js`, '.svelte-kit/cloudflare-workers/entry.js');

			const {
				pageCacheTTL = null,
				staticCacheTTL = 60 * 60 * 24 * 90, // 90 days
				edgeCacheTTL = 60 * 60 * 24 * 90 // 90 days
			} = options;

			await esbuild.build({
				entryPoints: ['.svelte-kit/cloudflare-workers/entry.js'],
				outfile: `${entrypoint}/index.js`,
				bundle: true,
				target: 'es2020',
				platform: 'browser', // TODO would be great if we could generate ESM and use type = "javascript"
				define: {
					PAGE_CACHE_TTL: pageCacheTTL,
					STATIC_CACHE_TTL: staticCacheTTL,
					EDGE_CACHE_TTL: edgeCacheTTL
				}
			});

			fs.writeFileSync(`${entrypoint}/package.json`, JSON.stringify({ main: 'index.js' }));

			utils.log.info('Prerendering static pages...');
			await utils.prerender({
				dest: bucket
			});

			utils.log.minor('Copying assets...');
			utils.copy_static_files(bucket);
			utils.copy_client_files(bucket);
		}
	};

	return adapter;
}

function validate_config(utils) {
	if (fs.existsSync('wrangler.toml')) {
		let wrangler_config;

		try {
			wrangler_config = toml.parse(fs.readFileSync('wrangler.toml', 'utf-8'));
		} catch (err) {
			err.message = `Error parsing wrangler.toml: ${err.message}`;
			throw err;
		}

		if (!wrangler_config.site || !wrangler_config.site.bucket) {
			throw new Error(
				'You must specify site.bucket in wrangler.toml. Consult https://developers.cloudflare.com/workers/platform/sites/configuration'
			);
		}

		return wrangler_config;
	}

	utils.log.error(
		'Consult https://developers.cloudflare.com/workers/platform/sites/configuration on how to setup your site'
	);

	utils.log(
		`
		Sample wrangler.toml:

		name = "<your-site-name>"
		type = "javascript"
		account_id = "<your-account-id>"
		workers_dev = true
		route = ""
		zone_id = ""

		[site]
		bucket = "./.cloudflare/assets"
		entry-point = "./.cloudflare/worker"`
			.replace(/^\t+/gm, '')
			.trim()
	);

	throw new Error('Missing a wrangler.toml file');
}
