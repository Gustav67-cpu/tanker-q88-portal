// Shared types — keep aligned with supabase/schema.sql.

export type UserRole = "admin" | "owner" | "charterer";

export type VesselStatus = "Open" | "Fixed" | "Hidden";

export type FixtureStatus =
  | "New request"
  | "Under broker review"
  | "Sent to Owner"
  | "Owner countered"
  | "Sent to Charterer"
  | "Charterer countered"
  | "Subjects"
  | "Fixed"
  | "Failed"
  | "Cancelled";

export type ChatType = "charterer_broker" | "broker_owner";

export type SenderRole = "charterer" | "broker" | "owner";

export interface Profile {
  id: string;
  email: string;
  role: UserRole;
  company_name: string | null;
  contact_person: string | null;
  whatsapp_number: string | null;
  created_at: string;
  updated_at: string;
}

export interface Vessel {
  id: string;
  owner_id: string;
  vessel_name: string;
  imo_number: string | null;
  dwt: number | null;
  year_built: number | null;
  flag: string | null;
  class_society: string | null;
  loa: number | null;
  beam: number | null;
  max_draft: number | null;
  cargo_capacity_cbm: number | null;
  number_of_tanks: number | null;
  tank_coating: string | null;
  pumps: string | null;
  heating_coils: boolean | null;
  imo_class: string | null;
  sire_status: string | null;
  cdi_status: string | null;
  last_3_cargoes: string | null;
  trading_area: string | null;
  opening_port: string | null;
  opening_date: string | null;
  status: VesselStatus;
  remarks: string | null;
  q88_file_url: string | null;
  public_share_token: string;
  created_at: string;
  updated_at: string;
}

export interface FixtureRequest {
  id: string;
  vessel_id: string;
  charterer_id: string;
  owner_id: string;
  broker_id: string | null;
  cargo: string | null;
  quantity: string | null;
  load_port: string | null;
  discharge_port: string | null;
  laycan_from: string | null;
  laycan_to: string | null;
  freight_idea: string | null;
  demurrage_idea: string | null;
  charter_party_form: string | null;
  special_requirements: string | null;
  status: FixtureStatus;
  broker_commission_percentage: number;
  created_at: string;
  updated_at: string;
}

export interface OfferCounter {
  id: string;
  fixture_request_id: string;
  sender_role: SenderRole;
  sent_to_role: SenderRole;
  freight: string | null;
  demurrage: string | null;
  laycan_from: string | null;
  laycan_to: string | null;
  load_port: string | null;
  discharge_port: string | null;
  subjects: string | null;
  remarks: string | null;
  created_at: string;
}

export interface ChatMessage {
  id: string;
  fixture_request_id: string;
  chat_type: ChatType;
  sender_id: string;
  message: string;
  created_at: string;
}

// Public RPC return type — only commercially safe fields, no owner_id, no q88_file_url.
export interface PublicVessel {
  vessel_name: string;
  imo_number: string | null;
  dwt: number | null;
  year_built: number | null;
  flag: string | null;
  class_society: string | null;
  loa: number | null;
  beam: number | null;
  max_draft: number | null;
  cargo_capacity_cbm: number | null;
  number_of_tanks: number | null;
  tank_coating: string | null;
  pumps: string | null;
  heating_coils: boolean | null;
  imo_class: string | null;
  sire_status: string | null;
  cdi_status: string | null;
  last_3_cargoes: string | null;
  trading_area: string | null;
  opening_port: string | null;
  opening_date: string | null;
  remarks: string | null;
}
