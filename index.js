var assert = require('assert');
var async = require('async');
var events = require('events');
var Readable = require('stream').Readable;

// Set the S3 client to be used for this download.
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
    var e = new events.EventEmitter();

    if (!sessionDetails) sessionDetails = {};

    // Create the writable stream interface.
    var rs = new Readable({
        highWaterMark: 4194304 // 4 MB
    });

    //variables pertaining to the download.
    var _maxPartSize = sessionDetails.maxPartSize ? sessionDetails.maxPartSize : 1024*1024*5; //5MB
    var _concurrentStreams = sessionDetails.concurrentStreams ? sessionDetails.concurrentStreams : 5;
    var _maxRetries = sessionDetails.maxRetries ? sessionDetails.maxRetries : 3;
    var _totalObjectSize = sessionDetails.totalObjectSize ? sessionDetails.totalObjectSize : 0;
    var _params = destinationDetails;

    //state management
    var downloading = false;

    rs.maxPartSize = function(partSize){
        if(partSize < 1024*1024*5)
            partSize = 1024*1024*5;
        _maxPartSize = partSize;
        return rs;
    };
    rs.getMaxPartSize = function() {
        return _maxPartSize;
    };
    rs.concurrentStreams = function(numStreams) {
        if(numStreams <1 ) {
            numStreams = 1;
        }
        _concurrentStreams = numstreams;
        return rs;
    };
    rs.getConcurrentStreams = function() {
        return _concurrentStreams;
    };
    rs.maxRetries = function(numRetries) {
        _maxRetries = numRetries;
        return rs;
    };
    rs.getMaxRetries = function() {
        return _maxRetries;
    };
    rs.totalObjectSize = function(size) {
        _totalObjectSize = size;
        return rs;
    };
    rs.getTotalObjectSize = function() {
        return _totalObjectSize;
    };

    rs._read = function() {
        if ( downloading ) return;

        downloading = true;

        assert.notStrictEqual(_totalObjectSize,0,"'totalObjectSize' parameter is required.");
        assert.notStrictEqual(_params,null,"'destinationDetails' parameter is required.");

        var bytesDownloaded = 0;
        var functionArray = [];
        while(bytesDownloaded < _totalObjectSize) {
            var func = function(callback){
                downloadConcurrentParts(this.offset,callback);
            };
            functionArray.push(async.retry(_maxRetries,func.bind({offset: bytesDownloaded})));
            bytesDownloaded += _concurrentStreams * _maxPartSize;
        }

        async.series(functionArray, function(err,results){
            rs.push(null);
            downloading = false;
            if(err){
                rs.emit('error',err);
            } else {
                rs.emit('downloaded',results);
            }
        });
    };
    var downloadConcurrentParts = function(offset,callback){
        var functionArray = [];
        var lowerBoundArray = [];
        var upperBoundArray = [];
        var bytesToDownload = 0;

        for(var i=0;i<_concurrentStreams;i++){
            lowerBoundArray.push( i * _maxPartSize + offset );
            upperBoundArray.push( Math.min( lowerBoundArray[i] + _maxPartSize-1, _totalObjectSize-1 ) );
            bytesToDownload += upperBoundArray[i] - lowerBoundArray[i] + 1;
            var paramsCopy = JSON.parse(JSON.stringify(_params));

            var func = function(cb){
                var context = this;
                context.params.Range = "bytes="+context.lowerBound+"-"+context.upperBound;
                cachedClient.getObject(context.params, function(err, data){
                    rs.emit('part',context.upperBound - context.lowerBound);
                    cb(err,data);
                });
            };
            functionArray.push(async.retry(_maxRetries, func.bind({upperBound:upperBoundArray[i],lowerBound:lowerBoundArray[i],params:paramsCopy})));

            if(upperBoundArray[i] >= _totalObjectSize-1)
                break;
        }
        async.parallel(functionArray,function(err,results){
            if(err){
                callback(err);
            } else {
                for(var i=0;i<results.length;i++){
                    rs.push(results[i].Body);
                }
                callback(null,"");
            }
        });
    };
    return rs;
};

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