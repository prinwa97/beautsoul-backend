export function generateCode(prefix: string) {
  const time = Date.now().toString().slice(-6); // time based
  const rand = Math.floor(100 + Math.random() * 900); // 3 digit
  return `${prefix}${time}${rand}`;
}
