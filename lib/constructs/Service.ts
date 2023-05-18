import { Construct } from "constructs";

import { aws_ec2 as ec2 } from 'aws-cdk-lib';
import { aws_ecs as ecs } from 'aws-cdk-lib';
import { aws_rds as rds } from 'aws-cdk-lib';
import { aws_ecs_patterns as ecs_patterns } from 'aws-cdk-lib';


export interface ServiceProps {
  vpc: ec2.Vpc,
  database: rds.DatabaseInstance,
  cpu?: number,
  environment?: { [key: string]: string },
  secrets?: { [key: string]: ecs.Secret }
  desiredCount?: number,
  containerPort?: number,
  memoryLimitMiB?: number,
  publicLoadBalancer?: boolean,
}

export default class Service extends Construct {
  public readonly service: ecs_patterns.ApplicationLoadBalancedFargateService;
  public readonly cluster: ecs.Cluster;
  constructor(scope: Construct, id: string, props: ServiceProps) {
    super(scope, id);

    const {
      vpc,
      database,
      cpu,
      environment,
      desiredCount,
      containerPort,
      memoryLimitMiB,
      publicLoadBalancer,
    } = props;


    const cluster = new ecs.Cluster(this, `EcsCluster`, {
      vpc
    });

    const databaseSecret = (name: string) => ecs.Secret.fromSecretsManager(
      database.secret!,
      name
    );

    this.service = new ecs_patterns.ApplicationLoadBalancedFargateService(this, `LoadBalancedFargateService`, {
      assignPublicIp: true,
      enableExecuteCommand: true,
      cluster: cluster,
      cpu: cpu ?? 256,
      desiredCount: desiredCount ?? 1,
      taskImageOptions: {
        // Put in your own registry/image
        // Image is built off of https://github.com/shafkevi/simple-python-api django branch
        image: ecs.ContainerImage.fromRegistry('public.ecr.aws/b4m9p8f2/simple-python-api:latest'),
        containerPort: containerPort ?? 8000,
        environment,
        secrets: {
          DB_CONNECTION: databaseSecret("engine"),
          DB_DATABASE: databaseSecret("dbname"),
          DB_HOST: databaseSecret("host"),
          DB_PORT: databaseSecret("port"),
          DB_USERNAME: databaseSecret("username"),
          DB_PASSWORD: databaseSecret("password")
        }
      },
      memoryLimitMiB: memoryLimitMiB ?? 512,
      publicLoadBalancer: publicLoadBalancer ?? true,
    });

  }
}
