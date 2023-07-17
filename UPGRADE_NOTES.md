# Upgrade from aws-sdk 2 to 3

## List of modules outdated

```
Package                      Current    Wanted   Latest  Location                                 Depended by
@babel/cli                    7.17.6    7.22.9   7.22.9  node_modules/@babel/cli                  gatsby-plugin-s3
@babel/core                   7.17.9    7.22.9   7.22.9  node_modules/@babel/core                 gatsby-plugin-s3
@babel/preset-env            7.16.11    7.22.9   7.22.9  node_modules/@babel/preset-env           gatsby-plugin-s3
@babel/preset-typescript      7.16.7    7.22.5   7.22.5  node_modules/@babel/preset-typescript    gatsby-plugin-s3
@types/async                   2.4.2     2.4.2   3.2.20  node_modules/@types/async                gatsby-plugin-s3
@types/dotenv                  6.1.1     6.1.1    8.2.0  node_modules/@types/dotenv               gatsby-plugin-s3
@types/fs-extra                5.1.0     5.1.0   11.0.1  node_modules/@types/fs-extra             gatsby-plugin-s3
@types/glob                    7.2.0     7.2.0    8.1.0  node_modules/@types/glob                 gatsby-plugin-s3
@types/inquirer               0.0.43    0.0.43    9.0.3  node_modules/@types/inquirer             gatsby-plugin-s3
@types/is-ci                   1.1.0     1.1.0    3.0.0  node_modules/@types/is-ci                gatsby-plugin-s3
@types/jest                   25.2.3    25.2.3   29.5.3  node_modules/@types/jest                 gatsby-plugin-s3
@types/jest-expect-message     1.0.3     1.1.0    1.1.0  node_modules/@types/jest-expect-message  gatsby-plugin-s3
@types/klaw                    2.1.1     2.1.1    3.0.3  node_modules/@types/klaw                 gatsby-plugin-s3
@types/mime                    2.0.3     2.0.3    3.0.1  node_modules/@types/mime                 gatsby-plugin-s3
@types/minimatch               3.0.5     3.0.5    5.1.2  node_modules/@types/minimatch            gatsby-plugin-s3
@types/node                 12.20.49  12.20.55   20.4.2  node_modules/@types/node                 gatsby-plugin-s3
@types/node-fetch              2.6.1     2.6.4    2.6.4  node_modules/@types/node-fetch           gatsby-plugin-s3
@types/yargs                 15.0.14   15.0.15  17.0.24  node_modules/@types/yargs                gatsby-plugin-s3
dotenv                         6.2.0     6.2.0   16.3.1  node_modules/dotenv                      gatsby-plugin-s3
es6-promisify                  6.1.1     6.1.1    7.0.0  node_modules/es6-promisify               gatsby-plugin-s3
eslint                         6.8.0     6.8.0   8.45.0  node_modules/eslint                      gatsby-plugin-s3
eslint-config-oberon           2.0.1     2.0.1    3.0.2  node_modules/eslint-config-oberon        gatsby-plugin-s3
eslint-plugin-jsx-a11y         6.5.1     6.7.1    6.7.1  node_modules/eslint-plugin-jsx-a11y      gatsby-plugin-s3
eslint-plugin-react           7.29.4    7.32.2   7.32.2  node_modules/eslint-plugin-react         gatsby-plugin-s3
gatsby                       2.32.13   2.32.13   5.11.0  node_modules/gatsby                      gatsby-plugin-s3
glob                           7.2.0     7.2.3   10.3.3  node_modules/glob                        gatsby-plugin-s3
husky                          2.7.0     2.7.0    8.0.3  node_modules/husky                       gatsby-plugin-s3
lerna                          4.0.0     4.0.0    7.1.4  node_modules/lerna                       gatsby-plugin-s3
lint-staged                    8.2.1     8.2.1   13.2.3  node_modules/lint-staged                 gatsby-plugin-s3
node-fetch                     2.6.7    2.6.12    3.3.1  node_modules/node-fetch                  gatsby-plugin-s3
prettier                      1.19.1    1.19.1    3.0.0  node_modules/prettier                    gatsby-plugin-s3
serverless                    1.83.3    1.83.3   3.33.0  node_modules/serverless                  gatsby-plugin-s3
serverless-s3-sync            1.17.3    1.17.3    3.1.0  node_modules/serverless-s3-sync          gatsby-plugin-s3
typescript                    3.9.10    3.9.10    5.1.6  node_modules/typescript                  gatsby-plugin-s3
```
