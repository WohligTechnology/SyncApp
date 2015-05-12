var adminurl = "http://localhost/syncbackend/index.php/welcome/";
var config=$.jStorage.get("config");
var syncapp = angular.module('syncapp', []);

syncapp.factory('SyncApp', function ($http) {

    var returnval = {};

    var db = openDatabase('sync', '1.0', 'SyncTestDatabase', 2 * 1024 * 1024);
    db.transaction(function (tx) {
        tx.executeSql('CREATE TABLE IF NOT EXISTS LOGS (id INTEGER PRIMARY KEY ASC, "log" VARCHAR(255))');
    });


    
    returnval.query = function (querystr, callback) {
        db.transaction(function (tx) {
            tx.executeSql(querystr, [], function (tx, results) {
                var len = results.rows.length;
                if (callback) {
                    callback(results.rows, len);
                }
            }, null);
        });
    };
    return returnval;
});