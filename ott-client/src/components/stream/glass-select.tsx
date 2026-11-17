/*
 * Adapted from "Liquid Select" by liquefy-ui on 21st.dev:
 * https://21st.dev/@liquefy-ui/components/liquid-select
 * Kept: the glass pill trigger, a frosted listbox popover with typeahead search, keyboard navigation and a
 * check on the selected row.
 * Changes: Base UI's Select and the liquefy WebGL "liquid glass" trigger are replaced by the kit's Radix
 * Popover and cmdk Command (no new UI library, no extra canvas); an "Any" row clears the value; stream glass
 * tokens; the list is marked data-lenis-prevent so the wheel scrolls the list, not the page.
 */
import { useState } from 'react'
import { Check, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'

export type GlassSelectOption = { value: string; label: string; hint?: string }

type GlassSelectProps = {
  /** Field name, e.g. "Country" */
  label: string
  value?: string
  options: GlassSelectOption[]
  onChange: (value: string | undefined) => void
  /** Text for the "no filter" row; null leaves the row out (a value is always set) */
  anyLabel?: string | null
  className?: string
}

export function GlassSelect({
  label,
  value,
  options,
  onChange,
  anyLabel = 'Any',
  className,
}: GlassSelectProps) {
  const [open, setOpen] = useState(false)
  const selected = options.find((o) => o.value === value)
  const searchable = options.length > 8

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        className={cn(
          'inline-flex h-10 max-w-[15rem] shrink-0 items-center gap-2 rounded-full glass pr-3 pl-4 text-sm transition-colors outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring data-[state=open]:bg-accent',
          className
        )}
        aria-label={selected ? `${label}: ${selected.label}` : `${label}: any`}
      >
        <span className='text-muted-foreground'>{label}</span>
        {selected && (
          <>
            <span
              aria-hidden='true'
              className='size-1.5 shrink-0 rounded-full bg-stream-gradient'
            />
            <span className='truncate font-medium'>{selected.label}</span>
          </>
        )}
        <ChevronDown
          aria-hidden='true'
          className={cn(
            'size-4 shrink-0 text-muted-foreground transition-transform duration-200',
            open && 'rotate-180'
          )}
        />
      </PopoverTrigger>
      <PopoverContent
        align='start'
        sideOffset={8}
        className='w-64 rounded-2xl border-0 glass-strong p-1.5'
      >
        <Command className='bg-transparent'>
          {searchable && (
            <CommandInput
              placeholder={`Search ${label.toLowerCase()}…`}
              className='h-10'
            />
          )}
          <CommandList data-lenis-prevent className='max-h-72'>
            <CommandEmpty>No match.</CommandEmpty>
            {anyLabel !== null && (
              <CommandItem
                value={`__any ${anyLabel}`}
                onSelect={() => {
                  onChange(undefined)
                  setOpen(false)
                }}
                className='rounded-lg'
              >
                <span className='flex-1 text-muted-foreground'>{anyLabel}</span>
                {!selected && <Check aria-hidden='true' className='size-4' />}
              </CommandItem>
            )}
            {options.map((o) => (
              <CommandItem
                key={o.value}
                value={`${o.label} ${o.value}`}
                onSelect={() => {
                  onChange(o.value)
                  setOpen(false)
                }}
                className='rounded-lg'
              >
                <span className='flex-1 truncate'>{o.label}</span>
                {o.hint && (
                  <span className='text-xs text-muted-foreground tabular-nums'>
                    {o.hint}
                  </span>
                )}
                {o.value === value && (
                  <Check aria-hidden='true' className='size-4' />
                )}
              </CommandItem>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
