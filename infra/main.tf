terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = "eu-west-3"
}

# Scraping queue

resource "aws_sqs_queue" "scraping_queue" {
  name = "scraping_queue"
}

resource "aws_iam_policy" "read_scraping_queue_policy" {
  name        = "read_scraping_queue_policy"
  description = "Policy for scraping lambda"

  policy = jsonencode({
    Version = "2012-10-17",
    Statement = [
      {
        Action = [
          "sqs:ReceiveMessage",
          "sqs:DeleteMessage",
          "sqs:GetQueueAttributes"
        ],
        Effect   = "Allow",
        Resource = aws_sqs_queue.scraping_queue.arn
      }
    ]
  })
}

# Notification queue

resource "aws_sqs_queue" "notification_queue" {
  name = "notification_queue"
}

resource "aws_iam_policy" "write_notification_queue_policy" {
  name        = "write_notification_queue_policy"
  description = "Policy to allow sending messages to notification queue"

  policy = jsonencode({
    Version = "2012-10-17",
    Statement = [
      {
        Action = [
          "sqs:SendMessage"
        ],
        Effect   = "Allow",
        Resource = aws_sqs_queue.notification_queue.arn
      }
    ]
  })
}

resource "aws_iam_policy" "read_notification_queue_policy" {
  name        = "read_notification_queue_policy"
  description = "Policy to allow reading messages from notification queue"

  policy = jsonencode({
    Version = "2012-10-17",
    Statement = [
      {
        Action = [
          "sqs:ReceiveMessage",
          "sqs:DeleteMessage",
          "sqs:GetQueueAttributes"
        ],
        Effect   = "Allow",
        Resource = aws_sqs_queue.notification_queue.arn
      }
    ]
  })
}

# Scraping lambda
resource "aws_iam_role" "scraping_lambda_role" {
  name = "scraping_lambda_role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17",
    Statement = [
      {
        Action = "sts:AssumeRole",
        Effect = "Allow",
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      }
    ]
  })
}
resource "aws_lambda_function" "scraping_lambda" {
  filename      = "../dist/scraping_lambda.zip"
  function_name = "scraping_lambda"
  role          = aws_iam_role.scraping_lambda_role.arn

  handler = "index.handler"
  runtime = "nodejs18.x"
  timeout = 30

  environment {
    variables = {
      NOTIFICATION_QUEUE_URL = aws_sqs_queue.notification_queue.url
    }
  }
}

resource "aws_iam_role_policy_attachment" "scraping_lambda_basic_execution" {
  role       = aws_iam_role.scraping_lambda_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_iam_role_policy_attachment" "write_notification_queue_policy_attachment" {
  role       = aws_iam_role.scraping_lambda_role.name
  policy_arn = aws_iam_policy.write_notification_queue_policy.arn
}

resource "aws_iam_role_policy_attachment" "read_scraping_queue_policy_attachment" {
  role       = aws_iam_role.scraping_lambda_role.name
  policy_arn = aws_iam_policy.read_scraping_queue_policy.arn
}

resource "aws_iam_role_policy_attachment" "read_alert_table_policy_attachment" {
  role       = aws_iam_role.scraping_lambda_role.name
  policy_arn = aws_iam_policy.read_alerts_table_policy.arn
}

resource "aws_iam_role_policy_attachment" "write_checked_items_table_policy_attachment" {
  role       = aws_iam_role.scraping_lambda_role.name
  policy_arn = aws_iam_policy.write_checked_items_table_policy.arn
}

resource "aws_iam_role_policy_attachment" "read_checked_items_table_policy_attachment" {
  role       = aws_iam_role.scraping_lambda_role.name
  policy_arn = aws_iam_policy.read_checked_items_table_policy.arn
}

resource "aws_lambda_event_source_mapping" "scraping_lambda_event_source_mapping" {
  event_source_arn = aws_sqs_queue.scraping_queue.arn
  function_name    = aws_lambda_function.scraping_lambda.arn
}

# Notification lambda
resource "aws_iam_role" "notification_lambda_role" {
  name = "notification_lambda_role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17",
    Statement = [
      {
        Action = "sts:AssumeRole",
        Effect = "Allow",
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      }
    ]
  })
}
resource "aws_lambda_function" "notification_lambda" {
  filename      = "../dist/notification_lambda.zip"
  function_name = "notification_lambda"
  role          = aws_iam_role.notification_lambda_role.arn

  handler = "index.handler"
  runtime = "nodejs18.x"
  timeout = 30

  environment {
    variables = {
      DISCORD_WEBHOOK_URL_ID = aws_secretsmanager_secret.discord_webhook_url_secret.id
    }
  }
}

resource "aws_iam_role_policy_attachment" "notification_lambda_basic_execution" {
  role       = aws_iam_role.notification_lambda_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}
