import * as cdk from 'aws-cdk-lib/core';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as s3 from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';

export interface DataStackProps extends cdk.StackProps {
  /**
   * Optional stage/environment name (e.g., 'dev', 'prod').
   * If provided, table names will be suffixed with `-${stage}`.
   */
  stage?: string;
}

/**
 * Stack for challenge storage: S3 bucket (zip files) and DynamoDB (metadata).
 * Dev MVP: DESTROY + auto-delete objects for easy teardown.
 */
export class CodeComprehensionDataStack extends cdk.Stack {
  public readonly challengesBucket: s3.Bucket;
  public readonly challengesTable: dynamodb.Table;
  public readonly userQuestionProgressTable: dynamodb.Table;

  constructor(scope: Construct, id: string, props?: DataStackProps) {
    super(scope, id, props);

    const stage = props?.stage ?? 'dev';
    const tableNameSuffix = stage !== 'dev' ? `-${stage}` : '';

    this.challengesBucket = new s3.Bucket(this, 'ChallengesBucket', {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      enforceSSL: true,
      versioned: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      cors: [
        {
          allowedMethods: [s3.HttpMethods.GET],
          allowedOrigins: ['http://localhost:5173', 'http://localhost:3000'],
          allowedHeaders: ['*'],
        },
      ],
    });

    this.challengesTable = new dynamodb.Table(this, 'Challenges', {
      tableName: 'Challenges',
      partitionKey: {
        name: 'challengeId',
        type: dynamodb.AttributeType.STRING,
      },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    this.userQuestionProgressTable = new dynamodb.Table(this, 'UserQuestionProgress', {
      tableName: `UserQuestionProgress${tableNameSuffix}`,
      partitionKey: {
        name: 'userId',
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: 'questionId',
        type: dynamodb.AttributeType.STRING,
      },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
      pointInTimeRecovery: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // Add tags
    cdk.Tags.of(this.userQuestionProgressTable).add('app', 'leetcode-clone');
    cdk.Tags.of(this.userQuestionProgressTable).add('component', 'progress');

    // Add GSI for querying by userStatus and updatedAt
    this.userQuestionProgressTable.addGlobalSecondaryIndex({
      indexName: 'GSI1_UserStatus_UpdatedAt',
      partitionKey: {
        name: 'userStatus',
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: 'updatedAt',
        type: dynamodb.AttributeType.NUMBER,
      },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    new cdk.CfnOutput(this, 'ChallengesBucketName', {
      value: this.challengesBucket.bucketName,
      description: 'S3 bucket name for challenge zip files',
      exportName: 'CodeComprehensionData-ChallengesBucketName',
    });

    new cdk.CfnOutput(this, 'ChallengesTableName', {
      value: this.challengesTable.tableName,
      description: 'DynamoDB table name for challenge metadata',
      exportName: 'CodeComprehensionData-ChallengesTableName',
    });

    new cdk.CfnOutput(this, 'UserQuestionProgressTableName', {
      value: this.userQuestionProgressTable.tableName,
      description: 'DynamoDB table name for user question progress',
      exportName: 'CodeComprehensionData-UserQuestionProgressTableName',
    });

    new cdk.CfnOutput(this, 'UserQuestionProgressTableArn', {
      value: this.userQuestionProgressTable.tableArn,
      description: 'DynamoDB table ARN for user question progress',
      exportName: 'CodeComprehensionData-UserQuestionProgressTableArn',
    });

    new cdk.CfnOutput(this, 'UserQuestionProgressGsi1Name', {
      value: 'GSI1_UserStatus_UpdatedAt',
      description: 'Global Secondary Index name for querying by userStatus and updatedAt',
      exportName: 'CodeComprehensionData-UserQuestionProgressGsi1Name',
    });
  }
}
