var AWS = require('aws-sdk');
var fs = require('fs');

var s3 = new AWS.S3({
    accessKeyId:"",
    secretAccessKey:""
});

var params = {
    Bucket:"",
    Key:""
}
var downloader = require('./index.js')(s3);
var d = downloader.download(params,{totalObjectSize:68470352});
d.on('error',function(err){
    console.log(err);
});
d.on('part',function(dat){
    console.log(dat);
});
d.on('downloaded',function(dat){
    console.log(dat);
});

var w = fs.createWriteStream('output.txt');
d.pipe(w);
