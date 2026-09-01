import { useRef, useState } from 'react'
import { Dropdown } from './Dropdown'
import { Icon } from '../Icon'
import { formatTime, parseTime, toTimeString } from '../../utils/format'

const FACE = 236
const CENTRE = FACE / 2
const NUM_RADIUS = 96

/** Times a shoot usually starts or ends, for one-tap selection. */
const QUICK_TIMES = ['06:00', '08:00', '10:00', '12:00', '16:00', '18:00', '20:00', '22:00']

/**
 * Clock-face time field.
 *
 * Tap or drag the hand to set the hour, then the minutes; AM/PM sits beside the
 * readout. Value in and out is always a 'HH:mm' 24-hour string, and the quick
 * chips cover the times most shoots actually start at.
 */
export function TimePicker({
  value,
  onChange,
  placeholder = 'Choose a time',
  disabled = false,
  invalid = false,
  minuteStep = 5,
  id,
}) {
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState('hour')
  const faceRef = useRef(null)
  const draggingRef = useRef(false)

  const parsed = parseTime(value)
  const hour24 = parsed?.hour ?? 9
  const minute = parsed?.minute ?? 0
  const isPM = hour24 >= 12
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12

  // Every time the panel opens, start on the hour dial again.
  const [wasOpen, setWasOpen] = useState(open)
  if (open !== wasOpen) {
    setWasOpen(open)
    if (open) setMode('hour')
  }

  function commit(nextHour24, nextMinute) {
    onChange(toTimeString(clamp(nextHour24, 0, 23), clamp(nextMinute, 0, 59)))
  }

  function setHour12(next12) {
    const base = next12 % 12
    commit(isPM ? base + 12 : base, minute)
  }

  function setMeridiem(pm) {
    const base = hour24 % 12
    commit(pm ? base + 12 : base, minute)
  }

  /** Converts a pointer position on the face into an hour or a minute. */
  function valueFromPointer(event) {
    const box = faceRef.current?.getBoundingClientRect()
    if (!box) return
    const dx = event.clientX - (box.left + box.width / 2)
    const dy = event.clientY - (box.top + box.height / 2)
    let angle = (Math.atan2(dx, -dy) * 180) / Math.PI
    if (angle < 0) angle += 360

    if (mode === 'hour') {
      const step = Math.round(angle / 30) % 12
      setHour12(step === 0 ? 12 : step)
    } else {
      const steps = Math.round(angle / (6 * minuteStep)) * minuteStep
      commit(hour24, steps % 60)
    }
  }

  function onPointerDown(event) {
    draggingRef.current = true
    faceRef.current?.setPointerCapture?.(event.pointerId)
    valueFromPointer(event)
  }

  function onPointerMove(event) {
    if (draggingRef.current) valueFromPointer(event)
  }

  function onPointerUp(event) {
    if (!draggingRef.current) return
    draggingRef.current = false
    faceRef.current?.releasePointerCapture?.(event.pointerId)
    // Choosing the hour naturally leads on to choosing the minutes.
    if (mode === 'hour') setMode('minute')
  }

  const handAngle = mode === 'hour' ? (hour12 % 12) * 30 : minute * 6

  return (
    <Dropdown
      open={open}
      onOpenChange={setOpen}
      trigger={({ ref, toggle }) => (
        <button
          type="button"
          id={id}
          ref={ref}
          className="select-trigger"
          onClick={toggle}
          disabled={disabled}
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-invalid={invalid || undefined}
        >
          <Icon name="clock" size={17} style={{ color: 'var(--ink-400)', flex: 'none' }} />
          <span className={`select-value ${value ? '' : 'placeholder'}`}>
            {value ? formatTime(value) : placeholder}
          </span>
          <Icon name="chevronDown" size={17} className="select-caret" />
        </button>
      )}
      panelClassName="time-panel"
    >
      {(close) => (
        <>
          <div className="time-readout">
            <button
              type="button"
              className={`time-digit ${mode === 'hour' ? 'active' : ''}`}
              onClick={() => setMode('hour')}
              onKeyDown={(event) => stepWithArrows(event, () => setHour12(hour12 === 12 ? 1 : hour12 + 1), () => setHour12(hour12 === 1 ? 12 : hour12 - 1))}
              aria-label={`Hour, ${hour12}`}
            >
              {String(hour12).padStart(2, '0')}
            </button>
            <span className="time-colon">:</span>
            <button
              type="button"
              className={`time-digit ${mode === 'minute' ? 'active' : ''}`}
              onClick={() => setMode('minute')}
              onKeyDown={(event) =>
                stepWithArrows(
                  event,
                  () => commit(hour24, (minute + minuteStep) % 60),
                  () => commit(hour24, (minute - minuteStep + 60) % 60),
                )
              }
              aria-label={`Minute, ${minute}`}
            >
              {String(minute).padStart(2, '0')}
            </button>

            <div className="ampm-switch">
              <button
                type="button"
                className={!isPM ? 'active' : ''}
                onClick={() => setMeridiem(false)}
                aria-pressed={!isPM}
              >
                AM
              </button>
              <button
                type="button"
                className={isPM ? 'active' : ''}
                onClick={() => setMeridiem(true)}
                aria-pressed={isPM}
              >
                PM
              </button>
            </div>
          </div>

          <div
            className="clock-face"
            ref={faceRef}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            role="application"
            aria-label={mode === 'hour' ? 'Select hour' : 'Select minutes'}
          >
            <span className="clock-centre" />
            <span
              className="clock-hand"
              style={{ height: NUM_RADIUS, transform: `rotate(${handAngle}deg)` }}
            />

            {(mode === 'hour' ? HOUR_MARKS : minuteMarks(minuteStep)).map((mark) => {
              const rad = (mark.angle * Math.PI) / 180
              const x = CENTRE + NUM_RADIUS * Math.sin(rad)
              const y = CENTRE - NUM_RADIUS * Math.cos(rad)
              const isSelected =
                mode === 'hour' ? mark.value === hour12 : mark.value === minute
              return (
                <button
                  key={mark.label}
                  type="button"
                  className={`clock-num ${isSelected ? 'selected' : ''}`}
                  style={{ left: x, top: y }}
                  onClick={() => {
                    if (mode === 'hour') {
                      setHour12(mark.value)
                      setMode('minute')
                    } else {
                      commit(hour24, mark.value)
                    }
                  }}
                >
                  {mark.label}
                </button>
              )
            })}
          </div>

          <div className="time-quick">
            {QUICK_TIMES.map((time) => (
              <button
                key={time}
                type="button"
                className={`chip ${value === time ? 'active' : ''}`}
                onClick={() => {
                  onChange(time)
                  close()
                }}
              >
                {formatTime(time)}
              </button>
            ))}
          </div>

          <div className="picker-foot">
            <button type="button" className="btn btn-primary btn-sm" onClick={() => close()}>
              Done
            </button>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => {
                onChange('')
                close()
              }}
            >
              Clear
            </button>
          </div>
        </>
      )}
    </Dropdown>
  )
}

const HOUR_MARKS = Array.from({ length: 12 }, (_, index) => {
  const value = index === 0 ? 12 : index
  return { value, label: String(value), angle: index * 30 }
})

function minuteMarks(step) {
  // Label every 5 minutes around the dial regardless of the snapping step.
  const marks = []
  for (let minute = 0; minute < 60; minute += 5) {
    marks.push({
      value: Math.round(minute / step) * step % 60,
      label: String(minute).padStart(2, '0'),
      angle: minute * 6,
    })
  }
  return marks
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

function stepWithArrows(event, up, down) {
  if (event.key === 'ArrowUp') {
    event.preventDefault()
    up()
  }
  if (event.key === 'ArrowDown') {
    event.preventDefault()
    down()
  }
}
