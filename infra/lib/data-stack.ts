import * as cdk from 'aws-cdk-lib/core';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as s3 from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';

export interface DataStackProps extends cdk.StackProps {}

/**
 * Stack for challenge storage: S3 bucket (zip files) and DynamoDB (metadata).
 * Dev MVP: DESTROY + auto-delete objects for easy teardown.
 */
export class CodeComprehensionDataStack extends cdk.Stack {
  public readonly challengesBucket: s3.Bucket;
  public readonly challengesTable: dynamodb.Table;

  constructor(scope: Construct, id: string, props?: DataStackProps) {
    super(scope, id, props);

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
  }
}
