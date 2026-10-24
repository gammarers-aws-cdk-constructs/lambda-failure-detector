# API Reference <a name="API Reference" id="api-reference"></a>

## Constructs <a name="Constructs" id="Constructs"></a>

### LambdaFailureDetector <a name="LambdaFailureDetector" id="lambda-failure-detector.LambdaFailureDetector"></a>

CloudWatch failure detection for a Lambda function.

Always creates platform `AWS/Lambda` `Errors` and `Throttles` alarms.
Optionally creates DeadLetterErrors, DestinationDeliveryFailures, and IteratorAge
alarms, plus one metric filter and alarm per {@link LogFailureFilter}.
Does not create an SNS topic; pass {@link LambdaFailureDetectorProps.alarmTopic}
to attach notifications.

#### Initializers <a name="Initializers" id="lambda-failure-detector.LambdaFailureDetector.Initializer"></a>

```typescript
import { LambdaFailureDetector } from 'lambda-failure-detector'

new LambdaFailureDetector(scope: Construct, id: string, props: LambdaFailureDetectorProps)
```

| **Name** | **Type** | **Description** |
| --- | --- | --- |
| <code><a href="#lambda-failure-detector.LambdaFailureDetector.Initializer.parameter.scope">scope</a></code> | <code>constructs.Construct</code> | - Parent construct. |
| <code><a href="#lambda-failure-detector.LambdaFailureDetector.Initializer.parameter.id">id</a></code> | <code>string</code> | - Construct id. |
| <code><a href="#lambda-failure-detector.LambdaFailureDetector.Initializer.parameter.props">props</a></code> | <code><a href="#lambda-failure-detector.LambdaFailureDetectorProps">LambdaFailureDetectorProps</a></code> | - Lambda, optional log group / retention, topic, alarm config, platform metrics, and log filters. |

---

##### `scope`<sup>Required</sup> <a name="scope" id="lambda-failure-detector.LambdaFailureDetector.Initializer.parameter.scope"></a>

- *Type:* constructs.Construct

Parent construct.

---

##### `id`<sup>Required</sup> <a name="id" id="lambda-failure-detector.LambdaFailureDetector.Initializer.parameter.id"></a>

- *Type:* string

Construct id.

---

##### `props`<sup>Required</sup> <a name="props" id="lambda-failure-detector.LambdaFailureDetector.Initializer.parameter.props"></a>

- *Type:* <a href="#lambda-failure-detector.LambdaFailureDetectorProps">LambdaFailureDetectorProps</a>

Lambda, optional log group / retention, topic, alarm config, platform metrics, and log filters.

---

#### Methods <a name="Methods" id="Methods"></a>

| **Name** | **Description** |
| --- | --- |
| <code><a href="#lambda-failure-detector.LambdaFailureDetector.toString">toString</a></code> | Returns a string representation of this construct. |
| <code><a href="#lambda-failure-detector.LambdaFailureDetector.with">with</a></code> | Applies one or more mixins to this construct. |
| <code><a href="#lambda-failure-detector.LambdaFailureDetector.findLogFilterAlarm">findLogFilterAlarm</a></code> | Returns the log-filter alarm for the given filter id, or undefined when missing. |

---

##### `toString` <a name="toString" id="lambda-failure-detector.LambdaFailureDetector.toString"></a>

```typescript
public toString(): string
```

Returns a string representation of this construct.

##### `with` <a name="with" id="lambda-failure-detector.LambdaFailureDetector.with"></a>

```typescript
public with(mixins: ...IMixin[]): IConstruct
```

Applies one or more mixins to this construct.

Mixins are applied in order. The list of constructs is captured at the
start of the call, so constructs added by a mixin will not be visited.
Use multiple `with()` calls if subsequent mixins should apply to added
constructs.

###### `mixins`<sup>Required</sup> <a name="mixins" id="lambda-failure-detector.LambdaFailureDetector.with.parameter.mixins"></a>

- *Type:* ...constructs.IMixin[]

The mixins to apply.

---

##### `findLogFilterAlarm` <a name="findLogFilterAlarm" id="lambda-failure-detector.LambdaFailureDetector.findLogFilterAlarm"></a>

```typescript
public findLogFilterAlarm(id: string): Alarm
```

Returns the log-filter alarm for the given filter id, or undefined when missing.

###### `id`<sup>Required</sup> <a name="id" id="lambda-failure-detector.LambdaFailureDetector.findLogFilterAlarm.parameter.id"></a>

- *Type:* string

Same as {@link LogFailureFilter.id}.

---

#### Static Functions <a name="Static Functions" id="Static Functions"></a>

