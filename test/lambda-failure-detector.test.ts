import { App, Duration, Stack } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as sns from 'aws-cdk-lib/aws-sns';
import {
  createLambdaFailureDetector,
  LambdaFailureDetector,
  type LogFailureFilter,
} from '../src';

/** Expected sum threshold shared by every failure alarm. */
const EXPECTED_THRESHOLD = 1;
/** Expected evaluation window shared by every failure alarm. */
const EXPECTED_EVALUATION_PERIODS = 1;
/** Five-minute metric period, in seconds. */
const EXPECTED_PERIOD_SECONDS = 300;
/** Default IteratorAge threshold used by the construct. */
const EXPECTED_ITERATOR_AGE_THRESHOLD_MS = 60_000;

const RESOURCE_WAIT_FAILED: LogFailureFilter = {
  id: 'ResourceWaitFailed',
  filterPattern: '"ResourceWaitFailed"',
  metricNamespace: 'App/Lambda',
  metricName: 'ResourceWaitFailed',
};

interface DetectorFixture {
  readonly stack: Stack;
  readonly fn: lambda.Function;
  readonly logGroup: logs.LogGroup;
}

const createFixture = (): DetectorFixture => {
  const app = new App();
  const stack = new Stack(app, 'TestStack');
  const fn = new lambda.Function(stack, 'Fn', {
    runtime: lambda.Runtime.NODEJS_20_X,
    handler: 'index.handler',
    code: lambda.Code.fromInline('exports.handler = async () => undefined;'),
  });
  const logGroup = new logs.LogGroup(stack, 'Logs');

  return { stack, fn, logGroup };
};

interface ExpectedAlarmShape {
  readonly threshold?: number;
  readonly evaluationPeriods?: number;
  readonly periodSeconds?: number;
  readonly treatMissingData?: string;
  readonly statistic?: string;
}

const expectFailureAlarmShape = (
  template: Template,
  alarmCount: number,
  expected: ExpectedAlarmShape = {},
): void => {
  template.resourceCountIs('AWS::CloudWatch::Alarm', alarmCount);

  const alarms = Object.values(template.findResources('AWS::CloudWatch::Alarm'));
  for (const alarm of alarms) {
    expect(alarm.Properties).toEqual(expect.objectContaining({
      Threshold: expected.threshold ?? EXPECTED_THRESHOLD,
      EvaluationPeriods: expected.evaluationPeriods ?? EXPECTED_EVALUATION_PERIODS,
      ComparisonOperator: 'GreaterThanOrEqualToThreshold',
      TreatMissingData: expected.treatMissingData ?? 'notBreaching',
      Period: expected.periodSeconds ?? EXPECTED_PERIOD_SECONDS,
      Statistic: expected.statistic ?? 'Sum',
    }));
  }
};

const findAlarmByMetricName = (
  template: Template,
  metricName: string,
): Record<string, unknown> => {
  const alarms = Object.values(template.findResources('AWS::CloudWatch::Alarm'));
  const match = alarms.find((alarm) => alarm.Properties.MetricName === metricName);
  if (!match) {
    throw new Error(`Alarm for metric ${metricName} was not found`);
  }
  return match.Properties as Record<string, unknown>;
};

