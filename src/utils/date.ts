import { DateTime } from 'luxon'

export function getLocalizedDateTime (date?: Date, timezone?: string) {
  const dateTime = date ? DateTime.fromJSDate(date).toLocal() : DateTime.local()
  if (timezone) {
    return dateTime.setZone(timezone)
  }
  return dateTime
}