| **Name** | **Description** |
| --- | --- |
| <code><a href="#lambda-failure-detector.LambdaFailureDetector.isConstruct">isConstruct</a></code> | Checks if `x` is a construct. |

---

##### `isConstruct` <a name="isConstruct" id="lambda-failure-detector.LambdaFailureDetector.isConstruct"></a>

```typescript
import { LambdaFailureDetector } from 'lambda-failure-detector'

LambdaFailureDetector.isConstruct(x: any)
```

Checks if `x` is a construct.

Use this method instead of `instanceof` to properly detect `Construct`
instances, even when the construct library is symlinked.

Explanation: in JavaScript, multiple copies of the `constructs` library on
disk are seen as independent, completely different libraries. As a
consequence, the class `Construct` in each copy of the `constructs` library
is seen as a different class, and an instance of one class will not test as
`instanceof` the other class. `npm install` will not create installations
like this, but users may manually symlink construct libraries together or
use a monorepo tool: in those cases, multiple copies of the `constructs`
library can be accidentally installed, and `instanceof` will behave
unpredictably. It is safest to avoid using `instanceof`, and using
this type-testing method instead.

###### `x`<sup>Required</sup> <a name="x" id="lambda-failure-detector.LambdaFailureDetector.isConstruct.parameter.x"></a>

- *Type:* any

Any object.

---

#### Properties <a name="Properties" id="Properties"></a>

| **Name** | **Type** | **Description** |
| --- | --- | --- |
| <code><a href="#lambda-failure-detector.LambdaFailureDetector.property.node">node</a></code> | <code>constructs.Node</code> | The tree node. |
| <code><a href="#lambda-failure-detector.LambdaFailureDetector.property.lambdaErrorsAlarm">lambdaErrorsAlarm</a></code> | <code>aws-cdk-lib.aws_cloudwatch.Alarm</code> | Fires when the Lambda `Errors` metric is non-zero. |
| <code><a href="#lambda-failure-detector.LambdaFailureDetector.property.lambdaThrottlesAlarm">lambdaThrottlesAlarm</a></code> | <code>aws-cdk-lib.aws_cloudwatch.Alarm</code> | Fires when the Lambda `Throttles` metric is non-zero. |
| <code><a href="#lambda-failure-detector.LambdaFailureDetector.property.logFilterAlarms">logFilterAlarms</a></code> | <code><a href="#lambda-failure-detector.LogFailureAlarm">LogFailureAlarm</a>[]</code> | Alarms for each log filter, in the same order as {@link LambdaFailureDetectorProps.logFilters}. |
| <code><a href="#lambda-failure-detector.LambdaFailureDetector.property.alarmTopic">alarmTopic</a></code> | <code>aws-cdk-lib.aws_sns.ITopic</code> | SNS topic used for alarm actions, when configured. |
| <code><a href="#lambda-failure-detector.LambdaFailureDetector.property.deadLetterErrorsAlarm">deadLetterErrorsAlarm</a></code> | <code>aws-cdk-lib.aws_cloudwatch.Alarm</code> | Fires when `DeadLetterErrors` is non-zero, when opted in. |
| <code><a href="#lambda-failure-detector.LambdaFailureDetector.property.destinationDeliveryFailuresAlarm">destinationDeliveryFailuresAlarm</a></code> | <code>aws-cdk-lib.aws_cloudwatch.Alarm</code> | Fires when `DestinationDeliveryFailures` is non-zero, when opted in. |
| <code><a href="#lambda-failure-detector.LambdaFailureDetector.property.iteratorAgeAlarm">iteratorAgeAlarm</a></code> | <code>aws-cdk-lib.aws_cloudwatch.Alarm</code> | Fires when stream `IteratorAge` reaches the configured threshold, when opted in. |
| <code><a href="#lambda-failure-detector.LambdaFailureDetector.property.logGroup">logGroup</a></code> | <code>aws-cdk-lib.aws_logs.ILogGroup</code> | Log group used for log metric filters, when log filters are configured. |

---

##### `node`<sup>Required</sup> <a name="node" id="lambda-failure-detector.LambdaFailureDetector.property.node"></a>

```typescript
public readonly node: Node;
```

- *Type:* constructs.Node

The tree node.

---

##### `lambdaErrorsAlarm`<sup>Required</sup> <a name="lambdaErrorsAlarm" id="lambda-failure-detector.LambdaFailureDetector.property.lambdaErrorsAlarm"></a>

```typescript
public readonly lambdaErrorsAlarm: Alarm;
```

- *Type:* aws-cdk-lib.aws_cloudwatch.Alarm

Fires when the Lambda `Errors` metric is non-zero.

---

