import type { Duration } from 'aws-cdk-lib';
import type * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';

/**
 * CloudWatch alarm settings for failure sum metrics.
 *
 * Omitted fields keep the construct defaults
 * (threshold 1, period 5 minutes, evaluationPeriods 1,
 * treatMissingData `NOT_BREACHING`).
 */
export interface AlarmConfig {
  /**
   * Alarm threshold for the sum metric.
   *
   * @default 1
   */
  readonly threshold?: number;
  /**
   * Metric period used by the alarm.
   *
   * @default Duration.minutes(5)
   */
  readonly period?: Duration;
  /**
   * Number of periods that must breach before the alarm fires.
   *
   * @default 1
   */
  readonly evaluationPeriods?: number;
  /**
   * How missing datapoints are treated.
   *
   * @default TreatMissingData.NOT_BREACHING
   */
  readonly treatMissingData?: cloudwatch.TreatMissingData;
}
