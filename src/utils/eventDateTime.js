const IST_TIMEZONE = 'Asia/Kolkata'

const parseEventTimeTo24Hour = (timeValue) => {
  const fallback = { hours: 23, minutes: 59 }
  if (!timeValue || typeof timeValue !== 'string') return fallback

  const raw = timeValue.trim().toUpperCase()
  if (!raw) return fallback

  const match = raw.match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?$/)
  if (!match) return fallback

  let hours = Number(match[1])
  const minutes = Number(match[2] || 0)
  const meridiem = match[3] || null

  if (Number.isNaN(hours) || Number.isNaN(minutes) || minutes < 0 || minutes > 59) return fallback

  if (meridiem) {
    if (hours < 1 || hours > 12) return fallback
    if (meridiem === 'AM') hours = hours % 12
    if (meridiem === 'PM') hours = (hours % 12) + 12
  } else if (hours < 0 || hours > 23) {
    return fallback
  }

  return { hours, minutes }
}

const getIstDateParts = (dateInput) => {
  const date = new Date(dateInput)
  if (Number.isNaN(date.getTime())) return null

  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: IST_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(date)

  const year = Number(parts.find((p) => p.type === 'year')?.value)
  const month = Number(parts.find((p) => p.type === 'month')?.value)
  const day = Number(parts.find((p) => p.type === 'day')?.value)

  if (!year || !month || !day) return null
  return { year, month, day }
}

export const getEventTimestampInIST = (event) => {
  if (!event?.date) return null

  const dateParts = getIstDateParts(event.date)
  if (!dateParts) return null

  const { hours, minutes } = parseEventTimeTo24Hour(event.time)
  const utcMs = Date.UTC(
    dateParts.year,
    dateParts.month - 1,
    dateParts.day,
    hours - 5,
    minutes - 30,
    0,
    0
  )

  return Number.isNaN(utcMs) ? null : utcMs
}

export const isEventCompletedByIST = (event, now = Date.now()) => {
  if (!event) return false
  if (String(event.status || '').toLowerCase() === 'completed') return true

  const eventTs = getEventTimestampInIST(event)
  if (!eventTs) return false

  const nowTs = now instanceof Date ? now.getTime() : Number(now)
  if (Number.isNaN(nowTs)) return false

  return nowTs >= eventTs
}
