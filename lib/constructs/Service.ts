import { Construct } from "constructs";

import { aws_ec2 as ec2 } from 'aws-cdk-lib';
import { aws_ecs as ecs } from 'aws-cdk-lib';
import { aws_ecs_patterns as ecs_patterns } from 'aws-cdk-lib';


export interface ServiceProps {
  vpc: ec2.Vpc,
  cpu?: number,
  image: ecs.ContainerImage,
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
      image,
      secrets,
      cpu,
      environment,
      desiredCount,
      containerPort,
      memoryLimitMiB,
      publicLoadBalancer,
    } = props;


    this.cluster = new ecs.Cluster(this, `EcsCluster`, {
      vpc
    });

    this.service = new ecs_patterns.ApplicationLoadBalancedFargateService(this, `LoadBalancedFargateService`, {
      assignPublicIp: true,
      enableExecuteCommand: true,
      cluster: this.cluster,
      cpu: cpu ?? 256,
      desiredCount: desiredCount ?? 1,
      taskImageOptions: {
        image,
        containerPort: containerPort ?? 8000,
        environment,
        secrets,
      },
      memoryLimitMiB: memoryLimitMiB ?? 512,
      publicLoadBalancer: publicLoadBalancer ?? true,
    });


  }
}