describe('LambdaFailureDetector', () => {
  it('alarms on Lambda Errors and Throttles and does not attach SNS when no topic is given', () => {
    const { stack, fn, logGroup } = createFixture();

    const detector = new LambdaFailureDetector(stack, 'Detector', {
      lambdaFunction: fn,
      logGroup,
    });

    const template = Template.fromStack(stack);
    expectFailureAlarmShape(template, 2);
    template.resourceCountIs('AWS::Logs::MetricFilter', 0);
    expect(detector.alarmTopic).toBeUndefined();
    expect(detector.logFilterAlarms).toEqual([]);
    expect(detector.findLogFilterAlarm('ResourceWaitFailed')).toBeUndefined();
    expect(detector.deadLetterErrorsAlarm).toBeUndefined();
    expect(detector.destinationDeliveryFailuresAlarm).toBeUndefined();
    expect(detector.iteratorAgeAlarm).toBeUndefined();

    const errors = findAlarmByMetricName(template, 'Errors');
    const throttles = findAlarmByMetricName(template, 'Throttles');
    expect(errors.AlarmActions).toBeUndefined();
    expect(errors.Namespace).toBe('AWS/Lambda');
    expect(throttles.AlarmActions).toBeUndefined();
    expect(throttles.Namespace).toBe('AWS/Lambda');
    expect(detector.lambdaErrorsAlarm).toBeDefined();
    expect(detector.lambdaThrottlesAlarm).toBeDefined();
  });

  it('creates one metric filter alarm per log filter and notifies the given topic', () => {
    const { stack, fn, logGroup } = createFixture();
    const topic = new sns.Topic(stack, 'Alarms');

    const detector = new LambdaFailureDetector(stack, 'Detector', {
      lambdaFunction: fn,
      logGroup,
      alarmTopic: topic,
      logFilters: [RESOURCE_WAIT_FAILED],
    });

    const template = Template.fromStack(stack);
    expectFailureAlarmShape(template, 3);
    template.hasResourceProperties('AWS::Logs::MetricFilter', {
      FilterPattern: RESOURCE_WAIT_FAILED.filterPattern,
      MetricTransformations: [
        {
          MetricNamespace: RESOURCE_WAIT_FAILED.metricNamespace,
          MetricName: RESOURCE_WAIT_FAILED.metricName,
          MetricValue: '1',
          DefaultValue: 0,
        },
      ],
    });

    expect(detector.alarmTopic).toBe(topic);
    expect(detector.logFilterAlarms).toHaveLength(1);
    expect(detector.findLogFilterAlarm(RESOURCE_WAIT_FAILED.id)).toBe(detector.logFilterAlarms[0].alarm);
    expect(detector.findLogFilterAlarm('missing')).toBeUndefined();

    const alarms = Object.values(template.findResources('AWS::CloudWatch::Alarm'));
    for (const alarm of alarms) {
      expect(alarm.Properties.AlarmActions).toHaveLength(1);
    }
  });

  it('applies alarmConfig to every failure sum alarm', () => {
    const { stack, fn, logGroup } = createFixture();

    new LambdaFailureDetector(stack, 'Detector', {
      lambdaFunction: fn,
      logGroup,
      logFilters: [RESOURCE_WAIT_FAILED],
      alarmConfig: {
        threshold: 3,
        period: Duration.minutes(1),
        evaluationPeriods: 2,
        treatMissingData: cloudwatch.TreatMissingData.BREACHING,
      },
    });

    expectFailureAlarmShape(Template.fromStack(stack), 3, {
      threshold: 3,
      evaluationPeriods: 2,
      periodSeconds: 60,
      treatMissingData: 'breaching',
    });
  });

  it('creates opt-in platform metric alarms when enabled', () => {
    const { stack, fn, logGroup } = createFixture();

    const detector = new LambdaFailureDetector(stack, 'Detector', {
      lambdaFunction: fn,
      logGroup,
      platformMetrics: {
        deadLetterErrors: true,
        destinationDeliveryFailures: true,
        iteratorAge: true,
        iteratorAgeThreshold: 120_000,
      },
    });

    const template = Template.fromStack(stack);
    template.resourceCountIs('AWS::CloudWatch::Alarm', 5);

    expect(detector.deadLetterErrorsAlarm).toBeDefined();
    expect(detector.destinationDeliveryFailuresAlarm).toBeDefined();
    expect(detector.iteratorAgeAlarm).toBeDefined();

    expect(findAlarmByMetricName(template, 'DeadLetterErrors')).toEqual(expect.objectContaining({
      Namespace: 'AWS/Lambda',
      Statistic: 'Sum',
      Threshold: EXPECTED_THRESHOLD,
    }));
    expect(findAlarmByMetricName(template, 'DestinationDeliveryFailures')).toEqual(expect.objectContaining({
      Namespace: 'AWS/Lambda',
      Statistic: 'Sum',
      Threshold: EXPECTED_THRESHOLD,
    }));
    expect(findAlarmByMetricName(template, 'IteratorAge')).toEqual(expect.objectContaining({
      Namespace: 'AWS/Lambda',
      Statistic: 'Maximum',
      Threshold: 120_000,
      TreatMissingData: 'notBreaching',
      Period: EXPECTED_PERIOD_SECONDS,
    }));
  });

  it('uses the default IteratorAge threshold when omitted', () => {
    const { stack, fn, logGroup } = createFixture();

    new LambdaFailureDetector(stack, 'Detector', {
      lambdaFunction: fn,
      logGroup,
      platformMetrics: {
        iteratorAge: true,
      },
    });

    const template = Template.fromStack(stack);
    expect(findAlarmByMetricName(template, 'IteratorAge').Threshold).toBe(
      EXPECTED_ITERATOR_AGE_THRESHOLD_MS,
    );
  });
});

describe('createLambdaFailureDetector', () => {
  it('returns undefined and creates no alarm when failure detection is omitted', () => {
    const { stack, fn, logGroup } = createFixture();

    const detector = createLambdaFailureDetector(stack, 'Detector', {
      lambdaFunction: fn,
      logGroup,
    });

    expect(detector).toBeUndefined();
    Template.fromStack(stack).resourceCountIs('AWS::CloudWatch::Alarm', 0);
  });

  it('returns undefined when failure detection is disabled', () => {
    const { stack, fn, logGroup } = createFixture();

    const detector = createLambdaFailureDetector(stack, 'Detector', {
      failureDetection: { enabled: false },
      lambdaFunction: fn,
      logGroup,
      logFilters: [RESOURCE_WAIT_FAILED],
    });

    expect(detector).toBeUndefined();
    Template.fromStack(stack).resourceCountIs('AWS::CloudWatch::Alarm', 0);
    Template.fromStack(stack).resourceCountIs('AWS::Logs::MetricFilter', 0);
  });

  it('creates the detector when failure detection is enabled', () => {
    const { stack, fn, logGroup } = createFixture();

    const detector = createLambdaFailureDetector(stack, 'Detector', {
      failureDetection: { enabled: true },
      lambdaFunction: fn,
      logGroup,
      logFilters: [RESOURCE_WAIT_FAILED],
      platformMetrics: {
        deadLetterErrors: true,
      },
    });

    expect(detector).toBeInstanceOf(LambdaFailureDetector);
    expect(detector?.findLogFilterAlarm(RESOURCE_WAIT_FAILED.id)).toBeDefined();
    expect(detector?.deadLetterErrorsAlarm).toBeDefined();
    // Errors + Throttles + DeadLetterErrors + one log filter
    Template.fromStack(stack).resourceCountIs('AWS::CloudWatch::Alarm', 4);
  });
});
