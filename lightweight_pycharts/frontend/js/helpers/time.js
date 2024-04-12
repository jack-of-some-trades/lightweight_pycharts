import { isBusinessDay, isUTCTimestamp } from '../../lib/pkg.js';
export function convertTime(t) {
    if (isUTCTimestamp(t))
        return t * 1000;
    if (isBusinessDay(t))
        return new Date(t.year, t.month, t.day).valueOf();
    const [year, month, day] = t.split('-').map(parseInt);
    return new Date(year, month, day).valueOf();
}
export function displayTime(time) {
    if (typeof time == 'string')
        return time;
    const date = isBusinessDay(time)
        ? new Date(time.year, time.month, time.day)
        : new Date(time * 1000);
    return date.toLocaleDateString();
}
export function formattedDateAndTime(timestamp) {
    if (!timestamp)
        return ['', ''];
    const dateObj = new Date(timestamp);
    const year = dateObj.getFullYear();
    const month = dateObj.toLocaleString('default', { month: 'short' });
    const date = dateObj.getDate().toString().padStart(2, '0');
    const formattedDate = `${date} ${month} ${year}`;
    const hours = dateObj.getHours().toString().padStart(2, '0');
    const minutes = dateObj.getMinutes().toString().padStart(2, '0');
    const formattedTime = `${hours}:${minutes}`;
    return [formattedDate, formattedTime];
}
