import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { aws_ec2 as ec2 } from 'aws-cdk-lib';
import { aws_ecs as ecs } from 'aws-cdk-lib';
import { aws_lambda as lambda } from 'aws-cdk-lib';
import * as apprunner_alpha from '@aws-cdk/aws-apprunner-alpha';
import { aws_lambda_event_sources as lambda_event_sources } from 'aws-cdk-lib';
import Vpc from '../constructs/Vpc';
import Api from '../constructs/Api';
import Queue from '../constructs/Queue';
import Lambda from '../constructs/Lambda';
import Service from '../constructs/Service';
import Database from '../constructs/Database';
import BastionHost from '../constructs/Bastion';
import { frameworks } from './frameworks';

export interface ApiStackProps extends cdk.StackProps{
  version: string,
  framework: string,
}

export class CdkApiJobServicesDemoStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: ApiStackProps) {
    super(scope, id, props);

    const {
      version,
      framework
    } = props;

    // Creates a VPC
    const { vpc } = new Vpc(this, `Vpc-${version}`, {
      cidr: "10.1.0.0/16"
    });

    // Creates two basic SQS Queues
    const { queue: queue1 } = new Queue(this, `Queue1-${version}`, {});
    const { queue: queue2 } = new Queue(this, `Queue2-${version}`, {});

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
    // Connects lambda to SQS - such that each inbound message will invoke the Lambda 
    lambda1.addEventSource(new lambda_event_sources.SqsEventSource(queue1, {}));

    
    // Creates lambda outside VPC as it doesn't need DB access
    const { function: lambda2 } = new Lambda(this, `Lambda2-${version}`, {
      runtime: lambda.Runtime.PYTHON_3_10,
      handler: "index.main",
      codePath: "src/lambdas/lambda2"
    });
    // Connects lambda to SQS - such that each inbound message will invoke the Lambda
    lambda2.addEventSource(new lambda_event_sources.SqsEventSource(queue2, {}));

    const ecsApp = new Service(this, `AppService-${version}`, {
      vpc,
      image: ecs.ContainerImage.fromRegistry(frameworks[framework].imageUri),
      desiredCount: 2,
      environment: {
        dbname: "postgres",
        dbhost: database.instance.instanceEndpoint.hostname,
        dbport: database.instance.instanceEndpoint.port.toString(),
      },
      secrets: {
        dbuser: ecs.Secret.fromSecretsManager(database.databaseSecret,"username"),
        dbpass: ecs.Secret.fromSecretsManager(database.databaseSecret,"password")
      }
    });    
    // Allow access to the database from ECS service
    database.allowFrom(
      ecsApp.service.service,
      ec2.Port.tcp(database.instance.instanceEndpoint.port),
    );
    // Allow ECS to write messages to both queues
    queue1.grantSendMessages(ecsApp.service.taskDefinition.taskRole);
    queue2.grantSendMessages(ecsApp.service.taskDefinition.taskRole);



    // Request/Response style Api using AppRunner
    const appRunnerApi = new Api(this, `AppRunnerApi-${version}`, {
      vpc,
      vpcSubnets: database.subnets,
      runtime: apprunner_alpha.Runtime.PYTHON_3,
      repo: "https://github.com/shafkevi/simple-python-api",
      branch: frameworks[framework].branch,
      port: frameworks[framework].port,
      startCommand: frameworks[framework].startCommand,
      buildCommand: frameworks[framework].buildCommand,
      githubConnectionArn: process.env.GITHUB_CONNECTION_ARN!,
    });
    // Pass in database environment parameters to App Runner
    appRunnerApi.service.addEnvironmentVariable('dbhost', database.instance.instanceEndpoint.hostname)
    appRunnerApi.service.addEnvironmentVariable('dbport', database.instance.instanceEndpoint.port.toString())
    appRunnerApi.service.addEnvironmentVariable('dbname', 'postgres')
    appRunnerApi.service.addSecret('dbpass', apprunner_alpha.Secret.fromSecretsManager(database.databaseSecret, 'password'))
    appRunnerApi.service.addSecret('dbuser', apprunner_alpha.Secret.fromSecretsManager(database.databaseSecret, 'username'))
    // Allow access to the database from App Runner
    database.allowFrom(
      appRunnerApi.appRunnerSecurityGroup, 
      ec2.Port.tcp(database.instance.instanceEndpoint.port)
    )
    // Allow App Runner to write messages to either of the Queues.
    queue1.grantSendMessages(appRunnerApi.instanceRole);
    queue2.grantSendMessages(appRunnerApi.instanceRole);

  }
}
