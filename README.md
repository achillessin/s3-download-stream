# s3-download
A pipeable read stream which downloads from Amazon S3 using multipart downloads.

```js
var AWS = require('aws-sdk');
var fs = require('fs');

var s3client = new AWS.S3({
    accessKeyId:"",    //required
    secretAccessKey:"" //required
});

var params = {
    Bucket:"",        //required
    Key:""            //required
}
var sessionParams = {
    maxPartSize: ,//default 20MB
    concurrentStreams: ,//default 5
    maxRetries: ,//default 3
    totalObjectSize: //required size of object being downloaded
}
var downloader = require('s3-download')(s3client);

var d = downloader.download(params,sessionParams);
d.on('error',function(err){
    console.log(err);
});
// dat = size_of_part_downloaded
d.on('part',function(dat){
    console.log(dat);
});
d.on('downloaded',function(dat){
    console.log(dat);
});

var w = fs.createWriteStream(/path/to/file.txt);
d.pipe(w);
```
## Usage

In the download() function :
'params' defines the parameters for s3. It takes the same parameters as the getObject( )
function from the s3 javascript sdk. (http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/S3.html#getObject-property)

'sessionParams' defines the parameters for the current downloading session. It takes the following parameters:
maxPartSize : this is the maximum size of each chunk being downloaded
concurrentStreams : number of concurrent chunks being downloaded
maxRetries : number of retries to download a chunk
totalObjectSize : total size of the object being downloaded

The download() function returns a read stream which can then be piped to other streams.

### Installation

```
npm install s3-download
```
### License

(The MIT License)

Copyright (c) 2014 Sisil Mehta <sisilmet2000@gmail.com>

Permission is hereby granted, free of charge, to any person obtaining
a copy of this software and associated documentation files (the
'Software'), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to
the following conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.