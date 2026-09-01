import { useMemo, useState } from 'react'

const WIDTH = 520
const HEIGHT = 560
const PADDING = 10

/**
 * Renders a GeoJSON FeatureCollection as a clickable SVG map.
 *
 * The projection is plain Mercator, computed here rather than through d3-geo.
 * d3-geo treats polygons as spherical, so a ring wound the wrong way is drawn as
 * "everything except this shape" — which turned the whole map into one solid
 * block. India sits well away from the poles and the antimeridian, so a direct
 * Mercator transform is exact for this data and cannot be tripped up by winding
 * order.
 */
export function GeoMap({
  featureCollection,
  nameKey,
  selectedName,
  onSelect,
  regionClass = '',
  ariaLabel,
}) {
  const [hover, setHover] = useState(null)

  const paths = useMemo(
    () => buildPaths(featureCollection, nameKey),
    [featureCollection, nameKey],
  )

  return (
    <>
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        role="group"
        aria-label={ariaLabel}
        onMouseLeave={() => setHover(null)}
      >
        {paths.map((region) => (
          <path
            key={region.name}
            d={region.d}
            className={`map-region ${regionClass} ${
              region.name === selectedName ? 'selected' : ''
            }`}
            tabIndex={0}
            role="button"
            aria-label={region.name}
            aria-pressed={region.name === selectedName}
            onClick={() => onSelect(region.name)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault()
                onSelect(region.name)
              }
            }}
            onMouseEnter={() => setHover(region)}
            onFocus={() => setHover(region)}
            onBlur={() => setHover(null)}
          >
            <title>{region.name}</title>
          </path>
        ))}
      </svg>

      {hover && (
        <span
          className="map-tooltip"
          style={{
            left: `${(hover.cx / WIDTH) * 100}%`,
            top: `${(hover.cy / HEIGHT) * 100}%`,
          }}
        >
          {hover.name}
        </span>
      )}
    </>
  )
}

/**
 * Mercator world coordinates. Both axes must be in the same units for the
 * aspect ratio to come out right, so longitude is converted to radians to match
 * the natural-log scale that the latitude formula produces.
 */
function mercatorX(longitude) {
  return (longitude * Math.PI) / 180
}

function mercatorY(latitude) {
  const clamped = Math.max(-85, Math.min(85, latitude))
  const radians = (clamped * Math.PI) / 180
  return Math.log(Math.tan(Math.PI / 4 + radians / 2))
}

/** Every ring of a Polygon or MultiPolygon, as arrays of [lon, lat]. */
function ringsOf(geometry) {
  if (!geometry) return []
  if (geometry.type === 'Polygon') return geometry.coordinates
  if (geometry.type === 'MultiPolygon') return geometry.coordinates.flat()
  return []
}

function buildPaths(featureCollection, nameKey) {
  const features = featureCollection?.features
  if (!features?.length) return []

  // Fit everything on screen, keeping the shape's true proportions.
  let minX = Infinity
  let maxX = -Infinity
  let minY = Infinity
  let maxY = -Infinity

  for (const feature of features) {
    for (const ring of ringsOf(feature.geometry)) {
      for (const [lon, lat] of ring) {
        const x = mercatorX(lon)
        const y = mercatorY(lat)
        if (x < minX) minX = x
        if (x > maxX) maxX = x
        if (y < minY) minY = y
        if (y > maxY) maxY = y
      }
    }
  }

  if (!Number.isFinite(minX) || !Number.isFinite(minY)) return []

  const spanX = maxX - minX || 1
  const spanY = maxY - minY || 1
  const scale = Math.min((WIDTH - PADDING * 2) / spanX, (HEIGHT - PADDING * 2) / spanY)
  const offsetX = (WIDTH - spanX * scale) / 2
  const offsetY = (HEIGHT - spanY * scale) / 2

  const projectX = (lon) => offsetX + (mercatorX(lon) - minX) * scale
  // Latitude grows upwards but SVG y grows downwards, so this axis is flipped.
  const projectY = (lat) => offsetY + (maxY - mercatorY(lat)) * scale

  return features
    .map((feature) => {
      const rings = ringsOf(feature.geometry)
      if (!rings.length) return null

      let d = ''
      let largest = null
      let largestArea = -1

      for (const ring of rings) {
        if (ring.length < 3) continue

        let segment = ''
        let ringMinX = Infinity
        let ringMaxX = -Infinity
        let ringMinY = Infinity
        let ringMaxY = -Infinity

        for (let index = 0; index < ring.length; index += 1) {
          const x = projectX(ring[index][0])
          const y = projectY(ring[index][1])
          segment += `${index === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`
          if (x < ringMinX) ringMinX = x
          if (x > ringMaxX) ringMaxX = x
          if (y < ringMinY) ringMinY = y
          if (y > ringMaxY) ringMaxY = y
        }

        d += `${segment}Z`

        // The biggest ring is the mainland, so put the tooltip there rather than
        // on a small offshore island.
        const area = (ringMaxX - ringMinX) * (ringMaxY - ringMinY)
        if (area > largestArea) {
          largestArea = area
          largest = { cx: (ringMinX + ringMaxX) / 2, cy: (ringMinY + ringMaxY) / 2 }
        }
      }

      if (!d) return null

      return {
        name: feature.properties?.[nameKey] ?? '',
        d,
        cx: largest?.cx ?? WIDTH / 2,
        cy: largest?.cy ?? HEIGHT / 2,
      }
    })
    .filter(Boolean)
}
