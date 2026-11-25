import { App, Duration, Stack } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { TreatMissingData } from 'aws-cdk-lib/aws-cloudwatch';
import { Code, Function, Runtime } from 'aws-cdk-lib/aws-lambda';
import { FilterPattern, LogGroup } from 'aws-cdk-lib/aws-logs';
import { Topic } from 'aws-cdk-lib/aws-sns';
import {
  LambdaFailureDetector,
  type LambdaFailureDetectorProps,
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
  filterPattern: FilterPattern.literal('"ResourceWaitFailed"'),
  metricNamespace: 'App/Lambda',
  metricName: 'ResourceWaitFailed',
};

interface DetectorFixture {
  readonly stack: Stack;
  readonly fn: Function;
  readonly logGroup: LogGroup;
}

const createFixture = (): DetectorFixture => {
  const app = new App();
  const stack = new Stack(app, 'TestStack');
  const fn = new Function(stack, 'Fn', {
    runtime: Runtime.NODEJS_20_X,
    handler: 'index.handler',
    code: Code.fromInline('exports.handler = async () => undefined;'),
  });
  const logGroup = new LogGroup(stack, 'Logs');

  return { stack, fn, logGroup };
};

interface ExpectedAlarmShape {
  readonly threshold?: number;
  readonly evaluationPeriods?: number;
  readonly periodSeconds?: number;
  readonly treatMissingData?: string;
  readonly statistic?: string;
}

/** Alarm fields these tests read from a synthesized CloudWatch alarm. */
interface AlarmProperties {
  readonly MetricName?: unknown;
  readonly Namespace?: unknown;
  readonly Threshold?: unknown;
  readonly EvaluationPeriods?: unknown;
  readonly ComparisonOperator?: unknown;
  readonly TreatMissingData?: unknown;
  readonly Period?: unknown;
  readonly Statistic?: unknown;
  readonly AlarmActions?: readonly unknown[];
}

interface AlarmResource {
  readonly Properties: AlarmProperties;
}

const isRecord = (value: unknown): value is Record<string, unknown> => (
  typeof value === 'object' && value !== null && !Array.isArray(value)
);

const readUnknownArray = (value: unknown): readonly unknown[] | undefined => {
  if (value === undefined) {
    return undefined;
  }
  if (!Array.isArray(value)) {
    throw new Error('CloudWatch alarm AlarmActions was not an array.');
  }

  const actions: unknown[] = [];
  for (const action of value) {
    const item: unknown = action;
    actions.push(item);
  }
  return actions;
};

const readAlarmProperties = (value: unknown): AlarmProperties => {
  if (!isRecord(value)) {
    throw new Error('CloudWatch alarm resource has no properties.');
  }

  return {
    MetricName: value.MetricName,
    Namespace: value.Namespace,
    Threshold: value.Threshold,
    EvaluationPeriods: value.EvaluationPeriods,
    ComparisonOperator: value.ComparisonOperator,
    TreatMissingData: value.TreatMissingData,
    Period: value.Period,
    Statistic: value.Statistic,
    AlarmActions: readUnknownArray(value.AlarmActions),
  };
};

/**
 * Reads synthesized CloudWatch alarms.
 *
 * @param template - Stack template under test.
 * @returns Alarm properties used by the assertions below.
 */
const readAlarmResources = (template: Template): readonly AlarmResource[] => {
  // aws-cdk-lib types Template.findResources as an index signature of any.
  const resources: unknown = template.findResources('AWS::CloudWatch::Alarm');
  if (!isRecord(resources)) {
    throw new Error('CloudWatch alarm resources were not an object.');
  }

  return Object.values(resources).map((resource) => {
    if (!isRecord(resource)) {
      throw new Error('CloudWatch alarm resource was not an object.');
    }

    return {
      Properties: readAlarmProperties(resource.Properties),
    };
  });
};

const expectFailureAlarmShape = (
  template: Template,
  alarmCount: number,
  expected: ExpectedAlarmShape = {},
): void => {
  template.resourceCountIs('AWS::CloudWatch::Alarm', alarmCount);

  const alarms = readAlarmResources(template);
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
): AlarmProperties => {
  const match = readAlarmResources(template).find((alarm) => alarm.Properties.MetricName === metricName);
  if (!match) {
    throw new Error(`Alarm for metric ${metricName} was not found`);
  }
  return match.Properties;
};

