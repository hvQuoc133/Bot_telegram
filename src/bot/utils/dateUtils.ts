export function formatVNTime(date: Date | string | number): string {
    const d = new Date(date);
    if (isNaN(d.getTime())) return 'Invalid Date';

    // Add 7 hours to UTC time to get Vietnam time
    const vnTime = new Date(d.getTime() + 7 * 60 * 60 * 1000);

    const pad = (n: number) => n.toString().padStart(2, '0');
    const hours = pad(vnTime.getUTCHours());
    const minutes = pad(vnTime.getUTCMinutes());
    const seconds = pad(vnTime.getUTCSeconds());
    const day = pad(vnTime.getUTCDate());
    const month = pad(vnTime.getUTCMonth() + 1);
    const year = vnTime.getUTCFullYear();

    return `${hours}:${minutes}:${seconds} ${day}/${month}/${year}`;
}

export function formatVNDate(date: Date | string | number): string {
    const d = new Date(date);
    if (isNaN(d.getTime())) return 'Invalid Date';

    // Add 7 hours to UTC time to get Vietnam time
    const vnTime = new Date(d.getTime() + 7 * 60 * 60 * 1000);

    const pad = (n: number) => n.toString().padStart(2, '0');
    const day = pad(vnTime.getUTCDate());
    const month = pad(vnTime.getUTCMonth() + 1);
    const year = vnTime.getUTCFullYear();

    return `${day}/${month}/${year}`;
}

export function formatVNDateCode(date: Date | string | number): string {
    const d = new Date(date);
    if (isNaN(d.getTime())) return 'InvalidDate';

    const vnTime = new Date(d.getTime() + 7 * 60 * 60 * 1000);
    const pad = (n: number) => n.toString().padStart(2, '0');

    return `${vnTime.getUTCFullYear()}${pad(vnTime.getUTCMonth() + 1)}${pad(vnTime.getUTCDate())}`;
}
