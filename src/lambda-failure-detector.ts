import { Duration } from 'aws-cdk-lib';
import {
  Alarm,
  ComparisonOperator,
  Metric,
  TreatMissingData,
  type IMetric,
} from 'aws-cdk-lib/aws-cloudwatch';
import { SnsAction } from 'aws-cdk-lib/aws-cloudwatch-actions';
import { type IFunction } from 'aws-cdk-lib/aws-lambda';
import {
  MetricFilter,
  type IFilterPattern,
  type ILogGroup,
} from 'aws-cdk-lib/aws-logs';
import { type ITopic } from 'aws-cdk-lib/aws-sns';
import { Construct } from 'constructs';

/** Alarm threshold for failure sum metrics. */
const FAILURE_ALARM_THRESHOLD = 1;
/** Evaluation periods for failure alarms. */
const FAILURE_ALARM_EVALUATION_PERIODS = 1;
/** Metric period for failure alarms. */
const FAILURE_ALARM_PERIOD = Duration.minutes(5);
/** Statistic used for failure sum metrics. */
const FAILURE_ALARM_STATISTIC = 'Sum';
/** Statistic used for IteratorAge (stream lag). */
const ITERATOR_AGE_STATISTIC = 'Maximum';
/** Default IteratorAge threshold: one minute, in milliseconds. */
const ITERATOR_AGE_DEFAULT_THRESHOLD_MS = 60_000;
/** CloudWatch namespace for Lambda platform metrics. */
const LAMBDA_METRIC_NAMESPACE = 'AWS/Lambda';
/** Metric filter value emitted per matching log event. */
const LOG_METRIC_VALUE = '1';
/** Default value when no matching log events occur in the period. */
const LOG_METRIC_DEFAULT_VALUE = 0;

/**
 * Resolved alarm settings after applying {@link AlarmConfig} defaults.
 */
interface ResolvedAlarmConfig {
  readonly threshold: number;
  readonly period: Duration;
  readonly evaluationPeriods: number;
  readonly treatMissingData: TreatMissingData;
}

interface MetricAlarmProps {
  readonly metric: IMetric;
  readonly threshold: number;
  readonly evaluationPeriods: number;
  readonly treatMissingData: TreatMissingData;
  readonly alarmTopic?: ITopic;
}

/**
 * Fills omitted {@link AlarmConfig} fields with construct defaults.
 *
 * @param config - Optional caller overrides.
 * @returns Fully resolved alarm settings.
 */
const resolveAlarmConfig = (config?: AlarmConfig): ResolvedAlarmConfig => ({
  threshold: config?.threshold ?? FAILURE_ALARM_THRESHOLD,
  period: config?.period ?? FAILURE_ALARM_PERIOD,
  evaluationPeriods: config?.evaluationPeriods ?? FAILURE_ALARM_EVALUATION_PERIODS,
  treatMissingData: config?.treatMissingData ?? TreatMissingData.NOT_BREACHING,
});

/**
 * Rejects repeated {@link LogFailureFilter.id} values before any child is created.
 *
 * Construct ids are `${id}Metric` and `${id}Alarm`, so a repeated id would fail
 * later with a generic construct-id collision.
 *
 * @param filters - Log filters from {@link LambdaFailureDetectorProps.logFailureFilters}.
 * @throws Error when two filters share the same `id`.
 */
const ensureUniqueLogFilterIds = (filters: readonly LogFailureFilter[]): void => {
  const seen = new Set<string>();

  for (const filter of filters) {
    if (seen.has(filter.id)) {
      throw new Error('logFailureFilters id must be unique.');
    }

    seen.add(filter.id);
  }
};

/**
 * Returns the caller log group for metric filters, or undefined when none are needed.
 *
 * Does not read `Function.logGroup`. That getter creates a log group with
 * infinite retention when the function does not already have one.
 *
 * @param logGroup - Log group from {@link LambdaFailureDetectorProps.logGroup}.
 * @param logFilters - Entries from {@link LambdaFailureDetectorProps.logFailureFilters}.
 * @returns The log group metric filters read, or undefined when there are no filters.
 * @throws Error when filters are non-empty and `logGroup` is omitted.
 */
const requireLogGroupForFilters = (
  logGroup: ILogGroup | undefined,
  logFilters: readonly LogFailureFilter[],
): ILogGroup | undefined => {
  if (logFilters.length === 0) {
    return undefined;
  }

  if (!logGroup) {
    throw new Error('logFailureFilters requires logGroup.');
  }

  return logGroup;
};

/**
 * Registers an SNS alarm action when a topic is configured.
 *
 * @param alarm - Alarm that should notify the topic.
 * @param alarmTopic - Topic to attach. Omitted topics leave the alarm without an SNS action.
 */
