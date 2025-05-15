from collections import Counter, defaultdict
from typing import List, Dict, Tuple, Set
from prefixspan import PrefixSpan
from datetime import datetime, timedelta
import json
from urllib.parse import urlparse
import os

def parse_iso_timestamp(ts_str: str) -> datetime:
    """
    Parse ISO 8601 timestamp string to datetime object.
    Handles both with and without timezone information.
    
    Args:
        ts_str: ISO 8601 timestamp string
        
    Returns:
        datetime object
    """
    # Remove 'Z' and replace with '+00:00' for UTC
    if ts_str.endswith('Z'):
        ts_str = ts_str[:-1] + '+00:00'
    return datetime.fromisoformat(ts_str)

def extract_ngrams(events: List[Dict], n: int) -> Counter:
    """
    Extract contiguous n-gram patterns of event types from a list of events.

    Args:
        events: List of event dictionaries sorted by 'timestamp'.
        n: Size of the n-gram window.

    Returns:
        Counter mapping n-gram tuples to their support counts.
    """
    seq = [e['event_type'] for e in events]
    cnt = Counter()
    for i in range(len(seq) - n + 1):
        window = tuple(seq[i:i+n])
        cnt[window] += 1
    return cnt

def group_into_sessions(events: List[Dict], max_gap: timedelta = timedelta(minutes=30)) -> List[List[Dict]]:
    """
    Group events into sessions based on time gaps.
    
    Args:
        events: List of event dictionaries sorted by timestamp
        max_gap: Maximum time gap between events to be considered part of same session
        
    Returns:
        List of sessions, each a list of event dicts
    """
    if not events:
        return []
        
    sessions = []
    current_session = [events[0]]
    
    for i in range(1, len(events)):
        current_time = parse_iso_timestamp(events[i]['timestamp'])
        prev_time = parse_iso_timestamp(events[i-1]['timestamp'])
        
        if current_time - prev_time > max_gap:
            sessions.append(current_session)
            current_session = [events[i]]
        else:
            current_session.append(events[i])
            
    if current_session:
        sessions.append(current_session)
        
    return sessions

def extract_domain_patterns(events: List[Dict]) -> Dict[str, List[str]]:
    """
    Extract patterns of event types per domain.
    
    Args:
        events: List of event dictionaries
        
    Returns:
        Dictionary mapping domains to lists of event types
    """
    domain_patterns = defaultdict(list)
    
    for event in events:
        if 'url' in event:
            domain = urlparse(event['url']).netloc
            domain_patterns[domain].append(event['event_type'])
            
    return domain_patterns

def analyze_user_behavior(events: List[Dict]) -> Dict:
    """
    Analyze user behavior patterns from events.
    
    Args:
        events: List of event dictionaries
        
    Returns:
        Dictionary containing various behavior metrics
    """
    behavior = {
        'total_events': len(events),
        'event_types': Counter(e['event_type'] for e in events),
        'domains': Counter(urlparse(e['url']).netloc for e in events if 'url' in e),
        'avg_session_duration': 0,
        'common_sequences': []
    }
    
    # Calculate average session duration
    sessions = group_into_sessions(events)
    if sessions:
        durations = []
        for session in sessions:
            start = parse_iso_timestamp(session[0]['timestamp'])
            end = parse_iso_timestamp(session[-1]['timestamp'])
            durations.append((end - start).total_seconds())
        behavior['avg_session_duration'] = sum(durations) / len(durations)
    
    # Find common sequences
    for n in [2, 3]:
        ngrams = extract_ngrams(events, n)
        behavior['common_sequences'].extend(ngrams.most_common(5))
    
    return behavior

def mine_prefixspan(sessions: List[List[Dict]], min_support: int) -> List[Tuple[Tuple[str, ...], int]]:
    """
    Mine frequent non-contiguous subsequences of event types using PrefixSpan.

    Args:
        sessions: List of sessions, each a list of event dicts sorted by timestamp.
        min_support: Minimum number of sessions a pattern must appear in.

    Returns:
        List of (pattern_tuple, support) sorted by support descending.
    """
    if PrefixSpan is None:
        raise ImportError("The 'prefixspan' package is required for mine_prefixspan. Please install it via 'pip install prefixspan'.")
        
    sequences = [[e['event_type'] for e in session] for session in sessions]
    ps = PrefixSpan(sequences)
    patterns = ps.frequent(min_support)
    return sorted(patterns, key=lambda x: x[1], reverse=True)

def load_events(filename: str) -> List[Dict]:
    """Load events from a JSONL file."""
    events = []
    with open(filename) as f:
        data = json.load(f)
        if isinstance(data, list):
            events = data
        else:
            raise ValueError("Input file must contain a JSON array")
    return sorted(events, key=lambda x: x['timestamp'])

if __name__ == "__main__":
    import sys
    
    # Get the directory where the script is located
    script_dir = os.path.dirname(os.path.abspath(__file__))
    
    if len(sys.argv) > 1:
        input_file = sys.argv[1]
    else:
        # Use the default file in the same directory as the script
        input_file = os.path.join(script_dir, 'dummy_data.jsonl')
        
    try:
        events = load_events(input_file)
        if not events:
            print(f"No events found in {input_file}")
            sys.exit(1)
            
        print(f"Loaded {len(events)} events")
        
        # Analyze user behavior
        behavior = analyze_user_behavior(events)
        print("\nUser Behavior Analysis:")
        print(f"Total Events: {behavior['total_events']}")
        print(f"Average Session Duration: {behavior['avg_session_duration']:.2f} seconds")
        print("\nEvent Type Distribution:")
        for event_type, count in behavior['event_types'].most_common():
            print(f"  {event_type}: {count}")
        print("\nDomain Distribution:")
        for domain, count in behavior['domains'].most_common():
            print(f"  {domain}: {count}")
            
        # Extract and print top n-grams
        print("\nCommon Event Sequences:")
        for pattern, count in behavior['common_sequences']:
            print(f"  {pattern}: {count}")
            
        # Group into sessions and mine patterns
        sessions = group_into_sessions(events)
        print(f"\nGrouped into {len(sessions)} sessions")
        
        print("\nFrequent subsequences (min_support=2):")
        for pattern, support in mine_prefixspan(sessions, min_support=2):
            print(f"  {pattern}: {support}")
            
        # Analyze domain-specific patterns
        domain_patterns = extract_domain_patterns(events)
        print("\nDomain-specific patterns:")
        for domain, patterns in domain_patterns.items():
            print(f"\n{domain}:")
            pattern_counter = Counter(patterns)
            for pattern, count in pattern_counter.most_common(3):
                print(f"  {pattern}: {count}")
            
    except FileNotFoundError:
        print(f"Error: Could not find file {input_file}")
        sys.exit(1)
    except json.JSONDecodeError as e:
        print(f"Error: Invalid JSON in {input_file}: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)
