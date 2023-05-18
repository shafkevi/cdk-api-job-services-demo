import { Construct } from "constructs";
import * as apprunner_alpha from '@aws-cdk/aws-apprunner-alpha';
import { aws_ec2 as ec2 } from "aws-cdk-lib";
import { aws_rds as rds } from "aws-cdk-lib";

export interface ApiProps {
  vpc?: ec2.IVpc,
  vpcSubnets? : ec2.SelectedSubnets,
  database?: rds.DatabaseInstance,
  runtime: apprunner_alpha.Runtime,
  repo: string,
  branch: string,
  port: string,
  startCommand: string,
  buildCommand: string,
  githubConnectionArn: string,
}

export default class Api extends Construct {
  public readonly service: apprunner_alpha.Service;
  public readonly vpcConnector: apprunner_alpha.VpcConnector;
  constructor(scope: Construct, id: string, props: ApiProps) {
    super(scope, id);

    const {
      vpc,
      database,
      vpcSubnets,
      runtime,
      repo,
      branch,
      port,
      startCommand,
      buildCommand,
      githubConnectionArn,
    } = props;


    /* If this appRunner instance is in a VPC, create a security group allowing access to the database */
    if (vpc) {
      const appRunnerSecurityGroup = new ec2.SecurityGroup(this, `SecurityGroup`, {
        vpc: vpc,
        description: 'SecurityGroup associated with the App Runner Service',
        securityGroupName: `${id}-SG`,
      });
      database!.connections.allowFrom(
        appRunnerSecurityGroup, ec2.Port.tcp(database!.instanceEndpoint.port)
      );
      this.vpcConnector = new apprunner_alpha.VpcConnector(this, 'VpcConnector', {
        vpc,
        vpcSubnets,
        securityGroups: [appRunnerSecurityGroup],
      });
    }

    this.service = new apprunner_alpha.Service(this, 'Service', {
      vpcConnector: this.vpcConnector,
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
