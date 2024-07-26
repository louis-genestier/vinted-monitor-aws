import { SQS } from "aws-sdk";

const SCRAPING_QUEUE_URL =
  "https://sqs.eu-west-3.amazonaws.com/471112964367/scraping_queue";

const sqs = new SQS();

sqs.sendMessage(
  {
    QueueUrl: SCRAPING_QUEUE_URL,
    MessageBody: JSON.stringify({ userId: "1abc", alertId: "1abc" }),
  },
  (err, data) => {
    if (err) {
      console.log("Error", err);
    } else {
      console.log("Success", data.MessageId);
    }
  }
);
