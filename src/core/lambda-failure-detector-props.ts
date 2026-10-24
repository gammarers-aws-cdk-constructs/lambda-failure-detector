import type * as lambda from 'aws-cdk-lib/aws-lambda';
import type * as logs from 'aws-cdk-lib/aws-logs';
import type * as sns from 'aws-cdk-lib/aws-sns';
import type { AlarmConfig } from './alarm-config';
import type { LambdaFailureDetection } from './lambda-failure-detection';
import type { LogFailureFilter } from './log-failure-filter';

/**
 * Props for {@link LambdaFailureDetector}.
 */
export interface LambdaFailureDetectorProps {
  /** Lambda function whose platform `Errors` metric is alarmed. */
  readonly lambdaFunction: lambda.IFunction;
  /** Log group used for {@link LogFailureFilter} metric filters. */
  readonly logGroup: logs.ILogGroup;
  /**
   * Optional SNS topic for all alarm actions.
   *
   * When omitted, alarms are created without SNS actions.
   */
  readonly alarmTopic?: sns.ITopic;
  /**
   * Shared CloudWatch alarm settings for every failure sum alarm.
   *
   * @default threshold 1, period 5 minutes, evaluationPeriods 1, treatMissingData NOT_BREACHING
   */
  readonly alarmConfig?: AlarmConfig;
  /**
   * Log-based failure filters. Each entry creates a metric filter and alarm.
   *
   * @default no log-based alarms
   */
  readonly logFilters?: LogFailureFilter[];
}

/**
 * Props accepted by {@link createLambdaFailureDetector}.
 */
export interface CreateLambdaFailureDetectorProps {
  /** Opt-in options; alarms are created only when {@link LambdaFailureDetection.enabled} is true. */
  readonly failureDetection?: LambdaFailureDetection;
  /** Lambda function to monitor. */
  readonly lambdaFunction: lambda.IFunction;
  /** Application log group for log-based filters. */
  readonly logGroup: logs.ILogGroup;
  /**
   * Shared CloudWatch alarm settings for every failure sum alarm.
   *
   * @default threshold 1, period 5 minutes, evaluationPeriods 1, treatMissingData NOT_BREACHING
   */
  readonly alarmConfig?: AlarmConfig;
  /**
   * Log-based failure filters.
   *
   * @default no log-based alarms
   */
  readonly logFilters?: LogFailureFilter[];
}