##### `lambdaThrottlesAlarm`<sup>Required</sup> <a name="lambdaThrottlesAlarm" id="lambda-failure-detector.LambdaFailureDetector.property.lambdaThrottlesAlarm"></a>

```typescript
public readonly lambdaThrottlesAlarm: Alarm;
```

- *Type:* aws-cdk-lib.aws_cloudwatch.Alarm

Fires when the Lambda `Throttles` metric is non-zero.

---

##### `logFilterAlarms`<sup>Required</sup> <a name="logFilterAlarms" id="lambda-failure-detector.LambdaFailureDetector.property.logFilterAlarms"></a>

```typescript
public readonly logFilterAlarms: LogFailureAlarm[];
```

- *Type:* <a href="#lambda-failure-detector.LogFailureAlarm">LogFailureAlarm</a>[]

Alarms for each log filter, in the same order as {@link LambdaFailureDetectorProps.logFilters}.

---

##### `alarmTopic`<sup>Optional</sup> <a name="alarmTopic" id="lambda-failure-detector.LambdaFailureDetector.property.alarmTopic"></a>

```typescript
public readonly alarmTopic: ITopic;
```

- *Type:* aws-cdk-lib.aws_sns.ITopic

SNS topic used for alarm actions, when configured.

---

##### `deadLetterErrorsAlarm`<sup>Optional</sup> <a name="deadLetterErrorsAlarm" id="lambda-failure-detector.LambdaFailureDetector.property.deadLetterErrorsAlarm"></a>

```typescript
public readonly deadLetterErrorsAlarm: Alarm;
```

- *Type:* aws-cdk-lib.aws_cloudwatch.Alarm

Fires when `DeadLetterErrors` is non-zero, when opted in.

---

##### `destinationDeliveryFailuresAlarm`<sup>Optional</sup> <a name="destinationDeliveryFailuresAlarm" id="lambda-failure-detector.LambdaFailureDetector.property.destinationDeliveryFailuresAlarm"></a>

```typescript
public readonly destinationDeliveryFailuresAlarm: Alarm;
```

- *Type:* aws-cdk-lib.aws_cloudwatch.Alarm

Fires when `DestinationDeliveryFailures` is non-zero, when opted in.

---

##### `iteratorAgeAlarm`<sup>Optional</sup> <a name="iteratorAgeAlarm" id="lambda-failure-detector.LambdaFailureDetector.property.iteratorAgeAlarm"></a>

```typescript
public readonly iteratorAgeAlarm: Alarm;
```

- *Type:* aws-cdk-lib.aws_cloudwatch.Alarm

Fires when stream `IteratorAge` reaches the configured threshold, when opted in.

---

##### `logGroup`<sup>Optional</sup> <a name="logGroup" id="lambda-failure-detector.LambdaFailureDetector.property.logGroup"></a>

```typescript
public readonly logGroup: ILogGroup;
```

- *Type:* aws-cdk-lib.aws_logs.ILogGroup

Log group used for log metric filters, when log filters are configured.

Undefined when there are no log filters.

---


## Structs <a name="Structs" id="Structs"></a>

### AlarmConfig <a name="AlarmConfig" id="lambda-failure-detector.AlarmConfig"></a>

CloudWatch alarm settings for failure metrics.

Omitted fields keep the construct defaults
(threshold 1, period 5 minutes, evaluationPeriods 1,
treatMissingData `NOT_BREACHING`).
`threshold` applies to sum metrics only; IteratorAge uses
{@link PlatformMetricsOptions.iteratorAgeThreshold}.

#### Initializer <a name="Initializer" id="lambda-failure-detector.AlarmConfig.Initializer"></a>

```typescript
import { AlarmConfig } from 'lambda-failure-detector'

const alarmConfig: AlarmConfig = { ... }
```

#### Properties <a name="Properties" id="Properties"></a>

| **Name** | **Type** | **Description** |
| --- | --- | --- |
| <code><a href="#lambda-failure-detector.AlarmConfig.property.evaluationPeriods">evaluationPeriods</a></code> | <code>number</code> | Number of periods that must breach before the alarm fires. |
| <code><a href="#lambda-failure-detector.AlarmConfig.property.period">period</a></code> | <code>aws-cdk-lib.Duration</code> | Metric period used by the alarm. |
| <code><a href="#lambda-failure-detector.AlarmConfig.property.threshold">threshold</a></code> | <code>number</code> | Alarm threshold for sum metrics. |
| <code><a href="#lambda-failure-detector.AlarmConfig.property.treatMissingData">treatMissingData</a></code> | <code>aws-cdk-lib.aws_cloudwatch.TreatMissingData</code> | How missing datapoints are treated. |

---

