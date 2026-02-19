export function only10Digits(v: string) {
  return (v || "").replace(/\D/g, "").slice(0, 10);
}

export function isPhoneValid(p: string) {
  return only10Digits(p).length === 10;
}
