/**
 * Opt-in platform metrics beyond the standard `Errors` and `Throttles` alarms.
 *
 * `Errors` and `Throttles` are always created. Enable the flags below when the
 * function uses a dead-letter queue, on-failure destination, or stream source.
 */
export interface PlatformMetricsOptions {
  /**
   * Create an alarm on the `AWS/Lambda` `DeadLetterErrors` sum metric.
   *
   * @default false
   */
  readonly deadLetterErrors?: boolean;
  /**
   * Create an alarm on the `AWS/Lambda` `DestinationDeliveryFailures` sum metric.
   *
   * @default false
   */
  readonly destinationDeliveryFailures?: boolean;
  /**
   * Create an alarm on the `AWS/Lambda` `IteratorAge` maximum metric.
   *
   * Intended for functions with stream event sources (Kinesis, DynamoDB Streams).
   *
   * @default false
   */
  readonly iteratorAge?: boolean;
  /**
   * Threshold in milliseconds for the IteratorAge alarm.
   *
   * Used only when {@link PlatformMetricsOptions.iteratorAge} is true.
   * Shared `AlarmConfig.threshold` does not apply (that value is for sum counts).
   *
   * @default 60000
   */
  readonly iteratorAgeThreshold?: number;
}
