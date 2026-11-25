# Lambda Failure Detector (CDK v2)

[![npm version](https://img.shields.io/npm/v/lambda-failure-detector?style=flat-square)](https://www.npmjs.com/package/lambda-failure-detector)
[![license](https://img.shields.io/npm/l/lambda-failure-detector?style=flat-square)](https://www.npmjs.com/package/lambda-failure-detector)
[![Node.js](https://img.shields.io/node/v/lambda-failure-detector?style=flat-square)](https://www.npmjs.com/package/lambda-failure-detector)
[![build](https://img.shields.io/github/actions/workflow/status/gammarers-aws-cdk-constructs/lambda-failure-detector/build.yml?label=build&style=flat-square)](https://github.com/gammarers-aws-cdk-constructs/lambda-failure-detector/actions/workflows/build.yml)

[![View on Construct Hub](https://constructs.dev/badge?package=lambda-failure-detector)](https://constructs.dev/packages/lambda-failure-detector)

Creates Amazon CloudWatch alarms for an AWS Lambda function. The construct alarms on the platform `Errors` and `Throttles` metrics and, for each log filter you supply, adds a CloudWatch Logs metric filter and an alarm. Pass an existing Amazon SNS topic when those alarms should send notifications.

## Features

- CloudWatch alarms on the Lambda `Errors` and `Throttles` metrics
- Optional platform alarms for `DeadLetterErrors`, `DestinationDeliveryFailures`, and stream `IteratorAge`
- Optional log metric filters and alarms for any CloudWatch Logs filter pattern, including JSON field comparisons
- Optional shared alarm config for threshold, period, evaluation periods, and missing-data handling
- Optional notifications through an existing SNS topic

## How it works

1. You pass a Lambda function. Pass `logGroup` only when you supply `logFailureFilters`. The construct does not create a log group and does not set retention.
2. The construct creates CloudWatch alarms on the `AWS/Lambda` `Errors` and `Throttles` metrics. By default, missing data does not breach, so a quiet schedule stays quiet between runs.
3. When you enable entries in `platformMetrics`, the construct adds matching platform alarms (`DeadLetterErrors`, `DestinationDeliveryFailures`, and/or `IteratorAge`).
4. For each entry in `logFailureFilters`, the construct adds a metric filter on `logGroup` and an alarm on the filter's sum. Omitting `logGroup` when filters are set fails synthesis. Each filter `id` must be unique; a duplicate fails synthesis.
5. When you pass `alarmConfig`, failure sum alarms use those settings. Defaults are threshold 1, period 5 minutes, evaluationPeriods 1, and treatMissingData `NOT_BREACHING`.
6. IteratorAge uses the same period and evaluation settings from `alarmConfig`, but its threshold comes from `platformMetrics.iteratorAgeThreshold` (default 60000 ms).
7. When you pass `topic`, every alarm, including log failure filters, notifies that topic. When you omit the topic, the alarms remain and have no SNS action. The construct does not create a topic.

## Installation

### npm

```bash
npm install lambda-failure-detector
```

### yarn

```bash
yarn add lambda-failure-detector
```

### pnpm

```bash
pnpm add lambda-failure-detector
```

## Usage

### Minimal deployable app

```typescript
import { App, Stack, type StackProps } from 'aws-cdk-lib';
import { Code, Function, Runtime } from 'aws-cdk-lib/aws-lambda';
import { Construct } from 'constructs';
import { LambdaFailureDetector } from 'lambda-failure-detector';

class ExampleStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const fn = new Function(this, 'Fn', {
      runtime: Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: Code.fromInline('exports.handler = async () => undefined;'),
    });

    new LambdaFailureDetector(this, 'FailureDetector', {
      lambdaFunction: fn,
    });
  }
}

const app = new App();

new ExampleStack(app, 'ExampleStack', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
});

app.synth();
```

Deploy checklist:

1. Install this package and peers (`aws-cdk-lib`, `constructs`) in your CDK app.
2. From the CDK app: `npx cdk deploy ExampleStack`

To alarm on a log line and notify an existing topic, pass `topic`, `logGroup`, and `logFailureFilters`. Create the log group yourself and set its retention there. Omitting `logGroup` when `logFailureFilters` is set fails synthesis. Pass `alarmConfig` when the default threshold or evaluation window needs tuning. Create the construct only when failure detection should be on.

```ts
import { Duration } from 'aws-cdk-lib';
import { TreatMissingData } from 'aws-cdk-lib/aws-cloudwatch';
import { type IFunction } from 'aws-cdk-lib/aws-lambda';
import { FilterPattern, type ILogGroup } from 'aws-cdk-lib/aws-logs';
import { type ITopic } from 'aws-cdk-lib/aws-sns';
import { LambdaFailureDetector } from 'lambda-failure-detector';

declare const fn: IFunction;
declare const logGroup: ILogGroup;
declare const topic: ITopic;

new LambdaFailureDetector(this, 'FailureDetector', {
  topic,
  lambdaFunction: fn,
  logGroup,
  logFailureFilters: [
    {
      id: 'ResourceWaitFailed',
      filterPattern: FilterPattern.literal('"ResourceWaitFailed"'),
      metricNamespace: 'App/Lambda',
      metricName: 'ResourceWaitFailed',
    },
    {
      id: 'LevelError',
      filterPattern: FilterPattern.stringValue('$.level', '=', 'ERROR'),
      metricNamespace: 'App/Lambda',
      metricName: 'LevelError',
    },
  ],
  alarmConfig: {
    threshold: 3,
    period: Duration.minutes(1),
    evaluationPeriods: 2,
    treatMissingData: TreatMissingData.BREACHING,
  },
});
```

## Options

### LambdaFailureDetectorProps

| Property | Type | Required | Description |
| --- | --- | --- | --- |
| `topic` | `sns.ITopic` | no | SNS topic for every alarm action, including log failure filters. When omitted, alarms have no SNS actions. |
| `lambdaFunction` | `lambda.IFunction` | yes | Lambda function whose platform failure metrics are alarmed. |
| `logGroup` | `logs.ILogGroup` | no | Log group for `logFailureFilters`. Required when `logFailureFilters` is non-empty. The construct does not create a log group or set retention. |
| `logFailureFilters` | `LogFailureFilter[]` | no | Log-based failure filters. Default: no log-based alarms. Each `id` must be unique. |
| `alarmConfig` | `AlarmConfig` | no | Shared settings for failure alarms. Default: threshold 1, period 5 minutes, evaluationPeriods 1, treatMissingData `NOT_BREACHING`. |
| `platformMetrics` | `PlatformMetricsOptions` | no | Opt-in platform metrics beyond `Errors` and `Throttles`. Default: no additional platform metric alarms. |

### AlarmConfig

| Property | Type | Required | Description |
| --- | --- | --- | --- |
| `threshold` | `number` | no | Alarm threshold for sum metrics. Default: 1. Does not apply to IteratorAge. |
| `period` | `Duration` | no | Metric period used by the alarm. Default: 5 minutes. |
| `evaluationPeriods` | `number` | no | Number of periods that must breach before the alarm fires. Default: 1. |
| `treatMissingData` | `cloudwatch.TreatMissingData` | no | How missing datapoints are treated. Default: `NOT_BREACHING`. |

### PlatformMetricsOptions

| Property | Type | Required | Description |
| --- | --- | --- | --- |
| `deadLetterErrors` | `boolean` | no | Create an alarm on `DeadLetterErrors`. Default: false. |
| `destinationDeliveryFailures` | `boolean` | no | Create an alarm on `DestinationDeliveryFailures`. Default: false. |
| `iteratorAge` | `boolean` | no | Create an alarm on stream `IteratorAge` (Maximum). Default: false. |
| `iteratorAgeThreshold` | `number` | no | IteratorAge threshold in milliseconds. Default: 60000. |

### LogFailureFilter

| Property | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | `string` | yes | Stable id used as the MetricFilter and Alarm construct id prefix. Must be unique within `logFailureFilters`. |
| `filterPattern` | `logs.IFilterPattern` | yes | CloudWatch Logs filter pattern. Passed through to the metric filter. |
| `metricNamespace` | `string` | yes | Custom metric namespace for the metric filter. |
| `metricName` | `string` | yes | Custom metric name for the metric filter. |

## API

See [API.md](./API.md).

## Requirements

- Node.js `>= 20.0.0`
- `aws-cdk-lib` `^2.232.0`
- `constructs` `^10.5.1`

## License

This project is licensed under the Apache-2.0 License.
