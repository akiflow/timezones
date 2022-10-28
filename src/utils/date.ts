import { DateTime } from 'luxon'

export function getLocalizedDateTime(date?: Date, timezone?: string) {
  const dateTime = date ? DateTime.fromJSDate(date).toLocal() : DateTime.local()
  if (timezone) {
    return dateTime.setZone(timezone)
  }
  return dateTime
}

export function getOffsetString(offsetInMinutes: number) {
  const absOffsetInMinutes = Math.abs(offsetInMinutes)
  const [hours, minutes] = [Math.floor(absOffsetInMinutes / 60), absOffsetInMinutes % 60].map(v => {
    return v.toString().padStart(2, "0")
  })
  const durationInHoursMinutes = `${hours}:${minutes}`
  return `${offsetInMinutes >= 0 ? "+" : "-"}${durationInHoursMinutes}`
}