const attachAlarmActions = (alarm: Alarm, alarmTopic?: ITopic): void => {
  if (!alarmTopic) {
    return;
  }

  alarm.addAlarmAction(new SnsAction(alarmTopic));
};

/**
 * Creates a CloudWatch alarm for a metric at or above the given threshold.
 *
 * `aws-cdk-lib` 2.232.0 types `CreateAlarmOptionsBase` as an empty export, so
 * `evaluationPeriods` and `treatMissingData` are absent from `AlarmProps`.
 * The alarm construct still forwards both properties to `CfnAlarm`.
 *
 * @param scope - Parent construct.
 * @param id - Construct id.
 * @param props - Metric, thresholds, and an optional SNS topic.
 * @returns Configured CloudWatch alarm.
 */
const createMetricAlarm = (
  scope: Construct,
  id: string,
  props: MetricAlarmProps,
): Alarm => {
  const alarmProps = {
    metric: props.metric,
    threshold: props.threshold,
    comparisonOperator: ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
    evaluationPeriods: props.evaluationPeriods,
    treatMissingData: props.treatMissingData,
  };
  const alarm = new Alarm(scope, id, alarmProps);
  attachAlarmActions(alarm, props.alarmTopic);
  return alarm;
};

/**
 * Creates a sum-metric failure alarm using the resolved shared alarm config.
 *
 * @param scope - Parent construct.
 * @param id - Construct id.
 * @param metric - Sum metric to alarm.
 * @param alarmConfig - Resolved shared settings.
 * @param alarmTopic - Optional SNS topic.
 * @returns Alarm configured for a failure sum.
 */
const createSumAlarm = (
  scope: Construct,
  id: string,
  metric: IMetric,
  alarmConfig: ResolvedAlarmConfig,
  alarmTopic?: ITopic,
): Alarm => createMetricAlarm(scope, id, {
  metric,
  threshold: alarmConfig.threshold,
  evaluationPeriods: alarmConfig.evaluationPeriods,
  treatMissingData: alarmConfig.treatMissingData,
  alarmTopic,
});

/**
 * Builds an `AWS/Lambda` metric for a platform metric name that has no CDK helper.
 *
 * @param lambdaFunction - Function whose name is used as the dimension.
 * @param metricName - Platform metric name (for example `DeadLetterErrors`).
 * @param period - Metric period.
 * @param statistic - Aggregation statistic.
 * @returns CloudWatch metric scoped to the function.
 */
const createLambdaPlatformMetric = (
  lambdaFunction: IFunction,
  metricName: string,
  period: Duration,
  statistic: string,
): Metric => new Metric({
  namespace: LAMBDA_METRIC_NAMESPACE,
  metricName,
  dimensionsMap: {
    FunctionName: lambdaFunction.functionName,
  },
  period,
  statistic,
});

/**
 * Creates the metric filter and sum alarm for one {@link LogFailureFilter}.
 *
 * @param scope - Parent construct.
 * @param logGroup - Log group the filter reads.
 * @param filter - Log pattern and custom metric names.
 * @param alarmConfig - Resolved alarm settings.
 * @param alarmTopic - Optional topic attached to the alarm.
 * @returns Filter id and its alarm.
 */
const createLogFilterAlarm = (
  scope: Construct,
  logGroup: ILogGroup,
  filter: LogFailureFilter,
  alarmConfig: ResolvedAlarmConfig,
  alarmTopic?: ITopic,
): LogFailureAlarm => {
  const metricFilter = new MetricFilter(scope, `${filter.id}Metric`, {
    logGroup,
    filterPattern: filter.filterPattern,
    metricNamespace: filter.metricNamespace,
    metricName: filter.metricName,
    metricValue: LOG_METRIC_VALUE,
    defaultValue: LOG_METRIC_DEFAULT_VALUE,
  });
  const alarm = createSumAlarm(
    scope,
    `${filter.id}Alarm`,
    metricFilter.metric({
      period: alarmConfig.period,
      statistic: FAILURE_ALARM_STATISTIC,
    }),
    alarmConfig,
    alarmTopic,
  );

  return { id: filter.id, alarm };
};

/**
 * Creates opt-in platform metric alarms when the corresponding flags are enabled.
 *
 * @param scope - Parent construct.
 * @param lambdaFunction - Function to monitor.
 * @param alarmConfig - Resolved shared settings.
 * @param platformMetrics - Opt-in flags and IteratorAge threshold.
 * @param alarmTopic - Optional SNS topic.
 * @returns Created opt-in alarms (undefined when the flag is off).
 */
