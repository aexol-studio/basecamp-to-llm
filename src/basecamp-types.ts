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

export interface Company {
  id: number;
  name: string;
}

export interface Bucket {
  id: number;
  name: string;
  type: string;
}

export interface Person {
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

// Backward-compatible type aliases
export type Creator = Person;
export type Subscriber = Person;
export type Assignee = Person;

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
  bucket: Bucket;
  creator: Creator;
  description?: string;
  subscribers: Subscriber[];
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

// Card Table Steps Types
export interface Step {
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
  completed: boolean;
  due_on?: string;
  assignees?: Assignee[];
  completion_url: string;
  position: number;
  bucket: Bucket;
  creator: Creator;
  parent: StepParent;
}

export interface StepParent {
  id: number;
  title: string;
  type: string;
  url: string;
  app_url: string;
}

// Comment Types
export interface Comment {
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
  parent: Parent;
  bucket: Bucket;
  creator: Creator;
  content: string;
}

// Attachment Types (extracted from comment content)
export interface Attachment {
  sgid: string;
  contentType: string;
  url: string;
  downloadUrl: string;
  filename: string;
  filesize: number;
  width?: number;
  height?: number;
  previewable: boolean;
  presentation?: string;
}

// Enriched Card with Comments and Visual Context
export interface EnrichedCardContext {
  card: {
    id: number;
    title: string;
    description: string;
    status: string;
    created_at: string;
    updated_at: string;
    creator: Creator;
    steps: Step[];
    assignees: Assignee[];
    due_on?: string;
    project: {
      id: number;
      name: string;
    };
    column: {
      id: number;
      name: string;
    };
  };
  comments: Array<{
    id: number;
    creator: Creator;
    created_at: string;
    content: string;
    attachments: Attachment[];
  }>;
  images: Array<{
    url: string;
    downloadUrl?: string; // Direct download URL for authenticated download
    source: "card" | "comment";
    sourceId: number;
    creator: string;
    metadata: {
      filename: string;
      size: number;
      dimensions?: { width: number; height: number };
    };
    base64?: string; // Base64 encoded image data for vision AI
    mimeType?: string; // MIME type for vision AI (e.g., 'image/png')
    tempPath?: string; // Temporary file path (to be cleaned up)
  }>;
}
