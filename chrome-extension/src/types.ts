export interface ClickEvent {
    type: 'click';
    x: number;
    y: number;
    timestamp: number;
    url: string;
    selector: string;
}

export interface KeyEvent {
    type: 'key';
    key: string;
    timestamp: number;
    url: string;
}

export interface ScrollEvent {
    type: 'scroll';
    timestamp: number;
    url: string;
    scrollY: number;
    scrollX: number;
}


export type UserEvent = ClickEvent | KeyEvent | ScrollEvent;