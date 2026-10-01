import {
  isLambdaFailureDetectionEnabled,
  type LambdaFailureDetection,
} from '../src';

const ENABLED_CASES: ReadonlyArray<{
  readonly failureDetection: LambdaFailureDetection;
  readonly expected: boolean;
}> = [
  { failureDetection: {}, expected: false },
  { failureDetection: { enabled: undefined }, expected: false },
  { failureDetection: { enabled: false }, expected: false },
  { failureDetection: { enabled: true }, expected: true },
];

describe('isLambdaFailureDetectionEnabled', () => {
  it.each(ENABLED_CASES)(
    'returns $expected for $failureDetection',
    ({ failureDetection, expected }) => {
      expect(isLambdaFailureDetectionEnabled(failureDetection)).toBe(expected);
    },
  );
});
