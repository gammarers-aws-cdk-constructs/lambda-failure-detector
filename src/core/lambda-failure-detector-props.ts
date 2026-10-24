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
  /**
   * Log group used for {@link LogFailureFilter} metric filters.
   *
   * Required only when you pass {@link LambdaFailureDetectorProps.logFilters}
   * and want to use an existing group. When omitted with log filters, the
   * construct manages `/aws/lambda/<functionName>` and applies
   * {@link LambdaFailureDetectorProps.logRetention}.
   *
   * Do not set together with {@link LambdaFailureDetectorProps.logRetention}.
   */
  readonly logGroup?: logs.ILogGroup;
  /**
   * Retention for the Lambda log group when the construct manages it.
   *
   * Used when {@link LambdaFailureDetectorProps.logFilters} are set and
   * {@link LambdaFailureDetectorProps.logGroup} is omitted. Creating a
   * `LogRetention` custom resource for `/aws/lambda/<functionName>`.
   *
   * Do not set together with {@link LambdaFailureDetectorProps.logGroup}.
   *
   * @default RetentionDays.ONE_YEAR
   */
  readonly logRetention?: logs.RetentionDays;
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
  /**
   * Log group used for log-based filters.
   *
   * Same rules as {@link LambdaFailureDetectorProps.logGroup}.
   */
  readonly logGroup?: logs.ILogGroup;
  /**
   * Retention for the managed Lambda log group.
   *
   * Same rules as {@link LambdaFailureDetectorProps.logRetention}.
   *
   * @default RetentionDays.ONE_YEAR
   */
  readonly logRetention?: logs.RetentionDays;
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
