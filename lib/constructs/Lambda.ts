import { Construct } from "constructs";
import { aws_lambda as lambda } from "aws-cdk-lib";
import { aws_ec2 as ec2 } from "aws-cdk-lib";
import path = require("path");

export interface LambdaProps {
  vpc?: ec2.IVpc,
  runtime: lambda.Runtime,
  handler?: string,
  codePath: string
}

export default class Lambda extends Construct {
  public readonly function: lambda.Function;
  constructor(scope: Construct, id: string, props: LambdaProps) {
    super(scope, id);

    const { 
      vpc, 
      runtime,
      handler,
      codePath,
    } = props;

    this.function = new lambda.Function(this, "Function", {
      vpc,
      runtime: runtime,
      handler: handler || "index.main",
      code: lambda.Code.fromAsset(path.join(__dirname, "..", "..", codePath)),
    });


  }
}
