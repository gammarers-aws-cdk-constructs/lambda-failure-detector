import { Duration } from 'aws-cdk-lib';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as cloudwatch_actions from 'aws-cdk-lib/aws-cloudwatch-actions';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as sns from 'aws-cdk-lib/aws-sns';
import { Construct } from 'constructs';
import { isLambdaFailureDetectionEnabled } from './core/lambda-failure-detection';
import type {
  CreateLambdaFailureDetectorProps,
  LambdaFailureDetectorProps,
} from './core/lambda-failure-detector-props';
import type { LogFailureFilter } from './core/log-failure-filter';

/** Alarm threshold for failure sum metrics. */
const FAILURE_ALARM_THRESHOLD = 1;
/** Evaluation periods for failure alarms. */
const FAILURE_ALARM_EVALUATION_PERIODS = 1;
/** Metric period for failure alarms. */
const FAILURE_ALARM_PERIOD = Duration.minutes(5);
/** Statistic used for failure sum metrics. */
const FAILURE_ALARM_STATISTIC = 'Sum';
/** Metric filter value emitted per matching log event. */
const LOG_METRIC_VALUE = '1';
/** Default value when no matching log events occur in the period. */
const LOG_METRIC_DEFAULT_VALUE = 0;

/**
 * Alarm created for one {@link LogFailureFilter}.
 */
export interface LogFailureAlarm {
  /** Same as {@link LogFailureFilter.id}. */
  readonly id: string;
  /** Alarm on the log metric filter sum. */
  readonly alarm: cloudwatch.Alarm;
}

interface SumAlarmProps {
  readonly metric: cloudwatch.IMetric;
  readonly alarmTopic?: sns.ITopic;
}

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
 * Creates a CloudWatch alarm that fires when a sum metric is at or above the failure threshold.
 *
 * Missing data is not breaching, so a quiet schedule does not alarm between runs.
 * `aws-cdk-lib` 2.232.0 types `CreateAlarmOptionsBase` as an empty export, so
 * `evaluationPeriods` and `treatMissingData` are absent from `AlarmProps`.
 * The alarm construct still forwards both properties to `CfnAlarm`.
 *
 * @param scope - Parent construct.
 * @param id - Construct id.
 * @param props - Metric to alarm, and an optional SNS topic.
 * @returns Alarm configured for a failure sum.
 */
const createSumAlarm = (
  scope: Construct,
  id: string,
  props: SumAlarmProps,
): cloudwatch.Alarm => {
  const alarmProps = {
    metric: props.metric,
    threshold: FAILURE_ALARM_THRESHOLD,
    comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
    evaluationPeriods: FAILURE_ALARM_EVALUATION_PERIODS,
    treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
  };
  const alarm = new cloudwatch.Alarm(scope, id, alarmProps);
  attachAlarmActions(alarm, props.alarmTopic);
  return alarm;
};

/**
 * Creates the metric filter and sum alarm for one {@link LogFailureFilter}.
 *
 * @param scope - Parent construct.
 * @param logGroup - Log group the filter reads.
 * @param filter - Log pattern and custom metric names.
 * @param alarmTopic - Optional topic attached to the alarm.
 * @returns Filter id and its alarm.
 */
const createLogFilterAlarm = (
  scope: Construct,
  logGroup: logs.ILogGroup,
  filter: LogFailureFilter,
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
  const alarm = createSumAlarm(scope, `${filter.id}Alarm`, {
    metric: metricFilter.metric({
      period: FAILURE_ALARM_PERIOD,
      statistic: FAILURE_ALARM_STATISTIC,
    }),
    alarmTopic,
  });

  return { id: filter.id, alarm };
};

/**
 * CloudWatch failure detection for a Lambda function.
 *
 * Always creates a platform `AWS/Lambda` `Errors` alarm. Optionally creates one
 * metric filter and alarm per {@link LogFailureFilter}. Does not create an SNS topic;
 * pass {@link LambdaFailureDetectorProps.alarmTopic} to attach notifications.
 */
export class LambdaFailureDetector extends Construct {
  /** SNS topic used for alarm actions, when configured. */
  public readonly alarmTopic?: sns.ITopic;
  /** Fires when the Lambda `Errors` metric is non-zero. */
  public readonly lambdaErrorsAlarm: cloudwatch.Alarm;
  /**
   * Alarms for each log filter, in the same order as
   * {@link LambdaFailureDetectorProps.logFilters}.
   */
  public readonly logFilterAlarms: LogFailureAlarm[];

  /**
   * @param scope - Parent construct.
   * @param id - Construct id.
   * @param props - Lambda, log group, optional topic, and log filters.
   */
  constructor(scope: Construct, id: string, props: LambdaFailureDetectorProps) {
    super(scope, id);

    const alarmTopic = props.alarmTopic;
    this.alarmTopic = alarmTopic;

    this.lambdaErrorsAlarm = createSumAlarm(this, 'LambdaErrorsAlarm', {
      metric: props.lambdaFunction.metricErrors({
        period: FAILURE_ALARM_PERIOD,
        statistic: FAILURE_ALARM_STATISTIC,
      }),
      alarmTopic,
    });

    const logFilters = props.logFilters ?? [];
    this.logFilterAlarms = logFilters.map((filter) => createLogFilterAlarm(
      this,
      props.logGroup,
      filter,
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
 * @param props - Lambda, log group, optional opt-in options, and log filters.
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
    logFilters: props.logFilters,
  });
};
