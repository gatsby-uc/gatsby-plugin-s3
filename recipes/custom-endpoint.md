---
title: Configuring a custom endpoint
description: Using Yandex, DigitalOcean, or any other S3-compliant storage service together with gatsby-plugin-s3
---

To use Yandex S3 or any supported AWS services you need only to change region & `customAwsEndpointHostname` params (provided by service) before deploy.
Yandex example:
```typescript
{
    bucketName: 'YOUR_BUCKET_NAME',
    region: 'us-east-1',
    customAwsEndpointHostname: 'storage.yandexcloud.net'
}
```

## Endpoint hostnames

Here are some popular S3-complaint services and their hostnames that you'd need to use.  
We'll also link to their documentation with more info on what endpoints to use.

- [Yandex](https://cloud.yandex.com/docs/storage/s3/): `storage.yandexcloud.net`
- [DigitalOcean spaces](https://developers.digitalocean.com/documentation/spaces/): `nyc3.digitaloceanspaces.com` - replace `nyc3` with the region of your choice
- [Oracle Cloud](https://docs.cloud.oracle.com/en-us/iaas/Content/Object/Tasks/s3compatibleapi.htm#APIrequirements): `mynamespace.compat.objectstorage.us-phoenix-1.oraclecloud.com` - replace `mynamespace` with your namespace, and `us-phoenix-1` with your region.
- Rackspace Cloud: [see the list here](https://developer.rackspace.com/docs/cloud-files/v1/general-api-info/service-access/#service-access)
- [IBM Cloud](https://cloud.ibm.com/docs/services/cloud-object-storage/api-reference?topic=cloud-object-storage-endpoints) `s3.us.cloud-object-storage.appdomain.cloud` (replace `us` with either `eu` or `ap`)
- [Dreamhost Dreamobjects](https://help.dreamhost.com/hc/en-us/articles/360001370846-What-DreamObjects-hostname-should-I-use-to-connect-): `objects-us-east-1.dream.io`

If you have any endpoint hostname you'd like to add to this document, [go here](https://github.com/jariz/gatsby-plugin-s3/edit/master/recipes/custom-endpoint.md).