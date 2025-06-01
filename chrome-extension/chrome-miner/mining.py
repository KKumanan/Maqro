import argparse
import uuid
from prefixspan import PrefixSpan  # pip install prefixspan
from utils import stream_json_events, sessionize_events, extract_event_sequence

def generate_pattern_id(pattern):
    """
    Generate a meaningful ID for a pattern based on its content.
    """
    # Extract the first event type and target from the pattern
    first_event = pattern[0]
    if first_event.startswith("page_view:"):
        # For page_view patterns, use the page title
        page_title = first_event.split(":", 1)[1]
        # Create a short, readable ID
        return f"PATTERN_{page_title.replace(' ', '_')[:10].upper()}"
    elif first_event.startswith("click:"):
        # For click patterns, use the selector
        selector = first_event.split(":", 1)[1]
        return f"PATTERN_CLICK_{selector.replace('#', '').replace('[', '').replace(']', '').replace('=', '_')[:10].upper()}"
    return f"PATTERN_{len(pattern)}"

def encode_event(event):
    """
    Create a more detailed event encoding that includes relevant context.
    """
    if event["event_type"] == "page_view":
        return f"page_view:{event['title']}"
    elif event["event_type"] == "click":
        return f"click:{event['selector']}"
    elif event["event_type"] == "focus":
        return f"focus:{event['state']}"
    return event["event_type"]

def build_sequences(filepath, gap_minutes, encode_fn):
    """
    1. Stream all events from JSON.
    2. Sessionize them with threshold = gap_minutes.
    3. For each session, extract a token sequence.
    4. Return a list of sequences (list of lists).
    """
    ev_gen = stream_json_events(filepath)
    sessions = sessionize_events(ev_gen, gap_minutes=gap_minutes)
    
    print(f"Found {len(sessions)} sessions")
    
    sequences = []
    for i, sess in enumerate(sessions):
        tokens = extract_event_sequence(sess, encode_fn)
        print(f"Session {i}: {tokens}")
        # Include sequences with at least 2 events
        if len(tokens) >= 2:
            sequences.append(tokens)
    
    print(f"Built {len(sequences)} valid sequences")
    return sequences

def mine_prefixspan(sequences, min_support, max_pattern_length=None):
    """
    Use PrefixSpan to find frequent sequential patterns.
    Returns a list of (pattern, support) tuples, sorted by support descending.
    """
    ps = PrefixSpan(sequences)
    ps.minlen = 2  # Minimum pattern length of 2 events
    if max_pattern_length:
        ps.maxlen = max_pattern_length
    else:
        ps.maxlen = 6  # Default maximum pattern length
    patterns = ps.frequent(min_support)
    print(f"Found {len(patterns)} raw patterns")
    return [(list(pat), supp) for (supp, pat) in patterns]

def is_subpattern(pattern, other_pattern):
    """
    Check if pattern is a subpattern of other_pattern.
    Only consider it a subpattern if it's significantly shorter.
    """
    if len(pattern) >= len(other_pattern) - 1:  # Allow patterns that differ by only 1 event
        return False
    return any(other_pattern[i:i+len(pattern)] == pattern for i in range(len(other_pattern)-len(pattern)+1))

def compute_confidence(sequences, pattern):
    """
    Compute confidence for a pattern, ensuring events are in sequence.
    """
    prefix = tuple(pattern[:-1])
    pat_tuple = tuple(pattern)

    support_pat = 0
    support_pref = 0
    
    for seq in sequences:
        seq_tuple = tuple(seq)
        # Check if pattern appears in sequence (in order)
        if any(seq_tuple[i:i+len(pattern)] == pat_tuple for i in range(len(seq_tuple)-len(pattern)+1)):
            support_pat += 1
        # Check if prefix appears in sequence (in order)
        if any(seq_tuple[i:i+len(prefix)] == prefix for i in range(len(seq_tuple)-len(prefix)+1)):
            support_pref += 1

    if support_pref == 0:
        return support_pat, support_pref, 0.0
    confidence = support_pat / support_pref
    return support_pat, support_pref, confidence

def save_patterns(patterns, sequences, min_confidence, output_path):
    """
    Given a list of (pattern_tokens, support) and the full sequences,
    compute confidence for each and write out only those ≥ min_confidence.
    Output as JSON (or any suitable format).
    """
    import json
    output = []
    filtered_patterns = []
    
    # First pass: compute confidence and basic filtering
    for pat, supp in patterns:
        if len(pat) < 2:  # Minimum pattern length of 2
            continue
        supp_pat, supp_pref, conf = compute_confidence(sequences, pat)
        print(f"Pattern {pat}: support={supp_pat}, prefix_support={supp_pref}, confidence={conf}")
        if conf >= min_confidence and supp_pat >= 2:  # Require at least 2 occurrences
            pattern_id = generate_pattern_id(pat)
            filtered_patterns.append({
                "id": pattern_id,
                "uuid": str(uuid.uuid4()),  # Generate a unique UUID for each pattern
                "pattern": pat,
                "support": supp_pat,
                "prefix_support": supp_pref,
                "confidence": round(conf, 3),
                "description": f"Pattern of {len(pat)} events starting with {pat[0]}"
            })
    
    # Second pass: remove subpatterns
    final_patterns = []
    for pattern in sorted(filtered_patterns, key=lambda x: (len(x["pattern"]), -x["support"]), reverse=True):
        # Check if this pattern is a subpattern of any existing pattern
        if not any(is_subpattern(pattern["pattern"], p["pattern"]) for p in final_patterns):
            final_patterns.append(pattern)
    
    # Sort by support and confidence
    final_patterns.sort(key=lambda x: (x["support"], x["confidence"]), reverse=True)
    
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(final_patterns, f, indent=2)
    print(f"Saved {len(final_patterns)} patterns to {output_path}")

def main():
    parser = argparse.ArgumentParser(
        description="Sequential Pattern Miner for Chrome‐event JSON logs"
    )
    parser.add_argument(
        "--input", "-i", required=True, help="Path to events JSON file"
    )
    parser.add_argument(
        "--gap", "-g", type=int, default=30,  # Increased from 15 to 30 minutes
        help="Session gap threshold in minutes (default: 30)"
    )
    parser.add_argument(
        "--minsup", "-s", type=int, default=2,  # Keep at 2 since we have clear patterns
        help="Minimum support for PrefixSpan (integer count)"
    )
    parser.add_argument(
        "--maxlen", "-m", type=int, default=6,
        help="Maximum pattern length (default: 6)"
    )
    parser.add_argument(
        "--minconf", "-c", type=float, default=0.3,  # Lowered from 0.4 to 0.3
        help="Minimum confidence filter (0–1 float, default: 0.3)"
    )
    parser.add_argument(
        "--output", "-o", required=True,
        help="Path to write resulting patterns JSON"
    )
    args = parser.parse_args()

    # 1. Build sequences from raw JSON
    sequences = build_sequences(
        filepath=args.input,
        gap_minutes=args.gap,
        encode_fn=encode_event  # Use our custom encode_event function
    )

    # 2. Mine frequent patterns via PrefixSpan
    patterns = mine_prefixspan(
        sequences=sequences,
        min_support=args.minsup,
        max_pattern_length=args.maxlen
    )

    # 3. Compute confidence and save only those ≥ minconf
    save_patterns(
        patterns=patterns,
        sequences=sequences,
        min_confidence=args.minconf,
        output_path=args.output
    )

if __name__ == "__main__":
    main()
