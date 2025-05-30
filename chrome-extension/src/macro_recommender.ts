
import { v4 as uuidv4 } from 'uuid';
import { UserEvent, EventType, ClickEvent, ScrollEvent, FocusEvent } from './types';

// Types for pattern detection
export interface DetectedPattern {
  events: UserEvent[];
  frequency: number;
  confidence: number;
  domain: string;
}

// Types for macro generation
export interface Macro {
  id: string;
  title: string;
  description: string;
  keybind: string;
  isApproved: boolean;
  applications: string[];
  steps: MacroStep[];
}

export interface MacroStep {
  app: string;
  action: string;
  args: Record<string, any>;
}

// Helper function to generate a descriptive title from events
function generateMacroTitle(events: UserEvent[]): string {
  // Group events by type
  const eventCounts = events.reduce((acc, event) => {
    acc[event.event_type] = (acc[event.event_type] || 0) + 1;
    return acc;
  }, {} as Record<EventType, number>);

  // Generate title based on event types and counts
  const parts: string[] = [];
  
  if (eventCounts[EventType.CLICK]) {
    parts.push(`${eventCounts[EventType.CLICK]} Click${eventCounts[EventType.CLICK] > 1 ? 's' : ''}`);
  }
  if (eventCounts[EventType.FOCUS]) {
    parts.push(`${eventCounts[EventType.FOCUS]} Focus${eventCounts[EventType.FOCUS] > 1 ? 'es' : ''}`);
  }
  if (eventCounts[EventType.SCROLL]) {
    parts.push(`${eventCounts[EventType.SCROLL]} Scroll${eventCounts[EventType.SCROLL] > 1 ? 's' : ''}`);
  }

  return parts.join(' + ');
}

// Helper function to generate a natural language description
function generateMacroDescription(events: UserEvent[], domain: string): string {
  const eventDescriptions = events.map(event => {
    switch (event.event_type) {
      case EventType.CLICK:
        return `click on ${(event as ClickEvent).selector || 'element'}`;
      case EventType.FOCUS:
        return `focus ${(event as FocusEvent).state}`;
      case EventType.SCROLL:
        return `scroll to ${(event as ScrollEvent).scrollY}px`;
      default:
        return event.event_type;
    }
  });

  return `Automates ${eventDescriptions.join(' → ')} in ${domain}`;
}

// Main function to convert a detected pattern into a macro
export function createMacroFromPattern(pattern: DetectedPattern): Macro {
  const title = generateMacroTitle(pattern.events);
  const description = generateMacroDescription(pattern.events, pattern.domain);

  return {
    id: uuidv4(),
    title,
    description,
    keybind: '', // Will be set by user
    isApproved: false,
    applications: [pattern.domain],
    steps: pattern.events.map(event => ({
      app: pattern.domain,
      action: event.event_type,
      args: {
        selector: (event as ClickEvent).selector,
        scrollY: (event as ScrollEvent).scrollY,
        state: (event as FocusEvent).state,
        // Add other relevant event properties
      }
    }))
  };
}

// Function to suggest macros based on detected patterns
export function suggestMacros(patterns: DetectedPattern[]): Macro[] {
  // Filter patterns by confidence and frequency
  const significantPatterns = patterns.filter(
    pattern => pattern.confidence > 0.7 && pattern.frequency > 3
  );

  // Convert patterns to macros
  return significantPatterns.map(createMacroFromPattern);
} 