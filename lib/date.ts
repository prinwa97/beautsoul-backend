export function ymd(d: Date) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function addDays(d: Date, n: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

export function lastNDaysLabels(n: number) {
  const today = startOfDay(new Date());
  const days: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    days.push(ymd(addDays(today, -i)));
  }
  return days;
}
