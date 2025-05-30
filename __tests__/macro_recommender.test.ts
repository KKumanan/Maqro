import { processEvents } from '../chrome-extension/src/pattern_integration';
import { UserEvent, EventType } from '../chrome-extension/src/types';
import { Macro, createMacroFromPattern, DetectedPattern } from '../chrome-extension/src/macro_recommender';

// Test suite for macro recommender
describe('Macro Recommender Tests', () => {
  // Test case 1: Basic click pattern
  const clickPatternEvents: UserEvent[] = [
    {
      event_type: EventType.CLICK,
      url: 'https://example.com/page1',
      timestamp: new Date().toISOString(),
      selector: '#login',
      x: 100,
      y: 200
    } as any,
    {
      event_type: EventType.CLICK,
      url: 'https://example.com/page1',
      timestamp: new Date(Date.now() + 1000).toISOString(),
      selector: '#submit',
      x: 150,
      y: 250
    } as any,
    // Repeat the pattern
    {
      event_type: EventType.CLICK,
      url: 'https://example.com/page1',
      timestamp: new Date(Date.now() + 2000).toISOString(),
      selector: '#login',
      x: 100,
      y: 200
    } as any,
    {
      event_type: EventType.CLICK,
      url: 'https://example.com/page1',
      timestamp: new Date(Date.now() + 3000).toISOString(),
      selector: '#submit',
      x: 150,
      y: 250
    } as any,
  ];

  // Test case 2: Complex pattern with multiple event types
  const complexPatternEvents: UserEvent[] = [
    {
      event_type: EventType.CLICK,
      url: 'https://example.com/page2',
      timestamp: new Date().toISOString(),
      selector: '#search',
      x: 200,
      y: 300
    } as any,
    {
      event_type: EventType.FOCUS,
      url: 'https://example.com/page2',
      timestamp: new Date(Date.now() + 1000).toISOString(),
      state: 'focus'
    } as any,
    {
      event_type: EventType.SCROLL,
      url: 'https://example.com/page2',
      timestamp: new Date(Date.now() + 2000).toISOString(),
      scrollY: 500
    } as any,
    // Repeat the pattern
    {
      event_type: EventType.CLICK,
      url: 'https://example.com/page2',
      timestamp: new Date(Date.now() + 3000).toISOString(),
      selector: '#search',
      x: 200,
      y: 300
    } as any,
    {
      event_type: EventType.FOCUS,
      url: 'https://example.com/page2',
      timestamp: new Date(Date.now() + 4000).toISOString(),
      state: 'focus'
    } as any,
    {
      event_type: EventType.SCROLL,
      url: 'https://example.com/page2',
      timestamp: new Date(Date.now() + 5000).toISOString(),
      scrollY: 500
    } as any,
  ];

  // Test case 3: No pattern (random events)
  const randomEvents: UserEvent[] = [
    {
      event_type: EventType.CLICK,
      url: 'https://example.com/page3',
      timestamp: new Date().toISOString(),
      selector: '#random1',
      x: 300,
      y: 400
    } as any,
    {
      event_type: EventType.SCROLL,
      url: 'https://example.com/page3',
      timestamp: new Date(Date.now() + 1000).toISOString(),
      scrollY: 200
    } as any,
    {
      event_type: EventType.FOCUS,
      url: 'https://example.com/page3',
      timestamp: new Date(Date.now() + 2000).toISOString(),
      state: 'blur'
    } as any,
  ];

  test('should detect simple click pattern', async () => {
    const macros = await processEvents(clickPatternEvents);
    expect(macros.length).toBeGreaterThan(0);
    expect(macros[0].title).toContain('2 Clicks');
    expect(macros[0].steps.length).toBe(2);
  });

  test('should detect complex pattern with multiple event types', async () => {
    const macros = await processEvents(complexPatternEvents);
    expect(macros.length).toBeGreaterThan(0);
    expect(macros[0].title).toContain('Click');
    expect(macros[0].title).toContain('Focus');
    expect(macros[0].title).toContain('Scroll');
    expect(macros[0].steps.length).toBe(3);
  });

  test('should not detect patterns in random events', async () => {
    const macros = await processEvents(randomEvents);
    expect(macros.length).toBe(0);
  });

  test('should generate descriptive macro titles', async () => {
    const macros = await processEvents(complexPatternEvents);
    expect(macros[0].title).toMatch(/^[0-9]+ Click[s]? \+ [0-9]+ Focus[es]? \+ [0-9]+ Scroll[s]?$/);
  });

  test('should generate meaningful macro descriptions', async () => {
    const macros = await processEvents(complexPatternEvents);
    expect(macros[0].description).toContain('Automates');
    expect(macros[0].description).toContain('example.com');
  });

  test('should include correct domain in macro applications', async () => {
    const macros = await processEvents(complexPatternEvents);
    expect(macros[0].applications).toContain('example.com');
  });

  test('should set isApproved to false for new macros', async () => {
    const macros = await processEvents(complexPatternEvents);
    expect(macros[0].isApproved).toBe(false);
  });
});

