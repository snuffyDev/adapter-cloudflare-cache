# adapter-cloudflare-cache

# WARNING!

> This adapter is ***not*** considered stable, not recommended for production use.

This adapter implements SvelteKit Issue [#1771](https://github.com/sveltejs/kit/pull/1771), which adds cache configuration to Cloudflare Workers. Mainly meant to be used on my project [Beatbump](https://github.com/snuffyDev/Beatbump). I have not tested the configuration aspect, and the Intellisense info was not updated. *However*, I did update the adapter to the current latest version 1.0.0-next.17.

__*Only updates to this repo will be for bug fixes, stability, or required functionality changes.*__

### Install

```sh
npm install -D @snuffydev/adapter-cloudflare-cache
```

## Original README Below

SvelteKit adapter that creates a Cloudflare Workers site using a function for dynamic server rendering.

This is very experimental; the adapter API isn't at all fleshed out, and things will definitely change.

## Configuration

This adapter expects to find a [wrangler.toml](https://developers.cloudflare.com/workers/platform/sites/configuration) file in the project root. It will determine where to write static assets and the worker based on the `site.bucket` and `site.entry-point` settings.

Generate this file using `wrangler` from your project directory

```sh
$ wrangler init --site my-site-name
```

Then configure your sites build directory in the config file:

```toml
[site]
bucket = "./build"
entry-point = "./workers-site"
```

The adapter accepts the following configuration properties:
| property | default | description |
|---|---|---|
| `pageCacheTTL` | `null` | Sets `cache-control` `max-age` for rendered responses if not defined. WARNING: this will apply to all page/request routes, disabled by default for security reasons. |
| `staticCacheTTL` | `60 * 60 * 24 * 90` (90 days) | Sets `cache-control` `max-age` for static assets. |
| `edgeCacheTTL` | `60 * 60 * 24 * 90` (90 days) | Sets CloudFlare Edge Cache TTL for static assets. |

It's recommended that you add the `build` and `workers-site` folders (or whichever other folders you specify) to your `.gitignore`.

More info on configuring a cloudflare worker site can be found [here](https://developers.cloudflare.com/workers/platform/sites/start-from-existing)
