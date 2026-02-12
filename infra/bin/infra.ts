#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib/core';
import { CodeComprehensionApiStack } from '../lib/api-stack';
import { CodeComprehensionAuthStack } from '../lib/auth-stack';
import { CodeComprehensionDataStack } from '../lib/data-stack';
import { InfraStack } from '../lib/infra-stack';

const app = new cdk.App();

const env = undefined; // use account/region from CLI: { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION }

new InfraStack(app, 'InfraStack', { env });

const stage = app.node.tryGetContext('stage') as string | undefined;
const dataStack = new CodeComprehensionDataStack(app, 'CodeComprehensionDataStack', { env, stage });

// Auth stack is standalone: no dependencies on DataStack or ApiStack.
const authStack = new CodeComprehensionAuthStack(app, 'CodeComprehensionAuthStack', { env });

new CodeComprehensionApiStack(app, 'CodeComprehensionApiStack', {
  env,
  challengesTable: dataStack.challengesTable,
  challengesBucket: dataStack.challengesBucket,
  userQuestionProgressTable: dataStack.userQuestionProgressTable,
  userPoolId: authStack.userPool.userPoolId,
  userPoolClientId: authStack.userPoolClient.userPoolClientId,
});
