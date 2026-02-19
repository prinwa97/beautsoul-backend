export type Retailer = {
  id: string;
  name: string;
  phone?: string | null;
  gst?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
  status?: string | null;
  userId?: string | null;
};

export type FieldOfficer = {
  id: string;
  name: string;
  code?: string | null;
  phone?: string | null;
  status?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
};

export type DistributorUsersResp = {
  distributorId: string;
  retailers: Retailer[];
  fieldOfficers: FieldOfficer[];
};

export type Msg = { type: "ok" | "err"; text: string } | null;

export type StatusOption = { value: string; label: string };
