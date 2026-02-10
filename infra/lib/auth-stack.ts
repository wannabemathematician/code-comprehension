import * as cdk from 'aws-cdk-lib/core';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import { Construct } from 'constructs';

export interface AuthStackProps extends cdk.StackProps {}

/**
 * Stack for Cognito User Pool and Hosted UI: email sign-in, SPA client, optional hosted domain.
 */
export class CodeComprehensionAuthStack extends cdk.Stack {
  public readonly userPool: cognito.UserPool;
  public readonly userPoolClient: cognito.UserPoolClient;
  public readonly domain: cognito.UserPoolDomain | undefined;

  constructor(scope: Construct, id: string, props?: AuthStackProps) {
    super(scope, id, props);

    this.userPool = new cognito.UserPool(this, 'UserPool', {
      userPoolName: 'code-comprehension-users',
      selfSignUpEnabled: true,
      signInAliases: { email: true },
      autoVerify: { email: true },
      passwordPolicy: {
        minLength: 8,
        requireLowercase: true,
        requireUppercase: true,
        requireDigits: true,
        requireSymbols: true,
      },
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    this.userPoolClient = this.userPool.addClient('SpaClient', {
      userPoolClientName: 'code-comprehension-spa',
      generateSecret: false,
      authFlows: {
        userSrp: true, // USER_SRP_AUTH; REFRESH_TOKEN_AUTH is enabled by default for public clients
      },
    });

    const domainPrefix = `code-comprehension-${this.account}`;
    this.domain = this.userPool.addDomain('HostedUi', {
      cognitoDomain: {
        domainPrefix,
      },
    });

    new cdk.CfnOutput(this, 'UserPoolId', {
      value: this.userPool.userPoolId,
      description: 'Cognito User Pool ID',
      exportName: 'CodeComprehensionAuth-UserPoolId',
    });

    new cdk.CfnOutput(this, 'UserPoolClientId', {
      value: this.userPoolClient.userPoolClientId,
      description: 'Cognito User Pool Client ID (SPA, no secret)',
      exportName: 'CodeComprehensionAuth-UserPoolClientId',
    });

    new cdk.CfnOutput(this, 'HostedUiDomain', {
      value: this.domain.baseUrl(),
      description: 'Cognito Hosted UI base URL',
      exportName: 'CodeComprehensionAuth-HostedUiDomain',
    });
  }
}
