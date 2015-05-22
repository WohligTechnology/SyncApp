var adminurl = "http://localhost/syncbackend/index.php/welcome/";
var config = {};
var abc = {};
var user = 3;
var syncapp = angular.module('syncapp', []);

syncapp.factory('SyncApp', function ($http) {

    var returnval = {};
    config = $.jStorage.get("config");
    if (!config) {
        config = {
            user: {}
        };
        $.jStorage.set("config", config);
    }

    function setconfig() {
        $.jStorage.set("config", config);
    };

    function changeservertimestamp(timestamp) {
        config.user.servertimestamp = timestamp;
        setconfig();
    };

    function changelocaltimestamp(timestamp) {
        config.user.localtimestamp = timestamp;
        setconfig();
    };

    var db = openDatabase('sync', '1.0', 'SyncTestDatabase', 2 * 1024 * 1024);

    db.transaction(function (tx) {
        tx.executeSql('CREATE TABLE IF NOT EXISTS `users` (`id` INTEGER PRIMARY KEY ASC, `name` VARCHAR(255),`email` VARCHAR(255),`serverid` INTEGER  )');
    });
    db.transaction(function (tx) {
        tx.executeSql('CREATE TABLE IF NOT EXISTS `userslog` (`id` INTEGER PRIMARY KEY ASC, `timestamp` TIMESTAMP,`type` INTEGER,`user` INTEGER,`table` INTEGER)');
    });

    returnval.query = function (querystr, callback) {
        //console.log(querystr);
        db.transaction(function (tx) {
            tx.executeSql(querystr, [], function (tx, results) {
                var len = results.rows.length;
                if (callback) {
                    callback(results.rows, len, results);
                }
            }, function (tx, error) {
                console.log(error);
            });
        });
    };

    abc.query = function (querystr, callback) {
        db.transaction(function (tx) {
            tx.executeSql(querystr, [], function (tx, results) {

                var len = results.rows.length;
                console.log(results);


                console.log(results.rows);
                abc.result = results.rows;
                console.log(len);
                for (var i = 0; i < len; i++) {
                    console.log(abc.result.item(i));
                }

            }, function (tx, error) {

                console.log(error);
            });
        });
    };



    function updatelocal(data, status, callback) {
        switch (data.type) {
        case "1":
            {
                returnval.query("INSERT INTO `users` (`id`, `name`,`email`,`serverid`) VALUES (null,'" + data.name + "','" + data.email + "','" + data.id + "')", function (result, len) {
                    if (callback) {
                        callback();
                    }
                });
            }
            break;
        case "2":
            {
                returnval.query("SELECT * FROM `users` WHERE `serverid`='" + data.id + "' ", function (result, len) {
                    if (len == 0) {
                        data.type = "1";
                        return updatelocal(data, status, callback);
                    } else {
                        returnval.query("UPDATE `users` SET `name`='" + data.name + "',`email`='" + data.email + "' WHERE `id`='" + result.item(0).id + "'");
                    }
                });
            }
            break;
        case "3":
            {
                returnval.query("DELETE FROM `users` WHERE `serverid`='" + data.id + "'");
            }
            break;
        }
        changeservertimestamp(data.timestamp);
    }


    returnval.create = function (data, callback) {

        returnval.query("INSERT INTO `users` (`id`, `name`,`email`,`serverid`) VALUES (null,'" + data.name + "','" + data.email + "','" + data.id + "')", function (result, len, id) {
            id = id.insertId;
            var d = new Date();
            var n = d.getTime();
            returnval.query("INSERT INTO `userslog` (`id`,`timestamp`,`type`,`user`,`table`) VALUES (null,'" + n + "','" + 1 + "','" + user + "','" + id + "')", null);
            console.log(id);

            callback();
        });
    };
    returnval.update = function (data, callback) {

        returnval.query("UPDATE `users` SET `name`='" + data.name + "',`email`='" + data.email + "' WHERE `id`='" + data.id + "'", function (result, len) {

            var d = new Date();
            var n = d.getTime();
            returnval.query("INSERT INTO `userslog` (`id`,`timestamp`,`type`,`user`,`table`) VALUES (null,'" + n + "','" + 2 + "','" + user + "','" + data.id + "')", null);
            callback();
        });

    };
    returnval.delete = function (data, callback) {
        returnval.query("DELETE FROM `users` WHERE `id`='" + data.id + "'", function (result, len) {
            var d = new Date();
            var n = d.getTime();
            returnval.query("INSERT INTO `userslog` (`id`,`timestamp`,`type`,`user`,`table`) VALUES (null,'" + n + "','" + 3 + "','" + user + "','" + data.id + "')", null);
            callback();
        });
    };

    returnval.getone = function (callback) {
        //console.log("CHECKING");
        if (!config.user.localtimestamp) {
            config.user.localtimestamp = 0;
        }
        returnval.query("SELECT `table` as `id`,'"+user+"' as `user`,`serverid`,`name`,`email`,`timestamp` ,`type` FROM (SELECT `userslog`.`table`,`users`.`name`,`users`.`email`, `userslog`.`timestamp`, `userslog`.`type`,`users`.`serverid` FROM `userslog` LEFT OUTER JOIN `users` ON `users`.`id`=`userslog`.`table` WHERE `userslog`.`timestamp`>'" + config.user.localtimestamp + "' ORDER BY `userslog`.`timestamp` DESC) as `tab1` GROUP BY `tab1`.`table` ORDER BY `tab1`.`timestamp` LIMIT 0,1", callback);
    };

    returnval.synclocaltoserver = function (callback) {
        console.log("LOCAL TO SERVER");
        returnval.getone(function (result, len) {
            console.log(len);
            if (len > 0) {
                console.log("Server Submisssion");
                //on success change localtimestamp
                var row = result.item(0);
                $http.post(adminurl + "localtoserver", row).success(function (data) {
                    if(data.id)
                    {
                        returnval.query("UPDATE `users` SET `serverid`='"+data.id+"' WHERE `id`='"+row.id+"'");
                    }
                    console.log(row);
                    changelocaltimestamp(row.timestamp);
                    changeservertimestamp(data.timestamp);
                    returnval.synclocaltoserver();
                });
            } else {
                if (callback) {
                    callback();
                }
            }

        });
    }





    returnval.servertolocal = function () {
        $http.get(adminurl + "servertolocal", {
            params: {
                timestamp: config.user.servertimestamp
            }
        }).success(function (data, status) {
            if (data == "false") {
                console.log("Data Upto date");
            } else {
                for (var i = 0; i < data.length; i++) {
                    updatelocal(data[i], "sync");
                }
                console.log("run again");
                return returnval.servertolocal();
            }
        });
    };
    return returnval;
});