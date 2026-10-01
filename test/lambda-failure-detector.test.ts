import { App, Stack } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
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

const expectFailureAlarmShape = (template: Template, alarmCount: number): void => {
  template.resourceCountIs('AWS::CloudWatch::Alarm', alarmCount);

  const alarms = Object.values(template.findResources('AWS::CloudWatch::Alarm'));
  for (const alarm of alarms) {
    expect(alarm.Properties).toEqual(expect.objectContaining({
      Threshold: EXPECTED_THRESHOLD,
      EvaluationPeriods: EXPECTED_EVALUATION_PERIODS,
      ComparisonOperator: 'GreaterThanOrEqualToThreshold',
      TreatMissingData: 'notBreaching',
      Period: EXPECTED_PERIOD_SECONDS,
      Statistic: 'Sum',
    }));
  }
};

describe('LambdaFailureDetector', () => {
  it('alarms on Lambda Errors and does not attach SNS when no topic is given', () => {
    const { stack, fn, logGroup } = createFixture();

    const detector = new LambdaFailureDetector(stack, 'Detector', {
      lambdaFunction: fn,
      logGroup,
    });

    const template = Template.fromStack(stack);
    expectFailureAlarmShape(template, 1);
    template.resourceCountIs('AWS::Logs::MetricFilter', 0);
    expect(detector.alarmTopic).toBeUndefined();
    expect(detector.logFilterAlarms).toEqual([]);
    expect(detector.findLogFilterAlarm('ResourceWaitFailed')).toBeUndefined();

    const alarms = Object.values(template.findResources('AWS::CloudWatch::Alarm'));
    expect(alarms[0].Properties.AlarmActions).toBeUndefined();
    expect(alarms[0].Properties.Namespace).toBe('AWS/Lambda');
    expect(alarms[0].Properties.MetricName).toBe('Errors');
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
    expectFailureAlarmShape(template, 2);
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
    });

    expect(detector).toBeInstanceOf(LambdaFailureDetector);
    expect(detector?.findLogFilterAlarm(RESOURCE_WAIT_FAILED.id)).toBeDefined();
    Template.fromStack(stack).resourceCountIs('AWS::CloudWatch::Alarm', 2);
  });
});
