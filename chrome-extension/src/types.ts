// ==================== EVENT TYPES ====================

export enum EventType {
  PAGE_VIEW = 'page_view',
  CLICK = 'click',
  SCROLL = 'scroll',
  FOCUS = 'focus',
}

// Base event interface
export interface BaseEvent {
  event_type: EventType;
  url: string;
  timestamp: string;
}

// Specific event types
export interface PageViewEvent extends BaseEvent {
  event_type: EventType.PAGE_VIEW;
  title: string;
  duration: number;
}

export interface ClickEvent extends BaseEvent {
  event_type: EventType.CLICK;
  selector: string;
  x: number;
  y: number;
}

export interface ScrollEvent extends BaseEvent {
  event_type: EventType.SCROLL;
  scrollY: number;
}

export interface FocusEvent extends BaseEvent {
  event_type: EventType.FOCUS;
  state: 'focus' | 'blur';
}

// Union type for all events
export type UserEvent = PageViewEvent | ClickEvent | ScrollEvent | FocusEvent;

// ==================== MESSAGE TYPES ====================

export interface BaseMessage {
  type: string;
}

export interface UserEventsMessage extends BaseMessage {
  type: 'USER_EVENTS';
  events: UserEvent[];
}

export interface ToggleCollectionMessage extends BaseMessage {
  type: 'TOGGLE_COLLECTION';
  enabled: boolean;
}

export interface GetStateMessage extends BaseMessage {
  type: 'GET_STATE';
}

export type Message = UserEventsMessage | ToggleCollectionMessage | GetStateMessage;

// Statistics interface for monitoring extension performance
export interface ExtensionStats {
  totalEventsSent: number;
  totalEventsDropped: number;
  sendFailureCount: number;
  connectionFailures?: number;
}

// Response interfaces for better type safety
export interface HealthCheckResponse {
  success: boolean;
  isAlive: boolean;
}

export interface OperationalStateResponse {
  success: boolean;
  isCollecting: boolean;
  stats: ExtensionStats;
}

export interface ToggleCollectionResponse {
  success: boolean;
  isCollecting: boolean;
}

// Global window extension for content script guard
declare global {
  interface Window {
    maqroContentScriptLoaded?: boolean;
  }
}

// Macro related types
export interface Macro {
  id: string;
  title: string;
  description: string;
  pattern: UserEvent[];
  status: 'pending' | 'approved' | 'rejected';
}

export interface MacroResponse {
  success: boolean;
  macros: Macro[];
}