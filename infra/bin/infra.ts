#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib/core';
import { CodeComprehensionDataStack } from '../lib/data-stack';
import { InfraStack } from '../lib/infra-stack';

const app = new cdk.App();

new InfraStack(app, 'InfraStack', {
  /* If you don't specify 'env', this stack will be environment-agnostic.
   * Account/Region-dependent features and context lookups will not work,
   * but a single synthesized template can be deployed anywhere. */
  // env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION },
});

new CodeComprehensionDataStack(app, 'CodeComprehensionDataStack', {
  /* Dev MVP: use CLI default account/region for deploy. */
  // env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION },
});
