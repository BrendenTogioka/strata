import { useCallback } from 'react'
import { set, unset, type StringInputProps } from 'sanity'
import { TextInput } from '@sanity/ui'

// Custom string input that uppercases every keystroke. Used on pageTitle lines
// so editors can type any case and the hero title stays visually consistent.
export function UppercaseInput(props: StringInputProps) {
  const { value, onChange, elementProps } = props

  const handleChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const next = event.currentTarget.value.toUpperCase()
      onChange(next ? set(next) : unset())
    },
    [onChange],
  )

  return (
    <TextInput
      {...elementProps}
      value={value ?? ''}
      onChange={handleChange}
    />
  )
}