##### `evaluationPeriods`<sup>Optional</sup> <a name="evaluationPeriods" id="lambda-failure-detector.AlarmConfig.property.evaluationPeriods"></a>

```typescript
public readonly evaluationPeriods: number;
```

- *Type:* number
- *Default:* 1

Number of periods that must breach before the alarm fires.

---

##### `period`<sup>Optional</sup> <a name="period" id="lambda-failure-detector.AlarmConfig.property.period"></a>

```typescript
public readonly period: Duration;
```

- *Type:* aws-cdk-lib.Duration
- *Default:* Duration.minutes(5)

Metric period used by the alarm.

---

##### `threshold`<sup>Optional</sup> <a name="threshold" id="lambda-failure-detector.AlarmConfig.property.threshold"></a>

```typescript
public readonly threshold: number;
```

- *Type:* number
- *Default:* 1

Alarm threshold for sum metrics.

---

##### `treatMissingData`<sup>Optional</sup> <a name="treatMissingData" id="lambda-failure-detector.AlarmConfig.property.treatMissingData"></a>

```typescript
public readonly treatMissingData: TreatMissingData;
```

- *Type:* aws-cdk-lib.aws_cloudwatch.TreatMissingData
- *Default:* TreatMissingData.NOT_BREACHING

How missing datapoints are treated.

---

### CreateLambdaFailureDetectorProps <a name="CreateLambdaFailureDetectorProps" id="lambda-failure-detector.CreateLambdaFailureDetectorProps"></a>

Props accepted by {@link createLambdaFailureDetector}.

#### Initializer <a name="Initializer" id="lambda-failure-detector.CreateLambdaFailureDetectorProps.Initializer"></a>

```typescript
import { CreateLambdaFailureDetectorProps } from 'lambda-failure-detector'

const createLambdaFailureDetectorProps: CreateLambdaFailureDetectorProps = { ... }
```

#### Properties <a name="Properties" id="Properties"></a>

| **Name** | **Type** | **Description** |
| --- | --- | --- |
| <code><a href="#lambda-failure-detector.CreateLambdaFailureDetectorProps.property.lambdaFunction">lambdaFunction</a></code> | <code>aws-cdk-lib.aws_lambda.IFunction</code> | Lambda function to monitor. |
| <code><a href="#lambda-failure-detector.CreateLambdaFailureDetectorProps.property.alarmConfig">alarmConfig</a></code> | <code><a href="#lambda-failure-detector.AlarmConfig">AlarmConfig</a></code> | Shared CloudWatch alarm settings for failure alarms. |
| <code><a href="#lambda-failure-detector.CreateLambdaFailureDetectorProps.property.failureDetection">failureDetection</a></code> | <code><a href="#lambda-failure-detector.LambdaFailureDetection">LambdaFailureDetection</a></code> | Opt-in options; |
| <code><a href="#lambda-failure-detector.CreateLambdaFailureDetectorProps.property.logFilters">logFilters</a></code> | <code><a href="#lambda-failure-detector.LogFailureFilter">LogFailureFilter</a>[]</code> | Log-based failure filters. |
| <code><a href="#lambda-failure-detector.CreateLambdaFailureDetectorProps.property.logGroup">logGroup</a></code> | <code>aws-cdk-lib.aws_logs.ILogGroup</code> | Log group used for log-based filters. |
| <code><a href="#lambda-failure-detector.CreateLambdaFailureDetectorProps.property.logRetention">logRetention</a></code> | <code>aws-cdk-lib.aws_logs.RetentionDays</code> | Retention for the managed Lambda log group. |
| <code><a href="#lambda-failure-detector.CreateLambdaFailureDetectorProps.property.platformMetrics">platformMetrics</a></code> | <code><a href="#lambda-failure-detector.PlatformMetricsOptions">PlatformMetricsOptions</a></code> | Opt-in platform metrics beyond the standard `Errors` and `Throttles` alarms. |

---

##### `lambdaFunction`<sup>Required</sup> <a name="lambdaFunction" id="lambda-failure-detector.CreateLambdaFailureDetectorProps.property.lambdaFunction"></a>

```typescript
public readonly lambdaFunction: IFunction;
```

- *Type:* aws-cdk-lib.aws_lambda.IFunction

Lambda function to monitor.

---

##### `alarmConfig`<sup>Optional</sup> <a name="alarmConfig" id="lambda-failure-detector.CreateLambdaFailureDetectorProps.property.alarmConfig"></a>

```typescript
public readonly alarmConfig: AlarmConfig;
```

- *Type:* <a href="#lambda-failure-detector.AlarmConfig">AlarmConfig</a>
- *Default:* threshold 1, period 5 minutes, evaluationPeriods 1, treatMissingData NOT_BREACHING

