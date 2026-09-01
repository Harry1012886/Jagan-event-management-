import { useEffect, useMemo, useState } from 'react'
import { GeoMap } from './GeoMap'
import { Select } from './ui/Select'
import { Field, SearchBox, Spinner } from './ui/Primitives'
import { Icon } from './Icon'
import { loadDistrictsGeo, loadStatesGeo } from '../data/geo'
import { INDIA_STATES, STATE_SLUG_BY_NAME, districtsOf } from '../data/indiaLocations'

/**
 * Location field: pick a state on the map of India, the map then opens that
 * state so you can pick the district inside it. Dropdowns mirror the map, so
 * small states like Delhi or Goa are still easy to choose on a phone.
 *
 * Value shape: { state, district, venue }
 */
export function LocationPicker({ value, onChange, error }) {
  const state = value?.state ?? ''
  const district = value?.district ?? ''
  const venue = value?.venue ?? ''

  const slug = STATE_SLUG_BY_NAME[state] ?? ''

  const [statesGeo, setStatesGeo] = useState(null)
  const [districtData, setDistrictData] = useState(null)
  const [failure, setFailure] = useState(null)
  const [districtFilter, setDistrictFilter] = useState('')

  // Keeping the loaded districts tagged with their slug means a slow response
  // for a state you already navigated away from is simply ignored.
  const districtGeo = districtData?.slug === slug ? districtData.geo : null
  const mapError = failure?.key === (slug || 'india') ? failure.message : ''
  const loading = !mapError && (slug ? !districtGeo : !statesGeo)

  useEffect(() => {
    let active = true
    loadStatesGeo()
      .then((geo) => {
        if (active) setStatesGeo(geo)
      })
      .catch((err) => {
        if (active) setFailure({ key: 'india', message: err.message })
      })
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    if (!slug) return undefined
    let active = true
    loadDistrictsGeo(slug)
      .then((geo) => {
        if (active) setDistrictData({ slug, geo })
      })
      .catch((err) => {
        if (active) setFailure({ key: slug, message: err.message })
      })
    return () => {
      active = false
    }
  }, [slug])

  const districts = useMemo(() => districtsOf(state), [state])

  const filteredDistricts = useMemo(() => {
    const term = districtFilter.trim().toLowerCase()
    if (!term) return districts
    return districts.filter((name) => name.toLowerCase().includes(term))
  }, [districts, districtFilter])

  function selectState(nextState) {
    setDistrictFilter('')
    onChange({ state: nextState, district: '', venue })
  }

  function selectDistrict(nextDistrict) {
    onChange({ state, district: nextDistrict, venue })
  }

  const showingDistricts = Boolean(state && districtGeo)

  return (
    <div className="col gap-12">
      <div className="form-grid">
        <Field label="State / Union Territory" required error={error}>
          {(id) => (
            <Select
              id={id}
              value={state}
              onChange={selectState}
              options={INDIA_STATES.map((item) => ({
                value: item.name,
                label: item.name,
                sub: `${item.districts.length} districts`,
              }))}
              placeholder="Select a state"
              searchPlaceholder="Search state…"
              invalid={Boolean(error)}
            />
          )}
        </Field>

        <Field
          label="District"
          hint={state ? `${districts.length} districts in ${state}` : 'Choose a state first'}
        >
          {(id) => (
            <Select
              id={id}
              value={district}
              onChange={selectDistrict}
              options={districts}
              placeholder={state ? 'Select a district' : 'Select a state first'}
              searchPlaceholder="Search district…"
              disabled={!state}
              clearable
            />
          )}
        </Field>
      </div>

      <div className="map-picker">
        <div className="map-stage">
          {mapError ? (
            <div className="map-loading" style={{ position: 'static', padding: 40, textAlign: 'center' }}>
              <Icon name="alert" size={22} />
              <span>{mapError}</span>
            </div>
          ) : (
            <>
              {showingDistricts ? (
                <GeoMap
                  featureCollection={districtGeo}
                  nameKey="district"
                  selectedName={district}
                  onSelect={selectDistrict}
                  regionClass="district"
                  ariaLabel={`Districts of ${state}. Select a district.`}
                />
              ) : (
                <GeoMap
                  featureCollection={statesGeo}
                  nameKey="st_nm"
                  selectedName={state}
                  onSelect={selectState}
                  ariaLabel="Map of India. Select a state."
                />
              )}

              <div className="map-overlay-bar">
                {state ? (
                  <button
                    type="button"
                    className="map-chip button"
                    onClick={() => selectState('')}
                  >
                    <Icon name="arrowLeft" size={13} />
                    All of India
                  </button>
                ) : (
                  <span className="map-chip">
                    <Icon name="globe" size={13} />
                    Tap a state
                  </span>
                )}
                {state && (
                  <span className="map-chip">
                    {district ? `${district}, ${state}` : `${state} — tap a district`}
                  </span>
                )}
              </div>

              {loading && (
                <div className="map-loading">
                  <Spinner size={20} />
                  <span>Loading map…</span>
                </div>
              )}
            </>
          )}
        </div>

        <div className="district-list">
          <div className="text-xs strong text-muted" style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {state ? `Districts of ${state}` : 'States & union territories'}
          </div>

          {state ? (
            <>
              <SearchBox
                value={districtFilter}
                onChange={setDistrictFilter}
                placeholder="Search district…"
              />
              <div className="district-scroll">
                {filteredDistricts.length === 0 && (
                  <div className="select-empty">No district matches “{districtFilter}”.</div>
                )}
                {filteredDistricts.map((name) => (
                  <button
                    key={name}
                    type="button"
                    className={`district-item ${name === district ? 'selected' : ''}`}
                    onClick={() => selectDistrict(name)}
                  >
                    <Icon name="mapPin" size={13} />
                    <span className="grow">{name}</span>
                    {name === district && <Icon name="check" size={14} />}
                  </button>
                ))}
              </div>
            </>
          ) : (
            <div className="district-scroll">
              {INDIA_STATES.map((item) => (
                <button
                  key={item.slug}
                  type="button"
                  className="district-item"
                  onClick={() => selectState(item.name)}
                >
                  <span className="grow">{item.name}</span>
                  <span className="text-xs text-muted">{item.districts.length}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <Field
        label="Venue / address"
        hint="Hall name, street or landmark — shown on the event page."
      >
        {(id) => (
          <input
            id={id}
            className="input"
            value={venue}
            placeholder="e.g. Sri Kalyana Mahal, Anna Nagar"
            onChange={(event) => onChange({ state, district, venue: event.target.value })}
          />
        )}
      </Field>

      {(state || venue) && (
        <div className="location-summary">
          <Icon name="mapPin" size={16} />
          <div>
            <div className="strong">
              {[venue, district, state].filter(Boolean).join(', ')}
            </div>
            <div className="text-xs text-muted">This is how the location will appear.</div>
          </div>
        </div>
      )}
    </div>
  )
}
