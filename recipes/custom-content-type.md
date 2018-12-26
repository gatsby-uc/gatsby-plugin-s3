# Using a different content type for files

By default, the [mime](https://www.npmjs.com/package/mime) module is used to automatically map file extensions to a mime type.  
If you're finding your files get served with a incorrect content type, you can simply use the params field in the configuration to override this:  

```
params: {
    '*.pdf': {
        ContentType: 'application/x-pdf'
    }
}
```

Remember: params that are configured by you will always override params that the plugin itself sets.