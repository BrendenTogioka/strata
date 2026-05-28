import { useCallback, useState } from 'react'
import { set, unset, useFormValue, type StringInputProps } from 'sanity'
import { TextInput, Button, Flex, Box, Text } from '@sanity/ui'

// Convert decimal degrees → degrees + decimal minutes, e.g. 36.43 → "36°25′N"
function toDM(decimal: number, isLat: boolean): string {
  const dir = isLat ? (decimal >= 0 ? 'N' : 'S') : (decimal >= 0 ? 'E' : 'W')
  const abs = Math.abs(decimal)
  const deg = Math.floor(abs)
  const min = Math.floor((abs - deg) * 60)
  return `${deg}°${min}′${dir}`
}

type Status = 'idle' | 'loading' | 'error'

export function CoordsLookupInput(props: StringInputProps) {
  const { value, onChange, elementProps } = props
  const location = useFormValue(['location']) as string | undefined
  const [status, setStatus] = useState<Status>('idle')

  const handleChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const next = event.currentTarget.value
      onChange(next ? set(next) : unset())
    },
    [onChange],
  )

  const lookup = useCallback(async () => {
    if (!location) return
    setStatus('loading')
    try {
      const url =
        `https://nominatim.openstreetmap.org/search` +
        `?q=${encodeURIComponent(location)}&format=json&limit=1`
      const res  = await fetch(url, { headers: { 'Accept-Language': 'en' } })
      const data = await res.json()
      if (!Array.isArray(data) || data.length === 0) { setStatus('error'); return }
      const lat       = parseFloat(data[0].lat)
      const lon       = parseFloat(data[0].lon)
      const formatted = `${toDM(lat, true)} ${toDM(lon, false)}`
      onChange(set(formatted))
      setStatus('idle')
    } catch {
      setStatus('error')
    }
  }, [location, onChange])

  return (
    <Flex gap={2} align="center">
      <Box flex={1}>
        <TextInput
          {...elementProps}
          value={value ?? ''}
          onChange={handleChange}
          placeholder='e.g. "36°26′N 114°31′W" — or fill Location and click Lookup'
        />
      </Box>
      <Button
        text={status === 'loading' ? 'Looking up…' : 'Lookup'}
        tone={status === 'error' ? 'critical' : 'default'}
        mode="ghost"
        onClick={lookup}
        disabled={!location || status === 'loading'}
        fontSize={1}
        padding={3}
      />
      {status === 'error' && (
        <Text size={1} muted>Location not found</Text>
      )}
    </Flex>
  )
}
