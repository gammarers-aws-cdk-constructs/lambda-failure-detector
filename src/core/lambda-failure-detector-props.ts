import type * as lambda from 'aws-cdk-lib/aws-lambda';
import type * as logs from 'aws-cdk-lib/aws-logs';
import type * as sns from 'aws-cdk-lib/aws-sns';
import type { AlarmConfig } from './alarm-config';
import type { LambdaFailureDetection } from './lambda-failure-detection';
import type { LogFailureFilter } from './log-failure-filter';
import type { PlatformMetricsOptions } from './platform-metrics-options';

/**
 * Props for {@link LambdaFailureDetector}.
 */
export interface LambdaFailureDetectorProps {
  /** Lambda function whose platform failure metrics are alarmed. */
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
   * Shared CloudWatch alarm settings for failure alarms.
   *
   * Applies to sum metrics (`Errors`, `Throttles`, opt-in counts, and log filters).
   * IteratorAge uses `period` / `evaluationPeriods` / `treatMissingData` from this
   * config, but its threshold comes from {@link PlatformMetricsOptions.iteratorAgeThreshold}.
   *
   * @default threshold 1, period 5 minutes, evaluationPeriods 1, treatMissingData NOT_BREACHING
   */
  readonly alarmConfig?: AlarmConfig;
  /**
   * Opt-in platform metrics beyond the standard `Errors` and `Throttles` alarms.
   *
   * @default no additional platform metric alarms
   */
  readonly platformMetrics?: PlatformMetricsOptions;
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
   * Shared CloudWatch alarm settings for failure alarms.
   *
   * @default threshold 1, period 5 minutes, evaluationPeriods 1, treatMissingData NOT_BREACHING
   */
  readonly alarmConfig?: AlarmConfig;
  /**
   * Opt-in platform metrics beyond the standard `Errors` and `Throttles` alarms.
   *
   * @default no additional platform metric alarms
   */
  readonly platformMetrics?: PlatformMetricsOptions;
  /**
   * Log-based failure filters.
   *
   * @default no log-based alarms
   */
  readonly logFilters?: LogFailureFilter[];
}
