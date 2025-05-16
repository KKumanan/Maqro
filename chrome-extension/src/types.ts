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

export interface Message {
  type: string;
  event?: UserEvent;
  enabled?: boolean;
}