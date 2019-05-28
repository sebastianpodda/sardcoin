'use strict';

const PackageTokens = require('../models/index').PackageTokens;
const CouponToken = require('../models/index').CouponToken;
const Coupon = require('../models/index').Coupon;
const CouponsCategories = require('../models/index').CouponsCategories;
const Verifier = require('../models/index').Verifier;
const Sequelize = require('../models/index').sequelize;
const Op = require('../models/index').Sequelize.Op;
const CategoriesPackageManager = require('./categories-packages-manager');
const CouponTokenManager = require('./coupon-token-manager');
const OrdersManager = require('./orders-manager');
const HttpStatus = require('http-status-codes');
const fs = require('file-system');
const path = require('path');
const crypto = require('crypto');
const _ = require('lodash');

/** Exported REST functions **/








const addImage = (req, res) => {
    console.log(req);

    fs.readFile(req.files.file.path, function (err, data) {
        // set the correct path for the file not the temporary one from the API:
        const file = req.files.file;
        file.path = path.join(__dirname, "../media/images/" + file.name);

        // copy the data from the req.files.file.path and paste it to file.path
        fs.writeFile(file.path, data, function (err) {
            if (err) {
                console.warn(err);

                return res.status(HttpStatus.INTERNAL_SERVER_ERROR).send({
                    name: 'Upload Image Error',
                    message: 'A problem occurred during upload of the image'
                })
            }

            return res.status(HttpStatus.CREATED).send({
                inserted: true,
                image: file.name,
                path: file.path
            });
        });
    });

    // return res.send({cacca: 'si'});
};

/** Private methods **/



const generateUniqueToken = (title, token) => {

    const min = Math.ceil(1);
    const max = Math.floor(1000000);
    const total = Math.floor(Math.random() * (max - min)) + min;

    return crypto.createHash('sha256').update(title + token + total.toString()).digest('hex').substr(0, 8).toUpperCase();

}; // Generates a 8-char unique token based on the coupon title and the user (hashed) passwpord

const formatNotIn = (tokenList) => {
    let result = '(';

    for (let i = 0; i < tokenList.length; i++) {
        result += '"' + tokenList[i] + '"';
        if (i + 1 !== tokenList.length) {
            result += ',';
        }
    }

    return result + ')';
};
// return all package with categories and coupons associate
const getBrokerPackages = async(req, res) => {
    let result = []
    Sequelize.query(
        'SELECT id, title, description, image, price, visible_from, valid_from, valid_until, purchasable, constraints, owner, ' +
        '(COUNT(CASE WHEN verifier IS null  THEN 1 END) - COUNT(CASE WHEN consumer IS  null AND verifier IS null  THEN 1 END))/\n' +
        '        (COUNT(CASE WHEN verifier IS null  THEN 1 END)/COUNT(DISTINCT package_tokens.token))' +
        'AS buyed, COUNT(DISTINCT package_tokens.token) AS quantity ' +
        'FROM coupons JOIN package_tokens ON coupons.id = package_tokens.package_id JOIN coupon_tokens ON package_tokens.token = coupon_tokens.package' +
        ' WHERE owner = $1 ' +
        'GROUP BY id',
        {bind: [req.user.id], type: Sequelize.QueryTypes.SELECT},
        {model: Coupon})
        .then( async packages => {
            console.log('packages', packages)

            if (packages.length === 0) {
                return res.status(HttpStatus.NO_CONTENT).send({});
            } else {
                try {
                    result = await getAllData(packages)
                    return res.status(HttpStatus.OK).send(result);
                } catch (e) {
                   console.log(e)
                }


                console.log('result finale', result)
                return res.status(HttpStatus.OK).send(result);
            }

        })
        .catch(err => {
            console.log(err);
            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).send({
                error: true,
                message: 'Cannot get the distinct coupons created'
            })
        })
};





const insertTokenPackage = (package_id, token) => {
    console.log('insertPackage')

    return new Promise((resolve, reject) => {
        PackageTokens.create({
            token: token,
            package_id: package_id
        })
            .then(newPackage => {
                resolve(newPackage);
            })
            .catch(err => {
                console.log('error insert',err);
                reject(err);
            })
    });
};

const  getAllData = async function ( packages) {
    let result = []

    for (let pack of packages) {
        let coupons = []
        const categories = await getCategories(pack)
        console.log('categories getAllData',categories)
        const tokens =  await CouponTokenManager.getTokenByIdPackage(pack.id)
        console.log('tokenstokenstokens',tokens)

        for (const token of tokens){
           const cp = await CouponTokenManager.getCouponsByTokenPackage(token.dataValues.token)
           coupons.push(cp)
        }
        console.log('coupons getAllData',coupons)
        result.push({package: pack, categories: categories, coupons: coupons})
    }
    console.log('getAllData', result)
    return result;



};

const  getCategories = async function ( pack) {

    return new Promise((resolve, reject) => {
        CouponsCategories.findAll({
            attributes: ['category_id'],
            where: {
                coupon_id: pack.id
            }
        }).then(categories => {
            resolve(categories)

            })
        })

};


module.exports = {
    generateUniqueToken,
    getBrokerPackages,
    addImage,
    insertTokenPackage,
    getAllData,
    getCategories
};