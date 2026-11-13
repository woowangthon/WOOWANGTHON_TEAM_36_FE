import { Info } from 'lucide-react'
import { Popover, Tooltip } from 'radix-ui'
import { useEffect, useRef, useState } from 'react'

type HelpText = { label: string; description: string }
type HelpLink = { href: string; label: string }

const triggerClass =
  'inline-grid size-6 shrink-0 place-items-center rounded-full text-muted-foreground hover:text-brand-800 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none'
const contentClass =
  'z-50 w-64 max-w-[calc(100vw-2rem)] rounded-lg border border-brand-200 bg-background p-3 text-xs leading-relaxed break-keep shadow-md'

export function HelpIcon({ label, description, link }: HelpText & { link?: HelpLink }) {
  if (link) return <LinkedHelp label={label} description={description} link={link} />
  return <TextHelp label={label} description={description} />
}

function TextHelp({ label, description }: HelpText) {
  const [open, setOpen] = useState(false)

  return (
    <Tooltip.Provider delayDuration={150}>
      <Tooltip.Root open={open} onOpenChange={setOpen}>
        <Tooltip.Trigger
          type="button"
          aria-label={label}
          className={triggerClass}
          onClick={(event) => {
            // Radix closes tooltips on click. A tap should open this one.
            event.preventDefault()
            setOpen(true)
          }}
        >
          <Info aria-hidden="true" className="size-4" />
        </Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Content sideOffset={6} collisionPadding={16} className={contentClass}>
            {description}
          </Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip.Root>
    </Tooltip.Provider>
  )
}

function LinkedHelp({ label, description, link }: HelpText & { link: HelpLink }) {
  const [openBy, setOpenBy] = useState<'hover' | 'press' | null>(null)
  const closeTimer = useRef<ReturnType<typeof setTimeout>>(undefined)
  const linkRef = useRef<HTMLAnchorElement>(null)
  const restoreFocus = useRef(false)

  useEffect(() => () => clearTimeout(closeTimer.current), [])

  function closeAfterLeaving() {
    clearTimeout(closeTimer.current)
    closeTimer.current = setTimeout(() => {
      setOpenBy((current) => (current === 'hover' ? null : current))
    }, 200)
  }

  return (
    <Popover.Root
      open={openBy !== null}
      onOpenChange={(open) => {
        if (open) restoreFocus.current = true
        setOpenBy(open ? 'press' : null)
      }}
    >
      <Popover.Trigger
        type="button"
        aria-label={label}
        className={triggerClass}
        onPointerEnter={(event) => {
          if (event.pointerType !== 'mouse') return
          clearTimeout(closeTimer.current)
          setOpenBy((current) => current ?? 'hover')
        }}
        onPointerLeave={closeAfterLeaving}
        onClick={(event) => {
          if (openBy !== 'hover') return
          event.preventDefault()
          restoreFocus.current = true
          setOpenBy('press')
          linkRef.current?.focus()
        }}
      >
        <Info aria-hidden="true" className="size-4" />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          aria-label={label}
          side="top"
          sideOffset={6}
          collisionPadding={16}
          className={contentClass}
          onPointerEnter={() => clearTimeout(closeTimer.current)}
          onPointerLeave={closeAfterLeaving}
          onOpenAutoFocus={(event) => {
            event.preventDefault()
            if (openBy === 'press') linkRef.current?.focus()
          }}
          onCloseAutoFocus={(event) => {
            if (!restoreFocus.current) event.preventDefault()
            restoreFocus.current = false
          }}
        >
          {description}{' '}
          <a
            ref={linkRef}
            href={link.href}
            target="_blank"
            rel="noreferrer"
            className="font-medium text-brand-800 underline underline-offset-4"
          >
            {link.label}
          </a>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}
