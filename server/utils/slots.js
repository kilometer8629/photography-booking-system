const { DateTime } = require('luxon');

function buildSlotsForDay(date, {
  timezone = 'Australia/Sydney',
  startHour = 10,
  endHour = 16,
  slotMinutes = 5
} = {}) {
  const dayStart = DateTime.fromISO(date, { zone: timezone }).set({
    hour: startHour,
    minute: 0,
    second: 0,
    millisecond: 0
  });

  const dayEnd = DateTime.fromISO(date, { zone: timezone }).set({
    hour: endHour,
    minute: 0,
    second: 0,
    millisecond: 0
  });

  const slots = [];
  let cursor = dayStart;
  while (cursor < dayEnd) {
    const slotEnd = cursor.plus({ minutes: slotMinutes });
    if (slotEnd <= dayEnd) {
      slots.push({
        key: cursor.toISO(),
        label: cursor.toFormat('HH:mm')
      });
    }
    cursor = cursor.plus({ minutes: slotMinutes });
  }

  return { dayStart, dayEnd, slots };
}

function filterSlots(slots, events, {
  timezone = 'Australia/Sydney',
  slotMinutes = 5
} = {}) {
  if (!Array.isArray(slots) || !slots.length) {
    return [];
  }
  if (!Array.isArray(events) || !events.length) {
    return slots.map((slot) => slot.label);
  }

  return slots
    .filter((slot) => {
      const slotStart = DateTime.fromISO(slot.key, { zone: timezone });
      const slotEnd = slotStart.plus({ minutes: slotMinutes });
      return !events.some(({ start, end }) => {
        if (!start || !end) {
          return false;
        }
        return slotStart < end && slotEnd > start;
      });
    })
    .map((slot) => slot.label);
}

module.exports = {
  buildSlotsForDay,
  filterSlots
};
