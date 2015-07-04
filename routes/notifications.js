module.exports = function(Apio){

	return {
        create: function(req, res) {
            Apio.Notifications.create(req.body.notification,function(err,result){

            });
        },
        list: function(req, res) {
            var currentUser = 'matteo.di.sabatino.1989@gmail.com';

            Apio.Database.db.collection('Users').findOne({
                email: currentUser
            }, function(err, doc) {
                if (err) {
                    console.log("Un errore ");
                    console.log(err);
                    res.status(500).send({});
                } else {
                    res.send(doc.unread_notifications);
                }
            })
        },
        listdisabled: function(req, res) {
            var currentUser = 'matteo.di.sabatino.1989@gmail.com';

            Apio.Database.db.collection('Users').findOne({
                email: currentUser
            }, function(err, doc) {
                if (err) {
                    console.log("Un errore ");
                    console.log(err);
                    res.status(500).send({});
                } else {
                    res.send(doc.disabled_notification);
                }
            })
        },
        delete: function(req, res) {
            var notif = req.body.notification;
            var user = req.body.username;
            Apio.Database.db.collection('Users').update({
                "username": user
            }, {
                $pull: {
                    "unread_notifications": notif
                }
            }, function(err) {
                if (err) {
                    console.log('apio/notification/markAsRead Error while updating notifications');
                    res.status(500).send({});
                } else {
                    res.status(200).send({});
                }
            })
        },
        disable: function(req, res) {
            var notif = req.body.notification;
            var user = req.body.username;
            Apio.Database.db.collection('Users').update({
                "username": user
            }, {
                $push: {
                    "disabled_notification": notif
                }
            }, function(err) {
                if (err) {
                    console.log('apio/notification/disable Error while updating notifications');
                    res.status(500).send({});
                } else {
                    res.status(200).send({});
                }
            })
        },
        enable: function(req, res) {
            var notif = req.body.notification;
            var user = req.body.username;
            Apio.Database.db.collection('Users').update({
                "username": user
            }, {
                $pull: {
                    "disabled_notification": notif
                }
            }, function(err) {
                if (err) {
                    console.log('apio/notification/enable Error while updating notifications');
                    res.status(500).send({});
                } else {
                    res.status(200).send({});
                }
            })
        }
    }
}