const createOptionalPlatformAlarms = (
  scope: Construct,
  lambdaFunction: IFunction,
  alarmConfig: ResolvedAlarmConfig,
  platformMetrics: PlatformMetricsOptions | undefined,
  alarmTopic?: ITopic,
): {
  deadLetterErrorsAlarm?: Alarm;
  destinationDeliveryFailuresAlarm?: Alarm;
  iteratorAgeAlarm?: Alarm;
} => {
  if (!platformMetrics) {
    return {};
  }

  let deadLetterErrorsAlarm: Alarm | undefined;
  if (platformMetrics.deadLetterErrors) {
    deadLetterErrorsAlarm = createSumAlarm(
      scope,
      'LambdaDeadLetterErrorsAlarm',
      createLambdaPlatformMetric(
        lambdaFunction,
        'DeadLetterErrors',
        alarmConfig.period,
        FAILURE_ALARM_STATISTIC,
      ),
      alarmConfig,
      alarmTopic,
    );
  }

  let destinationDeliveryFailuresAlarm: Alarm | undefined;
  if (platformMetrics.destinationDeliveryFailures) {
    destinationDeliveryFailuresAlarm = createSumAlarm(
      scope,
      'LambdaDestinationDeliveryFailuresAlarm',
      createLambdaPlatformMetric(
        lambdaFunction,
        'DestinationDeliveryFailures',
        alarmConfig.period,
        FAILURE_ALARM_STATISTIC,
      ),
      alarmConfig,
      alarmTopic,
    );
  }

  let iteratorAgeAlarm: Alarm | undefined;
  if (platformMetrics.iteratorAge) {
    iteratorAgeAlarm = createMetricAlarm(scope, 'LambdaIteratorAgeAlarm', {
      metric: createLambdaPlatformMetric(
        lambdaFunction,
        'IteratorAge',
        alarmConfig.period,
        ITERATOR_AGE_STATISTIC,
      ),
      threshold: platformMetrics.iteratorAgeThreshold ?? ITERATOR_AGE_DEFAULT_THRESHOLD_MS,
      evaluationPeriods: alarmConfig.evaluationPeriods,
      treatMissingData: alarmConfig.treatMissingData,
      alarmTopic,
    });
  }

  return {
    deadLetterErrorsAlarm,
    destinationDeliveryFailuresAlarm,
    iteratorAgeAlarm,
  };
};

/**
 * CloudWatch alarm settings for failure metrics.
 *
 * Omitted fields keep the construct defaults
 * (threshold 1, period 5 minutes, evaluationPeriods 1,
 * treatMissingData `NOT_BREACHING`).
 * `threshold` applies to sum metrics only; IteratorAge uses
 * {@link PlatformMetricsOptions.iteratorAgeThreshold}.
 */
export interface AlarmConfig {
  /**
   * Alarm threshold for sum metrics.
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
  readonly treatMissingData?: TreatMissingData;
}

/**
 * One log-based failure signal for {@link LambdaFailureDetector}.
 *
 * Creates a CloudWatch Logs metric filter and an alarm on the resulting sum metric.
 */
export interface LogFailureFilter {
  /**
   * Stable id used as the MetricFilter / Alarm construct id prefix
   * (e.g. `InstanceStatusFailure` → `InstanceStatusFailureMetric`).
   *
   * Must be unique among {@link LambdaFailureDetectorProps.logFailureFilters}.
   */
  readonly id: string;
  /**
   * CloudWatch Logs filter pattern.
   *
   * Pass any {@link IFilterPattern}, including JSON field comparisons
   * from `FilterPattern`. The pattern is not wrapped again.
   *
   * @example FilterPattern.literal('"ResourceWaitFailed"')
   */
  readonly filterPattern: IFilterPattern;
  /** Custom metric namespace for the metric filter. */
  readonly metricNamespace: string;
  /** Custom metric name for the metric filter. */
  readonly metricName: string;
}

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
   * Shared {@link AlarmConfig.threshold} does not apply (that value is for sum counts).
   *
   * @default 60000
   */
  readonly iteratorAgeThreshold?: number;
}

/**
 * Props for {@link LambdaFailureDetector}.
 */
export interface LambdaFailureDetectorProps {
  /**
   * SNS topic for every alarm action, including log failure filters.
   *
   * When omitted, alarms are created without SNS actions.
   * The construct does not create a topic.
   */
  readonly topic?: ITopic;
  /** Lambda function whose platform failure metrics are alarmed. */
  readonly lambdaFunction: IFunction;
  /**
   * Log group read by {@link LambdaFailureDetectorProps.logFailureFilters}.
   *
   * Required when `logFailureFilters` is non-empty. The construct does not
   * create a log group and does not set retention. Ignored when
   * `logFailureFilters` is omitted or empty.
   */
  readonly logGroup?: ILogGroup;
  /**
   * Log-based failure filters. Each entry creates a metric filter and alarm
   * on {@link LambdaFailureDetectorProps.logGroup}.
   *
   * @default no log-based alarms
   */
  readonly logFailureFilters?: LogFailureFilter[];
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
}

