var AWS = require('aws-sdk');
var fs = require('fs');

var s3 = new AWS.S3({
    accessKeyId:"",    //required
    secretAccessKey:"" //required
});

var params = {
    Bucket:"",        //required
    Key:""            //required
}
var downloader = require('./index.js')(s3);
var size = 0; //required: size of the object being downloaded
var d = downloader.download(params,{totalObjectSize:size});
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
