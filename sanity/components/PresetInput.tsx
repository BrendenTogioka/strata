import { useCallback, useId } from 'react'
import { set, unset, type StringInputProps } from 'sanity'
import { TextInput } from '@sanity/ui'

// Factory that returns a string-input component preloaded with a curated
// suggestion list. The user sees a native browser dropdown of suggestions but
// can still type any value — perfect for keeping labels consistent across
// posts without locking the editor into a fixed list.
export function createPresetInput(presets: string[]) {
  return function PresetInput(props: StringInputProps) {
    const { value, onChange, elementProps } = props
    const listId = `preset-${useId()}`

    const handleChange = useCallback(
      (event: React.ChangeEvent<HTMLInputElement>) => {
        const next = event.currentTarget.value
        onChange(next ? set(next) : unset())
      },
      [onChange],
    )

    return (
      <>
        <TextInput
          {...elementProps}
          list={listId}
          value={value ?? ''}
          onChange={handleChange}
        />
        <datalist id={listId}>
          {presets.map((p) => (
            <option key={p} value={p} />
          ))}
        </datalist>
      </>
    )
  }
}
