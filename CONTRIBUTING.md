## Monorepo tooling

gatsby-plugin-s3 uses a Lerna-based monorepo. After cloning the repository, please use `npx lerna bootstrap` to install
dependencies and symlink the different projects together.

You can use `npx lerna run build` to automatically build all of the projects in the correct order.

You can use `npx lerna run test` to run the automated test suite, and `npx lerna run lint` to lint all projects.

We use Husky to automatically run typechecking and linting before each commit. This process might makes commits slow,
please be patient.

## Test setup

Running our e2e tests requires some setup, please see [TESTING.md](./TESTING.md) for more details.