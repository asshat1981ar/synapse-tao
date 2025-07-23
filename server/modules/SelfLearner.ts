export class SelfLearner {
  async fetchLessons() {
    return [{ id: 1, insight: "Always retry twice on timeout" }];
  }

  recommendAdjustments() {
    return { retryCount: 2, timeout: 300 };
  }
}
