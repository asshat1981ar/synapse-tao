import { SelfLearner } from '../server/modules/SelfLearner';

describe('SelfLearner', () => {
  it('fetches and returns past lessons', async () => {
    const learner = new SelfLearner();
    const lessons = await learner.fetchLessons();
    expect(lessons.length).toBeGreaterThan(0);
  });
});
