export type Role =
  | "USER"
  | "AGENT";

export type TicketPriority =
  | "LOW"
  | "MEDIUM"
  | "HIGH"
  | "URGENT";

export type TicketStatus =
  | "OPEN"
  | "IN_PROGRESS"
  | "RESOLVED"
  | "CLOSED";

export type SlaState =
  | "ON_TRACK"
  | "AT_RISK"
  | "BREACHED";

export interface AppUser {
  id: string;
  name: string;
  email: string;
  role: Role;
}

export interface TicketComment {
  id: string;
  content: string;
  createdAt: string;
  author: AppUser;
}

export interface TicketListItem {
  id: string;
  title: string;
  priority: TicketPriority;
  status: TicketStatus;
  assignedAgent: AppUser | null;
  slaDeadline: string;
  slaState: SlaState;
  createdAt: string;
}

export interface TicketDetails
  extends TicketListItem {
  description: string;
  creator: AppUser;
  firstResponseAt: string | null;
  updatedAt: string;
  comments: TicketComment[];
}

export interface TicketPage {
  items: TicketListItem[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}