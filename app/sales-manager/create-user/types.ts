export type Dist = {
  id: string;
  name: string;
  code?: string | null;
  city?: string | null;
  state?: string | null;
  status?: string | null;
};

export type RoleKey = "RETAILER" | "DISTRIBUTOR" | "FIELD_OFFICER";

export type CreateUserFormState = {
  name: string;
  phone: string;
  pincode: string;
  city: string;
  district: string;
  state: string;
  address: string;
  gstinOrGst: string;
  password: string;
};

export type ApiRow = {
  id: string; // userId
  role: "RETAILER" | "DISTRIBUTOR" | "FIELD_OFFICER";
  name: string;
  phone?: string | null;
  code?: string | null;
  status?: string | null;
  city?: string | null;
  district?: string | null;
  state?: string | null;
  pincode?: string | null;
  address?: string | null;
  createdAt?: string;
  distributor?: { id: string; name: string; code?: string | null; city?: string | null; state?: string | null; status?: string | null } | null;
};