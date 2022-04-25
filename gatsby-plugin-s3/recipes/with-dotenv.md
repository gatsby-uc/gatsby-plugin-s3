---
title: Retrieving env variables from a file
description: Save your AWS tokens to disk with a .env file
---

AWS credentials (and other environment specific information) can be saved to a `.env` file.
You can (partially!) follow the [gatsby docs on the subject](https://github.com/gatsbyjs/gatsby/blob/master/docs/docs/environment-variables.md#server-side-nodejs) for this, but we'll summarize it here:

Add the following to your `gatsby-config.js`:

```js
require("dotenv").config();
```

Then, add your AWS key & secret to a `.env` file: (don't check it into version control!)
```env
AWS_ACCESS_KEY_ID=xxxx
AWS_SECRET_ACCESS_KEY=xxxx
```

(Optional:) If you wish to have the bucketName configured from your `.env`, this can now be done fairly easily adding the following to your `.env`:
```env
S3_BUCKET_NAME=my-bucket-name
```
```js
// gatsby-config.js
plugins: [
  {
      resolve: `gatsby-plugin-s3`,
      options: {
          bucketName: process.env.S3_BUCKET_NAME
      }
  }
]
```

That's it so far for what the gatsby docs recommend.

**However!** We're not entirely there yet, as the deploy phase needs access to this information as well.
You can make dotenv run before the deploy script does by telling `npx` to require dotenv before executing the deploy script by swapping out the deploy script for following:

`package.json`:
```diff
"scripts": {
- "deploy": "gatsby-plugin-s3 deploy",
+ "deploy": "npx -n \"-r dotenv/config\" gatsby-plugin-s3 deploy",
}
```

If you have any more custom settings you want to pass to dotenv (for example, you want a different file than `.env` to be loaded), these configurations need to be added as env vars to this step.
See [the dotenv docs on this subject](https://github.com/motdotla/dotenv#preload).
