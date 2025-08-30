export interface ListCardsResponse {
  id: number;
  status: string;
  visible_to_clients: boolean;
  created_at: string;
  updated_at: string;
  title: string;
  inherits_status: boolean;
  type: string;
  url: string;
  app_url: string;
  bookmark_url: string;
  subscription_url: string;
  position: number;
  bucket: Bucket;
  creator: Creator;
  subscribers: Subscriber[];
  public_link_url: string;
  lists: List[];
}

export interface Bucket {
  id: number;
  name: string;
  type: string;
}

export interface Creator {
  id: number;
  attachable_sgid: string;
  name: string;
  email_address: string;
  personable_type: string;
  title: string;
  bio: string;
  location: string;
  created_at: string;
  updated_at: string;
  admin: boolean;
  owner: boolean;
  client: boolean;
  employee: boolean;
  time_zone: string;
  avatar_url: string;
  company: Company;
  can_ping: boolean;
  can_manage_projects: boolean;
  can_manage_people: boolean;
  can_access_timesheet: boolean;
  can_access_hill_charts: boolean;
}

export interface Company {
  id: number;
  name: string;
}

export interface Subscriber {
  id: number;
  attachable_sgid: string;
  name: string;
  email_address: string;
  personable_type: string;
  title: string;
  bio: string;
  location: string;
  created_at: string;
  updated_at: string;
  admin: boolean;
  owner: boolean;
  client: boolean;
  employee: boolean;
  time_zone: string;
  avatar_url: string;
  company: Company2;
  can_ping: boolean;
  can_manage_projects: boolean;
  can_manage_people: boolean;
  can_access_timesheet: boolean;
  can_access_hill_charts: boolean;
}

export interface Company2 {
  id: number;
  name: string;
}

export interface List {
  id: number;
  status: string;
  visible_to_clients: boolean;
  created_at: string;
  updated_at: string;
  title: string;
  inherits_status: boolean;
  type: string;
  url: string;
  app_url: string;
  bookmark_url: string;
  subscription_url: string;
  parent: Parent;
  bucket: Bucket2;
  creator: Creator2;
  description?: string;
  subscribers: Subscriber2[];
  color?: string;
  cards_count: number;
  comment_count: number;
  cards_url: string;
  position?: number;
}

export interface Parent {
  id: number;
  title: string;
  type: string;
  url: string;
  app_url: string;
}

export interface Bucket2 {
  id: number;
  name: string;
  type: string;
}

export interface Creator2 {
  id: number;
  attachable_sgid: string;
  name: string;
  email_address: string;
  personable_type: string;
  title: string;
  bio: string;
  location: string;
  created_at: string;
  updated_at: string;
  admin: boolean;
  owner: boolean;
  client: boolean;
  employee: boolean;
  time_zone: string;
  avatar_url: string;
  company: Company3;
  can_ping: boolean;
  can_manage_projects: boolean;
  can_manage_people: boolean;
  can_access_timesheet: boolean;
  can_access_hill_charts: boolean;
}

export interface Company3 {
  id: number;
  name: string;
}

export interface Subscriber2 {
  id: number;
  attachable_sgid: string;
  name: string;
  email_address: string;
  personable_type: string;
  title: string;
  bio: string;
  location: string;
  created_at: string;
  updated_at: string;
  admin: boolean;
  owner: boolean;
  client: boolean;
  employee: boolean;
  time_zone: string;
  avatar_url: string;
  company: Company4;
  can_ping: boolean;
  can_manage_projects: boolean;
  can_manage_people: boolean;
  can_access_timesheet: boolean;
  can_access_hill_charts: boolean;
}

export interface Company4 {
  id: number;
  name: string;
}
