'use strict';

const CouponToken = require('../models/index').CouponToken;
const Op = require('../models/index').Sequelize.Op;
const PackageTokens = require('../models/index').PackageTokens;
const Sequelize = require('../models/index').sequelize;
const HttpStatus = require('http-status-codes');

exports.insertCouponToken = async function (coupon_id, token) {

    return new Promise((resolve, reject) => {
        CouponToken.create({
            token: token,
            coupon_id: coupon_id,
            consumer: null,
            package: null,
            verifier: null
        })
            .then(newCoupon => {
                resolve(newCoupon !== null);
            })
            .catch(err => {
                console.log("The coupon token cannot be created.");
                console.log(err);

                reject(err);
            })
    });
};

exports.insertPackageToken = async function (coupon_id, token, tokenPackage) {

    return new Promise((resolve, reject) => {
        CouponToken.update({
            token: token,
            coupon_id: coupon_id,
            consumer: null,
            package: tokenPackage,
            verifier: null
        })
            .then(newCoupon => {
                resolve(newCoupon !== null);
            })
            .catch(err => {
                console.log("The coupon token cannot be created.");
                console.log(err);

                reject(err);
            })
    });
};

exports.updateCouponToken = function (token, coupon_id, consumer = null, pack = null, verifier = null) {
    return new Promise((resolve, reject) => {
        CouponToken.update({
            consumer: consumer,
            verifier: verifier,
            package: pack
        }, {
            where: {token: token, coupon_id: coupon_id}
        })
            .then(couponTokenUpdated => {
                const result = couponTokenUpdated[0] !== 0; // If the update is fine, it returns true
                resolve(result);
            })
            .catch(err => {
                console.log("The coupon token cannot be updated.");
                console.log(err);

                reject(err);
            })
    });
};

exports.updatePackageToken = function (token, coupon_id, consumer = null, pack = null, verifier = null) {
    return new Promise((resolve, reject) => {
        CouponToken.update({
            consumer: consumer,
            verifier: verifier,
            package: pack
        }, {
            where: {package: pack, verifier: null}
        })
            .then(packageTokenUpdated => {
                const result = packageTokenUpdated[0] !== 0; // If the update is fine, it returns true
                resolve(result);
            })
            .catch(err => {
                console.log("The package token cannot be updated.");
                console.log(err);

                reject(err);
            })
    });
};

exports.getTokenByIdCoupon = (coupon_id) => {
    return new Promise((resolve, reject) => {
        CouponToken.findOne({
            where: {consumer: null, coupon_id: coupon_id, package: null, verifier: null}
        })
            .then(newCouponToken => {
                resolve(newCouponToken);
            })
            .catch(err => {
                console.log("A coupon token is not available.");
                console.error(err);
                reject(err);
            })
    });
};
exports.getCouponsByTokenPackage = async (token) => {

    console.log('tokentoken', token)

    return new Promise((resolve, reject) => {
        CouponToken.findAll({

            where: {package: token, verifier: null}

        })
            .then(couponsIntoPackage => {
                resolve(couponsIntoPackage);
            })
            .catch(err => {
                console.log("The coupons don't available.");
                console.log(err);

                reject(err);
            })
    });
};
exports.getTokenByIdPackage = async function (token_id) {

    return new Promise((resolve, reject) => {
        PackageTokens.findOne({

            where: {package_id: token_id}

        })
            .then(tokenPackage => {
                resolve(tokenPackage);
            })
            .catch(err => {
                console.log("This package token don't available.");
                console.log(err);

                reject(err);
            })
    });
};

exports.getProducerTokensOfflineById = (req, res) => {
    console.log('req.params.id', req.params.id)
    const id = Number(req.params.id);
    Sequelize.query(
        'SELECT * ' +
        'FROM coupon_tokens WHERE coupon_id = :id AND consumer IS null AND package IS null ',
        {replacements: {id: id}, type: Sequelize.QueryTypes.SELECT})
        .then(tokens => {
            console.log('tokenstokens', tokens)
            if (tokens.length === 0) {
                return res.status(HttpStatus.NO_CONTENT).send({});
            }
            return res.status(HttpStatus.OK).send(tokens);
        })
        .catch(err => {
            console.log(err);
            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).send({
                error: true,
                message: 'Cannot get the distinct coupons created'
            })
        })
};

exports.buyProducerTokensOfflineByToken = async (req, res) => {
    try {
        const result = await this.updateCouponToken(req.params.token, req.params.id, 5, null, null)
        if (result) {
            return res.status(HttpStatus.OK).send(true);
        } else {
            return res.status(HttpStatus.OK).send(false);
        }
    }
    catch (e) {
        console.log('error buy offline', e)
        return res.status(HttpStatus.OK).send(false);
    }

};





