# End-to-End (e2e) test suite

Since the purpose of this plugin is to deploy websites to AWS S3, the only way to completely test it is to actually
deploy websites to S3. In order to allow testing all aspects of this plugin, as well as to ensure the safety &
security of your AWS environment, some setup is required before you can run the tests.

## Setup for individual developers

1. On your development PC, [install Terraform](https://learn.hashicorp.com/terraform/getting-started/install) and make
sure you've added it to your PATH.

2. Open a Bash/PowerShell terminal and navigate to the test-infrastructure directory in this project.

3. Run `terraform init` to install dependencies.

4. Run `terraform apply` to deploy the required infrastructure.

5. If you don't already have one, create a `.env` file in the root directory of the project. This file is mentioned in
`.gitignore` so it will not be committed to Git.

6. Add a line to `.env` starting with `AWS_ACCESS_KEY_ID=` and followed by the value of the test_user_access_key_id
output from `terraform apply`.

7. Add a line to `.env` starting with `AWS_SECRET_ACCESS_KEY=` and followed by the value of the
test_user_secret_access_key output. (This output is marked as sensitive. To view it's value you can run
`terraform output test_user_secret_access_key` or, if you don't want the value outputted to the terminal, you can
view its value inside the `test-infrastructure/terraform.tfstate` file.)

8. In order to run the tests, run `npm run test:e2e` in the root directory of the project. 

## Setup for Continuous Integration / maintainers

If you are maintaining a fork of gatsby-plugin-s3 that has Continuous Integration set up, and your CI is configured
to automatically run tests against Pull Requests, you should follow this setup procedure in order to discourage
malicious actors from using your project to abuse your AWS account.

Specifically what these steps do that the "for individual developers" steps don't, is they deploy a Lambda script
that (thanks to CloudWatch Events) runs periodically and deletes any leftover test buckets. This way, in the worst case
that an attacker creates a malicious Pull Request to upload bad files to a bucket using your account and disables the
cleanup code that runs after each test, the bucket would be automatically deleted after a short interval anyway.

This procedure will incur a small cost for the Lambda function execution.

1. On a development PC, [install Terraform](https://learn.hashicorp.com/terraform/getting-started/install) and make
sure you've added it to your PATH.

2. Open a Bash/PowerShell terminal and navigate to the test-infrastructure directory in this project.

3. Run `terraform init` to install dependencies.

4. Run `terraform apply -var 'bucket_deletion_period=60'` to deploy the required infrastructure. Change the `60` to
how often you'd like the cleanup script to run, in minutes.

5. Configure your CI environment's `AWS_ACCESS_KEY_ID` environment variable to the value of the
test_user_access_key_id output.

6. Configure your CI environment's `AWS_SECRET_ACCESS_KEY` environment variable to the value of the
test_user_secret_access_key output. (This output is marked as sensitive. To view it's value you can run
`terraform output test_user_secret_access_key` or, if you don't want the value outputted to the terminal, you can
view its value inside the test-infrastructure/terraform.tfstate file.)

7. Configure your CI environment's `SKIP_BUCKET_CLEANUP` environment variable to `1`. This disables the leftover bucket
check that runs before each test run, which you no longer need because you have the Lambda script.

8. When updates are made to the test infrastructure in future, review the changes and ensure run the same apply command
as you used in step 4 to apply the update.

If you would like to run the tests locally as well as in CI, you can put the same
AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY in your `.env` file.

## How do the e2e tests work?

When the test suite starts to run, `generateBucketName` is used to create a random suffix that will be used to create
a (hopefully) unique bucket name. All tests within this test run will use this bucket.

The `buildSite` helper method is used to build one of the sites in the examples directory. This method also
allows customising the environment variables that are passed to the build process, allowing the tests to customise
the configuration of the site being built.

The `deploySite` helper method is used to deploy a site to the S3 bucket. This method requires explicitly specifying
what permissions to use during this deployment. (More on this later)

One the site has been deployed, `node-fetch` is used to make requests from the resulting website and ensure that
everything works as intended.

## How are the tests run with different permissions?

The IAM policy that is deployed during setup (test-infrastructure/test-policy.json) contains multiple statements, each
statement with a small number of permissions in it. These statements are conditional so they are only activated if the
User Agent contains a certain string.

In `deploySite`, the specified array of permissions is transformed into a User Agent string suffix. For example, let's
say a test calls `deploySite` requesting the following permissions:

```typescript
[
    Permission.PutObject,
    Permission.PutBucketAcl,
    Permission.PutBucketWebsite,
]
```

This will create a User Agent suffix that looks like `"TestPerms/PutObject+PutBucketAcl+PutBucketWebsite"`. This string
is provided to the deploy process via the `--userAgent` CLI option. The deploy script gives this value to AWS SDK, and
AWS SDK appends it to the User Agent string that's used to make requests.

This allows us to test that functionality works correctly with a minimal set of permissions and doesn't rely on any
surprising permissions.

In order to ensure that the special IAM policy is set up correctly, the first test in the test suite attempts
to perform an operation without requesting the correct permissions and verifies that this operation fails.

The test harness uses the 'TestPerms/Admin' User Agent suffix when performing actions itself, such as emptying the
bucket between tests.