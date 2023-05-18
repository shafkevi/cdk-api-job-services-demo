import { Construct } from "constructs";
import { aws_sqs as sqs } from "aws-cdk-lib";
import { aws_rds as rds } from "aws-cdk-lib";


export interface QueueProps {
  name?: string,
}

export default class Queue extends Construct {
  public readonly queue: sqs.Queue;
  constructor(scope: Construct, id: string, props: QueueProps) {
    super(scope, id);

    const { 
      name,
    } = props;

    this.queue = new sqs.Queue(this, 'Queue',{
      queueName: name,
      
    });

  }
}
