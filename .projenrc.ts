import { ProjenCdkConstructLibrary } from '@gammarers/projen-projects';
const project = new ProjenCdkConstructLibrary({
  cdkVersion: '2.232.0',
  name: 'lambda-failure-detector',
  projenrcTs: true,
  repositoryUrl: 'https://github.com/gammarers-aws-cdk-constructs/lambda-failure-detector.git',
  // releaseToNpm: true,
  // npmTrustedPublishing: true,
  devDeps: [
    '@gammarers/projen-projects@^0.5.0',
  ],
});
project.synth();