Shared CloudWatch alarm settings for failure alarms.

---

##### `failureDetection`<sup>Optional</sup> <a name="failureDetection" id="lambda-failure-detector.CreateLambdaFailureDetectorProps.property.failureDetection"></a>

```typescript
public readonly failureDetection: LambdaFailureDetection;
```

- *Type:* <a href="#lambda-failure-detector.LambdaFailureDetection">LambdaFailureDetection</a>

Opt-in options;

alarms are created only when {@link LambdaFailureDetection.enabled} is true.

---

##### `logFilters`<sup>Optional</sup> <a name="logFilters" id="lambda-failure-detector.CreateLambdaFailureDetectorProps.property.logFilters"></a>

```typescript
public readonly logFilters: LogFailureFilter[];
```

- *Type:* <a href="#lambda-failure-detector.LogFailureFilter">LogFailureFilter</a>[]
- *Default:* no log-based alarms

Log-based failure filters.

---

##### `logGroup`<sup>Optional</sup> <a name="logGroup" id="lambda-failure-detector.CreateLambdaFailureDetectorProps.property.logGroup"></a>

```typescript
public readonly logGroup: ILogGroup;
```

- *Type:* aws-cdk-lib.aws_logs.ILogGroup

Log group used for log-based filters.

Same rules as {@link LambdaFailureDetectorProps.logGroup}.

---

##### `logRetention`<sup>Optional</sup> <a name="logRetention" id="lambda-failure-detector.CreateLambdaFailureDetectorProps.property.logRetention"></a>

```typescript
public readonly logRetention: RetentionDays;
```

- *Type:* aws-cdk-lib.aws_logs.RetentionDays
- *Default:* RetentionDays.ONE_YEAR

Retention for the managed Lambda log group.

Same rules as {@link LambdaFailureDetectorProps.logRetention}.

---

##### `platformMetrics`<sup>Optional</sup> <a name="platformMetrics" id="lambda-failure-detector.CreateLambdaFailureDetectorProps.property.platformMetrics"></a>

```typescript
public readonly platformMetrics: PlatformMetricsOptions;
```

- *Type:* <a href="#lambda-failure-detector.PlatformMetricsOptions">PlatformMetricsOptions</a>
- *Default:* no additional platform metric alarms

Opt-in platform metrics beyond the standard `Errors` and `Throttles` alarms.

---

### LambdaFailureDetection <a name="LambdaFailureDetection" id="lambda-failure-detector.LambdaFailureDetection"></a>

Opt-in options for {@link createLambdaFailureDetector}.

When {@link LambdaFailureDetection.enabled} is true, alarms are created.
{@link LambdaFailureDetection.alarmTopic} is optional; when omitted, alarms have no SNS actions.
The construct never creates an SNS topic.

#### Initializer <a name="Initializer" id="lambda-failure-detector.LambdaFailureDetection.Initializer"></a>

```typescript
import { LambdaFailureDetection } from 'lambda-failure-detector'

const lambdaFailureDetection: LambdaFailureDetection = { ... }
```

#### Properties <a name="Properties" id="Properties"></a>

| **Name** | **Type** | **Description** |
| --- | --- | --- |
| <code><a href="#lambda-failure-detector.LambdaFailureDetection.property.alarmTopic">alarmTopic</a></code> | <code>aws-cdk-lib.aws_sns.ITopic</code> | SNS topic for alarm notifications. |
| <code><a href="#lambda-failure-detector.LambdaFailureDetection.property.enabled">enabled</a></code> | <code>boolean</code> | When true, creates failure detection alarms and log-based metrics. |

---

##### `alarmTopic`<sup>Optional</sup> <a name="alarmTopic" id="lambda-failure-detector.LambdaFailureDetection.property.alarmTopic"></a>

```typescript
public readonly alarmTopic: ITopic;
```

- *Type:* aws-cdk-lib.aws_sns.ITopic

SNS topic for alarm notifications.

When omitted, alarms are created without SNS actions.

---

##### `enabled`<sup>Optional</sup> <a name="enabled" id="lambda-failure-detector.LambdaFailureDetection.property.enabled"></a>

```typescript
public readonly enabled: boolean;
```

- *Type:* boolean
- *Default:* false when omitted

When true, creates failure detection alarms and log-based metrics.

---

### LambdaFailureDetectorProps <a name="LambdaFailureDetectorProps" id="lambda-failure-detector.LambdaFailureDetectorProps"></a>

Props for {@link LambdaFailureDetector}.

#### Initializer <a name="Initializer" id="lambda-failure-detector.LambdaFailureDetectorProps.Initializer"></a>

