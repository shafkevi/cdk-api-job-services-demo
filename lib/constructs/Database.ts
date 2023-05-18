import { Construct } from "constructs";
import { aws_ec2 as ec2 } from "aws-cdk-lib";
import { aws_rds as rds } from "aws-cdk-lib";
import { aws_secretsmanager as secretsmanager } from "aws-cdk-lib";


export interface DatabaseProps {
  vpc: ec2.IVpc,
  multiAz?: boolean,
  publiclyAccessible?: boolean,
}

export default class Database extends Construct {
  public readonly instance: rds.DatabaseInstance;
  public readonly subnets: ec2.SelectedSubnets;
  public readonly subnetGroup: rds.SubnetGroup;
  public readonly databaseSecret: secretsmanager.Secret;
  constructor(scope: Construct, id: string, props: DatabaseProps) {
    super(scope, id);

    const { 
      vpc, 
      multiAz,
      publiclyAccessible,
    } = props;

    this.subnets = vpc.selectSubnets({
      onePerAz: true,
      subnetType: publiclyAccessible ? ec2.SubnetType.PUBLIC : ec2.SubnetType.PRIVATE_ISOLATED
    });

    this.subnetGroup = new rds.SubnetGroup(this, `SubnetGroup`, {
      vpc,
      description: "Subnet Group for Database",
      vpcSubnets: this.subnets,
    });

    this.databaseSecret = new secretsmanager.Secret(this, 'databaseSecret', {
      generateSecretString: {
        secretStringTemplate: JSON.stringify({ username: 'postgres' }),
        generateStringKey: 'password',
      },
    });


    this.instance = new rds.DatabaseInstance(this, `DatabaseInstance`, {
      vpc,
      multiAz,
      credentials: {
        username: this.databaseSecret.secretValueFromJson('username').unsafeUnwrap().toString(),
        password: this.databaseSecret.secretValueFromJson('password')
      },
      publiclyAccessible,
      engine: rds.DatabaseInstanceEngine.postgres({version: rds.PostgresEngineVersion.VER_15_2}),
      databaseName: "app",
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.BURSTABLE4_GRAVITON, ec2.InstanceSize.MEDIUM),
      subnetGroup: this.subnetGroup,
    });

  }
}