/**
 * Alarm created for one {@link LogFailureFilter}.
 */
export interface LogFailureAlarm {
  /** Same as {@link LogFailureFilter.id}. */
  readonly id: string;
  /** Alarm on the log metric filter sum. */
  readonly alarm: Alarm;
}

/**
 * CloudWatch failure detection for a Lambda function.
 *
 * Always creates platform `AWS/Lambda` `Errors` and `Throttles` alarms.
 * Optionally creates DeadLetterErrors, DestinationDeliveryFailures, and IteratorAge
 * alarms, plus one metric filter and alarm per {@link LogFailureFilter}.
 * Does not create a log group or set its retention. Does not create an SNS topic;
 * pass {@link LambdaFailureDetectorProps.topic} to attach notifications.
 */
export class LambdaFailureDetector extends Construct {
  /** SNS topic used for alarm actions, when configured. */
  public readonly alarmTopic?: ITopic;
  /**
   * Log group used for log metric filters, when log filters are configured.
   *
   * Undefined when there are no log filters.
   */
  public readonly logGroup?: ILogGroup;
  /** Fires when the Lambda `Errors` metric is non-zero. */
  public readonly lambdaErrorsAlarm: Alarm;
  /** Fires when the Lambda `Throttles` metric is non-zero. */
  public readonly lambdaThrottlesAlarm: Alarm;
  /** Fires when `DeadLetterErrors` is non-zero, when opted in. */
  public readonly deadLetterErrorsAlarm?: Alarm;
  /** Fires when `DestinationDeliveryFailures` is non-zero, when opted in. */
  public readonly destinationDeliveryFailuresAlarm?: Alarm;
  /** Fires when stream `IteratorAge` reaches the configured threshold, when opted in. */
  public readonly iteratorAgeAlarm?: Alarm;
  /**
   * Alarms for each log filter, in the same order as
   * {@link LambdaFailureDetectorProps.logFailureFilters}.
   */
  public readonly logFilterAlarms: LogFailureAlarm[];

  /**
   * @param scope - Parent construct.
   * @param id - Construct id.
   * @param props - SNS topic, Lambda function, optional log group and log filters, and alarm settings.
   * @throws Error when `logFailureFilters` is non-empty and `logGroup` is omitted.
   * @throws Error when `logFailureFilters` contains a duplicate `id`.
   */
  constructor(scope: Construct, id: string, props: LambdaFailureDetectorProps) {
    super(scope, id);

    const alarmTopic = props.topic;
    this.alarmTopic = alarmTopic;
    const alarmConfig = resolveAlarmConfig(props.alarmConfig);
    const logFilters = props.logFailureFilters ?? [];
    ensureUniqueLogFilterIds(logFilters);
    const logGroup = requireLogGroupForFilters(props.logGroup, logFilters);
    this.logGroup = logGroup;

    this.lambdaErrorsAlarm = createSumAlarm(
      this,
      'LambdaErrorsAlarm',
      props.lambdaFunction.metricErrors({
        period: alarmConfig.period,
        statistic: FAILURE_ALARM_STATISTIC,
      }),
      alarmConfig,
      alarmTopic,
    );

    this.lambdaThrottlesAlarm = createSumAlarm(
      this,
      'LambdaThrottlesAlarm',
      props.lambdaFunction.metricThrottles({
        period: alarmConfig.period,
        statistic: FAILURE_ALARM_STATISTIC,
      }),
      alarmConfig,
      alarmTopic,
    );

    const optionalAlarms = createOptionalPlatformAlarms(
      this,
      props.lambdaFunction,
      alarmConfig,
      props.platformMetrics,
      alarmTopic,
    );
    this.deadLetterErrorsAlarm = optionalAlarms.deadLetterErrorsAlarm;
    this.destinationDeliveryFailuresAlarm = optionalAlarms.destinationDeliveryFailuresAlarm;
    this.iteratorAgeAlarm = optionalAlarms.iteratorAgeAlarm;

    if (!logGroup) {
      this.logFilterAlarms = [];
      return;
    }

    this.logFilterAlarms = logFilters.map((filter) => createLogFilterAlarm(
      this,
      logGroup,
      filter,
      alarmConfig,
      alarmTopic,
    ));
  }

  /**
   * Returns the log-filter alarm for the given filter id, or undefined when missing.
   *
   * @param id - Same as {@link LogFailureFilter.id}.
   * @returns Matching alarm, or undefined when the id was not in `logFailureFilters`.
   */
  public findLogFilterAlarm(id: string): Alarm | undefined {
    return this.logFilterAlarms.find((entry) => entry.id === id)?.alarm;
  }
}
