export type LeadType = "cliente" | "parceiro" | null;

export interface LeadPhone {
  id?: string;
  lead_id?: string;
  phone: string;
  is_primary: boolean;
  created_at?: string;
}

export interface LeadEmail {
  id?: string;
  lead_id?: string;
  email: string;
  is_primary: boolean;
  created_at?: string;
}

export interface Lead {
  id: string;
  lead_type: LeadType;
  company_name: string | null;
  cnpj: string | null;
  address: string | null;
  cnae_or_activity: string | null;
  avg_revenue: number | null;
  avg_employees: number | null;
  partners: string | null;
  decision_makers: string | null;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  lead_phones?: LeadPhone[];
  lead_emails?: LeadEmail[];
}

export type LeadUpsert = Partial<
  Omit<Lead, "id" | "created_at" | "updated_at" | "lead_phones" | "lead_emails">
> & {
  lead_type?: LeadType;
};

export interface LeadWithContactsInput {
  lead: LeadUpsert;
  phones: LeadPhone[];
  emails: LeadEmail[];
}

