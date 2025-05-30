export enum EventType {
  PAGE_VIEW = 'page_view',
  SCROLL = 'scroll',
  CLICK = 'click',
  FOCUS = 'focus'
}

export interface BaseEvent {
  event_type: EventType;
  url: string;
  timestamp: string;
}

export interface PageViewEvent extends BaseEvent {
  event_type: EventType.PAGE_VIEW;
  title: string;
  duration: number;
}

export interface ScrollEvent extends BaseEvent {
  event_type: EventType.SCROLL;
  scrollY: number;
}

export interface ClickEvent extends BaseEvent {
  event_type: EventType.CLICK;
  selector: string;
  x: number;
  y: number;
}

export interface FocusEvent extends BaseEvent {
  event_type: EventType.FOCUS;
  state: 'focus' | 'blur';
}

export type UserEvent = 
  | PageViewEvent 
  | ScrollEvent 
  | ClickEvent 
  | FocusEvent;

// Enhanced message types with better type safety
export type Message = 
  | { type: 'USER_EVENT'; event: UserEvent }
  | { type: 'TOGGLE_COLLECTION'; enabled: boolean }
  | { type: 'GET_OPERATIONAL_STATE' }
  | { type: 'HEALTH_CHECK' };

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