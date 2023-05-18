def main(event, context):
    print(event)
    return {
        'statusCode': 200,
        'body': event
    }