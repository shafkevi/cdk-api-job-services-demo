import { Construct } from "constructs";
import { CfnOutput } from "aws-cdk-lib";
import { aws_ec2 as ec2 } from 'aws-cdk-lib';
import { aws_rds as rds } from 'aws-cdk-lib';

/* 
  If you want more targets, this class should be changed, 
  but is currently just for demonstration purposes 
*/

export interface BastionHostProps {
  databaseInstance: rds.DatabaseInstance;
  vpc: ec2.IVpc,
}

export default class BastionHost extends Construct {
  public readonly bastionHost: ec2.BastionHostLinux;
  public readonly ssmCommand: string;

  constructor(scope: Construct, id: string, props: BastionHostProps) {
    super(scope, id);

    const { 
      vpc,
      databaseInstance
    } = props;

    this.bastionHost = new ec2.BastionHostLinux(this, `BastionInstance`, {
      vpc: vpc,
      subnetSelection: {
        subnetType: ec2.SubnetType.PUBLIC
      },
    });

    databaseInstance.connections.allowFrom(
      this.bastionHost,
      ec2.Port.tcp(databaseInstance.instanceEndpoint.port)
    );
         
    // Command to connect to Postgres database locally
    // Each user would need to have IAM permissions to run the SSM start-session command.
    this.ssmCommand = `aws ssm start-session`+
    ` --target ${this.bastionHost.instanceId}`+
    ` --document-name AWS-StartPortForwardingSessionToRemoteHost` +
    ` --parameters '{"host":["${databaseInstance.instanceEndpoint.hostname}"],"portNumber":["5432"], "localPortNumber":["5433"]}'`

    new CfnOutput(this, `sshTunnelCommandRDS`, { value: this.ssmCommand });

  }
}
