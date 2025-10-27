import { LanguageModelUsage, LanguageModelV1 } from 'ai';

export type TuttuModel = {
  name: string;
  model_slug: string;
  ai: LanguageModelV1;
  maxTokens: number;
};

export type TuttuResult = {
  success: boolean;
  numDeploys: number;
  usage: LanguageModelUsage;
  files: Record<string, string>;
};
