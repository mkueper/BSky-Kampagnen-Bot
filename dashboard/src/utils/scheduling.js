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

