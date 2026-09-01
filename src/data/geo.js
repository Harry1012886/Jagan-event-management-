/**
 * Loaders for the map files in public/geo.
 *
 * The national outline is one small file; district shapes are fetched only for
 * the state you actually open, so the first paint stays fast on mobile data.
 * Each file is cached after the first load.
 */

const cache = new Map()

function assetUrl(path) {
  // BASE_URL keeps this correct if the site is ever hosted under a sub-path.
  return `${import.meta.env.BASE_URL}${path}`.replace(/([^:]\/)\/+/g, '$1')
}

function loadJson(key, path) {
  if (!cache.has(key)) {
    cache.set(
      key,
      fetch(assetUrl(path))
        .then((response) => {
          if (!response.ok) {
            throw new Error(`Could not load map data (${response.status})`)
          }
          return response.json()
        })
        .catch((error) => {
          // Let a later attempt retry instead of caching the failure forever.
          cache.delete(key)
          throw error
        }),
    )
  }
  return cache.get(key)
}

/** FeatureCollection of all 36 states and union territories. */
export function loadStatesGeo() {
  return loadJson('states', 'geo/india-states.json')
}

/** FeatureCollection of the districts inside one state. */
export function loadDistrictsGeo(slug) {
  return loadJson(`districts:${slug}`, `geo/districts/${slug}.json`)
}
