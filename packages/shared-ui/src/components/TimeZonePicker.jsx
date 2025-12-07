import { useMemo } from 'react'
import PropTypes from 'prop-types'
import { getTimeZones } from '@vvo/tzdb'

function formatOffset (minutes) {
  if (!Number.isFinite(minutes)) return 'UTC'
  const sign = minutes >= 0 ? '+' : '-'
  const abs = Math.abs(minutes)
  const hours = String(Math.trunc(abs / 60)).padStart(2, '0')
  const mins = String(abs % 60).padStart(2, '0')
  return `UTC${sign}${hours}:${mins}`
}

export default function TimeZonePicker ({
  value,
  onChange,
  label,
  placeholder,
  helperText,
  error,
  disabled = false,
  id,
  name,
  className,
  favoriteTimeZones,
  timeZones: allowedTimeZones
}) {
  const zones = useMemo(() => {
    const allZones = getTimeZones()
    const allowedSet = allowedTimeZones && allowedTimeZones.length > 0
      ? new Set(allowedTimeZones)
      : null

    const mapped = allZones
      .filter(z => !allowedSet || allowedSet.has(z.name))
      .map((zone) => {
        const offsetLabel = formatOffset(zone.currentTimeOffsetInMinutes)
        const mainCity = Array.isArray(zone.mainCities) && zone.mainCities.length > 0
          ? zone.mainCities[0]
          : null
        const labelParts = [zone.name]
        if (mainCity) labelParts.push(`(${mainCity})`)
        labelParts.push(`— ${offsetLabel}`)
        return {
          id: zone.name,
          label: labelParts.join(' '),
          search: `${zone.name} ${mainCity || ''} ${offsetLabel}`.toLowerCase()
        }
      })

    const favSet = new Set(favoriteTimeZones || [])
    const favorites = []
    const rest = []
    for (const item of mapped) {
      if (favSet.has(item.id)) favorites.push(item)
      else rest.push(item)
    }

    favorites.sort((a, b) => a.label.localeCompare(b.label))
    rest.sort((a, b) => a.label.localeCompare(b.label))

    return { favorites, rest }
  }, [allowedTimeZones, favoriteTimeZones])

  const handleChange = (event) => {
    const next = event.target.value || null
    onChange?.(next)
  }

  const selectId = id || name || 'timezone-picker'

  return (
    <div className={className}>
      <div className='space-y-2'>
        {label ? (
          <label htmlFor={selectId} className='text-sm font-semibold text-foreground'>
            {label}
          </label>
        ) : null}
        <select
          id={selectId}
          name={name}
          disabled={disabled}
          value={value || ''}
          onChange={handleChange}
          className='w-full rounded-2xl border border-border bg-background-subtle px-4 py-3 text-sm text-foreground shadow-soft focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-60'
        >
          <option value=''>{placeholder || 'Zeitzone auswählen'}</option>
          {zones.favorites.length > 0 ? (
            <optgroup label='Favoriten'>
              {zones.favorites.map(zone => (
                <option key={zone.id} value={zone.id}>
                  {zone.label}
                </option>
              ))}
            </optgroup>
          ) : null}
          {zones.rest.length > 0 ? (
            <optgroup label='Alle Zeitzonen'>
              {zones.rest.map(zone => (
                <option key={zone.id} value={zone.id}>
                  {zone.label}
                </option>
              ))}
            </optgroup>
          ) : null}
        </select>
      </div>
      {helperText ? (
        <p className='mt-1 text-xs text-foreground-muted'>{helperText}</p>
      ) : null}
      {error ? (
        <p className='mt-1 text-xs text-destructive'>{error}</p>
      ) : null}
    </div>
  )
}

TimeZonePicker.propTypes = {
  value: PropTypes.string,
  onChange: PropTypes.func.isRequired,
  label: PropTypes.node,
  placeholder: PropTypes.string,
  helperText: PropTypes.string,
  error: PropTypes.string,
  disabled: PropTypes.bool,
  id: PropTypes.string,
  name: PropTypes.string,
  className: PropTypes.string,
  favoriteTimeZones: PropTypes.arrayOf(PropTypes.string),
  timeZones: PropTypes.arrayOf(PropTypes.string)
}
