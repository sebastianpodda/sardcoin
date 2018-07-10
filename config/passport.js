// Basic login strategy
const basic         = require('./passport/basic');

// Jwt Strategies for each type of user
const jwtAdmin      = require('./passport/jwt-admin');
const jwtProducer   = require('./passport/jwt-producer');
const jwtBroker     = require('./passport/jwt-broker');
const jwtConsumer   = require('./passport/jwt-consumer');
const jwtVerifier   = require('./passport/jwt-verifier');


module.exports = function (passport) {

    // serialize sessions
    passport.serializeUser((user, done) => done(null, user));
    passport.deserializeUser((user, done) => done(null, user));

    // strategies
    passport.use(basic);

    passport.use('jwt-admin', jwtAdmin);
    passport.use('jwt-producer', jwtProducer);
    passport.use('jwt-broker', jwtBroker);
    passport.use('jwt-consumer', jwtConsumer);
    passport.use('jwt-verifier', jwtVerifier);
};