#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib/core';
import { CodeComprehensionAuthStack } from '../lib/auth-stack';
import { CodeComprehensionDataStack } from '../lib/data-stack';
import { InfraStack } from '../lib/infra-stack';

const app = new cdk.App();

new InfraStack(app, 'InfraStack', {
  /* If you don't specify 'env', this stack will be environment-agnostic. */
  // env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION },
});

new CodeComprehensionDataStack(app, 'CodeComprehensionDataStack', {
  // env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION },
});

new CodeComprehensionAuthStack(app, 'CodeComprehensionAuthStack', {
  /* Cognito Hosted UI domain prefix uses stack account; set env for real account id. */
  // env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION },
});
