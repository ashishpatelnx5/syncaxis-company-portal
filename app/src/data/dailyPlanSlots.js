// The 8 fixed time blocks from the paper "Daily Plan Sheet" (9:00 AM – 6:00
// PM), matched 1:1 to slot index 0-7. These don't change day to day, so
// they're a static frontend config rather than something stored per row in
// the database.
export const dailyPlanSlots = [
  { start: '9:00 AM', end: '10:00 AM' },
  { start: '10:00 AM', end: '11:00 AM' },
  { start: '11:00 AM', end: '12:00 PM' },
  { start: '12:00 PM', end: '1:00 PM' },
  { start: '1:00 PM', end: '2:45 PM' },
  { start: '2:45 PM', end: '3:45 PM' },
  { start: '3:45 PM', end: '4:45 PM' },
  { start: '4:45 PM', end: '6:00 PM' },
]

// Total planned hours for a full day (9:00 AM - 6:00 PM), shown next to the
// live-computed actual hours for comparison.
export const dailyPlanTotalHrs = 9
