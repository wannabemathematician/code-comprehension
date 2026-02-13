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
  userQuestionProgressTable: dynamodb.ITable;
  userPoolId: string;
  userPoolClientId: string;
  /** Cohere API key for /gradeExplain (from infra/.env). Optional; grading will fail without it. */
  cohereApiKey?: string;
}

/**
 * API Gateway HTTP API + Lambdas for challenges (list, get, download).
 * JWT authorizer via Cognito; CORS enabled for React SPA.
 */
export class CodeComprehensionApiStack extends cdk.Stack {
  public readonly httpApi: apigwv2.HttpApi;

  constructor(scope: Construct, id: string, props: CodeComprehensionApiStackProps) {
    super(scope, id, props);

    const { challengesTable, challengesBucket, userQuestionProgressTable, userPoolId, userPoolClientId, cohereApiKey } = props;
    const tableName = challengesTable.tableName;
    const bucketName = challengesBucket.bucketName;
    const progressTableName = userQuestionProgressTable.tableName;

    const lambdasDir = path.join(__dirname, '..', 'lambdas');
    const nodeJsFnProps = {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'handler',
      environment: {
        CHALLENGES_TABLE_NAME: tableName,
        CHALLENGES_BUCKET_NAME: bucketName,
        USER_QUESTION_PROGRESS_TABLE_NAME: progressTableName,
      },
    };

    const listChallenges = new NodejsFunction(this, 'ListChallenges', {
      ...nodeJsFnProps,
      entry: path.join(lambdasDir, 'listChallenges.ts'),
      functionName: 'code-comprehension-listChallenges',
    });
    challengesTable.grantReadData(listChallenges);
    userQuestionProgressTable.grantReadData(listChallenges);

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
        allowMethods: [apigwv2.CorsHttpMethod.GET, apigwv2.CorsHttpMethod.PUT, apigwv2.CorsHttpMethod.POST, apigwv2.CorsHttpMethod.OPTIONS],
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

    // Questions and Progress endpoints
    const getQuestion = new NodejsFunction(this, 'GetQuestion', {
      ...nodeJsFnProps,
      entry: path.join(lambdasDir, 'getQuestion.ts'),
      functionName: 'code-comprehension-getQuestion',
    });
    userQuestionProgressTable.grantReadData(getQuestion);

    const updateProgress = new NodejsFunction(this, 'UpdateProgress', {
      ...nodeJsFnProps,
      entry: path.join(lambdasDir, 'updateProgress.ts'),
      functionName: 'code-comprehension-updateProgress',
    });
    userQuestionProgressTable.grantReadWriteData(updateProgress);

    const listProgress = new NodejsFunction(this, 'ListProgress', {
      ...nodeJsFnProps,
      entry: path.join(lambdasDir, 'listProgress.ts'),
      functionName: 'code-comprehension-listProgress',
    });
    userQuestionProgressTable.grantReadData(listProgress);

    const completeChallenge = new NodejsFunction(this, 'CompleteChallenge', {
      ...nodeJsFnProps,
      entry: path.join(lambdasDir, 'completeChallenge.ts'),
      functionName: 'code-comprehension-completeChallenge',
    });
    userQuestionProgressTable.grantReadWriteData(completeChallenge);

    const gradeExplain = new NodejsFunction(this, 'GradeExplain', {
      ...nodeJsFnProps,
      entry: path.join(lambdasDir, 'gradeExplain.ts'),
      functionName: 'code-comprehension-gradeExplain',
      timeout: cdk.Duration.seconds(60),
      environment: {
        ...nodeJsFnProps.environment,
        ...(cohereApiKey ? { COHERE_API_KEY: cohereApiKey } : {}),
      },
    });

    this.httpApi.addRoutes({
      path: '/questions/{questionId}',
      methods: [apigwv2.HttpMethod.GET],
      integration: new HttpLambdaIntegration('GetQuestionIntegration', getQuestion),
    });

    this.httpApi.addRoutes({
      path: '/questions/{questionId}/progress',
      methods: [apigwv2.HttpMethod.PUT],
      integration: new HttpLambdaIntegration('UpdateProgressIntegration', updateProgress),
    });

    this.httpApi.addRoutes({
      path: '/progress',
      methods: [apigwv2.HttpMethod.GET],
      integration: new HttpLambdaIntegration('ListProgressIntegration', listProgress),
    });

    this.httpApi.addRoutes({
      path: '/challenges/{challengeId}/complete',
      methods: [apigwv2.HttpMethod.PUT],
      integration: new HttpLambdaIntegration('CompleteChallengeIntegration', completeChallenge),
    });

    this.httpApi.addRoutes({
      path: '/gradeExplain',
      methods: [apigwv2.HttpMethod.POST],
      integration: new HttpLambdaIntegration('GradeExplainIntegration', gradeExplain),
    });

    new cdk.CfnOutput(this, 'ApiUrl', {
      value: this.httpApi.apiEndpoint ?? '',
      description: 'API Gateway HTTP API base URL',
      exportName: 'CodeComprehensionApi-ApiUrl',
    });
  }
}
