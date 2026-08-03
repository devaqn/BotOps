import { describe, it, expect } from 'vitest';
import { isBotDown } from '../src/modules/heartbeat/down-detection';

describe('isBotDown', () => {
  it('returns false when the bot never sent a heartbeat', () => {
    expect(isBotDown(null, 60, 3)).toBe(false);
  });

  it('returns false while still inside the grace window', () => {
    const now = new Date('2026-08-01T12:00:00Z');
    const lastHeartbeatAt = new Date('2026-08-01T11:58:00Z'); // 120s atrás, deadline = 180s
    expect(isBotDown(lastHeartbeatAt, 60, 3, now)).toBe(false);
  });

  it('returns true once the grace window has passed', () => {
    const now = new Date('2026-08-01T12:00:00Z');
    const lastHeartbeatAt = new Date('2026-08-01T11:56:00Z'); // 240s atrás, deadline = 180s
    expect(isBotDown(lastHeartbeatAt, 60, 3, now)).toBe(true);
  });

  it('scales the grace window with the interval and multiplier', () => {
    const now = new Date('2026-08-01T12:10:00Z');
    const lastHeartbeatAt = new Date('2026-08-01T12:00:00Z'); // 600s atrás
    expect(isBotDown(lastHeartbeatAt, 300, 3, now)).toBe(false); // deadline = 900s
    expect(isBotDown(lastHeartbeatAt, 60, 3, now)).toBe(true); // deadline = 180s
  });
});