resource "aws_iam_role_policy_attachment" "read_notification_queue_policy_attachment" {
  role       = aws_iam_role.notification_lambda_role.name
  policy_arn = aws_iam_policy.read_notification_queue_policy.arn
}

resource "aws_iam_role_policy_attachment" "read_secret_policy_attachment" {
  role       = aws_iam_role.notification_lambda_role.name
  policy_arn = aws_iam_policy.read_secret_policy.arn
}

resource "aws_lambda_event_source_mapping" "notification_lambda_event_source_mapping" {
  event_source_arn = aws_sqs_queue.notification_queue.arn
  function_name    = aws_lambda_function.notification_lambda.arn
}

# Discord webhook URL secret
resource "aws_secretsmanager_secret" "discord_webhook_url_secret" {
  name = "discord_webhook_url"
}

resource "aws_iam_policy" "read_secret_policy" {
  name        = "read_secret_policy"
  description = "Policy to allow reading secret"

  policy = jsonencode({
    Version = "2012-10-17",
    Statement = [
      {
        Action = [
          "secretsmanager:GetSecretValue"
        ],
        Effect   = "Allow",
        Resource = aws_secretsmanager_secret.discord_webhook_url_secret.arn
      }
    ]
  })
}

## Database

# Alerts table
resource "aws_dynamodb_table" "alerts" {
  name         = "alerts"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "user_id"
  range_key    = "alert_id"

  attribute {
    name = "alert_id"
    type = "S"
  }

  attribute {
    name = "user_id"
    type = "S"
  }
}

resource "aws_iam_policy" "read_alerts_table_policy" {
  name        = "read_alerts_table_policy"
  description = "Policy to allow reading alerts table"

  policy = jsonencode({
    Version = "2012-10-17",
    Statement = [
      {
        Action = [
          "dynamodb:GetItem",
          "dynamodb:BatchGetItem",
          "dynamodb:Scan",
          "dynamodb:Query",
          "dynamodb:ConditionCheckItem"
        ],
        Effect   = "Allow",
        Resource = aws_dynamodb_table.alerts.arn
      }
    ]
  })
}

resource "aws_iam_policy" "write_alerts_table_policy" {
  name        = "write_alerts_table_policy"
  description = "Policy to allow writing alerts table"

  policy = jsonencode({
    Version = "2012-10-17",
    Statement = [
      {
        Action = [
          "dynamodb:PutItem",
          "dynamodb:UpdateItem",
        ],
        Effect   = "Allow",
        Resource = aws_dynamodb_table.alerts.arn
      }
    ]
  })
}

# Checked items table
resource "aws_dynamodb_table" "checked_items" {
  name         = "checked_items"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "alert_id"
  range_key    = "item_id"

  attribute {
    name = "alert_id"
    type = "S"
  }

  attribute {
    name = "item_id"
    type = "N"
  }
}

resource "aws_iam_policy" "read_checked_items_table_policy" {
  name        = "read_checked_items_table_policy"
  description = "Policy to allow reading checked items table"

  policy = jsonencode({
    Version = "2012-10-17",
    Statement = [
      {
        Action = [
          "dynamodb:GetItem",
          "dynamodb:BatchGetItem",
          "dynamodb:Scan",
          "dynamodb:Query",
          "dynamodb:ConditionCheckItem"
        ],
        Effect   = "Allow",
        Resource = aws_dynamodb_table.checked_items.arn
      }
    ]
  })
}

resource "aws_iam_policy" "write_checked_items_table_policy" {
  name        = "write_checked_items_table_policy"
  description = "Policy to allow writing checked items table"

  policy = jsonencode({
    Version = "2012-10-17",
    Statement = [
      {
        Action = [
          "dynamodb:PutItem",
          "dynamodb:UpdateItem",
        ],
        Effect   = "Allow",
        Resource = aws_dynamodb_table.checked_items.arn
      }
    ]
  })
}


# Create alert lambda
resource "aws_iam_role" "create_alert_lambda_role" {
  name = "create_alert_lambda_role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17",
    Statement = [
      {
        Action = "sts:AssumeRole",
        Effect = "Allow",
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      }
    ]
  })
}
resource "aws_lambda_function" "create_alert_lambda" {
  filename      = "../dist/create_alert_lambda.zip"
  function_name = "create_alert_lambda"
  role          = aws_iam_role.create_alert_lambda_role.arn

  handler = "index.handler"
  runtime = "nodejs18.x"
  timeout = 30
}

resource "aws_iam_role_policy_attachment" "create_alert_lambda_basic_execution" {
  role       = aws_iam_role.create_alert_lambda_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_iam_role_policy_attachment" "write_alerts_table_policy_attachment" {
  role       = aws_iam_role.create_alert_lambda_role.name
  policy_arn = aws_iam_policy.write_alerts_table_policy.arn
}
