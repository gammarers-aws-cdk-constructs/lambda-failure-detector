export {
  createLambdaFailureDetector,
  LambdaFailureDetector,
} from './lambda-failure-detector';
export type { LogFailureAlarm } from './lambda-failure-detector';
export type {
  CreateLambdaFailureDetectorProps,
  LambdaFailureDetectorProps,
} from './core/lambda-failure-detector-props';
export {
  isLambdaFailureDetectionEnabled,
  type LambdaFailureDetection,
} from './core/lambda-failure-detection';
export type { LogFailureFilter } from './core/log-failure-filter';