```typescript
import { LambdaFailureDetectorProps } from 'lambda-failure-detector'

const lambdaFailureDetectorProps: LambdaFailureDetectorProps = { ... }
```

#### Properties <a name="Properties" id="Properties"></a>

| **Name** | **Type** | **Description** |
| --- | --- | --- |
| <code><a href="#lambda-failure-detector.LambdaFailureDetectorProps.property.lambdaFunction">lambdaFunction</a></code> | <code>aws-cdk-lib.aws_lambda.IFunction</code> | Lambda function whose platform failure metrics are alarmed. |
| <code><a href="#lambda-failure-detector.LambdaFailureDetectorProps.property.alarmConfig">alarmConfig</a></code> | <code><a href="#lambda-failure-detector.AlarmConfig">AlarmConfig</a></code> | Shared CloudWatch alarm settings for failure alarms. |
| <code><a href="#lambda-failure-detector.LambdaFailureDetectorProps.property.alarmTopic">alarmTopic</a></code> | <code>aws-cdk-lib.aws_sns.ITopic</code> | Optional SNS topic for all alarm actions. |
| <code><a href="#lambda-failure-detector.LambdaFailureDetectorProps.property.logFilters">logFilters</a></code> | <code><a href="#lambda-failure-detector.LogFailureFilter">LogFailureFilter</a>[]</code> | Log-based failure filters. |
| <code><a href="#lambda-failure-detector.LambdaFailureDetectorProps.property.logGroup">logGroup</a></code> | <code>aws-cdk-lib.aws_logs.ILogGroup</code> | Log group used for {@link LogFailureFilter} metric filters. |
| <code><a href="#lambda-failure-detector.LambdaFailureDetectorProps.property.logRetention">logRetention</a></code> | <code>aws-cdk-lib.aws_logs.RetentionDays</code> | Retention for the Lambda log group when the construct manages it. |
| <code><a href="#lambda-failure-detector.LambdaFailureDetectorProps.property.platformMetrics">platformMetrics</a></code> | <code><a href="#lambda-failure-detector.PlatformMetricsOptions">PlatformMetricsOptions</a></code> | Opt-in platform metrics beyond the standard `Errors` and `Throttles` alarms. |

---

##### `lambdaFunction`<sup>Required</sup> <a name="lambdaFunction" id="lambda-failure-detector.LambdaFailureDetectorProps.property.lambdaFunction"></a>

```typescript
public readonly lambdaFunction: IFunction;
```

- *Type:* aws-cdk-lib.aws_lambda.IFunction

Lambda function whose platform failure metrics are alarmed.

---

##### `alarmConfig`<sup>Optional</sup> <a name="alarmConfig" id="lambda-failure-detector.LambdaFailureDetectorProps.property.alarmConfig"></a>

```typescript
public readonly alarmConfig: AlarmConfig;
```

- *Type:* <a href="#lambda-failure-detector.AlarmConfig">AlarmConfig</a>
- *Default:* threshold 1, period 5 minutes, evaluationPeriods 1, treatMissingData NOT_BREACHING

Shared CloudWatch alarm settings for failure alarms.

Applies to sum metrics (`Errors`, `Throttles`, opt-in counts, and log filters).
IteratorAge uses `period` / `evaluationPeriods` / `treatMissingData` from this
config, but its threshold comes from {@link PlatformMetricsOptions.iteratorAgeThreshold}.

---

##### `alarmTopic`<sup>Optional</sup> <a name="alarmTopic" id="lambda-failure-detector.LambdaFailureDetectorProps.property.alarmTopic"></a>

```typescript
public readonly alarmTopic: ITopic;
```

- *Type:* aws-cdk-lib.aws_sns.ITopic

Optional SNS topic for all alarm actions.

When omitted, alarms are created without SNS actions.

---

##### `logFilters`<sup>Optional</sup> <a name="logFilters" id="lambda-failure-detector.LambdaFailureDetectorProps.property.logFilters"></a>

```typescript
public readonly logFilters: LogFailureFilter[];
```

- *Type:* <a href="#lambda-failure-detector.LogFailureFilter">LogFailureFilter</a>[]
- *Default:* no log-based alarms

Log-based failure filters.

Each entry creates a metric filter and alarm.

---

##### `logGroup`<sup>Optional</sup> <a name="logGroup" id="lambda-failure-detector.LambdaFailureDetectorProps.property.logGroup"></a>

```typescript
public readonly logGroup: ILogGroup;
```

- *Type:* aws-cdk-lib.aws_logs.ILogGroup

Log group used for {@link LogFailureFilter} metric filters.

