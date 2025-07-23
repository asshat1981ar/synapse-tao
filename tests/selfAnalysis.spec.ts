import { SelfAnalysisEngine } from '../server/modules/SelfAnalysisEngine';

describe('SelfAnalysisEngine', () => {
  it('analyzes metrics and computes deltas', () => {
    const engine = new SelfAnalysisEngine();
    const result = engine.analyze({ coverage: 92, previousCoverage: 89, latency: 180, failedTests: 1 });
    expect(result.deltaCoverage).toBe(3);
    expect(result.errors).toBe(1);
    expect(result.healthScore).toBe('good');
  });
});
