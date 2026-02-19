export function generateCode(prefix: string) {
  // Example: BSM + last 8 digits of timestamp
  const suffix = Date.now().toString().slice(-8);
  return `${prefix}${suffix}`;
}

// Backward/alt name support (so imports never break)
export function generateBeautSoulCode(prefix: string) {
  return generateCode(prefix);
}
