import { Duration } from 'aws-cdk-lib';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as cloudwatch_actions from 'aws-cdk-lib/aws-cloudwatch-actions';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as sns from 'aws-cdk-lib/aws-sns';
import { Construct } from 'constructs';
import type { AlarmConfig } from './core/alarm-config';
import { isLambdaFailureDetectionEnabled } from './core/lambda-failure-detection';
import type {
  CreateLambdaFailureDetectorProps,
  LambdaFailureDetectorProps,
} from './core/lambda-failure-detector-props';
import type { LogFailureFilter } from './core/log-failure-filter';
import type { PlatformMetricsOptions } from './core/platform-metrics-options';

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
  readonly treatMissingData: cloudwatch.TreatMissingData;
}

/**
 * Alarm created for one {@link LogFailureFilter}.
 */
export interface LogFailureAlarm {
  /** Same as {@link LogFailureFilter.id}. */
  readonly id: string;
  /** Alarm on the log metric filter sum. */
  readonly alarm: cloudwatch.Alarm;
}

interface MetricAlarmProps {
  readonly metric: cloudwatch.IMetric;
  readonly threshold: number;
  readonly evaluationPeriods: number;
  readonly treatMissingData: cloudwatch.TreatMissingData;
  readonly alarmTopic?: sns.ITopic;
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
  treatMissingData: config?.treatMissingData ?? cloudwatch.TreatMissingData.NOT_BREACHING,
});

/**
 * Registers an SNS alarm action when a topic is configured.
 *
 * @param alarm - Alarm that should notify the topic.
 * @param alarmTopic - Topic to attach. Omitted topics leave the alarm without an SNS action.
 */
const attachAlarmActions = (alarm: cloudwatch.Alarm, alarmTopic?: sns.ITopic): void => {
  if (!alarmTopic) {
    return;
  }

  alarm.addAlarmAction(new cloudwatch_actions.SnsAction(alarmTopic));
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
): cloudwatch.Alarm => {
  const alarmProps = {
    metric: props.metric,
    threshold: props.threshold,
    comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
    evaluationPeriods: props.evaluationPeriods,
    treatMissingData: props.treatMissingData,
  };
  const alarm = new cloudwatch.Alarm(scope, id, alarmProps);
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
  metric: cloudwatch.IMetric,
  alarmConfig: ResolvedAlarmConfig,
  alarmTopic?: sns.ITopic,
): cloudwatch.Alarm => createMetricAlarm(scope, id, {
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
  lambdaFunction: lambda.IFunction,
  metricName: string,
  period: Duration,
  statistic: string,
): cloudwatch.Metric => new cloudwatch.Metric({
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
  logGroup: logs.ILogGroup,
  filter: LogFailureFilter,
  alarmConfig: ResolvedAlarmConfig,
  alarmTopic?: sns.ITopic,
): LogFailureAlarm => {
  const metricFilter = new logs.MetricFilter(scope, `${filter.id}Metric`, {
    logGroup,
    filterPattern: logs.FilterPattern.literal(filter.filterPattern),
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
  lambdaFunction: lambda.IFunction,
  alarmConfig: ResolvedAlarmConfig,
  platformMetrics: PlatformMetricsOptions | undefined,
  alarmTopic?: sns.ITopic,
): {
  deadLetterErrorsAlarm?: cloudwatch.Alarm;
  destinationDeliveryFailuresAlarm?: cloudwatch.Alarm;
  iteratorAgeAlarm?: cloudwatch.Alarm;
} => {
  if (!platformMetrics) {
    return {};
  }

  let deadLetterErrorsAlarm: cloudwatch.Alarm | undefined;
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

  let destinationDeliveryFailuresAlarm: cloudwatch.Alarm | undefined;
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

  let iteratorAgeAlarm: cloudwatch.Alarm | undefined;
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
 * CloudWatch failure detection for a Lambda function.
 *
 * Always creates platform `AWS/Lambda` `Errors` and `Throttles` alarms.
 * Optionally creates DeadLetterErrors, DestinationDeliveryFailures, and IteratorAge
 * alarms, plus one metric filter and alarm per {@link LogFailureFilter}.
 * Does not create an SNS topic; pass {@link LambdaFailureDetectorProps.alarmTopic}
 * to attach notifications.
 */
export class LambdaFailureDetector extends Construct {
  /** SNS topic used for alarm actions, when configured. */
  public readonly alarmTopic?: sns.ITopic;
  /** Fires when the Lambda `Errors` metric is non-zero. */
  public readonly lambdaErrorsAlarm: cloudwatch.Alarm;
  /** Fires when the Lambda `Throttles` metric is non-zero. */
  public readonly lambdaThrottlesAlarm: cloudwatch.Alarm;
  /** Fires when `DeadLetterErrors` is non-zero, when opted in. */
  public readonly deadLetterErrorsAlarm?: cloudwatch.Alarm;
  /** Fires when `DestinationDeliveryFailures` is non-zero, when opted in. */
  public readonly destinationDeliveryFailuresAlarm?: cloudwatch.Alarm;
  /** Fires when stream `IteratorAge` reaches the configured threshold, when opted in. */
  public readonly iteratorAgeAlarm?: cloudwatch.Alarm;
  /**
   * Alarms for each log filter, in the same order as
   * {@link LambdaFailureDetectorProps.logFilters}.
   */
  public readonly logFilterAlarms: LogFailureAlarm[];

  /**
   * @param scope - Parent construct.
   * @param id - Construct id.
   * @param props - Lambda, log group, optional topic, alarm config, platform metrics, and log filters.
   */
  constructor(scope: Construct, id: string, props: LambdaFailureDetectorProps) {
    super(scope, id);

    const alarmTopic = props.alarmTopic;
    this.alarmTopic = alarmTopic;
    const alarmConfig = resolveAlarmConfig(props.alarmConfig);

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

    const logFilters = props.logFilters ?? [];
    this.logFilterAlarms = logFilters.map((filter) => createLogFilterAlarm(
      this,
      props.logGroup,
      filter,
      alarmConfig,
      alarmTopic,
    ));
  }

  /**
   * Returns the log-filter alarm for the given filter id, or undefined when missing.
   *
   * @param id - Same as {@link LogFailureFilter.id}.
   * @returns Matching alarm, or undefined when the id was not in `logFilters`.
   */
  public findLogFilterAlarm(id: string): cloudwatch.Alarm | undefined {
    return this.logFilterAlarms.find((entry) => entry.id === id)?.alarm;
  }
}

/**
 * Creates a {@link LambdaFailureDetector} when failure detection is enabled.
 *
 * @param scope - Parent construct.
 * @param id - Construct id.
 * @param props - Lambda, log group, optional opt-in options, alarm config, platform metrics, and log filters.
 * @returns Detector construct, or undefined when disabled.
 */
export const createLambdaFailureDetector = (
  scope: Construct,
  id: string,
  props: CreateLambdaFailureDetectorProps,
): LambdaFailureDetector | undefined => {
  const failureDetection = props.failureDetection;
  if (!failureDetection) {
    return undefined;
  }

  if (!isLambdaFailureDetectionEnabled(failureDetection)) {
    return undefined;
  }

  return new LambdaFailureDetector(scope, id, {
    lambdaFunction: props.lambdaFunction,
    logGroup: props.logGroup,
    alarmTopic: failureDetection.alarmTopic,
    alarmConfig: props.alarmConfig,
    platformMetrics: props.platformMetrics,
    logFilters: props.logFilters,
  });
};
