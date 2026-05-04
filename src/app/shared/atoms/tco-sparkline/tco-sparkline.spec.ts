import { sparklinePath } from './tco-sparkline';

describe('sparklinePath', () => {
  it('returns empty string for fewer than 2 points', () => {
    expect(sparklinePath([], 100, 80, 24)).toBe('');
    expect(sparklinePath([42], 100, 80, 24)).toBe('');
  });

  it('two points span the full width', () => {
    const path = sparklinePath([0, 100], 100, 80, 24);
    const coords = path.split(' ').map((p) => p.split(',').map(Number));
    expect(coords[0][0]).toBeCloseTo(0, 4);
    expect(coords[1][0]).toBeCloseTo(80, 4);
  });

  it('value at yMax pins to the top edge (with padding)', () => {
    const pad = 1.5;
    const path = sparklinePath([100], 100, 80, 24, pad);
    expect(path).toBe(''); // single-point edge case
    const path2 = sparklinePath([0, 100], 100, 80, 24, pad);
    const lastY = Number(path2.split(' ')[1].split(',')[1]);
    expect(lastY).toBeCloseTo(pad, 4);
  });

  it('value at 0 pins to the bottom edge (with padding)', () => {
    const pad = 1.5;
    const path = sparklinePath([100, 0], 100, 80, 24, pad);
    const firstY = Number(path.split(' ')[0].split(',')[1]);
    const lastY = Number(path.split(' ')[1].split(',')[1]);
    expect(firstY).toBeCloseTo(pad, 4);
    expect(lastY).toBeCloseTo(24 - pad, 4);
  });

  it('clamps values above yMax to the top edge', () => {
    const pad = 1.5;
    const path = sparklinePath([0, 200], 100, 80, 24, pad);
    const lastY = Number(path.split(' ')[1].split(',')[1]);
    expect(lastY).toBeCloseTo(pad, 4); // clamped to top
  });

  it('shared yMax: a smaller-total series sits below a larger one', () => {
    const big = sparklinePath([0, 100], 100, 80, 24);
    const small = sparklinePath([0, 50], 100, 80, 24);
    const bigEnd = Number(big.split(' ')[1].split(',')[1]);
    const smallEnd = Number(small.split(' ')[1].split(',')[1]);
    expect(smallEnd).toBeGreaterThan(bigEnd); // SVG y grows downward
  });

  it('guards against yMax = 0', () => {
    const path = sparklinePath([0, 100], 0, 80, 24);
    // safeMax becomes 1; values clamp to top — should produce a finite path.
    expect(path.length).toBeGreaterThan(0);
    expect(path.split(' ').every((p) => /^[\d.]+,[\d.]+$/.test(p))).toBe(true);
  });
});