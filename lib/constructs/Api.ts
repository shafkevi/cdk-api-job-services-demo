import { Construct } from "constructs";
import * as apprunner_alpha from '@aws-cdk/aws-apprunner-alpha';
import { aws_ec2 as ec2 } from "aws-cdk-lib";
import { aws_iam as iam } from "aws-cdk-lib";

export interface ApiProps {
  vpc?: ec2.IVpc,
  vpcSubnets? : ec2.SelectedSubnets,
  runtime: apprunner_alpha.Runtime,
  repo: string,
  branch: string,
  port: string,
  startCommand: string,
  buildCommand: string,
  githubConnectionArn: string,
}

export default class Api extends Construct {
  public readonly instanceRole: iam.Role;
  public readonly service: apprunner_alpha.Service;
  public readonly vpcConnector: apprunner_alpha.VpcConnector;
  public readonly appRunnerSecurityGroup: ec2.SecurityGroup;
  constructor(scope: Construct, id: string, props: ApiProps) {
    super(scope, id);

    const {
      vpc,
      vpcSubnets,
      runtime,
      repo,
      branch,
      port,
      startCommand,
      buildCommand,
      githubConnectionArn,
    } = props;


    // If this appRunner instance is in a VPC, create a security group allowing access to the defined Subnets 
    if (vpc) {
      this.appRunnerSecurityGroup = new ec2.SecurityGroup(this, `SecurityGroup`, {
        vpc: vpc,
        description: 'SecurityGroup associated with the App Runner Service',
        securityGroupName: `${id}-SG`,
      });
      this.vpcConnector = new apprunner_alpha.VpcConnector(this, 'VpcConnector', {
        vpc,
        vpcSubnets,
        securityGroups: [this.appRunnerSecurityGroup],
      });
    }

    this.instanceRole = new iam.Role(this, "instanceRole", {
      assumedBy: new iam.ServicePrincipal("tasks.apprunner.amazonaws.com"),
    });

    this.service = new apprunner_alpha.Service(this, 'Service', {
      autoDeploymentsEnabled: true,
      vpcConnector: this.vpcConnector,
      instanceRole: this.instanceRole,
      source: apprunner_alpha.Source.fromGitHub({
        repositoryUrl: repo,
        branch: branch,
        configurationSource: apprunner_alpha.ConfigurationSourceType.API,
        codeConfigurationValues: {
          runtime: runtime,
          port: port,
          startCommand: startCommand,
          buildCommand: buildCommand,
        },
        connection: apprunner_alpha.GitHubConnection.fromConnectionArn(githubConnectionArn),
      }),
    });

  }
}
