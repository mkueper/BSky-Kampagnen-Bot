import { formatDateTimeLocal, zonedDateTimeToUtc } from './zonedDate'

export function clampTimeToNowForToday ({ date, time, todayDate, nowTime }) {
  if (!date || !time || !todayDate || !nowTime) {
    return { date, time }
  }
  if (date !== todayDate) {
    return { date, time }
  }
  if (time >= nowTime) {
    return { date, time }
  }
  return { date, time: nowTime }
}

export function applyRandomOffsetToLocalDateTime ({
  localDateTime,
  timeZone,
  offsetMinutes
}) {
  if (!localDateTime) return null
  const minutes = Number(offsetMinutes)
  if (!Number.isFinite(minutes) || minutes <= 0) {
    return localDateTime
  }
  const [datePart, timePart] = String(localDateTime).split('T')
  if (!datePart || !timePart) return localDateTime
  const [year, month, day] = datePart.split('-').map(Number)
  const [hour, minute] = timePart.split(':').map(Number)
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
    return localDateTime
  }
  if (!Number.isInteger(hour) || !Number.isInteger(minute)) {
    return localDateTime
  }
  const baseUtc = zonedDateTimeToUtc({ year, month, day, hour, minute }, timeZone)
  const jitter = Math.floor(Math.random() * (minutes * 2 + 1)) - minutes
  const nextUtc = new Date(baseUtc.getTime() + jitter * 60 * 1000)
  return formatDateTimeLocal(nextUtc, timeZone)
}