Required only when you pass {@link LambdaFailureDetectorProps.logFilters}
and want to use an existing group. When omitted with log filters, the
construct manages `/aws/lambda/<functionName>` and applies
{@link LambdaFailureDetectorProps.logRetention}.

Do not set together with {@link LambdaFailureDetectorProps.logRetention}.

---

##### `logRetention`<sup>Optional</sup> <a name="logRetention" id="lambda-failure-detector.LambdaFailureDetectorProps.property.logRetention"></a>

```typescript
public readonly logRetention: RetentionDays;
```

- *Type:* aws-cdk-lib.aws_logs.RetentionDays
- *Default:* RetentionDays.ONE_YEAR

Retention for the Lambda log group when the construct manages it.

Used when {@link LambdaFailureDetectorProps.logFilters} are set and
{@link LambdaFailureDetectorProps.logGroup} is omitted. Creates a
`LogRetention` custom resource for `/aws/lambda/<functionName>`.

Do not set together with {@link LambdaFailureDetectorProps.logGroup}.

---

##### `platformMetrics`<sup>Optional</sup> <a name="platformMetrics" id="lambda-failure-detector.LambdaFailureDetectorProps.property.platformMetrics"></a>

```typescript
public readonly platformMetrics: PlatformMetricsOptions;
```

- *Type:* <a href="#lambda-failure-detector.PlatformMetricsOptions">PlatformMetricsOptions</a>
- *Default:* no additional platform metric alarms

Opt-in platform metrics beyond the standard `Errors` and `Throttles` alarms.

---

### LogFailureAlarm <a name="LogFailureAlarm" id="lambda-failure-detector.LogFailureAlarm"></a>

Alarm created for one {@link LogFailureFilter}.

#### Initializer <a name="Initializer" id="lambda-failure-detector.LogFailureAlarm.Initializer"></a>

```typescript
import { LogFailureAlarm } from 'lambda-failure-detector'

const logFailureAlarm: LogFailureAlarm = { ... }
```

#### Properties <a name="Properties" id="Properties"></a>

| **Name** | **Type** | **Description** |
| --- | --- | --- |
| <code><a href="#lambda-failure-detector.LogFailureAlarm.property.alarm">alarm</a></code> | <code>aws-cdk-lib.aws_cloudwatch.Alarm</code> | Alarm on the log metric filter sum. |
| <code><a href="#lambda-failure-detector.LogFailureAlarm.property.id">id</a></code> | <code>string</code> | Same as {@link LogFailureFilter.id}. |

---

##### `alarm`<sup>Required</sup> <a name="alarm" id="lambda-failure-detector.LogFailureAlarm.property.alarm"></a>

```typescript
public readonly alarm: Alarm;
```

- *Type:* aws-cdk-lib.aws_cloudwatch.Alarm

Alarm on the log metric filter sum.

---

##### `id`<sup>Required</sup> <a name="id" id="lambda-failure-detector.LogFailureAlarm.property.id"></a>

```typescript
public readonly id: string;
```

- *Type:* string

Same as {@link LogFailureFilter.id}.

---

### LogFailureFilter <a name="LogFailureFilter" id="lambda-failure-detector.LogFailureFilter"></a>

One log-based failure signal for {@link LambdaFailureDetector}.

Creates a CloudWatch Logs metric filter and an alarm on the resulting sum metric.

#### Initializer <a name="Initializer" id="lambda-failure-detector.LogFailureFilter.Initializer"></a>

```typescript
import { LogFailureFilter } from 'lambda-failure-detector'

const logFailureFilter: LogFailureFilter = { ... }
```

#### Properties <a name="Properties" id="Properties"></a>

| **Name** | **Type** | **Description** |
| --- | --- | --- |
| <code><a href="#lambda-failure-detector.LogFailureFilter.property.filterPattern">filterPattern</a></code> | <code>string</code> | CloudWatch Logs filter pattern string passed to `FilterPattern.literal`. |
| <code><a href="#lambda-failure-detector.LogFailureFilter.property.id">id</a></code> | <code>string</code> | Stable id used as the MetricFilter / Alarm construct id prefix (e.g. `InstanceStatusFailure` → `InstanceStatusFailureMetric`). |
| <code><a href="#lambda-failure-detector.LogFailureFilter.property.metricName">metricName</a></code> | <code>string</code> | Custom metric name for the metric filter. |
| <code><a href="#lambda-failure-detector.LogFailureFilter.property.metricNamespace">metricNamespace</a></code> | <code>string</code> | Custom metric namespace for the metric filter. |

---

##### `filterPattern`<sup>Required</sup> <a name="filterPattern" id="lambda-failure-detector.LogFailureFilter.property.filterPattern"></a>

