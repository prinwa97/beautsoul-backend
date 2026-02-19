export const FO_COIN_RULES = {
  ORDER_BASE: 5,
  ORDER_PER_SKU: 1,
  ORDER_SKU_CAP: 10,

  // Collection: 1 coin per 100₹, daily cap aap baad me add kar sakte ho
  COLLECTION_PER_100: 1,

  AUDIT_BASE: 10,
  AUDIT_PER_LINE: 1,
  AUDIT_LINE_CAP: 20,
} as const;
