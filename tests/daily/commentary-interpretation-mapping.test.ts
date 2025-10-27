import { dailyTaskService } from '@/lib/daily-task-service';
import { DailyTaskType, TaskDifficulty } from '@/lib/types/daily-task';

// Mock the Genkit flow to capture inputs
const mockScore = jest.fn(async (_input: any) => ({
  score: 75,
  insightLevel: 'moderate',
  literarySensitivity: 50,
  keyInsightsCaptured: [],
  keyInsightsMissed: [],
  feedback: 'ok',
  detailedAnalysis: 'ok',
  commentaryExplanation: 'ok',
}));

jest.mock('@/ai/flows/commentary-interpretation', () => ({
  scoreCommentaryInterpretation: (input: any) => mockScore(input),
}));

describe('DailyTaskService.performAIEvaluation - commentary mapping', () => {
  it('passes required schema fields correctly (commentaryText, relatedPassage, chapterContext, etc.)', async () => {
    const task: any = {
      id: 'task-1',
      type: DailyTaskType.COMMENTARY_DECODE,
      difficulty: TaskDifficulty.EASY,
      title: '脂批解密',
      description: '測試',
      timeEstimate: 8,
      xpReward: 14,
      attributeRewards: {},
      sourceId: 'commentary-commentary_001',
      content: {
        commentary: {
          id: 'commentary_001',
          originalText: '這個妹妹我曾見過的。',
          commentaryText: '【甲戌側批：這是第一見，卻說曾見，可知前生有緣。】',
          chapter: 3,
          author: '脂硯齋',
          hint: '前世因緣',
        },
      },
    };

    const score = await (dailyTaskService as any).evaluateTaskQuality(task, '用戶解讀');
    expect(score).toBe(75);

    expect(mockScore).toHaveBeenCalledTimes(1);
    const calledWith = mockScore.mock.calls[0][0];
    expect(calledWith).toMatchObject({
      commentaryText: '【甲戌側批：這是第一見，卻說曾見，可知前生有緣。】',
      relatedPassage: '這個妹妹我曾見過的。',
      userInterpretation: '用戶解讀',
      difficulty: TaskDifficulty.EASY,
    });
    // chapterContext will be 'Chapter unknown' if no textPassage provided
    expect(typeof calledWith.chapterContext).toBe('string');
    expect(Array.isArray(calledWith.interpretationHints)).toBe(true);
    expect(calledWith.interpretationHints).toEqual(['前世因緣']);
  });
});

