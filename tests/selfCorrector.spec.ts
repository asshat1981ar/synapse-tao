import { SelfCorrector } from '../server/modules/SelfCorrector';

describe('SelfCorrector', () => {
  it('suggests corrections based on error message', () => {
    const corrector = new SelfCorrector();
    const fix = corrector.correct({ message: "timeout occurred" });
    expect(fix).toBe("retry_with_timeout_increase");
  });
});
