---
title: Routing deployment through a proxy
description: Using gatsby-plugin-s3 together with a proxy is supported out of the box and setup is trivial.
---

Either:

Prepend the following to your deploy script:

`package.json`
```json
{
    "scripts": {
        ...
        "deploy": "HTTP_PROXY=http://my-proxy.com:8080 gatsby-plugin-s3 deploy"
    }
}
```

or, if you already have set up dotenv, add the following to your `.env` file:

```
HTTP_PROXY=http://my-proxy.com:8080
```