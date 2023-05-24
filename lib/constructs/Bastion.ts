import { Construct } from "constructs";
import { CfnOutput } from "aws-cdk-lib";
import { aws_ec2 as ec2 } from 'aws-cdk-lib';

export interface BastionHostProps {
  vpc: ec2.IVpc,
}

export default class BastionHost extends Construct {
  public readonly instance: ec2.BastionHostLinux;

  constructor(scope: Construct, id: string, props: BastionHostProps) {
    super(scope, id);

    const { 
      vpc
    } = props;

    this.instance = new ec2.BastionHostLinux(this, `BastionInstance`, {
      vpc: vpc,
      subnetSelection: {
        subnetType: ec2.SubnetType.PUBLIC
      },
    });

  }

  public generateDatabaseSsmCommandCfnOutput(outputName: string, host: string, targetPort: number, localPort: number): void {
    // Command to connect to Postgres database locally
    // Each user would need to have IAM permissions to run the SSM start-session command.
    const ssmCommand = `aws ssm start-session`+
    ` --target ${this.instance.instanceId}`+
    ` --document-name AWS-StartPortForwardingSessionToRemoteHost` +
    ` --parameters '{"host":["${host}"],"portNumber":["${targetPort}"], "localPortNumber":["${localPort}"]}'`
    new CfnOutput(this, outputName, { value: ssmCommand });
  }
}
