import * as braintrust from 'braintrust';
import { TuttuResult } from './types.js';

export async function tuttuScorer(props: braintrust.EvalScorerArgs<string, TuttuResult, void>) {
  return [
    {
      name: '1/Deploys',
      score: props.output.success ? 1 / Math.max(1, props.output.numDeploys) : 0,
    },
    { name: 'isSuccess', score: props.output.success ? 1 : 0 },
  ];
}
