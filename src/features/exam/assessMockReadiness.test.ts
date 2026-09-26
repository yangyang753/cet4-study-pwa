import { describe, expect, it } from 'vitest';
import { assessMockReadiness } from './assessMockReadiness';

describe('assessMockReadiness', () => {
  it('requires three recent full mocks before making a stability claim', () => {
    expect(assessMockReadiness([520, 510])).toMatchObject({ status: 'insufficient', sampleSize: 2 });
  });

  it('only calls performance stable when all three recent estimates clear the safety target', () => {
    expect(assessMockReadiness([460, 455, 470])).toMatchObject({ status: 'stable', minimum: 455 });
    expect(assessMockReadiness([460, 424, 470])).toMatchObject({ status: 'risk', minimum: 424 });
    expect(assessMockReadiness([430, 440, 448])).toMatchObject({ status: 'borderline', minimum: 430 });
  });
});
