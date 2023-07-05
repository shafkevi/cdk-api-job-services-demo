import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { aws_ec2 as ec2 } from 'aws-cdk-lib';
import { aws_lambda as lambda } from 'aws-cdk-lib';
import Vpc from '../constructs/Vpc';
import Lambda from '../constructs/Lambda';
import Database from '../constructs/Database';
import BastionHost from '../constructs/Bastion';

export interface ApiStackProps extends cdk.StackProps{
  version: string,
}

export class CdkDatabaseLambdaDemoStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: ApiStackProps) {
    super(scope, id, props);

    const {
      version,
    } = props;

    // Creates a VPC
    const { vpc } = new Vpc(this, `Vpc-${version}`, {
      cidr: "10.1.0.0/16"
    });

    // Creates RDS Postgres instance
    const database = new Database(this, `Database-${version}`, {
      vpc,
      multiAz: true,
      publiclyAccessible: false,
    });

    // Creates nano EC2 instance to route traffic locally to RDS
    const bastion = new BastionHost(this, `BastionHost-${version}`, {
      vpc,
    });
    // Allow this Bastion to access the database
    database.allowFrom(
      bastion.instance, ec2.Port.tcp(database.instance.instanceEndpoint.port)
    )
    // Generate a CloudFormation output of the SSM command to connect.
    bastion.generateDatabaseSsmCommandCfnOutput(
      'databaseSSMCommand',
      database.instance.instanceEndpoint.hostname,
      database.instance.instanceEndpoint.port,
      5433,
    )
    
    // Creates lambda in VPC to be able to access DB
    const { function: lambda1 } = new Lambda(this, `Lambda1-${version}`, {
      vpc,
      runtime: lambda.Runtime.PYTHON_3_10,
      handler: "index.main",
      codePath: "src/lambdas/lambda1"
    });

    // Creates lambda outside VPC as it doesn't need DB access
    const { function: lambda2 } = new Lambda(this, `Lambda2-${version}`, {
      runtime: lambda.Runtime.PYTHON_3_10,
      handler: "index.main",
      codePath: "src/lambdas/lambda2"
    });

  }
}
