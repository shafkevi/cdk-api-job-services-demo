import { Construct } from "constructs";
import { aws_ec2 as ec2 } from "aws-cdk-lib";

export interface VpcProps {
  cidr: string,
}

export default class Vpc extends Construct {
  public readonly vpc: ec2.Vpc;
  constructor(scope: Construct, id: string, props: VpcProps) {
    super(scope, id);

    const { 
      cidr
    } = props;

    this.vpc = new ec2.Vpc(this, `AppVpc-${id}`, {
      cidr: cidr,
      maxAzs: 2,
      // No Nat Gateways by default, but can easily change it here.
      natGateways: 0,
      enableDnsHostnames: true,
      enableDnsSupport: true,
      /**
       * Each entry in this list configures a Subnet Group
       *
       * PRIVATE_ISOLATED: Isolated Subnets do not route traffic to the Internet (in this VPC).
       * PRIVATE_WITH_NAT.: Subnet that routes to the internet, but not vice versa.
       * PUBLIC..: Subnet connected to the Internet.
       */
      subnetConfiguration: [
        // {
        //   cidrMask: 24,
        //   name: 'nat',
        //   subnetType: ec2.SubnetType.PRIVATE_WITH_NAT,
        // },
        {
          cidrMask: 24,
          name: 'private',
          subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
        }, 
        {
          cidrMask: 24,
          name: 'public',
          subnetType: ec2.SubnetType.PUBLIC,
        }
      ],
    });


  }
}
