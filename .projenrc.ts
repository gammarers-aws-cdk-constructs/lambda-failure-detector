import { ProjenCdkConstructLibrary } from '@gammarers/projen-projects';
const project = new ProjenCdkConstructLibrary({
  cdkVersion: '2.232.0',
  name: 'lambda-failure-detector',
  projenrcTs: true,
  repositoryUrl: 'https://github.com/gammarers-aws-cdk-constructs/lambda-failure-detector.git',
  description: 'Creates Amazon CloudWatch alarms for an AWS Lambda function. The construct alarms on the platform `Errors` metric and, for each log filter you supply, adds a CloudWatch Logs metric filter and an alarm. Pass an existing Amazon SNS topic when those alarms should send notifications.',
  releaseToNpm: true,
  // npmTrustedPublishing: true,
  devDeps: [
    '@gammarers/projen-projects@^0.5.0',
  ],
});
project.synth();