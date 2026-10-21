import { escapeText, query } from './format';
import { coordinates } from './syntax';
import type { Built, QrType, Values } from './types';

/** Coordinates as `lat,lng`, the form Google Maps takes in a destination. */
function latLng(text: string): string | null {
  const found = coordinates(text);
  return found ? `${found.lat},${found.lng}` : null;
}

/** `20261021T180000` from a datetime-local value. Floating local time: the code cannot know the viewer's zone. */
function dateTime(value: string): string {
  return `${value.replace(/[-:]/g, '')}00`;
}

/** The day after `date`, as `YYYYMMDD`. All-day events end on the day after their last day. */
function dayAfter(date: string): string {
  const [year, month, day] = date.split('-').map(Number) as [number, number, number];
  // setUTCFullYear rather than Date.UTC, which reads years 0 to 99 as 1900 to 1999.
  const next = new Date(0);
  next.setUTCFullYear(year, month - 1, day + 1);
  const two = (n: number) => String(n).padStart(2, '0');
  return `${String(next.getUTCFullYear()).padStart(4, '0')}${two(next.getUTCMonth() + 1)}${two(next.getUTCDate())}`;
}

function eventTimes(values: Values): { lines: string[] } | { problem: string } {
  if (values.allDay === 'true') {
    const { startDate, endDate } = values;
    if (!startDate) return { problem: 'Pick the day the event starts.' };
    if (endDate && endDate < startDate) return { problem: 'The event ends before it starts.' };
    return {
      lines: [`DTSTART;VALUE=DATE:${startDate.replaceAll('-', '')}`, `DTEND;VALUE=DATE:${dayAfter(endDate || startDate)}`],
    };
  }
  const { starts, ends } = values;
  if (!starts) return { problem: 'Pick when the event starts.' };
  if (ends && ends < starts) return { problem: 'The event ends before it starts.' };
  return { lines: [`DTSTART:${dateTime(starts)}`, ...(ends ? [`DTEND:${dateTime(ends)}`] : [])] };
}

function buildEvent(title: string, values: Values): Built {
  const times = eventTimes(values);
  if ('problem' in times) return times;
  // UID, DTSTAMP and 75-octet line folding are left out: the calendar that imports the event assigns its own,
  // and it keeps the code small.
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//quickqr.app//EN',
    'BEGIN:VEVENT',
    `SUMMARY:${escapeText(title)}`,
    ...times.lines,
    ...(values.place ? [`LOCATION:${escapeText(values.place!)}`] : []),
    ...(values.notes ? [`DESCRIPTION:${escapeText(values.notes!)}`] : []),
    'END:VEVENT',
    'END:VCALENDAR',
  ];
  return { payload: lines.join('\r\n') };
}

export const placesTypes: readonly QrType[] = [
  {
    id: 'location',
    label: 'Location',
    group: 'places',
    bar: { label: 'Coordinates or address', placeholder: '37.7749, -122.4194 or 1 Main St, Springfield' },
    fields: [],
    build(bar) {
      const point = latLng(bar);
      if (point) return { payload: `geo:${point}` };
      return { payload: `https://www.google.com/maps/search/${query([['api', '1'], ['query', bar]])}` };
    },
  },
  {
    id: 'directions',
    label: 'Directions',
    group: 'places',
    bar: { label: 'Destination', placeholder: '1 Main St, Springfield' },
    fields: [],
    build: (bar) => ({
      payload: `https://www.google.com/maps/dir/${query([['api', '1'], ['destination', latLng(bar) ?? bar]])}`,
    }),
  },
  {
    id: 'event',
    label: 'Event',
    group: 'places',
    bar: { label: 'Event title', placeholder: 'Spring tasting' },
    fields: [
      { key: 'allDay', label: 'All-day event', control: 'checkbox' },
      { key: 'starts', label: 'Starts', control: 'datetime', when: (v) => v.allDay !== 'true' },
      { key: 'ends', label: 'Ends', control: 'datetime', when: (v) => v.allDay !== 'true' },
      { key: 'startDate', label: 'Starts', control: 'date', when: (v) => v.allDay === 'true' },
      { key: 'endDate', label: 'Ends', control: 'date', when: (v) => v.allDay === 'true' },
      { key: 'place', label: 'Place', control: 'text', placeholder: 'Where it happens' },
      { key: 'notes', label: 'Notes', control: 'text' },
    ],
    build: buildEvent,
  },
];
