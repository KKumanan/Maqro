
import { UserEvent } from './types';

/**
 * Canonical messages passed between content/popup and background.
 */
export type Message =
  /** Sent by content scripts when a user event occurs */
  | { channel: 'USER_EVENT';    payload: UserEvent }
  /** Sent by popup or background to trigger an upload */
  | { channel: 'UPLOAD_REQUEST' };


