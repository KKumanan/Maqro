import { UserEvent } from './types';
import { DetectedPattern, suggestMacros, Macro } from './macro_recommender';

// Function to process events and detect patterns
export async function processEvents(events: UserEvent[]): Promise<Macro[]> {
  try {
    // Group events by domain
    const eventsByDomain = events.reduce((acc, event) => {
      const domain = new URL(event.url).hostname;
      if (!acc[domain]) {
        acc[domain] = [];
      }
      acc[domain].push(event);
      return acc;
    }, {} as Record<string, UserEvent[]>);

    // Detect patterns for each domain
    const patterns: DetectedPattern[] = [];
    
    for (const [domain, domainEvents] of Object.entries(eventsByDomain)) {
      // Sort events by timestamp
      const sortedEvents = domainEvents.sort((a, b) => 
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );

      // Look for repeated sequences of events
      const sequences = findRepeatedSequences(sortedEvents);
      
      // Convert sequences to patterns
      sequences.forEach(sequence => {
        patterns.push({
          events: sequence.events,
          frequency: sequence.frequency,
          confidence: calculateConfidence(sequence),
          domain
        });
      });
    }

    // Generate macro suggestions
    return suggestMacros(patterns);
  } catch (error) {
    console.error('Error processing events:', error);
    return [];
  }
}

interface Sequence {
  events: UserEvent[];
  frequency: number;
}

// Helper function to find repeated sequences of events
function findRepeatedSequences(events: UserEvent[]): Sequence[] {
  const sequences: Sequence[] = [];
  const minSequenceLength = 2;
  const maxSequenceLength = 5;
  const minFrequency = 3;

  // Try different sequence lengths
  for (let length = minSequenceLength; length <= maxSequenceLength; length++) {
    // Look for sequences of this length
    for (let i = 0; i <= events.length - length; i++) {
      const sequence = events.slice(i, i + length);
      const sequenceStr = JSON.stringify(sequence);
      
      // Count occurrences of this sequence
      let frequency = 1;
      for (let j = i + length; j <= events.length - length; j++) {
        const compareSequence = events.slice(j, j + length);
        if (JSON.stringify(compareSequence) === sequenceStr) {
          frequency++;
        }
      }

      // If sequence appears frequently enough, add it
      if (frequency >= minFrequency) {
        sequences.push({
          events: sequence,
          frequency
        });
      }
    }
  }

  return sequences;
}

// Helper function to calculate pattern confidence
function calculateConfidence(sequence: Sequence): number {
  // Base confidence on frequency and sequence length
  const baseConfidence = Math.min(sequence.frequency / 5, 1);
  const lengthFactor = Math.min(sequence.events.length / 5, 1);
  
  return (baseConfidence + lengthFactor) / 2;
} 