describe('Macro Name and Description Generation', () => {
  it('should generate a correct macro name and description for a click+focus+scroll pattern', () => {
    const events: UserEvent[] = [
      { event_type: EventType.CLICK, url: 'https://foo.com', timestamp: '', selector: '#a', x: 1, y: 2 } as any,
      { event_type: EventType.FOCUS, url: 'https://foo.com', timestamp: '', state: 'focus' } as any,
      { event_type: EventType.SCROLL, url: 'https://foo.com', timestamp: '', scrollY: 100 } as any,
      { event_type: EventType.CLICK, url: 'https://foo.com', timestamp: '', selector: '#a', x: 1, y: 2 } as any,
      { event_type: EventType.FOCUS, url: 'https://foo.com', timestamp: '', state: 'focus' } as any,
      { event_type: EventType.SCROLL, url: 'https://foo.com', timestamp: '', scrollY: 100 } as any,
      { event_type: EventType.CLICK, url: 'https://foo.com', timestamp: '', selector: '#a', x: 1, y: 2 } as any,
      { event_type: EventType.FOCUS, url: 'https://foo.com', timestamp: '', state: 'focus' } as any,
      { event_type: EventType.SCROLL, url: 'https://foo.com', timestamp: '', scrollY: 100 } as any,
      { event_type: EventType.CLICK, url: 'https://foo.com', timestamp: '', selector: '#a', x: 1, y: 2 } as any,
      { event_type: EventType.FOCUS, url: 'https://foo.com', timestamp: '', state: 'focus' } as any,
      { event_type: EventType.SCROLL, url: 'https://foo.com', timestamp: '', scrollY: 100 } as any,
    ];
    const pattern: DetectedPattern = {
      events,
      frequency: 4,
      confidence: 0.9,
      domain: 'foo.com',
    };
    const macro = createMacroFromPattern(pattern);
    expect(macro.title).toMatch(/Click/);
    expect(macro.title).toMatch(/Focus/);
    expect(macro.title).toMatch(/Scroll/);
    expect(macro.description).toContain('Automates');
    expect(macro.description).toContain('foo.com');
  });

  it('should generate a correct macro name for only clicks', () => {
    const events: UserEvent[] = [
      { event_type: EventType.CLICK, url: 'https://bar.com', timestamp: '', selector: '#b', x: 1, y: 2 } as any,
      { event_type: EventType.CLICK, url: 'https://bar.com', timestamp: '', selector: '#b', x: 1, y: 2 } as any,
      { event_type: EventType.CLICK, url: 'https://bar.com', timestamp: '', selector: '#b', x: 1, y: 2 } as any,
      { event_type: EventType.CLICK, url: 'https://bar.com', timestamp: '', selector: '#b', x: 1, y: 2 } as any,
    ];
    const pattern: DetectedPattern = {
      events,
      frequency: 4,
      confidence: 0.95,
      domain: 'bar.com',
    };
    const macro = createMacroFromPattern(pattern);
    expect(macro.title).toMatch(/4 Clicks/);
    expect(macro.description).toContain('click on');
    expect(macro.description).toContain('bar.com');
  });
}); 