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
- Optional log-pattern metric filters and alarms (log group optional; managed with configurable retention, default one year)
- Optional shared `alarmConfig` for threshold, period, evaluation periods, and missing-data handling
- Optional notifications through an existing SNS topic
- Opt-in helper that creates the construct only when failure detection is enabled

## How it works

1. You pass a Lambda function. A log group is needed only when you supply `logFilters`.
2. The construct creates CloudWatch alarms on the `AWS/Lambda` `Errors` and `Throttles` metrics. By default, missing data does not breach, so a quiet schedule stays quiet between runs.
3. When you enable entries in `platformMetrics`, the construct adds matching platform alarms (`DeadLetterErrors`, `DestinationDeliveryFailures`, and/or `IteratorAge`).
4. For each log filter, the construct adds a metric filter and an alarm on the filter's sum. Pass `logGroup` to use an existing group, or omit it to manage `/aws/lambda/<functionName>` with `logRetention` (default one year).
5. When you pass `alarmConfig`, failure sum alarms use those settings. IteratorAge uses the same period and evaluation settings, but its threshold comes from `platformMetrics.iteratorAgeThreshold` (default 60000 ms). When you omit `alarmConfig`, the defaults are threshold 1, period 5 minutes, evaluationPeriods 1, and treatMissingData `NOT_BREACHING`.
6. When you pass an SNS topic, every alarm notifies that topic. When you omit the topic, the alarms remain and have no SNS action.
7. `createLambdaFailureDetector` creates the construct only when failure detection is enabled.

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

```ts
import { Stack, StackProps } from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { Construct } from 'constructs';
import { LambdaFailureDetector } from 'lambda-failure-detector';

export class ExampleStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const fn = new lambda.Function(this, 'Fn', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromInline('exports.handler = async () => undefined;'),
    });

    new LambdaFailureDetector(this, 'FailureDetector', {
      lambdaFunction: fn,
    });
  }
}
```

To alarm on a log line and notify an existing topic, pass `logFilters` and `alarmTopic`. Omit `logGroup` to manage `/aws/lambda/<functionName>` with one-year retention (or set `logRetention`). Use `createLambdaFailureDetector` when creation itself is optional. Pass `alarmConfig` when the default threshold or evaluation window needs tuning.

```ts
import { Duration } from 'aws-cdk-lib';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as sns from 'aws-cdk-lib/aws-sns';
import { createLambdaFailureDetector } from 'lambda-failure-detector';

declare const topic: sns.ITopic;

const detector = createLambdaFailureDetector(this, 'FailureDetector', {
  failureDetection: {
    enabled: true,
    alarmTopic: topic,
  },
  lambdaFunction: fn,
  logRetention: logs.RetentionDays.THREE_MONTHS,
  alarmConfig: {
    threshold: 3,
    period: Duration.minutes(1),
    evaluationPeriods: 2,
    treatMissingData: cloudwatch.TreatMissingData.BREACHING,
  },
  logFilters: [
    {
      id: 'ResourceWaitFailed',
      filterPattern: '"ResourceWaitFailed"',
      metricNamespace: 'App/Lambda',
      metricName: 'ResourceWaitFailed',
    },
  ],
});
```

## Options

### LambdaFailureDetectorProps

| Property | Type | Required | Description |
| --- | --- | --- | --- |
| `lambdaFunction` | `lambda.IFunction` | yes | Lambda function whose platform failure metrics are alarmed. |
| `logGroup` | `logs.ILogGroup` | no | Log group for log metric filters. Omit with `logFilters` to manage `/aws/lambda/<functionName>`. Do not set with `logRetention`. |
| `logRetention` | `logs.RetentionDays` | no | Retention when the construct manages the Lambda log group. Default: `ONE_YEAR`. Do not set with `logGroup`. |
| `alarmTopic` | `sns.ITopic` | no | SNS topic for every alarm action. When omitted, alarms have no SNS actions. |
| `alarmConfig` | `AlarmConfig` | no | Shared settings for failure alarms. Default: threshold 1, period 5 minutes, evaluationPeriods 1, treatMissingData `NOT_BREACHING`. |
| `platformMetrics` | `PlatformMetricsOptions` | no | Opt-in platform metrics beyond `Errors` and `Throttles`. Default: no additional platform metric alarms. |
| `logFilters` | `LogFailureFilter[]` | no | Log-based failure filters. Default: no log-based alarms. |

### CreateLambdaFailureDetectorProps

| Property | Type | Required | Description |
| --- | --- | --- | --- |
| `failureDetection` | `LambdaFailureDetection` | no | Opt-in options. Alarms are created only when `enabled` is true. |
| `lambdaFunction` | `lambda.IFunction` | yes | Lambda function to monitor. |
| `logGroup` | `logs.ILogGroup` | no | Log group for log-based filters. Same rules as `LambdaFailureDetectorProps.logGroup`. |
| `logRetention` | `logs.RetentionDays` | no | Retention when the construct manages the Lambda log group. Default: `ONE_YEAR`. |
| `alarmConfig` | `AlarmConfig` | no | Shared settings for failure alarms. Default: threshold 1, period 5 minutes, evaluationPeriods 1, treatMissingData `NOT_BREACHING`. |
| `platformMetrics` | `PlatformMetricsOptions` | no | Opt-in platform metrics beyond `Errors` and `Throttles`. Default: no additional platform metric alarms. |
| `logFilters` | `LogFailureFilter[]` | no | Log-based failure filters. Default: no log-based alarms. |

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

### LambdaFailureDetection

| Property | Type | Required | Description |
| --- | --- | --- | --- |
| `enabled` | `boolean` | no | When true, creates failure detection alarms and log-based metrics. Default: false when omitted. |
| `alarmTopic` | `sns.ITopic` | no | SNS topic for alarm notifications. When omitted, alarms have no SNS actions. |

### LogFailureFilter

| Property | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | `string` | yes | Stable id used as the MetricFilter and Alarm construct id prefix. |
| `filterPattern` | `string` | yes | Filter pattern string passed to `FilterPattern.literal`. |
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
