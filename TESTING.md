# End-to-End (e2e) test suite

Since the purpose of this plugin is to deploy websites to AWS S3, the only way to completely test it is to actually
deploy websites to S3. In order to allow testing all aspects of this plugin, as well as to ensure the safety &
security of your AWS environment, some setup is required before you can run the tests.

## Setup for individual developers

1. On your development PC, [install Terraform](https://learn.hashicorp.com/terraform/getting-started/install) and make
sure you've added it to your PATH.

2. Open a Bash/PowerShell terminal and navigate to the test-infrastructure directory in this project.

3. Run `terraform init` to install dependencies.

4. Configure Terraform to be able to deploy to your AWS account using one of the methods specified
[here](https://www.terraform.io/docs/providers/aws/index.html#authentication).

5. Run `terraform apply` to deploy the required infrastructure.

6. If you don't already have one, create a `.env` file in the root directory of the project. This file is mentioned in
`.gitignore` so it will not be committed to Git.

7. Add a line to `.env` starting with `AWS_ACCESS_KEY_ID=` and followed by the value of the test_user_access_key_id
output from `terraform apply`.

8. Add a line to `.env` starting with `AWS_SECRET_ACCESS_KEY=` and followed by the value of the
test_user_secret_access_key output. (This output is marked as sensitive. To view it's value you can run
`terraform output test_user_secret_access_key` or, if you don't want the value outputted to the terminal, you can
view its value inside the `test-infrastructure/terraform.tfstate` file.)

9. In order to run the tests, run `npm run test:e2e` in the root directory of the project. 

## Setup for Continuous Integration / maintainers

gatsby-plugin-s3 uses CircleCI to provide Continuous Integration. This procedure includes additional steps for
configuring CircleCI, and also replaces the bucket cleanup that runs at the start of each test execution with a Lambda
script that runs periodically.

This procedure may incur a small monthly cost for the Lambda function execution, depending on what other Lambda scripts
you have running in your AWS account. CircleCI provides a generous
[free offering for open source projects](https://circleci.com/open-source/),
so provided your fork is publicly accessible there shouldn't be any cost associated with that part.

1. On a development PC, [install Terraform](https://learn.hashicorp.com/terraform/getting-started/install) and make
sure you've added it to your PATH.

2. Open a Bash/PowerShell terminal and navigate to the test-infrastructure directory in this project.

3. Run `terraform init` to install dependencies.

4. Configure Terraform to be able to deploy to your AWS account using one of the methods specified
[here](https://www.terraform.io/docs/providers/aws/index.html#authentication).

5. Run `terraform apply -var 'bucket_deletion_period=60'` to deploy the required infrastructure. Change the `60` to
how often you'd like the cleanup script to run, in minutes.

6. In your CircleCI account, create a Context called `gatsby-plugin-s3-e2e`.

7. Configure the context's `AWS_ACCESS_KEY_ID` environment variable to the value of the
test_user_access_key_id output.

8. Configure the context's `AWS_SECRET_ACCESS_KEY` environment variable to the value of the
test_user_secret_access_key output. (This output is marked as sensitive. To view it's value you can run
`terraform output test_user_secret_access_key` or, if you don't want the value outputted to the terminal, you can
view its value inside the test-infrastructure/terraform.tfstate file.)

9. [Create a GitHub App](https://github.com/settings/apps/new). At a minimum you need to enter a unique name,
a homepage URL (you can use your repo's address), disable "Expire user authorization tokens", disable Webook, and grant
read+write access for Pull Requests.

10. Make a note of the App ID.

11. Generate a private key for your app.

12. Go to the "Install App" section of your app and install it on your account or organisation. Grant the app
access to your fork. Make a note of the Installation ID.

13. In CircleCI, create a Context called `gatsby-plugin-s3-github`.

14. Configure the context's `GITHUB_APP_ID` environment variable to the App ID.

15. Open the .pem private key file you generated earlier in a text editor.

16. Remove the header and footer:

```
-----BEGIN RSA PRIVATE KEY-----
-----END RSA PRIVATE KEY-----
```

Keep the base64 encoded key.

17. Remove all line breaks so the key is entirely on a single line.

18. Configure the context's `GITHUB_APP_PRIVATE_KEY` environment variable to the single-line base64 private key.

19. Configure the context's `GITHUB_APP_INSTALLATION_ID` environment variable to the Installation ID.

20. Configure the context's `PING_PROJECT_MAINTAINERS` environment variable to include @mentions for everyone you want to notify.
E.g. `@jariz @JoshuaWalsh`. If you don't want to ping anyone, leave this blank.

21. When updates are made to the test infrastructure in future, review the changes and run the same apply command
as you used in step 5 to apply the update.

22. (Optional) If you would like to run the tests locally as well as in CI, you can put the same
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