'use strict';
const HttpStatus = require('http-status-codes');
const paypalApi = require('paypal-nvp-api');
const crypto = require('crypto');
const _ = require('lodash');

const Coupon = require('../models/index').Coupon;
const User = require('../models/index').User;

// const paypalConfig = {
//     mode: 'sandbox', // controllo (produzione = live, locale = sandbox)
//     username: 'sardcoin2018-facilitator_api1.gmail.com',
//     password: '9NCXEHQCT3K7LGTQ',
//     signature: 'ARLVDP2L.4MqfOFJIuBr1CdO9YBnArC7h4GygcmzOublpRRncLVxZSuu'
// };

// const Paypal = paypalApi(paypalConfig);

/** PUBLIC METHODS **/
const setCheckout = (config) => {
    return async (req, res) => {
        const Paypal = paypalApi(config['Paypal']);
        let link = config['Paypal']['mode'] === 'sandbox' ? 'https://www.sandbox.paypal.com/' : 'https://www.paypal.com/';

        const order = req.body;
        let coupon, grouped, query, resultSet;
        const coupons = [];

        try {
            for (const i in order) {
                coupon = await getCouponByID(order[i]['id']);
                coupon.dataValues['quantity'] = order[i]['quantity'];
                coupons.push(coupon);
            }

            grouped = _.groupBy(coupons, 'owner');

            if (Object.keys(grouped).length > 10) {
                return res.status(HttpStatus.BAD_REQUEST).send({
                    status: HttpStatus.BAD_REQUEST,
                    message: 'You can\'t buy more than 10 products at time'
                });
            }

            query = await setQuery(grouped);

            // console.log(query);

            resultSet = await Paypal.request('SetExpressCheckout', query);

            // console.warn(resultSet);

            link += 'checkoutnow?token=' + resultSet.TOKEN;

            return res.status(HttpStatus.OK).send({link: link});

        } catch (e) {
            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).send({
                message: 'Error doing something'
            })
        }
    }
};
const confirm = (config) => {
    return async (req, res) => { // TODO passare config per configurare gli URL, aggiungere al config le URL del sito e del locale
        console.log(config);
        res.redirect('http://localhost:4200/#/reserved-area/consumer/checkout?token=' + req.query.token);
    };
};
const pay = (config) => {
    return async (req, res) => {
        const Paypal = paypalApi(config['Paypal']);
        let resultGet, resultDo;

        try {
            resultGet = await Paypal.request('GetExpressCheckoutDetails', req.body);
            resultDo = await Paypal.request('DoExpressCheckoutPayment', resultGet);

            return res.status(HttpStatus.OK).send({
                paid: true,
                result: resultDo
            })
        } catch (e) {
            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).send({error: 'Error doing payment'});
        }
    }
};

/** EXPORT **/
module.exports = {setCheckout, confirm, pay};

/** PRIVATE METHODS **/
const setQuery = async (groupedCoupons) => { // TODO passare config per configurare gli URL
    let m, n = 0;
    let userOwner;
    let amt;
    let query = {
        'RETURNURL': 'http://localhost:8080/paypal/confirm',
        'CANCELURL': 'http://localhost:4200/#/reserved-area/consumer/checkout?err=true'
    };

    /** L_PAYMENTREQUEST_n_NAMEm **/
    // n (numero di pagamento all'interno dello stesso) -> dev'essere compreso tra 0 e 9 (max 10 pagamenti a produttori diversi)
    // m (numero del prodotto) -> non ha limiti
    for (const owner in groupedCoupons) {
        userOwner = await getOwnerById(owner);

        amt = 0; // amount of the single producer
        m = 1;

        for (const coupon in groupedCoupons[owner]) {
            query = getQueryItem(query, groupedCoupons[owner][coupon].dataValues, n, m);
            amt += groupedCoupons[owner][coupon].dataValues.quantity * groupedCoupons[owner][coupon].dataValues.price;
            m++;
        }

        query['PAYMENTREQUEST_' + n + '_PAYMENTACTION'] = 'Sale';
        query['PAYMENTREQUEST_' + n + '_CURRENCYCODE'] = 'EUR';
        query['PAYMENTREQUEST_' + n + '_AMT'] = amt;

        query['PAYMENTREQUEST_' + n + '_PAYMENTREQUESTID'] = getPaymentRequestId(userOwner, amt);
        query['PAYMENTREQUEST_' + n + '_SELLERPAYPALACCOUNTID'] = userOwner.email_paypal;

        n++;
    }

    return query;
};
const getCouponByID = async (coupon_id) => {
    return await Coupon.findOne({where: {id: coupon_id}});
};
const getOwnerById = async (owner_id) => {
    return await User.findOne({where: {id: owner_id}});
};
const getPaymentRequestId = (userOwner, amt) => {
    const min = Math.ceil(1);
    const max = Math.floor(1000000);
    const total = Math.floor(Math.random() * (max - min)) + min;

    return crypto.createHash('sha256').update(userOwner.email_paypal + amt + +total.toString()).digest('hex');
};
const getQueryItem = (query, coupon, n, m) => {

    query['L_PAYMENTREQUEST_' + n + '_NAME' + m] = coupon.title;
    query['L_PAYMENTREQUEST_' + n + '_DESC' + m] = coupon.description;
    query['L_PAYMENTREQUEST_' + n + '_AMT' + m] = coupon.price;
    query['L_PAYMENTREQUEST_' + n + '_QTY' + m] = coupon.quantity;
    query['L_PAYMENTREQUEST_' + n + '_NUMBER' + m] = m;
    // query['L_PAYMENTREQUEST_' + n + '_ITEMCATEGORY' + m] = 'Physical';

    return query;
};

