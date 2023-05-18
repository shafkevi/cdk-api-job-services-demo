import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as apprunner_alpha from '@aws-cdk/aws-apprunner-alpha';
import { aws_lambda_event_sources as lambda_event_sources } from 'aws-cdk-lib';
import { aws_lambda as lambda } from 'aws-cdk-lib';
import { aws_ec2 as ec2 } from 'aws-cdk-lib';
import Queue from '../constructs/Queue';
import Database from '../constructs/Database';
import Vpc from '../constructs/Vpc';
import BastionHost from '../constructs/Bastion';
import Lambda from '../constructs/Lambda';
import Api from '../constructs/Api';
import Service from '../constructs/Service';

export interface ApiStackProps extends cdk.StackProps{
  version: string,
}

export class CdkApiJobServicesDemoStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: ApiStackProps) {
    super(scope, id, props);

    const {
      version
    } = props;

    /* Creates a VPC */
    const { vpc } = new Vpc(this, `Vpc-${version}`, {
      cidr: "10.1.0.0/16"
    });

    /* Creates two AWS SQS Queues */
    const { queue: queue1 } = new Queue(this, `Queue1-${version}`, {});
    const { queue: queue2 } = new Queue(this, `Queue2-${version}`, {});



    /* Creates an RDS Postgres instance */
    const database = new Database(this, `Database-${version}`, {
      vpc,
      multiAz: true,
      publiclyAccessible: false,
    });

    /* Creates a nano EC2 bastion instance with tunnel access to Database
    Also generates the SSM Command to create the tunnel on your local machine */
    const { bastionHost, ssmCommand } = new BastionHost(this, `BastionHost-${version}`, {
      vpc,
      databaseInstance: database.instance,
    });


    /* Creates a lambda that will execute within the VPC 
     Because it needs database access */
    const { function: lambda1 } = new Lambda(this, `Lambda1-${version}`, {
      vpc,
      runtime: lambda.Runtime.PYTHON_3_10,
      handler: "index.main",
      codePath: "src/lambdas/lambda1"
    });
    /* Connects lambda to SQS - such that each inbound message will invoke the Lambda */
    lambda1.addEventSource(new lambda_event_sources.SqsEventSource(queue1, {}));

    /* Creates a lambda that will not execute within the VPC
     As it does not need database access */
    const { function: lambda2 } = new Lambda(this, `Lambda2-${version}`, {
      runtime: lambda.Runtime.PYTHON_3_10,
      handler: "index.main",
      codePath: "src/lambdas/lambda2"
    });
    /* Connects lambda to SQS - such that each inbound message will invoke the Lambda */
    lambda2.addEventSource(new lambda_event_sources.SqsEventSource(queue2, {}));

    // const ecsApp = new Service(this, `AppService-${version}`, {
    //   vpc,
    //   database: database.instance, 
    // });
    // database.instance.connections.allowFrom(
    //   ecsApp.service.service,
    //   ec2.Port.tcp(database.instance.instanceEndpoint.port),
    // );


    // Different python framework repos for demo purposes
    let frameworks = {
      django: {
        branch: "django",
        port: "8000",
        buildCommand: "pip install -r requirements.txt",
        startCommand: "gunicorn sampleapi.wsgi",
      },
      flask: {
        branch: "flask",
        port: "8000",
        buildCommand: "pip install -r requirements.txt",
        startCommand: "python server.py",
      },
      fast: {
        branch: "fast",
        port: "8000",
        buildCommand: "pip install -r requirements.txt",
        startCommand: "uvicorn server:app --host=0.0.0.0 --port=8000",
      },
    } 
    const framework = "fast"
    /* Request/Response style Api using AppRunner */
    const appRunnerApi = new Api(this, `AppRunnerApi-${version}`, {
      vpc,
      vpcSubnets: database.subnets,
      database: database.instance,
      runtime: apprunner_alpha.Runtime.PYTHON_3,
      repo: "https://github.com/shafkevi/simple-python-api",
      branch: frameworks[framework].branch,
      port: frameworks[framework].port,
      startCommand: frameworks[framework].startCommand,
      buildCommand: frameworks[framework].buildCommand,
      githubConnectionArn: process.env.GITHUB_CONNECTION_ARN!,
    });
    appRunnerApi.service.addEnvironmentVariable('dbhost', database.instance.instanceEndpoint.hostname)
    appRunnerApi.service.addEnvironmentVariable('dbport', database.instance.instanceEndpoint.port.toString())
    appRunnerApi.service.addEnvironmentVariable('dbname', 'postgres')
    appRunnerApi.service.addSecret('dbpass', apprunner_alpha.Secret.fromSecretsManager(database.databaseSecret, 'password'))
    appRunnerApi.service.addSecret('dbuser', apprunner_alpha.Secret.fromSecretsManager(database.databaseSecret, 'username'))

  }
}
