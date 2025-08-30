// Core Basecamp resource types (partial but strongly typed). Fields include
// key properties plus a catch-all index to allow forward compatibility.

export interface Identified {
  id: number;
  [key: string]: unknown;
}

export interface Timestamped {
  created_at?: string;
  updated_at?: string;
}

export interface Urls {
  url?: string;
  app_url?: string;
  bookmark_url?: string;
}

export interface Person extends Identified, Timestamped, Urls {
  name: string;
  email_address?: string;
  admin?: boolean;
  owner?: boolean;
  client?: boolean;
  employee?: boolean;
  time_zone?: string;
  avatar_url?: string;
}

export interface ProjectDockEntry extends Identified, Urls {
  title: string;
  name: string; // e.g. message_board, todoset, vault, chat, schedule, questionnaire, inbox, kanban_board
  enabled: boolean;
  position?: number | null;
}

export interface Project extends Identified, Timestamped, Urls {
  status?: 'active' | 'archived' | 'trashed';
  name: string;
  description?: string;
  clients_enabled?: boolean;
  dock?: ProjectDockEntry[];
}

export interface TodoListRef extends Identified, Urls {
  title: string;
  type: 'Todolist';
}

export interface BucketProjectRef {
  id: number;
  name: string;
  type: 'Project';
}

export interface Todo extends Identified, Timestamped, Urls {
  title?: string;
  content: string;
  description?: string;
  completed?: boolean;
  completion_url?: string;
  comments_count?: number;
  comments_url?: string;
  parent?: TodoListRef;
  bucket?: BucketProjectRef;
  assignees?: Person[];
}

export interface CardTableList extends Identified, Timestamped, Urls {
  title: string;
  type: string; // Kanban::Triage, Kanban::Column
  cards_url?: string;
}

export interface CardTable extends Identified, Timestamped, Urls {
  title: string;
  type: 'Kanban::Board';
  lists?: CardTableList[];
  bucket?: BucketProjectRef;
}

export interface Card extends Identified, Timestamped, Urls {
  title?: string;
  name?: string;
  status?: string;
  archived?: boolean;
  comment_count?: number;
}

export interface Message extends Identified, Timestamped, Urls {
  title: string;
  content?: string;
  bucket?: BucketProjectRef;
}

export interface Comment extends Identified, Timestamped, Urls {
  content: string;
  bucket?: BucketProjectRef;
}
