# IMPORTANT: Values below must match relevant values in src/test/helpers.ts

locals {
    # The prefix that's used for the created test buckets. Buckets starting with this prefix will be automatically emptied and deleted.
    # Must match what's used in test-policy.json
    bucketPrefix = "gatsby-plugin-s3-tests-"

    region = "eu-west-1"
}

variable "bucket_deletion_period" {
    type = number
    description = "How often (in minutes) buckets starting with the bucketPrefix should be automatically deleted. Specify 0 for never. This uses Lambda and CloudWatch Events and may have associated costs."
    default = 0
}



terraform {
    required_version = "~> 0.12"
}

provider "aws" {
    version = "~> 2.59"
    region = local.region
}

resource "aws_iam_policy" "gatsby_plugin_s3_test_policy" {
    name = "gatsby-plugin-s3-test-policy"
    policy = file("${path.module}/test-policy.json")
}

resource "aws_iam_user" "user" {
    name = "gatsby-plugin-s3-test-user"
    force_destroy = true
}

resource "aws_iam_access_key" "key" {
    user = aws_iam_user.user.name
}

resource "aws_iam_user_policy_attachment" "user_attachment" {
    user = aws_iam_user.user.name
    policy_arn = aws_iam_policy.gatsby_plugin_s3_test_policy.arn
}

resource "aws_iam_role" "role" {
    name = "gatsby-plugin-s3-test-cleanup-role"
    assume_role_policy = file("${path.module}/lambda_assumepolicy.json")
}

resource "aws_iam_role_policy_attachment" "role_attachment" {
    role = aws_iam_role.role.name
    policy_arn = aws_iam_policy.gatsby_plugin_s3_test_policy.arn
}

data "archive_file" "lambda_function" {
    type = "zip"
    output_path = "${path.module}/artifacts/lambda.zip"

    source {
        filename = "cleanupLambda.js"
        content = file("${path.module}/../test/cleanupLambda.js")
    }

    source {
        filename = "helpers.js"
        content = file("${path.module}/../test/helpers.js")
    }
}

resource "aws_lambda_function" "function" {
    filename = "${path.module}/artifacts/lambda.zip"
    function_name = "gatsby-plugin-s3-test-cleanup"
    role = aws_iam_role.role.arn
    handler = "cleanupLambda.default"

    source_code_hash = data.archive_file.lambda_function.output_base64sha256
    runtime = "nodejs12.x"
}

resource "aws_cloudwatch_event_rule" "event" {
    name = "gatsby-plugin-s3-test-cleanup-event"

    schedule_expression = "rate(${var.bucket_deletion_period > 0 ? var.bucket_deletion_period : 2} minute${var.bucket_deletion_period == 1 ? "" : "s"})"

    is_enabled = var.bucket_deletion_period > 0
}

resource "aws_cloudwatch_event_target" "target" {
    target_id = "cleanup-function"
    rule = aws_cloudwatch_event_rule.event.name
    arn = aws_lambda_function.function.arn
}

output "test_user_access_key_id" {
    value = aws_iam_access_key.key.id
}

output "test_user_secret_access_key" {
    value = aws_iam_access_key.key.secret
    sensitive = true
}