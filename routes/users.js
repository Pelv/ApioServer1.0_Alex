var crypto = require('crypto');
var uuidgen = require('node-uuid')

module.exports = function(Apio) {

    return {
        update: function(req, res) {

        },
        logout: function(req, res) {
            req.session.destroy(function() {
                console.log("The session has been destroyed");
                res.send({
                    status: true
                })
            })
        },
        create: function(req, res) {
            console.log("User creation")
            var mail = req.body.mail;
            Apio.Database.db.collection('Users').findOne({
                email: req.body.email
            }, function(err, data) {
                if (data !== null) {
                    res.send({
                        status: false,
                        error: "Email already exists"
                    });
                } else {

                    var hash = crypto.createHash('sha256').update(req.body.password).digest('base64');
                    var usr = {
                        email: req.body.email,
                        password: hash,
                        uuid: uuidgen.v1()
                    }
                    Apio.Database.db.collection('Users').insert(usr, function(err) {
                        if (err) {
                            console.log(err);
                            res.status(500).send({
                                status: false
                            });
                        } else {


                            res.send({
                                status: true
                            });
                        }

                    })
                }
            })

        },
        list: function(req, res) {
            Apio.Database.db.collection('Users').find({})
                .toArray(function(err, users) {
                    if (err)
                        res.status(500).send({
                            status: false
                        })
                    res.send({
                        "status": true,
                        "users": users
                    })
                })
        },
        delete: function(req, res) {

        },
        authenticate: function(req, res) {
            console.log("/apio/user/authenticate")
            var email = req.body.email;
            var password = req.body.password;
            console.log("Mi arriva da autenticare")
            console.log(req.body)
            Apio.Database.db.collection('Users').findOne({
                email: req.body.email
            }, function(err, data) {
                if (err || data == null) {
                    console.log("NopeNopeNope")
                    res.send({
                        status: false
                    })
                } else {
                    var hash = crypto
                        .createHash('sha256')
                        .update(req.body.password)
                        .digest('base64');
                    if (data.password == hash) {
                        req.session.email = req.body.email;
                        req.session.auth = true;

                        res.send({
                            user: data,
                            status: true
                        })
                    } else {
                        console.log("Password errata")
                        res.send({
                            status: false,
                            errors: [{
                                type: 'CredentialError'
                            }]
                        })
                    }
                }
            })



        }
    }
}
