export type VehicleAccessStatus = 'PENDING' | 'ACCEPTED' | 'REVOKED';

export interface VehicleAccess {
  id: number;
  inviteeEmail: string;
  inviteeName?: string;
  status: VehicleAccessStatus;
  grantedAt: string;
  vehicleId?: number;
  vehicleName?: string;
  ownerName?: string;
}

export type MaintenanceType = 'OIL_CHANGE' | 'TIRE_ROTATION' | 'TIRE_REPLACEMENT' | 'AIR_FILTER' | 'CABIN_FILTER' | 'BRAKE_INSPECTION' | 'BRAKE_PADS' | 'BRAKE_ROTORS' | 'TRANSMISSION_SERVICE' | 'COOLANT_FLUSH' | 'SPARK_PLUGS' | 'BATTERY_REPLACEMENT' | 'TIMING_BELT' | 'TIMING_CHAIN' | 'SERPENTINE_BELT' | 'WHEEL_ALIGNMENT' | 'FUEL_FILTER' | 'WIPER_BLADES' | 'INSPECTION_EMISSION' | 'DETAILING' | 'ACCIDENT_REPAIR' | 'RECALL_SERVICE' | 'OTHER';
export type FuelType = 'REGULAR' | 'PLUS' | 'PREMIUM' | 'DIESEL' | 'ELECTRIC' | 'HYDROGEN';
export type VehicleStatus = 'VALID' | 'EXPIRING_SOON' | 'EXPIRED' | 'UNKNOWN';

export interface Vehicle {
  id: number;
  make: string;
  model: string;
  modelYear: number;
  trim?: string;
  vin?: string;
  color?: string;
  licensePlate?: string;
  registrationState?: string;
  tagExpirationDate?: string;
  daysUntilTagExpiry?: number;
  tagStatus: VehicleStatus;
  insuranceProvider?: string;
  insurancePolicyNumber?: string;
  insuranceExpiryDate?: string;
  insuranceStatus: VehicleStatus;
  purchaseDate?: string;
  purchasePrice?: number;
  purchasedFromDealer?: boolean;
  dealerName?: string;
  currentMileage?: number;
  notes?: string;
  photoFilenames?: string[];
  createdAt?: string;
  updatedAt?: string;

  // Computed stats
  totalMaintenanceCost?: number;
  averageMpg?: number;
  maintenanceCount?: number;
  nextServiceDue?: string;
  hasOpenRecalls?: boolean;

  // Sharing
  isShared?: boolean;
  ownerName?: string;
  sharedWith?: VehicleAccess[];
}

export interface MaintenanceRecord {
  id: number;
  vehicleId: number;
  maintenanceType: MaintenanceType;
  customDescription?: string;
  displayLabel: string;
  serviceDate: string;
  mileage?: number;
  cost?: number;
  provider?: string;
  notes?: string;
  linkedReceiptId?: number;
  receiptFileName?: string;
  createdAt: string;
}

export interface FuelRecord {
  id: number;
  vehicleId: number;
  fillDate: string;
  odometer: number;
  gallons: number;
  pricePerGallon?: number;
  totalCost?: number;
  fuelType: FuelType;
  fullTank: boolean;
  stationName?: string;
  notes?: string;
  mpg?: number;  // computed
  createdAt: string;
}

export interface MaintenanceScheduleItem {
  type: MaintenanceType;
  displayName: string;
  dueMileage: number;
  dueByDate: string;
  overdue: boolean;
  dueSoon: boolean;
  lastPerformed?: string;
  lastMileage?: number;
  critical: boolean;
  note: string;
}

export interface Recall {
  campaignNumber: string;
  component: string;
  summary: string;
  consequence?: string;
  remedy?: string;
  manufacturer?: string;
}

export const MAINTENANCE_TYPE_LABELS: Record<MaintenanceType, string> = {
  OIL_CHANGE: 'Oil Change',
  TIRE_ROTATION: 'Tire Rotation',
  TIRE_REPLACEMENT: 'Tire Replacement',
  AIR_FILTER: 'Air Filter',
  CABIN_FILTER: 'Cabin Air Filter',
  BRAKE_INSPECTION: 'Brake Inspection',
  BRAKE_PADS: 'Brake Pads',
  BRAKE_ROTORS: 'Brake Rotors',
  TRANSMISSION_SERVICE: 'Transmission Service',
  COOLANT_FLUSH: 'Coolant Flush',
  SPARK_PLUGS: 'Spark Plugs',
  BATTERY_REPLACEMENT: 'Battery Replacement',
  TIMING_BELT: 'Timing Belt',
  TIMING_CHAIN: 'Timing Chain',
  SERPENTINE_BELT: 'Serpentine Belt',
  WHEEL_ALIGNMENT: 'Wheel Alignment',
  FUEL_FILTER: 'Fuel Filter',
  WIPER_BLADES: 'Wiper Blades',
  INSPECTION_EMISSION: 'Inspection / Emissions',
  DETAILING: 'Detailing',
  ACCIDENT_REPAIR: 'Accident Repair',
  RECALL_SERVICE: 'Recall Service',
  OTHER: 'Other Service'
};

export const FUEL_TYPE_LABELS: Record<FuelType, string> = {
  REGULAR: 'Regular',
  PLUS: 'Plus (Mid)',
  PREMIUM: 'Premium',
  DIESEL: 'Diesel',
  ELECTRIC: 'Electric',
  HYDROGEN: 'Hydrogen'
};