```typescript
public readonly filterPattern: string;
```

- *Type:* string

CloudWatch Logs filter pattern string passed to `FilterPattern.literal`.

---

*Example*

```typescript
'"ResourceWaitFailed"'
```


##### `id`<sup>Required</sup> <a name="id" id="lambda-failure-detector.LogFailureFilter.property.id"></a>

```typescript
public readonly id: string;
```

- *Type:* string

Stable id used as the MetricFilter / Alarm construct id prefix (e.g. `InstanceStatusFailure` → `InstanceStatusFailureMetric`).

---

##### `metricName`<sup>Required</sup> <a name="metricName" id="lambda-failure-detector.LogFailureFilter.property.metricName"></a>

```typescript
public readonly metricName: string;
```

- *Type:* string

Custom metric name for the metric filter.

---

##### `metricNamespace`<sup>Required</sup> <a name="metricNamespace" id="lambda-failure-detector.LogFailureFilter.property.metricNamespace"></a>

```typescript
public readonly metricNamespace: string;
```

- *Type:* string

Custom metric namespace for the metric filter.

---

### PlatformMetricsOptions <a name="PlatformMetricsOptions" id="lambda-failure-detector.PlatformMetricsOptions"></a>

Opt-in platform metrics beyond the standard `Errors` and `Throttles` alarms.

`Errors` and `Throttles` are always created. Enable the flags below when the
function uses a dead-letter queue, on-failure destination, or stream source.

#### Initializer <a name="Initializer" id="lambda-failure-detector.PlatformMetricsOptions.Initializer"></a>

```typescript
import { PlatformMetricsOptions } from 'lambda-failure-detector'

const platformMetricsOptions: PlatformMetricsOptions = { ... }
```

#### Properties <a name="Properties" id="Properties"></a>

| **Name** | **Type** | **Description** |
| --- | --- | --- |
| <code><a href="#lambda-failure-detector.PlatformMetricsOptions.property.deadLetterErrors">deadLetterErrors</a></code> | <code>boolean</code> | Create an alarm on the `AWS/Lambda` `DeadLetterErrors` sum metric. |
| <code><a href="#lambda-failure-detector.PlatformMetricsOptions.property.destinationDeliveryFailures">destinationDeliveryFailures</a></code> | <code>boolean</code> | Create an alarm on the `AWS/Lambda` `DestinationDeliveryFailures` sum metric. |
| <code><a href="#lambda-failure-detector.PlatformMetricsOptions.property.iteratorAge">iteratorAge</a></code> | <code>boolean</code> | Create an alarm on the `AWS/Lambda` `IteratorAge` maximum metric. |
| <code><a href="#lambda-failure-detector.PlatformMetricsOptions.property.iteratorAgeThreshold">iteratorAgeThreshold</a></code> | <code>number</code> | Threshold in milliseconds for the IteratorAge alarm. |

---

##### `deadLetterErrors`<sup>Optional</sup> <a name="deadLetterErrors" id="lambda-failure-detector.PlatformMetricsOptions.property.deadLetterErrors"></a>

```typescript
public readonly deadLetterErrors: boolean;
```

- *Type:* boolean
- *Default:* false

Create an alarm on the `AWS/Lambda` `DeadLetterErrors` sum metric.

---

##### `destinationDeliveryFailures`<sup>Optional</sup> <a name="destinationDeliveryFailures" id="lambda-failure-detector.PlatformMetricsOptions.property.destinationDeliveryFailures"></a>

```typescript
public readonly destinationDeliveryFailures: boolean;
```

- *Type:* boolean
- *Default:* false

Create an alarm on the `AWS/Lambda` `DestinationDeliveryFailures` sum metric.

---

##### `iteratorAge`<sup>Optional</sup> <a name="iteratorAge" id="lambda-failure-detector.PlatformMetricsOptions.property.iteratorAge"></a>

```typescript
public readonly iteratorAge: boolean;
```

- *Type:* boolean
- *Default:* false

Create an alarm on the `AWS/Lambda` `IteratorAge` maximum metric.

Intended for functions with stream event sources (Kinesis, DynamoDB Streams).

---

##### `iteratorAgeThreshold`<sup>Optional</sup> <a name="iteratorAgeThreshold" id="lambda-failure-detector.PlatformMetricsOptions.property.iteratorAgeThreshold"></a>

```typescript
public readonly iteratorAgeThreshold: number;
```

- *Type:* number
- *Default:* 60000

Threshold in milliseconds for the IteratorAge alarm.

Used only when {@link PlatformMetricsOptions.iteratorAge} is true.
Shared {@link AlarmConfig.threshold} does not apply (that value is for sum counts).

---



