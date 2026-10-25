export type Role = "owner" | "driver";
export type TripStatus = "scheduled" | "in_progress" | "completed" | "cancelled";
export type VehicleType = "LCV" | "MCV" | "HCV";
export type DocType = "eway" | "gst" | "other";
export type VehicleDocType = "rc" | "insurance" | "puc" | "permit" | "fitness" | "other";

export interface Place {
  address: string;
  lat: number;
  lng: number;
}

export interface UserProfile {
  uid: string;
  phone: string | null;
  email: string | null;
  displayName: string | null;
  role: Role | null;
  /** Owner: the company they registered. Driver: the company they work for. */
  companyName: string | null;
  /** Key of the `companies` document. Missing on accounts from before company names were unique. */
  companyId?: string | null;
  profileComplete: boolean;
  createdAt: number;
}

export interface Vehicle {
  id: string;
  ownerId: string;
  number: string;
  type: VehicleType;
  company: string;
  /** Missing on vehicles added before vehicle documents existed. */
  documents?: VehicleDocument[];
  createdAt: number;
}

export interface VehicleDocument {
  id: string;
  type: VehicleDocType;
  name: string;
  fileName: string;
  path: string;
  uploadedAt: number;
}

export interface DriverSummary {
  uid: string;
  name: string;
  phone: string;
}

export interface GoodsItem {
  id: string;
  item: string;
  quantity: number;
  unit: string;
}

export interface TripDocument {
  id: string;
  type: DocType;
  name: string;
  fileName: string;
  path: string;
  uploadedBy: string;
  uploadedByName: string;
  uploadedAt: number;
}

export interface Trip {
  id: string;
  tripCode: string;
  ownerId: string;
  companyName: string;
  vehicleId: string;
  vehicleNumber: string;
  vehicleType: VehicleType;
  vehicleCompany: string;
  driverId: string;
  driverName: string;
  driverPhone: string;
  date: string; // YYYY-MM-DD
  source: Place;
  destination: Place;
  pickupAt: number;
  deliveryAt: number;
  receiverName: string;
  receiverPhone: string;
  goodsDescription: string;
  goods: GoodsItem[];
  documents: TripDocument[];
  status: TripStatus;
  cancelReason: string | null;
  distanceKm: number;
  durationMin: number;
  totalFuel: number | null;
  paymentReceived: number | null;
  startedAt: number | null;
  completedAt: number | null;
  cancelledAt: number | null;
  trackingToken: string | null;
  createdAt: number;
}

export interface AppNotification {
  id: string;
  userId: string;
  tripId: string;
  tripCode: string;
  message: string;
  readAt: number | null;
  createdAt: number;
}

/** One GPS point. `t` is the device time in ms. */
export interface LivePoint {
  lat: number;
  lng: number;
  acc: number | null;
  spd: number | null;
  t: number;
}

export type LngLat = [number, number];

export interface TrackResponse {
  valid: true;
  status: TripStatus;
  source: Place;
  destination: Place;
  latest: { lat: number; lng: number; t: number } | null;
  eta: { seconds: number; distanceKm: number; arrivalAt: number; at: number } | null;
  startedAt: number | null;
  completedAt: number | null;
  serverTime: number;
  route?: LngLat[];
  path?: LngLat[];
}
