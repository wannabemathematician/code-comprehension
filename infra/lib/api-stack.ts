import * as path from 'path';
import * as cdk from 'aws-cdk-lib/core';
import * as apigwv2 from 'aws-cdk-lib/aws-apigatewayv2';
import { HttpJwtAuthorizer } from 'aws-cdk-lib/aws-apigatewayv2-authorizers';
import { HttpLambdaIntegration } from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';

export interface CodeComprehensionApiStackProps extends cdk.StackProps {
  challengesTable: dynamodb.ITable;
  challengesBucket: s3.IBucket;
  userPoolId: string;
  userPoolClientId: string;
}

/**
 * API Gateway HTTP API + Lambdas for challenges (list, get, download).
 * JWT authorizer via Cognito; CORS enabled for React SPA.
 */
export class CodeComprehensionApiStack extends cdk.Stack {
  public readonly httpApi: apigwv2.HttpApi;

  constructor(scope: Construct, id: string, props: CodeComprehensionApiStackProps) {
    super(scope, id, props);

    const { challengesTable, challengesBucket, userPoolId, userPoolClientId } = props;
    const tableName = challengesTable.tableName;
    const bucketName = challengesBucket.bucketName;

    const lambdasDir = path.join(__dirname, '..', 'lambdas');
    const nodeJsFnProps = {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'handler',
      environment: {
        CHALLENGES_TABLE_NAME: tableName,
        CHALLENGES_BUCKET_NAME: bucketName,
      },
    };

    const listChallenges = new NodejsFunction(this, 'ListChallenges', {
      ...nodeJsFnProps,
      entry: path.join(lambdasDir, 'listChallenges.ts'),
      functionName: 'code-comprehension-listChallenges',
    });
    challengesTable.grantReadData(listChallenges);

    const getChallenge = new NodejsFunction(this, 'GetChallenge', {
      ...nodeJsFnProps,
      entry: path.join(lambdasDir, 'getChallenge.ts'),
      functionName: 'code-comprehension-getChallenge',
    });
    challengesTable.grantReadData(getChallenge);

    const getChallengeDownloadUrl = new NodejsFunction(this, 'GetChallengeDownloadUrl', {
      ...nodeJsFnProps,
      entry: path.join(lambdasDir, 'getChallengeDownloadUrl.ts'),
      functionName: 'code-comprehension-getChallengeDownloadUrl',
    });
    challengesTable.grantReadData(getChallengeDownloadUrl);
    challengesBucket.grantRead(getChallengeDownloadUrl);

    const getChallengeZip = new NodejsFunction(this, 'GetChallengeZip', {
      ...nodeJsFnProps,
      entry: path.join(lambdasDir, 'getChallengeZip.ts'),
      functionName: 'code-comprehension-getChallengeZip',
    });
    challengesTable.grantReadData(getChallengeZip);
    challengesBucket.grantRead(getChallengeZip);

    const issuer = `https://cognito-idp.${this.region}.amazonaws.com/${userPoolId}`;
    const authorizer = new HttpJwtAuthorizer('CognitoAuthorizer', issuer, {
      jwtAudience: [userPoolClientId],
    });

    this.httpApi = new apigwv2.HttpApi(this, 'HttpApi', {
      apiName: 'code-comprehension-api',
      corsPreflight: {
        allowHeaders: ['Authorization', 'Content-Type', 'Accept'],
        allowMethods: [apigwv2.CorsHttpMethod.GET, apigwv2.CorsHttpMethod.OPTIONS],
        allowOrigins: ['*'],
      },
      defaultAuthorizer: authorizer,
    });

    this.httpApi.addRoutes({
      path: '/challenges',
      methods: [apigwv2.HttpMethod.GET],
      integration: new HttpLambdaIntegration('ListChallengesIntegration', listChallenges),
    });

    this.httpApi.addRoutes({
      path: '/challenges/{id}',
      methods: [apigwv2.HttpMethod.GET],
      integration: new HttpLambdaIntegration('GetChallengeIntegration', getChallenge),
    });

    this.httpApi.addRoutes({
      path: '/challenges/{id}/download',
      methods: [apigwv2.HttpMethod.GET],
      integration: new HttpLambdaIntegration('GetChallengeDownloadUrlIntegration', getChallengeDownloadUrl),
    });

    this.httpApi.addRoutes({
      path: '/challenges/{id}/zip',
      methods: [apigwv2.HttpMethod.GET],
      integration: new HttpLambdaIntegration('GetChallengeZipIntegration', getChallengeZip),
    });

    new cdk.CfnOutput(this, 'ApiUrl', {
      value: this.httpApi.apiEndpoint ?? '',
      description: 'API Gateway HTTP API base URL',
      exportName: 'CodeComprehensionApi-ApiUrl',
    });
  }
}