describe('LambdaFailureDetector', () => {
  it('alarms on Lambda Errors and Throttles without requiring a log group', () => {
    const { stack, fn } = createFixture();

    const detector = new LambdaFailureDetector(stack, 'Detector', {
      lambdaFunction: fn,
    });

    const template = Template.fromStack(stack);
    expectFailureAlarmShape(template, 2);
    template.resourceCountIs('AWS::Logs::MetricFilter', 0);
    template.resourceCountIs('Custom::LogRetention', 0);
    expect(detector.alarmTopic).toBeUndefined();
    expect(detector.logGroup).toBeUndefined();
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
    const topic = new Topic(stack, 'Alarms');

    const detector = new LambdaFailureDetector(stack, 'Detector', {
      topic,
      lambdaFunction: fn,
      logGroup,
      logFailureFilters: [RESOURCE_WAIT_FAILED],
    });

    const template = Template.fromStack(stack);
    expectFailureAlarmShape(template, 3);
    template.hasResourceProperties('AWS::Logs::MetricFilter', {
      FilterPattern: RESOURCE_WAIT_FAILED.filterPattern.logPatternString,
      MetricTransformations: [
        {
          MetricNamespace: RESOURCE_WAIT_FAILED.metricNamespace,
          MetricName: RESOURCE_WAIT_FAILED.metricName,
          MetricValue: '1',
          DefaultValue: 0,
        },
      ],
    });
    template.resourceCountIs('Custom::LogRetention', 0);

    expect(detector.alarmTopic).toBe(topic);
    expect(detector.logGroup).toBe(logGroup);
    expect(detector.logFilterAlarms).toHaveLength(1);
    expect(detector.findLogFilterAlarm(RESOURCE_WAIT_FAILED.id)).toBe(detector.logFilterAlarms[0].alarm);
    expect(detector.findLogFilterAlarm('missing')).toBeUndefined();

    const alarms = readAlarmResources(template);
    for (const alarm of alarms) {
      expect(alarm.Properties.AlarmActions).toHaveLength(1);
    }
  });

  it('passes a JSON field filter pattern through without wrapping it', () => {
    const { stack, fn, logGroup } = createFixture();
    const levelError = FilterPattern.stringValue('$.level', '=', 'ERROR');

    new LambdaFailureDetector(stack, 'Detector', {
      lambdaFunction: fn,
      logGroup,
      logFailureFilters: [
        {
          id: 'LevelError',
          filterPattern: levelError,
          metricNamespace: 'App/Lambda',
          metricName: 'LevelError',
        },
      ],
    });

    Template.fromStack(stack).hasResourceProperties('AWS::Logs::MetricFilter', {
      FilterPattern: levelError.logPatternString,
    });
  });

  it('throws when log filter ids are duplicated', () => {
    const { stack, fn, logGroup } = createFixture();

    expect(() => new LambdaFailureDetector(stack, 'Detector', {
      lambdaFunction: fn,
      logGroup,
      logFailureFilters: [
        RESOURCE_WAIT_FAILED,
        {
          ...RESOURCE_WAIT_FAILED,
          metricName: 'ResourceWaitFailedAgain',
        },
      ],
    })).toThrow('logFailureFilters id must be unique.');
  });

  it('throws when logFailureFilters is set without logGroup', () => {
    const { stack, fn } = createFixture();

    expect(() => new LambdaFailureDetector(stack, 'Detector', {
      lambdaFunction: fn,
      logFailureFilters: [RESOURCE_WAIT_FAILED],
    })).toThrow('logFailureFilters requires logGroup.');
  });

  it('ignores logGroup when logFailureFilters is omitted', () => {
    const { stack, fn, logGroup } = createFixture();

    const detector = new LambdaFailureDetector(stack, 'Detector', {
      lambdaFunction: fn,
      logGroup,
    });

    const template = Template.fromStack(stack);
    expectFailureAlarmShape(template, 2);
    template.resourceCountIs('AWS::Logs::MetricFilter', 0);
    template.resourceCountIs('Custom::LogRetention', 0);
    expect(detector.logGroup).toBeUndefined();
    expect(detector.logFilterAlarms).toEqual([]);
  });

  it('applies alarmConfig to every failure sum alarm', () => {
    const { stack, fn, logGroup } = createFixture();

    new LambdaFailureDetector(stack, 'Detector', {
      lambdaFunction: fn,
      logGroup,
      logFailureFilters: [RESOURCE_WAIT_FAILED],
      alarmConfig: {
        threshold: 3,
        period: Duration.minutes(1),
        evaluationPeriods: 2,
        treatMissingData: TreatMissingData.BREACHING,
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
    const { stack, fn } = createFixture();

    const detector = new LambdaFailureDetector(stack, 'Detector', {
      lambdaFunction: fn,
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
    const { stack, fn } = createFixture();

    new LambdaFailureDetector(stack, 'Detector', {
      lambdaFunction: fn,
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

interface SynthesisSnapshotCase {
  readonly name: string;
  readonly createProps: (fixture: DetectorFixture) => LambdaFailureDetectorProps;
}

/** Representative public prop combinations pinned by synthesis snapshots. */
const SYNTHESIS_SNAPSHOT_CASES: readonly SynthesisSnapshotCase[] = [
  {
    name: 'defaults',
    createProps: ({ fn }) => ({
      lambdaFunction: fn,
    }),
  },
  {
    name: 'custom alarm config',
    createProps: ({ fn }) => ({
      lambdaFunction: fn,
      alarmConfig: {
        threshold: 3,
        period: Duration.minutes(1),
        evaluationPeriods: 2,
        treatMissingData: TreatMissingData.BREACHING,
      },
    }),
  },
  {
    name: 'existing topic',
    createProps: ({ stack, fn }) => ({
      topic: new Topic(stack, 'Alarms'),
      lambdaFunction: fn,
    }),
  },
  {
    name: 'log filters on an existing log group',
    createProps: ({ fn, logGroup }) => ({
      lambdaFunction: fn,
      logGroup,
      logFailureFilters: [RESOURCE_WAIT_FAILED],
    }),
  },
  {
    name: 'platform metrics',
    createProps: ({ fn }) => ({
      lambdaFunction: fn,
      platformMetrics: {
        deadLetterErrors: true,
        destinationDeliveryFailures: true,
        iteratorAge: true,
        iteratorAgeThreshold: 120_000,
      },
    }),
  },
];

describe('LambdaFailureDetector synthesis snapshots', () => {
  it.each(SYNTHESIS_SNAPSHOT_CASES)('$name', ({ createProps }) => {
    const fixture = createFixture();
    new LambdaFailureDetector(fixture.stack, 'Detector', createProps(fixture));
    expect(Template.fromStack(fixture.stack).toJSON()).toMatchSnapshot();
  });
});
