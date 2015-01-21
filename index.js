var assert = require('assert');
var async = require('async');
var EventEmitter = require('events').EventEmitter;
var util = require('util');

// Set the S3 client to be used for this upload.
function Client(client) {
    if (this instanceof Client === false) {
        return new Client(client);
    }

    if (!client) {
        throw new Error('Must configure an S3 client before attempting to create an S3 upload stream.');
    }

    this.cachedClient = client;
}

Client.prototype.download = function(destinationDetails, sessionDetails) {
    var cachedClient = this.cachedClient;

    if (!sessionDetails) sessionDetails = {};

    var self = this;
    var _maxPartSize = 1024*1024*5; //5MB
    var _concurrentStreams = 5;
    var _maxRetries = 3;
    var _params = null;

    self.maxPartSize = function(size){
        _maxPartSize = size;
    }
    self.concurrentStreams = function(numStreams) {
        _concurrentStreams = numstreams;
    }
    self.maxRetries = function(numRetries) {
        _maxRetries = numRetries;
    }
    self.params = function(params){
        _params = params;
    }
    self.download = function(filestream,size) {
        var bytesDownloaded = 0;
        var functionArray = [];

        assert.notStrictEqual(size,null,"'size' parameter is required.");
        assert.notStrictEqual(filestream,null,"'filestream' parameter is required.");
        assert.notStrictEqual(_params,null,"'params' parameter is required.");

        while(bytesDownloaded < size) {
            var func = function(callback){
                downloadConcurrentParts(filestream,this.offset,size,callback);
            };
            functionArray.push(async.retry(_maxretries,func.bind({offset: bytesDownloaded})));
            bytesDownloaded += _concurrentStreams * _maxPartSize;
        }

        async.series(functionArray, function(err,results){
            filestream.end();
            if(err){
                self.emit('error',err);
            } else {
                self.emit('downloaded',results);
            }
        });
    }
    var downloadConcurrentParts = function(filestream,offset,maxupperboundplusone,callback){
        var functionArray = [];
        var lowerBoundArray = [];
        var upperBoundArray = [];
        var bytesToDownload = 0;

        for(var i=0;i<_concurrentStreams;i++){
            lowerBoundArray.push( i * _maxPartSize + offset );
            upperBoundArray.push( Math.min( lowerBoundArray[i] + _maxPartSize-1, maxupperboundplusone-1 ) );
            bytesToDownload += upperBoundArray[i] - lowerBoundArray[i] + 1;
            var paramsCopy = JSON.parse(JSON.stringify(_params));

            var func = function(cb){
                var context = this;
                context.params.Range = "bytes="+this.lowerBound+"-"+this.upperBound;
                _s3client.getObject(context.params, function(err, data){
                    self.emit('part',context.upperBound - context.lowerBound);
                    cb(err,data);
                });
            }
            functionArray.push(async.retry(_maxRetries, func.bind({upperBound:upperBoundArray[i],lowerBound:lowerBoundArray[i],params:paramsCopy})));

            if(upperBoundArray[i] >= maxupperboundplusone-1)
                break;
        }
        async.parallel(functionArray,function(err,results){
            if(err){
                callback(err);
            } else {
                for(var i=0;i<results.length;i++){
                    filestream.write(results[i].Body);
                }
                callback(null,"written range"+results[i].Range+" to file");
            }
        });
    }
};
util.inherits(s3_download_stream, EventEmitter);


Client.globalClient = null;

Client.client = function (options) {
    Client.globalClient = new Client(options);
    return Client.globalClient;
};


Client.download = function (destinationDetails, sessionDetails) {
    if (!Client.globalClient) {
        throw new Error('Must configure an S3 client before attempting to create an S3 upload stream.');
    }
    return Client.globalClient.download(destinationDetails, sessionDetails);
};

module.exports = Client;